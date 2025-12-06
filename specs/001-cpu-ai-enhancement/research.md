# Research: Enhanced CPU AI Strategy

**Feature**: 001-cpu-ai-enhancement  
**Phase**: 0 - Research & Decision Making  
**Date**: 2025-12-06

## Overview

This document consolidates research findings for implementing professional-level Badugi poker strategy in CPU opponents. Research sources include PokerNews.com Badugi rules/strategy guide, Wikipedia Badugi article, and established poker AI principles.

## Decision 1: Position-Based Strategy Implementation

**Decision**: Implement position awareness using relative seat distance from dealer button with three position categories (early/middle/late).

**Rationale**: 
- Position is cited as "HUGE" in Badugi strategy across multiple sources
- Later position provides information advantage (see opponent draws and bets before acting)
- George Danzer (WSOP bracelet winner) explicitly advises against drawing 3-4 cards from early position
- Three-tier system (early/middle/late) balances complexity vs. implementation simplicity

**Alternatives Considered**:
- **Binary position (early/late only)**: Rejected - Too coarse-grained, misses nuanced middle position strategy
- **Per-seat position adjustments**: Rejected - Overly complex for 7-player game, minimal strategic benefit
- **No position awareness**: Rejected - Current approach, produces unrealistic play patterns

**Implementation Approach**:
```typescript
// Calculate position relative to dealer
function getPositionCategory(playerIndex: number, dealerIndex: number, activePlayers: number): 'early' | 'middle' | 'late' {
  const relativePosition = (playerIndex - dealerIndex + activePlayers) % activePlayers;
  const earlyThreshold = Math.ceil(activePlayers / 3);
  const lateThreshold = Math.floor(activePlayers * 2 / 3);
  
  if (relativePosition < earlyThreshold) return 'early';
  if (relativePosition >= lateThreshold) return 'late';
  return 'middle';
}
```

---

## Decision 2: Draw Tracking Mechanism

**Decision**: Track draw counts per player per phase in GameState, accessible to CpuStrategy via game state reference.

**Rationale**:
- Draw count is "crucial indicator of hand strength" - primary information source in Badugi
- Opponents drawing 2+ cards are weak; standing pat indicates strength
- Information enables pot odds calculations and bluff detection
- GameState is natural storage location (already tracks player actions)

**Alternatives Considered**:
- **CpuStrategy internal tracking**: Rejected - Violates single source of truth principle, error-prone
- **Derive from hand history**: Rejected - No hand history beyond current hand per spec assumptions
- **No tracking**: Rejected - Blind play without critical information

**Implementation Approach**:
```typescript
// In GameState.ts
interface Player {
  // ... existing fields
  drawHistory: number[]; // [draw1Count, draw2Count, draw3Count]
}

// Update in draw methods
draw(cardsToDiscard: Card[]) {
  const player = this.getCurrentPlayer();
  const drawCount = cardsToDiscard.length;
  
  // Store draw count for current phase
  if (this.phase === GamePhase.Draw1) player.drawHistory[0] = drawCount;
  else if (this.phase === GamePhase.Draw2) player.drawHistory[1] = drawCount;
  else if (this.phase === GamePhase.Draw3) player.drawHistory[2] = drawCount;
  
  // ... existing draw logic
}
```

---

## Decision 3: Breakability Calculation Algorithm

**Decision**: Calculate breakability as count of non-pairing cards in the missing suit, weighted by card rank (lower ranks = better breakability).

**Rationale**:
- "Breakability refers to the smoothness of hands when replacing cards" (Wikipedia)
- Example: 10♠5♣2♦A♦ can break 10 and improve to 5-high; K♠Q♣J♦10♦ cannot meaningfully improve
- Lower card breakability more valuable (A-2-4 breaking 9 better than 9-8-7 breaking 9)
- Enables strategic decision between standing pat with rough badugi vs. drawing to better hand

**Alternatives Considered**:
- **Simple boolean (breakable/not)**: Rejected - Misses nuance of how good the breakability is
- **Monte Carlo simulation**: Rejected - Too computationally expensive, violates instant decision requirement
- **Equity calculation against range**: Rejected - Requires opponent modeling beyond spec scope

**Implementation Approach**:
```typescript
// In HandEvaluator.ts or CpuStrategy.ts
function calculateBreakability(hand: Card[], badugiRank: HandRank): number {
  if (badugiRank.type !== HandType.Badugi) return 0; // Only applies to badugis
  
  const usedSuits = new Set(badugiRank.cards.map(c => c.suit));
  const usedRanks = new Set(badugiRank.cards.map(c => c.rank));
  const missingSuit = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs]
    .find(s => !usedSuits.has(s))!;
  
  // Count cards of missing suit that don't pair existing ranks
  let breakabilityScore = 0;
  for (let rank = Rank.Ace; rank <= Rank.King; rank++) {
    if (!usedRanks.has(rank)) {
      // Weight lower ranks higher (Ace=13, King=1)
      breakabilityScore += (14 - rank);
    }
  }
  
  return breakabilityScore; // Range: 0-91 (sum of 1-13)
}
```

---

## Decision 4: Bluff (Snow) Frequency Implementation

**Decision**: Implement bluffing at 15-20% frequency using deterministic pseudo-randomness seeded from game state hash.

**Rationale**:
- "Snowing in Badugi is standing pat with weak or non-made hands" - advanced strategy
- Fixed-limit reduces bluff profitability (good pot odds for opponents), so moderate frequency
- Deterministic randomness ensures reproducibility for identical game states (constitution requirement)
- 15-20% frequency cited in spec as target range

**Alternatives Considered**:
- **True randomness (Math.random())**: Rejected - Violates deterministic game logic requirement
- **Dynamic frequency based on opponent tendencies**: Rejected - No cross-hand memory per spec assumptions
- **No bluffing**: Rejected - Makes CPU too predictable and exploitable
- **Higher frequency (30%+)**: Rejected - Inappropriate for fixed-limit structure

**Implementation Approach**:
```typescript
// Deterministic pseudo-random based on game state
function shouldBluff(gameState: GameState, player: Player, baseFrequency: number): boolean {
  // Create deterministic seed from game state
  const seed = gameState.pot + player.chips + gameState.currentBet + 
               gameState.phase + gameState.dealerIndex;
  
  // Simple deterministic hash
  const hash = ((seed * 2654435761) % Math.pow(2, 32)) / Math.pow(2, 32);
  
  return hash < baseFrequency;
}
```

---

## Decision 5: Opening Hand Range Structure

**Decision**: Implement as lookup table mapping hand strength + position to action recommendation (fold/call/raise).

**Rationale**:
- Clear, maintainable structure for complex decision logic
- Enables easy tuning of ranges based on playtesting
- Matches professional poker range chart conventions
- Efficient lookup (O(1) after hand evaluation)

**Alternatives Considered**:
- **Rule-based if/else chains**: Rejected - Hard to maintain, unclear strategy
- **Neural network**: Rejected - Overkill, training complexity, non-deterministic
- **External configuration file**: Rejected - Overkill for this feature scope (could be future enhancement)

**Implementation Approach**:
```typescript
// Opening hand ranges by position
const OPENING_RANGES = {
  early: {
    patBadugi: { minHighCard: Rank.Eight, action: 'raise' },
    threeCard: { minHighCard: Rank.Six, mustBeSmooth: true, action: 'call' },
    twoCard: { action: 'fold' } // Too weak from early
  },
  middle: {
    patBadugi: { minHighCard: Rank.Nine, action: 'raise' },
    threeCard: { minHighCard: Rank.Seven, mustBeSmooth: true, action: 'call' },
    twoCard: { action: 'fold' }
  },
  late: {
    patBadugi: { minHighCard: Rank.Queen, action: 'raise' },
    threeCard: { minHighCard: Rank.Eight, mustBeSmooth: false, action: 'call' },
    twoCard: { strongOnly: ['A-2', 'A-3', '2-3'], action: 'call' }
  }
};
```

---

## Decision 6: CPU Personality Variation

**Decision**: Create 6 strategy profiles with ±20% variation in aggression, bluff frequency, and tightness multipliers.

**Rationale**:
- Prevents all CPUs from playing identically (more realistic, harder to exploit)
- Small variations maintain strategic soundness while adding diversity
- Simple multiplicative factors avoid complex per-CPU strategy implementations
- Matches spec requirement (FR-012)

**Alternatives Considered**:
- **Distinct strategy types (TAG/LAG/etc.)**: Rejected - Too complex, beyond feature scope
- **Random personalities each game**: Rejected - Violates deterministic requirement
- **Identical CPUs**: Rejected - Unrealistic, easier to exploit

**Implementation Approach**:
```typescript
interface StrategyProfile {
  id: string;
  aggressionFactor: number;  // 0.8-1.2, multiplies bet/raise frequency
  bluffFrequency: number;    // 0.10-0.25, base frequency for snow plays
  tightnessFactor: number;   // 0.8-1.2, multiplies hand strength requirements
}

const CPU_PROFILES: StrategyProfile[] = [
  { id: 'CPU 1', aggressionFactor: 0.9, bluffFrequency: 0.15, tightnessFactor: 1.1 },  // Slightly tight
  { id: 'CPU 2', aggressionFactor: 1.1, bluffFrequency: 0.20, tightnessFactor: 0.9 },  // Slightly loose-aggressive
  { id: 'CPU 3', aggressionFactor: 1.0, bluffFrequency: 0.17, tightnessFactor: 1.0 },  // Balanced
  { id: 'CPU 4', aggressionFactor: 0.8, bluffFrequency: 0.12, tightnessFactor: 1.2 },  // Very tight
  { id: 'CPU 5', aggressionFactor: 1.2, bluffFrequency: 0.22, tightnessFactor: 0.8 },  // Aggressive
  { id: 'CPU 6', aggressionFactor: 1.0, bluffFrequency: 0.18, tightnessFactor: 1.0 },  // Balanced
];
```

---

## Decision 7: Pot Odds Calculation Method

**Decision**: Calculate pot odds as simple ratio (pot size / bet to call), compare to estimated win probability based on outs.

**Rationale**:
- Standard poker mathematics approach
- Outs can be precisely calculated (10 outs to complete badugi from 3-card hand)
- Enables correct calling decisions with drawing hands
- Simple enough for instant calculation

**Alternatives Considered**:
- **Equity simulation**: Rejected - Too slow, violates instant decision requirement
- **Fixed calling threshold**: Rejected - Ignores pot size, suboptimal
- **No pot odds consideration**: Rejected - Current approach, leads to poor draws

**Implementation Approach**:
```typescript
function calculatePotOdds(gameState: GameState): number {
  const betToCall = gameState.currentBet - getCurrentPlayer().currentRoundBet;
  if (betToCall === 0) return Infinity; // No bet to call
  
  return gameState.pot / betToCall;
}

function estimateOuts(hand: Card[], currentRank: HandRank): number {
  if (currentRank.type === HandType.Badugi) return 0; // Already made
  
  // For 3-card hand, 10 outs to complete badugi (missing suit, non-pairing ranks)
  if (currentRank.type === HandType.ThreeCard) {
    const usedRanks = new Set(currentRank.cards.map(c => c.rank));
    return 13 - usedRanks.size; // Typically ~10
  }
  
  // For 2-card hand, estimate based on smoothness
  return currentRank.type === HandType.TwoCard ? 20 : 30;
}

function shouldCallDraw(potOdds: number, outs: number, cardsRemaining: number): boolean {
  const winProbability = outs / cardsRemaining;
  const requiredEquity = 1 / (potOdds + 1);
  return winProbability >= requiredEquity;
}
```

---

## Research Validation

All decisions align with professional Badugi strategy sources:

1. **PokerNews.com**: "Position is HUGE", "Watch how many cards your opponents draw", "Don't overplay high Badugis"
2. **Wikipedia**: "Breakability refers to smoothness when replacing cards", "Position is an important factor"
3. **Fixed-Limit Context**: "Players bluff less in Badugi" (good pot odds), "Tight is still right"

No unresolved NEEDS CLARIFICATION items. All technical approaches compatible with existing codebase architecture.

## Next Steps

Proceed to Phase 1:
1. Create `data-model.md` defining data structures (DrawHistory, PositionContext, etc.)
2. Document `quickstart.md` for developers implementing the strategy
3. Update `.github/copilot-instructions.md` with CPU strategy patterns
