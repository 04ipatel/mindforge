export type StroopColor = {
  name: string
  hex: string
}

export const BASE_COLORS: StroopColor[] = [
  { name: 'red', hex: '#ef4444' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'yellow', hex: '#eab308' },
]

export const EXTENDED_COLORS: StroopColor[] = [
  ...BASE_COLORS,
  { name: 'purple', hex: '#a855f7' },
  { name: 'orange', hex: '#f97316' },
]

export const FULL_COLORS: StroopColor[] = [
  ...EXTENDED_COLORS,
  { name: 'pink', hex: '#ec4899' },
  { name: 'cyan', hex: '#06b6d4' },
]

export type StroopLevel = {
  level: number
  name: string
  colorCount: number
  congruenceRatio: number
  expectedTimeMs: number
}

export const STROOP_LEVELS: StroopLevel[] = [
  { level: 1, name: '4 colors, 75% congruent', colorCount: 4, congruenceRatio: 0.75, expectedTimeMs: 3000 },
  { level: 2, name: '4 colors, 50% congruent', colorCount: 4, congruenceRatio: 0.50, expectedTimeMs: 2500 },
  { level: 3, name: '4 colors, 25% congruent', colorCount: 4, congruenceRatio: 0.25, expectedTimeMs: 2000 },
  { level: 4, name: '6 colors, 50% congruent', colorCount: 6, congruenceRatio: 0.50, expectedTimeMs: 2500 },
  { level: 5, name: '6 colors, 25% congruent', colorCount: 6, congruenceRatio: 0.25, expectedTimeMs: 2000 },
  { level: 6, name: '8 colors, 50% congruent', colorCount: 8, congruenceRatio: 0.50, expectedTimeMs: 2000 },
  { level: 7, name: '8 colors, 25% congruent', colorCount: 8, congruenceRatio: 0.25, expectedTimeMs: 1500 },
  { level: 8, name: '8 colors, 15% congruent', colorCount: 8, congruenceRatio: 0.15, expectedTimeMs: 1200 },
]

export function getStroopExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, STROOP_LEVELS.length))
  return STROOP_LEVELS[clamped - 1].expectedTimeMs
}

export function getColorsForLevel(colorCount: number): StroopColor[] {
  if (colorCount <= 4) return BASE_COLORS
  if (colorCount <= 6) return EXTENDED_COLORS
  return FULL_COLORS
}
