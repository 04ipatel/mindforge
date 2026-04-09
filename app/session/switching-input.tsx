// ============================================================================
// app/session/switching-input.tsx — Task Switching Classification Input Component
// ============================================================================
// PURPOSE: Renders the Task Switching task — a rule label displayed above a large
//   number, with two choice buttons below. The user must classify the number
//   according to the currently active rule (odd/even, high/low, multiple of 3).
//   The rule can change between questions, forcing cognitive flexibility.
// ARCHITECTURE: Client component rendered by SprintView when gameType='switching'.
//   Stateless except for keyboard event handling. Question data (rule, choices)
//   comes from Question.metadata set by the switching sequence generator at
//   lib/games/switching/generator.ts.
// DEPENDENCIES:
//   - lib/types.ts — Question type
//   - lib/games/switching/constants.ts — RULE_LABELS for displaying the active rule
// DEPENDENTS:
//   - app/session/sprint-view.tsx — renders this for switching game type
// INPUT HANDLING:
//   - Key 1: select the first choice
//   - Key 2: select the second choice
//   - Input is blocked while feedback is being displayed
//   - Clicking a choice button also works (accessibility fallback)
// QUESTION METADATA:
//   - question.prompt: the number to classify (e.g., "7")
//   - question.metadata.rule: the active rule type (e.g., 'odd-even')
//   - question.metadata.choices: array of 2 answer strings (e.g., ['odd', 'even'])
//   - question.answer: the correct classification (e.g., 'odd')
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'
import { RULE_LABELS } from '@/lib/games/switching/constants'
import type { SwitchingRuleType } from '@/lib/games/switching/constants'

// FeedbackState shared with parent — null means ready for input
type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

// Props received from SprintView
type SwitchingInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// SwitchingInput renders the task switching challenge: a rule label, a number,
// and two classification choices. The core challenge is that the rule can change
// between questions — the player must notice the new rule and adapt their response.
export function SwitchingInput({ question, onSubmit, feedback }: SwitchingInputProps) {
  // Extract game-specific metadata from the question object.
  // These are set by generateSwitchingSequence in lib/games/switching/generator.ts.
  const rule = (question.metadata?.rule as SwitchingRuleType) ?? 'odd-even'
  const choices = (question.metadata?.choices as [string, string]) ?? ['', '']
  // Look up the human-readable rule label (e.g., "Odd or Even?")
  const ruleLabel = RULE_LABELS[rule]

  // Handle a choice selection. Blocked during feedback display.
  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // Global keydown listener: 1 = first choice, 2 = second choice.
  // These are the only two valid inputs for the switching task.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Block input during feedback display
      if (feedback) return
      if (e.key === '1') {
        e.preventDefault()
        handleChoice(choices[0])
      } else if (e.key === '2') {
        e.preventDefault()
        handleChoice(choices[1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, choices, feedback])

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Rule label — tells the player which classification rule is active.
          This is the key cognitive cue: when the rule changes, the player must
          notice and switch their response strategy. Amber accent color matches
          the switching game's theme. */}
      <div className="text-lg font-semibold text-accent-switching select-none">
        {ruleLabel}
      </div>

      {/* The number to classify — large and centered for quick reading.
          Numbers are 1-9 (single digit) so they're instantly readable. */}
      <div className="text-[72px] font-bold font-mono text-text-primary select-none leading-none">
        {question.prompt}
      </div>

      {/* Feedback text shown after answering — correct (green) or incorrect (red) */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* Choice buttons: two options (e.g., "odd"/"even", "high"/"low", "yes"/"no").
          During feedback, the correct choice gets a green border and the
          incorrect choice gets a red border. */}
      <div className="flex gap-4">
        {choices.map((choice, i) => {
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
              className={`px-6 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-switching disabled:cursor-default`}
            >
              {/* Choice label: the classification answer (e.g., "odd", "high", "yes") */}
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
