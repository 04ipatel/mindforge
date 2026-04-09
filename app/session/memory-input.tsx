// ============================================================================
// app/session/memory-input.tsx — Memory (Digit Span) Input Component
// ============================================================================
// PURPOSE: Renders the two-phase digit span task:
//   1. DISPLAY phase: shows the digit sequence prominently with a "Memorize"
//      label and a shrinking progress bar indicating time remaining.
//   2. RECALL phase: shows a "Recall" label and a typing area where the user
//      types back the memorized digits, with a border line below (same pattern
//      as math-input).
// ARCHITECTURE: Client component rendered by SprintView when gameType='memory'.
//   Manages display/recall phase state internally. Resets phase on question change.
//   The display→recall transition is driven by a setTimeout based on the
//   displayDurationMs from Question.metadata.
// DEPENDENCIES:
//   - lib/types.ts — Question type
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for memory game type
// INPUT HANDLING (recall phase only):
//   - Digits (0-9): appended to the current value
//   - Backspace: removes the last character
//   - Enter: submits the current value
//   - All input is blocked during display phase and while feedback is shown
// QUESTION METADATA:
//   - question.prompt: digits separated by spaces ("3 7 1 9") — shown in display phase
//   - question.answer: digits joined without spaces ("3719") — what the user types
//   - question.metadata.sequence: number[] — the raw digit array
//   - question.metadata.displayDurationMs: how long the display phase lasts
// ============================================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Question } from '@/lib/types'
import type { FeedbackState } from '@/lib/ui-types'

// Props received from SprintView
type MemoryInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// MemoryInput renders the two-phase digit span task.
// Phase 1 (display): sequence shown with shrinking timer bar.
// Phase 2 (recall): user types the sequence from memory.
export function MemoryInput({ question, onSubmit, feedback }: MemoryInputProps) {
  // Current phase: 'display' shows the sequence, 'recall' accepts typed input
  const [phase, setPhase] = useState<'display' | 'recall'>('display')
  // The current typed value during recall phase
  const [value, setValue] = useState('')
  // Ref to track the display timer so it can be cleaned up on unmount/question change
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Animation key forces CSS animation restart when question changes
  const [animKey, setAnimKey] = useState(0)

  // Extract display duration from metadata (fallback to 3000ms)
  const displayDurationMs = (question.metadata?.displayDurationMs as number) ?? 3000

  // Reset phase and value when the question changes.
  // This handles: new question within a sprint, new sprint start, etc.
  useEffect(() => {
    setPhase('display')
    setValue('')
    setAnimKey(k => k + 1)

    // Schedule the transition from display → recall after displayDurationMs
    timerRef.current = setTimeout(() => {
      setPhase('recall')
    }, displayDurationMs)

    return () => {
      // Clean up timer if the component unmounts or question changes mid-display
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [question, displayDurationMs])

  // Submit handler: only submits if there's a non-empty value, we're in recall phase,
  // and no active feedback is being shown.
  const handleSubmit = useCallback(() => {
    if (phase !== 'recall' || value.trim() === '' || feedback) return
    onSubmit(value)
  }, [phase, value, onSubmit, feedback])

  // Global keydown listener for capturing typed input during recall phase.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block all input during display phase or while feedback is shown
      if (phase !== 'recall' || feedback) return

      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }
      if (e.key === 'Backspace') {
        setValue(v => v.slice(0, -1))
        return
      }
      // Digits 0-9: appended to the current value
      if (/^\d$/.test(e.key)) {
        setValue(v => v + e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit, phase, feedback])

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {phase === 'display' ? (
        // === DISPLAY PHASE ===
        // Shows the digit sequence prominently with a "Memorize" label
        // and a shrinking progress bar indicating remaining display time.
        <>
          {/* Phase label — slate accent color for memory game */}
          <div className="text-lg font-semibold text-accent-memory select-none">
            Memorize
          </div>

          {/* Digit sequence — large monospace text for clear reading */}
          <div className="text-[48px] font-mono font-normal tracking-[0.3em] text-text-primary select-none">
            {question.prompt}
          </div>

          {/* Shrinking progress bar — CSS animation drives the width from 100% to 0%.
              The animation duration matches displayDurationMs so the bar empties exactly
              when the phase transitions to recall. The key forces a fresh animation
              on each new question. */}
          <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
            <div
              key={animKey}
              className="h-full bg-accent-memory rounded-full"
              style={{
                animation: `shrink ${displayDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </>
      ) : (
        // === RECALL PHASE ===
        // Shows "Recall" label and a typing area styled like math-input.
        <>
          {/* Phase label */}
          <div className="text-lg font-semibold text-accent-memory select-none">
            Recall
          </div>

          {/* Answer area — monospace, right-aligned, with divider line below.
              Mirrors the math-input pattern for visual consistency. */}
          <div className="text-right font-mono min-w-[160px]">
            {/* Placeholder dots showing how many digits are expected.
                Helps the user know the target length without revealing the answer. */}
            <div className="text-[40px] font-normal tracking-wider text-text-hint select-none">
              {Array.from({ length: question.answer.length }, () => '·').join(' ')}
            </div>

            {/* Divider + typed input area.
                Border color changes on feedback: green for correct, red for incorrect. */}
            <div className={`border-t-2 mt-2 pt-3 ${feedback ? (feedback.correct ? 'border-positive' : 'border-negative') : 'border-border'}`}>
              {feedback ? (
                // Feedback state: show result with color coding
                <div className="flex items-center justify-end gap-3">
                  <span className={`text-[40px] font-normal tracking-wider ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
                    {value}
                  </span>
                  {/* Show the correct answer next to the wrong answer for learning */}
                  {!feedback.correct && (
                    <span className="text-lg text-text-hint">
                      {feedback.correctAnswer}
                    </span>
                  )}
                </div>
              ) : (
                // Input state: show the typed value in memory accent color.
                // Non-breaking space prevents layout collapse when value is empty.
                <span className="text-[40px] font-normal tracking-wider text-accent-memory">
                  {value || '\u00A0'}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
