# Badugi Poker Web App - AI Agent Instructions

## Project Overview
Single-player Badugi Poker (4-card lowball) tournament game against 6 CPU opponents. Built with **Phaser 3**, **TypeScript**, and **Vite**. Deployed to GitHub Pages at `/pj_badugi/` base path.

## Architecture

### Scene-Based State Management (Phaser Pattern)
- **Scenes** (`src/scenes/`): Phaser scenes handle UI rendering and user interaction
  - `BootScene` → `MenuScene` → `GameScene` (main game loop)
  - `LogListScene` / `LogDetailScene` for hand history (localStorage-based)
- **Model** (`src/model/`): Pure TypeScript classes contain game logic (no Phaser dependencies)
  - Separation allows game logic testing without UI concerns

### Key Data Flow
1. `GameScene` creates `GameState` + `TournamentStructure`
2. `GameState.startHand()` initializes hand (blinds, dealing, phase setup)
3. User actions → `GameScene.handlePlayerAction()` → `GameState` methods (fold/call/raise/draw)
4. CPU turns → `CpuStrategy.decideAction()` returns action string → `GameState` methods
5. `GameState.advanceTurn()` checks round completion → `nextPhase()` → eventual `handleShowdown()`
6. Hand logs saved to localStorage at pot award time

## Critical Implementation Patterns

### Badugi Hand Evaluation (`HandEvaluator`)
- **Lowball logic**: Lower ranks win; 4-card > 3-card > 2-card > 1-card
- **Valid subset**: No duplicate ranks or suits (e.g., A♠2♥3♦4♣ is a Badugi)
- Generates all subsets via bitmasking, keeps best valid subset
- `HandRank.compareTo()`: Returns >0 if "this" wins (better hand)

### Game Phase Progression
Fixed sequence: `Betting1 → Draw1 → Betting2 → Draw2 → Betting3 → Draw3 → Betting4 → Showdown`
- **Betting phases**: Players fold/call/raise (5-bet cap via `betsInRound`)
- **Draw phases**: Replace 0-4 cards (CPU uses `CpuStrategy.decideDiscards()`)
- Round completion logic: All active players acted + bets match (or all-in)

### Fixed-Limit Betting Rules
- Bet size = `bigBlind` (rounds 1-2) or `bigBlind * 2` (rounds 3-4)
- 5-bet cap enforced via `GameState.betsInRound` counter
- All-in players skip betting but participate in draws
- See `GameState.betOrRaise()` for sizing logic

### Tournament Blinds
- Config: `src/assets/blinds.tsv` (tab-separated: Level, SmallBlind, BigBlind, DurationSec)
- Import via Vite's `?raw` suffix: `import blindsTsv from '../assets/blinds.tsv?raw'`
- `TournamentStructure.getCurrentLevel()` calculates level from elapsed time since `start()`

### CPU Strategy (Enhanced Heuristic)
**Current Implementation**: Professional Badugi strategy with position awareness, draw tracking, and opponent modeling.

**Core Components** (`src/model/CpuStrategy.ts`):
1. **Position Awareness**
   - 3-tier system: early (tight), middle (balanced), late (aggressive)
   - Opening ranges vary by position (e.g., 8-high Badugi in early, Q-high in late)
   - `getPositionCategory()` calculates relative position from dealer
   
2. **Draw Tracking**
   - `Player.drawHistory: number[]` tracks draws in each round
   - CPUs analyze opponents' draw counts for strength estimation
   - Standing pat (0 draws) signals Badugi, drawing 2+ signals weakness
   
3. **Breakability Analysis**
   - `HandEvaluator.calculateBreakability()` scores rough Badugis (0-91 scale)
   - CPUs break weak Badugis (9+ high) when facing aggression
   - Smooth hands (low gaps between ranks) preferred over rough hands
   
4. **Snow Plays (Bluffing)**
   - CPUs stand pat with 3-card hands ~15-20% of time after Draw 2
   - Deterministic pseudo-random via game state hash (preserves reproducibility)
   - Frequency varies by CPU personality profile
   
5. **Pot Odds Calculation**
   - `checkPotOdds()` compares pot size to call amount vs. estimated outs
   - CPUs call with drawing hands when pot odds justify
   - Formula: `winProbability >= 1/(potOdds + 1)`
   
6. **CPU Personalities**
   - 6 profiles with varying `aggressionFactor`, `bluffFrequency`, `tightnessFactor`
   - Profile assigned based on CPU ID (CPU 1-6 map to profiles cyclically)
   - Profiles range from tight-passive (CPU 4) to loose-aggressive (CPU 5)

**Decision Flow**:
- Pre-draw (Betting1): Opening ranges by position + hand strength
- Post-draw (Betting2-4): Value betting, snow plays, breakability checks, pot odds
- Draw phases: Keep best valid subset, break weak Badugis when behind

**Debugging Tips**:
- Log CPU decisions: `console.log(\`CPU \${cpu.name} position: \${position}, action: \${action}\`)`
- Check draw history: `gameState.players.map(p => ({ name: p.name, draws: p.drawHistory }))`
- Verify breakability scores stay 0-91 range

## Development Workflow

### Commands
```bash
npm run dev      # Vite dev server (hot reload)
npm run build    # TypeScript compile + Vite build → dist/
npm run preview  # Preview production build locally
```

### Debugging Game Logic
- Add `console.log()` in `GameState` methods to trace state transitions
- Check `localStorage.getItem('badugi_logs')` for hand history JSON
- Use browser DevTools to inspect Phaser game objects: `this.scene.get('GameScene')`

### Deployment
- GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on `main` push
- Build outputs to `dist/`, uploaded to GitHub Pages
- `vite.config.ts` sets `base: '/pj_badugi/'` for subdirectory hosting

## Common Modification Patterns

### Adding New Actions
1. Update `GameState` with method (e.g., `reBuy()`)
2. Add button in `GameScene.createActionButtons()`
3. Map action string in `handlePlayerAction()` switch statement
4. Update `CpuStrategy.decideAction()` to handle new action

### Modifying Blind Structure
Edit `src/assets/blinds.tsv`:
- Columns: `Level SmallBlind BigBlind DurationSec` (tab-separated)
- Changes take effect on next `npm run dev` (Vite hot reload for ?raw imports)

### Extending Hand History
- Logs stored as `HandLog[]` in localStorage (`badugi_logs` key)
- Structure: `{ timestamp, level, pot, winners[], players[], rounds[] }`
- `GameState.logAction()` records actions; `saveHandLog()` persists at hand end
- LogDetailScene renders with Phaser Text objects (no scroll implemented)

## Project Constraints
- **No external assets**: All graphics procedurally generated (Phaser shapes/text)
- **Single-player only**: 6 CPU opponents (no network/multiplayer code)
- **localStorage limits**: Hand history capped at 100 entries (see `GameState.saveHandLog()`)
- **TypeScript strict mode**: All `tsconfig.json` linting rules enabled

## Key Files Reference
- `src/main.ts`: Phaser game config (1280x720, scene registration)
- `src/model/GameState.ts`: Core game loop, betting/draw logic, hand history
- `src/model/HandEvaluator.ts`: Badugi ranking algorithm
- `src/scenes/GameScene.ts`: Main UI (player rendering, button handlers, timer)
- `src/assets/blinds.tsv`: Tournament structure configuration
