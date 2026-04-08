// Tests for: /Users/ishanpatel/Projects/mindforge/lib/storage.ts
// Module: localStorage adapter implementing the storage interface
// Key behaviors: default data initialization, player data persistence,
// sprint result history with limit support, and metadata updates (lastPlayed, sprintCounts)
// Storage keys: "mindforge_player" (player data), "mindforge_history" (sprint results)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalStorageAdapter } from '@/lib/storage'
import { createDefaultPlayerData } from '@/lib/types'
import type { SprintResult } from '@/lib/types'

// Injectable mock Storage object — allows testing without a real browser localStorage
// The adapter accepts a Storage param in its constructor for exactly this purpose
const mockStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) }),
  length: 0,
  key: vi.fn(() => null),
}

// Tests the full lifecycle of the LocalStorageAdapter:
// initialization, reads, writes, and derived data updates
describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  // Reset mock storage and spies before each test to ensure isolation
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    vi.clearAllMocks()
    adapter = new LocalStorageAdapter(localStorageMock as unknown as Storage)
  })

  // Verifies that a fresh adapter with empty storage returns sensible defaults
  // Default rating is 1000, no games played, zero sprint counts
  it('returns default player data when nothing is stored', () => {
    const data = adapter.getPlayerData()
    expect(data.ratings.math).toBe(1000) // DEFAULT_RATING = 1000
    expect(data.compositeRating).toBe(1000)
    expect(data.lastPlayed.math).toBeNull() // never played
    expect(data.sprintCounts.math).toBe(0)
  })

  // Ensures rating updates are persisted through the storage round-trip
  it('persists and retrieves player data after rating update', () => {
    adapter.updateRating('math', 1050)
    const data = adapter.getPlayerData()
    expect(data.ratings.math).toBe(1050)
  })

  // Tests the sprint result save/retrieve cycle with all required fields
  it('saves and retrieves sprint results', () => {
    const result: SprintResult = {
      gameType: 'math', difficulty: 3, questionCount: 7, correctCount: 6,
      avgResponseTimeMs: 4200, ratingBefore: 1000, ratingAfter: 1016,
      timestamp: new Date().toISOString(),
    }
    adapter.saveSprintResult(result)
    const history = adapter.getSessionHistory()
    expect(history).toHaveLength(1)
    expect(history[0].correctCount).toBe(6)
  })

  // Verifies the limit parameter on getSessionHistory truncates results
  // This prevents unbounded memory usage when displaying recent history
  it('respects limit on getSessionHistory', () => {
    const makeResult = (i: number): SprintResult => ({
      gameType: 'math', difficulty: i, questionCount: 7, correctCount: 5,
      avgResponseTimeMs: 4000, ratingBefore: 1000, ratingAfter: 1010,
      timestamp: new Date(Date.now() + i * 1000).toISOString(), // staggered timestamps
    })
    adapter.saveSprintResult(makeResult(1))
    adapter.saveSprintResult(makeResult(2))
    adapter.saveSprintResult(makeResult(3))
    const history = adapter.getSessionHistory(2) // request only 2 of 3
    expect(history).toHaveLength(2)
  })

  // Saving a sprint result should also update the player's lastPlayed timestamp
  // and increment the sprint count — these are used by decay and K-factor logic
  it('updates lastPlayed and sprintCounts when saving sprint result', () => {
    const result: SprintResult = {
      gameType: 'math', difficulty: 3, questionCount: 7, correctCount: 6,
      avgResponseTimeMs: 4200, ratingBefore: 1000, ratingAfter: 1016,
      timestamp: '2026-04-08T12:00:00.000Z',
    }
    adapter.saveSprintResult(result)
    const data = adapter.getPlayerData()
    expect(data.lastPlayed.math).toBe('2026-04-08T12:00:00.000Z')
    expect(data.sprintCounts.math).toBe(1) // incremented from 0
  })
})
