// =============================================================================
// lib/ui-types.ts — Shared UI type definitions
// =============================================================================
// WHAT: Exports UI-related types that are shared across multiple components.
//   Centralizes type definitions that were previously duplicated in every input
//   component and view file.
// ROLE: Type-only module. No logic, no side effects, no runtime cost.
// DEPENDENCIES: None
// DEPENDENTS:
//   - app/session/session-view.tsx (uses FeedbackState for answer feedback)
//   - app/session/sprint-view.tsx (passes FeedbackState to input components)
//   - app/session/math-input.tsx (receives FeedbackState as prop)
//   - app/session/stroop-input.tsx (receives FeedbackState as prop)
//   - app/session/spatial-input.tsx (receives FeedbackState as prop)
//   - app/session/switching-input.tsx (receives FeedbackState as prop)
//   - app/session/nback-input.tsx (receives FeedbackState as prop)
//   - app/session/speed-input.tsx (receives FeedbackState as prop)
//   - app/session/memory-input.tsx (receives FeedbackState as prop)
// =============================================================================

// FeedbackState is passed down to input components to show correct/incorrect
// after the user answers. null means no feedback is being shown (ready for input).
// correctAnswer is included so incorrect feedback can display the right answer.
// Previously duplicated in 9 files — now defined once here.
export type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null
