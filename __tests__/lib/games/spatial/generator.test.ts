// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/spatial/generator.ts
// Module: Spatial reasoning question generator with 8 difficulty levels
// Key behaviors: random polygon generation, rotation transforms, mirror (flip) transforms,
// difficulty-scaled vertex count (4-8), mirror ratio scaling (25%->50%),
// and "same" vs "mirror" answer classification
// Players see two shapes and must determine if one is a rotation (same) or reflection (mirror)

import { describe, it, expect } from 'vitest'
import { generateSpatialQuestion, generateShape, rotatePoints, mirrorPoints } from '@/lib/games/spatial/generator'
import type { Point } from '@/lib/games/spatial/generator'

// Tests the random polygon generator that creates shapes as vertex arrays
describe('generateShape', () => {
  // Verifies the shape has exactly the requested number of vertices
  // and each vertex is a valid {x, y} point
  it('generates a shape with the requested number of vertices', () => {
    const shape = generateShape(5)
    expect(shape).toHaveLength(5) // 5 vertices requested
    shape.forEach(p => {
      expect(typeof p.x).toBe('number')
      expect(typeof p.y).toBe('number')
    })
  })

  // Guards against the generator always producing the same shape
  // (would make the game trivially solvable by memorization)
  it('generates different shapes on repeated calls', () => {
    const shapes = Array.from({ length: 10 }, () => generateShape(4))
    const unique = new Set(shapes.map(s => JSON.stringify(s)))
    expect(unique.size).toBeGreaterThan(1) // at least 2 distinct shapes out of 10
  })
})

// Tests the rotation transform applied to shape vertices
// Rotation is around the origin using standard 2D rotation matrix
describe('rotatePoints', () => {
  // 90 degrees: (10, 0) -> (0, 10) via [cos90, -sin90; sin90, cos90]
  it('rotates 90° correctly', () => {
    const points: Point[] = [{ x: 10, y: 0 }]
    const rotated = rotatePoints(points, 90)
    expect(rotated[0].x).toBeCloseTo(0, 0)
    expect(rotated[0].y).toBeCloseTo(10, 0)
  })

  // 180 degrees: (10, 0) -> (-10, 0)
  it('rotates 180° correctly', () => {
    const points: Point[] = [{ x: 10, y: 0 }]
    const rotated = rotatePoints(points, 180)
    expect(rotated[0].x).toBeCloseTo(-10, 0)
    expect(rotated[0].y).toBeCloseTo(0, 0)
  })

  // Rotation must preserve distance from origin (isometric transform)
  // If distance changes, the shape would be distorted, not rotated
  it('preserves shape size (distance from origin)', () => {
    const points: Point[] = [{ x: 30, y: 40 }]
    const dist = Math.sqrt(30 * 30 + 40 * 40) // 50 (3-4-5 triangle scaled by 10)
    const rotated = rotatePoints(points, 135)
    const rotDist = Math.sqrt(rotated[0].x ** 2 + rotated[0].y ** 2)
    expect(rotDist).toBeCloseTo(dist, 0) // distance preserved
  })
})

// Tests the mirror (reflection) transform — flips across the Y axis
describe('mirrorPoints', () => {
  // Mirror negates x coordinates while preserving y coordinates
  it('flips x coordinates', () => {
    const points: Point[] = [{ x: 10, y: 5 }, { x: -3, y: 7 }]
    const mirrored = mirrorPoints(points)
    expect(mirrored[0].x).toBeCloseTo(-10) // 10 -> -10
    expect(mirrored[0].y).toBe(5) // y unchanged
    expect(mirrored[1].x).toBeCloseTo(3) // -3 -> 3
    expect(mirrored[1].y).toBe(7) // y unchanged
  })
})

// Tests the full question generator that combines shapes + transforms
describe('generateSpatialQuestion', () => {
  // Verifies basic question structure: answer is "same" or "mirror",
  // metadata contains both original and transformed shapes with matching vertex count
  it('generates a question with two shapes and correct metadata', () => {
    const q = generateSpatialQuestion(1)
    expect(['same', 'mirror']).toContain(q.answer)
    expect(q.metadata).toBeDefined()
    const orig = q.metadata!.originalShape as Point[]
    const trans = q.metadata!.transformedShape as Point[]
    expect(orig.length).toBeGreaterThanOrEqual(4) // minimum 4 vertices at level 1
    expect(trans.length).toBe(orig.length) // transform preserves vertex count
  })

  // Level 1 has 25% mirror ratio — both answer types must appear
  // over a large enough sample (100 trials)
  it('produces both "same" and "mirror" at level 1 (25% mirror)', () => {
    const answers = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const q = generateSpatialQuestion(1)
      answers.add(q.answer)
    }
    expect(answers.has('same')).toBe(true)
    expect(answers.has('mirror')).toBe(true)
  })

  // Level 8 has 50% mirror ratio — should be roughly balanced
  // Tolerance: 30%-70% to account for random variation over 200 samples
  it('produces roughly equal same/mirror at high levels (50%)', () => {
    let mirrorCount = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const q = generateSpatialQuestion(8)
      if (q.answer === 'mirror') mirrorCount++
    }
    const ratio = mirrorCount / n
    expect(ratio).toBeGreaterThan(0.3) // should cluster around 0.5
    expect(ratio).toBeLessThan(0.7)
  })

  // Vertex count scales with difficulty: level 1 uses ~4 vertices,
  // level 7 uses ~7 vertices. More vertices = harder to mentally rotate
  it('increases vertex count with difficulty', () => {
    const q1 = generateSpatialQuestion(1)
    const q7 = generateSpatialQuestion(7)
    const orig1 = q1.metadata!.originalShape as Point[]
    const orig7 = q7.metadata!.originalShape as Point[]
    expect(orig7.length).toBeGreaterThan(orig1.length)
  })

  // Verifies expectedTimeMs from level constants
  // Level 1 = 5000ms (simple shapes), Level 8 = 9000ms (complex shapes)
  it('has correct expectedTimeMs', () => {
    expect(generateSpatialQuestion(1).expectedTimeMs).toBe(5000)
    expect(generateSpatialQuestion(8).expectedTimeMs).toBe(9000)
  })

  // Guards against out-of-range difficulty — clamps to [1, 8]
  it('clamps difficulty to valid range', () => {
    expect(generateSpatialQuestion(0).difficulty).toBe(1) // below min -> 1
    expect(generateSpatialQuestion(99).difficulty).toBe(8) // above max -> 8
  })

  // Tests duplicate avoidance during sprint generation
  // Each question's shape+rotation+answer combo should be unique
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
    expect(unique.size).toBe(questions.length) // all 5 should be distinct
  })
})
