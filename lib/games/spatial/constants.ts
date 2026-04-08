// =============================================================================
// lib/games/spatial/constants.ts — Spatial reasoning difficulty level definitions
// =============================================================================
// WHAT: Defines the 8 difficulty levels for the Spatial Reasoning game.
//   The player sees two shapes (original and transformed) and must determine
//   whether the second is a rotation of the first ("same") or a mirrored
//   rotation ("mirror").
// ROLE: Configuration data for the spatial game plugin. No logic beyond lookup.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/spatial/generator.ts (SPATIAL_LEVELS for level config,
//     getSpatialExpectedTimeMs for timing)
//   - __tests__/spatial.test.ts
// DIFFICULTY AXES:
//   1. Vertex count: number of polygon vertices (4 → 8). More vertices = harder
//      to mentally rotate and compare.
//   2. Rotation angles: which angles are possible. Level 1 only has 90°/270°
//      (axis-aligned), while higher levels include 45° increments and 180°.
//   3. Mirror ratio: probability that the transformed shape is mirrored (25% → 50%).
//      Higher ratio = more mirror trials = harder because the player can't default
//      to "same" as a safe guess.
//   4. All levels have hasMirror=true — mirror trials are always possible.
// =============================================================================

// Shape of a single spatial difficulty level.
// - vertexCount: number of vertices in the generated polygon (4-8)
// - rotationAngles: array of possible rotation angles in degrees
// - hasMirror: whether mirror trials can appear (always true for all levels)
// - mirrorRatio: probability (0.0 to 1.0) that a trial is mirror vs same
// - expectedTimeMs: calibrated response time for this level
export type SpatialLevel = {
  level: number
  name: string
  vertexCount: number
  rotationAngles: number[]
  hasMirror: boolean
  mirrorRatio: number
  expectedTimeMs: number
}

// All 8 spatial difficulty levels, ordered from easiest to hardest.
// Progression pattern:
//   Levels 1-2: 4 vertices (quadrilateral), limited → full rotation angles
//   Levels 3,5: 5 vertices (pentagon), increasing mirror ratio (35% → 45%)
//   Levels 4,6: 6 vertices (hexagon), increasing mirror ratio (40% → 50%)
//   Level 7: 7 vertices (heptagon), 50% mirror, all angles
//   Level 8: 8 vertices (octagon), 50% mirror, all angles, longest time
//
// Expected times scale from 5000ms (simple shapes) to 9000ms (complex polygons).
// Mirror ratio at 50% means the player has no bias to exploit — pure spatial judgment.
export const SPATIAL_LEVELS: SpatialLevel[] = [
  { level: 1, name: 'Simple shapes, 90° rotation', vertexCount: 4, rotationAngles: [90, 270], hasMirror: true, mirrorRatio: 0.25, expectedTimeMs: 5000 },
  { level: 2, name: 'Simple shapes, 45° rotations', vertexCount: 4, rotationAngles: [45, 90, 135, 270, 315], hasMirror: true, mirrorRatio: 0.30, expectedTimeMs: 5000 },
  { level: 3, name: '5-sided, varied rotation', vertexCount: 5, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.35, expectedTimeMs: 6000 },
  { level: 4, name: '6-sided, any rotation', vertexCount: 6, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.40, expectedTimeMs: 6000 },
  { level: 5, name: '5-sided, more mirror', vertexCount: 5, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.45, expectedTimeMs: 7000 },
  { level: 6, name: '6-sided, more mirror', vertexCount: 6, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.50, expectedTimeMs: 7000 },
  { level: 7, name: '7-sided, mirror + rotation', vertexCount: 7, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.50, expectedTimeMs: 8000 },
  { level: 8, name: '8-sided, mirror + rotation', vertexCount: 8, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, mirrorRatio: 0.50, expectedTimeMs: 9000 },
]

// Look up the expected response time for a given spatial difficulty level.
// Clamps to [1, 8] range. Higher difficulties have longer expected times
// because more complex polygons require more mental rotation time.
export function getSpatialExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, SPATIAL_LEVELS.length))
  return SPATIAL_LEVELS[clamped - 1].expectedTimeMs
}
