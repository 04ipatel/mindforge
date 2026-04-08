import type { PlayerData, SprintResult, GameType } from './types'
import { createDefaultPlayerData } from './types'
import { calculateCompositeRating } from './elo'

const PLAYER_DATA_KEY = 'mindforge_player'
const HISTORY_KEY = 'mindforge_history'

export interface StorageAdapter {
  getPlayerData(): PlayerData
  saveSprintResult(result: SprintResult): void
  updateRating(game: GameType, newRating: number): void
  getSessionHistory(limit?: number): SprintResult[]
}

export class LocalStorageAdapter implements StorageAdapter {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  getPlayerData(): PlayerData {
    const raw = this.storage.getItem(PLAYER_DATA_KEY)
    if (!raw) return createDefaultPlayerData()
    return JSON.parse(raw) as PlayerData
  }

  private savePlayerData(data: PlayerData): void {
    this.storage.setItem(PLAYER_DATA_KEY, JSON.stringify(data))
  }

  updateRating(game: GameType, newRating: number): void {
    const data = this.getPlayerData()
    data.ratings[game] = newRating
    data.compositeRating = calculateCompositeRating(data.ratings)
    this.savePlayerData(data)
  }

  saveSprintResult(result: SprintResult): void {
    const data = this.getPlayerData()
    data.lastPlayed[result.gameType] = result.timestamp
    data.sprintCounts[result.gameType] = (data.sprintCounts[result.gameType] || 0) + 1
    this.savePlayerData(data)
    const history = this.getSessionHistory()
    history.push(result)
    this.storage.setItem(HISTORY_KEY, JSON.stringify(history))
  }

  getSessionHistory(limit?: number): SprintResult[] {
    const raw = this.storage.getItem(HISTORY_KEY)
    if (!raw) return []
    const history = JSON.parse(raw) as SprintResult[]
    if (limit !== undefined) return history.slice(-limit)
    return history
  }
}
