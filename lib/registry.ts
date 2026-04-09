// =============================================================================
// lib/registry.ts — Unified Game Registry for MindForge
// =============================================================================
// WHAT: Central registry of all game modules. Each game registers its generator,
//   expected time function, display metadata, and configuration. This is the
//   single source of truth for game-related lookups across the entire app.
// ROLE: Configuration + routing layer. Imports from all game modules and exposes
//   a unified interface. No game logic itself — delegates to game modules.
// WHY: Before this registry, adding a new game required editing ~6 files
//   (session-view, sprint-view, sprint-complete, page, stats-view, plus lookup
//   tables). Now it requires only 2: the game module itself and this registry.
// DEPENDENCIES:
//   - lib/types.ts (GameType, Question)
//   - lib/games/math/ (generator, constants)
//   - lib/games/stroop/ (generator, constants)
//   - lib/games/spatial/ (generator, constants)
//   - lib/games/switching/ (generator, constants)
//   - lib/games/nback/ (generator, constants)
//   - lib/games/speed/ (generator, constants)
//   - lib/games/memory/ (generator, constants)
// DEPENDENTS:
//   - app/session/session-view.tsx (uses generateQuestions, getExpectedTimeMs, ACTIVE_GAME_TYPES)
//   - app/session/sprint-view.tsx (uses GAME_REGISTRY for accent classes, keyboard hints)
//   - app/session/sprint-complete.tsx (uses GAME_REGISTRY for game names)
//   - app/page.tsx (uses GAME_REGISTRY for game labels and accent classes)
//   - app/stats/stats-view.tsx (uses GAME_REGISTRY for game labels and accent classes)
// =============================================================================

import type { GameType, Question } from '@/lib/types'

// Game generators
import { generateMathQuestion } from '@/lib/games/math/generator'
import { generateStroopQuestion } from '@/lib/games/stroop/generator'
import { generateSpatialQuestion } from '@/lib/games/spatial/generator'
import { generateSwitchingSequence } from '@/lib/games/switching/generator'
import { generateNBackSequence } from '@/lib/games/nback/generator'
import { generateSpeedQuestion } from '@/lib/games/speed/generator'
import { generateMemorySequence } from '@/lib/games/memory/generator'

// Game expected time functions
import { getExpectedTimeMs as getMathExpectedTimeMs } from '@/lib/games/math/constants'
import { getStroopExpectedTimeMs } from '@/lib/games/stroop/constants'
import { getSpatialExpectedTimeMs } from '@/lib/games/spatial/constants'
import { getSwitchingExpectedTimeMs } from '@/lib/games/switching/constants'
import { getNBackExpectedTimeMs } from '@/lib/games/nback/constants'
import { getSpeedExpectedTimeMs } from '@/lib/games/speed/constants'
import { getMemoryExpectedTimeMs } from '@/lib/games/memory/constants'

// GameRegistration is a discriminated union based on generator type:
// - 'per-question': generates one question at a time with optional dedup set
//   (math, stroop, spatial, speed)
// - 'batch': generates all questions at once because they are position-dependent
//   (switching, nback, memory)
// Shared fields: type, name, accentClass, keyboardHint, maxLevel, getExpectedTimeMs
export type GameRegistration = {
  // Identifies which game this is (matches GameType union)
  type: GameType
  // Human-readable display name (e.g., "Math", "N-Back")
  name: string
  // Tailwind background class for accent color (e.g., 'bg-accent-math')
  // Used for progress bars, rating dots, and game-specific UI accents
  accentClass: string
  // Hint text shown at the bottom of the sprint view, describing the input controls
  keyboardHint: string
  // Maximum difficulty level for this game (used for clamping)
  maxLevel: number
  // Returns the expected response time in ms for a given difficulty level
  getExpectedTimeMs: (difficulty: number) => number
} & (
  | {
      // Per-question generator: produces one Question at a time.
      // The optional Set<string> parameter enables dedup within a sprint.
      generatorType: 'per-question'
      generator: (difficulty: number, existingPrompts?: Set<string>) => Question
    }
  | {
      // Batch generator: produces all questions for a sprint at once.
      // Used when question N depends on earlier questions (e.g., switching rules, N-back positions).
      generatorType: 'batch'
      generateBatch: (difficulty: number, count: number) => Question[]
    }
)

// The central game registry. One entry per game type.
// To add a new game: create its module in lib/games/<name>/, then add an entry here.
// That's it — all consumers read from this registry.
export const GAME_REGISTRY: Record<GameType, GameRegistration> = {
  math: {
    type: 'math',
    name: 'Math',
    accentClass: 'bg-accent-math',
    keyboardHint: 'type answer \u00b7 enter to submit',
    maxLevel: 13,
    getExpectedTimeMs: getMathExpectedTimeMs,
    generatorType: 'per-question',
    generator: generateMathQuestion,
  },
  stroop: {
    type: 'stroop',
    name: 'Stroop',
    accentClass: 'bg-accent-stroop',
    keyboardHint: 'select the ink color',
    maxLevel: 8,
    getExpectedTimeMs: getStroopExpectedTimeMs,
    generatorType: 'per-question',
    generator: generateStroopQuestion,
  },
  spatial: {
    type: 'spatial',
    name: 'Spatial',
    accentClass: 'bg-accent-spatial',
    keyboardHint: 'press 1 for same \u00b7 2 for mirror',
    maxLevel: 8,
    getExpectedTimeMs: getSpatialExpectedTimeMs,
    generatorType: 'per-question',
    generator: generateSpatialQuestion,
  },
  switching: {
    type: 'switching',
    name: 'Switching',
    accentClass: 'bg-accent-switching',
    keyboardHint: 'press 1 or 2 to classify',
    maxLevel: 8,
    getExpectedTimeMs: getSwitchingExpectedTimeMs,
    generatorType: 'batch',
    generateBatch: generateSwitchingSequence,
  },
  nback: {
    type: 'nback',
    name: 'N-Back',
    accentClass: 'bg-accent-nback',
    keyboardHint: 'F = match \u00b7 J = no match',
    maxLevel: 8,
    getExpectedTimeMs: getNBackExpectedTimeMs,
    generatorType: 'batch',
    generateBatch: generateNBackSequence,
  },
  speed: {
    type: 'speed',
    name: 'Speed',
    accentClass: 'bg-accent-speed',
    keyboardHint: 'identify where the target appeared',
    maxLevel: 8,
    getExpectedTimeMs: getSpeedExpectedTimeMs,
    generatorType: 'per-question',
    generator: generateSpeedQuestion,
  },
  memory: {
    type: 'memory',
    name: 'Memory',
    accentClass: 'bg-accent-memory',
    keyboardHint: 'memorize the sequence \u00b7 type it back',
    maxLevel: 8,
    getExpectedTimeMs: getMemoryExpectedTimeMs,
    generatorType: 'batch',
    generateBatch: generateMemorySequence,
  },
}

// Generate questions for any game type. Dispatches to the correct generator
// based on the game's generatorType (per-question vs batch).
// For per-question generators, uses a Set to track and avoid duplicate prompts.
// For batch generators, passes through to the batch function directly.
export function generateQuestions(gameType: GameType, difficulty: number, count: number): Question[] {
  const reg = GAME_REGISTRY[gameType]

  if (reg.generatorType === 'batch') {
    // Batch generators produce the full sequence at once (position-dependent games)
    return reg.generateBatch(difficulty, count)
  }

  // Per-question generation with duplicate tracking
  const prompts = new Set<string>()
  const questions: Question[] = []
  for (let i = 0; i < count; i++) {
    const q = reg.generator(difficulty, prompts)
    // Add to the set so the next call can avoid this prompt
    prompts.add(q.prompt)
    questions.push(q)
  }
  return questions
}

// Get expected response time in ms for a game at a given difficulty.
// Convenience wrapper that looks up the function from the registry.
export function getExpectedTimeMs(gameType: GameType, difficulty: number): number {
  return GAME_REGISTRY[gameType].getExpectedTimeMs(difficulty)
}

// The list of game types currently active in the app.
// Game rotation in session-view only uses games from this list.
// To activate/deactivate a game, add/remove it here.
export const ACTIVE_GAME_TYPES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback', 'speed', 'memory']
