// ============================================================================
// app/session/math-input.tsx — Math Keyboard Input Component
// ============================================================================
// PURPOSE: Handles the display and keyboard input for mental math questions.
//   Renders the math prompt in a right-aligned stacked layout (operand above
//   operator+operand, like traditional vertical math) and captures typed answers.
// ARCHITECTURE: Client component rendered by SprintView when gameType='math'.
//   Manages its own input value state. Keyboard events are handled via a global
//   keydown listener (not an <input> element — the UI is fully custom).
// DEPENDENCIES:
//   - lib/types.ts — Question type (prompt, answer, metadata)
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for math game type
// INPUT HANDLING:
//   - Digits (0-9): appended to the current value
//   - Minus (-): only allowed as the first character (negative numbers)
//   - Slash (/): allowed once for fraction answers (e.g., "1/2")
//   - Backspace: removes the last character
//   - Enter: submits the current value
//   - All input is blocked while feedback is being displayed
// DISPLAY FORMAT:
//   - Multi-line: for binary operations (e.g., "45 + 23"), the first operand
//     goes on top, operator + second operand on the bottom line
//   - Single-line: for complex expressions that don't match the binary pattern
//   - Answer area is below a horizontal divider, styled with accent color
//   - Feedback: divider turns green (correct) or red (incorrect)
// ============================================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Question } from '@/lib/types'

// FeedbackState controls the visual feedback shown after answering.
// null = no feedback (ready for input). When non-null, the divider color changes
// and the answer area shows the result.
type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

// Props received from SprintView
type MathInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// MathInput renders a math question and captures keyboard input for the answer.
// It does NOT use an <input> element — instead, it renders typed characters
// directly into the UI for a clean, distraction-free appearance.
export function MathInput({ question, onSubmit, feedback }: MathInputProps) {
  // The current typed value — resets when the question changes
  const [value, setValue] = useState('')

  // Reset the typed value whenever a new question is displayed.
  // This ensures leftover input from the previous question doesn't carry over.
  useEffect(() => {
    setValue('')
  }, [question])

  // Submit handler: only submits if there's a non-empty value and no active feedback.
  // Memoized because it's a dependency of the keydown effect below.
  const handleSubmit = useCallback(() => {
    if (value.trim() === '' || feedback) return
    onSubmit(value)
  }, [value, onSubmit, feedback])

  // Global keydown listener for capturing typed input.
  // This approach avoids needing a focused <input> element and works anywhere on the page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block all input while feedback is being shown
      if (feedback) return
      // Enter submits the current answer
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }
      // Backspace removes the last character from the value
      if (e.key === 'Backspace') {
        setValue((v) => v.slice(0, -1))
        return
      }
      // Minus sign: only allowed as the first character (for negative answers)
      if (e.key === '-' && value === '') {
        setValue('-')
        return
      }
      // Slash: allowed once for fraction answers (e.g., "3/4")
      // Prevented from appearing twice via the includes check
      if (e.key === '/' && !value.includes('/')) {
        setValue((v) => v + '/')
        return
      }
      // Digits 0-9: appended to the current value
      if (/^\d$/.test(e.key)) {
        setValue((v) => v + e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit, value, feedback])

  // Parse the prompt to determine if it should be displayed in stacked (multi-line) format.
  // A prompt like "45 + 23" splits into ["45", "+", "23"].
  // Multi-line display is used for binary operations: exactly 3 parts where the
  // middle part is an arithmetic operator (+ - x ÷).
  // \u00d7 = multiplication sign (×), \u00f7 = division sign (÷)
  const parts = question.prompt.split(' ')
  const isMultiLine = parts.length === 3 && ['+', '-', '\u00d7', '\u00f7'].includes(parts[1])

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Math display area — right-aligned monospace text, min-width 160px for stability */}
      <div className="text-right font-mono min-w-[160px]">
        {isMultiLine ? (
          // Stacked layout: first operand on top, operator + second operand below.
          // This mimics traditional vertical arithmetic notation.
          <>
            {/* First operand (e.g., "45") */}
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              {parts[0]}
            </div>
            {/* Operator + second operand (e.g., "+ 23").
                The operator is styled with the math accent color (indigo).
                mr-3 adds spacing between the operator and the operand. */}
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              <span className="text-accent-math mr-3">{parts[1]}</span>
              {parts[2]}
            </div>
          </>
        ) : (
          // Single-line layout: used for complex expressions or single numbers
          <div className="text-[40px] font-normal tracking-wider text-text-primary">
            {question.prompt}
          </div>
        )}
        {/* Answer area — below a horizontal divider line.
            The divider color changes based on feedback state:
            - No feedback: default border color (gray)
            - Correct: green (border-positive)
            - Incorrect: red (border-negative) */}
        <div className={`border-t-2 mt-2 pt-3 ${feedback ? (feedback.correct ? 'border-positive' : 'border-negative') : 'border-border'}`}>
          {feedback ? (
            // Feedback state: show the user's answer in the feedback color,
            // and if incorrect, also show the correct answer in a muted style
            <div className="flex items-center justify-end gap-3">
              <span className={`text-[40px] font-normal tracking-wider ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
                {feedback.correct ? value : value}
              </span>
              {/* Show the correct answer next to the wrong answer for learning */}
              {!feedback.correct && (
                <span className="text-lg text-text-hint">
                  {feedback.correctAnswer}
                </span>
              )}
            </div>
          ) : (
            // Input state: show the typed value in the math accent color (indigo).
            // \u00A0 (non-breaking space) prevents layout collapse when value is empty.
            <span className="text-[40px] font-normal tracking-wider text-accent-math">
              {value || '\u00A0'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
