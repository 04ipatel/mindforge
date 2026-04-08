'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'

type Point = { x: number; y: number }

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type SpatialInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

function ShapeSVG({ points, color }: { points: Point[]; color: string }) {
  // Center and scale the shape to fit in the viewbox
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const scale = Math.min(120 / width, 120 / height)

  const scaledPoints = points.map(p => ({
    x: (p.x - cx) * scale + 75,
    y: (p.y - cy) * scale + 75,
  }))

  const pathData = scaledPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z'

  return (
    <svg width="150" height="150" viewBox="0 0 150 150" className="bg-card rounded-xl border border-border">
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {scaledPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

export function SpatialInput({ question, onSubmit, feedback }: SpatialInputProps) {
  const originalShape = (question.metadata?.originalShape as Point[]) ?? []
  const transformedShape = (question.metadata?.transformedShape as Point[]) ?? []

  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
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

  const accentColor = '#06b6d4' // cyan

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Two shapes side by side */}
      <div className="flex items-center gap-8">
        <ShapeSVG points={originalShape} color={accentColor} />
        <div className="text-text-hint text-2xl font-light select-none">vs</div>
        <ShapeSVG points={transformedShape} color={accentColor} />
      </div>

      {/* Feedback indicator */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* Choice buttons */}
      <div className="flex gap-4">
        {(['same', 'mirror'] as const).map((choice, i) => {
          let borderClass = 'border-border'
          if (feedback) {
            if (choice === question.answer) borderClass = 'border-positive'
            else if (!feedback.correct && choice !== question.answer) borderClass = 'border-negative'
          }

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={!!feedback}
              className={`px-6 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-spatial disabled:cursor-default`}
            >
              <div className="text-sm font-medium text-text-primary capitalize">{choice}</div>
              <span className="text-xs text-text-hint font-mono">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
