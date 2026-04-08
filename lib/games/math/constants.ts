export type MathLevel = {
  level: number
  name: string
  expectedTimeMs: number
}

export const MATH_LEVELS: MathLevel[] = [
  { level: 1, name: 'Single-digit addition', expectedTimeMs: 3000 },
  { level: 2, name: 'Single-digit subtraction', expectedTimeMs: 3000 },
  { level: 3, name: 'Double-digit add (no carry)', expectedTimeMs: 5000 },
  { level: 4, name: 'Double-digit add (with carry)', expectedTimeMs: 6000 },
  { level: 5, name: 'Triple-digit addition', expectedTimeMs: 8000 },
  { level: 6, name: 'Multiplication tables (2,5,10)', expectedTimeMs: 4000 },
  { level: 7, name: 'Mixed multiplication', expectedTimeMs: 5000 },
  { level: 8, name: 'Multi-digit x single-digit', expectedTimeMs: 8000 },
  { level: 9, name: 'Division', expectedTimeMs: 8000 },
  { level: 10, name: 'Mixed operations', expectedTimeMs: 10000 },
  { level: 11, name: 'Square roots', expectedTimeMs: 10000 },
  { level: 12, name: 'Fractions', expectedTimeMs: 12000 },
  { level: 13, name: 'Multi-step algebra', expectedTimeMs: 15000 },
]

export function getExpectedTimeMs(difficulty: number): number {
  const clamped = Math.min(difficulty, MATH_LEVELS.length)
  return MATH_LEVELS[clamped - 1].expectedTimeMs
}
