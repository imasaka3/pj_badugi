# Feature Specification: Enhanced CPU AI Strategy

**Feature Branch**: `001-cpu-ai-enhancement`  
**Created**: 2025-12-06  
**Status**: Draft  
**Input**: User description: "CPUのAIの行動強化。現状のCPUはあまり良い出来とは言えない。Webからbadugiの戦略を調べ現在のCPUに組み込んでください"

## User Scenarios & Testing

### User Story 1 - Position-Aware CPU Betting (Priority: P1)

CPU opponents adjust their betting and drawing strategy based on their position relative to the dealer button. Early position players play tighter ranges (pat 8-high badugis or better, smooth 3-card hands with ace-low), while late position players can profitably play wider ranges (pat queen-high badugis, weaker 3-card hands).

**Why this priority**: Position is critical in Badugi strategy. Without position awareness, CPUs make consistently poor decisions that make the game too easy. This is the foundation of realistic AI behavior.

**Independent Test**: Can be tested by observing CPU actions across multiple hands - early position CPUs should fold more frequently and require stronger hands to raise, while late position CPUs should call/raise with wider ranges.

**Acceptance Scenarios**:

1. **Given** CPU is in early position with a rough badugi (K-high or worse), **When** facing a raise, **Then** CPU should fold
2. **Given** CPU is in late position with a smooth 3-card 7-high, **When** only one player has acted before, **Then** CPU should call or raise
3. **Given** CPU is on the button with a 2-card A-2, **When** all other players have folded, **Then** CPU should raise to steal blinds
4. **Given** CPU is in small blind with a weak 3-card hand, **When** big blind is only remaining player, **Then** CPU considers completing the bet cheaply

---

### User Story 2 - Drawing Intelligence Based on Opponent Actions (Priority: P1)

CPU opponents track how many cards opponents draw and use this information to estimate hand strength ranges. CPUs adjust their betting and drawing decisions based on opponent draw patterns.

**Why this priority**: Draw information is the primary hand-strength signal in Badugi. Current CPU completely ignores this critical information, making it play blindly.

**Independent Test**: Test by manually playing hands where you draw 2-3 cards - CPU should bet more aggressively knowing you're weak. When you stand pat, CPU should be more cautious.

**Acceptance Scenarios**:

1. **Given** CPU has a 7-high badugi, **When** opponent draws 2 cards on final draw, **Then** CPU should bet for value (opponent unlikely to complete better badugi)
2. **Given** CPU has a weak 3-card hand, **When** opponent stands pat from first draw, **Then** CPU should fold to any bet
3. **Given** CPU draws 1 card, **When** opponent draws 3+ cards, **Then** CPU should bet/raise to pressure weak range
4. **Given** multiple opponents draw 0-1 cards, **When** CPU has rough badugi, **Then** CPU should check/call rather than bet

---

### User Story 3 - Breakability-Based Drawing Decisions (Priority: P2)

CPU evaluates hand "breakability" when deciding whether to stand pat with marginal badugis or break them to draw to better hands. Smooth badugis (e.g., 10-5-2-A) have good breakability and can be broken on later draws if opponents show strength, while rough badugis (K-Q-J-10) have poor breakability.

**Why this priority**: Breakability adds strategic depth and prevents CPUs from overplaying weak made hands. It's a more advanced concept than position/draws but improves mid-strength hand play.

**Independent Test**: Observe CPU with 9-high or 10-high badugi facing aggressive opposition - CPU should break and draw if cards have good breakability, or fold if breakability is poor.

**Acceptance Scenarios**:

1. **Given** CPU has 10♠ 5♣ 2♦ A♥ (10-high badugi), **When** opponent stands pat and bets, **Then** CPU should consider breaking 10 to draw to 5-high
2. **Given** CPU has K♠ Q♣ J♦ 10♥ (king-high badugi), **When** opponent shows strength, **Then** CPU should fold (no improvement path)
3. **Given** CPU has 9♠ 7♣ 6♦ 2♥, **When** facing raise after first draw, **Then** CPU evaluates breaking 9 vs standing pat based on pot odds
4. **Given** CPU has smooth 3-card A-2-4, **When** on second draw, **Then** CPU draws one card rather than standing pat with weak badugi

---

### User Story 4 - Snowing (Bluffing by Standing Pat) (Priority: P3)

CPU occasionally executes "snow" plays by standing pat with weak or non-made hands (3-card hands) to represent strength and steal pots through aggressive betting.

**Why this priority**: Adds unpredictability and makes CPU harder to exploit. Lower priority because it requires more sophisticated game state tracking and can backfire if overused.

**Independent Test**: Track CPU hands that went to showdown - occasionally CPU should be caught bluffing with 3-card hands after standing pat.

**Acceptance Scenarios**:

1. **Given** CPU has 3-card hand after second draw, **When** opponents are drawing, **Then** CPU occasionally stands pat and bets final round (bluff frequency ~15-20%)
2. **Given** CPU pairs on second draw (e.g., 2♠ 4♥ Q♣ K♣), **When** opponent still drawing, **Then** CPU stands pat on final draw and bets
3. **Given** CPU is snowing, **When** opponent re-raises, **Then** CPU should fold (bluff failed)
4. **Given** CPU in late position with weak hand, **When** all opponents draw 2+, **Then** CPU considers snow play

---

### User Story 5 - Opening Hand Selection (Priority: P2)

CPU makes pre-draw decisions based on starting hand strength charts: strong 3-card hands (A-2-3, A-2-4, A-3-4, 2-3-4 suited differently) are played from any position; weak 3-card hands (7-high+) only from late position; 2-card hands (A-2, A-3, 2-3) only from late position; pat badugis 8-high or better played aggressively.

**Why this priority**: Prevents CPU from playing garbage hands and sets up better post-draw scenarios. Essential for realistic opening ranges.

**Independent Test**: Observe CPU pre-draw actions over 100+ hands - verify early position requires stronger starting hands than late position.

**Acceptance Scenarios**:

1. **Given** CPU in early position with 3-card 9-high, **When** pre-draw betting, **Then** CPU should fold to raises
2. **Given** CPU has pat 6-high badugi, **When** pre-draw, **Then** CPU should raise (strong opening hand)
3. **Given** CPU in late position with A♠ 2♣ (2-card hand), **When** no raises, **Then** CPU should call and draw 2
4. **Given** CPU has 3-card A-2-3, **When** pre-draw from any position, **Then** CPU should call/raise (premium starting hand)

---

### Edge Cases

- What happens when CPU has exactly 10 outs to complete badugi on final draw and is getting 3:1 pot odds? (Should call based on equity calculation)
- How does CPU handle situation where it has best possible badugi (A-2-3-4) but opponents' draw patterns suggest they could also have made badugis? (Should bet for value but be prepared for split pot)
- What if CPU is last to act on final draw with marginal hand and all opponents have stood pat? (Should fold unless pot odds are overwhelming)
- How does CPU adjust when multiple opponents show unusual patterns (e.g., drawing 4 cards twice)? (Recognize very weak ranges and apply pressure)
- What if CPU is all-in during tournament? (Skip betting phases but still participate in draws, drawing decisions still matter for showdown)

## Requirements

### Functional Requirements

- **FR-001**: System MUST implement position-aware betting strategy where early position requires stronger hands (pat 8-high+ badugis, smooth 3-card 6-high+) and late position can play wider ranges (pat Q-high badugis, 3-card 8-high+, strong 2-card hands)

- **FR-002**: System MUST track opponent draw counts at each draw phase and store this information in game state for CPU decision-making

- **FR-003**: CPU MUST adjust betting aggression based on opponent draw patterns: bet more aggressively against opponents drawing 2+ cards, play more cautiously against opponents standing pat or drawing 0-1

- **FR-004**: System MUST calculate hand "breakability" score for badugis by evaluating potential improvement paths when breaking the hand (count number of cards that would improve hand if broken)

- **FR-005**: CPU MUST evaluate whether to break marginal badugis (9-high through K-high) when facing aggression, considering breakability score and pot odds

- **FR-006**: System MUST implement "snow" (bluff) plays where CPU stands pat with weak hands at configurable frequency (15-20% of applicable situations)

- **FR-007**: CPU MUST use opening hand selection ranges based on position: 
  - Early position: Pat 8-high+ badugis, smooth 3-card 6-high or better
  - Middle position: Pat 9-high+ badugis, smooth 3-card 7-high or better  
  - Late position: Pat Q-high+ badugis, smooth 3-card 8-high or better, strong 2-card A-2/A-3/2-3

- **FR-008**: System MUST calculate pot odds when CPU faces bets and compare to equity estimates based on outs remaining

- **FR-009**: CPU MUST implement "smoothness" evaluation for multi-card hands where hands with lower cards and fewer gaps (A-2-4 vs A-2-9) are preferred

- **FR-010**: System MUST prevent CPU from re-raising pre-draw when drawing 2+ cards (information disadvantage outweighs fold equity)

- **FR-011**: CPU MUST recognize when opponents' betting patterns contradict their draw patterns and adjust suspicion level accordingly (e.g., opponent draws 2 then bets large - likely bluffing)

- **FR-012**: System MUST maintain separate strategy profiles for 6 CPU opponents with slight variations in aggression, bluff frequency, and tightness to create diverse player personalities

### Key Entities

- **DrawHistory**: Tracks number of cards each player drew at each draw phase (Draw1, Draw2, Draw3), used to estimate opponent hand strength ranges

- **HandStrengthRange**: Represents estimated range of possible hands for each player based on their actions (draws, bets, position)

- **PositionContext**: Contains information about player's position relative to dealer button, number of players remaining in hand, and action sequence

- **BreakabilityScore**: Numeric score (0-100) representing how many viable improvement paths exist if a made badugi is broken, calculated by counting non-pairing cards of missing suit

- **StrategyProfile**: CPU personality configuration including aggression factor (0.8-1.2), bluff frequency (10-25%), tightness multiplier (0.8-1.2) applied to base strategy

- **EquityCalculation**: Contains pot odds, estimated win probability based on outs, and recommended action (fold/call/raise)

## Success Criteria

### Measurable Outcomes

- **SC-001**: CPU opponents demonstrate position awareness by folding 40-60% more hands from early position compared to late position when holding equivalent hand strengths

- **SC-002**: CPU win rate against human players increases to 45-55% range (from current ~30-40% estimated) when human plays basic strategy, demonstrating competitive AI

- **SC-003**: CPU opponents successfully incorporate draw information by betting more aggressively (raise rate 30%+ higher) when opponents draw 2+ cards versus standing pat

- **SC-004**: CPU executes profitable snow plays in 15-20% of weak 3-card situations, measured by successfully stealing pots without showdown

- **SC-005**: CPU shows 80%+ adherence to opening hand range charts by position (verifiable through hand logging over 500+ hands)

- **SC-006**: Average hand duration increases by 1-2 betting rounds as CPUs become more willing to continue with drawing hands based on proper pot odds calculations

- **SC-007**: CPU demonstrates breakability understanding by correctly breaking rough badugis (9-high+) when facing aggression in 70%+ of applicable scenarios

- **SC-008**: Human player satisfaction improves based on game feeling more challenging and realistic (subjective, but measurable through playtesting feedback)

## Assumptions

- Fixed-limit betting structure remains unchanged (CPU strategy optimized for fixed-limit, not pot-limit or no-limit)
- 7-player game format (1 human + 6 CPU) is maintained
- Tournament structure with increasing blinds continues as-is
- CPU does not need to track detailed hand history beyond current hand (no long-term opponent modeling across multiple hands)
- CPU decision time remains instant (no artificial "thinking" delays added)
- Bluff frequencies are static percentages rather than dynamically adjusted based on opponent tendencies
- All CPUs use the same base strategy with personality variations, rather than distinct strategy types (e.g., "tight-aggressive" vs "loose-passive")
- Hand evaluation logic (`HandEvaluator`) remains deterministic and does not change

## Technical Notes

- New strategy logic should be added to `src/model/CpuStrategy.ts`
- May need to extend `GameState` to track draw history per player
- Consider adding position calculation utilities to `GameState` or `CpuStrategy`
- Breakability calculation may require new method in `HandEvaluator` or `CpuStrategy`
- CPU personality profiles could be stored as constants or configuration
- Pot odds calculations require access to `GameState.pot` and `GameState.currentBet`
- Opening hand ranges could be defined as lookup tables or rule-based logic
- Consider adding console logging for CPU decisions during development/debugging
