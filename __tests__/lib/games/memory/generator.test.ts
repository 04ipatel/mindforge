// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/memory/generator.ts
// Module: Memory (Digit Span) sequence generator with 8 difficulty levels
// Key behaviors: digit sequence generation with configurable length and display
// duration, batch generation with uniqueness enforcement, prompt/answer formatting,
// and difficulty-scaled sequence length (3 → 8) and display time (3000ms → 2000ms)

import { describe, it, expect } from 'vitest'
import { generateMemorySequence } from '@/lib/games/memory/generator'
import { getMemoryExpectedTimeMs, MEMORY_LEVELS } from '@/lib/games/memory/constants'

describe('generateMemorySequence', () => {
  // Verifies that the generator returns exactly the requested number of questions
  it('generates the requested number of questions', () => {
    const seq = generateMemorySequence(1, 6)
    expect(seq).toHaveLength(6)
  })

  it('generates the requested number of questions for various counts', () => {
    expect(generateMemorySequence(1, 5)).toHaveLength(5)
    expect(generateMemorySequence(1, 7)).toHaveLength(7)
    expect(generateMemorySequence(3, 10)).toHaveLength(10)
  })

  // Sequence length must match the level configuration
  it('generates sequences matching level 1 config (3 digits)', () => {
    const seq = generateMemorySequence(1, 5)
    seq.forEach(q => {
      const digits = q.prompt.split(' ')
      expect(digits).toHaveLength(3)
    })
  })

  it('generates sequences matching level 4 config (5 digits)', () => {
    const seq = generateMemorySequence(4, 5)
    seq.forEach(q => {
      const digits = q.prompt.split(' ')
      expect(digits).toHaveLength(5)
    })
  })

  it('generates sequences matching level 8 config (8 digits)', () => {
    const seq = generateMemorySequence(8, 5)
    seq.forEach(q => {
      const digits = q.prompt.split(' ')
      expect(digits).toHaveLength(8)
    })
  })

  // Sequence length should increase with difficulty
  it('increases sequence length with higher difficulty', () => {
    const lowLevel = generateMemorySequence(1, 1)[0]
    const highLevel = generateMemorySequence(8, 1)[0]
    const lowDigits = lowLevel.prompt.split(' ').length
    const highDigits = highLevel.prompt.split(' ').length
    expect(highDigits).toBeGreaterThan(lowDigits)
  })

  // Answer format: digits joined without spaces
  it('formats answer as digits joined without spaces', () => {
    const seq = generateMemorySequence(1, 10)
    seq.forEach(q => {
      // Answer should have no spaces
      expect(q.answer).not.toContain(' ')
      // Answer should only contain digits
      expect(q.answer).toMatch(/^\d+$/)
      // Answer length should match sequence length
      expect(q.answer).toHaveLength(MEMORY_LEVELS[0].sequenceLength)
    })
  })

  // Prompt format: digits separated by spaces
  it('formats prompt as digits separated by spaces', () => {
    const seq = generateMemorySequence(1, 10)
    seq.forEach(q => {
      // Prompt should match pattern "d d d" for 3-digit sequences
      expect(q.prompt).toMatch(/^\d( \d)+$/)
    })
  })

  // Prompt and answer should represent the same digits
  it('prompt and answer represent the same digit sequence', () => {
    const seq = generateMemorySequence(4, 10)
    seq.forEach(q => {
      const promptDigits = q.prompt.split(' ').join('')
      expect(promptDigits).toBe(q.answer)
    })
  })

  // All digits must be 0-9
  it('generates digits in the 0-9 range', () => {
    const seq = generateMemorySequence(4, 50)
    seq.forEach(q => {
      const digits = q.prompt.split(' ').map(Number)
      digits.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThanOrEqual(9)
      })
    })
  })

  // Metadata must include sequence array and displayDurationMs
  it('includes sequence and displayDurationMs in metadata', () => {
    const seq = generateMemorySequence(1, 6)
    seq.forEach(q => {
      expect(q.metadata).toBeDefined()
      expect(q.metadata!.sequence).toBeDefined()
      expect(Array.isArray(q.metadata!.sequence)).toBe(true)
      expect(q.metadata!.displayDurationMs).toBe(3000) // Level 1 = 3000ms
    })
  })

  it('sets correct displayDurationMs for each level', () => {
    MEMORY_LEVELS.forEach(level => {
      const q = generateMemorySequence(level.level, 1)[0]
      expect(q.metadata!.displayDurationMs).toBe(level.displayDurationMs)
    })
  })

  // Metadata sequence array should match the prompt digits
  it('metadata sequence matches prompt digits', () => {
    const seq = generateMemorySequence(4, 10)
    seq.forEach(q => {
      const metaSeq = q.metadata!.sequence as number[]
      const promptDigits = q.prompt.split(' ').map(Number)
      expect(metaSeq).toEqual(promptDigits)
    })
  })

  // Unique sequences within a batch (no duplicate answers)
  it('generates unique sequences within a batch', () => {
    const seq = generateMemorySequence(1, 7)
    const answers = seq.map(q => q.answer)
    const unique = new Set(answers)
    expect(unique.size).toBe(answers.length)
  })

  it('generates unique sequences for longer batches', () => {
    const seq = generateMemorySequence(4, 7)
    const answers = seq.map(q => q.answer)
    const unique = new Set(answers)
    expect(unique.size).toBe(answers.length)
  })

  // expectedTimeMs should match level config
  it('has correct expectedTimeMs values', () => {
    expect(generateMemorySequence(1, 1)[0].expectedTimeMs).toBe(5000)
    expect(generateMemorySequence(2, 1)[0].expectedTimeMs).toBe(6000)
    expect(generateMemorySequence(3, 1)[0].expectedTimeMs).toBe(5000)
    expect(generateMemorySequence(4, 1)[0].expectedTimeMs).toBe(7000)
    expect(generateMemorySequence(5, 1)[0].expectedTimeMs).toBe(6000)
    expect(generateMemorySequence(6, 1)[0].expectedTimeMs).toBe(7000)
    expect(generateMemorySequence(7, 1)[0].expectedTimeMs).toBe(8000)
    expect(generateMemorySequence(8, 1)[0].expectedTimeMs).toBe(9000)
  })

  // Guards against out-of-range difficulty — clamps to [1, 8]
  it('clamps difficulty to valid range', () => {
    expect(generateMemorySequence(0, 1)[0].difficulty).toBe(1)
    expect(generateMemorySequence(-5, 1)[0].difficulty).toBe(1)
    expect(generateMemorySequence(99, 1)[0].difficulty).toBe(8)
  })

  // Verify getMemoryExpectedTimeMs function directly
  it('getMemoryExpectedTimeMs returns correct values', () => {
    expect(getMemoryExpectedTimeMs(1)).toBe(5000)
    expect(getMemoryExpectedTimeMs(4)).toBe(7000)
    expect(getMemoryExpectedTimeMs(8)).toBe(9000)
  })

  it('getMemoryExpectedTimeMs clamps out-of-range difficulty', () => {
    expect(getMemoryExpectedTimeMs(0)).toBe(5000) // clamps to level 1
    expect(getMemoryExpectedTimeMs(99)).toBe(9000) // clamps to level 8
  })
})
