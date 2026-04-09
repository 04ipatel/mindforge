// ============================================================================
// app/session/nback-input.tsx — N-Back Grid Input Component
// ============================================================================
// PURPOSE: Renders the N-Back task — a 3x3 grid with one cell highlighted,
//   plus two choice buttons "Match" (F key) and "No Match" (J key). The user
//   must decide whether the highlighted position matches the one shown N steps
//   back in the sequence. This trains working memory by requiring continuous
//   updating and comparison of a sliding window of positions.
// ARCHITECTURE: Client component rendered by SprintView when gameType='nback'.
//   Stateless except for keyboard event handling. Question data (grid position,
//   N-level) comes from Question.metadata set by the N-Back sequence generator
//   at lib/games/nback/generator.ts.
// DEPENDENCIES:
//   - lib/types.ts — Question type
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for nback game type
// INPUT HANDLING:
//   - F key: select "Match"
//   - J key: select "No Match"
//   - Input is blocked while feedback is being displayed
//   - Clicking a choice button also works (accessibility fallback)
// QUESTION METADATA:
//   - question.prompt: the grid position as a string (e.g., "5")
//   - question.metadata.gridPosition: which cell (1-9) to highlight
//   - question.metadata.nLevel: the N in N-back (1, 2, or 3)
//   - question.metadata.stepIndex: position within the sequence
//   - question.answer: 'match' or 'no-match'
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'
import type { FeedbackState } from '@/lib/ui-types'

// Props received from SprintView
type NBackInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// Grid positions 1-9 mapped to a 3x3 grid (row-major order):
//   1 | 2 | 3
//   4 | 5 | 6
//   7 | 8 | 9
const GRID_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// NBackInput renders the N-Back task: an N-level label, a 3x3 grid with one
// highlighted cell, and two choice buttons (Match / No Match).
// The core challenge is remembering positions N steps back while new positions
// appear — the player must continuously update their working memory buffer.
export function NBackInput({ question, onSubmit, feedback }: NBackInputProps) {
  // Extract game-specific metadata from the question object.
  // These are set by generateNBackSequence in lib/games/nback/generator.ts.
  const gridPosition = (question.metadata?.gridPosition as number) ?? 1
  const nLevel = (question.metadata?.nLevel as number) ?? 1

  // Handle a choice selection. Blocked during feedback display.
  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // Global keydown listener: F = match, J = no match.
  // These keys are chosen for ergonomic left/right hand positioning.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block input during feedback display
      if (feedback) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        e.preventDefault()
        handleChoice('match')
      } else if (key === 'j') {
        e.preventDefault()
        handleChoice('no-match')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, feedback])

  // Determine border classes for Match / No Match buttons during feedback
  const getButtonBorder = (value: string): string => {
    if (!feedback) return 'border-border'
    if (value === question.answer) return 'border-positive'
    if (!feedback.correct && value !== question.answer) return 'border-negative'
    return 'border-border'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* N-level label — tells the player which N-back level they're on.
          Violet accent color matches the N-Back game's theme. */}
      <div className="text-lg font-semibold text-accent-nback select-none">
        {nLevel}-Back
      </div>

      {/* 3x3 grid — one cell is highlighted to show the current position.
          Grid cells are 64x64px (w-16 h-16) with rounded corners. The active
          cell gets a violet accent background tint. */}
      <div className="grid grid-cols-3 gap-2">
        {GRID_POSITIONS.map(pos => {
          const isActive = pos === gridPosition
          return (
            <div
              key={pos}
              className={`w-16 h-16 rounded-lg border-2 transition-colors ${
                isActive
                  ? 'bg-accent-nback/20 border-accent-nback'
                  : 'bg-surface border-border'
              }`}
            />
          )
        })}
      </div>

      {/* Feedback text shown after answering — correct (green) or incorrect (red) */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* Choice buttons: Match (F) and No Match (J).
          During feedback, the correct choice gets a green border and the
          incorrect choice gets a red border. */}
      <div className="flex gap-4">
        <button
          onClick={() => handleChoice('match')}
          disabled={!!feedback}
          className={`px-6 py-3 rounded-xl border-2 ${getButtonBorder('match')} transition-colors hover:border-accent-nback disabled:cursor-default`}
        >
          <div className="text-sm font-medium text-text-primary">Match</div>
          <span className="text-xs text-text-hint font-mono">F</span>
        </button>
        <button
          onClick={() => handleChoice('no-match')}
          disabled={!!feedback}
          className={`px-6 py-3 rounded-xl border-2 ${getButtonBorder('no-match')} transition-colors hover:border-accent-nback disabled:cursor-default`}
        >
          <div className="text-sm font-medium text-text-primary">No Match</div>
          <span className="text-xs text-text-hint font-mono">J</span>
        </button>
      </div>
    </div>
  )
}
