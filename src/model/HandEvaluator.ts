import { Card, Rank, Suit } from './Card';

export const HandType = {
    Badugi: 4,
    ThreeCard: 3,
    TwoCard: 2,
    OneCard: 1
} as const;

export type HandType = typeof HandType[keyof typeof HandType];

export class HandRank {
    public readonly type: HandType;
    public readonly cards: Card[];

    constructor(type: HandType, cards: Card[]) {
        this.type = type;
        this.cards = cards;
    }

    // Compare this hand against another. Returns >0 if this wins, <0 if other wins, 0 if tie.
    // Badugi rules: Low is good. But here "wins" means "is better".
    // So if this is better than other, return > 0.
    compareTo(other: HandRank): number {
        if (this.type !== other.type) {
            return this.type - other.type; // Higher type (more cards) wins
        }

        // Same type (number of cards). Compare ranks.
        // Sort ranks descending (Highest rank first).
        // We compare the highest ranks first. The LOWER rank wins.
        const thisRanks = this.cards.map(c => c.rank).sort((a, b) => b - a);
        const otherRanks = other.cards.map(c => c.rank).sort((a, b) => b - a);

        for (let i = 0; i < thisRanks.length; i++) {
            if (thisRanks[i] !== otherRanks[i]) {
                return otherRanks[i] - thisRanks[i]; // Lower rank wins, so if other > this, this wins.
            }
        }

        return 0; // Tie
    }

    toString(): string {
        const sortedCards = [...this.cards].sort((a, b) => a.rank - b.rank);
        let typeStr = 'Unknown';
        if (this.type === HandType.Badugi) typeStr = 'Badugi';
        else if (this.type === HandType.ThreeCard) typeStr = 'ThreeCard';
        else if (this.type === HandType.TwoCard) typeStr = 'TwoCard';
        else if (this.type === HandType.OneCard) typeStr = 'OneCard';

        return `${typeStr} (${sortedCards.map(c => c.toString()).join(',')})`;
    }
}

export class HandEvaluator {
    static evaluate(cards: Card[]): HandRank {
        const validSubsets: Card[][] = [];

        // Generate all subsets
        const n = cards.length;
        for (let i = 1; i < (1 << n); i++) { // Start from 1 to skip empty set
            const subset: Card[] = [];
            for (let j = 0; j < n; j++) {
                if ((i >> j) & 1) {
                    subset.push(cards[j]);
                }
            }
            if (this.isValidBadugi(subset)) {
                validSubsets.push(subset);
            }
        }

        // Find best subset
        let bestHand: HandRank | null = null;

        for (const subset of validSubsets) {
            const type = subset.length as HandType;
            const currentHand = new HandRank(type, subset);

            if (!bestHand || currentHand.compareTo(bestHand) > 0) {
                bestHand = currentHand;
            }
        }

        if (!bestHand) {
            // Should not happen if input has at least 1 card
            // Fallback to best single card
            let bestCard = cards[0];
            for (const c of cards) {
                if (c.rank < bestCard.rank) bestCard = c;
            }
            return new HandRank(HandType.OneCard, [bestCard]);
        }

        return bestHand;
    }

    private static isValidBadugi(cards: Card[]): boolean {
        const suits = new Set<Suit>();
        const ranks = new Set<Rank>();

        for (const card of cards) {
            if (suits.has(card.suit)) return false;
            if (ranks.has(card.rank)) return false;
            suits.add(card.suit);
            ranks.add(card.rank);
        }
        return true;
    }
}
