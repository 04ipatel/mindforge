// =============================================================================
// lib/storage.ts — Storage adapter interface + localStorage implementation
// =============================================================================
// WHAT: Defines the StorageAdapter interface (abstraction layer for persistence)
//   and provides LocalStorageAdapter as the v1 implementation using browser
//   localStorage. Games and engine never touch storage directly — they go
//   through this interface.
// ROLE: Data access layer. Bridges pure logic (lib/) and browser APIs.
// DEPENDENCIES:
//   - lib/types.ts (PlayerData, SprintResult, GameType, createDefaultPlayerData)
//   - lib/elo.ts (calculateCompositeRating — recalculated on every rating update)
// DEPENDENTS:
//   - app/session/session-view.tsx (reads player data, saves sprint results)
//   - app/page.tsx (reads player data and history for home screen)
//   - __tests__/storage.test.ts
// STORAGE KEYS:
//   - 'mindforge_player': JSON-serialized PlayerData object
//   - 'mindforge_history': JSON-serialized SprintResult[] array (append-only)
// FUTURE: When Supabase is added, a new SupabaseStorageAdapter will implement
//   the same StorageAdapter interface, enabling a drop-in swap.
// =============================================================================

import type { PlayerData, SprintResult, GameType } from './types'
import { createDefaultPlayerData } from './types'
import { calculateCompositeRating } from './elo'

// localStorage key for the player's profile (ratings, lastPlayed, sprintCounts)
const PLAYER_DATA_KEY = 'mindforge_player'
// localStorage key for the full sprint history (append-only array of SprintResult)
const HISTORY_KEY = 'mindforge_history'

// Abstract interface for all storage operations. Any implementation must provide
// these 4 methods. This is what the rest of the app codes against.
// By depending on this interface (not the class), we can:
//   1. Swap localStorage for Supabase later without changing consumers
//   2. Inject a mock/fake Storage in tests (pass a memoryStorage to constructor)
export interface StorageAdapter {
  getPlayerData(): PlayerData
  saveSprintResult(result: SprintResult): void
  updateRating(game: GameType, newRating: number): void
  getSessionHistory(limit?: number): SprintResult[]
}

// v1 implementation using browser localStorage.
// Constructor takes a Storage object (window.localStorage in prod, or a fake in tests).
// This dependency injection pattern makes the class fully testable without mocking globals.
export class LocalStorageAdapter implements StorageAdapter {
  private storage: Storage

  // Pass window.localStorage in production, or a custom Storage-compatible
  // object in tests (e.g., from 'jest-localstorage-mock' or a simple in-memory impl)
  constructor(storage: Storage) {
    this.storage = storage
  }

  // Retrieve the player's profile data. Returns fresh defaults if no data exists
  // (first launch scenario). Callers should not cache this — always re-read for
  // the latest state, since saveSprintResult() and updateRating() mutate storage.
  getPlayerData(): PlayerData {
    const raw = this.storage.getItem(PLAYER_DATA_KEY)
    if (!raw) return createDefaultPlayerData()
    return JSON.parse(raw) as PlayerData
  }

  // Internal helper to persist the full PlayerData object.
  // Only called by other methods in this class, never externally.
  private savePlayerData(data: PlayerData): void {
    this.storage.setItem(PLAYER_DATA_KEY, JSON.stringify(data))
  }

  // Update a single game's Elo rating and recompute the composite rating.
  // Called by app/session/session-view.tsx after calculating the new rating via lib/elo.ts.
  // The composite rating is always recalculated from all 5 game ratings (equal weight).
  updateRating(game: GameType, newRating: number): void {
    const data = this.getPlayerData()
    data.ratings[game] = newRating
    // Recompute composite as average of all game ratings (see lib/elo.ts)
    data.compositeRating = calculateCompositeRating(data.ratings)
    this.savePlayerData(data)
  }

  // Save a completed sprint result. This does two things:
  // 1. Updates PlayerData: sets lastPlayed timestamp and increments sprintCount
  //    for the game. sprintCount is important because it determines K-factor
  //    in Elo (K=32 for first 10 sprints, K=16 after — see lib/elo.ts).
  // 2. Appends to history: the full SprintResult is pushed onto the history array.
  //    History is append-only and never pruned (may need pagination later).
  // Note: this does NOT update the rating — that's done separately via updateRating().
  saveSprintResult(result: SprintResult): void {
    const data = this.getPlayerData()
    // Record when this game was last played (ISO timestamp from sprint result)
    data.lastPlayed[result.gameType] = result.timestamp
    // Increment sprint count (guards against missing field with || 0)
    data.sprintCounts[result.gameType] = (data.sprintCounts[result.gameType] || 0) + 1
    this.savePlayerData(data)
    // Append to session history
    const history = this.getSessionHistory()
    history.push(result)
    this.storage.setItem(HISTORY_KEY, JSON.stringify(history))
  }

  // Retrieve sprint history, optionally limited to the most recent N results.
  // - limit undefined: returns all history
  // - limit provided: returns the last `limit` entries (most recent)
  // Uses Array.slice(-limit) to get the tail of the array.
  getSessionHistory(limit?: number): SprintResult[] {
    const raw = this.storage.getItem(HISTORY_KEY)
    if (!raw) return []
    const history = JSON.parse(raw) as SprintResult[]
    if (limit !== undefined) return history.slice(-limit)
    return history
  }
}
