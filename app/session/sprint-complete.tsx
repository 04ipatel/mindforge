'use client'

import { useEffect, useCallback } from 'react'
import type { SprintSummary } from '@/lib/engine'

type SprintCompleteProps = {
  summary: SprintSummary
  ratingBefore: number
  ratingAfter: number
  onContinue: () => void
}

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

export function SprintComplete({ summary, ratingBefore, ratingAfter, onContinue }: SprintCompleteProps) {
  const ratingChange = ratingAfter - ratingBefore
  const changeColor = ratingChange >= 0 ? 'text-positive' : 'text-negative'
  const changePrefix = ratingChange >= 0 ? '+' : ''

  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

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
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-sm text-text-secondary uppercase tracking-widest mb-6">
          Sprint Complete
        </div>

        <div className="flex gap-10 mb-8">
          <div>
            <div className="text-4xl font-light text-positive">
              {summary.correctCount}/{summary.questionCount}
            </div>
            <div className="text-xs text-text-hint mt-1">correct</div>
          </div>
          <div>
            <div className="text-4xl font-light text-text-primary">
              {formatTime(summary.avgResponseTimeMs)}
            </div>
            <div className="text-xs text-text-hint mt-1">avg time</div>
          </div>
        </div>

        <div className="bg-surface-alt rounded-xl px-8 py-4 mb-8">
          <div className="text-sm text-text-hint mb-2">Math Rating</div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-light font-mono">{ratingAfter}</span>
            <span className={`text-base ${changeColor}`}>
              {changePrefix}{ratingChange}
            </span>
          </div>
        </div>

        <div className="text-sm text-text-hint">
          press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">enter</span> to continue
        </div>
      </div>
    </div>
  )
}
