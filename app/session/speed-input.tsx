// ============================================================================
// app/session/speed-input.tsx — Speed of Processing (UFOV) Input Component
// ============================================================================
// PURPOSE: Renders the Speed of Processing task — a circular arrangement of
//   positions around a center point. A target briefly flashes at one position,
//   then the player must identify which position it appeared at. This trains
//   visual processing speed and peripheral awareness.
// ARCHITECTURE: Client component rendered by SprintView when gameType='speed'.
//   Has an internal 3-phase state machine (fixation → flash → respond) that
//   controls what is displayed at each stage of the trial. Uses setTimeout
//   chains to advance phases automatically.
// DEPENDENCIES:
//   - lib/types.ts — Question type
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for speed game type
// INPUT HANDLING:
//   - Number keys 1-4 (for 4 positions) or 1-8 (for 8 positions) during respond phase
//   - Input is blocked during fixation and flash phases, and during feedback
//   - Clicking a position button also works (accessibility fallback)
// PHASES:
//   - fixation (500ms): center "+" cross with faint position circles
//   - flash (variable ms from metadata): target shown as filled emerald circle
//   - respond: numbered position buttons, accept keyboard input
// QUESTION METADATA:
//   - question.metadata.targetPosition: which position (1-based) the target appeared at
//   - question.metadata.positionCount: 4 or 8 positions in the circle
//   - question.metadata.flashDurationMs: how long the target is visible
//   - question.answer: the target position as a string
// ============================================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Question } from '@/lib/types'

// FeedbackState shared with parent — null means ready for input
type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

// The three phases of a speed trial
type Phase = 'fixation' | 'flash' | 'respond'

// Props received from SprintView
type SpeedInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// Position angles for 4-position layout (compass: N, E, S, W)
// Starting from top (270°) going clockwise
const ANGLES_4 = [270, 0, 90, 180]

// Position angles for 8-position layout (all compass points: N, NE, E, SE, S, SW, W, NW)
const ANGLES_8 = [270, 315, 0, 45, 90, 135, 180, 225]

// Container size in pixels — positions are arranged within this square
const CONTAINER_SIZE = 280

// Radius for position placement (percentage of half the container)
const RADIUS_PERCENT = 40

// Convert degrees to (x, y) percentage offsets from center.
// Returns values in [0, 100] range for CSS left/top positioning.
function angleToPosition(angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  // cos for x (horizontal), sin for y (vertical)
  // 50 centers it, RADIUS_PERCENT scales the offset
  return {
    x: 50 + RADIUS_PERCENT * Math.cos(rad),
    y: 50 + RADIUS_PERCENT * Math.sin(rad),
  }
}

// SpeedInput renders the UFOV speed task: a fixation cross, a brief target flash,
// then numbered position buttons for the player to identify where it appeared.
export function SpeedInput({ question, onSubmit, feedback }: SpeedInputProps) {
  // Extract game-specific metadata from the question object
  const targetPosition = (question.metadata?.targetPosition as number) ?? 1
  const positionCount = (question.metadata?.positionCount as number) ?? 4
  const flashDurationMs = (question.metadata?.flashDurationMs as number) ?? 300

  // Phase state machine — controls what's displayed
  const [phase, setPhase] = useState<Phase>('fixation')
  // Ref mirrors phase state to avoid stale closures in the keyboard handler
  const phaseRef = useRef<Phase>('fixation')

  // Select the correct angle set based on position count
  const angles = positionCount === 8 ? ANGLES_8 : ANGLES_4

  // Reset phase to 'fixation' when a new question arrives.
  // This handles both the initial question and subsequent questions in a sprint.
  useEffect(() => {
    setPhase('fixation')
    phaseRef.current = 'fixation'

    // Phase 1 → 2: fixation (500ms) → flash
    const fixationTimer = setTimeout(() => {
      setPhase('flash')
      phaseRef.current = 'flash'

      // Phase 2 → 3: flash (variable duration) → respond
      const flashTimer = setTimeout(() => {
        setPhase('respond')
        phaseRef.current = 'respond'
      }, flashDurationMs)

      return () => clearTimeout(flashTimer)
    }, 500)

    return () => clearTimeout(fixationTimer)
  }, [question, flashDurationMs])

  // Handle a position choice. Only allowed during respond phase and when no feedback.
  const handleChoice = useCallback(
    (position: number) => {
      if (phaseRef.current !== 'respond') return
      if (feedback) return
      onSubmit(String(position))
    },
    [onSubmit, feedback],
  )

  // Global keydown listener for number keys 1-N during respond phase.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phaseRef.current !== 'respond') return
      if (feedback) return
      const num = parseInt(e.key)
      if (num >= 1 && num <= positionCount) {
        e.preventDefault()
        handleChoice(num)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, positionCount, feedback])

  // Determine the visual style for a position circle based on current phase
  const getPositionStyle = (posIndex: number): string => {
    const posNum = posIndex + 1 // 1-based position number
    const isTarget = posNum === targetPosition

    // During fixation: all positions are faint outlines
    if (phase === 'fixation') {
      return 'border-2 border-border/40 bg-transparent'
    }

    // During flash: target is filled emerald, others stay faint
    if (phase === 'flash') {
      if (isTarget) return 'border-2 border-accent-speed bg-accent-speed'
      return 'border-2 border-border/40 bg-transparent'
    }

    // During respond: show numbered buttons
    // With feedback: highlight correct/incorrect
    if (feedback) {
      if (posNum === parseInt(question.answer)) return 'border-2 border-positive bg-surface'
      if (!feedback.correct && posNum !== parseInt(question.answer)) {
        // Only highlight the incorrect choice — but we don't track which was selected
        // So just show the correct answer highlighted
        return 'border-2 border-border bg-surface'
      }
      return 'border-2 border-border bg-surface'
    }

    return 'border-2 border-border bg-surface hover:border-accent-speed'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Circular position layout — relative container with absolutely positioned circles */}
      <div
        className="relative"
        style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
      >
        {/* Center fixation cross — visible during fixation and flash phases */}
        {(phase === 'fixation' || phase === 'flash') && (
          <div
            className="absolute text-2xl font-bold text-text-hint select-none"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            +
          </div>
        )}

        {/* Position circles arranged in a circle using trigonometric placement */}
        {angles.map((angle, i) => {
          const { x, y } = angleToPosition(angle)
          const posNum = i + 1

          return (
            <button
              key={posNum}
              onClick={() => handleChoice(posNum)}
              disabled={phase !== 'respond' || !!feedback}
              className={`absolute w-10 h-10 rounded-full flex items-center justify-center transition-colors ${getPositionStyle(i)} disabled:cursor-default`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Show position numbers only during respond phase */}
              {phase === 'respond' && (
                <span className="text-sm font-mono text-text-secondary select-none">
                  {posNum}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Feedback text shown after answering — correct (green) or incorrect (red) */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — position ${feedback.correctAnswer}`}
        </div>
      )}
    </div>
  )
}
