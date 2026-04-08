import type { Question, QuestionResult } from './types'

export type Sprint = {
  questions: Question[]
  results: QuestionResult[]
  currentIndex: number
}

export type SprintSummary = {
  questionCount: number
  correctCount: number
  accuracy: number
  avgResponseTimeMs: number
}

export function createSprint(questions: Question[]): Sprint {
  return { questions, results: [], currentIndex: 0 }
}

export function recordAnswer(sprint: Sprint, userAnswer: string, responseTimeMs: number): Sprint {
  const question = sprint.questions[sprint.currentIndex]
  const trimmedAnswer = userAnswer.trim()
  const correct = trimmedAnswer === question.answer
  const result: QuestionResult = { question, userAnswer: trimmedAnswer, correct, responseTimeMs }
  return { ...sprint, results: [...sprint.results, result], currentIndex: sprint.currentIndex + 1 }
}

export function isSprintComplete(sprint: Sprint): boolean {
  return sprint.currentIndex >= sprint.questions.length
}

export function getSprintSummary(sprint: Sprint): SprintSummary {
  const correctCount = sprint.results.filter(r => r.correct).length
  const totalTime = sprint.results.reduce((sum, r) => sum + r.responseTimeMs, 0)
  return {
    questionCount: sprint.results.length,
    correctCount,
    accuracy: sprint.results.length > 0 ? correctCount / sprint.results.length : 0,
    avgResponseTimeMs: sprint.results.length > 0 ? Math.round(totalTime / sprint.results.length) : 0,
  }
}

export function generateSprintQuestionCount(): number {
  return Math.floor(Math.random() * 3) + 5
}
