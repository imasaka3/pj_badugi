# Quickstart: Enhanced CPU AI Strategy Implementation

**Feature**: 001-cpu-ai-enhancement  
**For**: Developers implementing the CPU AI enhancement  
**Date**: 2025-12-06

## Overview

This guide walks through implementing professional Badugi poker strategy for CPU opponents. The enhancement adds position awareness, draw tracking, breakability analysis, bluffing, and opening hand selection to make CPU opponents more challenging and realistic.

## Prerequisites

- Familiarity with existing codebase (`src/model/` structure)
- Understanding of Badugi poker rules (see README.md)
- TypeScript strict mode knowledge
- Basic poker strategy concepts (position, pot odds, hand ranges)

## Implementation Order

Follow this sequence to minimize integration issues:

### Phase 1: Data Structure Foundations

**1. Extend Player interface for draw tracking**

File: `src/model/GameState.ts`

```typescript
export interface Player {
  // Existing fields...
  id: string;
  name: string;
  isCpu: boolean;
  chips: number;
  hand: Card[];
  currentRoundBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  lastAction: string | null;
  
  // ADD THIS:
  drawHistory: number[]; // [draw1, draw2, draw3]
}
```

**2. Initialize draw history in startHand()**

```typescript
startHand() {
  // ... existing code ...
  
  for (const p of this.players) {
    if (p.chips > 0) {
      p.hand = this.deck.deal(4);
      p.hasFolded = false;
      p.drawHistory = [0, 0, 0]; // ADD THIS
    } else {
      p.hand = [];
      p.hasFolded = true;
      p.drawHistory = [0, 0, 0]; // ADD THIS
    }
    // ... existing code ...
  }
}
```

**3. Track draws in draw() and standPat()**

```typescript
draw(cardsToDiscard: Card[]) {
  const player = this.getCurrentPlayer();
  
  // ADD THIS: Record draw count
  const drawCount = cardsToDiscard.length;
  if (this.phase === GamePhase.Draw1) player.drawHistory[0] = drawCount;
  else if (this.phase === GamePhase.Draw2) player.drawHistory[1] = drawCount;
  else if (this.phase === GamePhase.Draw3) player.drawHistory[2] = drawCount;
  
  // ... existing draw logic ...
}

standPat() {
  const player = this.getCurrentPlayer();
  
  // ADD THIS: Record standing pat as 0 draws
  if (this.phase === GamePhase.Draw1) player.drawHistory[0] = 0;
  else if (this.phase === GamePhase.Draw2) player.drawHistory[1] = 0;
  else if (this.phase === GamePhase.Draw3) player.drawHistory[2] = 0;
  
  player.lastAction = 'Stand Pat';
  this.logAction(player, 'Stand Pat');
  this.advanceTurn();
}
```

### Phase 2: HandEvaluator Extensions

**4. Add breakability calculation**

File: `src/model/HandEvaluator.ts`

```typescript
// Add after HandRank class
export interface BreakabilityScore {
  score: number;            // 0-91
  breakableCard: Card | null; // Highest card to break
  improveRanks: Rank[];     // Ranks that improve hand
}

export class HandEvaluator {
  // ... existing methods ...
  
  static calculateBreakability(hand: Card[], badugiRank: HandRank): BreakabilityScore {
    if (badugiRank.type !== HandType.Badugi) {
      return { score: 0, breakableCard: null, improveRanks: [] };
    }
    
    const usedSuits = new Set(badugiRank.cards.map(c => c.suit));
    const usedRanks = new Set(badugiRank.cards.map(c => c.rank));
    
    // Find missing suit
    const allSuits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
    const missingSuit = allSuits.find(s => !usedSuits.has(s))!;
    
    // Highest card is most breakable
    const sortedCards = [...badugiRank.cards].sort((a, b) => b.rank - a.rank);
    const breakableCard = sortedCards[0];
    
    // Calculate score from non-pairing ranks in missing suit
    const improveRanks: Rank[] = [];
    let score = 0;
    
    for (let rank = Rank.Ace; rank <= Rank.King; rank++) {
      if (!usedRanks.has(rank)) {
        improveRanks.push(rank);
        score += (14 - rank); // Lower ranks more valuable
      }
    }
    
    return { score, breakableCard, improveRanks };
  }
  
  static isSmooth(handRank: HandRank): boolean {
    if (handRank.cards.length < 2) return false;
    
    const sortedRanks = handRank.cards.map(c => c.rank).sort((a, b) => a - b);
    let totalGap = 0;
    
    for (let i = 1; i < sortedRanks.length; i++) {
      totalGap += sortedRanks[i] - sortedRanks[i-1];
    }
    
    const avgGap = totalGap / (sortedRanks.length - 1);
    return avgGap <= 3; // Smooth if average gap <= 3
  }
}
```

### Phase 3: CpuStrategy Core Structures

**5. Add strategy interfaces and constants**

File: `src/model/CpuStrategy.ts`

```typescript
import { Card, Rank, Suit } from './Card';
import { GameState, GamePhase, type Player } from './GameState';
import { HandEvaluator, HandType, HandRank } from './HandEvaluator';

// Strategy profile for CPU personalities
interface StrategyProfile {
  id: string;
  aggressionFactor: number;   // 0.8-1.2
  bluffFrequency: number;     // 0.10-0.25
  tightnessFactor: number;    // 0.8-1.2
}

const CPU_PROFILES: StrategyProfile[] = [
  { id: 'CPU 1', aggressionFactor: 0.9, bluffFrequency: 0.15, tightnessFactor: 1.1 },
  { id: 'CPU 2', aggressionFactor: 1.1, bluffFrequency: 0.20, tightnessFactor: 0.9 },
  { id: 'CPU 3', aggressionFactor: 1.0, bluffFrequency: 0.17, tightnessFactor: 1.0 },
  { id: 'CPU 4', aggressionFactor: 0.8, bluffFrequency: 0.12, tightnessFactor: 1.2 },
  { id: 'CPU 5', aggressionFactor: 1.2, bluffFrequency: 0.22, tightnessFactor: 0.8 },
  { id: 'CPU 6', aggressionFactor: 1.0, bluffFrequency: 0.18, tightnessFactor: 1.0 },
];

function getStrategyProfile(player: Player): StrategyProfile {
  const cpuNum = parseInt(player.id.replace(/\D/g, '')) || 1;
  const profileIndex = (cpuNum - 1) % CPU_PROFILES.length;
  return CPU_PROFILES[profileIndex];
}

type PositionCategory = 'early' | 'middle' | 'late';

function getPositionCategory(gameState: GameState, player: Player): PositionCategory {
  const activePlayers = gameState.players.filter(p => !p.hasFolded && (p.chips > 0 || p.isAllIn));
  const playerIndex = gameState.players.indexOf(player);
  const dealerIndex = gameState.dealerIndex;
  
  const relativePosition = (playerIndex - dealerIndex + gameState.players.length) % gameState.players.length;
  
  const earlyThreshold = Math.ceil(activePlayers.length / 3);
  const lateThreshold = Math.floor(activePlayers.length * 2 / 3);
  
  if (relativePosition < earlyThreshold) return 'early';
  if (relativePosition >= lateThreshold) return 'late';
  return 'middle';
}
```

**6. Add opening hand ranges**

```typescript
interface OpeningCriteria {
  maxHighCard: Rank;
  mustBeSmooth?: boolean;
  action: 'fold' | 'call' | 'raise';
}

const OPENING_RANGES = {
  early: {
    [HandType.Badugi]: { maxHighCard: Rank.Eight, action: 'raise' } as OpeningCriteria,
    [HandType.ThreeCard]: { maxHighCard: Rank.Six, mustBeSmooth: true, action: 'call' } as OpeningCriteria,
    [HandType.TwoCard]: { maxHighCard: Rank.Ace, action: 'fold' } as OpeningCriteria,
  },
  middle: {
    [HandType.Badugi]: { maxHighCard: Rank.Nine, action: 'raise' } as OpeningCriteria,
    [HandType.ThreeCard]: { maxHighCard: Rank.Seven, mustBeSmooth: true, action: 'call' } as OpeningCriteria,
    [HandType.TwoCard]: { maxHighCard: Rank.Ace, action: 'fold' } as OpeningCriteria,
  },
  late: {
    [HandType.Badugi]: { maxHighCard: Rank.Queen, action: 'raise' } as OpeningCriteria,
    [HandType.ThreeCard]: { maxHighCard: Rank.Eight, mustBeSmooth: false, action: 'call' } as OpeningCriteria,
    [HandType.TwoCard]: { maxHighCard: Rank.Three, action: 'call' } as OpeningCriteria, // Only A-2, A-3, 2-3
  },
};
```

### Phase 4: Enhanced Decision Logic

**7. Rewrite decideAction() method**

```typescript
export class CpuStrategy {
  static decideAction(gameState: GameState): string {
    const cpu = gameState.getCurrentPlayer();
    if (!cpu.isCpu) throw new Error("Current player is not CPU");
    
    const profile = getStrategyProfile(cpu);
    const position = getPositionCategory(gameState, cpu);
    const handRank = HandEvaluator.evaluate(cpu.hand);
    const phase = gameState.phase;
    
    // Draw phases
    if (phase === GamePhase.Draw1 || phase === GamePhase.Draw2 || phase === GamePhase.Draw3) {
      return 'Draw'; // Handled by decideDiscards
    }
    
    // Pre-draw betting (Betting1)
    if (phase === GamePhase.Betting1) {
      return this.decidePreDrawAction(gameState, cpu, handRank, position, profile);
    }
    
    // Post-draw betting
    return this.decidePostDrawAction(gameState, cpu, handRank, position, profile);
  }
  
  private static decidePreDrawAction(
    gameState: GameState,
    cpu: Player,
    handRank: HandRank,
    position: PositionCategory,
    profile: StrategyProfile
  ): string {
    const criteria = OPENING_RANGES[position][handRank.type];
    if (!criteria) return 'Fold';
    
    const highCard = this.getHighestRank(handRank);
    
    // Check if hand meets criteria
    if (highCard > criteria.maxHighCard * profile.tightnessFactor) {
      return 'Fold';
    }
    
    if (criteria.mustBeSmooth && !HandEvaluator.isSmooth(handRank)) {
      return 'Fold';
    }
    
    // Apply aggression factor
    if (criteria.action === 'raise' && Math.random() < profile.aggressionFactor) {
      if (gameState.betsInRound < 5) return 'Raise';
      return 'Call';
    }
    
    return criteria.action === 'fold' ? 'Fold' : 'Call';
  }
  
  private static decidePostDrawAction(
    gameState: GameState,
    cpu: Player,
    handRank: HandRank,
    position: PositionCategory,
    profile: StrategyProfile
  ): string {
    // Check for snow play opportunity
    if (this.shouldSnow(gameState, cpu, handRank, profile)) {
      return 'Call'; // Or 'Raise' if aggressive
    }
    
    // Strong badugi - bet for value
    if (handRank.type === HandType.Badugi) {
      const highCard = this.getHighestRank(handRank);
      if (highCard <= Rank.Eight) {
        if (gameState.betsInRound < 5 && Math.random() < profile.aggressionFactor) {
          return 'Raise';
        }
        return 'Call';
      }
      
      // Marginal badugi - check breakability
      const breakability = HandEvaluator.calculateBreakability(cpu.hand, handRank);
      if (this.shouldBreakBadugi(gameState, cpu, handRank, breakability)) {
        // Will break in next draw phase
        return 'Call';
      }
    }
    
    // Use pot odds for drawing decisions
    if (handRank.type < HandType.Badugi) {
      const outs = this.estimateOuts(handRank);
      const shouldCall = this.checkPotOdds(gameState, cpu, outs);
      return shouldCall ? 'Call' : 'Fold';
    }
    
    return 'Call';
  }
  
  private static shouldSnow(
    gameState: GameState,
    cpu: Player,
    handRank: HandRank,
    profile: StrategyProfile
  ): boolean {
    // Only snow with 3-card hands after second draw
    if (handRank.type !== HandType.ThreeCard) return false;
    if (gameState.phase < GamePhase.Betting3) return false;
    
    // Check if opponents are drawing
    const opponents = gameState.players.filter(p => p.id !== cpu.id && !p.hasFolded);
    const mostRecentDraw = opponents.every(opp => {
      const lastDraw = opp.drawHistory[opp.drawHistory.length - 1];
      return lastDraw > 0; // They drew cards
    });
    
    if (!mostRecentDraw) return false;
    
    // Deterministic pseudo-random based on game state
    const seed = gameState.pot + cpu.chips + gameState.currentBet;
    const hash = ((seed * 2654435761) % Math.pow(2, 32)) / Math.pow(2, 32);
    
    return hash < profile.bluffFrequency;
  }
  
  private static shouldBreakBadugi(
    gameState: GameState,
    cpu: Player,
    handRank: HandRank,
    breakability: { score: number; breakableCard: Card | null }
  ): boolean {
    const highCard = this.getHighestRank(handRank);
    
    // Don't break strong badugis
    if (highCard <= Rank.Seven) return false;
    
    // Only break if breakability score is good
    if (breakability.score < 40) return false; // Threshold
    
    // Check if opponents show strength
    const opponents = gameState.players.filter(p => p.id !== cpu.id && !p.hasFolded);
    const opponentsStrongCount = opponents.filter(opp => {
      const lastDraw = opp.drawHistory[opp.drawHistory.length - 1];
      return lastDraw === 0 || lastDraw === 1; // Pat or drawing 1
    }).length;
    
    return opponentsStrongCount >= 2; // Multiple opponents show strength
  }
  
  private static checkPotOdds(gameState: GameState, cpu: Player, outs: number): boolean {
    const betToCall = gameState.currentBet - cpu.currentRoundBet;
    if (betToCall === 0) return true; // Free to check
    
    const potOdds = gameState.pot / betToCall;
    const cardsRemaining = 52 - (4 * gameState.players.filter(p => !p.hasFolded).length);
    const winProbability = outs / cardsRemaining;
    const requiredEquity = 1 / (potOdds + 1);
    
    return winProbability >= requiredEquity;
  }
  
  private static estimateOuts(handRank: HandRank): number {
    if (handRank.type === HandType.ThreeCard) return 10; // Typical outs to complete
    if (handRank.type === HandType.TwoCard) return 20;
    return 30; // Very weak hand
  }
  
  private static getHighestRank(handRank: HandRank): Rank {
    let max = 0;
    for (const c of handRank.cards) {
      if (c.rank > max) max = c.rank;
    }
    return max as Rank;
  }
  
  // Keep existing decideDiscards method with minor enhancements
  static decideDiscards(hand: Card[]): Card[] {
    const handRank = HandEvaluator.evaluate(hand);
    const bestCards = handRank.cards;
    return hand.filter(c => !bestCards.includes(c));
  }
}
```

## Testing Checklist

### Automated Unit Tests (Vitest)

With Vitest framework now available, the following can be automated:

1. **Position awareness** (SC-001): 
   - Test `getPositionCategory()` returns correct tier for each position
   - Verify opening ranges vary by position (tight early, loose late)

2. **Draw tracking** (SC-002):
   - Test `drawHistory` initialization in `startHand()`
   - Verify draw counts recorded correctly in `draw()` and `standPat()`

3. **Breakability calculation** (SC-007):
   - Test `calculateBreakability()` returns score 0-91
   - Verify `shouldBreakBadugi()` logic with mock game states

4. **Snow plays** (SC-004):
   - Test `shouldSnow()` returns true ~15-20% of time
   - Verify snow only triggered after Draw2 with 3-card hands

5. **Opening ranges** (SC-005):
   - Test `decidePreDrawAction()` against `OPENING_RANGES` lookup
   - Verify fold/call/raise decisions match position and hand type

6. **Pot odds** (SC-003 & SC-006):
   - Test `checkPotOdds()` with various pot/bet/outs combinations
   - Verify equity calculations correct

### Manual Integration Tests

1. Play 50+ hands and verify CPUs fold more from early position
2. Play 100+ hands tournament and track CPU win rate (SC-002 target: 45-55%)
3. Verify no crashes or infinite loops during tournament play
4. Confirm game feels more challenging than before

### Test Success Criteria

All 8 success criteria can be verified through combination of Vitest unit tests + manual integration testing:
- **SC-001 through SC-007**: Automated via targeted unit tests
- **SC-008**: Automatically satisfied when SC-001～007 all pass

## Common Pitfalls

1. **Off-by-one errors in drawHistory indexing**: Draw phases are 1/2/3 but array is 0-indexed
2. **Forgetting to reset drawHistory**: Must reset at start of each hand
3. **Division by zero in pot odds**: Check betToCall !== 0
4. **Type mismatches**: Ensure Rank comparisons use numeric values
5. **Infinite loops in position calculation**: Modulo arithmetic can be tricky

## Debugging Tips

Add console.log statements:

```typescript
console.log(`CPU ${cpu.name} position: ${position}, hand: ${handRank.toString()}, action: ${action}`);
console.log(`Draw history:`, gameState.players.map(p => ({ name: p.name, draws: p.drawHistory })));
```

## Performance Considerations

- All calculations should complete in <1ms per decision
- No loops over full deck (use mathematical calculations)
- Avoid complex simulations (no Monte Carlo)
- Profile CPU if decisions feel sluggish

## Next Steps

After implementation:
1. Run `/speckit.tasks` to generate implementation tasks
2. Begin implementing in order: Phase 1 → Phase 2 → Phase 3 → Phase 4
3. Test incrementally after each phase
4. Update this document with lessons learned

## Questions?

Refer to:
- `spec.md` for requirements
- `research.md` for strategy decisions
- `data-model.md` for data structure details
- `.github/copilot-instructions.md` for project patterns
