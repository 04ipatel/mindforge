// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/speed/generator.ts
// Module: Speed of Processing (UFOV-style) question generator with 8 difficulty levels
// Key behaviors: target position selection within position count (4 or 8),
// flash duration metadata, expected time scaling, difficulty clamping,
// and duplicate avoidance via existingPrompts

import { describe, it, expect } from 'vitest'
import { generateSpeedQuestion } from '@/lib/games/speed/generator'
import { SPEED_LEVELS } from '@/lib/games/speed/constants'

describe('generateSpeedQuestion', () => {
  // Verifies basic question structure: prompt and answer match,
  // metadata includes all required fields for the input component
  it('generates a question with correct metadata fields', () => {
    const q = generateSpeedQuestion(1)
    expect(q.prompt).toBeTruthy()
    expect(q.answer).toBe(q.prompt)
    expect(q.difficulty).toBe(1)
    expect(q.metadata).toBeDefined()
    expect(q.metadata!.flashDurationMs).toBe(500)
    expect(q.metadata!.positionCount).toBe(4)
    expect(q.metadata!.targetPosition).toBeDefined()
  })

  // Levels 1-3 use 4 positions — target must be in range [1, 4]
  it('generates positions in range 1-4 at level 1', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) {
      const q = generateSpeedQuestion(1)
      const pos = q.metadata!.targetPosition as number
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(4)
      seen.add(pos)
    }
    // With 100 iterations, all 4 positions should appear
    expect(seen.size).toBe(4)
  })

  // Levels 4-8 use 8 positions — target must be in range [1, 8]
  it('generates positions in range 1-8 at level 5', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const q = generateSpeedQuestion(5)
      const pos = q.metadata!.targetPosition as number
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(8)
      seen.add(pos)
    }
    // With 200 iterations, all 8 positions should appear
    expect(seen.size).toBe(8)
  })

  // Flash duration should decrease as difficulty increases
  it('decreases flash duration with higher difficulty', () => {
    const q1 = generateSpeedQuestion(1)
    const q4 = generateSpeedQuestion(4)
    const q6 = generateSpeedQuestion(6)
    const q8 = generateSpeedQuestion(8)

    const flash1 = q1.metadata!.flashDurationMs as number
    const flash4 = q4.metadata!.flashDurationMs as number
    const flash6 = q6.metadata!.flashDurationMs as number
    const flash8 = q8.metadata!.flashDurationMs as number

    // 500 > 300 > 150 > 50 — strictly decreasing across sampled levels
    expect(flash1).toBeGreaterThan(flash4)
    expect(flash4).toBeGreaterThan(flash6)
    expect(flash6).toBeGreaterThan(flash8)
  })

  // Expected time should match the constants table
  it('returns correct expectedTimeMs for each level', () => {
    for (const level of SPEED_LEVELS) {
      const q = generateSpeedQuestion(level.level)
      expect(q.expectedTimeMs).toBe(level.expectedTimeMs)
    }
  })

  // Difficulty above max (8) should clamp to 8
  it('clamps difficulty above max to level 8', () => {
    const q = generateSpeedQuestion(20)
    expect(q.difficulty).toBe(8)
    expect(q.metadata!.flashDurationMs).toBe(50)
    expect(q.metadata!.positionCount).toBe(8)
  })

  // Difficulty below 1 should clamp to 1
  it('clamps difficulty below 1 to level 1', () => {
    const q = generateSpeedQuestion(0)
    expect(q.difficulty).toBe(1)
    expect(q.metadata!.flashDurationMs).toBe(500)
    expect(q.metadata!.positionCount).toBe(4)
  })

  // Dedup: passing existingPrompts should avoid those positions
  it('avoids duplicate prompts when existingPrompts is provided', () => {
    // At level 1 there are 4 positions. Block 3 of them.
    const existing = new Set(['1', '2', '3'])
    for (let i = 0; i < 20; i++) {
      const q = generateSpeedQuestion(1, existing)
      // The only remaining position is "4"
      expect(q.prompt).toBe('4')
    }
  })

  // When all positions are blocked, it should still return a question
  // (after 50 retries, it gives up on dedup)
  it('returns a question even when all prompts are blocked', () => {
    const existing = new Set(['1', '2', '3', '4'])
    const q = generateSpeedQuestion(1, existing)
    expect(q).toBeDefined()
    expect(q.answer).toBeTruthy()
  })

  // Position count metadata matches the level definition
  it('has positionCount 4 for levels 1-3 and 8 for levels 4-8', () => {
    for (let d = 1; d <= 3; d++) {
      const q = generateSpeedQuestion(d)
      expect(q.metadata!.positionCount).toBe(4)
    }
    for (let d = 4; d <= 8; d++) {
      const q = generateSpeedQuestion(d)
      expect(q.metadata!.positionCount).toBe(8)
    }
  })
})
