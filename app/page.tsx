// ============================================================================
// app/page.tsx — Home Screen
// ============================================================================
// PURPOSE: The landing page at route "/". Displays composite rating, per-game
//   ratings with last-played timestamps, and a "press enter to start" prompt.
//   This is the only screen outside of a session — it's where the user sees
//   their progress and launches a new training session.
// ARCHITECTURE: Client component that reads from localStorage on mount.
//   Navigates to /session when the user presses Enter or clicks the button.
// DEPENDENCIES:
//   - lib/storage.ts — LocalStorageAdapter for reading persisted player data
//   - lib/types.ts — PlayerData type, GameType, createDefaultPlayerData, GAME_TYPES
// DEPENDENTS: None (this is a leaf route)
// NOTES:
//   - Data is read once on mount (no polling or subscriptions)
//   - If no data exists in localStorage, createDefaultPlayerData() provides
//     defaults (1000 rating for all games, no history)
//   - Keyboard-driven: Enter key starts a session (no mouse required)
// ============================================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { PlayerData, GameType } from '@/lib/types'
import { createDefaultPlayerData, GAME_TYPES } from '@/lib/types'
import { calculateStreak } from '@/lib/streak'
import type { StreakInfo } from '@/lib/streak'
import { GAME_REGISTRY } from '@/lib/registry'

// Converts a lastPlayed ISO timestamp into a human-readable relative string.
// Returns "never" if the game has not been played, otherwise "Xm ago", "Xh ago", or "Xd ago".
// Used in the per-game rating row to show recency of play.
function formatLastPlayed(timestamp: string | null): string {
  if (!timestamp) return 'never'
  const diff = Date.now() - new Date(timestamp).getTime()
  // 60000ms = 1 minute
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Home is the default export for the "/" route.
// It loads player data from localStorage on mount and displays ratings.
export default function Home() {
  const router = useRouter()
  // Initialize with default data (all 1000 ratings) — replaced on mount with actual data
  const [playerData, setPlayerData] = useState<PlayerData>(createDefaultPlayerData())
  // Streak info: current consecutive days played and longest ever
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0 })

  // Load player data from localStorage on mount.
  // This runs client-side only (window.localStorage is not available on server).
  // The LocalStorageAdapter wraps window.localStorage and handles JSON parsing.
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    setPlayerData(storage.getPlayerData())
    setStreak(calculateStreak(storage.getSessionHistory()))
  }, [])

  // Navigate to the session route — memoized because it's used in the keydown listener
  const handleStart = useCallback(() => {
    router.push('/session')
  }, [router])

  // Global keyboard listener: Enter key starts a session.
  // This is the primary interaction — the button is just a visual hint.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleStart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleStart])

  return (
    // flex-1 fills the body's flex column; items-center + justify-center
    // vertically and horizontally centers all content on the page
    <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
      {/* Composite rating — the big number at the top of the home screen.
          This is the equal-weight average of all per-game ratings (20% each).
          Displayed in a large monospace font for visual emphasis. */}
      <div className="text-center">
        <div className="text-text-secondary text-sm uppercase tracking-widest mb-2">
          Composite Rating
        </div>
        <div className="text-6xl font-light font-mono tracking-tight">
          {playerData.compositeRating}
        </div>
      </div>

      {/* Streak display — only shown when the player has an active streak.
          Positioned between composite rating and per-game ratings for visual hierarchy. */}
      {streak.current > 0 && (
        <div className="text-center">
          <div className="text-3xl font-light font-mono">{streak.current}</div>
          <div className="text-text-hint text-xs">day streak</div>
        </div>
      )}

      {/* Per-game ratings — one row per game type showing:
          - Colored dot (game accent color)
          - Game name label
          - Current Elo rating (monospace)
          - Last played timestamp (relative, e.g. "3h ago" or "never")
          GAME_TYPES is the canonical array of all 5 game types from lib/types.ts. */}
      <div className="flex gap-6 flex-wrap justify-center">
        {GAME_TYPES.map((game) => (
          <div key={game} className="flex items-center gap-2">
            {/* Small colored circle identifying the game type */}
            <div className={`w-2 h-2 rounded-full ${GAME_REGISTRY[game].accentClass}`} />
            <span className="text-text-secondary text-sm">{GAME_REGISTRY[game].name}</span>
            <span className="font-mono text-sm">{playerData.ratings[game]}</span>
            <span className="text-text-hint text-xs">
              {formatLastPlayed(playerData.lastPlayed[game])}
            </span>
          </div>
        ))}
      </div>

      {/* Start prompt — clickable as a fallback, but the primary UX is pressing Enter.
          Styled as a subtle hint rather than a prominent button. */}
      <button
        onClick={handleStart}
        className="text-text-hint text-sm hover:text-text-secondary transition-colors"
      >
        press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">enter</span> to start
      </button>

      {/* Link to the analytics/stats page — minimal hint style matching the start button */}
      <button
        onClick={() => router.push('/stats')}
        className="text-text-hint text-xs hover:text-text-secondary transition-colors"
      >
        view stats
      </button>
    </div>
  )
}
