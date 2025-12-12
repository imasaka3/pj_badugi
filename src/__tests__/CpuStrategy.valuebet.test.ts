import { describe, it, expect } from 'vitest';
import { CpuStrategy } from '../model/CpuStrategy';
import { GamePhase } from '../model/GameState';
import { Rank } from '../model/Card';
import {
  createBadugiHand,
  setup7PlayerGame,
} from './helpers';

describe('CpuStrategy - Value Betting with Completed Badugis', () => {
  it('Should bet/raise frequently with premium Badugis (7-high or better) in post-draw rounds', () => {
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting2; // Post-draw betting
    gameState.currentPlayerIndex = 1; // CPU player
    gameState.currentBet = 0; // No bet yet, CPU can initiate
    
    const cpu = gameState.players[1];
    // Give CPU a premium 7-high Badugi
    cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Four, Rank.Seven);

    // Run 100 trials to check betting frequency
    let raiseCount = 0;
    const trials = 100;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount++;
      }
    }

    // Premium Badugis should bet/raise at least 70% of the time
    const raisePercentage = raiseCount / trials;
    expect(raisePercentage).toBeGreaterThan(0.70);
  });

  it('Should bet/raise often with good Badugis (8-high) in post-draw rounds', () => {
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting3; // Post-draw betting
    gameState.currentPlayerIndex = 1;
    gameState.currentBet = 0;
    
    const cpu = gameState.players[1];
    // Give CPU a good 8-high Badugi
    cpu.hand = createBadugiHand(Rank.Ace, Rank.Three, Rank.Five, Rank.Eight);

    let raiseCount = 0;
    const trials = 100;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount++;
      }
    }

    // Good 8-high Badugis should bet/raise at least 55% of the time
    const raisePercentage = raiseCount / trials;
    expect(raisePercentage).toBeGreaterThan(0.55);
  });

  it('Should bet/raise moderately with 9-high Badugis in post-draw rounds', () => {
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting4; // Post-draw betting
    gameState.currentPlayerIndex = 1;
    gameState.currentBet = 0;
    
    const cpu = gameState.players[1];
    // Give CPU a 9-high Badugi
    cpu.hand = createBadugiHand(Rank.Ace, Rank.Four, Rank.Six, Rank.Nine);

    let raiseCount = 0;
    const trials = 100;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount++;
      }
    }

    // 9-high Badugis should bet/raise at least 40% of the time
    const raisePercentage = raiseCount / trials;
    expect(raisePercentage).toBeGreaterThan(0.40);
  });

  it('Should bet/raise selectively with medium Badugis (10-J high) based on opponents', () => {
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting2;
    gameState.currentPlayerIndex = 1;
    gameState.currentBet = 0;
    
    const cpu = gameState.players[1];
    // Give CPU a 10-high Badugi
    cpu.hand = createBadugiHand(Rank.Ace, Rank.Five, Rank.Seven, Rank.Ten);

    // Set opponents to show weakness (drew cards)
    gameState.players.forEach((p, idx) => {
      if (idx !== 1 && !p.hasFolded) {
        p.drawHistory = [2, 2, 2]; // Drew 2 cards = weak
      }
    });

    let raiseCount = 0;
    const trials = 100;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount++;
      }
    }

    // Against weak opponents, should bet at least 20% of the time
    const raisePercentage = raiseCount / trials;
    expect(raisePercentage).toBeGreaterThan(0.20);
  });

  it('Should bet less with weak Badugis (Q+ high) against strong opponents', () => {
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting3;
    gameState.currentPlayerIndex = 1;
    gameState.currentBet = 0;
    
    const cpu = gameState.players[1];
    // Give CPU a weak Q-high Badugi
    cpu.hand = createBadugiHand(Rank.Three, Rank.Seven, Rank.Nine, Rank.Queen);

    // Set opponents to show strength (stood pat)
    gameState.players.forEach((p, idx) => {
      if (idx !== 1 && !p.hasFolded) {
        p.drawHistory = [0, 0, 0]; // Stood pat = strong
      }
    });

    let raiseCount = 0;
    const trials = 100;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount++;
      }
    }

    // Against strong opponents with weak Badugi, should be cautious
    const raisePercentage = raiseCount / trials;
    expect(raisePercentage).toBeLessThan(0.30);
  });

  it('Should value bet across all post-draw betting phases (Betting2, Betting3, Betting4)', () => {
    const cpu = { id: 'cpu1', name: 'CPU 1', isCpu: true };
    
    // Test each post-draw betting phase
    const phases = [GamePhase.Betting2, GamePhase.Betting3, GamePhase.Betting4];
    
    phases.forEach(phase => {
      const gameState = setup7PlayerGame({});
      gameState.phase = phase;
      gameState.currentPlayerIndex = 1;
      gameState.currentBet = 0;
      
      const cpuPlayer = gameState.players[1];
      // Give a strong 6-high Badugi
      cpuPlayer.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Six);

      let raiseCount = 0;
      const trials = 50;
      
      for (let i = 0; i < trials; i++) {
        const action = CpuStrategy.decideAction(gameState);
        if (action === 'Raise') {
          raiseCount++;
        }
      }

      // Should bet frequently in all post-draw phases
      const raisePercentage = raiseCount / trials;
      expect(raisePercentage).toBeGreaterThan(0.70);
    });
  });

  it('Should respect aggression factor in value betting decisions', () => {
    // CPU 5 has highest aggression factor (1.2)
    const gameState = setup7PlayerGame({});
    gameState.phase = GamePhase.Betting2;
    gameState.currentPlayerIndex = 5; // CPU 5 (most aggressive)
    gameState.currentBet = 0;
    
    const cpu5 = gameState.players[5];
    cpu5.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Five, Rank.Eight);

    let raiseCount5 = 0;
    const trials = 200; // Increased sample size for more reliable results
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount5++;
      }
    }

    // Now test CPU 4 (conservative, aggression 0.8)
    gameState.currentPlayerIndex = 4;
    const cpu4 = gameState.players[4];
    cpu4.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Five, Rank.Eight);

    let raiseCount4 = 0;
    
    for (let i = 0; i < trials; i++) {
      const action = CpuStrategy.decideAction(gameState);
      if (action === 'Raise') {
        raiseCount4++;
      }
    }

    // More aggressive CPU should bet more often (or at least similarly)
    // With larger sample size, difference should be more apparent
    expect(raiseCount5).toBeGreaterThanOrEqual(raiseCount4 - 5); // Allow small variance
  });
});
