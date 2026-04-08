'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { PlayerData, GameType } from '@/lib/types'
import { createDefaultPlayerData, GAME_TYPES } from '@/lib/types'

const GAME_LABELS: Record<GameType, string> = {
  math: 'Math',
  stroop: 'Stroop',
  spatial: 'Spatial',
  switching: 'Switching',
  nback: 'N-Back',
}

const GAME_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
}

function formatLastPlayed(timestamp: string | null): string {
  if (!timestamp) return 'never'
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Home() {
  const router = useRouter()
  const [playerData, setPlayerData] = useState<PlayerData>(createDefaultPlayerData())

  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    setPlayerData(storage.getPlayerData())
  }, [])

  const handleStart = useCallback(() => {
    router.push('/session')
  }, [router])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleStart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleStart])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
      {/* Composite rating */}
      <div className="text-center">
        <div className="text-text-secondary text-sm uppercase tracking-widest mb-2">
          Composite Rating
        </div>
        <div className="text-6xl font-light font-mono tracking-tight">
          {playerData.compositeRating}
        </div>
      </div>

      {/* Per-game ratings */}
      <div className="flex gap-6 flex-wrap justify-center">
        {GAME_TYPES.map((game) => (
          <div key={game} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${GAME_COLORS[game]}`} />
            <span className="text-text-secondary text-sm">{GAME_LABELS[game]}</span>
            <span className="font-mono text-sm">{playerData.ratings[game]}</span>
            <span className="text-text-hint text-xs">
              {formatLastPlayed(playerData.lastPlayed[game])}
            </span>
          </div>
        ))}
      </div>

      {/* Start prompt */}
      <button
        onClick={handleStart}
        className="text-text-hint text-sm hover:text-text-secondary transition-colors"
      >
        press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">enter</span> to start
      </button>
    </div>
  )
}
