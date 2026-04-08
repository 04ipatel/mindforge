// =============================================================================
// lib/games/spatial/generator.ts — Spatial reasoning question generator for MindForge
// =============================================================================
// WHAT: Generates spatial reasoning questions where the player sees two polygons
//   and must determine if the second is a rotation ("same") or a mirrored
//   rotation ("mirror") of the first. Tests mental rotation ability.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/spatial/constants.ts (SPATIAL_LEVELS, getSpatialExpectedTimeMs)
// DEPENDENTS:
//   - The spatial GamePlugin object (registered in app/session/)
//   - app/session/session-view.tsx (calls generateSpatialQuestion via the plugin)
//   - app/session/spatial-input.tsx (reads metadata.originalShape,
//     metadata.transformedShape, metadata.rotationAngle to render both polygons)
//   - __tests__/spatial.test.ts
// METADATA SHAPE (stored in Question.metadata):
//   {
//     originalShape: Point[],      // vertices of the original polygon
//     transformedShape: Point[],   // vertices after rotation (and possibly mirror)
//     rotationAngle: number        // degrees of rotation applied
//   }
// COORDINATE SYSTEM: Shapes are centered at origin (0,0). Radii range from
//   30-70 units. Coordinates are rounded to 1 decimal place.
// =============================================================================

import type { Question } from '@/lib/types'
import { SPATIAL_LEVELS, getSpatialExpectedTimeMs } from './constants'

// A 2D point representing a polygon vertex.
// Coordinates are in abstract units centered at origin, not pixels.
// The UI component scales these to fit the rendering canvas.
export type Point = { x: number; y: number }

// Pick a random element from an array.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Generate a random float in [min, max) range. Unlike the math generator's
// rand(), this returns a float (not an integer) because we need smooth
// variation in polygon vertex radii.
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Generate a random irregular convex polygon with the given number of vertices.
// The shape is deliberately asymmetric so that rotations and mirrors produce
// visually distinct results (a symmetric shape would be ambiguous).
//
// Algorithm:
// 1. Generate N random angles in [0, 2*PI), then sort them.
//    Sorting ensures the polygon is convex (vertices are in angular order).
// 2. For each angle, compute a vertex at a varying radius from the origin.
//    Alternating between smaller (30-45) and larger (50-70) radii creates
//    an irregular, asymmetric shape that's clearly different when mirrored.
// 3. Coordinates are rounded to 1 decimal place for stable serialization.
//
// The origin-centered design means rotation and mirror transforms are simple
// matrix multiplications without translation.
export function generateShape(vertexCount: number): Point[] {
  // Generate random angles, sorted to maintain convex hull property
  const angles: number[] = []
  for (let i = 0; i < vertexCount; i++) {
    angles.push(Math.random() * Math.PI * 2)
  }
  angles.sort((a, b) => a - b)

  // Convert angles to points with varying radii for asymmetry.
  // Even-indexed vertices get smaller radii (30-45), odd-indexed get larger (50-70).
  // This alternating pattern ensures the shape is visibly irregular.
  const points = angles.map((angle, i) => {
    // Alternate between smaller and larger radii for more interesting shapes
    const baseRadius = i % 2 === 0 ? rand(30, 45) : rand(50, 70)
    return {
      // Round to 1 decimal place: multiply by 10, round, divide by 10
      x: Math.round(Math.cos(angle) * baseRadius * 10) / 10,
      y: Math.round(Math.sin(angle) * baseRadius * 10) / 10,
    }
  })

  return points
}

// Rotate an array of points around the origin by the given angle in degrees.
// Uses standard 2D rotation matrix:
//   x' = x*cos(θ) - y*sin(θ)
//   y' = x*sin(θ) + y*cos(θ)
// Returns a new array (does not mutate input). Coordinates rounded to 1 decimal.
export function rotatePoints(points: Point[], angleDeg: number): Point[] {
  // Convert degrees to radians for Math.cos/sin
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return points.map(p => ({
    // Apply 2D rotation matrix, round to 1 decimal place
    x: Math.round((p.x * cos - p.y * sin) * 10) / 10,
    y: Math.round((p.x * sin + p.y * cos) * 10) / 10,
  }))
}

// Mirror (reflect) an array of points across the Y-axis (flip horizontally).
// Simply negates the x-coordinate of each point: (x, y) → (-x, y).
// Returns a new array (does not mutate input). X coordinates rounded to 1 decimal.
// This is applied BEFORE rotation when generating mirror trials, so the
// mirrored shape is then rotated to hide the mirror operation.
export function mirrorPoints(points: Point[]): Point[] {
  return points.map(p => ({
    // Negate x to reflect across Y-axis, round to 1 decimal
    x: Math.round(-p.x * 10) / 10,
    y: p.y,
  }))
}

// Generate a single spatial reasoning question at the given difficulty level.
// This is the main entry point — called by the spatial GamePlugin's generateQuestion method.
//
// - difficulty: 1-based level, clamped to [1, 8] (SPATIAL_LEVELS.length)
// - existingPrompts: optional Set of shape-signature keys already used this sprint,
//   used to avoid showing duplicate shape+rotation+answer combinations.
//   Retries up to 50 times (shapes are random so collisions are extremely rare).
//
// How it works:
// 1. Generate a random asymmetric polygon with the level's vertex count
// 2. Pick a random rotation angle from the level's allowed angles
// 3. Decide if this is a "same" or "mirror" trial based on the level's mirrorRatio
// 4. For "same": rotate the original shape
//    For "mirror": mirror the shape across Y-axis, THEN rotate it
// 5. Return Question with answer "same" or "mirror" and both shapes in metadata
//
// The prompt string is descriptive (e.g., "5-gon, 90°") but the actual visual
// content comes from metadata.originalShape and metadata.transformedShape,
// which the spatial-input.tsx component renders as SVG polygons.
export function generateSpatialQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  // Clamp difficulty to valid range [1, 8]
  const clamped = Math.max(1, Math.min(difficulty, SPATIAL_LEVELS.length))
  const level = SPATIAL_LEVELS[clamped - 1]

  let shape: Point[]              // the original polygon
  let transformedShape: Point[]   // the polygon after rotation (and possibly mirror)
  let answer: 'same' | 'mirror'  // what the player must identify
  let rotationAngle: number       // degrees of rotation applied
  let promptKey: string           // dedup key for existingPrompts
  let attempts = 0

  // Retry loop to avoid duplicate shape combinations within a sprint
  do {
    // Generate a fresh random polygon with the level's vertex count
    shape = generateShape(level.vertexCount)
    // Pick a random rotation angle from the level's allowed set
    rotationAngle = pick(level.rotationAngles)

    // Decide if this trial is mirror or same, based on the level's mirrorRatio
    // mirrorRatio=0.25 means 25% chance of mirror trial
    if (level.hasMirror && Math.random() < level.mirrorRatio) {
      answer = 'mirror'
      // Mirror first, then rotate — this hides the mirror operation
      // behind a rotation, making it harder to spot
      transformedShape = rotatePoints(mirrorPoints(shape), rotationAngle)
    } else {
      answer = 'same'
      // Pure rotation only — shapes are identical, just rotated
      transformedShape = rotatePoints(shape, rotationAngle)
    }

    // Build dedup key from shape coordinates, rotation angle, and answer type
    promptKey = `${shape.map(p => `${p.x},${p.y}`).join('|')}-${rotationAngle}-${answer}`
    attempts++
  } while (existingPrompts?.has(promptKey) && attempts < 50)

  return {
    // Descriptive prompt — not rendered directly, the shapes come from metadata
    prompt: `${level.vertexCount}-gon, ${rotationAngle}°`,
    // Answer is either "same" or "mirror" — matched by binary input (F/J keys)
    answer,
    difficulty: clamped,
    expectedTimeMs: getSpatialExpectedTimeMs(clamped),
    // Metadata consumed by app/session/spatial-input.tsx for rendering:
    // - originalShape: Point[] for the left polygon
    // - transformedShape: Point[] for the right polygon
    // - rotationAngle: displayed as context info
    metadata: {
      originalShape: shape,
      transformedShape,
      rotationAngle,
    },
  }
}
