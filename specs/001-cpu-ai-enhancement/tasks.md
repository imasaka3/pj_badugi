# Tasks: Enhanced CPU AI Strategy

**Input**: Design documents from `/specs/001-cpu-ai-enhancement/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅
**Status**: Ready for implementation
**Test Framework**: Vitest v4.0.15 (installed)

## Organization

Tasks organized by user story priority (P1 → P2 → P3) to enable independent implementation and testing.
Each story includes: ✅ Unit Tests → Models → Strategy Logic → Integration Tests

---

## Phase 0: Test Infrastructure Setup

- [ ] T001 Create test utility helpers in `src/__tests__/helpers.ts` (card factories, game state mocks)
- [ ] T002 [P] Create sample tests layout structure in `src/__tests__/` directory

---

## Phase 1: Data Structure Foundations

- [ ] T003 [P] [US1] Extend `Player` interface in `src/model/GameState.ts` with `drawHistory: number[]` field
- [ ] T004 [P] [US1] Create unit tests for Player.drawHistory in `src/__tests__/GameState.test.ts`
- [ ] T005 [US1] Implement draw tracking initialization in `GameState.startHand()` method
- [ ] T006 [P] [US2] Implement draw count recording in `GameState.draw()` method  
- [ ] T007 [P] [US2] Implement standing pat recording in `GameState.standPat()` method
- [ ] T008 [US2] Create integration tests for draw history tracking in `src/__tests__/GameState.test.ts`

---

## Phase 2: Hand Evaluation Extensions

- [ ] T009 [P] [US3] Define `BreakabilityScore` interface in `src/model/HandEvaluator.ts`
- [ ] T010 [US3] Implement `HandEvaluator.calculateBreakability()` method (score 0-91)
- [ ] T011 [P] [US3] Implement `HandEvaluator.isSmooth()` helper method
- [ ] T012 [US3] Create unit tests for `calculateBreakability()` in `src/__tests__/HandEvaluator.test.ts`
- [ ] T013 [P] [US3] Create unit tests for `isSmooth()` in `src/__tests__/HandEvaluator.test.ts`

---

## Phase 3: CPU Strategy Core (User Story 1 - Position Awareness)

**Story Goal**: CPUs adjust betting based on position relative to dealer button (early/middle/late)

**Independent Test Criteria**:
- `getPositionCategory()` correctly calculates position tier for all seat positions
- Opening ranges differ by position (early = tight, late = loose)
- 40-60% more folds from early position vs late position on equivalent hands

**Test Tasks**:
- [ ] T014 [P] [US1] Create unit tests for `getPositionCategory()` in `src/__tests__/CpuStrategy.test.ts`
- [ ] T015 [P] [US1] Create unit tests for opening range table lookup in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T016 [US1] Define `PositionCategory` type in `src/model/CpuStrategy.ts`
- [ ] T017 [US1] Implement `getPositionCategory()` function with 3-tier logic
- [ ] T018 [P] [US1] Define `StrategyProfile` interface for CPU personalities
- [ ] T019 [P] [US1] Define `CPU_PROFILES` array with 6 personality profiles
- [ ] T020 [P] [US1] Implement `getStrategyProfile()` function
- [ ] T021 [US1] Define `OPENING_RANGES` lookup table for early/middle/late positions
- [ ] T022 [P] [US1] Implement `OpeningCriteria` interface
- [ ] T023 [US1] Implement `CpuStrategy.decidePreDrawAction()` method using opening ranges
- [ ] T024 [US1] Create integration tests for pre-draw decision logic in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 4: CPU Strategy - Draw Intelligence (User Story 2 - Draw-Based Strategy)

**Story Goal**: CPUs track opponent draws and adjust betting aggression accordingly

**Independent Test Criteria**:
- CPU bets more aggressively (raise rate 30%+ higher) when opponents draw 2+ cards
- CPU plays cautiously against opponents standing pat
- Draw history correctly reflects all 3 draw phases

**Test Tasks**:
- [ ] T025 [P] [US2] Create unit tests for `decidePostDrawAction()` with mock draw histories in `src/__tests__/CpuStrategy.test.ts`
- [ ] T026 [P] [US2] Create unit tests for draw-based aggression factor in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T027 [US2] Implement `CpuStrategy.decidePostDrawAction()` method framework
- [ ] T028 [P] [US2] Extract draw history from game state in decision methods
- [ ] T029 [P] [US2] Implement draw-based opponent strength estimation
- [ ] T030 [US2] Implement aggression multiplier based on opponent draws
- [ ] T031 [US2] Create integration tests for post-draw betting in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 5: CPU Strategy - Breakability (User Story 3 - Breakability-Based Decisions)

**Story Goal**: CPUs evaluate hand "breakability" when deciding to stand pat or break marginal badugis

**Independent Test Criteria**:
- CPU correctly breaks rough badugis (9-high+) when facing aggression (70%+ accuracy)
- Breakability score ranges 0-91 with expected distribution
- Smooth hands preferred over rough hands

**Test Tasks**:
- [ ] T032 [P] [US3] Create unit tests for `shouldBreakBadugi()` logic in `src/__tests__/CpuStrategy.test.ts`
- [ ] T033 [P] [US3] Create unit tests for breakability score thresholds in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T034 [US3] Implement `CpuStrategy.shouldBreakBadugi()` method
- [ ] T035 [P] [US3] Integrate `calculateBreakability()` calls in post-draw decision logic
- [ ] T036 [P] [US3] Implement breaking logic based on opponent strength signals
- [ ] T037 [US3] Create integration tests for breakability decisions in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 6: CPU Strategy - Pot Odds (User Story 2 continued - Advanced Betting)

**Story Goal**: CPUs use pot odds to make mathematically sound calls with drawing hands

**Independent Test Criteria**:
- Pot odds calculation matches equity requirement formula
- CPUs call when win probability ≥ required equity
- Division by zero handled safely

**Test Tasks**:
- [ ] T038 [P] [US2] Create unit tests for `checkPotOdds()` with various scenarios in `src/__tests__/CpuStrategy.test.ts`
- [ ] T039 [P] [US2] Create unit tests for `estimateOuts()` in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T040 [US2] Implement `CpuStrategy.checkPotOdds()` method with equity calculation
- [ ] T041 [P] [US2] Implement `CpuStrategy.estimateOuts()` method for hand strength
- [ ] T042 [P] [US2] Integrate pot odds into `decidePostDrawAction()` for drawing hands
- [ ] T043 [US2] Create integration tests for pot odds decisions in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 7: CPU Strategy - Snow Plays (User Story 4 - Bluffing)

**Story Goal**: CPUs occasionally bluff by standing pat with weak hands to steal pots

**Independent Test Criteria**:
- CPU executes snow plays in 15-20% of weak 3-card situations
- Snow plays only triggered after Draw2 with 3-card hands
- Bluff frequency respects CPU personality profiles
- Deterministic randomness preserves reproducibility

**Test Tasks**:
- [ ] T044 [P] [US4] Create unit tests for `shouldSnow()` frequency in `src/__tests__/CpuStrategy.test.ts`
- [ ] T045 [P] [US4] Create unit tests for snow play determinism in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T046 [US4] Implement `CpuStrategy.shouldSnow()` method with deterministic seeding
- [ ] T047 [P] [US4] Integrate `shouldSnow()` into `decidePostDrawAction()`
- [ ] T048 [P] [US4] Implement game state hash-based seeding for reproducibility
- [ ] T049 [US4] Create integration tests for snow play execution in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 8: CPU Strategy - Opening Selection (User Story 5 - Opening Ranges)

**Story Goal**: CPUs make position-aware pre-draw decisions based on starting hand strength

**Independent Test Criteria**:
- CPU shows 80%+ adherence to opening hand range charts by position
- Early position requires stronger hands than late position
- Weak 3-card hands only played from late position

**Test Tasks**:
- [ ] T050 [P] [US5] Create unit tests for opening range adherence over 100+ simulated hands in `src/__tests__/CpuStrategy.test.ts`
- [ ] T051 [P] [US5] Create unit tests for position-specific hand requirements in `src/__tests__/CpuStrategy.test.ts`

**Implementation Tasks**:
- [ ] T052 [US5] Verify `OPENING_RANGES` table is correct (already partially done in Phase 3)
- [ ] T053 [P] [US5] Implement smoothness requirements for 3-card hands
- [ ] T054 [P] [US5] Integrate tightness factor multiplier into range evaluation
- [ ] T055 [US5] Create integration tests for opening range adherence in `src/__tests__/CpuStrategy.test.ts`

---

## Phase 9: Core Decision Logic Integration

- [ ] T056 [P] Implement `CpuStrategy.getHighestRank()` helper method
- [ ] T057 [P] Implement `CpuStrategy.decideAction()` main dispatch method
- [ ] T058 [US1] [US2] [US3] [US4] [US5] Integrate all decision methods into unified `decideAction()` logic
- [ ] T059 [P] Ensure `decideDiscards()` remains unchanged and compatible
- [ ] T060 Create comprehensive integration tests for full decision flow in `src/__tests__/CpuStrategy.integration.test.ts`

---

## Phase 10: End-to-End Testing & Validation

### SC-001: Position Awareness (40-60% fold differential)
- [ ] T061 Create test simulating 100+ hands with position tracking in `src/__tests__/CpuStrategy.integration.test.ts`
- [ ] T062 Measure fold rate differential early vs late position, verify 40-60% threshold

### SC-002: CPU Win Rate (45-55% vs basic strategy)
- [ ] T063 Create tournament simulation (100+ hands) in `src/__tests__/integration.simulation.test.ts`
- [ ] T064 Run CPU vs human (basic strategy) simulation, measure win rate

### SC-003: Draw Reaction (30%+ raise rate increase)
- [ ] T065 Create test measuring raise frequency vs opponent draw counts in `src/__tests__/CpuStrategy.integration.test.ts`
- [ ] T066 Verify raise rate increase 30%+ when opponents draw 2+ vs standing pat

### SC-004: Snow Plays (15-20% frequency)
- [ ] T067 Create test tracking snow play execution frequency in `src/__tests__/CpuStrategy.integration.test.ts`
- [ ] T068 Verify snow plays occur in 15-20% of applicable situations

### SC-005: Opening Range Adherence (80%+)
- [ ] T069 Create test measuring opening range compliance over 500+ hands in `src/__tests__/CpuStrategy.integration.test.ts`
- [ ] T070 Verify 80%+ adherence to position-based ranges

### SC-006: Hand Duration Increase (1-2 more rounds)
- [ ] T071 Create test comparing average hand duration before/after in `src/__tests__/integration.simulation.test.ts`
- [ ] T072 Measure 1-2 round increase with pot odds-based continuation

### SC-007: Breakability Understanding (70%+ accuracy)
- [ ] T073 Create test tracking breakability decisions in applicable scenarios in `src/__tests__/CpuStrategy.integration.test.ts`
- [ ] T074 Verify 70%+ correct breaking of rough badugis vs standing pat

### SC-008: Overall Success (all SC pass)
- [ ] T075 Run full test suite to verify all SC-001～007 passing
- [ ] T076 Document test results and implementation completion

---

## Phase 11: Code Quality & Documentation

- [ ] T077 [P] Add comprehensive JSDoc comments to all public methods in `src/model/CpuStrategy.ts`
- [ ] T078 [P] Add JSDoc comments to new methods in `src/model/HandEvaluator.ts`
- [ ] T079 [P] Add JSDoc comments to `GameState.ts` draw tracking fields
- [ ] T080 Update `.github/copilot-instructions.md` with final CPU strategy implementation details
- [ ] T081 Update `quickstart.md` with actual test locations and results
- [ ] T082 Create or update `README.md` with CPU AI enhancement overview

---

## Phase 12: Polish & Optional Enhancements

- [ ] T083 [P] Verify TypeScript strict mode compliance (no `any` types)
- [ ] T084 [P] Run `npm run build` to verify no compilation errors
- [ ] T085 Performance profiling: verify all CPU decisions complete in <1ms
- [ ] T086 Code review checklist: Model-View separation, Deterministic logic, no Phaser in model
- [ ] T087 Final integration test: play 50+ hands manually, verify game behavior

---

## Task Statistics

| Phase | Description | Task Count | Story Tags |
|-------|-------------|-----------|-----------|
| 0 | Test Infrastructure | 2 | - |
| 1 | Data Structures | 6 | US1, US2 |
| 2 | Hand Evaluation | 5 | US3 |
| 3 | Position Awareness | 10 | US1 |
| 4 | Draw Intelligence | 6 | US2 |
| 5 | Breakability | 7 | US3 |
| 6 | Pot Odds | 7 | US2 |
| 7 | Snow Plays | 8 | US4 |
| 8 | Opening Selection | 8 | US5 |
| 9 | Core Integration | 5 | All |
| 10 | End-to-End Testing | 16 | All |
| 11 | Code Quality | 6 | - |
| 12 | Polish | 5 | - |
| **Total** | **87 tasks** | - | - |

---

## Dependency Graph

```
Phase 0: Test Infrastructure
    ↓
Phase 1: Data Structures (draw tracking)
    ↓
Phase 2: Hand Evaluation (breakability)
    ↓ ↓ ↓ ↓ ↓ (parallel)
Phase 3-8: Strategy Components (Position, Draw, Breakability, Snow, Pot Odds, Opening)
    ↓
Phase 9: Core Integration
    ↓
Phase 10: End-to-End Validation (SC-001～008)
    ↓
Phase 11: Code Quality
    ↓
Phase 12: Polish
```

## Parallel Execution Examples

### By User Story (Independent paths):
- **Path 1 (US1)**: T003→T004→T005 + T014→T015→T016-T024 (Position)
- **Path 2 (US2)**: T006→T007→T008 + T025→T026→T027-T031 + T038→T039→T040-T043 (Draws + Pot Odds)
- **Path 3 (US3)**: T009→T010→T011→T012→T013 + T032→T033→T034-T037 (Breakability)
- **Path 4 (US4)**: T044→T045→T046-T049 (Snow)
- **Path 5 (US5)**: T050→T051→T052-T055 (Opening Selection)

Can run Path 1-5 in parallel after Phase 2 completion.

### By File (within Phase):
- T003 + T004: Independent, can run in parallel
- T006 + T007: Independent (different methods), can run in parallel
- T009 + T010 + T011: Can parallelize interfaces + helper methods

---

## Execution Strategy

**Recommended MVP Scope** (Minimum Viable Product):
- Phase 0-2: Test + Data structures (9 tasks, ~4 hours)
- Phase 3-9: Core strategy implementation (58 tasks, ~16 hours)
- Phase 10: Validation (16 tasks, ~4 hours)
- **Total MVP**: 83/87 tasks (~24 hours)

**Full Scope** (All 87 tasks):
- Includes Phase 11-12 (code quality, polish)
- Additional 4 tasks (~2 hours)
- **Total**: ~26 hours

**Incremental Delivery**:
1. Complete Phase 0-1 (test framework + data structures)
2. Commit to main branch, test in dev environment
3. Complete Phase 3 (position awareness) - US1 complete
4. Phase 4-9 (remaining strategies) - US2-5 complete
5. Phase 10 (validation) - SC-001～008 verification
6. Phase 11-12 (polish) - production ready

---

## Notes

- **Testing Strategy**: Each phase includes unit tests before implementation (TDD approach)
- **Test Files Location**: `src/__tests__/` directory with corresponding test files
- **Mock/Factory Pattern**: Use helpers in `src/__tests__/helpers.ts` for game state setup
- **Constitution Compliance**: All changes confined to `src/model/` (Model-View separation maintained)
- **Determinism**: All pseudo-random logic uses game state hash seeding for reproducibility
- **Performance**: Target <1ms per CPU decision (no Monte Carlo, limited loops)

---

## Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Code Coverage | >80% | `vitest --coverage` |
| Build Success | 100% | `npm run build` |
| Test Pass Rate | 100% | `npm run test` |
| TypeScript Strict | No violations | `tsc --noEmit` |
| Runtime (per decision) | <1ms | Browser profiler |
| SC-001～008 | All pass | Phase 10 tests |

