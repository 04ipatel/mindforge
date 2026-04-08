@AGENTS.md

# MindForge — Cognitive Training Web App

## What This Is
A daily-use cognitive training webapp designed to maximize neuroplasticity and mental development. The user sits down, presses start, and is run through an adaptive session of mental exercises that constantly push their limits. Inspired by mathtrainer.ai (sprint-based math) and Elevate (broad cognitive training), but unified into a single continuous flow.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 4 with `@theme` block for custom properties
- **Testing**: Vitest + jsdom (50 tests, all pure function logic)
- **Package Manager**: Bun (never npm)
- **Deployment**: Vercel (GitHub integration, auto-deploy on push to main)

## Architecture Overview

```
lib/                    ← Pure logic layer (no React, fully tested)
  types.ts              ← Core types: GameType, PlayerData, SprintResult, Question, GamePlugin
  elo.ts                ← Elo rating: expected score, time multiplier, new rating, composite
  difficulty.ts         ← Adaptive difficulty: adjust, smart decay, starting difficulty
  storage.ts            ← StorageAdapter interface + LocalStorageAdapter class
  engine.ts             ← Sprint runner: create, record answer, completion check, summary
  games/math/
    constants.ts        ← 13 difficulty levels with expected response times
    generator.ts        ← Question generator per level (deduplication support)

app/                    ← UI layer (React client components)
  globals.css           ← Tailwind theme: surface colors, game accents, fonts
  layout.tsx            ← Root layout with Geist fonts + metadata
  page.tsx              ← Home screen: composite + per-game ratings, Enter to start
  session/
    page.tsx            ← Server shell for /session route
    session-view.tsx    ← Session state machine: playing ↔ reviewing loop
    sprint-view.tsx     ← Active sprint: progress bar, question, input
    sprint-complete.tsx ← Between-sprint stats: accuracy, time, rating change
    math-input.tsx      ← Keyboard-driven number input with feedback flash

__tests__/              ← Mirrors lib/ structure, Vitest
```

### Key Architectural Patterns
- **Shared Engine + Game Plugins**: Engine handles sprints, scoring, difficulty. Each game only defines question generation + input UI component.
- **Pure logic / UI separation**: All game logic in `lib/` is pure functions with zero React dependencies. UI in `app/` is thin wrappers.
- **Interface-based storage**: `StorageAdapter` interface allows swapping localStorage for Supabase without touching game logic.
- **Immutable sprint state**: `recordAnswer()` returns a new Sprint object, no mutation.

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

### Sprint Structure
- 5-7 questions per sprint (randomized count)
- No duplicate questions within a sprint (generator deduplicates by prompt)
- After submit: 500ms correctness feedback (green/red) with 150ms fade transition
- Wrong answers show the correct answer beside the input
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
- Per-game ratings + composite (equal weight average across all 5 game types)
- Score = accuracy × time multiplier (0.8-1.2 based on speed vs expected)
- Difficulty maps to a rating: `1000 + (level - 1) × 50`

### Math Difficulty Levels (13 total)
1. Single-digit addition (3s)
2. Single-digit subtraction (3s)
3. Double-digit add, no carry (5s)
4. Double-digit add, with carry (6s)
5. Triple-digit addition (8s)
6. Multiplication tables 2/5/10 (4s)
7. Mixed multiplication (5s)
8. Multi-digit × single-digit (8s)
9. Division (8s)
10. Mixed operations (10s)
11. Square roots (10s)
12. Fractions (12s)
13. Multi-step algebra (15s)

### UI Design
- Light theme (#fafafa background)
- Minimal — just the question and your answer, nothing else
- Math: centered on screen, numbers right-aligned within block, stacked operand layout
- Keyboard-driven everything: number typing for math, 1-4 keys for choice games, F/J for n-back
- Supports `-` for negative answers and `/` for fraction answers
- Complementary accent color per game type
- Monospace font for math (SF Mono / Cascadia Code / Geist Mono)
- Escape key returns to home from any point in a session

### Data Model
- `PlayerData`: per-game Elo ratings, composite rating, last played timestamps, sprint counts
- `SprintResult`: game type, difficulty, question/correct counts, avg time, rating before/after, timestamp
- Storage keys: `mindforge_player` (player data), `mindforge_history` (sprint results array)
- Storage interface: `getPlayerData()`, `saveSprintResult()`, `updateRating()`, `getSessionHistory()`

## Implementation Status
- **v1**: Complete and deployed. Game engine + math plugin + home screen + session flow.
- **Test coverage**: 50 tests across elo, difficulty, storage, engine, and math generator.
- **Deployed**: Vercel with GitHub integration (auto-deploy on push to main).

## Docs
- Full design spec: `docs/superpowers/specs/2026-04-08-cognitive-trainer-design.md`
- Implementation plan (v1): `docs/superpowers/plans/2026-04-08-mindforge-v1.md`

## Key Implementation Notes
- All game logic is pure functions with full test coverage (TDD)
- UI components are `'use client'` — Next.js 16 server/client boundary applies
- `params` must be `await`ed in Next.js 16 page components
- Tailwind 4 uses `@theme` block for custom properties (not `theme.extend` in config)
- Tests use Vitest with jsdom environment
- Storage adapter takes `Storage` as constructor arg (injectable for testing)
- Question deduplication uses a `Set<string>` of prompts with up to 50 retry attempts

## Future (not in v1)
- Supabase integration for cross-device sync + auth
- Game rotation engine (activates with 2+ games)
- Additional game modules: Stroop, Spatial, Switching, N-Back
- Dark theme toggle
- Session time targets (e.g., "15 min daily")
- Progress analytics dashboard
