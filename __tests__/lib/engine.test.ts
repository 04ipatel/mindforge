// Tests for: /Users/ishanpatel/Projects/mindforge/lib/engine.ts
// Module: Sprint runner engine — manages question flow within a single sprint
// Key behaviors: immutable Sprint creation, answer recording with correctness check,
// completion detection, and summary statistics (accuracy, avg response time)
// Sprint size is 5-7 questions (randomized elsewhere); engine itself is count-agnostic

import { describe, it, expect } from 'vitest'
import { createSprint, recordAnswer, isSprintComplete, getSprintSummary } from '@/lib/engine'
import type { Question } from '@/lib/types'

// Helper to create minimal Question objects for testing
// Uses a fixed prompt since these tests focus on engine logic, not question content
const makeQuestion = (answer: string): Question => ({
  prompt: '2 + 3', answer, difficulty: 1, expectedTimeMs: 3000,
})

// Tests sprint initialization from a list of questions
describe('createSprint', () => {
  // Ensures the sprint is created with correct initial state:
  // all questions loaded, no results yet, index at 0
  it('creates a sprint with specified question count', () => {
    const questions = [makeQuestion('5'), makeQuestion('7'), makeQuestion('10')]
    const sprint = createSprint(questions)
    expect(sprint.questions).toHaveLength(3)
    expect(sprint.results).toHaveLength(0) // no answers recorded yet
    expect(sprint.currentIndex).toBe(0) // starts at first question
  })
})

// Tests the immutable answer recording function
// Each call returns a new Sprint with the answer appended and index advanced
describe('recordAnswer', () => {
  // Verifies correct answer detection, time recording, and index advancement
  it('records a correct answer', () => {
    const sprint = createSprint([makeQuestion('5'), makeQuestion('7')])
    const updated = recordAnswer(sprint, '5', 2000)
    expect(updated.results).toHaveLength(1)
    expect(updated.results[0].correct).toBe(true)
    expect(updated.results[0].responseTimeMs).toBe(2000)
    expect(updated.currentIndex).toBe(1) // advanced to next question
  })
  // Verifies incorrect answer detection
  it('records an incorrect answer', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, '99', 3000)
    expect(updated.results[0].correct).toBe(false)
  })
  // Guards against whitespace in user input causing false negatives
  // Users might accidentally add spaces before/after their typed answer
  it('trims whitespace from user answer', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, ' 5 ', 2000)
    expect(updated.results[0].correct).toBe(true)
  })
})

// Tests sprint completion detection
describe('isSprintComplete', () => {
  // Sprint with unanswered questions should not be complete
  it('returns false when questions remain', () => {
    const sprint = createSprint([makeQuestion('5'), makeQuestion('7')])
    expect(isSprintComplete(sprint)).toBe(false)
  })
  // Sprint should be complete once all questions have been answered
  it('returns true when all questions answered', () => {
    const sprint = createSprint([makeQuestion('5')])
    const updated = recordAnswer(sprint, '5', 2000)
    expect(isSprintComplete(updated)).toBe(true)
  })
})

// Tests sprint summary statistics used for Elo and difficulty adjustments
describe('getSprintSummary', () => {
  // Verifies accuracy calculation (2/3 correct) and average response time
  // (2000 + 3000 + 4000) / 3 = 3000ms
  it('calculates accuracy and average time', () => {
    let sprint = createSprint([makeQuestion('5'), makeQuestion('7'), makeQuestion('10')])
    sprint = recordAnswer(sprint, '5', 2000)  // correct
    sprint = recordAnswer(sprint, '99', 3000) // incorrect
    sprint = recordAnswer(sprint, '10', 4000) // correct
    const summary = getSprintSummary(sprint)
    expect(summary.questionCount).toBe(3)
    expect(summary.correctCount).toBe(2)
    expect(summary.accuracy).toBeCloseTo(2 / 3) // ~0.667
    expect(summary.avgResponseTimeMs).toBe(3000) // (2000+3000+4000)/3
  })
})
