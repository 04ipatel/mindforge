// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/math/generator.ts
// Module: Math question generator with 13 difficulty levels
// Key behaviors: level-appropriate operand sizing, operation type progression,
// constraint enforcement (no-carry, non-negative, integer division),
// and correct answer computation for each level
// Level progression: L1 single-digit add, L2 sub, L3 no-carry add, L4 carry add,
// L5 triple-digit add, L6-8 multiplication, L9 division, L10-11 mixed ops,
// L12 fractions (GCD), L13 algebra

import { describe, it, expect } from 'vitest'
import { generateMathQuestion } from '@/lib/games/math/generator'

describe('generateMathQuestion', () => {
  // Level 1: simplest possible math — single digit + single digit
  // Verifies prompt format "X + Y" and correct sum
  it('generates single-digit addition at level 1', () => {
    const q = generateMathQuestion(1)
    expect(q.difficulty).toBe(1)
    expect(q.prompt).toMatch(/^\d \+ \d$/) // single digit operands
    const [a, b] = q.prompt.split(' + ').map(Number)
    expect(q.answer).toBe(String(a + b))
  })

  // Level 2: subtraction with the constraint that result >= 0
  // Without this constraint, negative answers would confuse early players
  // Run 20 times to catch probabilistic violations
  it('generates single-digit subtraction at level 2 with non-negative result', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(2)
      expect(q.prompt).toMatch(/^\d - \d$/)
      expect(Number(q.answer)).toBeGreaterThanOrEqual(0)
    }
  })

  // Level 3: double-digit addition WITHOUT carrying
  // The no-carry constraint means ones digits must sum to < 10
  // This isolates the skill of adding larger numbers before introducing carries
  it('generates double-digit addition without carry at level 3', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(3)
      const [a, b] = q.prompt.split(' + ').map(Number)
      expect(a).toBeGreaterThanOrEqual(10) // double-digit
      expect(a).toBeLessThan(100)
      expect((a % 10) + (b % 10)).toBeLessThan(10) // no carry from ones place
    }
  })

  // Level 4: double-digit addition WITH carry allowed
  // No carry constraint — tests the full mental addition skill
  it('generates double-digit addition with carry at level 4', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(4)
      const [a, b] = q.prompt.split(' + ').map(Number)
      expect(a).toBeGreaterThanOrEqual(10)
      expect(a).toBeLessThan(100)
      expect(q.answer).toBe(String(a + b))
    }
  })

  // Level 5: triple-digit addition — operands in [100, 999]
  it('generates triple-digit addition at level 5', () => {
    const q = generateMathQuestion(5)
    const [a, b] = q.prompt.split(' + ').map(Number)
    expect(a).toBeGreaterThanOrEqual(100)
    expect(a).toBeLessThan(1000)
    expect(q.answer).toBe(String(a + b))
  })

  // Level 6: intro multiplication with easy multipliers (2, 5, 10 only)
  // These are the first multiplication facts most people internalize
  // \u00d7 is the multiplication sign used in prompts
  it('generates multiplication with 2, 5, or 10 at level 6', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(6)
      expect(q.prompt).toMatch(/\u00d7/) // multiplication sign
      const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
      expect([2, 5, 10]).toContain(b) // second operand must be 2, 5, or 10
      expect(q.answer).toBe(String(a * b))
    }
  })

  // Level 7: full single-digit multiplication (times tables 2-12)
  it('generates mixed multiplication at level 7', () => {
    const q = generateMathQuestion(7)
    expect(q.prompt).toMatch(/\u00d7/)
    const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
    expect(a).toBeGreaterThanOrEqual(2)
    expect(a).toBeLessThanOrEqual(12) // standard times table range
    expect(q.answer).toBe(String(a * b))
  })

  // Level 8: multi-digit x single-digit (e.g. 234 x 7)
  // Tests that the larger operand is 100+ and smaller is 2-9
  it('generates multi-digit x single-digit at level 8', () => {
    const q = generateMathQuestion(8)
    expect(q.prompt).toMatch(/\u00d7/)
    const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
    const multi = Math.max(a, b)
    const single = Math.min(a, b)
    expect(multi).toBeGreaterThanOrEqual(100) // three+ digits
    expect(single).toBeGreaterThanOrEqual(2)
    expect(single).toBeLessThanOrEqual(9)
    expect(q.answer).toBe(String(a * b))
  })

  // Level 9: division with guaranteed integer results
  // Generator uses backwards construction (multiply first, then present as division)
  // to ensure clean answers — no decimals or remainders
  it('generates division with integer result at level 9', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(9)
      expect(q.prompt).toMatch(/\u00f7/) // division sign
      const answer = Number(q.answer)
      expect(Number.isInteger(answer)).toBe(true)
      expect(answer).toBeGreaterThan(0) // no zero or negative results
    }
  })

  // Verifies expectedTimeMs values from the LEVEL_CONFIG constants
  // Level 1 = 3000ms (simple), Level 8 = 8000ms (complex multi-digit multiplication)
  it('has correct expectedTimeMs from constants', () => {
    const q1 = generateMathQuestion(1)
    expect(q1.expectedTimeMs).toBe(3000) // 3 seconds for single-digit addition
    const q8 = generateMathQuestion(8)
    expect(q8.expectedTimeMs).toBe(8000) // 8 seconds for multi-digit multiplication
  })

  // Guards against out-of-range difficulty input
  // Level 99 should clamp to max level (13) rather than crashing
  it('clamps to max level when difficulty exceeds levels', () => {
    const q = generateMathQuestion(99)
    expect(q.difficulty).toBe(13) // max level is 13
  })
})
