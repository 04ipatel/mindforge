// ============================================================================
// app/session/sprint-complete.tsx — Between-Sprint Stats Screen
// ============================================================================
// PURPOSE: Displays sprint results after a sprint finishes: accuracy (correct/total),
//   average response time, and the Elo rating change. Waits for the user to press
//   Enter to continue to the next sprint.
// ARCHITECTURE: Presentational client component rendered by SessionView during
//   the 'reviewing' phase. Owns no game logic — just displays the summary data
//   and fires onContinue when Enter is pressed.
// DEPENDENCIES:
//   - lib/engine.ts — SprintSummary type (accuracy, avgResponseTimeMs, etc.)
//   - lib/types.ts — GameType type
// DEPENDENTS:
//   - app/session/session-view.tsx — renders this during phase='reviewing'
// NOTES:
//   - Enter key listener is scoped to this component's lifecycle
//   - Rating change is color-coded: green (positive) or red (negative)
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { SprintSummary } from '@/lib/engine'
import type { GameType } from '@/lib/types'
import { GAME_REGISTRY } from '@/lib/registry'

// Props received from SessionView
type SprintCompleteProps = {
  summary: SprintSummary
  ratingBefore: number
  ratingAfter: number
  gameType: GameType
  onContinue: () => void
}

// Converts milliseconds to a human-readable string like "1.5s"
// Used for displaying average response time
function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

// SprintComplete shows the results of a completed sprint and waits for Enter.
// Layout: centered vertically, showing accuracy, avg time, rating change, and
// a "press enter to continue" hint at the bottom.
export function SprintComplete({ summary, ratingBefore, ratingAfter, gameType, onContinue }: SprintCompleteProps) {
  // Calculate the rating delta for display (e.g., "+12" or "-8")
  const ratingChange = ratingAfter - ratingBefore
  // Color-code the change: green for positive/zero, red for negative
  // These reference --color-positive and --color-negative from app/globals.css
  const changeColor = ratingChange >= 0 ? 'text-positive' : 'text-negative'
  // Add explicit "+" prefix for positive changes (negative already has "-")
  const changePrefix = ratingChange >= 0 ? '+' : ''

  // Memoized continue handler — wraps onContinue for stable reference in the effect
  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  // Listen for Enter key to advance to the next sprint.
  // preventDefault stops Enter from triggering any other handlers.
  // Cleanup removes the listener when this component unmounts (phase changes).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleContinue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleContinue])

  return (
    // min-h-screen + flex center ensures this fills the viewport and centers content
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        {/* Header label */}
        <div className="text-sm text-text-secondary uppercase tracking-widest mb-6">
          Sprint Complete
        </div>

        {/* Stats row: accuracy on the left, average time on the right */}
        <div className="flex gap-10 mb-8">
          {/* Accuracy: displayed as "correct/total" (e.g., "5/7") */}
          <div>
            <div className="text-4xl font-light text-positive">
              {summary.correctCount}/{summary.questionCount}
            </div>
            <div className="text-xs text-text-hint mt-1">correct</div>
          </div>
          {/* Average response time: displayed as seconds with one decimal (e.g., "2.3s") */}
          <div>
            <div className="text-4xl font-light text-text-primary">
              {formatTime(summary.avgResponseTimeMs)}
            </div>
            <div className="text-xs text-text-hint mt-1">avg time</div>
          </div>
        </div>

        {/* Rating box: shows the new Elo rating and the delta from this sprint.
            bg-surface-alt gives it a slightly tinted background to stand out. */}
        <div className="bg-surface-alt rounded-xl px-8 py-4 mb-8">
          {/* Game-specific label (e.g., "Math Rating") */}
          <div className="text-sm text-text-hint mb-2">{GAME_REGISTRY[gameType].name} Rating</div>
          <div className="flex items-center justify-center gap-3">
            {/* New rating value in large monospace font */}
            <span className="text-3xl font-light font-mono">{ratingAfter}</span>
            {/* Rating change with sign prefix and color coding */}
            <span className={`text-base ${changeColor}`}>
              {changePrefix}{ratingChange}
            </span>
          </div>
        </div>

        {/* Continue prompt — styled as a subtle hint matching the home screen pattern */}
        <div className="text-sm text-text-hint">
          press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">enter</span> to continue
        </div>
      </div>
    </div>
  )
}
