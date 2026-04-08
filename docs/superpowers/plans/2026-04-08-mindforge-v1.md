# MindForge v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working mental math trainer with adaptive difficulty, Elo rating, and a shared game engine that future cognitive games plug into.

**Architecture:** Shared game engine (sprint runner, difficulty engine, Elo, storage) with a plugin interface. v1 ships the math plugin only. All game logic is pure functions tested independently. UI is minimal Next.js 16 App Router with client components for interactivity.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Bun, Vitest for testing.

**Next.js 16 Notes:** `'use client'` directive works same as v14/15. `params` in page components must be `await`ed. Turbopack is default. React 19.2 included.

---

## File Structure

```
lib/
  types.ts              — Core types: GameType, PlayerData, SprintResult, GamePlugin
  elo.ts                — Elo rating calculation (pure functions)
  difficulty.ts         — Adaptive difficulty engine (pure functions)
  storage.ts            — StorageAdapter interface + localStorage implementation
  engine.ts             — Sprint runner: orchestrates questions, scoring, difficulty updates
lib/games/
  math/
    generator.ts        — Math question generator per difficulty level
    constants.ts        — Difficulty level definitions + expected response times
app/
  globals.css           — Theme CSS custom properties
  layout.tsx            — Root layout with fonts + metadata
  page.tsx              — Home screen: ratings + start prompt
  session/
    page.tsx            — Server component shell for /session
    session-view.tsx    — Client component: session state machine (sprint → complete → sprint)
    sprint-view.tsx     — Client component: renders current question + progress bar
    sprint-complete.tsx — Client component: between-sprint stats overlay
    math-input.tsx      — Client component: right-aligned number typing for math
__tests__/
  lib/
    elo.test.ts
    difficulty.test.ts
    storage.test.ts
    engine.test.ts
  lib/games/math/
    generator.test.ts
```

---

### Task 1: Set Up Testing Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest + test script)

- [ ] **Step 1: Install vitest**

Run:
```bash
bun add -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Add test script to package.json**

Add to `"scripts"` in `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs**

Run:
```bash
bun run test
```
Expected: exits cleanly with "no test files found" (not an error).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json bun.lock
git commit -m "chore: add vitest testing infrastructure"
```

---

### Task 2: Core Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create core types file**

Create `lib/types.ts`:
```typescript
export type GameType = 'math' | 'stroop' | 'spatial' | 'switching' | 'nback'

export const GAME_TYPES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback']

export type PlayerData = {
  ratings: Record<GameType, number>
  compositeRating: number
  lastPlayed: Record<GameType, string | null>
  sprintCounts: Record<GameType, number>
}

export type SprintResult = {
  gameType: GameType
  difficulty: number
  questionCount: number
  correctCount: number
  avgResponseTimeMs: number
  ratingBefore: number
  ratingAfter: number
  timestamp: string
}

export type Question = {
  prompt: string
  answer: string
  difficulty: number
  expectedTimeMs: number
}

export type QuestionResult = {
  question: Question
  userAnswer: string
  correct: boolean
  responseTimeMs: number
}

export type GamePlugin = {
  type: GameType
  name: string
  accentColor: string
  generateQuestion: (difficulty: number) => Question
  inputMode: 'number' | 'choice' | 'binary'
}

export const DEFAULT_RATING = 1000
export const BASELINE_DIFFICULTY = 1

export function createDefaultPlayerData(): PlayerData {
  const ratings = {} as Record<GameType, number>
  const lastPlayed = {} as Record<GameType, string | null>
  const sprintCounts = {} as Record<GameType, number>
  for (const game of GAME_TYPES) {
    ratings[game] = DEFAULT_RATING
    lastPlayed[game] = null
    sprintCounts[game] = 0
  }
  return { ratings, compositeRating: DEFAULT_RATING, lastPlayed, sprintCounts }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
bunx tsc --noEmit lib/types.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add core types for game engine"
```

---

### Task 3: Elo Rating System

**Files:**
- Create: `lib/elo.ts`
- Create: `__tests__/lib/elo.test.ts`

- [ ] **Step 1: Write failing tests for Elo calculation**

Create `__tests__/lib/elo.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateExpected, calculateNewRating, calculateTimeMultiplier, calculateCompositeRating } from '@/lib/elo'
import type { GameType } from '@/lib/types'
import { DEFAULT_RATING } from '@/lib/types'

describe('calculateExpected', () => {
  it('returns 0.5 when player and difficulty ratings are equal', () => {
    expect(calculateExpected(1000, 1000)).toBeCloseTo(0.5)
  })

  it('returns higher value when player rating exceeds difficulty', () => {
    const result = calculateExpected(1200, 1000)
    expect(result).toBeGreaterThan(0.5)
    expect(result).toBeCloseTo(0.76, 1)
  })

  it('returns lower value when difficulty exceeds player rating', () => {
    const result = calculateExpected(1000, 1200)
    expect(result).toBeLessThan(0.5)
    expect(result).toBeCloseTo(0.24, 1)
  })
})

describe('calculateTimeMultiplier', () => {
  it('returns 1.0 when response time equals expected time', () => {
    expect(calculateTimeMultiplier(5000, 5000)).toBeCloseTo(1.0)
  })

  it('returns > 1.0 when faster than expected', () => {
    const result = calculateTimeMultiplier(2500, 5000)
    expect(result).toBeGreaterThan(1.0)
    expect(result).toBeLessThanOrEqual(1.2)
  })

  it('returns < 1.0 when slower than expected', () => {
    const result = calculateTimeMultiplier(10000, 5000)
    expect(result).toBeLessThan(1.0)
    expect(result).toBeGreaterThanOrEqual(0.8)
  })

  it('clamps to 1.2 max', () => {
    expect(calculateTimeMultiplier(100, 5000)).toBeCloseTo(1.2)
  })

  it('clamps to 0.8 min', () => {
    expect(calculateTimeMultiplier(50000, 5000)).toBeCloseTo(0.8)
  })
})

describe('calculateNewRating', () => {
  it('increases rating on perfect sprint against equal difficulty', () => {
    const result = calculateNewRating({
      playerRating: 1000,
      difficultyRating: 1000,
      accuracy: 1.0,
      avgResponseTimeMs: 3000,
      expectedTimeMs: 3000,
      sprintCount: 0,
    })
    expect(result).toBeGreaterThan(1000)
  })

  it('decreases rating on 0% accuracy', () => {
    const result = calculateNewRating({
      playerRating: 1000,
      difficultyRating: 1000,
      accuracy: 0,
      avgResponseTimeMs: 3000,
      expectedTimeMs: 3000,
      sprintCount: 0,
    })
    expect(result).toBeLessThan(1000)
  })

  it('uses K=32 for first 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000,
      difficultyRating: 1000,
      accuracy: 1.0,
      avgResponseTimeMs: 3000,
      expectedTimeMs: 3000,
      sprintCount: 5,
    })
    // K=32, expected=0.5, score=1.0*1.0=1.0, change = 32 * (1.0 - 0.5) = 16
    expect(result).toBeCloseTo(1016)
  })

  it('uses K=16 after 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000,
      difficultyRating: 1000,
      accuracy: 1.0,
      avgResponseTimeMs: 3000,
      expectedTimeMs: 3000,
      sprintCount: 15,
    })
    // K=16, expected=0.5, score=1.0*1.0=1.0, change = 16 * (1.0 - 0.5) = 8
    expect(result).toBeCloseTo(1008)
  })
})

describe('calculateCompositeRating', () => {
  it('returns average of all ratings', () => {
    const ratings: Record<GameType, number> = {
      math: 1200,
      stroop: 1000,
      spatial: 1000,
      switching: 1000,
      nback: 800,
    }
    expect(calculateCompositeRating(ratings)).toBe(1000)
  })

  it('returns DEFAULT_RATING when all are default', () => {
    const ratings: Record<GameType, number> = {
      math: DEFAULT_RATING,
      stroop: DEFAULT_RATING,
      spatial: DEFAULT_RATING,
      switching: DEFAULT_RATING,
      nback: DEFAULT_RATING,
    }
    expect(calculateCompositeRating(ratings)).toBe(DEFAULT_RATING)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/elo.test.ts
```
Expected: FAIL — module `@/lib/elo` not found.

- [ ] **Step 3: Implement Elo system**

Create `lib/elo.ts`:
```typescript
import type { GameType } from './types'
import { GAME_TYPES } from './types'

export function calculateExpected(playerRating: number, difficultyRating: number): number {
  return 1 / (1 + Math.pow(10, (difficultyRating - playerRating) / 400))
}

export function calculateTimeMultiplier(avgResponseTimeMs: number, expectedTimeMs: number): number {
  const ratio = expectedTimeMs / avgResponseTimeMs
  const multiplier = 0.8 + 0.4 * Math.min(1, Math.max(0, (ratio - 0.5) / 1.5))
  return Math.max(0.8, Math.min(1.2, multiplier))
}

type RatingInput = {
  playerRating: number
  difficultyRating: number
  accuracy: number
  avgResponseTimeMs: number
  expectedTimeMs: number
  sprintCount: number
}

export function calculateNewRating(input: RatingInput): number {
  const { playerRating, difficultyRating, accuracy, avgResponseTimeMs, expectedTimeMs, sprintCount } = input
  const K = sprintCount < 10 ? 32 : 16
  const expected = calculateExpected(playerRating, difficultyRating)
  const timeMultiplier = calculateTimeMultiplier(avgResponseTimeMs, expectedTimeMs)
  const score = Math.max(0, Math.min(1, accuracy * timeMultiplier))
  return Math.round(playerRating + K * (score - expected))
}

export function calculateCompositeRating(ratings: Record<GameType, number>): number {
  const sum = GAME_TYPES.reduce((acc, game) => acc + ratings[game], 0)
  return Math.round(sum / GAME_TYPES.length)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/elo.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/elo.ts __tests__/lib/elo.test.ts
git commit -m "feat: implement Elo rating system with time multiplier"
```

---

### Task 4: Adaptive Difficulty Engine

**Files:**
- Create: `lib/difficulty.ts`
- Create: `__tests__/lib/difficulty.test.ts`

- [ ] **Step 1: Write failing tests for difficulty engine**

Create `__tests__/lib/difficulty.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { adjustDifficulty, calculateSmartDecay, calculateStartingDifficulty } from '@/lib/difficulty'

describe('adjustDifficulty', () => {
  it('increases by 2 when accuracy > 85% and fast', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 2000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(7)
  })

  it('increases by 1 when accuracy > 85% and slow', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 8000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(6)
  })

  it('holds when accuracy is 70-85%', () => {
    const result = adjustDifficulty({ accuracy: 0.78, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(5)
  })

  it('decreases by 1 when accuracy is 50-70%', () => {
    const result = adjustDifficulty({ accuracy: 0.6, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(4)
  })

  it('decreases by 2 when accuracy < 50%', () => {
    const result = adjustDifficulty({ accuracy: 0.3, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(3)
  })

  it('never goes below 1', () => {
    const result = adjustDifficulty({ accuracy: 0.1, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 1 })
    expect(result).toBe(1)
  })
})

describe('calculateSmartDecay', () => {
  it('returns ~0.97 for 1 day off', () => {
    expect(calculateSmartDecay(1)).toBeCloseTo(0.97, 2)
  })

  it('returns ~0.79 for 7 days off', () => {
    expect(calculateSmartDecay(7)).toBeCloseTo(0.79, 2)
  })

  it('floors at 0.5 for 17+ days off', () => {
    expect(calculateSmartDecay(17)).toBeCloseTo(0.5, 1)
    expect(calculateSmartDecay(30)).toBe(0.5)
  })

  it('returns 1.0 for 0 days off', () => {
    expect(calculateSmartDecay(0)).toBe(1.0)
  })
})

describe('calculateStartingDifficulty', () => {
  it('applies decay factor to peak rating above baseline', () => {
    // peakDifficulty=10, baseline=1, 7 days off (decay=0.79)
    // starting = 1 + (10-1) * 0.79 = 1 + 7.11 = 8.11 → 8
    const result = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 7, sprintInSession: 0 })
    expect(result).toBe(8)
  })

  it('applies warm-up reduction for first 2 sprints', () => {
    const sprint0 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 0 })
    const sprint1 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 1 })
    const sprint2 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 2 })

    expect(sprint0).toBeLessThan(10)
    expect(sprint1).toBeLessThan(10)
    expect(sprint2).toBe(10)
  })

  it('returns baseline for brand new player', () => {
    const result = calculateStartingDifficulty({ peakDifficulty: 1, daysOff: 0, sprintInSession: 0 })
    expect(result).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/difficulty.test.ts
```
Expected: FAIL — module `@/lib/difficulty` not found.

- [ ] **Step 3: Implement difficulty engine**

Create `lib/difficulty.ts`:
```typescript
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

  // Warm-up: first 2 sprints start 2 levels below, ramping up
  let warmupReduction = 0
  if (sprintInSession === 0) warmupReduction = 2
  else if (sprintInSession === 1) warmupReduction = 1

  return Math.max(BASELINE_DIFFICULTY, Math.round(decayed - warmupReduction))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/difficulty.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/difficulty.ts __tests__/lib/difficulty.test.ts
git commit -m "feat: implement adaptive difficulty engine with smart decay and warm-up"
```

---

### Task 5: Storage Layer

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests for storage**

Create `__tests__/lib/storage.test.ts`:
```typescript
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
      gameType: 'math',
      difficulty: 3,
      questionCount: 7,
      correctCount: 6,
      avgResponseTimeMs: 4200,
      ratingBefore: 1000,
      ratingAfter: 1016,
      timestamp: new Date().toISOString(),
    }
    adapter.saveSprintResult(result)
    const history = adapter.getSessionHistory()
    expect(history).toHaveLength(1)
    expect(history[0].correctCount).toBe(6)
  })

  it('respects limit on getSessionHistory', () => {
    const makeResult = (i: number): SprintResult => ({
      gameType: 'math',
      difficulty: i,
      questionCount: 7,
      correctCount: 5,
      avgResponseTimeMs: 4000,
      ratingBefore: 1000,
      ratingAfter: 1010,
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
      gameType: 'math',
      difficulty: 3,
      questionCount: 7,
      correctCount: 6,
      avgResponseTimeMs: 4200,
      ratingBefore: 1000,
      ratingAfter: 1016,
      timestamp: '2026-04-08T12:00:00.000Z',
    }
    adapter.saveSprintResult(result)
    const data = adapter.getPlayerData()
    expect(data.lastPlayed.math).toBe('2026-04-08T12:00:00.000Z')
    expect(data.sprintCounts.math).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/storage.test.ts
```
Expected: FAIL — module `@/lib/storage` not found.

- [ ] **Step 3: Implement storage layer**

Create `lib/storage.ts`:
```typescript
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
    // Update player data
    const data = this.getPlayerData()
    data.lastPlayed[result.gameType] = result.timestamp
    data.sprintCounts[result.gameType] = (data.sprintCounts[result.gameType] || 0) + 1
    this.savePlayerData(data)

    // Append to history
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/storage.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: implement localStorage adapter with StorageAdapter interface"
```

---

### Task 6: Math Question Generator

**Files:**
- Create: `lib/games/math/constants.ts`
- Create: `lib/games/math/generator.ts`
- Create: `__tests__/lib/games/math/generator.test.ts`

- [ ] **Step 1: Create math constants**

Create `lib/games/math/constants.ts`:
```typescript
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
  { level: 8, name: 'Multi-digit × single-digit', expectedTimeMs: 8000 },
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
```

- [ ] **Step 2: Write failing tests for math generator**

Create `__tests__/lib/games/math/generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateMathQuestion } from '@/lib/games/math/generator'

describe('generateMathQuestion', () => {
  it('generates single-digit addition at level 1', () => {
    const q = generateMathQuestion(1)
    expect(q.difficulty).toBe(1)
    expect(q.prompt).toMatch(/^\d \+ \d$/)
    const [a, b] = q.prompt.split(' + ').map(Number)
    expect(q.answer).toBe(String(a + b))
  })

  it('generates single-digit subtraction at level 2 with non-negative result', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(2)
      expect(q.prompt).toMatch(/^\d - \d$/)
      expect(Number(q.answer)).toBeGreaterThanOrEqual(0)
    }
  })

  it('generates double-digit addition without carry at level 3', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(3)
      const [a, b] = q.prompt.split(' + ').map(Number)
      expect(a).toBeGreaterThanOrEqual(10)
      expect(a).toBeLessThan(100)
      // No carry: ones digits sum < 10
      expect((a % 10) + (b % 10)).toBeLessThan(10)
    }
  })

  it('generates double-digit addition with carry at level 4', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(4)
      const [a, b] = q.prompt.split(' + ').map(Number)
      expect(a).toBeGreaterThanOrEqual(10)
      expect(a).toBeLessThan(100)
      expect(q.answer).toBe(String(a + b))
    }
  })

  it('generates triple-digit addition at level 5', () => {
    const q = generateMathQuestion(5)
    const [a, b] = q.prompt.split(' + ').map(Number)
    expect(a).toBeGreaterThanOrEqual(100)
    expect(a).toBeLessThan(1000)
    expect(q.answer).toBe(String(a + b))
  })

  it('generates multiplication with 2, 5, or 10 at level 6', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(6)
      expect(q.prompt).toMatch(/×/)
      const [a, b] = q.prompt.split(' × ').map(Number)
      expect([2, 5, 10]).toContain(Math.min(a, b) <= 10 ? [a, b].find(n => [2, 5, 10].includes(n)) : undefined)
      expect(q.answer).toBe(String(a * b))
    }
  })

  it('generates mixed multiplication at level 7', () => {
    const q = generateMathQuestion(7)
    expect(q.prompt).toMatch(/×/)
    const [a, b] = q.prompt.split(' × ').map(Number)
    expect(a).toBeGreaterThanOrEqual(2)
    expect(a).toBeLessThanOrEqual(12)
    expect(q.answer).toBe(String(a * b))
  })

  it('generates multi-digit × single-digit at level 8', () => {
    const q = generateMathQuestion(8)
    expect(q.prompt).toMatch(/×/)
    const [a, b] = q.prompt.split(' × ').map(Number)
    const multi = Math.max(a, b)
    const single = Math.min(a, b)
    expect(multi).toBeGreaterThanOrEqual(100)
    expect(single).toBeGreaterThanOrEqual(2)
    expect(single).toBeLessThanOrEqual(9)
    expect(q.answer).toBe(String(a * b))
  })

  it('generates division with integer result at level 9', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(9)
      expect(q.prompt).toMatch(/÷/)
      const answer = Number(q.answer)
      expect(Number.isInteger(answer)).toBe(true)
      expect(answer).toBeGreaterThan(0)
    }
  })

  it('has correct expectedTimeMs from constants', () => {
    const q1 = generateMathQuestion(1)
    expect(q1.expectedTimeMs).toBe(3000)
    const q8 = generateMathQuestion(8)
    expect(q8.expectedTimeMs).toBe(8000)
  })

  it('clamps to max level when difficulty exceeds levels', () => {
    const q = generateMathQuestion(99)
    expect(q.difficulty).toBe(13)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/games/math/generator.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement math question generator**

Create `lib/games/math/generator.ts`:
```typescript
import type { Question } from '@/lib/types'
import { MATH_LEVELS, getExpectedTimeMs } from './constants'

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateLevel1(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  const b = rand(1, 9)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel2(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  const b = rand(1, a) // b <= a ensures non-negative result
  return { prompt: `${a} - ${b}`, answer: String(a - b) }
}

function generateLevel3(): { prompt: string; answer: string } {
  // No carry: ones digits must sum < 10
  let a: number, b: number
  do {
    a = rand(10, 99)
    b = rand(10, 99)
  } while ((a % 10) + (b % 10) >= 10)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel4(): { prompt: string; answer: string } {
  const a = rand(10, 99)
  const b = rand(10, 99)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel5(): { prompt: string; answer: string } {
  const a = rand(100, 999)
  const b = rand(100, 999)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel6(): { prompt: string; answer: string } {
  const easy = pick([2, 5, 10])
  const other = rand(2, 12)
  return { prompt: `${other} × ${easy}`, answer: String(other * easy) }
}

function generateLevel7(): { prompt: string; answer: string } {
  const a = rand(2, 12)
  const b = rand(2, 12)
  return { prompt: `${a} × ${b}`, answer: String(a * b) }
}

function generateLevel8(): { prompt: string; answer: string } {
  const multi = rand(100, 999)
  const single = rand(2, 9)
  return { prompt: `${multi} × ${single}`, answer: String(multi * single) }
}

function generateLevel9(): { prompt: string; answer: string } {
  // Generate by picking answer and divisor, then computing dividend
  const answer = rand(2, 20)
  const divisor = rand(2, 12)
  const dividend = answer * divisor
  return { prompt: `${dividend} ÷ ${divisor}`, answer: String(answer) }
}

function generateLevel10(): { prompt: string; answer: string } {
  const a = rand(10, 50)
  const b = rand(2, 9)
  const c = rand(1, 30)
  const op = pick(['+', '-'])
  const product = a * b
  const result = op === '+' ? product + c : product - c
  return { prompt: `${a} × ${b} ${op} ${c}`, answer: String(result) }
}

function generateLevel11(): { prompt: string; answer: string } {
  const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256]
  const n = pick(perfectSquares)
  return { prompt: `√${n}`, answer: String(Math.sqrt(n)) }
}

function generateLevel12(): { prompt: string; answer: string } {
  // Simple fraction addition: a/b + c/d where result is a whole number or simple fraction
  const denom = pick([2, 3, 4, 5, 6])
  const num1 = rand(1, denom - 1)
  const num2 = rand(1, denom - 1)
  const resultNum = num1 + num2
  const gcd = gcdFn(resultNum, denom)
  const simplifiedNum = resultNum / gcd
  const simplifiedDenom = denom / gcd
  const answer = simplifiedDenom === 1 ? String(simplifiedNum) : `${simplifiedNum}/${simplifiedDenom}`
  return { prompt: `${num1}/${denom} + ${num2}/${denom}`, answer }
}

function generateLevel13(): { prompt: string; answer: string } {
  // Solve: ax + b = c
  const x = rand(1, 15)
  const a = rand(2, 8)
  const b = rand(1, 20)
  const c = a * x + b
  return { prompt: `Solve: ${a}x + ${b} = ${c}`, answer: String(x) }
}

function gcdFn(a: number, b: number): number {
  return b === 0 ? a : gcdFn(b, a % b)
}

const generators: Record<number, () => { prompt: string; answer: string }> = {
  1: generateLevel1,
  2: generateLevel2,
  3: generateLevel3,
  4: generateLevel4,
  5: generateLevel5,
  6: generateLevel6,
  7: generateLevel7,
  8: generateLevel8,
  9: generateLevel9,
  10: generateLevel10,
  11: generateLevel11,
  12: generateLevel12,
  13: generateLevel13,
}

export function generateMathQuestion(difficulty: number): Question {
  const clamped = Math.max(1, Math.min(difficulty, MATH_LEVELS.length))
  const generator = generators[clamped]
  const { prompt, answer } = generator()
  return {
    prompt,
    answer,
    difficulty: clamped,
    expectedTimeMs: getExpectedTimeMs(clamped),
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/games/math/generator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/games/math/constants.ts lib/games/math/generator.ts __tests__/lib/games/math/generator.test.ts
git commit -m "feat: implement math question generator with 13 difficulty levels"
```

---

### Task 7: Sprint Engine

**Files:**
- Create: `lib/engine.ts`
- Create: `__tests__/lib/engine.test.ts`

- [ ] **Step 1: Write failing tests for sprint engine**

Create `__tests__/lib/engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createSprint,
  recordAnswer,
  isSprintComplete,
  getSprintSummary,
} from '@/lib/engine'
import type { Question } from '@/lib/types'

const makeQuestion = (answer: string): Question => ({
  prompt: '2 + 3',
  answer,
  difficulty: 1,
  expectedTimeMs: 3000,
})

describe('createSprint', () => {
  it('creates a sprint with specified question count', () => {
    const questions = [makeQuestion('5'), makeQuestion('7'), makeQuestion('10')]
    const sprint = createSprint(questions)
    expect(sprint.questions).toHaveLength(3)
    expect(sprint.results).toHaveLength(0)
    expect(sprint.currentIndex).toBe(0)
  })
})

describe('recordAnswer', () => {
  it('records a correct answer', () => {
    const sprint = createSprint([makeQuestion('5'), makeQuestion('7')])
    const updated = recordAnswer(sprint, '5', 2000)
    expect(updated.results).toHaveLength(1)
    expect(updated.results[0].correct).toBe(true)
    expect(updated.results[0].responseTimeMs).toBe(2000)
    expect(updated.currentIndex).toBe(1)
  })

  it('records an incorrect answer', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, '99', 3000)
    expect(updated.results[0].correct).toBe(false)
  })

  it('trims whitespace from user answer', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, ' 5 ', 2000)
    expect(updated.results[0].correct).toBe(true)
  })
})

describe('isSprintComplete', () => {
  it('returns false when questions remain', () => {
    const sprint = createSprint([makeQuestion('5'), makeQuestion('7')])
    expect(isSprintComplete(sprint)).toBe(false)
  })

  it('returns true when all questions answered', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, '5', 2000)
    expect(isSprintComplete(updated)).toBe(true)
  })
})

describe('getSprintSummary', () => {
  it('calculates accuracy and average time', () => {
    let sprint = createSprint([
      makeQuestion('5'),
      makeQuestion('7'),
      makeQuestion('10'),
    ])
    sprint = recordAnswer(sprint, '5', 2000) // correct
    sprint = recordAnswer(sprint, '99', 3000) // wrong
    sprint = recordAnswer(sprint, '10', 4000) // correct

    const summary = getSprintSummary(sprint)
    expect(summary.questionCount).toBe(3)
    expect(summary.correctCount).toBe(2)
    expect(summary.accuracy).toBeCloseTo(2 / 3)
    expect(summary.avgResponseTimeMs).toBe(3000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/engine.test.ts
```
Expected: FAIL — module `@/lib/engine` not found.

- [ ] **Step 3: Implement sprint engine**

Create `lib/engine.ts`:
```typescript
import type { Question, QuestionResult } from './types'

export type Sprint = {
  questions: Question[]
  results: QuestionResult[]
  currentIndex: number
}

export type SprintSummary = {
  questionCount: number
  correctCount: number
  accuracy: number
  avgResponseTimeMs: number
}

export function createSprint(questions: Question[]): Sprint {
  return {
    questions,
    results: [],
    currentIndex: 0,
  }
}

export function recordAnswer(sprint: Sprint, userAnswer: string, responseTimeMs: number): Sprint {
  const question = sprint.questions[sprint.currentIndex]
  const trimmedAnswer = userAnswer.trim()
  const correct = trimmedAnswer === question.answer

  const result: QuestionResult = {
    question,
    userAnswer: trimmedAnswer,
    correct,
    responseTimeMs,
  }

  return {
    ...sprint,
    results: [...sprint.results, result],
    currentIndex: sprint.currentIndex + 1,
  }
}

export function isSprintComplete(sprint: Sprint): boolean {
  return sprint.currentIndex >= sprint.questions.length
}

export function getSprintSummary(sprint: Sprint): SprintSummary {
  const correctCount = sprint.results.filter(r => r.correct).length
  const totalTime = sprint.results.reduce((sum, r) => sum + r.responseTimeMs, 0)

  return {
    questionCount: sprint.results.length,
    correctCount,
    accuracy: sprint.results.length > 0 ? correctCount / sprint.results.length : 0,
    avgResponseTimeMs: sprint.results.length > 0 ? Math.round(totalTime / sprint.results.length) : 0,
  }
}

export function generateSprintQuestionCount(): number {
  return Math.floor(Math.random() * 3) + 5 // 5, 6, or 7
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/engine.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine.ts __tests__/lib/engine.test.ts
git commit -m "feat: implement sprint engine with question tracking and summary"
```

---

### Task 8: Theme & Layout Setup

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update globals.css with theme**

Replace the contents of `app/globals.css` with:
```css
@import "tailwindcss";

@theme {
  --color-surface: #fafafa;
  --color-card: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #a1a1aa;
  --color-text-hint: #c4c4c4;
  --color-border: #e5e5e5;
  --color-surface-alt: #f0f0f5;

  --color-accent-math: #6366f1;
  --color-accent-stroop: #f43f5e;
  --color-accent-spatial: #06b6d4;
  --color-accent-switching: #f59e0b;
  --color-accent-nback: #8b5cf6;

  --color-positive: #10b981;
  --color-negative: #ef4444;

  --font-mono: 'SF Mono', 'Cascadia Code', ui-monospace, monospace;
}
```

- [ ] **Step 2: Update layout.tsx**

Replace the contents of `app/layout.tsx` with:
```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MindForge',
  description: 'Adaptive cognitive training for sharper thinking',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-text-primary">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify the app builds**

Run:
```bash
bun run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: set up MindForge theme and root layout"
```

---

### Task 9: Home Screen

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement home screen**

Replace the contents of `app/page.tsx` with:
```tsx
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
```

- [ ] **Step 2: Verify the page renders**

Run:
```bash
bun run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```
Expected: HTML output containing "MindForge" and "Composite Rating".

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement home screen with ratings display and start prompt"
```

---

### Task 10: Session Page — Server Shell

**Files:**
- Create: `app/session/page.tsx`

- [ ] **Step 1: Create session route**

Create `app/session/page.tsx`:
```tsx
import { SessionView } from './session-view'

export default function SessionPage() {
  return <SessionView />
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/session
git add app/session/page.tsx
git commit -m "feat: add session route shell"
```

---

### Task 11: Math Input Component

**Files:**
- Create: `app/session/math-input.tsx`

- [ ] **Step 1: Implement math input component**

Create `app/session/math-input.tsx`:
```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Question } from '@/lib/types'

type MathInputProps = {
  question: Question
  onSubmit: (answer: string) => void
}

export function MathInput({ question, onSubmit }: MathInputProps) {
  const [value, setValue] = useState('')

  // Reset value when question changes
  useEffect(() => {
    setValue('')
  }, [question])

  const handleSubmit = useCallback(() => {
    if (value.trim() === '') return
    onSubmit(value)
  }, [value, onSubmit])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }
      if (e.key === 'Backspace') {
        setValue((v) => v.slice(0, -1))
        return
      }
      if (e.key === '-' && value === '') {
        setValue('-')
        return
      }
      if (e.key === '/' && !value.includes('/')) {
        setValue((v) => v + '/')
        return
      }
      if (/^\d$/.test(e.key)) {
        setValue((v) => v + e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit, value])

  // Split prompt into lines for right-aligned stacked display
  const parts = question.prompt.split(' ')
  const isMultiLine = parts.length === 3 && ['+', '-', '×', '÷'].includes(parts[1])

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="text-right font-mono min-w-[160px]">
        {isMultiLine ? (
          <>
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              {parts[0]}
            </div>
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              <span className="text-accent-math mr-3">{parts[1]}</span>
              {parts[2]}
            </div>
          </>
        ) : (
          <div className="text-[40px] font-normal tracking-wider text-text-primary">
            {question.prompt}
          </div>
        )}
        <div className="border-t-2 border-border mt-2 pt-3">
          <span className="text-[40px] font-normal tracking-wider text-accent-math">
            {value || '\u00A0'}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/session/math-input.tsx
git commit -m "feat: implement math input component with right-aligned stacked layout"
```

---

### Task 12: Sprint View Component

**Files:**
- Create: `app/session/sprint-view.tsx`

- [ ] **Step 1: Implement sprint view**

Create `app/session/sprint-view.tsx`:
```tsx
'use client'

import type { Sprint } from '@/lib/engine'
import type { GameType } from '@/lib/types'
import { MathInput } from './math-input'

type SprintViewProps = {
  sprint: Sprint
  gameType: GameType
  currentRating: number
  onAnswer: (answer: string) => void
}

const ACCENT_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
}

export function SprintView({ sprint, gameType, currentRating, onAnswer }: SprintViewProps) {
  const question = sprint.questions[sprint.currentIndex]
  const progress = sprint.currentIndex / sprint.questions.length

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Progress bar */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full ${ACCENT_COLORS[gameType]} rounded-full transition-all duration-200`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-hint font-mono">
          {sprint.currentIndex}/{sprint.questions.length}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Current rating */}
        <div className="text-sm text-text-hint font-mono">{currentRating}</div>

        {/* Game-specific input */}
        {gameType === 'math' && (
          <MathInput question={question} onSubmit={onAnswer} />
        )}
      </div>

      {/* Keyboard hint */}
      <div className="py-4 text-center text-xs text-text-hint">
        type answer · enter to submit
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/session/sprint-view.tsx
git commit -m "feat: implement sprint view with progress bar and game input"
```

---

### Task 13: Sprint Complete Component

**Files:**
- Create: `app/session/sprint-complete.tsx`

- [ ] **Step 1: Implement sprint complete screen**

Create `app/session/sprint-complete.tsx`:
```tsx
'use client'

import { useEffect, useCallback } from 'react'
import type { SprintSummary } from '@/lib/engine'

type SprintCompleteProps = {
  summary: SprintSummary
  ratingBefore: number
  ratingAfter: number
  onContinue: () => void
}

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

export function SprintComplete({ summary, ratingBefore, ratingAfter, onContinue }: SprintCompleteProps) {
  const ratingChange = ratingAfter - ratingBefore
  const changeColor = ratingChange >= 0 ? 'text-positive' : 'text-negative'
  const changePrefix = ratingChange >= 0 ? '+' : ''

  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleContinue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleContinue])

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-sm text-text-secondary uppercase tracking-widest mb-6">
          Sprint Complete
        </div>

        <div className="flex gap-10 mb-8">
          <div>
            <div className="text-4xl font-light text-positive">
              {summary.correctCount}/{summary.questionCount}
            </div>
            <div className="text-xs text-text-hint mt-1">correct</div>
          </div>
          <div>
            <div className="text-4xl font-light text-text-primary">
              {formatTime(summary.avgResponseTimeMs)}
            </div>
            <div className="text-xs text-text-hint mt-1">avg time</div>
          </div>
        </div>

        <div className="bg-surface-alt rounded-xl px-8 py-4 mb-8">
          <div className="text-sm text-text-hint mb-2">Math Rating</div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-light font-mono">{ratingAfter}</span>
            <span className={`text-base ${changeColor}`}>
              {changePrefix}{ratingChange}
            </span>
          </div>
        </div>

        <div className="text-sm text-text-hint">
          press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">enter</span> to continue
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/session/sprint-complete.tsx
git commit -m "feat: implement sprint complete screen with rating change display"
```

---

### Task 14: Session View — Full Session State Machine

**Files:**
- Create: `app/session/session-view.tsx`

- [ ] **Step 1: Implement session view state machine**

Create `app/session/session-view.tsx`:
```tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { StorageAdapter } from '@/lib/storage'
import { createSprint, recordAnswer, isSprintComplete, getSprintSummary, generateSprintQuestionCount } from '@/lib/engine'
import type { Sprint, SprintSummary } from '@/lib/engine'
import { adjustDifficulty, calculateStartingDifficulty } from '@/lib/difficulty'
import { calculateNewRating } from '@/lib/elo'
import { generateMathQuestion } from '@/lib/games/math/generator'
import { getExpectedTimeMs } from '@/lib/games/math/constants'
import type { GameType, Question } from '@/lib/types'
import { SprintView } from './sprint-view'
import { SprintComplete } from './sprint-complete'

type SessionState =
  | { phase: 'playing'; sprint: Sprint }
  | { phase: 'reviewing'; summary: SprintSummary; ratingBefore: number; ratingAfter: number }

function generateQuestions(difficulty: number, count: number): Question[] {
  return Array.from({ length: count }, () => generateMathQuestion(difficulty))
}

export function SessionView() {
  const router = useRouter()
  const storageRef = useRef<StorageAdapter | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [difficulty, setDifficulty] = useState(1)
  const [currentRating, setCurrentRating] = useState(1000)
  const [sprintNumber, setSprintNumber] = useState(0)
  const questionStartRef = useRef<number>(Date.now())
  const gameType: GameType = 'math'

  // Initialize session
  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    storageRef.current = storage
    const playerData = storage.getPlayerData()

    const lastPlayed = playerData.lastPlayed[gameType]
    const daysOff = lastPlayed
      ? Math.floor((Date.now() - new Date(lastPlayed).getTime()) / 86400000)
      : 0

    const peakDifficulty = Math.max(1, Math.round((playerData.ratings[gameType] - 1000) / 50) + 1)
    const startDifficulty = calculateStartingDifficulty({
      peakDifficulty,
      daysOff,
      sprintInSession: 0,
    })

    setDifficulty(startDifficulty)
    setCurrentRating(playerData.ratings[gameType])

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(startDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!state || state.phase !== 'playing') return

      const responseTimeMs = Date.now() - questionStartRef.current
      const updated = recordAnswer(state.sprint, answer, responseTimeMs)

      if (isSprintComplete(updated)) {
        const summary = getSprintSummary(updated)
        const storage = storageRef.current!
        const playerData = storage.getPlayerData()

        const newRating = calculateNewRating({
          playerRating: currentRating,
          difficultyRating: 1000 + (difficulty - 1) * 50,
          accuracy: summary.accuracy,
          avgResponseTimeMs: summary.avgResponseTimeMs,
          expectedTimeMs: getExpectedTimeMs(difficulty),
          sprintCount: playerData.sprintCounts[gameType],
        })

        storage.updateRating(gameType, newRating)
        storage.saveSprintResult({
          gameType,
          difficulty,
          questionCount: summary.questionCount,
          correctCount: summary.correctCount,
          avgResponseTimeMs: summary.avgResponseTimeMs,
          ratingBefore: currentRating,
          ratingAfter: newRating,
          timestamp: new Date().toISOString(),
        })

        setState({
          phase: 'reviewing',
          summary,
          ratingBefore: currentRating,
          ratingAfter: newRating,
        })
        setCurrentRating(newRating)
      } else {
        setState({ phase: 'playing', sprint: updated })
        questionStartRef.current = Date.now()
      }
    },
    [state, currentRating, difficulty, gameType],
  )

  const handleContinue = useCallback(() => {
    if (!state || state.phase !== 'reviewing') return

    const nextSprintNum = sprintNumber + 1
    setSprintNumber(nextSprintNum)

    const newDifficulty = adjustDifficulty({
      accuracy: state.summary.accuracy,
      avgResponseTimeMs: state.summary.avgResponseTimeMs,
      expectedTimeMs: getExpectedTimeMs(difficulty),
      currentDifficulty: difficulty,
    })
    setDifficulty(newDifficulty)

    const count = generateSprintQuestionCount()
    const questions = generateQuestions(newDifficulty, count)
    setState({ phase: 'playing', sprint: createSprint(questions) })
    questionStartRef.current = Date.now()
  }, [state, sprintNumber, difficulty])

  // Escape to go home
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  if (!state) return null

  if (state.phase === 'playing') {
    return (
      <SprintView
        sprint={state.sprint}
        gameType={gameType}
        currentRating={currentRating}
        onAnswer={handleAnswer}
      />
    )
  }

  return (
    <SprintComplete
      summary={state.summary}
      ratingBefore={state.ratingBefore}
      ratingAfter={state.ratingAfter}
      onContinue={handleContinue}
    />
  )
}
```

- [ ] **Step 2: Verify the full app builds**

Run:
```bash
bun run build
```
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/session/session-view.tsx
git commit -m "feat: implement session state machine with sprint loop and adaptive difficulty"
```

---

### Task 15: Run All Tests & Manual Smoke Test

- [ ] **Step 1: Run full test suite**

Run:
```bash
bun run test
```
Expected: all tests pass across elo, difficulty, storage, engine, and generator.

- [ ] **Step 2: Run the app and smoke test manually**

Run:
```bash
bun run dev
```

Manual smoke test checklist:
1. Home screen shows "Composite Rating: 1000" and all 5 game labels with 1000 ratings
2. Press Enter → navigates to `/session`
3. Math question appears with right-aligned stacked layout
4. Type a number → appears in indigo below the line
5. Press Enter → next question, progress bar advances
6. After 5-7 questions → sprint complete screen shows accuracy, time, rating change
7. Press Enter → next sprint begins
8. Press Escape → returns to home
9. Home screen now shows updated Math rating and "Xm ago" timestamp
10. Reload page → ratings persist from localStorage

- [ ] **Step 3: Fix any issues found during smoke test**

If issues are found, fix them and re-run `bun run test` + `bun run build`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, app builds successfully"
```

---

### Task 16: Clean Up Scaffold Files

- [ ] **Step 1: Remove unused scaffold assets**

Delete files that are no longer needed:
```bash
rm public/next.svg public/vercel.svg public/file-text.svg public/globe.svg public/window.svg
```

- [ ] **Step 2: Verify build still works**

Run:
```bash
bun run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused scaffold assets"
```
