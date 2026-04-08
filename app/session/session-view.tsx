// ============================================================================
// app/session/session-view.tsx — Session State Machine (Orchestrator)
// ============================================================================
// PURPOSE: The central orchestrator for a training session. Manages the full
//   lifecycle: game selection, sprint creation, question delivery, answer
//   processing, feedback timing, difficulty adjustment, Elo rating updates,
//   and persistence to localStorage. This is the most complex file in app/.
// ARCHITECTURE:
//   - State machine with two phases: 'playing' (active sprint) and 'reviewing'
//     (sprint complete screen between sprints)
//   - Delegates rendering to SprintView (playing) and SprintComplete (reviewing)
//   - Owns all game-agnostic logic; game-specific behavior lives in lib/games/
//   - Uses GENERATORS and EXPECTED_TIME_FNS lookup tables so adding a new game
//     only requires adding one entry to each table
// DEPENDENCIES:
//   - lib/storage.ts — LocalStorageAdapter for persisting ratings and history
//   - lib/engine.ts — createSprint, recordAnswer, isSprintComplete, getSprintSummary
//   - lib/difficulty.ts — adjustDifficulty, calculateStartingDifficulty
//   - lib/elo.ts — calculateNewRating (Elo formula with time multiplier)
//   - lib/games/math/ — generateMathQuestion, getExpectedTimeMs
//   - lib/games/stroop/ — generateStroopQuestion, getStroopExpectedTimeMs
//   - lib/games/spatial/ — generateSpatialQuestion, getSpatialExpectedTimeMs
//   - app/session/sprint-view.tsx — renders the active sprint UI
//   - app/session/sprint-complete.tsx — renders between-sprint stats
// DEPENDENTS:
//   - app/session/page.tsx — the server shell that renders this component
// FLOW:
//   1. Mount → pick random game → calculate starting difficulty → create sprint
//   2. User answers → feedback shown → next question or sprint complete
//   3. Sprint complete → calculate new Elo → persist to storage → show stats
//   4. User presses Enter → possibly switch games → create next sprint → goto 2
//   5. User presses Escape → navigate home
// ============================================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { StorageAdapter } from '@/lib/storage'
import { createSprint, recordAnswer, isSprintComplete, getSprintSummary, generateSprintQuestionCount } from '@/lib/engine'
import type { Sprint, SprintSummary } from '@/lib/engine'
import { adjustDifficulty, calculateStartingDifficulty } from '@/lib/difficulty'
import { calculateNewRating } from '@/lib/elo'
import { generateMathQuestion } from '@/lib/games/math/generator'
import { getExpectedTimeMs as getMathExpectedTimeMs } from '@/lib/games/math/constants'
import { generateStroopQuestion } from '@/lib/games/stroop/generator'
import { getStroopExpectedTimeMs } from '@/lib/games/stroop/constants'
import { generateSpatialQuestion } from '@/lib/games/spatial/generator'
import { getSpatialExpectedTimeMs } from '@/lib/games/spatial/constants'
import type { GameType, Question } from '@/lib/types'
import { SprintView } from './sprint-view'
import { SprintComplete } from './sprint-complete'

// FeedbackState is passed down to input components to show correct/incorrect
// after the user answers. null means no feedback is being shown (ready for input).
// correctAnswer is included so incorrect feedback can display the right answer.
type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

// SessionState is a discriminated union representing the two phases of the
// session state machine:
// - 'playing': a sprint is active, user is answering questions
// - 'reviewing': sprint just finished, showing stats and waiting for Enter
type SessionState =
  | { phase: 'playing'; sprint: Sprint }
  | { phase: 'reviewing'; summary: SprintSummary; ratingBefore: number; ratingAfter: number }

// ACTIVE_GAMES defines which game types are available in the current build.
// Game rotation only activates when this array has 2+ entries.
// To add a new game: add it here, add to GENERATORS, add to EXPECTED_TIME_FNS.
const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial']

// pickNextGame decides whether to switch games between sprints.
// 60% chance to switch to a different game, 40% chance to stay on the same game.
// When switching, picks uniformly at random from the other available games.
// This unpredictability is intentional — keeps the player adapting across domains.
function pickNextGame(currentGame: GameType): GameType {
  const others = ACTIVE_GAMES.filter(g => g !== currentGame)
  // 0.6 = 60% switch probability — a design decision to keep sessions varied
  // without switching so often that it feels jarring
  return Math.random() < 0.6 ? others[Math.floor(Math.random() * others.length)] : currentGame
}

// GENERATORS maps game type strings to their question generator functions.
// Each generator takes (difficulty: number, previousPrompts?: Set<string>)
// and returns a Question object. The previousPrompts set prevents duplicate
// questions within a single sprint.
// To add a new game: import its generator and add an entry here.
const GENERATORS: Record<string, (d: number, p?: Set<string>) => Question> = {
  math: generateMathQuestion,
  stroop: generateStroopQuestion,
  spatial: generateSpatialQuestion,
}

// generateQuestions creates an array of unique questions for a sprint.
// It tracks previously generated prompts via a Set to avoid duplicates.
// The count parameter comes from generateSprintQuestionCount() (5-7 questions).
function generateQuestions(gameType: GameType, difficulty: number, count: number): Question[] {
  // Track prompts already generated this sprint to prevent duplicates
  const prompts = new Set<string>()
  const questions: Question[] = []
  const generate = GENERATORS[gameType]
  for (let i = 0; i < count; i++) {
    const q = generate(difficulty, prompts)
    // Add to the set so the next call can avoid this prompt
    prompts.add(q.prompt)
    questions.push(q)
  }
  return questions
}

// EXPECTED_TIME_FNS maps game types to functions that return the expected
// response time in milliseconds for a given difficulty level. Used by:
// 1. The Elo system to calculate time multiplier (0.8-1.2 based on speed vs expected)
// 2. The difficulty engine to decide if the player was "fast" or "slow"
// To add a new game: import its expected time function and add an entry here.
const EXPECTED_TIME_FNS: Record<string, (d: number) => number> = {
  math: getMathExpectedTimeMs,
  stroop: getStroopExpectedTimeMs,
  spatial: getSpatialExpectedTimeMs,
}

// Convenience wrapper around EXPECTED_TIME_FNS for cleaner call sites
function getExpectedTimeMs(gameType: GameType, difficulty: number): number {
  return EXPECTED_TIME_FNS[gameType](difficulty)
}

// SessionView is the main session orchestrator component.
// It is rendered by app/session/page.tsx (the server shell).
// All session state lives here — child components are stateless renderers.
export function SessionView() {
  const router = useRouter()
  // storageRef persists the storage adapter across renders without triggering re-renders.
  // Initialized in the mount effect below. Used in handleAnswer and handleContinue.
  const storageRef = useRef<StorageAdapter | null>(null)
  // state is the core state machine — null until initialization completes
  const [state, setState] = useState<SessionState | null>(null)
  // difficulty is the current difficulty level (integer, starts at 1)
  const [difficulty, setDifficulty] = useState(1)
  // currentRating tracks the player's Elo for the active game type
  const [currentRating, setCurrentRating] = useState(1000)
  // sprintNumber counts sprints in this session (0-indexed), used for warm-up logic
  const [sprintNumber, setSprintNumber] = useState(0)
  // gameType tracks which game is currently active
  const [gameType, setGameType] = useState<GameType>('math')
  // questionStartRef records the timestamp when the current question was shown,
  // used to calculate response time for each answer
  const questionStartRef = useRef<number>(Date.now())
  // feedback holds the current feedback state (correct/incorrect) shown to the user.
  // null = no feedback, ready for input. Non-null = feedback is being displayed.
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  // transitioning controls the opacity fade between questions (150ms CSS transition)
  const [transitioning, setTransitioning] = useState(false)

  // === SESSION INITIALIZATION ===
  // Runs once on mount. Sets up storage, picks a random starting game,
  // calculates starting difficulty with warm-up/decay, and creates the first sprint.
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    storageRef.current = storage
    const playerData = storage.getPlayerData()

    // Pick initial game randomly from ACTIVE_GAMES
    const initialGame = ACTIVE_GAMES[Math.floor(Math.random() * ACTIVE_GAMES.length)]
    setGameType(initialGame)

    // Calculate days since last played for smart decay
    // See CLAUDE.md: decay = 3% per day off, floor at 50% above baseline
    const lastPlayed = playerData.lastPlayed[initialGame]
    const daysOff = lastPlayed
      // 86400000ms = 24 hours — converts ms diff to whole days
      ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
      : 0

    // Convert Elo rating to a peak difficulty level.
    // Formula: each 50 rating points above 1000 = 1 difficulty level.
    // Floor of 1 ensures difficulty is always at least 1.
    const peakDifficulty = Math.max(1, Math.round((playerData.ratings[initialGame] - 1000) / 50) + 1)
    // calculateStartingDifficulty applies warm-up (first 2 sprints start below peak)
    // and decay (reduces proportionally to days off)
    const startDifficulty = calculateStartingDifficulty({
      peakDifficulty,
      daysOff,
      sprintInSession: 0,
    })

    setDifficulty(startDifficulty)
    setCurrentRating(playerData.ratings[initialGame])

    // generateSprintQuestionCount returns 5-7 (randomized per sprint)
    const count = generateSprintQuestionCount()
    const questions = generateQuestions(initialGame, startDifficulty, count)
    // createSprint initializes a Sprint object with currentIndex=0 and empty answers
    setState({ phase: 'playing', sprint: createSprint(questions) })
    // Start the timer for the first question
    questionStartRef.current = Date.now()
  }, [])

  // === ANSWER HANDLER ===
  // Called by input components (MathInput, StroopInput, SpatialInput) when the
  // user submits an answer. Handles: timing, correctness check, feedback display,
  // transition animation, sprint completion, Elo update, and persistence.
  const handleAnswer = useCallback(
    (answer: string) => {
      // Guard: only accept answers during the 'playing' phase with no active feedback
      if (!state || state.phase !== 'playing' || feedback) return

      // Calculate how long the user took to answer this question
      const responseTimeMs = Date.now() - questionStartRef.current
      const question = state.sprint.questions[state.sprint.currentIndex]
      // Exact string match after trimming whitespace
      const isCorrect = answer.trim() === question.answer
      // recordAnswer returns a new Sprint with the answer recorded at currentIndex
      // and currentIndex incremented
      const updated = recordAnswer(state.sprint, answer, responseTimeMs)

      // Show feedback: green for correct, red with correct answer for incorrect
      setFeedback({ correct: isCorrect, correctAnswer: question.answer })

      // Feedback timing (from CLAUDE.md):
      // - 250ms for correct answers (brief flash, keeps momentum)
      // - 800ms for incorrect answers (longer pause to absorb the correct answer)
      const feedbackDuration = isCorrect ? 250 : 800
      setTimeout(() => {
        // Begin the fade-out transition (opacity 0)
        setTransitioning(true)

        setTimeout(() => {
          // Clear feedback state so the next question accepts input
          setFeedback(null)

          if (isSprintComplete(updated)) {
            // === SPRINT COMPLETE PATH ===
            // Calculate sprint summary (accuracy, avg time, question count)
            const summary = getSprintSummary(updated)
            const storage = storageRef.current!
            const playerData = storage.getPlayerData()

            // Calculate new Elo rating using the standard formula:
            // R_new = R_old + K * (Score - Expected)
            // Score = accuracy * time multiplier (0.8-1.2)
            // K=32 for first 10 sprints, K=16 after that
            // difficultyRating converts difficulty level to an Elo-scale number:
            // each difficulty level = 50 Elo points above 1000
            const newRating = calculateNewRating({
              playerRating: currentRating,
              difficultyRating: 1000 + (difficulty - 1) * 50,
              accuracy: summary.accuracy,
              avgResponseTimeMs: summary.avgResponseTimeMs,
              expectedTimeMs: getExpectedTimeMs(gameType, difficulty),
              sprintCount: playerData.sprintCounts[gameType],
            })

            // Persist the new rating and sprint result to localStorage
            storage.updateRating(gameType, newRating)
            storage.saveSprintResult({
              gameType,
              difficulty,
              questionCount: summary.questionCount,
              correctCount: summary.correctCount,
              avgResponseTimeMs: summary.avgResponseTimeMs,
              ratingBefore: currentRating,
              ratingAfter: newRating,
              timestamp: new Date().toISOString(),
            })

            // Transition to the 'reviewing' phase — SprintComplete will render
            setState({
              phase: 'reviewing',
              summary,
              ratingBefore: currentRating,
              ratingAfter: newRating,
            })
            setCurrentRating(newRating)
          } else {
            // === NEXT QUESTION PATH ===
            // Sprint is not complete — show the next question
            setState({ phase: 'playing', sprint: updated })
            // Reset the timer for the next question
            questionStartRef.current = Date.now()
          }

          // Fade back in (opacity 100)
          setTransitioning(false)
        }, 150) // 150ms = fade-out duration, matches the CSS transition-opacity duration
      }, feedbackDuration)
    },
    [state, currentRating, difficulty, gameType, feedback],
  )

  // === CONTINUE HANDLER (next sprint) ===
  // Called when the user presses Enter on the sprint complete screen.
  // Handles: game rotation, difficulty adjustment for the next sprint,
  // and creation of a new sprint.
  const handleContinue = useCallback(() => {
    if (!state || state.phase !== 'reviewing') return

    const nextSprintNum = sprintNumber + 1
    setSprintNumber(nextSprintNum)

    // Decide whether to switch games (60% chance) or stay on the same game
    const nextGame = pickNextGame(gameType)
    setGameType(nextGame)

    // Get the latest player data for difficulty calculation
    const storage = storageRef.current!
    const playerData = storage.getPlayerData()

    let newDifficulty: number
    if (nextGame !== gameType) {
      // === GAME SWITCH PATH ===
      // When switching to a different game, calculate starting difficulty fresh
      // using that game's rating, days off, and warm-up logic
      const lastPlayed = playerData.lastPlayed[nextGame]
      const daysOff = lastPlayed
        // 86400000ms = 24 hours
        ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
        : 0
      // Convert the new game's Elo rating to a peak difficulty level
      const peakDifficulty = Math.max(1, Math.round((playerData.ratings[nextGame] - 1000) / 50) + 1)
      newDifficulty = calculateStartingDifficulty({
        peakDifficulty,
        daysOff,
        sprintInSession: nextSprintNum,
      })
      // Switch to the new game's current rating
      setCurrentRating(playerData.ratings[nextGame])
    } else {
      // === SAME GAME PATH ===
      // When staying on the same game, adjust difficulty based on last sprint performance.
      // adjustDifficulty considers accuracy and response time vs expected time.
      // See CLAUDE.md for the 4-quadrant logic (fast/slow x accurate/inaccurate).
      newDifficulty = adjustDifficulty({
        accuracy: state.summary.accuracy,
        avgResponseTimeMs: state.summary.avgResponseTimeMs,
        expectedTimeMs: getExpectedTimeMs(gameType, difficulty),
        currentDifficulty: difficulty,
      })
    }

    setDifficulty(newDifficulty)

    // Create the next sprint with 5-7 questions at the new difficulty
    const count = generateSprintQuestionCount()
    const questions = generateQuestions(nextGame, newDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    // Start the timer for the first question of the new sprint
    questionStartRef.current = Date.now()
  }, [state, sprintNumber, difficulty, gameType])

  // === ESCAPE KEY HANDLER ===
  // Pressing Escape at any point during a session navigates back to the home screen.
  // This is the only way to exit a session (no close button in the UI).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  // Render nothing until initialization completes (state is null during mount effect)
  if (!state) return null

  // === RENDER: delegate to the appropriate view based on session phase ===
  if (state.phase === 'playing') {
    // SprintView renders the progress bar, current rating, and game-specific input.
    // It delegates to MathInput, StroopInput, or SpatialInput based on gameType.
    // See: app/session/sprint-view.tsx
    return (
      <SprintView
        sprint={state.sprint}
        gameType={gameType}
        currentRating={currentRating}
        onAnswer={handleAnswer}
        feedback={feedback}
        transitioning={transitioning}
      />
    )
  }

  // SprintComplete renders the between-sprint stats screen (accuracy, avg time,
  // rating change) and waits for Enter to continue.
  // See: app/session/sprint-complete.tsx
  return (
    <SprintComplete
      summary={state.summary}
      ratingBefore={state.ratingBefore}
      ratingAfter={state.ratingAfter}
      gameType={gameType}
      onContinue={handleContinue}
    />
  )
}
