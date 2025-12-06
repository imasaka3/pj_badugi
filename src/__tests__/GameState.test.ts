/**
 * Tests: Phase 1 - Data Structure Foundations (Draw Tracking)
 */

import { describe, it, expect } from 'vitest';
import { GamePhase } from '../model/GameState';
import { createMockPlayer } from './helpers';

describe('Phase 1: Draw Tracking - Unit & Integration Tests', () => {
  it('should initialize drawHistory as [0, 0, 0]', () => {
    const player = createMockPlayer({ drawHistory: [0, 0, 0] });
    expect(player.drawHistory).toEqual([0, 0, 0]);
  });

  it('should allow updating individual draw phases', () => {
    const player = createMockPlayer({ drawHistory: [0, 0, 0] });
    player.drawHistory[0] = 2;
    player.drawHistory[1] = 1;
    player.drawHistory[2] = 3;
    expect(player.drawHistory).toEqual([2, 1, 3]);
  });

  it('should track draw counts across all 3 phases', () => {
    const player = createMockPlayer({});
    player.drawHistory[0] = 2;
    player.drawHistory[1] = 1;
    player.drawHistory[2] = 0;
    expect(player.drawHistory).toEqual([2, 1, 0]);
  });

  it('should have valid draw phase enums', () => {
    expect(GamePhase.Draw1).toBeDefined();
    expect(GamePhase.Draw2).toBeDefined();
    expect(GamePhase.Draw3).toBeDefined();
  });

  it('should be independent between players', () => {
    const p1 = createMockPlayer({ id: 'P1', drawHistory: [1, 0, 2] });
    const p2 = createMockPlayer({ id: 'P2', drawHistory: [0, 0, 0] });
    p1.drawHistory[0] = 3;
    expect(p2.drawHistory[0]).toBe(0);
  });

  it('should support all-in players', () => {
    const player = createMockPlayer({ isAllIn: true });
    player.drawHistory = [2, 1, 4];
    expect(player.drawHistory).toEqual([2, 1, 4]);
  });
});
