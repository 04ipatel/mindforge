import { describe, it, expect } from 'vitest'
import { createSprint, recordAnswer, isSprintComplete, getSprintSummary } from '@/lib/engine'
import type { Question } from '@/lib/types'

const makeQuestion = (answer: string): Question => ({
  prompt: '2 + 3', answer, difficulty: 1, expectedTimeMs: 3000,
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
    let sprint = createSprint([makeQuestion('5'), makeQuestion('7'), makeQuestion('10')])
    sprint = recordAnswer(sprint, '5', 2000)
    sprint = recordAnswer(sprint, '99', 3000)
    sprint = recordAnswer(sprint, '10', 4000)
    const summary = getSprintSummary(sprint)
    expect(summary.questionCount).toBe(3)
    expect(summary.correctCount).toBe(2)
    expect(summary.accuracy).toBeCloseTo(2 / 3)
    expect(summary.avgResponseTimeMs).toBe(3000)
  })
})
