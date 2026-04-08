import type { Question } from '@/lib/types'
import { MATH_LEVELS, getExpectedTimeMs } from './constants'

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateLevel1(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  const b = rand(1, 9)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel2(): { prompt: string; answer: string } {
  const a = rand(1, 9)
  const b = rand(1, a)
  return { prompt: `${a} - ${b}`, answer: String(a - b) }
}

function generateLevel3(): { prompt: string; answer: string } {
  let a: number, b: number
  do {
    a = rand(10, 99)
    b = rand(10, 99)
  } while ((a % 10) + (b % 10) >= 10)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel4(): { prompt: string; answer: string } {
  const a = rand(10, 99)
  const b = rand(10, 99)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel5(): { prompt: string; answer: string } {
  const a = rand(100, 999)
  const b = rand(100, 999)
  return { prompt: `${a} + ${b}`, answer: String(a + b) }
}

function generateLevel6(): { prompt: string; answer: string } {
  const easy = pick([2, 5, 10])
  const other = rand(2, 12)
  return { prompt: `${other} \u00d7 ${easy}`, answer: String(other * easy) }
}

function generateLevel7(): { prompt: string; answer: string } {
  const a = rand(2, 12)
  const b = rand(2, 12)
  return { prompt: `${a} \u00d7 ${b}`, answer: String(a * b) }
}

function generateLevel8(): { prompt: string; answer: string } {
  const multi = rand(100, 999)
  const single = rand(2, 9)
  return { prompt: `${multi} \u00d7 ${single}`, answer: String(multi * single) }
}

function generateLevel9(): { prompt: string; answer: string } {
  const answer = rand(2, 20)
  const divisor = rand(2, 12)
  const dividend = answer * divisor
  return { prompt: `${dividend} \u00f7 ${divisor}`, answer: String(answer) }
}

function generateLevel10(): { prompt: string; answer: string } {
  const a = rand(10, 50)
  const b = rand(2, 9)
  const c = rand(1, 30)
  const op = pick(['+', '-'])
  const product = a * b
  const result = op === '+' ? product + c : product - c
  return { prompt: `${a} \u00d7 ${b} ${op} ${c}`, answer: String(result) }
}

function generateLevel11(): { prompt: string; answer: string } {
  const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256]
  const n = pick(perfectSquares)
  return { prompt: `\u221a${n}`, answer: String(Math.sqrt(n)) }
}

function generateLevel12(): { prompt: string; answer: string } {
  const denom = pick([2, 3, 4, 5, 6])
  const num1 = rand(1, denom - 1)
  const num2 = rand(1, denom - 1)
  const resultNum = num1 + num2
  const gcd = gcdFn(resultNum, denom)
  const simplifiedNum = resultNum / gcd
  const simplifiedDenom = denom / gcd
  const answer = simplifiedDenom === 1 ? String(simplifiedNum) : `${simplifiedNum}/${simplifiedDenom}`
  return { prompt: `${num1}/${denom} + ${num2}/${denom}`, answer }
}

function generateLevel13(): { prompt: string; answer: string } {
  const x = rand(1, 15)
  const a = rand(2, 8)
  const b = rand(1, 20)
  const c = a * x + b
  return { prompt: `Solve: ${a}x + ${b} = ${c}`, answer: String(x) }
}

function gcdFn(a: number, b: number): number {
  return b === 0 ? a : gcdFn(b, a % b)
}

const generators: Record<number, () => { prompt: string; answer: string }> = {
  1: generateLevel1, 2: generateLevel2, 3: generateLevel3, 4: generateLevel4,
  5: generateLevel5, 6: generateLevel6, 7: generateLevel7, 8: generateLevel8,
  9: generateLevel9, 10: generateLevel10, 11: generateLevel11, 12: generateLevel12,
  13: generateLevel13,
}

export function generateMathQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  const clamped = Math.max(1, Math.min(difficulty, MATH_LEVELS.length))
  const generator = generators[clamped]
  let prompt: string
  let answer: string
  let attempts = 0
  do {
    const result = generator()
    prompt = result.prompt
    answer = result.answer
    attempts++
  } while (existingPrompts?.has(prompt) && attempts < 50)
  return { prompt, answer, difficulty: clamped, expectedTimeMs: getExpectedTimeMs(clamped) }
}
