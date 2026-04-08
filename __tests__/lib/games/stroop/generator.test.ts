import { describe, it, expect } from 'vitest'
import { generateStroopQuestion } from '@/lib/games/stroop/generator'

describe('generateStroopQuestion', () => {
  it('generates a question with word, ink color, and 4 choices', () => {
    const q = generateStroopQuestion(1)
    expect(q.prompt).toMatch(/^[A-Z]+$/)
    expect(q.answer).toBeTruthy()
    expect(q.difficulty).toBe(1)
    expect(q.metadata).toBeDefined()
    const choices = q.metadata!.choices as string[]
    expect(choices).toHaveLength(4)
    expect(choices).toContain(q.answer)
  })

  it('uses only 4 base colors at levels 1-3', () => {
    const baseNames = ['red', 'blue', 'green', 'yellow']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(1)
      expect(baseNames).toContain(q.answer)
      const choices = q.metadata!.choices as string[]
      choices.forEach(c => expect(baseNames).toContain(c))
    }
  })

  it('uses 6 colors at levels 4-5', () => {
    const extNames = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(4)
      expect(extNames).toContain(q.answer)
    }
  })

  it('uses 8 colors at levels 6-8', () => {
    const fullNames = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(7)
      expect(fullNames).toContain(q.answer)
    }
  })

  it('produces mostly congruent stimuli at level 1 (75%)', () => {
    let congruent = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const q = generateStroopQuestion(1)
      if (q.prompt === q.answer.toUpperCase()) congruent++
    }
    const ratio = congruent / n
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.95)
  })

  it('produces mostly incongruent stimuli at level 3 (25%)', () => {
    let congruent = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const q = generateStroopQuestion(3)
      if (q.prompt === q.answer.toUpperCase()) congruent++
    }
    const ratio = congruent / n
    expect(ratio).toBeLessThan(0.45)
  })

  it('has correct expectedTimeMs from constants', () => {
    expect(generateStroopQuestion(1).expectedTimeMs).toBe(3000)
    expect(generateStroopQuestion(7).expectedTimeMs).toBe(1500)
  })

  it('clamps to max level when difficulty exceeds levels', () => {
    const q = generateStroopQuestion(99)
    expect(q.difficulty).toBe(8)
  })

  it('clamps to min level when difficulty is below 1', () => {
    const q = generateStroopQuestion(0)
    expect(q.difficulty).toBe(1)
  })

  it('includes inkColor hex and colorHexMap in metadata', () => {
    const q = generateStroopQuestion(1)
    expect(q.metadata!.inkColor).toMatch(/^#[0-9a-f]{6}$/)
    const hexMap = q.metadata!.colorHexMap as Record<string, string>
    expect(hexMap[q.answer]).toBe(q.metadata!.inkColor)
  })

  it('avoids duplicate prompts when existingPrompts is provided', () => {
    const existing = new Set<string>()
    const questions = []
    for (let i = 0; i < 5; i++) {
      const q = generateStroopQuestion(1, existing)
      const key = `${q.prompt.toLowerCase()}|${q.answer}`
      existing.add(key)
      questions.push(key)
    }
    const unique = new Set(questions)
    expect(unique.size).toBe(questions.length)
  })
})
