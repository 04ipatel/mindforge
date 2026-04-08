import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalStorageAdapter } from '@/lib/storage'
import { createDefaultPlayerData } from '@/lib/types'
import type { SprintResult } from '@/lib/types'

const mockStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) }),
  length: 0,
  key: vi.fn(() => null),
}

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    vi.clearAllMocks()
    adapter = new LocalStorageAdapter(localStorageMock as unknown as Storage)
  })

  it('returns default player data when nothing is stored', () => {
    const data = adapter.getPlayerData()
    expect(data.ratings.math).toBe(1000)
    expect(data.compositeRating).toBe(1000)
    expect(data.lastPlayed.math).toBeNull()
    expect(data.sprintCounts.math).toBe(0)
  })

  it('persists and retrieves player data after rating update', () => {
    adapter.updateRating('math', 1050)
    const data = adapter.getPlayerData()
    expect(data.ratings.math).toBe(1050)
  })

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

  it('respects limit on getSessionHistory', () => {
    const makeResult = (i: number): SprintResult => ({
      gameType: 'math', difficulty: i, questionCount: 7, correctCount: 5,
      avgResponseTimeMs: 4000, ratingBefore: 1000, ratingAfter: 1010,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
    })
    adapter.saveSprintResult(makeResult(1))
    adapter.saveSprintResult(makeResult(2))
    adapter.saveSprintResult(makeResult(3))
    const history = adapter.getSessionHistory(2)
    expect(history).toHaveLength(2)
  })

  it('updates lastPlayed and sprintCounts when saving sprint result', () => {
    const result: SprintResult = {
      gameType: 'math', difficulty: 3, questionCount: 7, correctCount: 6,
      avgResponseTimeMs: 4200, ratingBefore: 1000, ratingAfter: 1016,
      timestamp: '2026-04-08T12:00:00.000Z',
    }
    adapter.saveSprintResult(result)
    const data = adapter.getPlayerData()
    expect(data.lastPlayed.math).toBe('2026-04-08T12:00:00.000Z')
    expect(data.sprintCounts.math).toBe(1)
  })
})
