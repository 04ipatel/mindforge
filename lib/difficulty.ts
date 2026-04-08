import { BASELINE_DIFFICULTY } from './types'

type AdjustInput = {
  accuracy: number
  avgResponseTimeMs: number
  expectedTimeMs: number
  currentDifficulty: number
}

export function adjustDifficulty(input: AdjustInput): number {
  const { accuracy, avgResponseTimeMs, expectedTimeMs, currentDifficulty } = input
  const isFast = avgResponseTimeMs < expectedTimeMs
  let delta = 0
  if (accuracy > 0.85) {
    delta = isFast ? 2 : 1
  } else if (accuracy >= 0.70) {
    delta = 0
  } else if (accuracy >= 0.50) {
    delta = -1
  } else {
    delta = -2
  }
  return Math.max(BASELINE_DIFFICULTY, currentDifficulty + delta)
}

export function calculateSmartDecay(daysOff: number): number {
  if (daysOff <= 0) return 1.0
  return Math.max(0.5, 1 - daysOff * 0.03)
}

type StartingDifficultyInput = {
  peakDifficulty: number
  daysOff: number
  sprintInSession: number
}

export function calculateStartingDifficulty(input: StartingDifficultyInput): number {
  const { peakDifficulty, daysOff, sprintInSession } = input
  const decayFactor = calculateSmartDecay(daysOff)
  const decayed = BASELINE_DIFFICULTY + (peakDifficulty - BASELINE_DIFFICULTY) * decayFactor
  let warmupReduction = 0
  if (sprintInSession === 0) warmupReduction = 2
  else if (sprintInSession === 1) warmupReduction = 1
  return Math.max(BASELINE_DIFFICULTY, Math.round(decayed - warmupReduction))
}
