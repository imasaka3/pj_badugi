import { Card, Rank } from './Card';
import { GameState, GamePhase } from './GameState';
import { HandEvaluator, HandType, HandRank } from './HandEvaluator';

export class CpuStrategy {
    static decideAction(gameState: GameState): string {
        const cpu = gameState.getCurrentPlayer();
        if (!cpu.isCpu) throw new Error("Current player is not CPU");
        const phase = gameState.phase;

        if (phase === GamePhase.Draw1 || phase === GamePhase.Draw2 || phase === GamePhase.Draw3) {
            // Draw phase logic is handled by decideDiscards, but here we might need to trigger it?
            // Actually GameState should call decideDiscards.
            return 'Draw';
        }

        // Betting phase
        const handRank = HandEvaluator.evaluate(cpu.hand);

        // Simple heuristic based on hand strength
        // 1. Pat Hand (Badugi)
        if (handRank.type === HandType.Badugi) {
            const highestRank = this.getHighestRank(handRank);
            if (highestRank <= Rank.Jack) {
                // Strong Badugi: Raise if possible, else Call
                if (gameState.betsInRound < 4) return 'Raise';
                return 'Call';
            } else {
                // Weak Badugi (Q, K): Call, or Fold if too expensive?
                // For now, Call.
                return 'Call';
            }
        }

        // 2. Three Card
        if (handRank.type === HandType.ThreeCard) {
            const highestRank = this.getHighestRank(handRank);
            if (highestRank <= Rank.Eight) {
                // Decent 3-card: Call. Raise if very strong (6 or better)?
                if (highestRank <= Rank.Six && gameState.betsInRound < 2) return 'Raise';
                return 'Call';
            }
            // Weak 3-card: Fold if raised? Call if cheap?
            if (gameState.currentBet <= gameState.tournament.getCurrentLevel().bigBlind) return 'Call';
            return 'Fold';
        }

        // 3. Two Card
        if (handRank.type === HandType.TwoCard) {
            const highestRank = this.getHighestRank(handRank);
            if (highestRank <= Rank.Four) {
                // Strong 2-card: Call cheap.
                if (gameState.currentBet <= gameState.tournament.getCurrentLevel().bigBlind) return 'Call';
            }
            return 'Fold';
        }

        // 4. One Card
        return 'Fold';
    }

    static decideDiscards(hand: Card[]): Card[] {
        const handRank = HandEvaluator.evaluate(hand);
        const bestCards = handRank.cards; // These are the cards to KEEP

        // Discard everything else
        return hand.filter(c => !bestCards.includes(c));
    }

    private static getHighestRank(handRank: HandRank): Rank {
        // HandRank cards are the valid subset.
        // We want the highest rank among them.
        // Assuming HandRank.cards are not sorted, we find max.
        let max = 0;
        for (const c of handRank.cards) {
            if (c.rank > max) max = c.rank;
        }
        return max as Rank;
    }
}
