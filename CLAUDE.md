@AGENTS.md

# MindForge — Cognitive Training Web App

## What This Is
A daily-use cognitive training webapp designed to maximize neuroplasticity and mental development. The user sits down, presses start, and is run through an adaptive session of mental exercises that constantly push their limits. Inspired by mathtrainer.ai (sprint-based math) and Elevate (broad cognitive training), but unified into a single continuous flow.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 4 with `@theme` block for custom properties
- **Testing**: Vitest + jsdom (149 unit tests) + Playwright E2E (37 tests)
- **Package Manager**: Bun (never npm)
- **Deployment**: Vercel (GitHub integration, auto-deploy on push to main)

## Architecture Overview

```
lib/                    ← Pure logic layer (no React, fully tested)
  types.ts              ← Core types: GameType (7 games), PlayerData, SprintResult, Question
  ui-types.ts           ← Shared UI types: FeedbackState (used by all input components)
  utils.ts              ← Shared utilities: clampDifficulty, daysSince, eloToDifficulty, difficultyToElo
  registry.ts           ← UNIFIED GAME REGISTRY: single source of truth for all game metadata
  elo.ts                ← Elo rating: expected score, time multiplier, new rating, composite
  difficulty.ts         ← Adaptive difficulty: adjust, smart decay, starting difficulty
  storage.ts            ← StorageAdapter interface + LocalStorageAdapter class
  engine.ts             ← Sprint runner: create, record answer, completion check, summary
  streak.ts             ← Daily streak calculation from session history
  games/
    math/
      constants.ts      ← 13 difficulty levels with expected response times
      generator.ts      ← Question generator per level (deduplication support)
    stroop/
      constants.ts      ← 8 difficulty levels: congruence ratio × color count
      generator.ts      ← Color/word conflict question generator
    spatial/
      constants.ts      ← 8 difficulty levels: vertex count × rotation × mirror
      generator.ts      ← Shape generation, rotation, mirror transforms
    switching/
      constants.ts      ← 8 difficulty levels: rule types × switch frequency
      generator.ts      ← Batch generator for rule-switching sequences
    nback/
      constants.ts      ← 8 difficulty levels: n-level (1-3) × match rate
      generator.ts      ← Batch generator for position sequences with match control
    speed/
      constants.ts      ← 8 difficulty levels: position count × flash duration
      generator.ts      ← Per-question target position generator
    memory/
      constants.ts      ← 8 difficulty levels: sequence length × display duration
      generator.ts      ← Batch generator for digit span sequences

app/                    ← UI layer (React client components)
  globals.css           ← Tailwind theme: surface colors, game accents, fonts
  layout.tsx            ← Root layout with Geist fonts + metadata
  page.tsx              ← Home screen: composite + per-game ratings, streak, Enter to start
  session/
    page.tsx            ← Server shell for /session route
    session-view.tsx    ← Session state machine: playing ↔ reviewing, game rotation
    sprint-view.tsx     ← Active sprint: progress bar, question, dynamic input component
    sprint-complete.tsx ← Between-sprint stats: accuracy, time, per-game rating change
    math-input.tsx      ← Keyboard-driven number input with feedback flash
    stroop-input.tsx    ← 1-N key color selection with colored word display
    spatial-input.tsx   ← SVG shape rendering + 1/2 key same/mirror selection
    switching-input.tsx ← Rule label + number + 1-2 key classification
    nback-input.tsx     ← 3x3 grid + F/J match/no-match input
    speed-input.tsx     ← Timed flash + position selection (fixation → flash → respond)
    memory-input.tsx    ← Display phase + digit typing recall
  stats/
    page.tsx            ← Server shell for /stats route
    stats-view.tsx      ← Analytics: ratings, deltas, streaks, totals

__tests__/              ← Mirrors lib/ structure, Vitest (149 tests)
tests/e2e/              ← Playwright E2E tests (37 tests)
```

### Key Architectural Patterns
- **Unified Game Registry** (`lib/registry.ts`): Single source of truth for ALL game metadata — name, accent color, keyboard hint, generator, expected time function. Adding a new game requires editing only 2 files: the game module itself and one entry in the registry.
- **Shared Utilities** (`lib/utils.ts`): `clampDifficulty()` (NaN-safe level clamping), `daysSince()`, `eloToDifficulty()`, `difficultyToElo()`. Used everywhere, defined once.
- **Shared UI Types** (`lib/ui-types.ts`): `FeedbackState` defined once, imported by all 7 input components + sprint-view + session-view.
- **Pure logic / UI separation**: All game logic in `lib/` is pure functions with zero React dependencies. UI in `app/` is thin wrappers.
- **Interface-based storage**: `StorageAdapter` interface allows swapping localStorage for Supabase without touching game logic.
- **Immutable sprint state**: `recordAnswer()` returns a new Sprint object, no mutation.
- **Dynamic input rendering**: `sprint-view.tsx` uses an `INPUT_COMPONENTS` map for dynamic component selection instead of conditional chains.
- **Two generator modes**: Per-question generators (math, stroop, spatial, speed) vs batch generators (switching, nback, memory) for sequence-dependent games. The registry handles both transparently.

## Core Design Decisions

### Product Thesis
MindForge is the anti-doomscroll. Quick, casual, mechanically addictive — but with genuine intellectual depth. The thing you reach for between Claude prompts, waiting in line, on the couch. 2-3 minute default sessions; 15-20 minutes is what happens when you get hooked.

### Single Continuous Session (not game picker)
- No game selection UI. The app runs a continuous session that rotates through game types.
- Game rotation is active across all 7 games. 60% chance to switch games between sprints.
- When switching games, difficulty recalculates based on the new game's rating and decay.
- Routes: `/` (home — ratings + start), `/session` (continuous play), `/stats` (analytics)

### 7 Active Game Modules
1. **Mental Math** — number typing, arithmetic → calc progression (accent: indigo #6366f1)
2. **Stroop (Attention)** — 1-N key select, color/word conflict (accent: rose #f43f5e)
3. **Spatial Reasoning** — 1-2 key select, mental rotation (accent: cyan #06b6d4)
4. **Task Switching** — 1-2 key select, rule alternation (accent: amber #f59e0b)
5. **N-Back (Working Memory)** — F/J key press, position sequence memory (accent: violet #8b5cf6)
6. **Speed of Processing** — position click, UFOV-style peripheral attention (accent: emerald #10b981)
7. **Memory (Digit Span)** — number typing, sequence memorization and recall (accent: slate #64748b)

### Sprint Structure
- 5-7 questions per sprint (randomized count)
- No duplicate questions within a sprint (generator deduplicates by prompt)
- After submit: correctness feedback (250ms correct / 800ms incorrect) with 150ms fade transition
- Wrong answers show the correct answer beside the input
- Feedback area uses fixed height to prevent layout jitter during rapid play
- Sprint complete screen: accuracy, avg time, Elo change
- Press Enter → next sprint at adjusted difficulty
- Keyboard input is blocked during feedback to prevent accidental submissions

### Adaptive Difficulty System
- Targets 70-85% accuracy (research-backed sweet spot for neuroplasticity)
- Factors in both accuracy AND response time:
  - Fast + accurate = +2 difficulty levels
  - Slow + accurate = +1 (sweet spot)
  - 70-85% accuracy = hold (optimal zone)
  - 50-70% accuracy = -1
  - Below 50% = -2
- Each game defines expected time per difficulty level

### Smart Decay + Warm-up
- Decay: 3% per day off, floor at 50% above baseline (`max(0.5, 1 - days × 0.03)`)
- Warm-up: first 2 sprints start 2 and 1 levels below calculated level respectively
- Daily players get easy on-ramp; returning players get proportionally deeper warm-up

### Elo Rating System
- Standard formula: `R_new = R_old + K × (Score - Expected)`
- K=32 for first 10 sprints, then K=16
- Per-game ratings + composite (equal weight average across all 7 game types)
- Score = accuracy × time multiplier (0.8-1.2 based on speed vs expected)
- Difficulty maps to a rating: `1000 + (level - 1) × 50` (see `difficultyToElo()` in lib/utils.ts)

### Difficulty Progressions

**Math (13 levels):** Single-digit add/sub → double-digit (no carry → carry) → triple-digit → multiplication (tables → mixed → multi-digit) → division → mixed ops → square roots → fractions → algebra. Times: 3s–15s.

**Stroop (8 levels):** Congruence ratio (75% → 15%) × color count (4 → 8). Choices are sorted alphabetically for consistent positioning across the sprint. Times: 1.2s–3s.

**Spatial (8 levels):** Vertex count (4 → 8) × rotation angles (90° only → any) × mirror ratio (25% → 50%). Mirror is present at all levels to avoid "always same" gameplay at low difficulty. Times: 5s–9s.

**Switching (8 levels):** Single rule → two rules with predictable switching → unpredictable → three rules (odd/even, high/low, multiple-of-3). Times: 2s–3s.

**N-Back (8 levels):** N-level (1 → 3) × match rate (30% → 40%). 3x3 grid, F/J input. First N positions are always no-match (warmup). Times: 2.5s–3.5s.

**Speed (8 levels):** Position count (4 → 8) × flash duration (500ms → 50ms). UFOV-style peripheral attention — most evidence-backed cognitive intervention. Times: 2s–3s.

**Memory (8 levels):** Sequence length (3 → 8 digits) × display duration (3s → 2s). Digit span recall — show sequence, then type it back. Times: 5s–9s.

### Streak System
- Daily streak counter on home screen (only shown when > 0)
- Calculated from session history — counts consecutive calendar days with at least one sprint
- Multiple sessions on same day count as 1 day
- Tracks current streak and longest streak ever
- Pure function in `lib/streak.ts`

### UI Design
- Light theme (#fafafa background)
- Minimal — just the question and your answer, nothing else
- Math: centered on screen, numbers right-aligned within block, stacked operand layout
- Keyboard-driven everything: number typing for math/memory, 1-N keys for choice games, F/J for n-back
- Supports `-` for negative answers and `/` for fraction answers
- Complementary accent color per game type
- Monospace font for math (SF Mono / Cascadia Code / Geist Mono)
- Escape key returns to home from any point in a session
- Fixed-height feedback areas prevent layout jitter during rapid play
- Speed game has 3-phase display: fixation → flash → respond
- Memory game has 2-phase display: memorize (with shrinking timer bar) → recall

### Data Model
- `PlayerData`: per-game Elo ratings (7 games), composite rating, last played timestamps, sprint counts
- `SprintResult`: game type, difficulty, question/correct counts, avg time, rating before/after, timestamp
- Storage keys: `mindforge_player` (player data), `mindforge_history` (sprint results array)
- Storage interface: `getPlayerData()`, `saveSprintResult()`, `updateRating()`, `getSessionHistory()`
- All data in localStorage — no backend, no auth (single user for now)

## Implementation Status
- **Phase 1 Complete**: All 7 cognitive game modules built and active.
- **Infrastructure**: Streak system, analytics dashboard (/stats), unified game registry.
- **Architecture refactor**: Eliminated all duplication — unified registry, shared utils, shared UI types.
- **Test coverage**: 149 unit tests (Vitest) + 37 E2E tests (Playwright). Zero console errors.
- **Deployed**: Vercel with GitHub integration (auto-deploy on push to main).

## Docs
- Full design spec: `docs/superpowers/specs/2026-04-08-cognitive-trainer-design.md`
- V2 roadmap spec: `docs/superpowers/specs/2026-04-08-mindforge-roadmap-v2.md`
- Implementation plan (v1): `docs/superpowers/plans/2026-04-08-mindforge-v1.md`
- Implementation plan (Phase 1): `docs/superpowers/plans/2026-04-08-mindforge-phase1.md`
- Research report: `docs/research/cognitive-training-research.md`

## Key Implementation Notes
- All game logic is pure functions with full test coverage (TDD)
- UI components are `'use client'` — Next.js 16 server/client boundary applies
- `params` must be `await`ed in Next.js 16 page components
- Tailwind 4 uses `@theme` block for custom properties (not `theme.extend` in config)
- Tests use Vitest with jsdom environment
- Storage adapter takes `Storage` as constructor arg (injectable for testing)
- Question deduplication uses a `Set<string>` of prompts with up to 50 retry attempts
- `Question.metadata` field carries game-specific structured data (stroop colors, spatial shapes, etc.)
- All difficulty-indexed functions use `clampDifficulty()` from `lib/utils.ts` for NaN safety
- Feedback timing is asymmetric: 250ms for correct, 800ms for incorrect answers
- Adding a new game: create game module in `lib/games/<name>/`, add entry to `lib/registry.ts`, create input component in `app/session/<name>-input.tsx`, add to `INPUT_COMPONENTS` map in `sprint-view.tsx`

## Commenting Standard (MANDATORY)

This codebase is optimized for AI agent navigation. Every file must be heavily commented. When writing or modifying code, always maintain and update comments. This is not optional.

### File Headers (every file)
Every file must start with a block comment explaining:
- What this file does and why it exists
- Its role in the architecture (e.g., "pure logic" vs "UI component")
- Which files depend on it and which files it depends on
- Any non-obvious design decisions specific to this file

### Function-Level Comments (every exported function)
- State the intent: what the function does and WHY it exists
- Document assumptions, preconditions, constraints
- Explain non-obvious parameter choices or return values
- Note edge cases and how they're handled

### Inline Comments
- Explain "why" for non-obvious logic, but also annotate obvious operations for agent context
- More is better — agents benefit from redundant context
- Flag subtle dependencies, gotchas, or workarounds
- Cross-reference other files with full paths when relevant (e.g., "see lib/elo.ts")
- Document magic numbers, thresholds, and timing values with rationale

### Cross-File References
- When mentioning another module, use the full path (e.g., "called by app/session/session-view.tsx")
- Explain the relationship: calls, implements, depends on, used by
- Note which functions are entry points vs internal helpers

### Decision Documentation
- Record design choices and trade-offs inline where they're implemented
- Briefly note rejected alternatives if relevant
- Keep comments updated when decisions change — stale comments are worse than no comments

### Rules
- Use plain `//` comments (not JSDoc `/** */`)
- Keep comments concise but frequent
- When modifying code, always update surrounding comments to reflect the change
- Test files get the same commenting treatment as source files
- Frame comments as instructions to an unfamiliar agent who will follow them literally

## Future — V2 Roadmap (Three Layers)

Full roadmap spec: `docs/superpowers/specs/2026-04-08-mindforge-roadmap-v2.md`
Research backing: `docs/research/cognitive-training-research.md`

### Phase 2: Knowledge Layer (NEXT)
- **Spaced Repetition Engine** (`lib/sr.ts`) — SM-2 based scheduling, per-item mastery tracking
- **Content System** (`lib/content/`) — curated content pools per domain
- **Mixed input modes**: 4-choice recognition for new items, cloze typing for review/mastered items
- **Launch domains**: Mental Models & Cognitive Biases (~100 items), Vocabulary/Language (~100 items), Grammar/Writing (~50 items)
- All domains integrate as regular sprints in the game rotation

### Phase 3: Applied Reasoning
- **Spot the Fallacy** — identify logical fallacies in short arguments
- **Scenario Analysis** — pick which mental model applies to a situation
- **Argument Evaluation** — identify the stronger argument or weakest premise
- **Reading Comprehension** — factual recall → inference → unstated assumptions
- Content references Layer 2 concepts (cross-layer learning)

### Phase 4: Polish & Scale
- More knowledge domains (exam prep: GMAT, LSAT, GRE)
- User-sourced content (add your own SR items)
- Metacognitive reflection prompts
- Session time targets

### Design Principles for Future Work
- **Zero friction**: open app → already in a sprint. No deliberation.
- **2-3 minute default**: 15-20 minutes is what happens when you get hooked.
- **Mechanically crispy**: every interaction must feel immediate and satisfying.
- **Invisible intelligence**: SR engine, difficulty, rotation all invisible to user.
- **All client-side**: localStorage only. No backend, no auth (single user for foreseeable future).
