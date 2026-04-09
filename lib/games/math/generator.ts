// =============================================================================
// lib/games/math/generator.ts — Math question generator for MindForge
// =============================================================================
// WHAT: Generates random math questions at 13 difficulty levels, from single-digit
//   addition to multi-step algebra. Each level has its own generator function
//   that produces a prompt string and correct answer string.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/math/constants.ts (MATH_LEVELS for max level, getExpectedTimeMs)
// DEPENDENTS:
//   - The math GamePlugin object (defined in app/session/ or wherever plugins are registered)
//   - app/session/session-view.tsx (calls generateMathQuestion via the plugin)
//   - __tests__/math.test.ts
// DEDUP: The existingPrompts parameter prevents duplicate questions within a sprint.
//   If a duplicate prompt is generated, it retries up to 50 times before giving up.
//   50 attempts is sufficient for all levels — even level 1 (9*9=81 combinations).
// =============================================================================

import type { Question } from '@/lib/types'
import { MATH_LEVELS, getExpectedTimeMs } from './constants'
import { clampDifficulty } from '@/lib/utils'

// Generate a random integer in [min, max] inclusive.
// Used by all level generators for operand generation.
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Pick a random element from an array. Used for selecting operators,
// multiplication factors, and perfect squares.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Level 1: Single-digit addition (1-9 + 1-9)
// Range: answers from 2 to 18
// Expected time: 3000ms
function generateLevel1(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  const b = rand(1, 9)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

// Level 2: Single-digit subtraction (a - b where b <= a, both 1-9)
// Always produces non-negative results (b is drawn from [1, a])
// Expected time: 3000ms
function generateLevel2(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  // b <= a ensures non-negative result
  const b = rand(1, a)
  return { prompt: `${a} - ${b}`, answer: String(a - b) }
}

// Level 3: Double-digit addition WITHOUT carry (ones digits sum < 10)
// The do-while loop ensures no carrying occurs: (a%10 + b%10) must be < 10.
// This isolates the "adding tens and ones separately" skill before introducing carry.
// Expected time: 5000ms
function generateLevel3(): { prompt: string; answer: string } {
  let a: number, b: number
  do {
    a = rand(10, 99)
    b = rand(10, 99)
    // Reject if ones digits would carry (sum >= 10)
  } while ((a % 10) + (b % 10) >= 10)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

// Level 4: Double-digit addition (any, including carry)
// No restrictions on carry — this is the full double-digit addition skill.
// Expected time: 6000ms (1s more than no-carry version)
function generateLevel4(): { prompt: string; answer: string } {
  const a = rand(10, 99)
  const b = rand(10, 99)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

// Level 5: Triple-digit addition (100-999 + 100-999)
// Answers range from 200 to 1998. Multiple carries possible.
// Expected time: 8000ms
function generateLevel5(): { prompt: string; answer: string } {
  const a = rand(100, 999)
  const b = rand(100, 999)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

// Level 6: Easy multiplication tables (×2, ×5, ×10 only)
// These are the "anchor" multiplication facts most people know.
// The easy factor is always one of [2, 5, 10], multiplied by 2-12.
// Uses × (multiplication sign U+00D7) for display.
// Expected time: 4000ms
function generateLevel6(): { prompt: string; answer: string } {
  const easy = pick([2, 5, 10])
  const other = rand(2, 12)
  return { prompt: `${other} \u00d7 ${easy}`, answer: String(other * easy) }
}

// Level 7: Full multiplication tables (2-12 × 2-12)
// All combinations, not just easy ones. Tests memorized facts.
// Expected time: 5000ms
function generateLevel7(): { prompt: string; answer: string } {
  const a = rand(2, 12)
  const b = rand(2, 12)
  return { prompt: `${a} \u00d7 ${b}`, answer: String(a * b) }
}

// Level 8: Multi-digit × single-digit (100-999 × 2-9)
// Requires carrying and holding intermediate results in working memory.
// Answers range from 200 to 8991.
// Expected time: 8000ms
function generateLevel8(): { prompt: string; answer: string } {
  const multi = rand(100, 999)
  const single = rand(2, 9)
  return { prompt: `${multi} \u00d7 ${single}`, answer: String(multi * single) }
}

// Level 9: Division (dividend ÷ divisor = integer answer)
// Constructed backwards to guarantee clean integer division:
//   answer = rand(2,20), divisor = rand(2,12), dividend = answer × divisor
// Uses ÷ (division sign U+00F7) for display.
// Expected time: 8000ms
function generateLevel9(): { prompt: string; answer: string } {
  // Build backwards: pick the answer first, then construct the division
  const answer = rand(2, 20)
  const divisor = rand(2, 12)
  const dividend = answer * divisor
  return { prompt: `${dividend} \u00f7 ${divisor}`, answer: String(answer) }
}

// Level 10: Mixed operations (multiply then add/subtract)
// Format: a × b ± c where a=10-50, b=2-9, c=1-30
// Tests order of operations and working memory.
// Expected time: 10000ms
function generateLevel10(): { prompt: string; answer: string } {
  const a = rand(10, 50)
  const b = rand(2, 9)
  const c = rand(1, 30)
  const op = pick(['+', '-'])
  const product = a * b
  const result = op === '+' ? product + c : product - c
  return { prompt: `${a} \u00d7 ${b} ${op} ${c}`, answer: String(result) }
}

// Level 11: Square roots of perfect squares
// Uses √ (square root sign U+221A) for display.
// Perfect squares range from 4 to 256 (answers 2 to 16).
// The fixed array ensures only valid perfect squares are selected.
// Expected time: 10000ms
function generateLevel11(): { prompt: string; answer: string } {
  // All perfect squares from 2² to 16² that a human can reasonably compute
  const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256]
  const n = pick(perfectSquares)
  return { prompt: `\u221a${n}`, answer: String(Math.sqrt(n)) }
}

// Level 12: Fraction addition with same denominator, requiring simplification.
// Format: num1/denom + num2/denom, answer simplified via GCD.
// Denominator is one of [2, 3, 4, 5, 6]. Numerators are < denominator
// (proper fractions). Answer may be a whole number (e.g., "1") if
// simplifiedDenom becomes 1, otherwise "num/denom" format.
// Expected time: 12000ms
function generateLevel12(): { prompt: string; answer: string } {
  const denom = pick([2, 3, 4, 5, 6])
  // Numerators are in [1, denom-1] to keep fractions proper
  const num1 = rand(1, denom - 1)
  const num2 = rand(1, denom - 1)
  const resultNum = num1 + num2
  // Simplify the result fraction using GCD
  const gcd = gcdFn(resultNum, denom)
  const simplifiedNum = resultNum / gcd
  const simplifiedDenom = denom / gcd
  // If denominator simplifies to 1, answer is just the numerator (whole number)
  const answer = simplifiedDenom === 1 ? String(simplifiedNum) : `${simplifiedNum}/${simplifiedDenom}`
  return { prompt: `${num1}/${denom} + ${num2}/${denom}`, answer }
}

// Level 13: Single-variable linear algebra (solve for x).
// Format: "Solve: ax + b = c" where x is the answer.
// Constructed backwards: pick x first, then compute c = a*x + b.
// This guarantees integer solutions. a=2-8, x=1-15, b=1-20.
// Expected time: 15000ms
function generateLevel13(): { prompt: string; answer: string } {
  // Build backwards: choose x, then construct the equation
  const x = rand(1, 15)
  const a = rand(2, 8)
  const b = rand(1, 20)
  const c = a * x + b
  return { prompt: `Solve: ${a}x + ${b} = ${c}`, answer: String(x) }
}

// Euclidean algorithm for Greatest Common Divisor. Used by level 12 (fractions)
// to simplify the result fraction to lowest terms.
// Recursive: gcd(a, 0) = a, gcd(a, b) = gcd(b, a % b)
function gcdFn(a: number, b: number): number {
  return b === 0 ? a : gcdFn(b, a % b)
}

// Lookup table mapping difficulty level (1-13) to its generator function.
// Used by generateMathQuestion() to dispatch to the correct level generator.
const generators: Record<number, () => { prompt: string; answer: string }> = {
  1: generateLevel1, 2: generateLevel2, 3: generateLevel3, 4: generateLevel4,
  5: generateLevel5, 6: generateLevel6, 7: generateLevel7, 8: generateLevel8,
  9: generateLevel9, 10: generateLevel10, 11: generateLevel11, 12: generateLevel12,
  13: generateLevel13,
}

// Generate a single math question at the given difficulty level.
// This is the main entry point — called by the math GamePlugin's generateQuestion method.
//
// - difficulty: 1-based level, clamped to [1, 13] (MATH_LEVELS.length)
// - existingPrompts: optional Set of prompt strings already used in this sprint,
//   used to avoid duplicate questions. If a duplicate is generated, retries up to
//   50 times before accepting it (50 attempts is generous — prevents infinite loops
//   even at low levels with limited combinations).
//
// Returns a Question object with prompt, answer, difficulty, and expectedTimeMs.
// The expectedTimeMs comes from the constants file and feeds into Elo/difficulty calculations.
export function generateMathQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  // Clamp difficulty to valid range [1, 13] using shared utility
  const clamped = clampDifficulty(difficulty, MATH_LEVELS.length)
  const generator = generators[clamped]
  let prompt: string
  let answer: string
  let attempts = 0
  // Retry loop to avoid duplicate prompts within the same sprint
  do {
    const result = generator()
    prompt = result.prompt
    answer = result.answer
    attempts++
  } while (existingPrompts?.has(prompt) && attempts < 50)
  return { prompt, answer, difficulty: clamped, expectedTimeMs: getExpectedTimeMs(clamped) }
}
