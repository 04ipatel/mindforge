'use client'

import type { Sprint } from '@/lib/engine'
import type { GameType } from '@/lib/types'
import { MathInput } from './math-input'

type SprintViewProps = {
  sprint: Sprint
  gameType: GameType
  currentRating: number
  onAnswer: (answer: string) => void
}

const ACCENT_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
}

export function SprintView({ sprint, gameType, currentRating, onAnswer }: SprintViewProps) {
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Current rating */}
        <div className="text-sm text-text-hint font-mono">{currentRating}</div>

        {/* Game-specific input */}
        {gameType === 'math' && (
          <MathInput question={question} onSubmit={onAnswer} />
        )}
      </div>

      {/* Keyboard hint */}
      <div className="py-4 text-center text-xs text-text-hint">
        type answer · enter to submit
      </div>
    </div>
  )
}
