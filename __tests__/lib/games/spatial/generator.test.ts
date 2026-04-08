import { describe, it, expect } from 'vitest'
import { generateSpatialQuestion, generateShape, rotatePoints, mirrorPoints } from '@/lib/games/spatial/generator'
import type { Point } from '@/lib/games/spatial/generator'

describe('generateShape', () => {
  it('generates a shape with the requested number of vertices', () => {
    const shape = generateShape(5)
    expect(shape).toHaveLength(5)
    shape.forEach(p => {
      expect(typeof p.x).toBe('number')
      expect(typeof p.y).toBe('number')
    })
  })

  it('generates different shapes on repeated calls', () => {
    const shapes = Array.from({ length: 10 }, () => generateShape(4))
    const unique = new Set(shapes.map(s => JSON.stringify(s)))
    expect(unique.size).toBeGreaterThan(1)
  })
})

describe('rotatePoints', () => {
  it('rotates 90° correctly', () => {
    const points: Point[] = [{ x: 10, y: 0 }]
    const rotated = rotatePoints(points, 90)
    expect(rotated[0].x).toBeCloseTo(0, 0)
    expect(rotated[0].y).toBeCloseTo(10, 0)
  })

  it('rotates 180° correctly', () => {
    const points: Point[] = [{ x: 10, y: 0 }]
    const rotated = rotatePoints(points, 180)
    expect(rotated[0].x).toBeCloseTo(-10, 0)
    expect(rotated[0].y).toBeCloseTo(0, 0)
  })

  it('preserves shape size (distance from origin)', () => {
    const points: Point[] = [{ x: 30, y: 40 }]
    const dist = Math.sqrt(30 * 30 + 40 * 40)
    const rotated = rotatePoints(points, 135)
    const rotDist = Math.sqrt(rotated[0].x ** 2 + rotated[0].y ** 2)
    expect(rotDist).toBeCloseTo(dist, 0)
  })
})

describe('mirrorPoints', () => {
  it('flips x coordinates', () => {
    const points: Point[] = [{ x: 10, y: 5 }, { x: -3, y: 7 }]
    const mirrored = mirrorPoints(points)
    expect(mirrored[0].x).toBeCloseTo(-10)
    expect(mirrored[0].y).toBe(5)
    expect(mirrored[1].x).toBeCloseTo(3)
    expect(mirrored[1].y).toBe(7)
  })
})

describe('generateSpatialQuestion', () => {
  it('generates a question with two shapes and correct metadata', () => {
    const q = generateSpatialQuestion(1)
    expect(['same', 'mirror']).toContain(q.answer)
    expect(q.metadata).toBeDefined()
    const orig = q.metadata!.originalShape as Point[]
    const trans = q.metadata!.transformedShape as Point[]
    expect(orig.length).toBeGreaterThanOrEqual(4)
    expect(trans.length).toBe(orig.length)
  })

  it('only produces "same" answers at levels without mirror', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateSpatialQuestion(1)
      expect(q.answer).toBe('same')
    }
  })

  it('produces both "same" and "mirror" at levels with mirror', () => {
    const answers = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const q = generateSpatialQuestion(5)
      answers.add(q.answer)
    }
    expect(answers.has('same')).toBe(true)
    expect(answers.has('mirror')).toBe(true)
  })

  it('increases vertex count with difficulty', () => {
    const q1 = generateSpatialQuestion(1)
    const q7 = generateSpatialQuestion(7)
    const orig1 = q1.metadata!.originalShape as Point[]
    const orig7 = q7.metadata!.originalShape as Point[]
    expect(orig7.length).toBeGreaterThan(orig1.length)
  })

  it('has correct expectedTimeMs', () => {
    expect(generateSpatialQuestion(1).expectedTimeMs).toBe(5000)
    expect(generateSpatialQuestion(8).expectedTimeMs).toBe(9000)
  })

  it('clamps difficulty to valid range', () => {
    expect(generateSpatialQuestion(0).difficulty).toBe(1)
    expect(generateSpatialQuestion(99).difficulty).toBe(8)
  })

  it('avoids duplicate prompts when existingPrompts provided', () => {
    const existing = new Set<string>()
    const questions = []
    for (let i = 0; i < 5; i++) {
      const q = generateSpatialQuestion(1, existing)
      const key = `${(q.metadata!.originalShape as Point[]).map(p => `${p.x},${p.y}`).join('|')}-${q.metadata!.rotationAngle}-${q.answer}`
      existing.add(key)
      questions.push(key)
    }
    const unique = new Set(questions)
    expect(unique.size).toBe(questions.length)
  })
})
