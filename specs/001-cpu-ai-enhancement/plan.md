# Implementation Plan: Enhanced CPU AI Strategy

**Branch**: `001-cpu-ai-enhancement` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cpu-ai-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance CPU opponents with professional Badugi poker strategy including position-aware betting, draw tracking, hand breakability analysis, bluffing (snowing), and opening hand selection. Current CPU strategy is overly simplistic and doesn't account for critical Badugi concepts. The enhancement will implement research-backed strategies from professional Badugi play, resulting in more challenging and realistic opponents. Implementation focuses entirely on `src/model/CpuStrategy.ts` and supporting data structures in `GameState`, maintaining strict Model-View separation per constitution.

## Technical Context

**Language/Version**: TypeScript ES2022 (strict mode enabled)  
**Primary Dependencies**: Phaser 3.90.0 (UI framework, not used in model layer)  
**Storage**: In-memory game state only; no persistence for CPU strategy  
**Testing**: Manual playtesting (no automated test framework currently)  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Single-player web application (Phaser game)  
**Performance Goals**: Instant CPU decision-making (<1ms per decision); 60 FPS UI rendering  
**Constraints**: No external APIs; no randomness in hand evaluation; must maintain deterministic logic for identical game states  
**Scale/Scope**: 7-player game (1 human + 6 CPU); ~500 LOC addition to CpuStrategy.ts; no UI changes required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Separation of Concerns (Model-View) ✅ PASS

**Requirement**: Game logic completely decoupled from UI framework (Phaser). Model classes (`src/model/`) contain pure TypeScript with zero Phaser dependencies.

**Compliance**: All CPU strategy enhancements will be implemented in `src/model/CpuStrategy.ts` with no Phaser imports. New data structures (DrawHistory, PositionContext, etc.) will be pure TypeScript interfaces/classes. No UI changes required.

### II. Scene-Based Architecture ✅ PASS

**Requirement**: Phaser scenes handle UI rendering exclusively; never contain game rule logic.

**Compliance**: No scene modifications planned. GameScene will continue to call existing `CpuStrategy.decideAction()` and `CpuStrategy.decideDiscards()` methods. Strategy improvements are internal to model layer.

### III. Deterministic Game Logic ✅ PASS

**Requirement**: CPU strategy returns consistent actions for identical game states.

**Compliance**: Strategy enhancements use deterministic algorithms (position calculations, pot odds math, hand strength evaluation). Bluff frequency uses seeded pseudo-randomness based on game state hash to ensure reproducibility. No truly random behavior.

### IV. Asset-Free Implementation ✅ PASS

**Requirement**: All graphics generated procedurally using Phaser primitives.

**Compliance**: No graphics changes. Feature is pure logic enhancement.

### V. Configuration-Driven Behavior ✅ PASS

**Requirement**: Game parameters externalized to configuration files where practical.

**Compliance**: CPU personality profiles (aggression, bluff frequency, tightness) will be defined as constants in `CpuStrategy.ts`. Opening hand ranges implemented as lookup tables. No external config file needed for this feature scope.

**GATE STATUS**: ✅ ALL CHECKS PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── model/                    # Pure game logic (no Phaser dependencies)
│   ├── Card.ts              # Existing: Card representation
│   ├── Deck.ts              # Existing: Deck management
│   ├── GameState.ts         # MODIFY: Add draw tracking, position helpers
│   ├── HandEvaluator.ts     # MODIFY: Add breakability calculation
│   ├── CpuStrategy.ts       # MAJOR CHANGES: Implement all new strategies
│   └── TournamentStructure.ts # Existing: Blind management (no changes)
├── scenes/                   # Phaser UI layer (no changes for this feature)
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   ├── GameScene.ts
│   ├── LogListScene.ts
│   └── LogDetailScene.ts
├── assets/
│   └── blinds.tsv           # Existing: Tournament blinds config
└── main.ts                   # Existing: Phaser initialization

specs/001-cpu-ai-enhancement/ # Feature documentation
├── spec.md                   # Requirement specification
├── plan.md                   # This file
├── research.md               # Phase 0: Badugi strategy research
├── data-model.md             # Phase 1: Data structures design
└── quickstart.md             # Phase 1: Developer guide
```

**Structure Decision**: Single project structure. All changes confined to `src/model/` directory, maintaining strict Model-View separation. Primary modification targets are `CpuStrategy.ts` (~500 LOC addition) and minor extensions to `GameState.ts` for draw tracking (~50 LOC) and `HandEvaluator.ts` for breakability calculation (~30 LOC). No scene modifications required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All checks passed. ✅
