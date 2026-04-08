// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/stroop/generator.ts
// Module: Stroop effect question generator with 8 difficulty levels
// Key behaviors: word/ink-color conflict generation, congruence ratio scaling
// (75% congruent at L1 down to 15% at L8), color set expansion (4->6->8 colors),
// 4-choice answer format, and duplicate avoidance via existingPrompts
// The Stroop test measures attention/inhibition by asking the player to identify
// the INK COLOR of a word that may spell a DIFFERENT color name

import { describe, it, expect } from 'vitest'
import { generateStroopQuestion } from '@/lib/games/stroop/generator'

describe('generateStroopQuestion', () => {
  // Verifies basic question structure: uppercase color word prompt,
  // a valid answer, correct difficulty tag, and exactly 4 answer choices
  it('generates a question with word, ink color, and 4 choices', () => {
    const q = generateStroopQuestion(1)
    expect(q.prompt).toMatch(/^[A-Z]+$/) // color word in uppercase
    expect(q.answer).toBeTruthy()
    expect(q.difficulty).toBe(1)
    expect(q.metadata).toBeDefined()
    const choices = q.metadata!.choices as string[]
    expect(choices).toHaveLength(4) // always 4 choices for keyboard input 1-4
    expect(choices).toContain(q.answer) // correct answer must be among choices
  })

  // Levels 1-3 use only 4 base colors to keep the task simple
  // Fewer colors = less confusion, appropriate for lower difficulty
  it('uses only 4 base colors at levels 1-3', () => {
    const baseNames = ['red', 'blue', 'green', 'yellow']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(1)
      expect(baseNames).toContain(q.answer) // answer (ink color) must be from base set
      const choices = q.metadata!.choices as string[]
      choices.forEach(c => expect(baseNames).toContain(c)) // all choices from base set
    }
  })

  // Levels 4-5 expand to 6 colors, adding purple and orange
  // More colors = harder to distinguish under the Stroop conflict
  it('uses 6 colors at levels 4-5', () => {
    const extNames = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(4)
      expect(extNames).toContain(q.answer)
    }
  })

  // Levels 6-8 use the full 8-color set including pink and cyan
  it('uses 8 colors at levels 6-8', () => {
    const fullNames = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    for (let i = 0; i < 20; i++) {
      const q = generateStroopQuestion(7)
      expect(fullNames).toContain(q.answer)
    }
  })

  // Level 1 targets 75% congruent stimuli (word matches ink color)
  // Uses statistical sampling (n=200) with wide tolerance (0.55-0.95)
  // to account for random variation while still catching broken ratios
  it('produces mostly congruent stimuli at level 1 (75%)', () => {
    let congruent = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const q = generateStroopQuestion(1)
      if (q.prompt === q.answer.toUpperCase()) congruent++ // congruent = word matches ink color
    }
    const ratio = congruent / n
    expect(ratio).toBeGreaterThan(0.55) // should cluster around 0.75
    expect(ratio).toBeLessThan(0.95)
  })

  // Level 3 targets 25% congruent (75% incongruent = high conflict)
  // More incongruent trials = stronger Stroop effect = harder
  it('produces mostly incongruent stimuli at level 3 (25%)', () => {
    let congruent = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const q = generateStroopQuestion(3)
      if (q.prompt === q.answer.toUpperCase()) congruent++
    }
    const ratio = congruent / n
    expect(ratio).toBeLessThan(0.45) // should cluster around 0.25
  })

  // Verifies expectedTimeMs from level constants
  // Level 1 = 3000ms (easy), Level 7 = 1500ms (tight deadline at high difficulty)
  it('has correct expectedTimeMs from constants', () => {
    expect(generateStroopQuestion(1).expectedTimeMs).toBe(3000)
    expect(generateStroopQuestion(7).expectedTimeMs).toBe(1500)
  })

  // Guards against out-of-range difficulty — clamps to max level 8
  it('clamps to max level when difficulty exceeds levels', () => {
    const q = generateStroopQuestion(99)
    expect(q.difficulty).toBe(8) // max level is 8
  })

  // Guards against below-minimum difficulty — clamps to level 1
  it('clamps to min level when difficulty is below 1', () => {
    const q = generateStroopQuestion(0)
    expect(q.difficulty).toBe(1) // min level is 1
  })

  // Verifies metadata includes the hex color for rendering the ink color
  // and a full map of color names to hex values for rendering choices
  it('includes inkColor hex and colorHexMap in metadata', () => {
    const q = generateStroopQuestion(1)
    expect(q.metadata!.inkColor).toMatch(/^#[0-9a-f]{6}$/) // valid hex color
    const hexMap = q.metadata!.colorHexMap as Record<string, string>
    expect(hexMap[q.answer]).toBe(q.metadata!.inkColor) // answer's hex matches inkColor
  })

  // Tests the duplicate avoidance mechanism used during sprint generation
  // Each question's word+answer combo should be unique within a sprint
  it('avoids duplicate prompts when existingPrompts is provided', () => {
    const existing = new Set<string>()
    const questions = []
    for (let i = 0; i < 5; i++) {
      const q = generateStroopQuestion(1, existing)
      const key = `${q.prompt.toLowerCase()}|${q.answer}` // "word|inkColor" as unique key
      existing.add(key)
      questions.push(key)
    }
    const unique = new Set(questions)
    expect(unique.size).toBe(questions.length) // all 5 should be distinct
  })
})
