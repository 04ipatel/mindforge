# MindForge v2 Roadmap — The Anti-Doomscroll Polymath Platform

## Product Thesis

MindForge is the thing you reach for instead of doomscrolling. Between Claude prompts, waiting in line, on the couch. Quick, casual, mechanically addictive — but with genuine intellectual depth underneath.

It is NOT a "brain training app." It's a daily cognitive sharpening tool built on three layers: raw cognitive training, knowledge acquisition through spaced repetition, and applied reasoning through scenario sprints. All sharing the same ultra-fast sprint UX.

## Design Principles

- **Zero friction.** Open the app → you're already in a sprint. No deliberation.
- **2-3 minute default sessions.** 15-20 minutes is what happens when you get pulled in, not the entry point.
- **Mechanically crispy.** Every keypress, choice selection, feedback flash, and transition must feel immediate and satisfying. Snappy animations, crisp color changes, satisfying progression. The UI is a precision instrument.
- **Intellectually addictive.** The difficulty curve and variety keep you in "one more sprint" territory. Always slightly challenged, never bored.
- **Honestly framed.** "Sharpen your thinking" — not "become smarter."
- **Invisible intelligence.** The SR engine, difficulty adjustment, and rotation logic are invisible to the user. You just play. The system handles the rest.

## Three-Layer Architecture

### Layer 1: Cognitive Foundation
Raw processing speed, working memory, attention, spatial reasoning. The mental gym. Pure cognitive training through rapid-fire drills.

**Sprint format:** See stimulus → produce answer (typing, key selection, or click) → instant feedback → next question. 5-7 questions per sprint.

### Layer 2: Knowledge Acquisition
Spaced repetition across curated content domains. Vocabulary, mental models, grammar, cognitive biases. The building blocks that polymaths use to connect ideas.

**Sprint format:** Same as Layer 1 — but the SR engine decides which items to present based on memory decay scheduling. Input mode adapts to mastery: 4-choice recognition for new/learning items, cloze typing for review/mastered items (deeper retrieval, more satisfying mechanically).

### Layer 3: Applied Reasoning
Scenarios, fallacy detection, argument evaluation, reading comprehension. Using the cognitive capacity from Layer 1 and the knowledge from Layer 2 to sharpen real thinking patterns.

**Sprint format:** Same sprint mechanic. Short stimulus (2-5 sentences), 4-choice response. Content references concepts from Layer 2 — if you've learned "sunk cost fallacy," you'll encounter scenarios where it's the answer.

### How the Layers Interact

- The rotation engine picks across all three layers unpredictably
- Layer 3 modules preferentially use concepts the user has learned in Layer 2 but hasn't applied yet
- The SR engine operates within Layer 2 but influences Layer 3 content selection
- All layers share the same Elo rating system, adaptive difficulty, feedback timing, and sprint engine

---

## Module Inventory

### Layer 1 — Cognitive Foundation

| # | Module | Input Mode | Accent | Status | Description |
|---|--------|-----------|--------|--------|-------------|
| 1 | Mental Math | number typing | Indigo #6366f1 | ✅ Built | Arithmetic at 13 difficulty levels, from single-digit addition to algebra |
| 2 | Stroop (Attention) | 1-4 keys | Rose #f43f5e | ✅ Built | Identify ink color of a conflicting color word. Trains inhibitory control |
| 3 | Spatial Reasoning | 1-2 keys | Cyan #06b6d4 | ✅ Built | Compare two shapes — same rotation or mirror reflection |
| 4 | Task Switching | 1-4 keys | Amber #f59e0b | Planned | Alternating rules (odd/even vs high/low). Trains cognitive flexibility |
| 5 | N-Back | F/J keys | Violet #8b5cf6 | Planned | Sequence memory — did this stimulus appear N steps ago? Trains working memory |
| 6 | Speed of Processing | click/tap | Emerald #10b981 | Planned | UFOV-style peripheral attention. Identify briefly-flashed targets. Strongest evidence-backed intervention (ACTIVE study: 29% dementia risk reduction at 20 years) |
| 7 | Memory | number typing / 1-4 keys | Slate #64748b | Planned | Two sub-modes: (a) sequence recall — shown a sequence, reproduce it; (b) passage recall — read a short paragraph, answer detail questions from memory |

### Layer 2 — Knowledge Acquisition (Spaced Repetition)

| # | Module | Input Mode | Accent | Status | Description |
|---|--------|-----------|--------|--------|-------------|
| 8 | Mental Models & Cognitive Biases | choice → cloze typing | Sky #0ea5e9 | Planned | ~100+ core concepts (sunk cost, confirmation bias, Bayesian reasoning, second-order thinking). Question formats: definition→name, name→definition, scenario→which model |
| 9 | Vocabulary / Language | choice → cloze typing | Lime #84cc16 | Planned | Word definitions, synonyms, usage in context. Progressive difficulty from common to advanced |
| 10 | Grammar / Writing | choice → cloze typing | Fuchsia #d946ef | Planned | Pick the better sentence, identify the error, conciseness improvements |

### Layer 3 — Applied Reasoning

| # | Module | Input Mode | Accent | Status | Description |
|---|--------|-----------|--------|--------|-------------|
| 11 | Spot the Fallacy | 1-4 keys | Red #ef4444 | Planned | Presented with a short argument, identify the logical fallacy. Scales from obvious (ad hominem) to subtle (base rate neglect) |
| 12 | Scenario Analysis | 1-4 keys | Orange #f97316 | Planned | Brief real-world situation, pick which mental model or framework best applies. Scales from single-model to multi-factor tradeoffs |
| 13 | Argument Evaluation | 1-4 keys | Teal #14b8a6 | Planned | Two arguments presented — pick the stronger one. Or: identify the weakest premise |
| 14 | Reading Comprehension | 1-4 keys | Stone #78716c | Planned | Short passages (3-5 sentences). Lower difficulty: factual recall. Higher difficulty: inference and unstated assumptions |

---

## New Infrastructure

### Streak System
- Daily streak counter displayed prominently on home screen
- Streak freeze mechanic (earned through consistent play, can save a missed day)
- Loss-aversion framing: the streak is the retention hook
- Persisted in PlayerData alongside ratings
- Visual: simple number + flame/indicator, fitting current minimal aesthetic

### Spaced Repetition Engine

**Architecture:** `lib/sr.ts` — pure functions, no React dependency. Sits alongside the existing difficulty engine.

**Content pool model (Option B):**
- Each knowledge domain has a large curated content pool (100+ items per domain)
- The SR engine manages a "sliding window" of active items per user per domain
- Users never see decks, manage cards, or think about scheduling — they just play
- The system introduces 2-3 new items per session and reviews items near their forgetting threshold

**Per-item state:**
- `interval`: days until next review (starts at 1, grows exponentially on success)
- `easeFactor`: multiplier for interval growth (starts at 2.5, adjusts based on performance)
- `nextDueDate`: ISO timestamp of when this item should be reviewed
- `repetitions`: how many times successfully recalled
- `masteryLevel`: 'new' | 'learning' | 'review' | 'mastered'

**Scheduling algorithm (SM-2 based):**
- Correct + fast → interval × easeFactor, easeFactor slightly increases
- Correct + slow → interval × easeFactor, easeFactor unchanged
- Incorrect → interval resets to 1 day, easeFactor decreases (floor 1.3)
- Items transition: new → learning (after first exposure) → review (after 3+ successful recalls) → mastered (interval > 30 days)

**Input mode selection based on mastery:**
- `new` and `learning` → 4-choice recognition (lower cognitive load while learning)
- `review` and `mastered` → cloze typing (effortful retrieval strengthens memory)

**Integration with sprint engine:**
- SR items are presented as regular sprints in the rotation
- The rotation engine can pick "vocabulary SR sprint" just like it picks "math sprint"
- Within an SR sprint, the scheduler selects: due-for-review items first, then new items to fill remaining slots
- After sprint completion, each item's SR state is updated based on correctness and response time

### Content System

**Location:** `lib/content/` — typed data files per domain

**Item shape:**
```typescript
type ContentItem = {
  id: string
  domain: 'mental-models' | 'vocabulary' | 'grammar'
  prompt: string                    // the question stem or cloze sentence
  answer: string                    // correct answer (for typing mode)
  distractors: string[]             // wrong answers (for choice mode, at least 3)
  difficulty: 1 | 2 | 3             // tier within the domain
  tags: string[]                    // for cross-referencing with Layer 3
  context?: string                  // optional explanation shown after answering
}
```

**Question generation from content items:**
- The generator takes a ContentItem + mastery level → produces a Question
- For choice mode: builds 4 options from answer + 3 distractors (shuffled)
- For cloze mode: formats prompt with blank, answer is the typed response
- The Question.metadata carries the content item ID for SR state updates

### Analytics Dashboard

**Route:** `/stats`

**Super simple, matching current minimal UI:**
- Elo trajectory: single clean SVG line per game, or just numbers with deltas ("Math: 1,247 (+34 this week)")
- Per-game ratings listed vertically with accent color dots (same as home screen)
- Streak: current streak + longest streak
- Total sessions and total time played
- No charting libraries — hand-drawn SVG or pure numbers
- Same #fafafa background, same typography, same spacing

### Supabase Integration

- `SupabaseStorageAdapter` implementing existing `StorageAdapter` interface
- Auth flow: email/password or OAuth, minimal UI
- Syncs: PlayerData, session history, SR item states, streak data
- Offline-first: localStorage remains the primary store, Supabase syncs when online
- The existing `StorageAdapter` interface means game logic never touches Supabase directly

---

## Phasing

### Phase 1: Complete the Foundation
*Estimated scope: 4 new game modules + 3 infrastructure pieces*

1. Task Switching module (Layer 1)
2. N-Back module (Layer 1)
3. Speed of Processing module (Layer 1)
4. Memory module (Layer 1)
5. Streak system (infrastructure)
6. Analytics dashboard — `/stats` route (infrastructure)
7. Supabase auth + sync (infrastructure)
8. UI polish: micro-animations on feedback, transition refinements, interaction crispness

### Phase 2: Knowledge Layer
*Estimated scope: SR engine + content system + 3 domains*

1. SR engine (`lib/sr.ts`) — scheduling, mastery levels, input mode selection
2. Content system (`lib/content/`) — item type, generators, domain data files
3. Text input component — cloze typing mode for SR review items
4. Mental Models & Cognitive Biases domain — first ~50 items
5. Vocabulary / Language domain — first ~100 items
6. Grammar / Writing domain — first ~50 items
7. Rotation engine update — integrate SR sprints into game rotation

### Phase 3: Applied Reasoning
*Estimated scope: 4 new modules, content references Layer 2*

1. Spot the Fallacy module
2. Scenario Analysis module
3. Argument Evaluation module
4. Reading Comprehension module
5. Cross-layer content linking — Layer 3 scenarios reference Layer 2 concepts

### Phase 4: Polish & Scale
*Scope TBD based on usage*

1. More knowledge domains (science principles, historical patterns, exam prep — GMAT, LSAT, GRE)
2. User-sourced content (add your own SR items)
3. Metacognitive reflection prompts (every few sprints: "was that too easy?", "what strategy did you use?")
4. Session time targets ("15 min daily" goal with progress ring)

---

## What Stays the Same

Everything from the current architecture carries forward:
- Sprint engine (create, record, complete, summary) — `lib/engine.ts`
- Adaptive difficulty per game — `lib/difficulty.ts`
- Elo rating per game + composite — `lib/elo.ts`
- Smart decay + warm-up — `lib/difficulty.ts`
- StorageAdapter interface — `lib/storage.ts`
- Game rotation with switch probability — `app/session/session-view.tsx`
- Feedback timing (250ms correct / 800ms incorrect / 150ms fade)
- Question deduplication within sprints
- Plugin architecture (generator + input component per game)
- Minimal light UI (#fafafa, accent colors, monospace, keyboard-driven)
- Comments standard (agent-navigable codebase)

## Research Backing

Full research report with citations: `docs/research/cognitive-training-research.md`

Key evidence supporting this design:
- Speed of processing training: 29% dementia risk reduction at 20 years (ACTIVE study)
- Multi-domain rotation: better transfer than single-domain (meta-analysis)
- 70-85% accuracy target: optimal for learning AND flow state
- Spaced repetition: one of the most replicated findings in cognitive psychology
- Streaks: 3.6x completion rate improvement (Duolingo data)
- Cloze/production retrieval: stronger testing effect than recognition
- Deliberate practice: edge of ability + immediate feedback = expert performance
