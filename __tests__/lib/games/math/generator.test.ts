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
      expect(q.prompt).toMatch(/\u00d7/)
      const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
      expect([2, 5, 10]).toContain(b)
      expect(q.answer).toBe(String(a * b))
    }
  })

  it('generates mixed multiplication at level 7', () => {
    const q = generateMathQuestion(7)
    expect(q.prompt).toMatch(/\u00d7/)
    const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
    expect(a).toBeGreaterThanOrEqual(2)
    expect(a).toBeLessThanOrEqual(12)
    expect(q.answer).toBe(String(a * b))
  })

  it('generates multi-digit x single-digit at level 8', () => {
    const q = generateMathQuestion(8)
    expect(q.prompt).toMatch(/\u00d7/)
    const [a, b] = q.prompt.split(' \u00d7 ').map(Number)
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
      expect(q.prompt).toMatch(/\u00f7/)
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
