import type { Question } from '@/lib/types'
import { STROOP_LEVELS, getStroopExpectedTimeMs, getColorsForLevel } from './constants'
import type { StroopColor } from './constants'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateStroopQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  const clamped = Math.max(1, Math.min(difficulty, STROOP_LEVELS.length))
  const level = STROOP_LEVELS[clamped - 1]
  const colors = getColorsForLevel(level.colorCount)

  let word: StroopColor
  let inkColor: StroopColor
  let promptKey: string
  let attempts = 0

  do {
    const isCongruent = Math.random() < level.congruenceRatio
    word = pick(colors)

    if (isCongruent) {
      inkColor = word
    } else {
      const others = colors.filter(c => c.name !== word.name)
      inkColor = pick(others)
    }

    promptKey = `${word.name}|${inkColor.name}`
    attempts++
  } while (existingPrompts?.has(promptKey) && attempts < 50)

  // Pick 4 choices: must include the correct answer (inkColor)
  const otherColors = colors.filter(c => c.name !== inkColor.name)
  const distractors = shuffle(otherColors).slice(0, 3)
  const choices = shuffle([inkColor, ...distractors])

  return {
    prompt: word.name.toUpperCase(),
    answer: inkColor.name,
    difficulty: clamped,
    expectedTimeMs: getStroopExpectedTimeMs(clamped),
    metadata: {
      inkColor: inkColor.hex,
      choices: choices.map(c => c.name),
      colorHexMap: Object.fromEntries(colors.map(c => [c.name, c.hex])),
    },
  }
}
