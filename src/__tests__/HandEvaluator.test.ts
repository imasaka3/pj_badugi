/**
 * Tests: Phase 2 - Hand Evaluation Extensions (Breakability & Smoothness)
 */

import { describe, it, expect } from 'vitest';
import { HandEvaluator, HandType, HandRank } from '../model/HandEvaluator';
import { createCard, createBadugiHand, createThreeCardHand } from './helpers';
import { Rank, Suit } from '../model/Card';

describe('Phase 2: Hand Evaluation - Breakability & Smoothness', () => {
  describe('calculateBreakability() - T012', () => {
    it('should return 0 score for non-Badugi hands', () => {
      const threeCardHand = createThreeCardHand(Rank.Ace, Rank.Two, Rank.Three);
      const handRank = HandEvaluator.evaluate(threeCardHand);
      
      const breakability = HandEvaluator.calculateBreakability(threeCardHand, handRank);
      expect(breakability.score).toBe(0);
      expect(breakability.breakableCard).toBeNull();
    });

    it('should calculate breakability score 0-91 for Badugi', () => {
      const hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      const handRank = HandEvaluator.evaluate(hand);
      
      const breakability = HandEvaluator.calculateBreakability(hand, handRank);
      expect(breakability.score).toBeGreaterThanOrEqual(0);
      expect(breakability.score).toBeLessThanOrEqual(91);
    });

    it('should identify highest card as breakableCard', () => {
      const hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      const handRank = HandEvaluator.evaluate(hand);
      
      const breakability = HandEvaluator.calculateBreakability(hand, handRank);
      expect(breakability.breakableCard).not.toBeNull();
      expect(breakability.breakableCard?.rank).toBe(Rank.Four);
    });

    it('should list improving ranks', () => {
      const hand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      const handRank = HandEvaluator.evaluate(hand);
      
      const breakability = HandEvaluator.calculateBreakability(hand, handRank);
      expect(breakability.improveRanks.length).toBeGreaterThan(0);
      // Should include unused ranks like 5, 6, etc.
      expect(breakability.improveRanks).toContain(Rank.Five);
    });

    it('strong hand should have lower breakability', () => {
      // Strong 4-card (A-2-3-4)
      const strongHand = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      const strongRank = HandEvaluator.evaluate(strongHand);
      const strongBreak = HandEvaluator.calculateBreakability(strongHand, strongRank);

      // Weak 4-card (J-Q-K-A high suite)
      const weakHand = createBadugiHand(Rank.Jack, Rank.Queen, Rank.King, Rank.Ace);
      const weakRank = HandEvaluator.evaluate(weakHand);
      const weakBreak = HandEvaluator.calculateBreakability(weakHand, weakRank);

      // Weak hand should be more breakable
      expect(weakBreak.score).toBeGreaterThan(strongBreak.score);
    });
  });

  describe('isSmooth() - T013', () => {
    it('should return true for smooth hands (gaps <= 3)', () => {
      const smooth = createBadugiHand(Rank.Ace, Rank.Two, Rank.Three, Rank.Four);
      const handRank = HandEvaluator.evaluate(smooth);
      
      expect(HandEvaluator.isSmooth(handRank)).toBe(true);
    });

    it('should return false for rough hands (gaps > 3)', () => {
      const rough = createBadugiHand(Rank.Ace, Rank.Five, Rank.Nine, Rank.King);
      const handRank = HandEvaluator.evaluate(rough);
      
      expect(HandEvaluator.isSmooth(handRank)).toBe(false);
    });

    it('should return false for hands with < 2 cards', () => {
      const oneCard = [createCard(Rank.Ace, Suit.Spades)];
      const oneCardRank = new HandRank(HandType.OneCard, oneCard);
      
      expect(HandEvaluator.isSmooth(oneCardRank)).toBe(false);
    });

    it('should prefer smooth over rough on equivalent strength', () => {
      // Both are Q-high, but different smoothness
      const smooth = createBadugiHand(Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen);
      const rough = createBadugiHand(Rank.Ace, Rank.Five, Rank.Nine, Rank.Queen);
      
      const smoothRank = HandEvaluator.evaluate(smooth);
      const roughRank = HandEvaluator.evaluate(rough);
      
      expect(HandEvaluator.isSmooth(smoothRank)).toBe(true);
      expect(HandEvaluator.isSmooth(roughRank)).toBe(false);
    });
  });

  describe('Integration: Breakability + Smoothness', () => {
    it('should combine breakability and smoothness in decision logic', () => {
      const weak = createBadugiHand(Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen);
      const weakRank = HandEvaluator.evaluate(weak);
      
      const breakability = HandEvaluator.calculateBreakability(weak, weakRank);
      const isSmooth = HandEvaluator.isSmooth(weakRank);
      
      // Weak Q-high might have high breakability but lower smoothness
      expect(breakability.score).toBeGreaterThan(0);
      // Q-high with 9,10,J,Q is fairly smooth
      expect(isSmooth).toBe(true);
    });
  });
});
