export type SpatialLevel = {
  level: number
  name: string
  vertexCount: number
  rotationAngles: number[]
  hasMirror: boolean
  expectedTimeMs: number
}

export const SPATIAL_LEVELS: SpatialLevel[] = [
  { level: 1, name: 'Simple shapes, 90° rotation', vertexCount: 4, rotationAngles: [90, 270], hasMirror: false, expectedTimeMs: 5000 },
  { level: 2, name: 'Simple shapes, 45° rotations', vertexCount: 4, rotationAngles: [45, 90, 135, 270, 315], hasMirror: false, expectedTimeMs: 5000 },
  { level: 3, name: '5-sided, varied rotation', vertexCount: 5, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: false, expectedTimeMs: 6000 },
  { level: 4, name: '6-sided, any rotation', vertexCount: 6, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: false, expectedTimeMs: 6000 },
  { level: 5, name: '5-sided, mirror introduced', vertexCount: 5, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, expectedTimeMs: 7000 },
  { level: 6, name: '6-sided, mirror + rotation', vertexCount: 6, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, expectedTimeMs: 7000 },
  { level: 7, name: '7-sided, mirror + rotation', vertexCount: 7, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, expectedTimeMs: 8000 },
  { level: 8, name: '8-sided, mirror + rotation', vertexCount: 8, rotationAngles: [45, 90, 135, 180, 225, 270, 315], hasMirror: true, expectedTimeMs: 9000 },
]

export function getSpatialExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, SPATIAL_LEVELS.length))
  return SPATIAL_LEVELS[clamped - 1].expectedTimeMs
}
