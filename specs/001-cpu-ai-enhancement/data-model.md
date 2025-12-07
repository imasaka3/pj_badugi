# Data Model: Enhanced CPU AI Strategy

**Feature**: 001-cpu-ai-enhancement  
**Phase**: 1 - Design & Contracts  
**Date**: 2025-12-06

## Overview

This document defines the data structures and interfaces required to implement enhanced CPU AI strategy for Badugi poker. All structures maintain strict Model-View separation and contain no Phaser dependencies.

---

## Entity: DrawHistory

**Purpose**: Track number of cards each player drew at each draw phase to enable draw-based strategy decisions.

**Location**: Extension to existing `Player` interface in `GameState.ts`

```typescript
interface Player {
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
  
  // NEW: Draw tracking
  drawHistory: number[]; // [draw1Count, draw2Count, draw3Count]
}
```

**Initialization**: `drawHistory: [0, 0, 0]` when hand starts

**Update Points**:
- `GameState.draw()`: Set `drawHistory[phaseIndex]` to `cardsToDiscard.length`
- `GameState.standPat()`: Set `drawHistory[phaseIndex]` to `0`
- `GameState.startHand()`: Reset to `[0, 0, 0]`

**Validation Rules**:
- Each element range: 0-4 (can't draw more than 4 cards)
- Length always 3 (fixed number of draw phases)

---

## Entity: PositionContext

**Purpose**: Encapsulate position-related information for strategy decisions.

**Location**: Utility interface in `CpuStrategy.ts`

```typescript
interface PositionContext {
  readonly positionCategory: 'early' | 'middle' | 'late';
  readonly relativePosition: number;        // 0-based seat distance from dealer
  readonly activePlayers: number;           // Total players not folded/eliminated
  readonly playerIndex: number;             // Current player's index
  readonly dealerIndex: number;             // Dealer button position
}
```

**Construction**: Helper function in `CpuStrategy`

```typescript
function getPositionContext(gameState: GameState, player: Player): PositionContext {
  const activePlayers = gameState.players.filter(p => !p.hasFolded && (p.chips > 0 || p.isAllIn)).length;
  const dealerIndex = gameState.dealerIndex;
  const playerIndex = gameState.players.indexOf(player);
  
  const relativePosition = (playerIndex - dealerIndex + gameState.players.length) % gameState.players.length;
  
  const earlyThreshold = Math.ceil(activePlayers / 3);
  const lateThreshold = Math.floor(activePlayers * 2 / 3);
  
  let positionCategory: 'early' | 'middle' | 'late';
  if (relativePosition < earlyThreshold) positionCategory = 'early';
  else if (relativePosition >= lateThreshold) positionCategory = 'late';
  else positionCategory = 'middle';
  
  return { positionCategory, relativePosition, activePlayers, playerIndex, dealerIndex };
}
```

---

## Entity: HandStrengthRange

**Purpose**: Estimate opponent hand strength based on observable actions.

**Location**: Internal to `CpuStrategy.ts`

```typescript
interface HandStrengthRange {
  readonly playerId: string;
  readonly minHandType: HandType;           // Minimum likely hand type (1-4 card)
  readonly maxHighCard: Rank;               // Maximum likely high card
  readonly confidence: number;              // 0-1, how certain is this estimate
}
```

**Derivation Logic**:

```typescript
function estimateOpponentRange(opponent: Player, gameState: GameState): HandStrengthRange {
  const drawHistory = opponent.drawHistory;
  const lastDraw = drawHistory[drawHistory.length - 1];
  
  // Standing pat suggests badugi
  if (lastDraw === 0) {
    return {
      playerId: opponent.id,
      minHandType: HandType.Badugi,
      maxHighCard: Rank.King, // Could be any badugi
      confidence: 0.7
    };
  }
  
  // Drawing 1 suggests strong 3-card
  if (lastDraw === 1) {
    return {
      playerId: opponent.id,
      minHandType: HandType.ThreeCard,
      maxHighCard: Rank.Eight, // Likely smooth
      confidence: 0.6
    };
  }
  
  // Drawing 2+ suggests weak hand
  return {
    playerId: opponent.id,
    minHandType: HandType.TwoCard,
    maxHighCard: Rank.King,
    confidence: 0.5
  };
}
```

---

## Entity: BreakabilityScore

**Purpose**: Quantify how easily a badugi can be broken to improve.

**Location**: Utility function in `HandEvaluator.ts` or `CpuStrategy.ts`

```typescript
interface BreakabilityScore {
  readonly hand: Card[];
  readonly badugiRank: HandRank;
  readonly score: number;                   // 0-91, higher = more breakable
  readonly breakableCards: Card[];          // Cards that could be discarded
  readonly improveRanks: Rank[];            // Ranks that would improve hand if drawn
}
```

**Calculation**:

```typescript
function calculateBreakability(hand: Card[], badugiRank: HandRank): BreakabilityScore {
  if (badugiRank.type !== HandType.Badugi) {
    return {
      hand,
      badugiRank,
      score: 0,
      breakableCards: [],
      improveRanks: []
    };
  }
  
  const usedSuits = new Set(badugiRank.cards.map(c => c.suit));
  const usedRanks = new Set(badugiRank.cards.map(c => c.rank));
  
  // Find missing suit
  const allSuits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
  const missingSuit = allSuits.find(s => !usedSuits.has(s))!;
  
  // Find highest card (most breakable)
  const sortedCards = [...badugiRank.cards].sort((a, b) => b.rank - a.rank);
  const breakableCards = [sortedCards[0]]; // Typically break highest card
  
  // Calculate improvement ranks (non-pairing cards in missing suit)
  const improveRanks: Rank[] = [];
  let score = 0;
  
  for (let rank = Rank.Ace; rank <= Rank.King; rank++) {
    if (!usedRanks.has(rank)) {
      improveRanks.push(rank);
      score += (14 - rank); // Lower ranks worth more
    }
  }
  
  return { hand, badugiRank, score, breakableCards, improveRanks };
}
```

---

## Entity: StrategyProfile

**Purpose**: Define CPU personality parameters for diverse opponent behavior.

**Location**: Constants in `CpuStrategy.ts`

```typescript
interface StrategyProfile {
  readonly id: string;
  readonly aggressionFactor: number;        // 0.8-1.2, multiplies bet/raise probability
  readonly bluffFrequency: number;          // 0.10-0.25, base snow play frequency
  readonly tightnessFactor: number;         // 0.8-1.2, multiplies hand strength requirements
}

const CPU_PROFILES: ReadonlyArray<StrategyProfile> = [
  { id: 'CPU 1', aggressionFactor: 0.9, bluffFrequency: 0.15, tightnessFactor: 1.1 },
  { id: 'CPU 2', aggressionFactor: 1.1, bluffFrequency: 0.20, tightnessFactor: 0.9 },
  { id: 'CPU 3', aggressionFactor: 1.0, bluffFrequency: 0.17, tightnessFactor: 1.0 },
  { id: 'CPU 4', aggressionFactor: 0.8, bluffFrequency: 0.12, tightnessFactor: 1.2 },
  { id: 'CPU 5', aggressionFactor: 1.2, bluffFrequency: 0.22, tightnessFactor: 0.8 },
  { id: 'CPU 6', aggressionFactor: 1.0, bluffFrequency: 0.18, tightnessFactor: 1.0 },
] as const;
```

**Assignment**: Map CPU player ID to profile by index

```typescript
function getStrategyProfile(player: Player): StrategyProfile {
  // Extract CPU number from player.id (e.g., "cpu1" -> 1)
  const cpuNum = parseInt(player.id.replace(/\D/g, '')) || 1;
  const profileIndex = (cpuNum - 1) % CPU_PROFILES.length;
  return CPU_PROFILES[profileIndex];
}
```

---

## Entity: EquityCalculation

**Purpose**: Encapsulate pot odds and equity math for calling decisions.

**Location**: Utility interface in `CpuStrategy.ts`

```typescript
interface EquityCalculation {
  readonly pot: number;
  readonly betToCall: number;
  readonly potOdds: number;                 // pot / betToCall
  readonly estimatedOuts: number;           // Cards that improve hand
  readonly cardsRemaining: number;          // Deck size - cards seen
  readonly winProbability: number;          // outs / cardsRemaining
  readonly requiredEquity: number;          // 1 / (potOdds + 1)
  readonly shouldCall: boolean;             // winProbability >= requiredEquity
}
```

**Calculation**:

```typescript
function calculateEquity(gameState: GameState, player: Player, outs: number): EquityCalculation {
  const pot = gameState.pot;
  const betToCall = gameState.currentBet - player.currentRoundBet;
  
  if (betToCall === 0) {
    return {
      pot,
      betToCall: 0,
      potOdds: Infinity,
      estimatedOuts: outs,
      cardsRemaining: 52,
      winProbability: 1.0,
      requiredEquity: 0,
      shouldCall: true // Free to check
    };
  }
  
  const potOdds = pot / betToCall;
  
  // Estimate cards remaining (rough approximation)
  const cardsPerPlayer = 4;
  const activePlayers = gameState.players.filter(p => !p.hasFolded).length;
  const cardsRemaining = 52 - (cardsPerPlayer * activePlayers);
  
  const winProbability = outs / cardsRemaining;
  const requiredEquity = 1 / (potOdds + 1);
  const shouldCall = winProbability >= requiredEquity;
  
  return {
    pot,
    betToCall,
    potOdds,
    estimatedOuts: outs,
    cardsRemaining,
    winProbability,
    requiredEquity,
    shouldCall
  };
}
```

---

## Entity: OpeningHandRange

**Purpose**: Define playable starting hands by position.

**Location**: Lookup tables in `CpuStrategy.ts`

```typescript
interface OpeningHandCriteria {
  readonly minHandType: HandType;
  readonly maxHighCard: Rank;
  readonly mustBeSmooth?: boolean;          // Lower cards preferred
  readonly action: 'fold' | 'call' | 'raise';
}

interface OpeningHandRanges {
  readonly early: {
    readonly patBadugi: OpeningHandCriteria;
    readonly threeCard: OpeningHandCriteria;
    readonly twoCard: OpeningHandCriteria;
  };
  readonly middle: {
    readonly patBadugi: OpeningHandCriteria;
    readonly threeCard: OpeningHandCriteria;
    readonly twoCard: OpeningHandCriteria;
  };
  readonly late: {
    readonly patBadugi: OpeningHandCriteria;
    readonly threeCard: OpeningHandCriteria;
    readonly twoCard: OpeningHandCriteria;
  };
}

const OPENING_RANGES: OpeningHandRanges = {
  early: {
    patBadugi: { minHandType: HandType.Badugi, maxHighCard: Rank.Eight, action: 'raise' },
    threeCard: { minHandType: HandType.ThreeCard, maxHighCard: Rank.Six, mustBeSmooth: true, action: 'call' },
    twoCard: { minHandType: HandType.TwoCard, maxHighCard: Rank.Ace, action: 'fold' }
  },
  middle: {
    patBadugi: { minHandType: HandType.Badugi, maxHighCard: Rank.Nine, action: 'raise' },
    threeCard: { minHandType: HandType.ThreeCard, maxHighCard: Rank.Seven, mustBeSmooth: true, action: 'call' },
    twoCard: { minHandType: HandType.TwoCard, maxHighCard: Rank.Ace, action: 'fold' }
  },
  late: {
    patBadugi: { minHandType: HandType.Badugi, maxHighCard: Rank.Queen, action: 'raise' },
    threeCard: { minHandType: HandType.ThreeCard, maxHighCard: Rank.Eight, mustBeSmooth: false, action: 'call' },
    twoCard: { minHandType: HandType.TwoCard, maxHighCard: Rank.Three, action: 'call' } // Only A-2, A-3, 2-3
  }
} as const;
```

**Smoothness Check**:

```typescript
function isSmooth(handRank: HandRank): boolean {
  if (handRank.cards.length < 2) return false;
  
  const sortedRanks = handRank.cards.map(c => c.rank).sort((a, b) => a - b);
  
  // Check gaps between cards (prefer smaller gaps)
  let totalGap = 0;
  for (let i = 1; i < sortedRanks.length; i++) {
    totalGap += sortedRanks[i] - sortedRanks[i-1];
  }
  
  // Average gap should be <= 3 for smooth hands
  const avgGap = totalGap / (sortedRanks.length - 1);
  return avgGap <= 3;
}
```

---

## State Transitions

### Draw Phase Flow

```
Player draws cards
  ↓
Update Player.drawHistory[phaseIndex]
  ↓
Next player's turn
  ↓
All players acted
  ↓
Next betting phase
```

### Strategy Decision Flow

```
CPU turn begins
  ↓
Get PositionContext
  ↓
Get StrategyProfile
  ↓
Evaluate hand (HandEvaluator)
  ↓
Calculate BreakabilityScore (if badugi)
  ↓
Check opponents' DrawHistory
  ↓
Estimate HandStrengthRanges
  ↓
Calculate EquityCalculation
  ↓
Decide action (fold/call/raise/draw)
  ↓
Execute action
```

---

## Validation Rules

### DrawHistory
- Must be array of exactly 3 numbers
- Each number 0-4 inclusive
- Reset to [0, 0, 0] at start of each hand

### PositionContext
- `relativePosition` must be 0 <= n < total players
- `positionCategory` must be 'early', 'middle', or 'late'
- `activePlayers` >= 2 (minimum for game to continue)

### BreakabilityScore
- `score` range: 0-91 (sum of weights for Ace through King)
- Only applicable to 4-card badugis
- `improveRanks` excludes ranks already in hand

### StrategyProfile
- `aggressionFactor` range: 0.8-1.2
- `bluffFrequency` range: 0.10-0.25
- `tightnessFactor` range: 0.8-1.2

### EquityCalculation
- `potOdds` >= 0 (Infinity if betToCall = 0)
- `winProbability` range: 0-1
- `requiredEquity` range: 0-1
- `shouldCall` = true if winProbability >= requiredEquity

---

## Integration Points

### GameState.ts Modifications
1. Add `drawHistory: number[]` to `Player` interface
2. Update `draw()` method to record draw count
3. Update `standPat()` method to record 0 draws
4. Reset `drawHistory` in `startHand()`

### HandEvaluator.ts Additions
1. Add `calculateBreakability()` static method
2. Add `isSmooth()` helper for hand evaluation

### CpuStrategy.ts Major Refactor
1. Add all new interfaces and constants
2. Implement position awareness in `decideAction()`
3. Implement draw tracking in both methods
4. Add breakability checks for marginal badugis
5. Implement snow plays in `decideAction()`
6. Implement opening hand ranges pre-draw
7. Add pot odds calculations for calling decisions
8. Assign strategy profiles per CPU

---

## No External Contracts

This feature is entirely internal to the game model. No REST APIs, GraphQL endpoints, or external interfaces required. All changes are within the TypeScript model layer.
