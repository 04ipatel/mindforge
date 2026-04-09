# MindForge Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the cognitive foundation layer with 4 new game modules (Task Switching, N-Back, Speed of Processing, Memory), add a streak system for retention, and build an analytics dashboard. All client-side, localStorage only.

**Architecture:** Each game module follows the established plugin pattern: constants file (levels) + generator file (pure functions) + test file + input component (React) + wiring into session-view.tsx and sprint-view.tsx. Three games (Task Switching, N-Back, Memory) require sequence-aware generation where questions depend on each other — these use a new BATCH_GENERATORS table alongside the existing per-question GENERATORS table.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Bun, Vitest for testing.

**Existing patterns to follow:** See `lib/games/stroop/` for the constants+generator pattern. See `app/session/stroop-input.tsx` for the input component pattern. See `app/session/session-view.tsx` for the GENERATORS/EXPECTED_TIME_FNS/ACTIVE_GAMES wiring pattern. All game logic is pure functions in `lib/`. All UI is `'use client'` components in `app/session/`. Comments are mandatory per CLAUDE.md commenting standard.

---

## File Structure

```
lib/
  types.ts                              — UPDATE: add 'speed' | 'memory' to GameType
  streak.ts                             — NEW: streak calculation pure functions
  games/
    switching/
      constants.ts                      — NEW: 8 difficulty levels, rule types
      generator.ts                      — NEW: sequence-aware switching question generator
    nback/
      constants.ts                      — NEW: 8 difficulty levels, n-level configs
      generator.ts                      — NEW: position sequence generator with match control
    speed/
      constants.ts                      — NEW: 8 difficulty levels, flash durations
      generator.ts                      — NEW: target position generator
    memory/
      constants.ts                      — NEW: 8 difficulty levels, sequence lengths
      generator.ts                      — NEW: digit sequence generator

app/
  globals.css                           — UPDATE: add accent colors for speed + memory
  page.tsx                              — UPDATE: add streak display, new game labels/colors
  session/
    session-view.tsx                    — UPDATE: add BATCH_GENERATORS, wire all new games
    sprint-view.tsx                     — UPDATE: add input components for new games
    switching-input.tsx                 — NEW: rule label + number + 1-2 key choice
    nback-input.tsx                     — NEW: 3x3 grid + F/J match input
    speed-input.tsx                     — NEW: timed flash + 1-4 position selection
    memory-input.tsx                    — NEW: display phase + digit typing recall
  stats/
    page.tsx                            — NEW: analytics dashboard route (server shell)
    stats-view.tsx                      — NEW: analytics client component

__tests__/
  lib/
    streak.test.ts                      — NEW: streak calculation tests
    games/
      switching/generator.test.ts       — NEW
      nback/generator.test.ts           — NEW
      speed/generator.test.ts           — NEW
      memory/generator.test.ts          — NEW
```

---

### Task 1: Update Core Types and Theme

**Files:**
- Modify: `lib/types.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Update GameType union and GAME_TYPES array**

In `lib/types.ts`, update the GameType union and GAME_TYPES array to include the new game types:

```typescript
export type GameType = 'math' | 'stroop' | 'spatial' | 'switching' | 'nback' | 'speed' | 'memory'

export const GAME_TYPES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback', 'speed', 'memory']
```

- [ ] **Step 2: Add accent colors for new game types**

In `app/globals.css`, add inside the `@theme` block:

```css
  --color-accent-speed: #10b981;
  --color-accent-memory: #64748b;
```

- [ ] **Step 3: Update home screen labels and colors**

In `app/page.tsx`, update the GAME_LABELS and GAME_COLORS records:

```typescript
const GAME_LABELS: Record<GameType, string> = {
  math: 'Math',
  stroop: 'Stroop',
  spatial: 'Spatial',
  switching: 'Switching',
  nback: 'N-Back',
  speed: 'Speed',
  memory: 'Memory',
}

const GAME_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
  speed: 'bg-accent-speed',
  memory: 'bg-accent-memory',
}
```

- [ ] **Step 4: Update sprint-complete.tsx GAME_LABELS**

In `app/session/sprint-complete.tsx`, update the GAME_LABELS record to include the new entries:

```typescript
const GAME_LABELS: Record<GameType, string> = {
  math: 'Math',
  stroop: 'Stroop',
  spatial: 'Spatial',
  switching: 'Switching',
  nback: 'N-Back',
  speed: 'Speed',
  memory: 'Memory',
}
```

- [ ] **Step 5: Update sprint-view.tsx ACCENT_COLORS**

In `app/session/sprint-view.tsx`, update the ACCENT_COLORS record:

```typescript
const ACCENT_COLORS: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
  speed: 'bg-accent-speed',
  memory: 'bg-accent-memory',
}
```

- [ ] **Step 6: Verify existing tests still pass**

Run:
```bash
bun run test
```
Expected: all 74 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts app/globals.css app/page.tsx app/session/sprint-complete.tsx app/session/sprint-view.tsx
git commit -m "chore: add speed and memory game types, accent colors, and labels"
```

---

### Task 2: Task Switching — Constants and Generator (TDD)

**Files:**
- Create: `lib/games/switching/constants.ts`
- Create: `lib/games/switching/generator.ts`
- Create: `__tests__/lib/games/switching/generator.test.ts`

- [ ] **Step 1: Create switching constants**

Create `lib/games/switching/constants.ts`:
```typescript
// =============================================================================
// lib/games/switching/constants.ts — Task Switching difficulty level definitions
// =============================================================================
// WHAT: Defines rule types and 8 difficulty levels for the Task Switching game.
//   The player sees a number and must classify it according to the CURRENT rule.
//   Rules switch between questions — the cognitive challenge is adapting to the
//   new rule quickly (inhibiting the old rule's response pattern).
// ROLE: Configuration data for the switching game plugin. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/switching/generator.ts
//   - __tests__/lib/games/switching/generator.test.ts
// DIFFICULTY AXES:
//   1. Number of rules in play (1 → 3)
//   2. Switch frequency: how often the rule changes (never → random per question)
//   Lower switch frequency = easier (can settle into one rule)
//   Higher switch frequency = harder (must constantly re-engage)
// =============================================================================

// Available rule types. Each rule defines how to classify a number 1-9.
// 'odd-even': is the number odd or even?
// 'high-low': is the number > 5 (high) or ≤ 5 (low)?
// 'multiple-3': is the number a multiple of 3?
export type SwitchingRuleType = 'odd-even' | 'high-low' | 'multiple-3'

// Human-readable labels shown in the UI above the number
export const RULE_LABELS: Record<SwitchingRuleType, string> = {
  'odd-even': 'Odd or Even?',
  'high-low': 'High or Low?',
  'multiple-3': 'Multiple of 3?',
}

// The two answer choices for each rule type
export const RULE_CHOICES: Record<SwitchingRuleType, [string, string]> = {
  'odd-even': ['odd', 'even'],
  'high-low': ['low', 'high'],
  'multiple-3': ['no', 'yes'],
}

export type SwitchingLevel = {
  level: number
  name: string
  rules: SwitchingRuleType[]
  // How often the rule switches:
  // 0 = never (same rule all sprint)
  // N > 0 = every N questions
  // -1 = random (50% chance per question)
  switchFrequency: number
  expectedTimeMs: number
}

// 8 difficulty levels, easiest to hardest.
// Progression: single rule → two rules with predictable switching → unpredictable → three rules
export const SWITCHING_LEVELS: SwitchingLevel[] = [
  { level: 1, name: 'Odd/Even only', rules: ['odd-even'], switchFrequency: 0, expectedTimeMs: 2500 },
  { level: 2, name: 'High/Low only', rules: ['high-low'], switchFrequency: 0, expectedTimeMs: 2500 },
  { level: 3, name: 'Two rules, switch every 3', rules: ['odd-even', 'high-low'], switchFrequency: 3, expectedTimeMs: 3000 },
  { level: 4, name: 'Two rules, switch every 2', rules: ['odd-even', 'high-low'], switchFrequency: 2, expectedTimeMs: 2500 },
  { level: 5, name: 'Two rules, alternating', rules: ['odd-even', 'high-low'], switchFrequency: 1, expectedTimeMs: 2500 },
  { level: 6, name: 'Two rules, random switch', rules: ['odd-even', 'high-low'], switchFrequency: -1, expectedTimeMs: 2000 },
  { level: 7, name: 'Three rules, switch every 2', rules: ['odd-even', 'high-low', 'multiple-3'], switchFrequency: 2, expectedTimeMs: 2500 },
  { level: 8, name: 'Three rules, random switch', rules: ['odd-even', 'high-low', 'multiple-3'], switchFrequency: -1, expectedTimeMs: 2000 },
]

export function getSwitchingExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, SWITCHING_LEVELS.length))
  return SWITCHING_LEVELS[clamped - 1].expectedTimeMs
}
```

- [ ] **Step 2: Write failing tests for switching generator**

Create `__tests__/lib/games/switching/generator.test.ts`:
```typescript
// Tests for: lib/games/switching/generator.ts
// Module: Task switching sequence generator with 8 difficulty levels
// Key behaviors: rule-based number classification, rule switching patterns,
// sequence-aware generation where each question knows its active rule

import { describe, it, expect } from 'vitest'
import { generateSwitchingSequence, classifyNumber } from '@/lib/games/switching/generator'

describe('classifyNumber', () => {
  it('classifies odd/even correctly', () => {
    expect(classifyNumber(3, 'odd-even')).toBe('odd')
    expect(classifyNumber(4, 'odd-even')).toBe('even')
  })

  it('classifies high/low correctly (>5 is high, ≤5 is low)', () => {
    expect(classifyNumber(6, 'high-low')).toBe('high')
    expect(classifyNumber(5, 'high-low')).toBe('low')
    expect(classifyNumber(1, 'high-low')).toBe('low')
  })

  it('classifies multiple of 3 correctly', () => {
    expect(classifyNumber(3, 'multiple-3')).toBe('yes')
    expect(classifyNumber(6, 'multiple-3')).toBe('yes')
    expect(classifyNumber(9, 'multiple-3')).toBe('yes')
    expect(classifyNumber(4, 'multiple-3')).toBe('no')
  })
})

describe('generateSwitchingSequence', () => {
  it('generates the requested number of questions', () => {
    const questions = generateSwitchingSequence(1, 6)
    expect(questions).toHaveLength(6)
  })

  it('uses only one rule at level 1 (no switching)', () => {
    const questions = generateSwitchingSequence(1, 7)
    const rules = questions.map(q => (q.metadata as { rule: string }).rule)
    const unique = new Set(rules)
    expect(unique.size).toBe(1)
    expect(unique.has('odd-even')).toBe(true)
  })

  it('uses only high-low at level 2', () => {
    const questions = generateSwitchingSequence(2, 7)
    const rules = questions.map(q => (q.metadata as { rule: string }).rule)
    expect(new Set(rules)).toEqual(new Set(['high-low']))
  })

  it('switches rules at level 5 (alternating)', () => {
    const questions = generateSwitchingSequence(5, 6)
    const rules = questions.map(q => (q.metadata as { rule: string }).rule)
    // Alternating means rule changes every question
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i]).not.toBe(rules[i - 1])
    }
  })

  it('uses three rules at level 7+', () => {
    const questions = generateSwitchingSequence(7, 20)
    const rules = new Set(questions.map(q => (q.metadata as { rule: string }).rule))
    expect(rules.size).toBe(3)
  })

  it('produces correct answers for each question', () => {
    const questions = generateSwitchingSequence(1, 10)
    for (const q of questions) {
      const num = parseInt(q.prompt)
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(9)
      // Level 1 is odd-even, so answer should be 'odd' or 'even'
      expect(['odd', 'even']).toContain(q.answer)
      if (num % 2 === 0) expect(q.answer).toBe('even')
      else expect(q.answer).toBe('odd')
    }
  })

  it('includes rule and choices in metadata', () => {
    const questions = generateSwitchingSequence(1, 5)
    for (const q of questions) {
      const meta = q.metadata as { rule: string; choices: string[] }
      expect(meta.rule).toBeDefined()
      expect(meta.choices).toHaveLength(2)
    }
  })

  it('has correct expectedTimeMs', () => {
    const questions = generateSwitchingSequence(1, 5)
    expect(questions[0].expectedTimeMs).toBe(2500)
    const q8 = generateSwitchingSequence(8, 5)
    expect(q8[0].expectedTimeMs).toBe(2000)
  })

  it('clamps difficulty to valid range', () => {
    const q0 = generateSwitchingSequence(0, 5)
    expect(q0[0].difficulty).toBe(1)
    const q99 = generateSwitchingSequence(99, 5)
    expect(q99[0].difficulty).toBe(8)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/games/switching/generator.test.ts
```
Expected: FAIL — module `@/lib/games/switching/generator` not found.

- [ ] **Step 4: Implement switching generator**

Create `lib/games/switching/generator.ts`:
```typescript
// =============================================================================
// lib/games/switching/generator.ts — Task Switching question generator
// =============================================================================
// WHAT: Generates a sequence of task switching questions. Each question shows a
//   number (1-9) and the player must classify it according to the current rule.
//   The rule switches during the sequence based on the difficulty level's config.
// ROLE: Game plugin logic. Pure functions, no side effects.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/switching/constants.ts (SWITCHING_LEVELS, rule types, choices)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls via BATCH_GENERATORS)
//   - app/session/switching-input.tsx (reads metadata.rule, metadata.choices)
//   - __tests__/lib/games/switching/generator.test.ts
// NOTE: This is a BATCH generator — it produces the full sequence of questions
//   at once because rule switching depends on position in the sequence. It's
//   registered in BATCH_GENERATORS, not GENERATORS, in session-view.tsx.
// METADATA SHAPE:
//   { rule: SwitchingRuleType, choices: [string, string] }
// =============================================================================

import type { Question } from '@/lib/types'
import { SWITCHING_LEVELS, getSwitchingExpectedTimeMs, RULE_CHOICES } from './constants'
import type { SwitchingRuleType } from './constants'

// Random integer in [min, max] inclusive
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Classify a number according to the given rule.
// Returns the answer string that matches one of the rule's choices.
export function classifyNumber(n: number, rule: SwitchingRuleType): string {
  switch (rule) {
    case 'odd-even':
      return n % 2 === 0 ? 'even' : 'odd'
    case 'high-low':
      // 5 or below = low, above 5 = high
      return n > 5 ? 'high' : 'low'
    case 'multiple-3':
      return n % 3 === 0 ? 'yes' : 'no'
  }
}

// Build the rule sequence for a sprint based on the level's switch pattern.
// Returns an array of rule types, one per question position.
function buildRuleSequence(rules: SwitchingRuleType[], switchFrequency: number, count: number): SwitchingRuleType[] {
  // Single rule, no switching
  if (rules.length === 1 || switchFrequency === 0) {
    return Array(count).fill(rules[0])
  }

  const sequence: SwitchingRuleType[] = []
  let currentRuleIndex = 0

  for (let i = 0; i < count; i++) {
    if (switchFrequency === -1) {
      // Random switching: 50% chance to switch each question (except first)
      if (i > 0 && Math.random() < 0.5) {
        currentRuleIndex = (currentRuleIndex + 1) % rules.length
      }
    } else if (switchFrequency > 0 && i > 0 && i % switchFrequency === 0) {
      // Periodic switching: switch every N questions
      currentRuleIndex = (currentRuleIndex + 1) % rules.length
    }
    sequence.push(rules[currentRuleIndex])
  }

  return sequence
}

// Generate a full sequence of task switching questions.
// This is a batch generator — produces all questions at once because
// the rule switching pattern depends on position in the sequence.
export function generateSwitchingSequence(difficulty: number, count: number): Question[] {
  const clamped = Math.max(1, Math.min(difficulty, SWITCHING_LEVELS.length))
  const level = SWITCHING_LEVELS[clamped - 1]

  // Build the rule sequence for this sprint
  const ruleSequence = buildRuleSequence(level.rules, level.switchFrequency, count)

  return ruleSequence.map(rule => {
    // Pick a random number 1-9
    const num = rand(1, 9)
    // Classify according to the current rule
    const answer = classifyNumber(num, rule)

    return {
      prompt: String(num),
      answer,
      difficulty: clamped,
      expectedTimeMs: getSwitchingExpectedTimeMs(clamped),
      metadata: {
        rule,
        choices: RULE_CHOICES[rule],
      },
    }
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/games/switching/generator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/games/switching/ __tests__/lib/games/switching/
git commit -m "feat: implement task switching game constants and generator with TDD"
```

---

### Task 3: Task Switching — Input Component and Wiring

**Files:**
- Create: `app/session/switching-input.tsx`
- Modify: `app/session/sprint-view.tsx`
- Modify: `app/session/session-view.tsx`

- [ ] **Step 1: Create switching input component**

Create `app/session/switching-input.tsx`:
```tsx
// ============================================================================
// app/session/switching-input.tsx — Task Switching Input Component
// ============================================================================
// PURPOSE: Renders the task switching game — a number with a rule label above it,
//   and two choice buttons below. The player must classify the number according
//   to the current rule (which switches unpredictably at higher difficulty).
// ARCHITECTURE: Client component rendered by SprintView when gameType='switching'.
//   The rule label and choices come from Question.metadata set by the switching
//   generator at lib/games/switching/generator.ts.
// DEPENDENCIES: lib/types.ts — Question type
// DEPENDENTS: app/session/sprint-view.tsx — renders this for switching game type
// INPUT: Keys 1-2 select the corresponding choice (left/right)
// METADATA: { rule: SwitchingRuleType, choices: [string, string] }
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'
import { RULE_LABELS } from '@/lib/games/switching/constants'
import type { SwitchingRuleType } from '@/lib/games/switching/constants'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type SwitchingInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

export function SwitchingInput({ question, onSubmit, feedback }: SwitchingInputProps) {
  const rule = (question.metadata?.rule as SwitchingRuleType) ?? 'odd-even'
  const choices = (question.metadata?.choices as [string, string]) ?? ['odd', 'even']

  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // Keys 1-2 map to choices[0] and choices[1]
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
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Rule label — tells the player which classification rule is active */}
      <div className="text-sm font-medium text-accent-switching uppercase tracking-widest">
        {RULE_LABELS[rule]}
      </div>

      {/* The number to classify — large and prominent */}
      <div className="text-[64px] font-light font-mono text-text-primary select-none">
        {question.prompt}
      </div>

      {/* Feedback indicator */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* Two choice buttons */}
      <div className="flex gap-4">
        {choices.map((choice, i) => {
          let borderClass = 'border-border'
          if (feedback) {
            if (choice === question.answer) borderClass = 'border-positive'
            else if (!feedback.correct && choice !== question.answer) borderClass = 'border-negative'
          }

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={!!feedback}
              className={`px-6 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-switching disabled:cursor-default min-w-[100px]`}
            >
              <div className="text-sm font-medium text-text-primary capitalize">{choice}</div>
              <span className="text-xs text-text-hint font-mono">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire switching into sprint-view.tsx**

In `app/session/sprint-view.tsx`, add the import and rendering branch:

Add import at top:
```typescript
import { SwitchingInput } from './switching-input'
```

Add after the spatial input branch in the JSX:
```tsx
{gameType === 'switching' && (
  <SwitchingInput question={question} onSubmit={onAnswer} feedback={feedback} />
)}
```

Add keyboard hint:
```tsx
{gameType === 'switching' && 'press 1 or 2 to classify'}
```

- [ ] **Step 3: Wire switching into session-view.tsx**

In `app/session/session-view.tsx`:

Add imports:
```typescript
import { generateSwitchingSequence } from '@/lib/games/switching/generator'
import { getSwitchingExpectedTimeMs } from '@/lib/games/switching/constants'
```

Add a BATCH_GENERATORS table after the GENERATORS table:
```typescript
// Batch generators for sequence-dependent games where questions depend on
// each other (e.g., task switching rule patterns, n-back position sequences).
// These return the full question array at once, unlike per-question GENERATORS.
const BATCH_GENERATORS: Record<string, (d: number, count: number) => Question[]> = {
  switching: generateSwitchingSequence,
}
```

Update `generateQuestions` to check batch generators first:
```typescript
function generateQuestions(gameType: GameType, difficulty: number, count: number): Question[] {
  // Use batch generator for sequence-dependent games
  if (BATCH_GENERATORS[gameType]) {
    return BATCH_GENERATORS[gameType](difficulty, count)
  }
  // Per-question generation for independent games
  const prompts = new Set<string>()
  const questions: Question[] = []
  const generate = GENERATORS[gameType]
  for (let i = 0; i < count; i++) {
    const q = generate(difficulty, prompts)
    prompts.add(q.prompt)
    questions.push(q)
  }
  return questions
}
```

Add to EXPECTED_TIME_FNS:
```typescript
const EXPECTED_TIME_FNS: Record<string, (d: number) => number> = {
  math: getMathExpectedTimeMs,
  stroop: getStroopExpectedTimeMs,
  spatial: getSpatialExpectedTimeMs,
  switching: getSwitchingExpectedTimeMs,
}
```

Add 'switching' to ACTIVE_GAMES:
```typescript
const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial', 'switching']
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
bun run test && bun run build
```
Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/session/switching-input.tsx app/session/sprint-view.tsx app/session/session-view.tsx
git commit -m "feat: implement task switching input component and wire into session"
```

---

### Task 4: N-Back — Constants and Generator (TDD)

**Files:**
- Create: `lib/games/nback/constants.ts`
- Create: `lib/games/nback/generator.ts`
- Create: `__tests__/lib/games/nback/generator.test.ts`

- [ ] **Step 1: Create n-back constants**

Create `lib/games/nback/constants.ts`:
```typescript
// =============================================================================
// lib/games/nback/constants.ts — N-Back difficulty level definitions
// =============================================================================
// WHAT: Defines the 8 difficulty levels for the N-Back (Working Memory) game.
//   The player sees positions highlighted on a 3x3 grid in sequence. At each step,
//   they must determine if the CURRENT position matches the one N steps ago.
// ROLE: Configuration data. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/nback/generator.ts
//   - __tests__/lib/games/nback/generator.test.ts
// DIFFICULTY AXES:
//   1. N-level: how many steps back to compare (1 → 3). Higher N = more items
//      to hold in working memory simultaneously.
//   2. Match rate: probability of a match trial (~30-40%). Higher = more "yes"
//      responses needed, preventing the player from defaulting to "no".
// GRID: 9 positions (3x3), numbered 1-9 (top-left to bottom-right).
// =============================================================================

export type NBackLevel = {
  level: number
  name: string
  nLevel: number         // how many steps back to compare (1, 2, or 3)
  matchRate: number      // target probability of match trials (0.0-1.0)
  expectedTimeMs: number
}

// 8 difficulty levels. N increases from 1 to 3, match rate increases slightly.
// 1-back: remember the LAST position. Easy working memory load.
// 2-back: remember TWO steps back. Moderate load.
// 3-back: remember THREE steps back. High load — near human working memory limit.
export const NBACK_LEVELS: NBackLevel[] = [
  { level: 1, name: '1-back, 30% match', nLevel: 1, matchRate: 0.30, expectedTimeMs: 3000 },
  { level: 2, name: '1-back, 35% match', nLevel: 1, matchRate: 0.35, expectedTimeMs: 2500 },
  { level: 3, name: '2-back, 30% match', nLevel: 2, matchRate: 0.30, expectedTimeMs: 3500 },
  { level: 4, name: '2-back, 35% match', nLevel: 2, matchRate: 0.35, expectedTimeMs: 3000 },
  { level: 5, name: '2-back, 40% match', nLevel: 2, matchRate: 0.40, expectedTimeMs: 2500 },
  { level: 6, name: '3-back, 30% match', nLevel: 3, matchRate: 0.30, expectedTimeMs: 3500 },
  { level: 7, name: '3-back, 35% match', nLevel: 3, matchRate: 0.35, expectedTimeMs: 3000 },
  { level: 8, name: '3-back, 40% match', nLevel: 3, matchRate: 0.40, expectedTimeMs: 2500 },
]

export function getNBackExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, NBACK_LEVELS.length))
  return NBACK_LEVELS[clamped - 1].expectedTimeMs
}
```

- [ ] **Step 2: Write failing tests for n-back generator**

Create `__tests__/lib/games/nback/generator.test.ts`:
```typescript
// Tests for: lib/games/nback/generator.ts
// Module: N-Back position sequence generator with 8 difficulty levels
// Key behaviors: sequence generation with controlled match rate, position
// randomization on 3x3 grid, match/no-match answer assignment

import { describe, it, expect } from 'vitest'
import { generateNBackSequence } from '@/lib/games/nback/generator'

describe('generateNBackSequence', () => {
  it('generates the requested number of questions', () => {
    const questions = generateNBackSequence(1, 7)
    expect(questions).toHaveLength(7)
  })

  it('all positions are in range 1-9 (3x3 grid)', () => {
    const questions = generateNBackSequence(1, 7)
    for (const q of questions) {
      const pos = (q.metadata as { gridPosition: number }).gridPosition
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(9)
    }
  })

  it('first N questions are always no-match (not enough history)', () => {
    // 1-back: first 1 question is always no-match
    const q1 = generateNBackSequence(1, 7)
    expect(q1[0].answer).toBe('no-match')

    // 2-back (level 3): first 2 questions are always no-match
    const q2 = generateNBackSequence(3, 7)
    expect(q2[0].answer).toBe('no-match')
    expect(q2[1].answer).toBe('no-match')
  })

  it('produces correct match/no-match answers based on positions', () => {
    const questions = generateNBackSequence(1, 20)
    for (let i = 1; i < questions.length; i++) {
      const currentPos = (questions[i].metadata as { gridPosition: number }).gridPosition
      const prevPos = (questions[i - 1].metadata as { gridPosition: number }).gridPosition
      if (currentPos === prevPos) {
        expect(questions[i].answer).toBe('match')
      } else {
        expect(questions[i].answer).toBe('no-match')
      }
    }
  })

  it('produces some matches over many trials (not all no-match)', () => {
    const questions = generateNBackSequence(1, 50)
    const matches = questions.filter(q => q.answer === 'match').length
    expect(matches).toBeGreaterThan(0)
  })

  it('includes gridPosition and nLevel in metadata', () => {
    const questions = generateNBackSequence(3, 7)
    for (const q of questions) {
      const meta = q.metadata as { gridPosition: number; nLevel: number; stepIndex: number }
      expect(meta.gridPosition).toBeDefined()
      expect(meta.nLevel).toBe(2) // level 3 = 2-back
      expect(typeof meta.stepIndex).toBe('number')
    }
  })

  it('has correct expectedTimeMs', () => {
    expect(generateNBackSequence(1, 5)[0].expectedTimeMs).toBe(3000)
    expect(generateNBackSequence(8, 5)[0].expectedTimeMs).toBe(2500)
  })

  it('clamps difficulty to valid range', () => {
    expect(generateNBackSequence(0, 5)[0].difficulty).toBe(1)
    expect(generateNBackSequence(99, 5)[0].difficulty).toBe(8)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/games/nback/generator.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement n-back generator**

Create `lib/games/nback/generator.ts`:
```typescript
// =============================================================================
// lib/games/nback/generator.ts — N-Back sequence generator for MindForge
// =============================================================================
// WHAT: Generates a sequence of grid positions for the N-Back working memory game.
//   Each question is one step in the sequence. The player must determine if the
//   current position matches the one N steps ago.
// ROLE: Game plugin logic. Pure functions, no side effects.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/nback/constants.ts (NBACK_LEVELS, getNBackExpectedTimeMs)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls via BATCH_GENERATORS)
//   - app/session/nback-input.tsx (reads metadata.gridPosition, metadata.nLevel)
//   - __tests__/lib/games/nback/generator.test.ts
// NOTE: Batch generator — produces the full sequence at once because each
//   question's match/no-match answer depends on the position N steps earlier.
// METADATA SHAPE:
//   { gridPosition: number, nLevel: number, stepIndex: number }
// =============================================================================

import type { Question } from '@/lib/types'
import { NBACK_LEVELS, getNBackExpectedTimeMs } from './constants'

// Random integer in [min, max] inclusive
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a position sequence with controlled match rate.
// For positions after index N, each has matchRate probability of being
// a match (same as N steps ago). Non-match positions are random but
// guaranteed different from the N-back position.
function generatePositionSequence(count: number, n: number, matchRate: number): number[] {
  const positions: number[] = []

  for (let i = 0; i < count; i++) {
    if (i < n) {
      // First N positions have no N-back reference — just random
      positions.push(rand(1, 9))
    } else {
      const nBackPos = positions[i - n]
      if (Math.random() < matchRate) {
        // Match: reuse the position from N steps ago
        positions.push(nBackPos)
      } else {
        // No match: pick a different position
        let pos: number
        do {
          pos = rand(1, 9)
        } while (pos === nBackPos)
        positions.push(pos)
      }
    }
  }

  return positions
}

// Generate the full N-Back sequence for a sprint.
// Returns one Question per step. The answer is 'match' if the current position
// equals the one N steps ago, 'no-match' otherwise. The first N positions
// are always 'no-match' (not enough history to compare).
export function generateNBackSequence(difficulty: number, count: number): Question[] {
  const clamped = Math.max(1, Math.min(difficulty, NBACK_LEVELS.length))
  const level = NBACK_LEVELS[clamped - 1]
  const n = level.nLevel

  // Generate the position sequence with controlled match probability
  const positions = generatePositionSequence(count, n, level.matchRate)

  return positions.map((pos, i) => {
    // Determine if this is a match: current position equals N-back position
    // First N positions can never be matches (no comparison available)
    const isMatch = i >= n && positions[i] === positions[i - n]

    return {
      prompt: String(pos),
      answer: isMatch ? 'match' : 'no-match',
      difficulty: clamped,
      expectedTimeMs: getNBackExpectedTimeMs(clamped),
      metadata: {
        gridPosition: pos,
        nLevel: n,
        stepIndex: i,
      },
    }
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/games/nback/generator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/games/nback/ __tests__/lib/games/nback/
git commit -m "feat: implement n-back game constants and generator with TDD"
```

---

### Task 5: N-Back — Input Component and Wiring

**Files:**
- Create: `app/session/nback-input.tsx`
- Modify: `app/session/sprint-view.tsx`
- Modify: `app/session/session-view.tsx`

- [ ] **Step 1: Create n-back input component**

Create `app/session/nback-input.tsx`:
```tsx
// ============================================================================
// app/session/nback-input.tsx — N-Back Grid Input Component
// ============================================================================
// PURPOSE: Renders a 3x3 grid with one cell highlighted (current position).
//   The player presses F (match — current position same as N steps ago) or
//   J (no match — different position). Trains working memory.
// ARCHITECTURE: Client component rendered by SprintView when gameType='nback'.
//   Grid position comes from Question.metadata.gridPosition (1-9).
// DEPENDENCIES: lib/types.ts — Question type
// DEPENDENTS: app/session/sprint-view.tsx
// INPUT: F = match, J = no-match
// METADATA: { gridPosition: number, nLevel: number, stepIndex: number }
// ============================================================================

'use client'

import { useEffect, useCallback } from 'react'
import type { Question } from '@/lib/types'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type NBackInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

export function NBackInput({ question, onSubmit, feedback }: NBackInputProps) {
  const gridPosition = (question.metadata?.gridPosition as number) ?? 1
  const nLevel = (question.metadata?.nLevel as number) ?? 1

  const handleChoice = useCallback(
    (choice: string) => {
      if (feedback) return
      onSubmit(choice)
    },
    [onSubmit, feedback],
  )

  // F = match, J = no-match
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (feedback) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        handleChoice('match')
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        handleChoice('no-match')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, feedback])

  // Accent color for n-back: violet
  const accentColor = '#8b5cf6'

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* N-level indicator */}
      <div className="text-sm font-medium text-accent-nback uppercase tracking-widest">
        {nLevel}-Back
      </div>

      {/* 3x3 grid — positions numbered 1-9, active position highlighted */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => {
          const pos = i + 1 // positions are 1-indexed
          const isActive = pos === gridPosition
          return (
            <div
              key={pos}
              className={`w-16 h-16 rounded-lg border-2 transition-colors duration-100 ${
                isActive
                  ? 'border-accent-nback bg-accent-nback/20'
                  : 'border-border bg-card'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}20` } : undefined}
            />
          )
        })}
      </div>

      {/* Feedback indicator */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — ${feedback.correctAnswer}`}
        </div>
      )}

      {/* Choice buttons */}
      <div className="flex gap-4">
        {(['match', 'no-match'] as const).map((choice) => {
          let borderClass = 'border-border'
          if (feedback) {
            if (choice === question.answer) borderClass = 'border-positive'
            else if (!feedback.correct && choice !== question.answer) borderClass = 'border-negative'
          }

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={!!feedback}
              className={`px-5 py-3 rounded-xl border-2 ${borderClass} transition-colors hover:border-accent-nback disabled:cursor-default`}
            >
              <div className="text-sm font-medium text-text-primary capitalize">{choice === 'no-match' ? 'No Match' : 'Match'}</div>
              <span className="text-xs text-text-hint font-mono">{choice === 'match' ? 'F' : 'J'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire n-back into sprint-view.tsx**

Add import:
```typescript
import { NBackInput } from './nback-input'
```

Add rendering branch:
```tsx
{gameType === 'nback' && (
  <NBackInput question={question} onSubmit={onAnswer} feedback={feedback} />
)}
```

Add keyboard hint:
```tsx
{gameType === 'nback' && 'F = match · J = no match'}
```

- [ ] **Step 3: Wire n-back into session-view.tsx**

Add imports:
```typescript
import { generateNBackSequence } from '@/lib/games/nback/generator'
import { getNBackExpectedTimeMs } from '@/lib/games/nback/constants'
```

Add to BATCH_GENERATORS:
```typescript
const BATCH_GENERATORS: Record<string, (d: number, count: number) => Question[]> = {
  switching: generateSwitchingSequence,
  nback: generateNBackSequence,
}
```

Add to EXPECTED_TIME_FNS:
```typescript
nback: getNBackExpectedTimeMs,
```

Add to ACTIVE_GAMES:
```typescript
const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback']
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
bun run test && bun run build
```
Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/session/nback-input.tsx app/session/sprint-view.tsx app/session/session-view.tsx
git commit -m "feat: implement n-back input component and wire into session"
```

---

### Task 6: Speed of Processing — Constants and Generator (TDD)

**Files:**
- Create: `lib/games/speed/constants.ts`
- Create: `lib/games/speed/generator.ts`
- Create: `__tests__/lib/games/speed/generator.test.ts`

- [ ] **Step 1: Create speed constants**

Create `lib/games/speed/constants.ts`:
```typescript
// =============================================================================
// lib/games/speed/constants.ts — Speed of Processing difficulty level definitions
// =============================================================================
// WHAT: Defines 8 difficulty levels for the Speed of Processing game (UFOV-style).
//   A target is briefly flashed at a peripheral position. The player must identify
//   WHERE it appeared. This is the most evidence-backed cognitive training
//   intervention (ACTIVE study: 29% dementia risk reduction at 20 years).
// ROLE: Configuration data. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/speed/generator.ts
//   - __tests__/lib/games/speed/generator.test.ts
// DIFFICULTY AXES:
//   1. Position count: 4 → 8 possible target locations
//   2. Flash duration: 500ms → 50ms (how long the target is visible)
//   Shorter flash + more positions = harder to identify location
// =============================================================================

export type SpeedLevel = {
  level: number
  name: string
  positionCount: number      // 4 or 8 possible target positions
  flashDurationMs: number    // how long the target is shown (decreasing = harder)
  expectedTimeMs: number
}

// 8 levels from easy (half-second flash, 4 positions) to hard (50ms flash, 8 positions)
export const SPEED_LEVELS: SpeedLevel[] = [
  { level: 1, name: '4 positions, 500ms flash', positionCount: 4, flashDurationMs: 500, expectedTimeMs: 2000 },
  { level: 2, name: '4 positions, 300ms flash', positionCount: 4, flashDurationMs: 300, expectedTimeMs: 2000 },
  { level: 3, name: '4 positions, 200ms flash', positionCount: 4, flashDurationMs: 200, expectedTimeMs: 2000 },
  { level: 4, name: '8 positions, 300ms flash', positionCount: 8, flashDurationMs: 300, expectedTimeMs: 2500 },
  { level: 5, name: '8 positions, 200ms flash', positionCount: 8, flashDurationMs: 200, expectedTimeMs: 2500 },
  { level: 6, name: '8 positions, 150ms flash', positionCount: 8, flashDurationMs: 150, expectedTimeMs: 2500 },
  { level: 7, name: '8 positions, 100ms flash', positionCount: 8, flashDurationMs: 100, expectedTimeMs: 3000 },
  { level: 8, name: '8 positions, 50ms flash', positionCount: 8, flashDurationMs: 50, expectedTimeMs: 3000 },
]

export function getSpeedExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, SPEED_LEVELS.length))
  return SPEED_LEVELS[clamped - 1].expectedTimeMs
}
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/lib/games/speed/generator.test.ts`:
```typescript
// Tests for: lib/games/speed/generator.ts
// Module: Speed of processing (UFOV) question generator with 8 difficulty levels
// Key behaviors: target position within valid range, flash duration in metadata,
// position count scaling with difficulty

import { describe, it, expect } from 'vitest'
import { generateSpeedQuestion } from '@/lib/games/speed/generator'

describe('generateSpeedQuestion', () => {
  it('generates a question with target position and metadata', () => {
    const q = generateSpeedQuestion(1)
    expect(q.answer).toMatch(/^[1-4]$/)
    expect(q.metadata).toBeDefined()
    expect((q.metadata as { flashDurationMs: number }).flashDurationMs).toBe(500)
    expect((q.metadata as { positionCount: number }).positionCount).toBe(4)
  })

  it('target position is within positionCount range at level 1 (4 positions)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateSpeedQuestion(1)
      const pos = parseInt(q.answer)
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(4)
    }
  })

  it('target position is within positionCount range at level 5 (8 positions)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateSpeedQuestion(5)
      const pos = parseInt(q.answer)
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(8)
    }
  })

  it('flash duration decreases with difficulty', () => {
    const q1 = generateSpeedQuestion(1)
    const q8 = generateSpeedQuestion(8)
    const flash1 = (q1.metadata as { flashDurationMs: number }).flashDurationMs
    const flash8 = (q8.metadata as { flashDurationMs: number }).flashDurationMs
    expect(flash1).toBeGreaterThan(flash8)
  })

  it('has correct expectedTimeMs', () => {
    expect(generateSpeedQuestion(1).expectedTimeMs).toBe(2000)
    expect(generateSpeedQuestion(8).expectedTimeMs).toBe(3000)
  })

  it('clamps difficulty to valid range', () => {
    expect(generateSpeedQuestion(0).difficulty).toBe(1)
    expect(generateSpeedQuestion(99).difficulty).toBe(8)
  })

  it('avoids duplicate positions when existingPrompts provided', () => {
    const existing = new Set<string>()
    const questions = []
    for (let i = 0; i < 4; i++) {
      const q = generateSpeedQuestion(1, existing)
      existing.add(q.prompt)
      questions.push(q.prompt)
    }
    const unique = new Set(questions)
    expect(unique.size).toBe(questions.length)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/games/speed/generator.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement speed generator**

Create `lib/games/speed/generator.ts`:
```typescript
// =============================================================================
// lib/games/speed/generator.ts — Speed of Processing question generator
// =============================================================================
// WHAT: Generates UFOV-style speed of processing questions. A target appears
//   briefly at one of N peripheral positions. The player must identify which
//   position the target appeared at.
// ROLE: Game plugin logic. Pure functions, no side effects.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/speed/constants.ts (SPEED_LEVELS, getSpeedExpectedTimeMs)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls via GENERATORS)
//   - app/session/speed-input.tsx (reads metadata for flash timing + positions)
//   - __tests__/lib/games/speed/generator.test.ts
// NOTE: This is a per-question generator (not batch) — each question is independent.
// METADATA SHAPE:
//   { targetPosition: number, positionCount: number, flashDurationMs: number }
// =============================================================================

import type { Question } from '@/lib/types'
import { SPEED_LEVELS, getSpeedExpectedTimeMs } from './constants'

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a single speed of processing question.
// The target appears at a random position (1 to positionCount).
// The input component handles the timed flash display.
export function generateSpeedQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  const clamped = Math.max(1, Math.min(difficulty, SPEED_LEVELS.length))
  const level = SPEED_LEVELS[clamped - 1]

  let targetPosition: number
  let attempts = 0

  do {
    targetPosition = rand(1, level.positionCount)
    attempts++
  } while (existingPrompts?.has(String(targetPosition)) && attempts < 50)

  return {
    prompt: String(targetPosition),
    answer: String(targetPosition),
    difficulty: clamped,
    expectedTimeMs: getSpeedExpectedTimeMs(clamped),
    metadata: {
      targetPosition,
      positionCount: level.positionCount,
      flashDurationMs: level.flashDurationMs,
    },
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/games/speed/generator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/games/speed/ __tests__/lib/games/speed/
git commit -m "feat: implement speed of processing constants and generator with TDD"
```

---

### Task 7: Speed of Processing — Input Component and Wiring

**Files:**
- Create: `app/session/speed-input.tsx`
- Modify: `app/session/sprint-view.tsx`
- Modify: `app/session/session-view.tsx`

- [ ] **Step 1: Create speed input component**

Create `app/session/speed-input.tsx`:
```tsx
// ============================================================================
// app/session/speed-input.tsx — Speed of Processing Input Component
// ============================================================================
// PURPOSE: Renders the UFOV-style speed of processing task. Shows a fixation
//   cross, briefly flashes a target at a peripheral position, then shows
//   numbered positions for the player to identify where the target appeared.
// ARCHITECTURE: Client component with an internal state machine:
//   'fixation' (500ms) → 'flash' (variable duration) → 'respond' (wait for input)
//   The timed phases use setTimeout, NOT the feedback system from session-view.
// DEPENDENCIES: lib/types.ts — Question type
// DEPENDENTS: app/session/sprint-view.tsx
// INPUT: Keys 1-4 (4 positions) or 1-8 (8 positions)
// METADATA: { targetPosition: number, positionCount: number, flashDurationMs: number }
// ============================================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Question } from '@/lib/types'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type SpeedInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

// Phase of the speed task's internal state machine
type SpeedPhase = 'fixation' | 'flash' | 'respond'

// Positions arranged in a circle around center.
// 4-position mode: top, right, bottom, left (like compass points)
// 8-position mode: N, NE, E, SE, S, SW, W, NW
const POSITION_ANGLES_4 = [270, 0, 90, 180] // degrees from east, starting from top
const POSITION_ANGLES_8 = [270, 315, 0, 45, 90, 135, 180, 225]

function getPositionStyle(index: number, count: number): { top: string; left: string } {
  const angles = count <= 4 ? POSITION_ANGLES_4 : POSITION_ANGLES_8
  const angle = (angles[index] * Math.PI) / 180
  // Radius in percentage of container (center is 50%, 50%)
  const radius = 38
  const x = 50 + radius * Math.cos(angle)
  const y = 50 + radius * Math.sin(angle)
  return { top: `${y}%`, left: `${x}%` }
}

export function SpeedInput({ question, onSubmit, feedback }: SpeedInputProps) {
  const targetPosition = (question.metadata?.targetPosition as number) ?? 1
  const positionCount = (question.metadata?.positionCount as number) ?? 4
  const flashDurationMs = (question.metadata?.flashDurationMs as number) ?? 300

  // Internal phase state machine: fixation → flash → respond
  const [phase, setPhase] = useState<SpeedPhase>('fixation')
  const phaseRef = useRef<SpeedPhase>('fixation')

  // Reset phase when question changes
  useEffect(() => {
    setPhase('fixation')
    phaseRef.current = 'fixation'

    // Fixation phase: 500ms
    const fixationTimer = setTimeout(() => {
      setPhase('flash')
      phaseRef.current = 'flash'

      // Flash phase: variable duration based on difficulty
      const flashTimer = setTimeout(() => {
        setPhase('respond')
        phaseRef.current = 'respond'
      }, flashDurationMs)

      return () => clearTimeout(flashTimer)
    }, 500)

    return () => clearTimeout(fixationTimer)
  }, [question, flashDurationMs])

  const handleChoice = useCallback(
    (position: number) => {
      if (feedback || phaseRef.current !== 'respond') return
      onSubmit(String(position))
    },
    [onSubmit, feedback],
  )

  // Keyboard input: 1-N for position selection (only during respond phase)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (feedback || phaseRef.current !== 'respond') return
      const idx = parseInt(e.key)
      if (idx >= 1 && idx <= positionCount) {
        e.preventDefault()
        handleChoice(idx)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleChoice, positionCount, feedback])

  const accentColor = '#10b981' // emerald

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Circular field with positions arranged around center */}
      <div className="relative w-[280px] h-[280px]">
        {/* Center fixation cross — always visible */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-text-hint select-none">
          +
        </div>

        {/* Position markers */}
        {Array.from({ length: positionCount }, (_, i) => {
          const pos = i + 1
          const style = getPositionStyle(i, positionCount)
          const isTarget = pos === targetPosition
          // During flash phase, show the target. During respond, show numbered positions.
          const showTarget = phase === 'flash' && isTarget
          const showNumber = phase === 'respond'

          return (
            <div
              key={pos}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: style.top, left: style.left }}
            >
              {showTarget && (
                // Target indicator — filled circle in accent color
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              )}
              {showNumber && (
                <button
                  onClick={() => handleChoice(pos)}
                  disabled={!!feedback}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                    feedback
                      ? pos === targetPosition
                        ? 'border-positive bg-positive/20'
                        : pos === parseInt(feedback.correctAnswer) && !feedback.correct
                          ? 'border-negative'
                          : 'border-border'
                      : 'border-border hover:border-accent-speed'
                  } disabled:cursor-default`}
                >
                  <span className="text-xs font-mono text-text-secondary">{pos}</span>
                </button>
              )}
              {phase === 'fixation' && (
                // During fixation, show empty circles as placeholders
                <div className="w-10 h-10 rounded-full border-2 border-border/50" />
              )}
            </div>
          )
        })}
      </div>

      {/* Phase indicator */}
      {phase === 'fixation' && (
        <div className="text-sm text-text-hint">Focus on the center...</div>
      )}
      {phase === 'flash' && (
        <div className="text-sm text-accent-speed">Watch!</div>
      )}

      {/* Feedback indicator */}
      {feedback && (
        <div className={`text-sm font-medium ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
          {feedback.correct ? 'Correct' : `Incorrect — position ${feedback.correctAnswer}`}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire speed into sprint-view.tsx**

Add import:
```typescript
import { SpeedInput } from './speed-input'
```

Add rendering branch:
```tsx
{gameType === 'speed' && (
  <SpeedInput question={question} onSubmit={onAnswer} feedback={feedback} />
)}
```

Add keyboard hint:
```tsx
{gameType === 'speed' && 'identify where the target appeared'}
```

- [ ] **Step 3: Wire speed into session-view.tsx**

Add imports:
```typescript
import { generateSpeedQuestion } from '@/lib/games/speed/generator'
import { getSpeedExpectedTimeMs } from '@/lib/games/speed/constants'
```

Add to GENERATORS (NOT BATCH_GENERATORS — speed questions are independent):
```typescript
const GENERATORS: Record<string, (d: number, p?: Set<string>) => Question> = {
  math: generateMathQuestion,
  stroop: generateStroopQuestion,
  spatial: generateSpatialQuestion,
  speed: generateSpeedQuestion,
}
```

Add to EXPECTED_TIME_FNS:
```typescript
speed: getSpeedExpectedTimeMs,
```

Add to ACTIVE_GAMES:
```typescript
const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback', 'speed']
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
bun run test && bun run build
```
Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/session/speed-input.tsx app/session/sprint-view.tsx app/session/session-view.tsx
git commit -m "feat: implement speed of processing input component and wire into session"
```

---

### Task 8: Memory — Constants and Generator (TDD)

**Files:**
- Create: `lib/games/memory/constants.ts`
- Create: `lib/games/memory/generator.ts`
- Create: `__tests__/lib/games/memory/generator.test.ts`

- [ ] **Step 1: Create memory constants**

Create `lib/games/memory/constants.ts`:
```typescript
// =============================================================================
// lib/games/memory/constants.ts — Memory (Digit Span) difficulty level definitions
// =============================================================================
// WHAT: Defines 8 difficulty levels for the Memory game (digit span recall).
//   A sequence of digits is displayed briefly, then the player must type them
//   back from memory. Tests short-term and working memory capacity.
// ROLE: Configuration data. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/memory/generator.ts
//   - __tests__/lib/games/memory/generator.test.ts
// DIFFICULTY AXES:
//   1. Sequence length: 3 → 8 digits. Average human digit span is ~7.
//   2. Display duration: how long the sequence is visible (shorter = harder)
// =============================================================================

export type MemoryLevel = {
  level: number
  name: string
  sequenceLength: number      // how many digits to memorize
  displayDurationMs: number   // how long the sequence is shown
  expectedTimeMs: number      // expected total time (display + recall)
}

// 8 levels. Sequence length increases, display duration decreases.
export const MEMORY_LEVELS: MemoryLevel[] = [
  { level: 1, name: '3 digits, 3s display', sequenceLength: 3, displayDurationMs: 3000, expectedTimeMs: 5000 },
  { level: 2, name: '4 digits, 3s display', sequenceLength: 4, displayDurationMs: 3000, expectedTimeMs: 6000 },
  { level: 3, name: '4 digits, 2s display', sequenceLength: 4, displayDurationMs: 2000, expectedTimeMs: 5000 },
  { level: 4, name: '5 digits, 3s display', sequenceLength: 5, displayDurationMs: 3000, expectedTimeMs: 7000 },
  { level: 5, name: '5 digits, 2s display', sequenceLength: 5, displayDurationMs: 2000, expectedTimeMs: 6000 },
  { level: 6, name: '6 digits, 2.5s display', sequenceLength: 6, displayDurationMs: 2500, expectedTimeMs: 7000 },
  { level: 7, name: '7 digits, 2.5s display', sequenceLength: 7, displayDurationMs: 2500, expectedTimeMs: 8000 },
  { level: 8, name: '8 digits, 2s display', sequenceLength: 8, displayDurationMs: 2000, expectedTimeMs: 9000 },
]

export function getMemoryExpectedTimeMs(difficulty: number): number {
  const clamped = Math.max(1, Math.min(difficulty, MEMORY_LEVELS.length))
  return MEMORY_LEVELS[clamped - 1].expectedTimeMs
}
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/lib/games/memory/generator.test.ts`:
```typescript
// Tests for: lib/games/memory/generator.ts
// Module: Memory (digit span) sequence generator with 8 difficulty levels
// Key behaviors: random digit sequence generation, length scaling with difficulty,
// display duration in metadata, typed answer format

import { describe, it, expect } from 'vitest'
import { generateMemorySequence } from '@/lib/games/memory/generator'

describe('generateMemorySequence', () => {
  it('generates the requested number of questions', () => {
    const questions = generateMemorySequence(1, 5)
    expect(questions).toHaveLength(5)
  })

  it('each question has a digit sequence of correct length', () => {
    const questions = generateMemorySequence(1, 5)
    for (const q of questions) {
      const seq = (q.metadata as { sequence: number[] }).sequence
      expect(seq).toHaveLength(3) // level 1 = 3 digits
    }
  })

  it('sequence length increases with difficulty', () => {
    const q1 = generateMemorySequence(1, 1)
    const q8 = generateMemorySequence(8, 1)
    const len1 = (q1[0].metadata as { sequence: number[] }).sequence.length
    const len8 = (q8[0].metadata as { sequence: number[] }).sequence.length
    expect(len8).toBeGreaterThan(len1)
  })

  it('answer is the sequence digits joined without spaces', () => {
    const questions = generateMemorySequence(1, 10)
    for (const q of questions) {
      const seq = (q.metadata as { sequence: number[] }).sequence
      expect(q.answer).toBe(seq.join(''))
    }
  })

  it('prompt shows digits separated by spaces for readability', () => {
    const questions = generateMemorySequence(1, 5)
    for (const q of questions) {
      const seq = (q.metadata as { sequence: number[] }).sequence
      expect(q.prompt).toBe(seq.join(' '))
    }
  })

  it('digits are in range 0-9', () => {
    const questions = generateMemorySequence(4, 20)
    for (const q of questions) {
      const seq = (q.metadata as { sequence: number[] }).sequence
      for (const d of seq) {
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThanOrEqual(9)
      }
    }
  })

  it('includes displayDurationMs in metadata', () => {
    const questions = generateMemorySequence(1, 1)
    expect((questions[0].metadata as { displayDurationMs: number }).displayDurationMs).toBe(3000)
  })

  it('generates unique sequences within a batch (no duplicates)', () => {
    const questions = generateMemorySequence(1, 5)
    const prompts = questions.map(q => q.prompt)
    const unique = new Set(prompts)
    expect(unique.size).toBe(prompts.length)
  })

  it('has correct expectedTimeMs', () => {
    expect(generateMemorySequence(1, 1)[0].expectedTimeMs).toBe(5000)
    expect(generateMemorySequence(8, 1)[0].expectedTimeMs).toBe(9000)
  })

  it('clamps difficulty to valid range', () => {
    expect(generateMemorySequence(0, 1)[0].difficulty).toBe(1)
    expect(generateMemorySequence(99, 1)[0].difficulty).toBe(8)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/games/memory/generator.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement memory generator**

Create `lib/games/memory/generator.ts`:
```typescript
// =============================================================================
// lib/games/memory/generator.ts — Memory (Digit Span) sequence generator
// =============================================================================
// WHAT: Generates digit sequences for the memory game. Each question shows a
//   sequence of random digits briefly, then the player types them back from
//   memory. Tests short-term memory capacity (digit span).
// ROLE: Game plugin logic. Pure functions, no side effects.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/memory/constants.ts (MEMORY_LEVELS, getMemoryExpectedTimeMs)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls via BATCH_GENERATORS)
//   - app/session/memory-input.tsx (reads metadata.sequence, metadata.displayDurationMs)
//   - __tests__/lib/games/memory/generator.test.ts
// NOTE: Batch generator — generates unique sequences for the sprint to avoid
//   duplicate memorization tasks.
// METADATA SHAPE:
//   { sequence: number[], displayDurationMs: number }
// =============================================================================

import type { Question } from '@/lib/types'
import { MEMORY_LEVELS, getMemoryExpectedTimeMs } from './constants'

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a random digit sequence of the given length.
// Digits are 0-9. No restriction on repeats within a sequence (that's part of the challenge).
function generateDigitSequence(length: number): number[] {
  return Array.from({ length }, () => rand(0, 9))
}

// Generate a batch of unique digit span questions for a sprint.
// Each question is a separate sequence to memorize and recall.
export function generateMemorySequence(difficulty: number, count: number): Question[] {
  const clamped = Math.max(1, Math.min(difficulty, MEMORY_LEVELS.length))
  const level = MEMORY_LEVELS[clamped - 1]

  const usedPrompts = new Set<string>()
  const questions: Question[] = []

  for (let i = 0; i < count; i++) {
    let sequence: number[]
    let prompt: string
    let attempts = 0

    // Generate unique sequences (avoid duplicates within the sprint)
    do {
      sequence = generateDigitSequence(level.sequenceLength)
      prompt = sequence.join(' ')
      attempts++
    } while (usedPrompts.has(prompt) && attempts < 50)

    usedPrompts.add(prompt)

    questions.push({
      // Prompt: digits separated by spaces (displayed during memorization phase)
      prompt,
      // Answer: digits joined without spaces (what the player types)
      answer: sequence.join(''),
      difficulty: clamped,
      expectedTimeMs: getMemoryExpectedTimeMs(clamped),
      metadata: {
        sequence,
        displayDurationMs: level.displayDurationMs,
      },
    })
  }

  return questions
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/games/memory/generator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/games/memory/ __tests__/lib/games/memory/
git commit -m "feat: implement memory (digit span) constants and generator with TDD"
```

---

### Task 9: Memory — Input Component and Wiring

**Files:**
- Create: `app/session/memory-input.tsx`
- Modify: `app/session/sprint-view.tsx`
- Modify: `app/session/session-view.tsx`

- [ ] **Step 1: Create memory input component**

Create `app/session/memory-input.tsx`:
```tsx
// ============================================================================
// app/session/memory-input.tsx — Memory (Digit Span) Input Component
// ============================================================================
// PURPOSE: Renders the memory task in two phases:
//   1. Display phase: shows the digit sequence for a timed duration
//   2. Recall phase: user types the sequence from memory
//   Uses the same keyboard input pattern as math (digits + backspace + enter).
// ARCHITECTURE: Client component with internal phase state machine:
//   'display' (timed) → 'recall' (wait for input)
// DEPENDENCIES: lib/types.ts — Question type
// DEPENDENTS: app/session/sprint-view.tsx
// INPUT: Digit keys (0-9), Backspace, Enter to submit
// METADATA: { sequence: number[], displayDurationMs: number }
// ============================================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Question } from '@/lib/types'

type FeedbackState = {
  correct: boolean
  correctAnswer: string
} | null

type MemoryInputProps = {
  question: Question
  onSubmit: (answer: string) => void
  feedback: FeedbackState
}

type MemoryPhase = 'display' | 'recall'

export function MemoryInput({ question, onSubmit, feedback }: MemoryInputProps) {
  const sequence = (question.metadata?.sequence as number[]) ?? []
  const displayDurationMs = (question.metadata?.displayDurationMs as number) ?? 3000

  const [phase, setPhase] = useState<MemoryPhase>('display')
  const [value, setValue] = useState('')
  const phaseRef = useRef<MemoryPhase>('display')

  // Reset phase and value when question changes
  useEffect(() => {
    setPhase('display')
    phaseRef.current = 'display'
    setValue('')

    // After display duration, switch to recall phase
    const timer = setTimeout(() => {
      setPhase('recall')
      phaseRef.current = 'recall'
    }, displayDurationMs)

    return () => clearTimeout(timer)
  }, [question, displayDurationMs])

  const handleSubmit = useCallback(() => {
    if (value.trim() === '' || feedback || phaseRef.current !== 'recall') return
    onSubmit(value)
  }, [value, onSubmit, feedback])

  // Keyboard input for recall phase (same pattern as math-input.tsx)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (feedback || phaseRef.current !== 'recall') return
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
        return
      }
      if (e.key === 'Backspace') {
        setValue(v => v.slice(0, -1))
        return
      }
      if (/^\d$/.test(e.key)) {
        setValue(v => v + e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit, feedback])

  const accentColor = 'text-accent-memory'

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {phase === 'display' ? (
        // Display phase: show the sequence prominently
        <>
          <div className="text-sm font-medium text-accent-memory uppercase tracking-widest">
            Memorize
          </div>
          <div className="text-[48px] font-light font-mono tracking-[0.3em] text-text-primary select-none">
            {sequence.join(' ')}
          </div>
          {/* Progress bar for display time */}
          <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-memory rounded-full"
              style={{
                animation: `shrink ${displayDurationMs}ms linear forwards`,
              }}
            />
          </div>
          <style>{`
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </>
      ) : (
        // Recall phase: type the sequence from memory
        <>
          <div className="text-sm font-medium text-accent-memory uppercase tracking-widest">
            Recall
          </div>
          <div className="text-right font-mono min-w-[160px]">
            <div className={`border-t-2 pt-3 ${feedback ? (feedback.correct ? 'border-positive' : 'border-negative') : 'border-border'}`}>
              {feedback ? (
                <div className="flex items-center justify-end gap-3">
                  <span className={`text-[40px] font-normal tracking-[0.2em] ${feedback.correct ? 'text-positive' : 'text-negative'}`}>
                    {value}
                  </span>
                  {!feedback.correct && (
                    <span className="text-lg text-text-hint">
                      {feedback.correctAnswer}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[40px] font-normal tracking-[0.2em] text-accent-memory">
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
```

- [ ] **Step 2: Wire memory into sprint-view.tsx**

Add import:
```typescript
import { MemoryInput } from './memory-input'
```

Add rendering branch:
```tsx
{gameType === 'memory' && (
  <MemoryInput question={question} onSubmit={onAnswer} feedback={feedback} />
)}
```

Add keyboard hint:
```tsx
{gameType === 'memory' && 'memorize the sequence · type it back'}
```

- [ ] **Step 3: Wire memory into session-view.tsx**

Add imports:
```typescript
import { generateMemorySequence } from '@/lib/games/memory/generator'
import { getMemoryExpectedTimeMs } from '@/lib/games/memory/constants'
```

Add to BATCH_GENERATORS:
```typescript
const BATCH_GENERATORS: Record<string, (d: number, count: number) => Question[]> = {
  switching: generateSwitchingSequence,
  nback: generateNBackSequence,
  memory: generateMemorySequence,
}
```

Add to EXPECTED_TIME_FNS:
```typescript
memory: getMemoryExpectedTimeMs,
```

Add to ACTIVE_GAMES:
```typescript
const ACTIVE_GAMES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback', 'speed', 'memory']
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
bun run test && bun run build
```
Expected: all tests PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/session/memory-input.tsx app/session/sprint-view.tsx app/session/session-view.tsx
git commit -m "feat: implement memory (digit span) input component and wire into session"
```

---

### Task 10: Streak System (TDD)

**Files:**
- Create: `lib/streak.ts`
- Create: `__tests__/lib/streak.test.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write failing tests for streak system**

Create `__tests__/lib/streak.test.ts`:
```typescript
// Tests for: lib/streak.ts
// Module: Streak calculation for daily retention
// Key behaviors: count consecutive days with at least one sprint,
// detect if today's streak is active, find longest streak in history

import { describe, it, expect } from 'vitest'
import { calculateStreak } from '@/lib/streak'
import type { SprintResult } from '@/lib/types'

function makeResult(daysAgo: number): SprintResult {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(12, 0, 0, 0)
  return {
    gameType: 'math',
    difficulty: 1,
    questionCount: 5,
    correctCount: 4,
    avgResponseTimeMs: 3000,
    ratingBefore: 1000,
    ratingAfter: 1010,
    timestamp: date.toISOString(),
  }
}

describe('calculateStreak', () => {
  it('returns 0 for empty history', () => {
    const result = calculateStreak([])
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
  })

  it('returns 1 if only played today', () => {
    const result = calculateStreak([makeResult(0)])
    expect(result.current).toBe(1)
    expect(result.longest).toBe(1)
  })

  it('counts consecutive days including today', () => {
    const result = calculateStreak([
      makeResult(0), // today
      makeResult(1), // yesterday
      makeResult(2), // 2 days ago
    ])
    expect(result.current).toBe(3)
  })

  it('breaks streak on missing day', () => {
    const result = calculateStreak([
      makeResult(0), // today
      makeResult(1), // yesterday
      // day 2 missing
      makeResult(3), // 3 days ago
      makeResult(4), // 4 days ago
    ])
    expect(result.current).toBe(2) // only today + yesterday
    expect(result.longest).toBe(2) // both streaks are length 2
  })

  it('returns 0 current streak if not played today', () => {
    const result = calculateStreak([
      makeResult(1), // yesterday
      makeResult(2), // 2 days ago
    ])
    expect(result.current).toBe(0)
    expect(result.longest).toBe(2)
  })

  it('handles multiple sessions on the same day', () => {
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    const todayLater = new Date()
    todayLater.setHours(14, 0, 0, 0)

    const result = calculateStreak([
      { ...makeResult(0), timestamp: today.toISOString() },
      { ...makeResult(0), timestamp: todayLater.toISOString() },
      makeResult(1),
    ])
    expect(result.current).toBe(2) // today + yesterday, not 3
  })

  it('tracks longest streak separately from current', () => {
    const result = calculateStreak([
      makeResult(0), // today (current streak = 1)
      // gap
      makeResult(5),
      makeResult(6),
      makeResult(7),
      makeResult(8), // old streak of 4
    ])
    expect(result.current).toBe(1)
    expect(result.longest).toBe(4)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
bun run test __tests__/lib/streak.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement streak system**

Create `lib/streak.ts`:
```typescript
// =============================================================================
// lib/streak.ts — Streak calculation for daily retention
// =============================================================================
// WHAT: Calculates daily play streaks from sprint history. A streak is a count
//   of consecutive calendar days with at least one completed sprint.
// ROLE: Pure logic layer. No React, no storage access.
// DEPENDENCIES: lib/types.ts (SprintResult)
// DEPENDENTS:
//   - app/page.tsx (displays current streak on home screen)
//   - app/stats/stats-view.tsx (displays streak info on analytics page)
// =============================================================================

import type { SprintResult } from './types'

export type StreakInfo = {
  current: number   // current consecutive days (0 if not played today)
  longest: number   // longest streak ever achieved
}

// Convert an ISO timestamp to a date string (YYYY-MM-DD) in local timezone.
// This groups multiple sessions on the same day into one "day played."
function toDateKey(timestamp: string): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Get today's date key for comparison
function todayKey(): string {
  return toDateKey(new Date().toISOString())
}

// Calculate streak info from sprint history.
// Groups results by calendar day, then finds consecutive day sequences.
export function calculateStreak(history: SprintResult[]): StreakInfo {
  if (history.length === 0) return { current: 0, longest: 0 }

  // Get unique days played, sorted newest first
  const daysPlayed = [...new Set(history.map(r => toDateKey(r.timestamp)))].sort().reverse()

  // Find all streaks (consecutive day sequences)
  const streaks: number[] = []
  let currentStreakLength = 1

  for (let i = 1; i < daysPlayed.length; i++) {
    const prev = new Date(daysPlayed[i - 1])
    const curr = new Date(daysPlayed[i])
    // Check if these days are consecutive (1 day apart)
    const diffMs = prev.getTime() - curr.getTime()
    const diffDays = Math.round(diffMs / 86400000)

    if (diffDays === 1) {
      currentStreakLength++
    } else {
      streaks.push(currentStreakLength)
      currentStreakLength = 1
    }
  }
  streaks.push(currentStreakLength)

  // The first streak in the array starts from the most recent day
  const mostRecentDay = daysPlayed[0]
  const today = todayKey()

  // Current streak is only active if the most recent play day is today
  const current = mostRecentDay === today ? streaks[0] : 0

  // Longest is the max of all streaks
  const longest = Math.max(...streaks)

  return { current, longest }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
bun run test __tests__/lib/streak.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Add streak display to home screen**

In `app/page.tsx`, add the streak display. Import the streak function and update the component:

Add import:
```typescript
import { calculateStreak } from '@/lib/streak'
import type { StreakInfo } from '@/lib/streak'
```

Add state for streak:
```typescript
const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0 })
```

In the useEffect that loads player data, also calculate streak:
```typescript
useEffect(() => {
  const storage = new LocalStorageAdapter(window.localStorage)
  setPlayerData(storage.getPlayerData())
  setStreak(calculateStreak(storage.getSessionHistory()))
}, [])
```

Add streak display in the JSX, between the composite rating and per-game ratings:
```tsx
{/* Streak display */}
{streak.current > 0 && (
  <div className="text-center">
    <div className="text-3xl font-light font-mono">{streak.current}</div>
    <div className="text-text-hint text-xs">day streak</div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add lib/streak.ts __tests__/lib/streak.test.ts app/page.tsx
git commit -m "feat: implement streak system with daily tracking and home screen display"
```

---

### Task 11: Analytics Dashboard

**Files:**
- Create: `app/stats/page.tsx`
- Create: `app/stats/stats-view.tsx`
- Modify: `app/page.tsx` (add link to /stats)

- [ ] **Step 1: Create stats server shell**

Create `app/stats/page.tsx`:
```tsx
// ============================================================================
// app/stats/page.tsx — Analytics Dashboard Route (Server Shell)
// ============================================================================
// PURPOSE: Server component shell for the /stats route. Renders the client-side
//   StatsView component which reads from localStorage.
// ============================================================================

import { StatsView } from './stats-view'

export default function StatsPage() {
  return <StatsView />
}
```

- [ ] **Step 2: Create stats client component**

Create `app/stats/stats-view.tsx`:
```tsx
// ============================================================================
// app/stats/stats-view.tsx — Analytics Dashboard Client Component
// ============================================================================
// PURPOSE: Displays player statistics: per-game Elo ratings with weekly deltas,
//   streak info, total sessions, and session history. Super simple, matching
//   the minimal UI aesthetic of the rest of the app.
// DEPENDENCIES:
//   - lib/storage.ts — LocalStorageAdapter
//   - lib/types.ts — PlayerData, GameType, GAME_TYPES, SprintResult
//   - lib/streak.ts — calculateStreak
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocalStorageAdapter } from '@/lib/storage'
import type { PlayerData, GameType, SprintResult } from '@/lib/types'
import { createDefaultPlayerData, GAME_TYPES } from '@/lib/types'
import { calculateStreak } from '@/lib/streak'
import type { StreakInfo } from '@/lib/streak'

const GAME_LABELS: Record<GameType, string> = {
  math: 'Math',
  stroop: 'Stroop',
  spatial: 'Spatial',
  switching: 'Switching',
  nback: 'N-Back',
  speed: 'Speed',
  memory: 'Memory',
}

const GAME_ACCENT_CLASSES: Record<GameType, string> = {
  math: 'bg-accent-math',
  stroop: 'bg-accent-stroop',
  spatial: 'bg-accent-spatial',
  switching: 'bg-accent-switching',
  nback: 'bg-accent-nback',
  speed: 'bg-accent-speed',
  memory: 'bg-accent-memory',
}

export function StatsView() {
  const router = useRouter()
  const [playerData, setPlayerData] = useState<PlayerData>(createDefaultPlayerData())
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0 })
  const [history, setHistory] = useState<SprintResult[]>([])

  useEffect(() => {
    const storage = new LocalStorageAdapter(window.localStorage)
    setPlayerData(storage.getPlayerData())
    const allHistory = storage.getSessionHistory()
    setHistory(allHistory)
    setStreak(calculateStreak(allHistory))
  }, [])

  // Calculate total sessions and total time
  const totalSessions = history.length
  const totalTimeMs = history.reduce((sum, r) => sum + r.avgResponseTimeMs * r.questionCount, 0)
  const totalMinutes = Math.round(totalTimeMs / 60000)

  // Calculate weekly rating changes per game
  const oneWeekAgo = Date.now() - 7 * 86400000
  const weeklyChanges: Record<GameType, number> = {} as Record<GameType, number>
  for (const game of GAME_TYPES) {
    const gameHistory = history.filter(r => r.gameType === game && new Date(r.timestamp).getTime() > oneWeekAgo)
    if (gameHistory.length > 0) {
      weeklyChanges[game] = gameHistory[gameHistory.length - 1].ratingAfter - gameHistory[0].ratingBefore
    } else {
      weeklyChanges[game] = 0
    }
  }

  // Escape to go home
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 p-8 min-h-screen">
      {/* Header */}
      <div className="text-text-secondary text-sm uppercase tracking-widest">
        Statistics
      </div>

      {/* Composite rating */}
      <div className="text-center">
        <div className="text-5xl font-light font-mono">{playerData.compositeRating}</div>
        <div className="text-text-hint text-xs mt-1">composite rating</div>
      </div>

      {/* Streak + totals row */}
      <div className="flex gap-10">
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{streak.current}</div>
          <div className="text-text-hint text-xs">current streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{streak.longest}</div>
          <div className="text-text-hint text-xs">longest streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{totalSessions}</div>
          <div className="text-text-hint text-xs">total sprints</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono">{totalMinutes}m</div>
          <div className="text-text-hint text-xs">total time</div>
        </div>
      </div>

      {/* Per-game ratings with weekly deltas */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {GAME_TYPES.map(game => {
          const delta = weeklyChanges[game]
          const deltaColor = delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-text-hint'
          const deltaPrefix = delta > 0 ? '+' : ''

          return (
            <div key={game} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${GAME_ACCENT_CLASSES[game]}`} />
                <span className="text-text-secondary text-sm">{GAME_LABELS[game]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{playerData.ratings[game]}</span>
                {delta !== 0 && (
                  <span className={`text-xs ${deltaColor}`}>{deltaPrefix}{delta}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation hint */}
      <div className="text-sm text-text-hint">
        press <span className="font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">esc</span> to go back
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add stats link to home screen**

In `app/page.tsx`, add a link to the stats page. Add after the "press enter to start" button:

```tsx
<button
  onClick={() => router.push('/stats')}
  className="text-text-hint text-xs hover:text-text-secondary transition-colors"
>
  view stats
</button>
```

- [ ] **Step 4: Verify build**

Run:
```bash
bun run build
```
Expected: build succeeds with `/`, `/session`, `/stats` routes.

- [ ] **Step 5: Commit**

```bash
git add app/stats/ app/page.tsx
git commit -m "feat: implement analytics dashboard with ratings, streaks, and session stats"
```

---

### Task 12: Final Verification and Cleanup

- [ ] **Step 1: Run full test suite**

Run:
```bash
bun run test
```
Expected: all tests pass (74 existing + new switching + nback + speed + memory + streak tests).

- [ ] **Step 2: Run build**

Run:
```bash
bun run build
```
Expected: build succeeds with all routes: `/`, `/session`, `/stats`.

- [ ] **Step 3: Update CLAUDE.md**

Update the Implementation Status, Architecture Overview, and module inventory in CLAUDE.md to reflect the new game modules, streak system, and analytics dashboard. Update test count. Add the new file paths to the architecture diagram.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "docs: update CLAUDE.md with Phase 1 completion status"
git push origin main
```
