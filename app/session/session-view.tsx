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

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type SessionState =
  | { phase: 'playing'; sprint: Sprint }
  | { phase: 'reviewing'; summary: SprintSummary; ratingBefore: number; ratingAfter: number }

const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial']

function pickNextGame(currentGame: GameType): GameType {
  const others = ACTIVE_GAMES.filter(g => g !== currentGame)
  // 60% chance to switch, 40% to stay
  return Math.random() < 0.6 ? others[Math.floor(Math.random() * others.length)] : currentGame
}

const GENERATORS: Record<string, (d: number, p?: Set<string>) => Question> = {
  math: generateMathQuestion,
  stroop: generateStroopQuestion,
  spatial: generateSpatialQuestion,
}

function generateQuestions(gameType: GameType, difficulty: number, count: number): Question[] {
  const prompts = new Set<string>()
  const questions: Question[] = []
  const generate = GENERATORS[gameType]
  for (let i = 0; i < count; i++) {
    const q = generate(difficulty, prompts)
    prompts.add(q.prompt)
    questions.push(q)
  }
  return questions
}

const EXPECTED_TIME_FNS: Record<string, (d: number) => number> = {
  math: getMathExpectedTimeMs,
  stroop: getStroopExpectedTimeMs,
  spatial: getSpatialExpectedTimeMs,
}

function getExpectedTimeMs(gameType: GameType, difficulty: number): number {
  return EXPECTED_TIME_FNS[gameType](difficulty)
}

export function SessionView() {
  const router = useRouter()
  const storageRef = useRef<StorageAdapter | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [difficulty, setDifficulty] = useState(1)
  const [currentRating, setCurrentRating] = useState(1000)
  const [sprintNumber, setSprintNumber] = useState(0)
  const [gameType, setGameType] = useState<GameType>('math')
  const questionStartRef = useRef<number>(Date.now())
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [transitioning, setTransitioning] = useState(false)

  // Initialize session
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    storageRef.current = storage
    const playerData = storage.getPlayerData()

    // Pick initial game randomly
    const initialGame = ACTIVE_GAMES[Math.floor(Math.random() * ACTIVE_GAMES.length)]
    setGameType(initialGame)

    const lastPlayed = playerData.lastPlayed[initialGame]
    const daysOff = lastPlayed
      ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
      : 0

    const peakDifficulty = Math.max(1, Math.round((playerData.ratings[initialGame] - 1000) / 50) + 1)
    const startDifficulty = calculateStartingDifficulty({
      peakDifficulty,
      daysOff,
      sprintInSession: 0,
    })

    setDifficulty(startDifficulty)
    setCurrentRating(playerData.ratings[initialGame])

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(initialGame, startDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!state || state.phase !== 'playing' || feedback) return

      const responseTimeMs = Date.now() - questionStartRef.current
      const question = state.sprint.questions[state.sprint.currentIndex]
      const isCorrect = answer.trim() === question.answer
      const updated = recordAnswer(state.sprint, answer, responseTimeMs)

      // Show feedback
      setFeedback({ correct: isCorrect, correctAnswer: question.answer })

      // After brief delay, transition to next question or sprint complete
      const feedbackDuration = isCorrect ? 250 : 800
      setTimeout(() => {
        setTransitioning(true)

        setTimeout(() => {
          setFeedback(null)

          if (isSprintComplete(updated)) {
            const summary = getSprintSummary(updated)
            const storage = storageRef.current!
            const playerData = storage.getPlayerData()

            const newRating = calculateNewRating({
              playerRating: currentRating,
              difficultyRating: 1000 + (difficulty - 1) * 50,
              accuracy: summary.accuracy,
              avgResponseTimeMs: summary.avgResponseTimeMs,
              expectedTimeMs: getExpectedTimeMs(gameType, difficulty),
              sprintCount: playerData.sprintCounts[gameType],
            })

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

            setState({
              phase: 'reviewing',
              summary,
              ratingBefore: currentRating,
              ratingAfter: newRating,
            })
            setCurrentRating(newRating)
          } else {
            setState({ phase: 'playing', sprint: updated })
            questionStartRef.current = Date.now()
          }

          setTransitioning(false)
        }, 150) // fade out duration
      }, feedbackDuration)
    },
    [state, currentRating, difficulty, gameType, feedback],
  )

  const handleContinue = useCallback(() => {
    if (!state || state.phase !== 'reviewing') return

    const nextSprintNum = sprintNumber + 1
    setSprintNumber(nextSprintNum)

    // Possibly switch game
    const nextGame = pickNextGame(gameType)
    setGameType(nextGame)

    // Get difficulty for the next game
    const storage = storageRef.current!
    const playerData = storage.getPlayerData()

    let newDifficulty: number
    if (nextGame !== gameType) {
      // Switching games — calculate starting difficulty for the new game
      const lastPlayed = playerData.lastPlayed[nextGame]
      const daysOff = lastPlayed
        ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
        : 0
      const peakDifficulty = Math.max(1, Math.round((playerData.ratings[nextGame] - 1000) / 50) + 1)
      newDifficulty = calculateStartingDifficulty({
        peakDifficulty,
        daysOff,
        sprintInSession: nextSprintNum,
      })
      setCurrentRating(playerData.ratings[nextGame])
    } else {
      // Same game — adjust based on last sprint performance
      newDifficulty = adjustDifficulty({
        accuracy: state.summary.accuracy,
        avgResponseTimeMs: state.summary.avgResponseTimeMs,
        expectedTimeMs: getExpectedTimeMs(gameType, difficulty),
        currentDifficulty: difficulty,
      })
    }

    setDifficulty(newDifficulty)

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(nextGame, newDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [state, sprintNumber, difficulty, gameType])

  // Escape to go home
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  if (!state) return null

  if (state.phase === 'playing') {
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
