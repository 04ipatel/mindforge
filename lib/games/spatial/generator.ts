import type { Question } from '@/lib/types'
import { SPATIAL_LEVELS, getSpatialExpectedTimeMs } from './constants'

export type Point = { x: number; y: number }

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Generate a random irregular convex polygon by placing points at sorted angles
 * with varying radii. The shape is asymmetric so rotation/mirror are distinguishable.
 */
export function generateShape(vertexCount: number): Point[] {
  // Generate random angles, sorted
  const angles: number[] = []
  for (let i = 0; i < vertexCount; i++) {
    angles.push(Math.random() * Math.PI * 2)
  }
  angles.sort((a, b) => a - b)

  // Vary radii to make the shape asymmetric
  // Use different radius ranges for adjacent vertices to ensure asymmetry
  const points = angles.map((angle, i) => {
    // Alternate between smaller and larger radii for more interesting shapes
    const baseRadius = i % 2 === 0 ? rand(30, 45) : rand(50, 70)
    return {
      x: Math.round(Math.cos(angle) * baseRadius * 10) / 10,
      y: Math.round(Math.sin(angle) * baseRadius * 10) / 10,
    }
  })

  return points
}

export function rotatePoints(points: Point[], angleDeg: number): Point[] {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return points.map(p => ({
    x: Math.round((p.x * cos - p.y * sin) * 10) / 10,
    y: Math.round((p.x * sin + p.y * cos) * 10) / 10,
  }))
}

export function mirrorPoints(points: Point[]): Point[] {
  return points.map(p => ({
    x: Math.round(-p.x * 10) / 10,
    y: p.y,
  }))
}

export function generateSpatialQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  const clamped = Math.max(1, Math.min(difficulty, SPATIAL_LEVELS.length))
  const level = SPATIAL_LEVELS[clamped - 1]

  let shape: Point[]
  let transformedShape: Point[]
  let answer: 'same' | 'mirror'
  let rotationAngle: number
  let promptKey: string
  let attempts = 0

  do {
    shape = generateShape(level.vertexCount)
    rotationAngle = pick(level.rotationAngles)

    // Mirror probability scales with difficulty level
    if (level.hasMirror && Math.random() < level.mirrorRatio) {
      answer = 'mirror'
      transformedShape = rotatePoints(mirrorPoints(shape), rotationAngle)
    } else {
      answer = 'same'
      transformedShape = rotatePoints(shape, rotationAngle)
    }

    promptKey = `${shape.map(p => `${p.x},${p.y}`).join('|')}-${rotationAngle}-${answer}`
    attempts++
  } while (existingPrompts?.has(promptKey) && attempts < 50)

  return {
    prompt: `${level.vertexCount}-gon, ${rotationAngle}°`,
    answer,
    difficulty: clamped,
    expectedTimeMs: getSpatialExpectedTimeMs(clamped),
    metadata: {
      originalShape: shape,
      transformedShape,
      rotationAngle,
    },
  }
}
