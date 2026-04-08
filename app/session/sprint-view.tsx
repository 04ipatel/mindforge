'use client'

import type { Sprint } from '@/lib/engine'
import type { GameType } from '@/lib/types'
import { MathInput } from './math-input'
import { StroopInput } from './stroop-input'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type SprintViewProps = {
  sprint: Sprint
  gameType: GameType
  currentRating: number
  onAnswer: (answer: string) => void
  feedback: FeedbackState
  transitioning: boolean
}

const ACCENT_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
}

export function SprintView({ sprint, gameType, currentRating, onAnswer, feedback, transitioning }: SprintViewProps) {
  const question = sprint.questions[sprint.currentIndex]
  const progress = sprint.currentIndex / sprint.questions.length

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Progress bar */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full ${ACCENT_COLORS[gameType]} rounded-full transition-all duration-200`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-hint font-mono">
          {sprint.currentIndex}/{sprint.questions.length}
        </span>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col items-center justify-center gap-4 transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* Current rating */}
        <div className="text-sm text-text-hint font-mono">{currentRating}</div>

        {/* Game-specific input */}
        {gameType === 'math' && (
          <MathInput question={question} onSubmit={onAnswer} feedback={feedback} />
        )}
        {gameType === 'stroop' && (
          <StroopInput question={question} onSubmit={onAnswer} feedback={feedback} />
        )}
      </div>

      {/* Keyboard hint */}
      <div className="py-4 text-center text-xs text-text-hint">
        {gameType === 'math' ? 'type answer · enter to submit' : 'press 1-4 to select the ink color'}
      </div>
    </div>
  )
}
