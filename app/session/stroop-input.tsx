'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type StroopInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

export function StroopInput({ question, onSubmit, feedback }: StroopInputProps) {
  const choices = (question.metadata?.choices as string[]) ?? []
  const colorHexMap = (question.metadata?.colorHexMap as Record<string, string>) ?? {}
  const inkColor = (question.metadata?.inkColor as string) ?? '#1a1a1a'

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
      {/* The word displayed in the ink color */}
      <div
        className="text-[56px] font-bold tracking-wider select-none"
        style={{ color: inkColor }}
      >
        {question.prompt}
      </div>

      {/* Feedback indicator */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* 4 color choices */}
      <div className="flex gap-4">
        {choices.map((color, i) => {
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
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: colorHexMap[color] ?? '#888' }}
              />
              <span className="text-xs text-text-secondary font-mono">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
