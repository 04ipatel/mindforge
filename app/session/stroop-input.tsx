// ============================================================================
// app/session/stroop-input.tsx — Stroop Color Selection Input Component
// ============================================================================
// PURPOSE: Renders the Stroop task — a word displayed in a conflicting ink color,
//   with 4 color choices below. The user must identify the INK color (not the word).
//   This creates cognitive interference that trains attention and inhibition.
// ARCHITECTURE: Client component rendered by SprintView when gameType='stroop'.
//   Stateless except for keyboard event handling. Question data (word, ink color,
//   choices, color hex values) comes from Question.metadata set by the Stroop
//   question generator at lib/games/stroop/generator.ts.
// DEPENDENCIES:
//   - lib/types.ts — Question type
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for stroop game type
// INPUT HANDLING:
//   - Keys 1-4 select the corresponding color choice (left to right)
//   - Input is blocked while feedback is being displayed
//   - Clicking a choice button also works (accessibility fallback)
// QUESTION METADATA:
//   - question.prompt: the color word displayed (e.g., "RED")
//   - question.metadata.inkColor: hex color the word is rendered in (e.g., "#3b82f6")
//   - question.metadata.choices: array of 4 color names (e.g., ["red", "blue", ...])
//   - question.metadata.colorHexMap: maps color names to hex values for the swatches
//   - question.answer: the correct color name (the ink color, not the word)
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'
import type { FeedbackState } from '@/lib/ui-types'

// Props received from SprintView
type StroopInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// StroopInput renders the Stroop task: a colored word and 4 choice buttons.
// The core challenge is that the word says one color (e.g., "RED") but is displayed
// in a different ink color (e.g., blue). The user must identify the INK color.
export function StroopInput({ question, onSubmit, feedback }: StroopInputProps) {
  // Extract game-specific metadata from the question object.
  // These are set by generateStroopQuestion in lib/games/stroop/generator.ts.
  // Fallbacks (empty array, empty object, default color) guard against missing metadata.
  const choices = (question.metadata?.choices as string[]) ?? []
  const colorHexMap = (question.metadata?.colorHexMap as Record<string, string>) ?? {}
  // inkColor is the actual display color of the word — this is what the user must identify
  const inkColor = (question.metadata?.inkColor as string) ?? '#1a1a1a'

  // Handle a color choice selection. Blocked during feedback display.
  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // Global keydown listener for 1-4 key mapping to color choices.
  // parseInt(e.key) - 1 converts "1" to index 0, "2" to index 1, etc.
  // Only responds to keys within the valid range of choices.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block input during feedback display
      if (feedback) return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < choices.length) {
        e.preventDefault()
        handleChoice(choices[idx])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, choices, feedback])

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* The word displayed in the ink color — this is the core Stroop stimulus.
          The word text (question.prompt) says one color, but style.color renders it
          in the inkColor, which may be different. The user must name the INK color.
          font-bold and large size make the word prominent. select-none prevents
          accidental text selection during rapid play. */}
      <div
        className="text-[56px] font-bold tracking-wider select-none"
        style={{ color: inkColor }}
      >
        {question.prompt}
      </div>

      {/* Fixed-height feedback area — always present to prevent layout shift.
          h-5 reserves space whether feedback is showing or not. */}
      <div className="h-5 flex items-center justify-center">
        {feedback && (
          <span className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
            {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
          </span>
        )}
      </div>

      {/* 4 color choice buttons arranged horizontally.
          Each button shows a colored circle (swatch) and a key number (1-4).
          During feedback, the correct choice gets a green border and the
          incorrect selection gets a red border. */}
      <div className="flex gap-4">
        {choices.map((color, i) => {
          // Determine border color based on feedback state:
          // - No feedback: default gray border
          // - Feedback shown: green border on correct answer, red on incorrect selection
          let borderClass = 'border-border'
          if (feedback) {
            if (color === question.answer) borderClass = 'border-positive'
            else if (color === feedback.correctAnswer && !feedback.correct) borderClass = 'border-negative'
          }

          return (
            <button
              key={`${color}-${i}`}
              onClick={() => handleChoice(color)}
              disabled={!!feedback}
              className={`flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-stroop disabled:cursor-default`}
            >
              {/* Color swatch circle — filled with the hex color for this choice.
                  colorHexMap maps color names (e.g., "red") to hex values (e.g., "#ef4444").
                  Falls back to #888 gray if the mapping is missing. */}
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: colorHexMap[color] ?? '#888' }}
              />
              {/* Key number hint (1-4) — tells the user which key to press */}
              <span className="text-xs text-text-secondary font-mono">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
