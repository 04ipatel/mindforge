'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Question } from '@/lib/types'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type MathInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

export function MathInput({ question, onSubmit, feedback }: MathInputProps) {
  const [value, setValue] = useState('')

  // Reset value when question changes
  useEffect(() => {
    setValue('')
  }, [question])

  const handleSubmit = useCallback(() => {
    if (value.trim() === '' || feedback) return
    onSubmit(value)
  }, [value, onSubmit, feedback])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (feedback) return
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }
      if (e.key === 'Backspace') {
        setValue((v) => v.slice(0, -1))
        return
      }
      if (e.key === '-' && value === '') {
        setValue('-')
        return
      }
      if (e.key === '/' && !value.includes('/')) {
        setValue((v) => v + '/')
        return
      }
      if (/^\d$/.test(e.key)) {
        setValue((v) => v + e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit, value, feedback])

  // Split prompt into lines for right-aligned stacked display
  const parts = question.prompt.split(' ')
  const isMultiLine = parts.length === 3 && ['+', '-', '\u00d7', '\u00f7'].includes(parts[1])

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="text-right font-mono min-w-[160px]">
        {isMultiLine ? (
          <>
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              {parts[0]}
            </div>
            <div className="text-[40px] font-normal tracking-wider text-text-primary">
              <span className="text-accent-math mr-3">{parts[1]}</span>
              {parts[2]}
            </div>
          </>
        ) : (
          <div className="text-[40px] font-normal tracking-wider text-text-primary">
            {question.prompt}
          </div>
        )}
        <div className={`border-t-2 mt-2 pt-3 ${feedback ? (feedback.correct ? 'border-positive' : 'border-negative') : 'border-border'}`}>
          {feedback ? (
            <div className="flex items-center justify-end gap-3">
              <span className={`text-[40px] font-normal tracking-wider ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
                {feedback.correct ? value : value}
              </span>
              {!feedback.correct && (
                <span className="text-lg text-text-hint">
                  {feedback.correctAnswer}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[40px] font-normal tracking-wider text-accent-math">
              {value || '\u00A0'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
