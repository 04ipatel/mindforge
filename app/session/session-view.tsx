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
import { getExpectedTimeMs } from '@/lib/games/math/constants'
import type { GameType, Question } from '@/lib/types'
import { SprintView } from './sprint-view'
import { SprintComplete } from './sprint-complete'

type SessionState =
  | { phase: 'playing'; sprint: Sprint }
  | { phase: 'reviewing'; summary: SprintSummary; ratingBefore: number; ratingAfter: number }

function generateQuestions(difficulty: number, count: number): Question[] {
  return Array.from({ length: count }, () => generateMathQuestion(difficulty))
}

export function SessionView() {
  const router = useRouter()
  const storageRef = useRef<StorageAdapter | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [difficulty, setDifficulty] = useState(1)
  const [currentRating, setCurrentRating] = useState(1000)
  const [sprintNumber, setSprintNumber] = useState(0)
  const questionStartRef = useRef<number>(Date.now())
  const gameType: GameType = 'math'

  // Initialize session
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    storageRef.current = storage
    const playerData = storage.getPlayerData()

    const lastPlayed = playerData.lastPlayed[gameType]
    const daysOff = lastPlayed
      ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
      : 0

    const peakDifficulty = Math.max(1, Math.round((playerData.ratings[gameType] - 1000) / 50) + 1)
    const startDifficulty = calculateStartingDifficulty({
      peakDifficulty,
      daysOff,
      sprintInSession: 0,
    })

    setDifficulty(startDifficulty)
    setCurrentRating(playerData.ratings[gameType])

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(startDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!state || state.phase !== 'playing') return

      const responseTimeMs = Date.now() - questionStartRef.current
      const updated = recordAnswer(state.sprint, answer, responseTimeMs)

      if (isSprintComplete(updated)) {
        const summary = getSprintSummary(updated)
        const storage = storageRef.current!
        const playerData = storage.getPlayerData()

        const newRating = calculateNewRating({
          playerRating: currentRating,
          difficultyRating: 1000 + (difficulty - 1) * 50,
          accuracy: summary.accuracy,
          avgResponseTimeMs: summary.avgResponseTimeMs,
          expectedTimeMs: getExpectedTimeMs(difficulty),
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
    },
    [state, currentRating, difficulty, gameType],
  )

  const handleContinue = useCallback(() => {
    if (!state || state.phase !== 'reviewing') return

    const nextSprintNum = sprintNumber + 1
    setSprintNumber(nextSprintNum)

    const newDifficulty = adjustDifficulty({
      accuracy: state.summary.accuracy,
      avgResponseTimeMs: state.summary.avgResponseTimeMs,
      expectedTimeMs: getExpectedTimeMs(difficulty),
      currentDifficulty: difficulty,
    })
    setDifficulty(newDifficulty)

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(newDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [state, sprintNumber, difficulty])

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
      />
    )
  }

  return (
    <SprintComplete
      summary={state.summary}
      ratingBefore={state.ratingBefore}
      ratingAfter={state.ratingAfter}
      onContinue={handleContinue}
    />
  )
}
