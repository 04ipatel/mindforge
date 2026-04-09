// ============================================================================
// app/session/sprint-view.tsx — Sprint Renderer (Active Play View)
// ============================================================================
// PURPOSE: Renders the active sprint UI during the 'playing' phase. Shows a
//   progress bar, current rating, the game-specific input component, and a
//   keyboard hint at the bottom. This component is purely presentational —
//   it owns no state and delegates all logic to its parent (SessionView).
// ARCHITECTURE:
//   - Receives sprint data, game type, and callbacks from SessionView
//   - Delegates question display and input handling to game-specific components:
//     MathInput, StroopInput, or SpatialInput based on gameType
//   - The transitioning prop controls a CSS opacity fade (0 or 100) for smooth
//     question transitions (150ms duration, matches the timeout in SessionView)
// DEPENDENCIES:
//   - lib/engine.ts — Sprint type
//   - lib/types.ts — GameType type
//   - app/session/math-input.tsx — renders math questions with keyboard input
//   - app/session/stroop-input.tsx — renders Stroop color/word conflict task
//   - app/session/spatial-input.tsx — renders spatial rotation/mirror comparison
//   - app/session/switching-input.tsx — renders task switching classification task
//   - app/session/nback-input.tsx — renders N-Back grid and match/no-match buttons
//   - app/session/speed-input.tsx — renders UFOV speed task with position circles
//   - app/session/memory-input.tsx — renders digit span memorize/recall task
// DEPENDENTS:
//   - app/session/session-view.tsx — renders this during phase='playing'
// ============================================================================

'use client'

import type { Sprint } from '@/lib/engine'
import type { GameType } from '@/lib/types'
import type { FeedbackState } from '@/lib/ui-types'
import { GAME_REGISTRY } from '@/lib/registry'
import { MathInput } from './math-input'
import { StroopInput } from './stroop-input'
import { SpatialInput } from './spatial-input'
import { SwitchingInput } from './switching-input'
import { NBackInput } from './nback-input'
import { SpeedInput } from './speed-input'
import { MemoryInput } from './memory-input'

// Props passed from SessionView — this component is a stateless renderer
type SprintViewProps = {
  sprint: Sprint
  gameType: GameType
  currentRating: number
  onAnswer: (answer: string) => void
  feedback: FeedbackState
  transitioning: boolean
}

// Component map: maps each game type to its React input component.
// Used for dynamic rendering in place of a 7-way conditional chain.
// To add a new game: add its input component import above and add an entry here.
const INPUT_COMPONENTS: Record<GameType, React.ComponentType<{ question: import('@/lib/types').Question; onSubmit: (answer: string) => void; feedback: FeedbackState }>> = {
  math: MathInput,
  stroop: StroopInput,
  spatial: SpatialInput,
  switching: SwitchingInput,
  nback: NBackInput,
  speed: SpeedInput,
  memory: MemoryInput,
}

// SprintView is the main rendering component during active play.
// It shows three layers: progress bar (top), game input (center), keyboard hint (bottom).
export function SprintView({ sprint, gameType, currentRating, onAnswer, feedback, transitioning }: SprintViewProps) {
  // Get the current question from the sprint's question array
  const question = sprint.questions[sprint.currentIndex]
  // Progress is a 0-1 fraction: how far through the sprint the user is.
  // This drives the progress bar width. At sprint start it's 0, at the last
  // question it approaches 1 (but never reaches it since the sprint completes
  // after the last answer, not before).
  const progress = sprint.currentIndex / sprint.questions.length

  return (
    // min-h-screen ensures the view fills the viewport even if content is short
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Progress bar — thin horizontal bar at the top of the screen.
          Shows sprint progress (e.g., "3/6" questions completed).
          The fill color matches the current game's accent color. */}
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Track: light gray rounded bar */}
        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
          {/* Fill: game-colored bar that grows from left to right.
              transition-all duration-200 provides a smooth slide animation
              when advancing to the next question. */}
          <div
            className={`h-full ${GAME_REGISTRY[gameType].accentClass} rounded-full transition-all duration-200`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {/* Question counter: "2/6" format, monospace for alignment */}
        <span className="text-xs text-text-hint font-mono">
          {sprint.currentIndex}/{sprint.questions.length}
        </span>
      </div>

      {/* Main content area — vertically and horizontally centered.
          The transitioning prop toggles opacity for the 150ms fade between questions.
          When transitioning=true, content fades to 0; when false, fades back to 100.
          This creates a smooth visual break between questions. */}
      <div className={`flex-1 flex flex-col items-center justify-center gap-4 transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* Current Elo rating displayed above the question as a small monospace number */}
        <div className="text-sm text-text-hint font-mono">{currentRating}</div>

        {/* Game-specific input component — dynamically selected from INPUT_COMPONENTS
            based on gameType. Each component handles its own keyboard events and renders
            the question in its game-appropriate format. They all share the same prop
            interface: question (Question), onSubmit (answer callback), feedback (FeedbackState). */}
        {(() => {
          const InputComponent = INPUT_COMPONENTS[gameType]
          return <InputComponent question={question} onSubmit={onAnswer} feedback={feedback} />
        })()}
      </div>

      {/* Keyboard hint — displayed at the bottom of the screen.
          Each game type has different controls, so the hint text varies.
          Math: type digits + enter. Stroop: 1-4 keys. Spatial: 1 or 2. */}
      <div className="py-4 text-center text-xs text-text-hint">
        {GAME_REGISTRY[gameType].keyboardHint}
      </div>
    </div>
  )
}
