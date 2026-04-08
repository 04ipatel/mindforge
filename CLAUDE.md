@AGENTS.md

# MindForge — Cognitive Training Web App

## What This Is
A daily-use cognitive training webapp designed to maximize neuroplasticity and mental development. The user sits down, presses start, and is run through an adaptive session of mental exercises that constantly push their limits. Inspired by mathtrainer.ai (sprint-based math) and Elevate (broad cognitive training), but unified into a single continuous flow.

## Core Design Decisions

### Single Continuous Session (not game picker)
- No game selection UI. The app runs a continuous session that rotates through game types.
- Rotation is unpredictable — keeps the player adapting. Not after every sprint, but at varied intervals.
- v1 ships with math only. Other games added sequentially. Rotation activates once 2+ games exist.
- Routes: `/` (home — ratings + start), `/session` (continuous play)

### 5 Game Modules (build order)
1. **Mental Math** — number typing, arithmetic → calc progression (accent: indigo #6366f1)
2. **Stroop (Attention)** — 1-4 key select, color/word conflict (accent: rose #f43f5e)
3. **Spatial Reasoning** — 1-2 key select, mental rotation (accent: cyan #06b6d4)
4. **Task Switching** — 1-4 key select, rule alternation (accent: amber #f59e0b)
5. **N-Back (Working Memory)** — F/J key press, sequence memory (accent: violet #8b5cf6)

### Architecture: Shared Engine + Game Plugins
- **Game Engine** (shared): sprint runner, difficulty engine, Elo system
- **Game Plugins**: each game defines only question generation + input UI
- **Storage Layer**: interface-based. localStorage now, Supabase later. Games never touch storage directly.

### Sprint Structure
- 5-7 questions per sprint
- Instant feedback → next question immediately
- Sprint complete screen: accuracy, avg time, Elo change
- Press Enter → next sprint at adjusted difficulty

### Adaptive Difficulty System
- Targets 70-85% accuracy (research-backed sweet spot for neuroplasticity)
- Factors in both accuracy AND response time:
  - Fast + accurate = bigger difficulty jump
  - Slow + accurate = hold or slight increase (sweet spot)
  - Fast + inaccurate = rushing, hold or nudge down
  - Slow + inaccurate = decrease
- Each game defines expected time per difficulty level

### Smart Decay + Warm-up
- Decay: 3% per day off, floor at 50% above baseline (`max(0.5, 1 - days × 0.03)`)
- Warm-up: first 2 sprints always start below calculated level
- Daily players get easy on-ramp; returning players get proportionally deeper warm-up

### Elo Rating System
- Standard formula: `R_new = R_old + K × (Score - Expected)`
- K=32 for first 10 sprints, then K=16
- Per-game ratings + composite (equal weight, 20% each)
- Score = accuracy × time multiplier (0.8-1.2 based on speed vs expected)

### Research-Backed Difficulty Progressions
- **Math**: streak-based (3 correct advances, 1 wrong resets). Axes: operand size, carry, operation type, mixed ops
- **Stroop**: congruence ratio (75%→25%), stimulus set (4→8 colors), response deadline (3000→500ms)
- **Spatial**: rotation angle (45°→180°), complexity (2D→3D→mirror), time pressure
- **Switching**: predictability (ABAB→random), cue timing (1200→100ms), rule count (2→4+)
- **N-Back**: auto-advance at ≥80% correct, decrease at ≤50%. Progression: 1-back → dual 3-back

### UI Design
- Light theme (#fafafa background)
- Minimal — just the question and your answer, nothing else
- Math: centered on screen, numbers right-aligned within block, no cursor indicator
- Keyboard-driven everything: number typing for math, 1-4 keys for choice games, F/J for n-back
- Complementary accent color per game type
- Monospace font for math (SF Mono / Cascadia Code)

### Data Model
- `ratings`: per-game Elo + composite
- `lastPlayed`: timestamp per game (for smart decay)
- `sessionHistory`: array of sprint results (game, accuracy, avgTime, ratingChange, timestamp)
- Storage interface: `getPlayerData()`, `saveSprintResult()`, `updateRating()`

### Future (not in v1)
- Supabase integration for cross-device sync + auth
- Game rotation engine (activates with 2+ games)
- Dark theme toggle
- Session time targets (e.g., "15 min daily")
- Progress analytics dashboard

## Docs
- Full design spec: `docs/superpowers/specs/2026-04-08-cognitive-trainer-design.md`
- Implementation plan (v1): `docs/superpowers/plans/2026-04-08-mindforge-v1.md`

## Implementation Status
- **v1 scope**: Game engine + math plugin + home screen + session flow (16 tasks)
- **Current**: Plan written, ready for execution
- **Build order**: vitest setup → types → elo → difficulty → storage → math generator → sprint engine → theme → home screen → session route → math input → sprint view → sprint complete → session state machine → smoke test → cleanup

## Key Implementation Notes
- All game logic is pure functions with full test coverage (TDD)
- UI components are `'use client'` — Next.js 16 server/client boundary applies
- `params` must be `await`ed in Next.js 16 page components
- Tailwind 4 uses `@theme` block for custom properties (not `theme.extend` in config)
- Tests use Vitest with jsdom environment
- Storage adapter takes `Storage` as constructor arg (injectable for testing)
