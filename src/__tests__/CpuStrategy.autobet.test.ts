import { describe, it, expect } from 'vitest';
import { CpuStrategy } from '../model/CpuStrategy';
import { GamePhase } from '../model/GameState';
import { Rank } from '../model/Card';
import {
  createBadugiHand,
  createThreeCardHand,
  setup7PlayerGame,
} from './helpers';

describe('CpuStrategy - Auto-Bet Based on Draw Counts', () => {
  it('CPU should auto-bet after Draw1 when drawing fewer cards than all opponents', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1, // CPU 1
      drawHistories: [
        [2, 0, 0], // You (human player) drew 2 cards
        [0, 0, 0], // CPU 1 drew 0 cards (stand pat)
        [1, 0, 0], // CPU 2 drew 1 card
        [2, 0, 0], // CPU 3 drew 2 cards
        [3, 0, 0], // CPU 4 drew 3 cards
        [1, 0, 0], // CPU 5 drew 1 card
        [2, 0, 0], // CPU 6 drew 2 cards
      ],
    });

    // Give CPU 1 a decent Badugi hand
    gameState.players[1].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Five
    );

    // Set to Betting2 (after Draw1)
    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 0; // No bets yet, so CPU can raise

    const action = CpuStrategy.decideAction(gameState);

    // CPU 1 drew 0 cards, all others drew 1+, so should auto-bet
    expect(action).toBe('Raise');
  });

  it('CPU should NOT auto-bet when drawing equal cards as some opponents', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1, // CPU 1
      drawHistories: [
        [1, 0, 0], // You drew 1 card
        [1, 0, 0], // CPU 1 drew 1 card
        [2, 0, 0], // CPU 2 drew 2 cards
        [2, 0, 0], // CPU 3 drew 2 cards
        [3, 0, 0], // CPU 4 drew 3 cards
        [2, 0, 0], // CPU 5 drew 2 cards
        [1, 0, 0], // CPU 6 drew 1 card (same as CPU 1)
      ],
    });

    gameState.players[1].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Five
    );

    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 1 drew 1, but human and CPU 6 also drew 1, so should NOT auto-bet
    // Fallback to normal strategy
    expect(['Call', 'Raise', 'Fold']).toContain(action);
  });

  it('CPU should NOT auto-bet when drawing more cards than opponents', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1, // CPU 1
      drawHistories: [
        [0, 0, 0], // You stood pat
        [2, 0, 0], // CPU 1 drew 2 cards
        [0, 0, 0], // CPU 2 stood pat
        [1, 0, 0], // CPU 3 drew 1 card
        [0, 0, 0], // CPU 4 stood pat
        [1, 0, 0], // CPU 5 drew 1 card
        [0, 0, 0], // CPU 6 stood pat
      ],
    });

    gameState.players[1].hand = createThreeCardHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three
    );

    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 1 drew 2, but several opponents drew 0 or 1, so should NOT auto-bet
    expect(['Call', 'Raise', 'Fold']).toContain(action);
  });

  it('CPU should auto-bet after Draw2 based on Draw2 counts', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 2, // CPU 2
      drawHistories: [
        [1, 2, 0], // You drew 1 in Draw1, 2 in Draw2
        [2, 3, 0], // CPU 1 drew 2 in Draw1, 3 in Draw2
        [1, 0, 0], // CPU 2 drew 1 in Draw1, 0 in Draw2 (stood pat)
        [1, 1, 0], // CPU 3 drew 1 in Draw1, 1 in Draw2
        [2, 2, 0], // CPU 4 drew 2 in Draw1, 2 in Draw2
        [3, 1, 0], // CPU 5 drew 3 in Draw1, 1 in Draw2
        [2, 2, 0], // CPU 6 drew 2 in Draw1, 2 in Draw2
      ],
    });

    gameState.players[2].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Four,
      Rank.Six
    );

    gameState.phase = GamePhase.Betting3; // After Draw2
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 2 drew 0 in Draw2, all others drew 1+, so should auto-bet
    expect(action).toBe('Raise');
  });

  it('CPU should auto-bet after Draw3 based on Draw3 counts', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 3, // CPU 3
      drawHistories: [
        [1, 1, 2], // You drew 2 in Draw3
        [2, 2, 1], // CPU 1 drew 1 in Draw3
        [1, 1, 3], // CPU 2 drew 3 in Draw3
        [1, 1, 0], // CPU 3 drew 0 in Draw3 (stood pat)
        [2, 2, 1], // CPU 4 drew 1 in Draw3
        [3, 2, 2], // CPU 5 drew 2 in Draw3
        [2, 1, 1], // CPU 6 drew 1 in Draw3
      ],
    });

    gameState.players[3].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Seven
    );

    gameState.phase = GamePhase.Betting4; // After Draw3
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 3 drew 0 in Draw3, all others drew 1+, so should auto-bet
    expect(action).toBe('Raise');
  });

  it('CPU should NOT auto-bet in Betting1 (pre-draw phase)', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1,
      drawHistories: [
        [0, 0, 0], // All zeros since no draws yet
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    });

    gameState.players[1].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Four
    );

    gameState.phase = GamePhase.Betting1; // Pre-draw
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // Should use pre-draw strategy, not auto-bet
    expect(['Call', 'Raise', 'Fold']).toContain(action);
  });

  it('CPU should call (not raise) when auto-betting but bet cap reached', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1,
      drawHistories: [
        [2, 0, 0],
        [0, 0, 0], // CPU 1 stood pat
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
    });

    gameState.players[1].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Five
    );

    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 5; // Bet cap reached

    const action = CpuStrategy.decideAction(gameState);

    // Should still want to auto-bet, but cap is reached, so calls
    expect(action).toBe('Call');
  });

  it('CPU should auto-bet even with folded opponents (only counts active opponents)', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 1,
      drawHistories: [
        [1, 0, 0], // You drew 1
        [0, 0, 0], // CPU 1 stood pat
        [2, 0, 0], // CPU 2 drew 2
        [1, 0, 0], // CPU 3 drew 1 (will fold)
        [2, 0, 0], // CPU 4 drew 2 (will fold)
        [3, 0, 0], // CPU 5 drew 3
        [1, 0, 0], // CPU 6 drew 1 (will fold)
      ],
    });

    // Fold some opponents
    gameState.players[3].hasFolded = true; // CPU 3 folded
    gameState.players[4].hasFolded = true; // CPU 4 folded
    gameState.players[6].hasFolded = true; // CPU 6 folded

    gameState.players[1].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Four
    );

    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 1 drew 0, active opponents: You(1), CPU2(2), CPU5(3)
    // All active opponents drew more, so should auto-bet
    expect(action).toBe('Raise');
  });

  it('CPU should NOT auto-bet when an active opponent drew fewer cards', () => {
    const gameState = setup7PlayerGame({
      currentPlayerIndex: 2, // CPU 2
      drawHistories: [
        [0, 0, 0], // You stood pat (drew 0)
        [1, 0, 0], // CPU 1 drew 1
        [1, 0, 0], // CPU 2 drew 1 (current player)
        [2, 0, 0], // CPU 3 drew 2
        [2, 0, 0], // CPU 4 drew 2
        [3, 0, 0], // CPU 5 drew 3
        [2, 0, 0], // CPU 6 drew 2
      ],
    });

    gameState.players[2].hand = createBadugiHand(
      Rank.Ace,
      Rank.Two,
      Rank.Three,
      Rank.Five
    );

    gameState.phase = GamePhase.Betting2;
    gameState.betsInRound = 0;

    const action = CpuStrategy.decideAction(gameState);

    // CPU 2 drew 1, but You drew 0 (fewer), so should NOT auto-bet
    expect(['Call', 'Raise', 'Fold']).toContain(action);
  });
});
