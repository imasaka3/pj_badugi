import { Card, Rank } from './Card';
import { GameState, GamePhase, type Player } from './GameState';
import { HandEvaluator, HandType, HandRank } from './HandEvaluator';

// ============================================================================
// STRATEGY DEFINITIONS
// ============================================================================

/** CPU personality profiles */
interface StrategyProfile {
  id: string;
  aggressionFactor: number;
  bluffFrequency: number;
  tightnessFactor: number;
}

const CPU_PROFILES: StrategyProfile[] = [
  { id: 'CPU 1', aggressionFactor: 0.9, bluffFrequency: 0.15, tightnessFactor: 1.1 },
  { id: 'CPU 2', aggressionFactor: 1.1, bluffFrequency: 0.20, tightnessFactor: 0.9 },
  { id: 'CPU 3', aggressionFactor: 1.0, bluffFrequency: 0.17, tightnessFactor: 1.0 },
  { id: 'CPU 4', aggressionFactor: 0.8, bluffFrequency: 0.12, tightnessFactor: 1.2 },
  { id: 'CPU 5', aggressionFactor: 1.2, bluffFrequency: 0.22, tightnessFactor: 0.8 },
  { id: 'CPU 6', aggressionFactor: 1.0, bluffFrequency: 0.18, tightnessFactor: 1.0 },
];

type PositionCategory = 'early' | 'middle' | 'late';

interface OpeningCriteria {
  maxHighCard: Rank;
  mustBeSmooth?: boolean;
  action: 'fold' | 'call' | 'raise';
}

const OPENING_RANGES: Record<PositionCategory, Record<HandType, OpeningCriteria>> = {
  early: {
    [HandType.Badugi]: { maxHighCard: Rank.Eight, action: 'raise' },
    [HandType.ThreeCard]: { maxHighCard: Rank.Six, mustBeSmooth: true, action: 'call' },
    [HandType.TwoCard]: { maxHighCard: Rank.Ace, action: 'fold' },
    [HandType.OneCard]: { maxHighCard: Rank.Ace, action: 'fold' },
  },
  middle: {
    [HandType.Badugi]: { maxHighCard: Rank.Nine, action: 'raise' },
    [HandType.ThreeCard]: { maxHighCard: Rank.Seven, mustBeSmooth: true, action: 'call' },
    [HandType.TwoCard]: { maxHighCard: Rank.Ace, action: 'fold' },
    [HandType.OneCard]: { maxHighCard: Rank.Ace, action: 'fold' },
  },
  late: {
    [HandType.Badugi]: { maxHighCard: Rank.Queen, action: 'raise' },
    [HandType.ThreeCard]: { maxHighCard: Rank.Eight, mustBeSmooth: false, action: 'call' },
    [HandType.TwoCard]: { maxHighCard: Rank.Three, action: 'call' },
    [HandType.OneCard]: { maxHighCard: Rank.Ace, action: 'fold' },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStrategyProfile(player: Player): StrategyProfile {
  const cpuNum = parseInt(player.id.replace(/\D/g, '')) || 1;
  const profileIndex = (cpuNum - 1) % CPU_PROFILES.length;
  return CPU_PROFILES[profileIndex];
}

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

function getHighestRank(handRank: HandRank): Rank {
  let max = 0;
  for (const c of handRank.cards) {
    if (c.rank > max) max = c.rank;
  }
  return max as Rank;
}

// ============================================================================
// MAIN STRATEGY CLASS
// ============================================================================

export class CpuStrategy {
  static decideAction(gameState: GameState): string {
    const cpu = gameState.getCurrentPlayer();
    if (!cpu.isCpu) throw new Error("Current player is not CPU");

    const profile = getStrategyProfile(cpu);
    const position = getPositionCategory(gameState, cpu);
    const handRank = HandEvaluator.evaluate(cpu.hand);
    const phase = gameState.phase;

    if (phase === GamePhase.Draw1 || phase === GamePhase.Draw2 || phase === GamePhase.Draw3) {
      return 'Draw';
    }

    if (phase === GamePhase.Betting1) {
      return this.decidePreDrawAction(gameState, cpu, handRank, position, profile);
    }

    return this.decidePostDrawAction(gameState, cpu, handRank, position, profile);
  }

  private static decidePreDrawAction(
    gameState: GameState,
    _cpu: Player,
    handRank: HandRank,
    position: PositionCategory,
    profile: StrategyProfile
  ): string {
    const criteria = OPENING_RANGES[position][handRank.type];
    if (!criteria) return 'Fold';

    const highCard = getHighestRank(handRank);

    if (highCard > criteria.maxHighCard * profile.tightnessFactor) {
      return 'Fold';
    }

    if (criteria.mustBeSmooth && !HandEvaluator.isSmooth(handRank)) {
      return 'Fold';
    }

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
    _position: PositionCategory,
    profile: StrategyProfile
  ): string {
    if (this.shouldSnow(gameState, cpu, handRank, profile)) {
      return 'Call';
    }

    if (handRank.type === HandType.Badugi) {
      const highCard = getHighestRank(handRank);

      if (highCard <= Rank.Eight) {
        if (gameState.betsInRound < 5 && Math.random() < profile.aggressionFactor) {
          return 'Raise';
        }
        return 'Call';
      }

      const breakability = HandEvaluator.calculateBreakability(cpu.hand, handRank);
      if (this.shouldBreakBadugi(gameState, cpu, handRank, breakability)) {
        return 'Call';
      }

      return 'Call';
    }

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
    if (handRank.type !== HandType.ThreeCard) return false;
    if (gameState.phase < GamePhase.Betting3) return false;

    const opponents = gameState.players.filter(p => p.id !== cpu.id && !p.hasFolded);
    const mostRecentDraw = opponents.every(opp => {
      const lastDraw = opp.drawHistory[opp.drawHistory.length - 1];
      return lastDraw > 0;
    });

    if (!mostRecentDraw) return false;

    const seed = gameState.pot + cpu.chips + gameState.currentBet;
    const hash = ((seed * 2654435761) % Math.pow(2, 32)) / Math.pow(2, 32);

    return hash < profile.bluffFrequency;
  }

  private static shouldBreakBadugi(
    gameState: GameState,
    cpu: Player,
    handRank: HandRank,
    breakability: { score: number }
  ): boolean {
    const highCard = getHighestRank(handRank);

    if (highCard <= Rank.Eight) return false;
    if (breakability.score < 40) return false;

    const opponents = gameState.players.filter(p => p.id !== cpu.id && !p.hasFolded);
    const opponentsStrongCount = opponents.filter(opp => {
      const lastDraw = opp.drawHistory[opp.drawHistory.length - 1];
      return lastDraw === 0 || lastDraw === 1;
    }).length;

    return opponentsStrongCount >= 2;
  }

  private static checkPotOdds(gameState: GameState, cpu: Player, outs: number): boolean {
    const betToCall = gameState.currentBet - cpu.currentRoundBet;
    if (betToCall === 0) return true;

    const potOdds = gameState.pot / betToCall;
    const activePlayers = gameState.players.filter(p => !p.hasFolded).length;
    const cardsRemaining = 52 - (4 * activePlayers);
    const winProbability = outs / cardsRemaining;
    const requiredEquity = 1 / (potOdds + 1);

    return winProbability >= requiredEquity;
  }

  private static estimateOuts(handRank: HandRank): number {
    if (handRank.type === HandType.ThreeCard) return 10;
    if (handRank.type === HandType.TwoCard) return 20;
    return 30;
  }

  static decideDiscards(hand: Card[]): Card[] {
    const handRank = HandEvaluator.evaluate(hand);
    const bestCards = handRank.cards;
    return hand.filter(c => !bestCards.includes(c));
  }
}
