// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/nback/generator.ts
// Module: N-Back sequence generator with 8 difficulty levels
// Key behaviors: position sequence generation with controlled match probability,
// match/no-match answers based on N-back comparison, batch sequence generation
// (all questions at once because answers depend on prior positions),
// and difficulty-scaled N-level (1 → 3) and match rate (30% → 40%)

import { describe, it, expect } from 'vitest'
import { generateNBackSequence } from '@/lib/games/nback/generator'
import { getNBackExpectedTimeMs, GRID_SIZE } from '@/lib/games/nback/constants'

describe('generateNBackSequence', () => {
  // Verifies that the generator returns exactly the requested number of questions
  it('generates the requested number of questions', () => {
    const seq = generateNBackSequence(1, 6)
    expect(seq).toHaveLength(6)
  })

  it('generates the requested number of questions for various counts', () => {
    expect(generateNBackSequence(1, 5)).toHaveLength(5)
    expect(generateNBackSequence(1, 7)).toHaveLength(7)
    expect(generateNBackSequence(3, 10)).toHaveLength(10)
  })

  // All positions must be within the 3x3 grid (1-9)
  it('generates positions within the 1-9 grid range', () => {
    const seq = generateNBackSequence(1, 50)
    seq.forEach(q => {
      const pos = parseInt(q.prompt)
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(GRID_SIZE)
    })
  })

  // First N questions must always be 'no-match' because there's no N-back reference
  it('marks first N questions as no-match for 1-back', () => {
    const seq = generateNBackSequence(1, 6)
    // 1-back: first 1 question is always no-match
    expect(seq[0].answer).toBe('no-match')
  })

  it('marks first N questions as no-match for 2-back', () => {
    const seq = generateNBackSequence(3, 6) // Level 3 = 2-back
    // 2-back: first 2 questions are always no-match
    expect(seq[0].answer).toBe('no-match')
    expect(seq[1].answer).toBe('no-match')
  })

  it('marks first N questions as no-match for 3-back', () => {
    const seq = generateNBackSequence(6, 7) // Level 6 = 3-back
    // 3-back: first 3 questions are always no-match
    expect(seq[0].answer).toBe('no-match')
    expect(seq[1].answer).toBe('no-match')
    expect(seq[2].answer).toBe('no-match')
  })

  // Verify match/no-match answers are correct relative to actual positions
  it('correctly determines match/no-match for 1-back', () => {
    const seq = generateNBackSequence(1, 20)
    for (let i = 1; i < seq.length; i++) {
      const currentPos = parseInt(seq[i].prompt)
      const nBackPos = parseInt(seq[i - 1].prompt)
      if (currentPos === nBackPos) {
        expect(seq[i].answer).toBe('match')
      } else {
        expect(seq[i].answer).toBe('no-match')
      }
    }
  })

  it('correctly determines match/no-match for 2-back', () => {
    const seq = generateNBackSequence(3, 20) // Level 3 = 2-back
    for (let i = 2; i < seq.length; i++) {
      const currentPos = parseInt(seq[i].prompt)
      const nBackPos = parseInt(seq[i - 2].prompt)
      if (currentPos === nBackPos) {
        expect(seq[i].answer).toBe('match')
      } else {
        expect(seq[i].answer).toBe('no-match')
      }
    }
  })

  it('correctly determines match/no-match for 3-back', () => {
    const seq = generateNBackSequence(6, 20) // Level 6 = 3-back
    for (let i = 3; i < seq.length; i++) {
      const currentPos = parseInt(seq[i].prompt)
      const nBackPos = parseInt(seq[i - 3].prompt)
      if (currentPos === nBackPos) {
        expect(seq[i].answer).toBe('match')
      } else {
        expect(seq[i].answer).toBe('no-match')
      }
    }
  })

  // Statistical test: over many trials, some matches should appear
  // (probability of zero matches over 100 trials with 30%+ match rate is vanishingly small)
  it('produces some matches over many trials', () => {
    const seq = generateNBackSequence(1, 100)
    const matchCount = seq.filter(q => q.answer === 'match').length
    expect(matchCount).toBeGreaterThan(0)
  })

  it('produces some matches for 2-back over many trials', () => {
    const seq = generateNBackSequence(3, 100)
    const matchCount = seq.filter(q => q.answer === 'match').length
    expect(matchCount).toBeGreaterThan(0)
  })

  // Metadata must include gridPosition, nLevel, and stepIndex
  it('includes gridPosition, nLevel, and stepIndex in metadata', () => {
    const seq = generateNBackSequence(1, 6)
    seq.forEach((q, i) => {
      expect(q.metadata).toBeDefined()
      expect(q.metadata!.gridPosition).toBe(parseInt(q.prompt))
      expect(q.metadata!.nLevel).toBe(1)
      expect(q.metadata!.stepIndex).toBe(i)
    })
  })

  it('sets correct nLevel in metadata for each difficulty', () => {
    // Levels 1-2: nLevel=1, Levels 3-5: nLevel=2, Levels 6-8: nLevel=3
    expect(generateNBackSequence(1, 1)[0].metadata!.nLevel).toBe(1)
    expect(generateNBackSequence(2, 1)[0].metadata!.nLevel).toBe(1)
    expect(generateNBackSequence(3, 1)[0].metadata!.nLevel).toBe(2)
    expect(generateNBackSequence(4, 1)[0].metadata!.nLevel).toBe(2)
    expect(generateNBackSequence(5, 1)[0].metadata!.nLevel).toBe(2)
    expect(generateNBackSequence(6, 1)[0].metadata!.nLevel).toBe(3)
    expect(generateNBackSequence(7, 1)[0].metadata!.nLevel).toBe(3)
    expect(generateNBackSequence(8, 1)[0].metadata!.nLevel).toBe(3)
  })

  // Verify expectedTimeMs from level constants
  it('has correct expectedTimeMs values', () => {
    expect(generateNBackSequence(1, 1)[0].expectedTimeMs).toBe(3000)
    expect(generateNBackSequence(2, 1)[0].expectedTimeMs).toBe(2500)
    expect(generateNBackSequence(3, 1)[0].expectedTimeMs).toBe(3500)
    expect(generateNBackSequence(4, 1)[0].expectedTimeMs).toBe(3000)
    expect(generateNBackSequence(5, 1)[0].expectedTimeMs).toBe(2500)
    expect(generateNBackSequence(6, 1)[0].expectedTimeMs).toBe(3500)
    expect(generateNBackSequence(7, 1)[0].expectedTimeMs).toBe(3000)
    expect(generateNBackSequence(8, 1)[0].expectedTimeMs).toBe(2500)
  })

  // Guards against out-of-range difficulty — clamps to [1, 8]
  it('clamps difficulty to valid range', () => {
    expect(generateNBackSequence(0, 1)[0].difficulty).toBe(1)
    expect(generateNBackSequence(-5, 1)[0].difficulty).toBe(1)
    expect(generateNBackSequence(99, 1)[0].difficulty).toBe(8)
  })

  // Verify getNBackExpectedTimeMs function directly
  it('getNBackExpectedTimeMs returns correct values', () => {
    expect(getNBackExpectedTimeMs(1)).toBe(3000)
    expect(getNBackExpectedTimeMs(4)).toBe(3000)
    expect(getNBackExpectedTimeMs(8)).toBe(2500)
  })

  it('getNBackExpectedTimeMs clamps out-of-range difficulty', () => {
    expect(getNBackExpectedTimeMs(0)).toBe(3000) // clamps to level 1
    expect(getNBackExpectedTimeMs(99)).toBe(2500) // clamps to level 8
  })

  // All answers should be either 'match' or 'no-match'
  it('only produces match or no-match answers', () => {
    const seq = generateNBackSequence(1, 50)
    seq.forEach(q => {
      expect(['match', 'no-match']).toContain(q.answer)
    })
  })
})
