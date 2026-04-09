// ============================================================================
// app/stats/stats-view.tsx — Analytics Dashboard View
// ============================================================================
// PURPOSE: Displays comprehensive player statistics including composite rating,
//   streak info, total sprints, total time, per-game ratings with weekly deltas.
// ARCHITECTURE: 'use client' component that reads from localStorage on mount.
//   Escape key navigates back to home. All data is computed from stored history.
// DEPENDENCIES:
//   - lib/storage.ts — LocalStorageAdapter for reading persisted data
//   - lib/types.ts — PlayerData, SprintResult, GameType, GAME_TYPES
//   - lib/streak.ts — calculateStreak for streak info
// DEPENDENTS: app/stats/page.tsx
// ============================================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { PlayerData, SprintResult, GameType } from '@/lib/types'
import { createDefaultPlayerData, GAME_TYPES } from '@/lib/types'
import { calculateStreak } from '@/lib/streak'
import type { StreakInfo } from '@/lib/streak'
import { GAME_REGISTRY } from '@/lib/registry'

// Calculate rating delta for a game over the last 7 days.
// Takes the ratingAfter of the most recent sprint minus the ratingBefore
// of the earliest sprint within the 7-day window.
function weeklyDelta(history: SprintResult[], game: GameType): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = history.filter(
    (r) => r.gameType === game && new Date(r.timestamp).getTime() >= sevenDaysAgo
  )
  if (recent.length === 0) return 0
  // History is in chronological order (oldest first)
  const first = recent[0]
  const last = recent[recent.length - 1]
  return last.ratingAfter - first.ratingBefore
}

// Format total time from milliseconds into a human-readable string.
// Returns "Xh Xm" for longer durations, "Xm" for shorter ones.
function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export function StatsView() {
  const router = useRouter()
  const [playerData, setPlayerData] = useState<PlayerData>(createDefaultPlayerData())
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0 })
  const [history, setHistory] = useState<SprintResult[]>([])

  // Load all data from localStorage on mount
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    setPlayerData(storage.getPlayerData())
    const h = storage.getSessionHistory()
    setHistory(h)
    setStreak(calculateStreak(h))
  }, [])

  // Escape key navigates back to home
  const handleEscape = useCallback(() => {
    router.push('/')
  }, [router])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleEscape()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleEscape])

  // Compute derived stats
  const totalSprints = history.length
  const totalTimeMs = history.reduce(
    (sum, r) => sum + r.avgResponseTimeMs * r.questionCount,
    0
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 p-8">
      {/* Header */}
      <div className="text-text-secondary text-sm uppercase tracking-widest">
        Statistics
      </div>

      {/* Composite rating — large monospace number */}
      <div className="text-center">
        <div className="text-6xl font-light font-mono tracking-tight">
          {playerData.compositeRating}
        </div>
        <div className="text-text-hint text-xs mt-1">composite rating</div>
      </div>

      {/* Summary stats row: streak, longest, sprints, time */}
      <div className="flex gap-8 flex-wrap justify-center">
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{streak.current}</div>
          <div className="text-text-hint text-xs">current streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{streak.longest}</div>
          <div className="text-text-hint text-xs">longest streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{totalSprints}</div>
          <div className="text-text-hint text-xs">total sprints</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{formatTotalTime(totalTimeMs)}</div>
          <div className="text-text-hint text-xs">total time</div>
        </div>
      </div>

      {/* Per-game ratings with weekly deltas */}
      <div className="flex flex-col gap-3">
        {GAME_TYPES.map((game) => {
          const delta = weeklyDelta(history, game)
          return (
            <div key={game} className="flex items-center gap-3">
              {/* Accent color dot */}
              <div className={`w-2 h-2 rounded-full ${GAME_REGISTRY[game].accentClass}`} />
              {/* Game label */}
              <span className="text-text-secondary text-sm w-20">{GAME_REGISTRY[game].name}</span>
              {/* Current rating */}
              <span className="font-mono text-sm w-12 text-right">
                {playerData.ratings[game]}
              </span>
              {/* Weekly delta — green for positive, red for negative, hidden if zero */}
              {delta !== 0 && (
                <span
                  className={`font-mono text-xs ${delta > 0 ? 'text-positive' : 'text-negative'}`}
                >
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation hint */}
      <button
        onClick={handleEscape}
        className="text-text-hint text-xs hover:text-text-secondary transition-colors"
      >
        press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">esc</span> to go back
      </button>
    </div>
  )
}
