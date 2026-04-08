# MindForge — Cognitive Training Web App Design Spec

## Overview

A daily-use cognitive training webapp that maximizes neuroplasticity through adaptive, sprint-based mental exercises. The user opens the app, presses start, and is run through a continuous session of increasingly difficult challenges across 5 cognitive domains.

**Target user:** The developer themselves — a 21-year-old looking to sharpen thinking during their peak neuroplasticity window.

**Daily routine:** ~15-20 minutes per day. ~40 sprints per session. Difficulty constantly adapts to stay in the stretch zone.

**Inspiration:** mathtrainer.ai (sprint rhythm, minimal UI, keyboard input), Elevate (broad cognitive domains), RPG stat training (visible progression via Elo).

## Architecture

### Shared Engine + Game Plugin Model

```
Home Dashboard (/)
  └── Session (/session)
        └── Game Engine (shared)
              ├── Sprint Runner — 5-7 questions (randomized per sprint), tracks time + accuracy
              ├── Difficulty Engine — adaptive, targets 70-85% accuracy
              └── Elo System — per-game + composite rating
              
              Plugs into:
              ├── Math Plugin (v1)
              ├── Stroop Plugin (v2)
              ├── Spatial Plugin (v3)
              ├── Switching Plugin (v4)
              └── N-Back Plugin (v5)

        └── Storage Layer (interface)
              ├── Now: localStorage
              └── Later: Supabase
```

Each game plugin defines two things:
1. **Question generator** — given a difficulty level, produce a question
2. **UI renderer** — the game-specific content area and input handling

Everything else (sprint flow, difficulty adjustment, Elo, persistence) is handled by the shared engine.

### Game Rotation (future, requires 2+ games)

The session engine rotates between games unpredictably — not after every sprint, but at varied intervals. This itself is a cognitive challenge (adapting to context switches). v1 runs math only; rotation activates when game #2 is added.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home — composite Elo, per-game ratings, "Start" prompt |
| `/session` | Continuous play session — game engine manages sprint flow |

No individual game routes. The session handles everything.

## Game Modules

### 1. Mental Math (v1)

**Input:** Type number, Enter to submit  
**Accent:** Indigo (#6366f1)

**Difficulty progression (streak-based: 3 correct advances, 1 wrong resets):**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Single-digit addition | 3 + 5 |
| 2 | Single-digit subtraction | 9 - 4 |
| 3 | Double-digit add (no carry) | 23 + 14 |
| 4 | Double-digit add (with carry) | 47 + 38 |
| 5 | Triple-digit addition | 234 + 567 |
| 6 | Multiplication tables (2,5,10) | 7 × 5 |
| 7 | Mixed multiplication | 8 × 7 |
| 8 | Multi-digit × single-digit | 347 × 8 |
| 9 | Division | 144 ÷ 12 |
| 10 | Mixed operations | 23 × 4 + 17 |
| 11 | Square roots | √144 |
| 12 | Fractions | 3/4 + 1/6 |
| 13+ | Multi-step / algebra | Solve: 3x + 7 = 22 |

**Expected response times** (scale with difficulty): ~3s for level 1, ~15s for level 12+.

### 2. Stroop — Attention & Inhibitory Control

**Input:** Press 1-4 to select the displayed color (not the word)  
**Accent:** Rose (#f43f5e)

**Difficulty axes:**
- Congruence ratio: 75% congruent (easy) → 50% → 25% (hard)
- Stimulus set: 4 colors → 6 → 8
- Response deadline: 3000ms → 1500ms → 800ms → 500ms
- Advanced: add font-size conflict, spatial position conflict (flanker-Stroop hybrid)

### 3. Spatial Reasoning — Mental Rotation

**Input:** Press 1 (Same) or 2 (Mirror)  
**Accent:** Cyan (#06b6d4)

**Difficulty axes:**
- Rotation angle: 45° → 90° → 135° → 180°
- Complexity: 2D shapes → 3D rendered objects → mirror vs rotated discrimination
- Time pressure: unlimited → 5s → 2s
- Object complexity: simple shapes → multi-block 3D objects

### 4. Task Switching — Cognitive Flexibility

**Input:** Press 1-4 to sort by the active rule  
**Accent:** Amber (#f59e0b)

**Difficulty axes:**
- Predictability: ABAB alternation → unpredictable 2-rule → 3-rule → no cue
- Cue timing: 1200ms before stimulus (easy) → 100ms (hard)
- Rule count: 2 → 3 → 4+
- Cue explicitness: explicit label → ambiguous → no cue (self-directed)

### 5. N-Back — Working Memory

**Input:** Press F (match) or J (no match)  
**Accent:** Violet (#8b5cf6)

**Difficulty progression (Jaeggi protocol, auto-advance):**
- ≥80% correct → n increases by 1
- ≤50% correct → n decreases by 1
- Otherwise hold
- Progression: 1-back → 2-back → dual 2-back (visual + auditory) → dual 3-back
- Stimulus: position on 3×3 grid, 500ms display, 2500ms interval

## Adaptive Difficulty Engine

### Target Zone
70-85% accuracy — the research-backed sweet spot where the brain is being pushed hard enough to adapt but not so hard you're guessing randomly.

### Within-Session Adjustment (per sprint)

| Accuracy | Speed | Action |
|----------|-------|--------|
| > 85% | Fast (< expected time) | Difficulty +2 |
| > 85% | Slow (> expected time) | Difficulty +1 |
| 70-85% | Any | Hold (sweet spot) |
| 50-70% | Any | Difficulty -1 |
| < 50% | Any | Difficulty -2 |

"Fast" and "slow" are relative to each game's expected response time for that difficulty level.

### Smart Decay (between sessions)

```
daysSinceLastPlay = days since last session for that game
decayFactor = max(0.5, 1 - (daysSinceLastPlay × 0.03))
startingDifficulty = baseline + (peakRating - baseline) × decayFactor
```

- 1 day off → start at 97% of peak
- 7 days off → start at 79% of peak
- 17+ days off → floor at 50% above baseline

### Warm-Up Ramp

First 2 sprints of every session start below the calculated starting difficulty, regardless of decay. Even daily players get an easy on-ramp before hitting their actual level at sprint 3+.

## Elo Rating System

### Formula

```
Expected = 1 / (1 + 10^((difficultyRating - playerRating) / 400))
Score = sprintAccuracy × timeMultiplier
R_new = R_old + K × (Score - Expected)
```

- `timeMultiplier`: 0.8 (very slow) to 1.2 (very fast), based on avg response time vs expected for that difficulty
- `K = 32` for first 10 sprints per game, then `K = 16`
- Starting rating: 1000 for all games

### Composite Rating

Weighted average of all 5 game ratings, equal weight (20% each). Games not yet played default to 1000.

## UI Design

### Theme
- Light background: #fafafa
- Card/surface: #ffffff
- Text primary: #1a1a1a
- Text secondary: #a1a1aa
- Text hint: #c4c4c4
- Border: #e5e5e5
- Surface alt: #f0f0f5

### Layout Principles
- Minimal — just the question and your answer on screen
- Centered layout for all games
- Math: numbers right-aligned within the centered block (like paper math)
- No cursor indicator for text input — just the typed number
- Monospace font for math (SF Mono / Cascadia Code fallback)
- Keyboard-driven everything — no mouse needed during play

### Sprint Screen Structure
1. Thin progress bar at top (e.g., 4/7) with game accent color
2. Current Elo rating (small, unobtrusive)
3. Question area (game-specific content)
4. Keyboard hint at bottom

### Between-Sprint Screen
- "Sprint Complete" label
- Accuracy (e.g., 6/7) in green
- Average response time
- Elo change (e.g., +18 in green, -12 in red)
- "Press Enter to continue"

### Home Screen
- Composite Elo prominently displayed
- Per-game Elo ratings with accent color dots
- Last played timestamps
- "Press Enter to start" prompt
- Keyboard shortcut: Enter to begin session

## Data Model

### PlayerData
```typescript
type PlayerData = {
  ratings: Record<GameType, number>  // per-game Elo
  compositeRating: number
  lastPlayed: Record<GameType, string>  // ISO timestamp
  sprintCounts: Record<GameType, number>  // for K-factor calculation
}
```

### SprintResult
```typescript
type SprintResult = {
  gameType: GameType
  difficulty: number
  questionCount: number
  correctCount: number
  avgResponseTimeMs: number
  ratingBefore: number
  ratingAfter: number
  timestamp: string  // ISO
}
```

### GameType
```typescript
type GameType = 'math' | 'stroop' | 'spatial' | 'switching' | 'nback'
```

### Storage Interface
```typescript
interface StorageAdapter {
  getPlayerData(): PlayerData
  saveSprintResult(result: SprintResult): void
  updateRating(game: GameType, newRating: number): void
  getSessionHistory(limit?: number): SprintResult[]
}
```

localStorage adapter implements this for v1. Supabase adapter implements the same interface later — no game code changes needed.

## Build Order

1. **Game engine** — sprint runner, difficulty engine, Elo system, storage interface
2. **Math plugin** — question generator + right-aligned typing UI
3. **Home screen** — ratings display + start
4. **Session flow** — continuous sprint loop with math
5. **Stroop plugin** — question generator + 1-4 key UI
6. **Spatial plugin** — rotation renderer + 1-2 key UI
7. **Switching plugin** — rule display + 1-4 key UI
8. **N-Back plugin** — grid renderer + F/J key UI
9. **Game rotation engine** — unpredictable switching between games within a session

## Out of Scope (Future)

- Supabase integration (auth, cross-device sync)
- Dark theme toggle
- Session time targets / daily goals
- Progress analytics dashboard
- Sound effects / haptic feedback
- Mobile-optimized touch input
- Leaderboards / social features
