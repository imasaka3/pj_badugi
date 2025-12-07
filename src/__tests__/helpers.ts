/**
 * Test Helpers and Factories
 * 
 * Provides mock objects, card factories, and game state builders for unit tests.
 * Enables isolated testing of CPU strategy without full Phaser integration.
 */

import { Card, Rank, Suit } from '../model/Card';
import { GameState, type Player, GamePhase } from '../model/GameState';
import { HandEvaluator, HandRank, HandType } from '../model/HandEvaluator';

/**
 * Factory: Create a Card with specified rank and suit
 */
export function createCard(rank: Rank, suit: Suit): Card {
  return new Card(suit, rank);
}

/**
 * Factory: Create a standard deck (52 cards)
 */
export function createFullDeck(): Card[] {
  const cards: Card[] = [];
  const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
  
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push(createCard(rank as Rank, suit));
    }
  }
  
  return cards;
}

/**
 * Factory: Create a Player mock for testing
 */
export function createMockPlayer(options: {
  id?: string;
  name?: string;
  isCpu?: boolean;
  chips?: number;
  hand?: Card[];
  drawHistory?: number[];
  hasFolded?: boolean;
  isAllIn?: boolean;
  currentRoundBet?: number;
  lastAction?: string | null;
}): Player {
  return {
    id: options.id ?? 'CPU1',
    name: options.name ?? 'Test CPU',
    isCpu: options.isCpu ?? true,
    chips: options.chips ?? 1000,
    hand: options.hand ?? [],
    currentRoundBet: options.currentRoundBet ?? 0,
    hasFolded: options.hasFolded ?? false,
    isAllIn: options.isAllIn ?? false,
    lastAction: options.lastAction ?? null,
    drawHistory: options.drawHistory ?? [0, 0, 0],
  };
}

/**
 * Factory: Create a hand with specific cards
 */
export function createHand(...cardsSpec: Array<[Rank, Suit]>): Card[] {
  return cardsSpec.map(([rank, suit]) => createCard(rank, suit));
}

/**
 * Factory: Create a 4-card Badugi hand
 * Example: createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four)
 */
export function createBadugiHand(...ranks: Rank[]): Card[] {
  if (ranks.length !== 4) {
    throw new Error('Badugi must have exactly 4 cards');
  }
  const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
  return ranks.map((rank, i) => createCard(rank, suits[i]));
}

/**
 * Factory: Create a 3-card hand (weak Badugi)
 */
export function createThreeCardHand(...ranks: Rank[]): Card[] {
  if (ranks.length !== 3) {
    throw new Error('Three-card hand must have exactly 3 cards');
  }
  const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds];
  return ranks.map((rank, i) => createCard(rank, suits[i]));
}

/**
 * Factory: Create a 2-card hand
 */
export function createTwoCardHand(...ranks: Rank[]): Card[] {
  if (ranks.length !== 2) {
    throw new Error('Two-card hand must have exactly 2 cards');
  }
  const suits = [Suit.Spades, Suit.Hearts];
  return ranks.map((rank, i) => createCard(rank, suits[i]));
}

/**
 * Factory: Create a partial HandRank for testing (without full evaluation)
 * Useful for testing decision logic that depends on hand type/cards
 */
export function createMockHandRank(options: {
  type?: HandType;
  cards?: Card[];
}): HandRank {
  const cards = options.cards ?? [];
  const type = options.type ?? HandType.Badugi;
  
  // Create a minimal HandRank instance
  // Note: Real HandRank comes from HandEvaluator.evaluate()
  return {
    type,
    cards,
    compareTo: (other: HandRank) => {
      if (type > other.type) return 1;
      if (type < other.type) return -1;
      return 0;
    },
    toString: () => `${type} with ${cards.length} cards`,
  };
}

/**
 * Helper: Assert that a hand evaluation result matches expected type
 */
export function assertHandType(hand: Card[], expectedType: HandType): void {
  const evaluatedType = HandEvaluator.evaluate(hand).type;
  if (evaluatedType !== expectedType) {
    throw new Error(
      `Expected hand type ${expectedType} but got ${evaluatedType}. Hand: ${hand.map(c => `${c.rank}${c.suit}`).join(',')}`
    );
  }
}

/**
 * Helper: Create a game state mock for testing decision logic
 * WARNING: This is a partial mock suitable only for testing CPU strategy decisions
 */
export function createMockGameState(options: {
  players?: Player[];
  pot?: number;
  currentBet?: number;
  phase?: GamePhase;
  dealerIndex?: number;
  betsInRound?: number;
}): Partial<GameState> {
  return {
    players: options.players ?? [createMockPlayer({})],
    pot: options.pot ?? 100,
    currentBet: options.currentBet ?? 10,
    phase: options.phase ?? GamePhase.Betting1,
    dealerIndex: options.dealerIndex ?? 0,
    betsInRound: options.betsInRound ?? 0,
    getCurrentPlayer: function() {
      return this.players?.[0] as Player;
    },
  };
}

/**
 * Helper: Setup 7-player game with specified positions
 * Returns a real GameState instance for integration testing
 */
export function setup7PlayerGame(options?: {
  dealerIndex?: number;
  drawHistories?: number[][];
  currentPlayerIndex?: number;
}): GameState {
  // Create a mock tournament structure for testing
  const mockTournament = {
    getCurrentLevel: () => ({ level: 1, smallBlind: 10, bigBlind: 20, durationSec: 300 }),
    start: () => {},
  };
  
  // Create real GameState instance
  const gameState = new GameState(mockTournament as any);
  
  // Give all players default hands for testing (random mid-strength Badugis)
  gameState.players.forEach((player, i) => {
    if (player.hand.length === 0) {
      // Give each player a default 3-card hand to avoid evaluation errors
      player.hand = createThreeCardHand(
        (5 + i) as Rank,
        (6 + i) as Rank,
        (7 + i) as Rank
      );
    }
  });
  
  // Override draw histories if provided
  if (options?.drawHistories) {
    gameState.players.forEach((player, i) => {
      if (i < options.drawHistories!.length) {
        player.drawHistory = options.drawHistories![i];
      }
    });
  }
  
  // Set dealer index if provided
  if (options?.dealerIndex !== undefined) {
    gameState.dealerIndex = options.dealerIndex;
  }
  
  // Initialize to Betting1 phase for testing
  gameState.phase = GamePhase.Betting1;
  
  // Set current player index (defaults to first CPU player, index 1)
  if (options?.currentPlayerIndex !== undefined) {
    gameState.currentPlayerIndex = options.currentPlayerIndex;
  } else {
    gameState.currentPlayerIndex = 1; // Default to first CPU
  }
  
  return gameState;
}

/**
 * Helper: Evaluate hand and get its type/rank for testing
 */
export function evaluateHandForTest(hand: Card[]): HandRank {
  return HandEvaluator.evaluate(hand);
}

/**
 * Helper: Create a sequence of hands for tournament testing
 */
export function createHandSequence(count: number): Card[][] {
  const hands: Card[][] = [];
  const deck = createFullDeck();
  
  for (let i = 0; i < count; i++) {
    // Shuffle deck (simple Fisher-Yates)
    for (let j = deck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    // Deal first 4 cards as test hand
    hands.push([...deck.slice(0, 4)]);
  }
  
  return hands;
}

/**
 * Helper: Format card for readable console output
 */
export function formatCard(card: Card): string {
  const rankNames: Record<number, string> = {
    1: 'A', 11: 'J', 12: 'Q', 13: 'K',
  };
  const suitSymbols: Record<Suit, string> = {
    [Suit.Spades]: '♠',
    [Suit.Hearts]: '♥',
    [Suit.Diamonds]: '♦',
    [Suit.Clubs]: '♣',
  };
  
  const rankStr = rankNames[card.rank] ?? String(card.rank);
  const suitStr = suitSymbols[card.suit];
  return `${rankStr}${suitStr}`;
}

/**
 * Helper: Format hand for readable console output
 */
export function formatHand(cards: Card[]): string {
  return cards.map(formatCard).join(' ');
}
