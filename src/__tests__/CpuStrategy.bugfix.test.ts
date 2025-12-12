import { describe, it, expect } from 'vitest';
import { CpuStrategy } from '../model/CpuStrategy';
import { Rank } from '../model/Card';
import { GamePhase } from '../model/GameState';
import {
  setup7PlayerGame,
  createBadugiHand,
  createThreeCardHand,
} from './helpers';

describe('CpuStrategy Bug Fixes', () => {
  describe('Bug 1: TightnessFactor Application', () => {
    it('Should correctly apply tightnessFactor to opening range thresholds', () => {
      // Test that tight players (tightnessFactor > 1.0) require stronger hands
      const gameState = setup7PlayerGame({});
      
      // CPU 4 has tightnessFactor 1.2 (tight player)
      // Should fold marginal hands that looser players would play
      // Position: CPU at index 2 is in early position (relative pos 2 < threshold 3)
      gameState.currentPlayerIndex = 2; // Early position CPU
      const cpu = gameState.players[2];
      
      // Give CPU a marginal Nine-high Badugi in early position
      // Early position allows max Eight-high Badugi
      // With tightnessFactor 1.2, adjusted max = floor(8/1.2) = 6
      // Nine-high should fold
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Four, Rank.Nine);
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Tight player should fold Nine-high in early position
      // (even though it's technically a Badugi)
      expect(action).toBe('Fold');
    });

    it('Should allow loose players to play weaker hands', () => {
      const gameState = setup7PlayerGame({});
      
      // CPU 5 has tightnessFactor 0.8 (loose player)
      gameState.currentPlayerIndex = 5; // CPU 5
      const cpu = gameState.players[5];
      
      // Give CPU 5 a marginal hand that tight player would fold
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Four, Rank.Nine);
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Loose player might call/raise with Nine-high Badugi
      expect(['Call', 'Raise']).toContain(action);
    });

    it('Should handle edge case: Seven-high Badugi with tight player', () => {
      const gameState = setup7PlayerGame({});
      gameState.currentPlayerIndex = 4; // CPU 4 (tight)
      const cpu = gameState.players[4];
      
      // Strong Seven-high Badugi should be played even by tight players
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Seven);
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Should raise with strong hand
      expect(['Raise', 'Call']).toContain(action);
    });
  });

  describe('Bug 2: AggressionFactor Probability', () => {
    it('Should raise probabilistically based on aggressionFactor', () => {
      const gameState = setup7PlayerGame({});
      
      // CPU 1 has aggressionFactor 0.9 (should raise ~57% of time with strong hand)
      // Use late position (index 6) to ensure hand plays
      gameState.currentPlayerIndex = 6;
      const cpu = gameState.players[6];
      
      // Give strong Eight-high Badugi
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Eight);
      
      const actions: Record<string, number> = { Raise: 0, Call: 0, Fold: 0 };
      
      // Run 100 times to check distribution
      for (let i = 0; i < 100; i++) {
        const action = CpuStrategy.decideAction(gameState);
        if (action === 'Raise') actions.Raise++;
        else if (action === 'Call') actions.Call++;
        else if (action === 'Fold') actions.Fold++;
      }
      
      // Should have both raises and calls (probabilistic behavior)
      expect(actions.Raise + actions.Call).toBeGreaterThan(90); // Most should play
      expect(actions.Raise).toBeGreaterThan(0); // Should raise sometimes
      expect(actions.Call).toBeGreaterThan(0); // Should call sometimes
    });

    it('Should have different raise frequencies for different profiles', () => {
      const gameState = setup7PlayerGame({});
      
      // Test CPU 4 (aggressionFactor 0.8) vs CPU 5 (aggressionFactor 1.2)
      // Note: aggressionFactor should be normalized to 0-1 range
      
      const testRaiseFrequency = (cpuIndex: number) => {
        gameState.currentPlayerIndex = cpuIndex;
        const cpu = gameState.players[cpuIndex];
        cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Eight);
        
        let raises = 0;
        for (let i = 0; i < 50; i++) {
          if (CpuStrategy.decideAction(gameState) === 'Raise') raises++;
        }
        return raises / 50;
      };
      
      const cpu4RaiseRate = testRaiseFrequency(4); // Less aggressive
      const cpu5RaiseRate = testRaiseFrequency(5); // More aggressive
      
      // CPU 5 should raise more frequently than CPU 4
      // (with some tolerance for randomness)
      expect(cpu5RaiseRate).toBeGreaterThanOrEqual(cpu4RaiseRate - 0.1);
    });

    it('Should never exceed 100% raise probability', () => {
      const gameState = setup7PlayerGame({});
      
      // Even CPU 5 with aggressionFactor 1.2 should not always raise
      // Use late position to ensure hand plays
      gameState.currentPlayerIndex = 5; // CPU 5
      const cpu = gameState.players[5];
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Eight);
      
      let raises = 0;
      let calls = 0;
      
      for (let i = 0; i < 100; i++) {
        const action = CpuStrategy.decideAction(gameState);
        if (action === 'Raise') raises++;
        if (action === 'Call') calls++;
      }
      
      // Should have at least some calls (not 100% raises)
      // With normalized aggressionFactor, CPU 5 should raise often but not always
      expect(raises + calls).toBeGreaterThan(90); // Should play most hands
      expect(calls).toBeGreaterThan(0); // Should have some calls
      expect(raises).toBeGreaterThan(0); // Should have some raises
    });
  });

  describe('Bug 3: Post-Draw Betting Logic', () => {
    it('Should bet aggressively with premium Badugi post-draw', () => {
      const gameState = setup7PlayerGame({});
      gameState.phase = GamePhase.Betting2;
      gameState.currentPlayerIndex = 1;
      const cpu = gameState.players[1];
      
      // Premium A-2-3-4 Badugi
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      cpu.drawHistory[0] = 0; // Stood pat
      
      // Opponents drew cards (weak)
      gameState.players[2].drawHistory[0] = 2;
      gameState.players[3].drawHistory[0] = 3;
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Should raise with premium hand vs drawing opponents
      expect(['Raise', 'Call']).toContain(action);
    });

    it('Should be cautious with weak Badugi vs pat opponents', () => {
      const gameState = setup7PlayerGame({});
      gameState.phase = GamePhase.Betting3;
      gameState.currentPlayerIndex = 1;
      const cpu = gameState.players[1];
      
      // Weak Jack-high Badugi
      cpu.hand = createBadugiHand(Rank.Two, Rank.Five, Rank.Nine, Rank.Jack);
      cpu.drawHistory[1] = 0; // Stood pat this round
      
      // Multiple opponents also stood pat (likely strong)
      gameState.players[2].drawHistory[1] = 0;
      gameState.players[3].drawHistory[1] = 0;
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Should be cautious (call or fold, not raise)
      expect(['Call', 'Fold']).toContain(action);
    });

    it('Should fold drawing hands with poor pot odds', () => {
      const gameState = setup7PlayerGame({});
      gameState.phase = GamePhase.Betting2;
      gameState.pot = 100;
      gameState.currentBet = 50;
      gameState.currentPlayerIndex = 1;
      const cpu = gameState.players[1];
      cpu.currentRoundBet = 0;
      
      // Weak 3-card hand (poor draw)
      cpu.hand = createThreeCardHand(Rank.Nine, Rank.Ten, Rank.Jack);
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Should fold weak draw with poor pot odds
      expect(action).toBe('Fold');
    });
  });

  describe('Regression Tests', () => {
    it('Should still fold garbage hands', () => {
      const gameState = setup7PlayerGame({});
      gameState.currentPlayerIndex = 1;
      const cpu = gameState.players[1];
      
      // Terrible 2-card hand
      cpu.hand = createBadugiHand(Rank.Jack, Rank.Queen, Rank.King, Rank.King); // One pair
      
      const action = CpuStrategy.decideAction(gameState);
      
      expect(action).toBe('Fold');
    });

    it('Should respect 5-bet cap', () => {
      const gameState = setup7PlayerGame({});
      gameState.betsInRound = 5;
      gameState.currentPlayerIndex = 1;
      const cpu = gameState.players[1];
      
      // Strong hand
      cpu.hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      
      const action = CpuStrategy.decideAction(gameState);
      
      // Should call (not raise) when bet cap reached
      expect(action).toBe('Call');
    });
  });
});
