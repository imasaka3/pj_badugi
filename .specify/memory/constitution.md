<!--
Sync Impact Report:
- Version: 0.0.0 → 1.0.0 (Initial constitution creation)
- Principles Added: 5 core principles defined
- Sections Added: Core Principles, Technical Constraints, Development Standards, Governance
- Templates Status: No template updates required (initial creation)
- Follow-up TODOs: None
-->

# Badugi Poker Web App Constitution

## Core Principles

### I. Separation of Concerns (Model-View)

Game logic MUST be completely decoupled from UI framework (Phaser). Model classes (`src/model/`) contain pure TypeScript with zero Phaser dependencies. This enables:
- Independent testing of game logic without rendering
- Logic reuse across different UI implementations
- Clear debugging boundaries between state and presentation

### II. Scene-Based Architecture

Phaser scenes handle UI rendering and user interaction exclusively. Scenes (`src/scenes/`) orchestrate model interactions and translate game state to visual elements. Each scene MUST:
- Initialize and manage its own model instances
- Handle user input and delegate to model methods
- Update UI in response to model state changes
- Never contain game rule logic

### III. Deterministic Game Logic

All poker rules, hand evaluation, and state transitions MUST be deterministic and testable. Game state advances through fixed phase sequences with explicit completion criteria:
- `GameState` methods enforce betting limits, round completion, phase progression
- `HandEvaluator` uses algorithmic subset generation (no randomness in evaluation)
- CPU strategy returns consistent actions for identical game states

### IV. Asset-Free Implementation

All graphics MUST be generated procedurally using Phaser primitives. No external image assets, fonts, or binary resources. This ensures:
- Zero build dependencies on asset pipelines
- Predictable rendering across environments
- Simplified deployment (single bundle output)
- See `GameScene.renderPlayer()` for card rendering patterns

### V. Configuration-Driven Behavior

Game parameters MUST be externalized to configuration files where practical:
- Blind structure: `src/assets/blinds.tsv` (tab-separated, loaded via Vite `?raw` import)
- Starting stacks: `GameState.StartStack` constant
- Player count: Hardcoded to 7 (1 human + 6 CPU) per game design
- Bet limits: Fixed-limit with configurable blind levels

## Technical Constraints

**Stack Lock-In**: Phaser 3 + TypeScript + Vite
- Phaser scenes define application structure (no React/Vue)
- TypeScript strict mode enforced (`tsconfig.json`)
- Vite bundler with GitHub Pages deployment (`base: '/pj_badugi/'`)

**Browser-Only**: No server, no multiplayer, no persistence beyond localStorage
- Hand history stored as JSON in `badugi_logs` key (max 100 entries)
- No network calls, APIs, or external data sources
- Single-player tournament against heuristic CPU opponents

**Deployment Model**: Static site on GitHub Pages
- Automated via GitHub Actions (`.github/workflows/deploy.yml`)
- Build artifact (`dist/`) deployed on `main` branch push
- No runtime configuration or environment variables

## Development Standards

**File Organization**:
- `src/model/`: Game logic (Card, Deck, GameState, HandEvaluator, TournamentStructure, CpuStrategy)
- `src/scenes/`: Phaser scenes (BootScene → MenuScene → GameScene, LogListScene, LogDetailScene)
- `src/assets/`: Configuration files (blinds.tsv)
- `src/main.ts`: Phaser game initialization and scene registration

**Naming Conventions**:
- Model classes: PascalCase (e.g., `GameState`, `HandEvaluator`)
- Enum-like objects: PascalCase with `as const` (e.g., `GamePhase`, `Suit`, `Rank`)
- Scene classes: PascalCase with `Scene` suffix (e.g., `GameScene`)
- Methods: camelCase with action verbs (e.g., `startHand()`, `betOrRaise()`)

**State Management**:
- Scene creates model instances in `create()` lifecycle method
- Model mutation via explicit method calls (no property setters)
- UI updates triggered by `updateUI()` after state changes
- Timer-driven CPU turn handling in `GameScene.update()` loop

## Governance

This constitution defines non-negotiable architectural patterns for the Badugi Poker Web App. Changes to core principles require explicit justification and migration plan.

**Compliance Verification**:
- All PRs must preserve Model-View separation (no Phaser imports in `src/model/`)
- New game rules must include deterministic test cases
- Asset additions require constitution amendment justification
- Configuration changes should use existing external file patterns

**Amendment Process**:
1. Propose change with rationale (why current principle blocks progress)
2. Document affected files and migration steps
3. Version bump (MAJOR if breaking principle, MINOR if extending)
4. Update `.github/copilot-instructions.md` to reflect changes

**Version**: 1.0.0 | **Ratified**: 2025-12-06 | **Last Amended**: 2025-12-06
