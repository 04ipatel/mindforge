// ============================================================================
// app/session/spatial-input.tsx — Spatial Shape Comparison Input Component
// ============================================================================
// PURPOSE: Renders the spatial reasoning task — two shapes side by side where
//   the user must determine if the second shape is a rotation of the first
//   ("same") or a mirror reflection ("mirror"). Trains mental rotation ability.
// ARCHITECTURE: Client component rendered by SprintView when gameType='spatial'.
//   Contains a helper component (ShapeSVG) for rendering polygon shapes as SVGs.
//   Shape data (point arrays) comes from Question.metadata set by the spatial
//   question generator at lib/games/spatial/generator.ts.
// DEPENDENCIES:
//   - lib/types.ts — Question type
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for spatial game type
// INPUT HANDLING:
//   - Key 1: select "same" (shapes are rotations of each other)
//   - Key 2: select "mirror" (second shape is a reflection)
//   - Input is blocked while feedback is being displayed
//   - Clicking a choice button also works (accessibility fallback)
// QUESTION METADATA:
//   - question.metadata.originalShape: Point[] — vertices of the left shape
//   - question.metadata.transformedShape: Point[] — vertices of the right shape
//   - question.metadata.rotationAngle: number — angle applied (for reference)
//   - question.answer: "same" or "mirror"
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'
import type { FeedbackState } from '@/lib/ui-types'

// Point represents a 2D vertex coordinate for shape polygons
type Point = { x: number; y: number }

// Props received from SprintView
type SpatialInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// ShapeSVG renders a polygon shape as an SVG element.
// It auto-centers and scales the shape to fit within a 150x150 viewbox.
// Used to render both the original and transformed shapes side by side.
function ShapeSVG({ points, color }: { points: Point[]; color: string }) {
  // Calculate the bounding box of the shape to center and scale it
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  // Prevent division by zero if all points share the same x or y coordinate
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  // Center of the bounding box — used as the origin for scaling
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  // Scale to fit within 120px (leaving 15px padding on each side of the 150px viewbox)
  // Uses min to maintain aspect ratio — the shape fits within a 120x120 box
  const scale = Math.min(120 / width, 120 / height)

  // Transform each point: center on the bounding box center, scale, then
  // offset to the center of the 150x150 viewbox (75, 75)
  const scaledPoints = points.map(p => ({
    x: (p.x - cx) * scale + 75,
    y: (p.y - cy) * scale + 75,
  }))

  // Build an SVG path string: M (move to first point), L (line to subsequent points), Z (close)
  const pathData = scaledPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z'

  return (
    // 150x150 SVG with a white card background and subtle border
    <svg width="150" height="150" viewBox="0 0 150 150" className="bg-card rounded-xl border border-border">
      {/* Polygon outline — stroke only, no fill, for clarity */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Vertex dots — small filled circles at each vertex for visual anchoring.
          These help the user mentally rotate the shape by providing reference points. */}
      {scaledPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

// SpatialInput renders two shapes side by side and asks the user to determine
// if they are the same shape (rotated) or mirror images.
export function SpatialInput({ question, onSubmit, feedback }: SpatialInputProps) {
  // Extract shape data from question metadata.
  // originalShape is the left reference shape.
  // transformedShape is the right shape — either rotated (same) or reflected (mirror).
  const originalShape = (question.metadata?.originalShape as Point[]) ?? []
  const transformedShape = (question.metadata?.transformedShape as Point[]) ?? []

  // Handle a choice selection ("same" or "mirror"). Blocked during feedback.
  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // Global keydown listener: 1 = "same", 2 = "mirror"
  // These are the only two valid inputs for the spatial task.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block input during feedback display
      if (feedback) return
      if (e.key === '1') {
        e.preventDefault()
        handleChoice('same')
      } else if (e.key === '2') {
        e.preventDefault()
        handleChoice('mirror')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, feedback])

  // Cyan accent color for spatial reasoning game (#06b6d4)
  // Matches --color-accent-spatial in app/globals.css
  const accentColor = '#06b6d4' // cyan

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Two shapes displayed side by side with "vs" separator.
          Left = original shape, Right = transformed shape (rotated or mirrored).
          The user must mentally rotate the right shape to compare with the left. */}
      <div className="flex items-center gap-8">
        <ShapeSVG points={originalShape} color={accentColor} />
        <div className="text-text-hint text-2xl font-light select-none">vs</div>
        <ShapeSVG points={transformedShape} color={accentColor} />
      </div>

      {/* Fixed-height feedback area — always present to prevent layout shift */}
      <div className="h-5 flex items-center justify-center">
        {feedback && (
          <span className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
            {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
          </span>
        )}
      </div>

      {/* Choice buttons: "same" (key 1) and "mirror" (key 2).
          During feedback, the correct choice gets a green border and the
          incorrect choice gets a red border. */}
      <div className="flex gap-4">
        {(['same', 'mirror'] as const).map((choice, i) => {
          // Determine border color based on feedback state
          let borderClass = 'border-border'
          if (feedback) {
            // Green border on the correct answer
            if (choice === question.answer) borderClass = 'border-positive'
            // Red border on the wrong choice (only if the user was incorrect)
            else if (!feedback.correct && choice !== question.answer) borderClass = 'border-negative'
          }

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={!!feedback}
              className={`px-6 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-spatial disabled:cursor-default`}
            >
              {/* Choice label: "same" or "mirror" (capitalized via Tailwind) */}
              <div className="text-sm font-medium text-text-primary capitalize">{choice}</div>
              {/* Key number hint (1 or 2) */}
              <span className="text-xs text-text-hint font-mono">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
