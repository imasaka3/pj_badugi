import { Card, Rank, Suit } from './Card';

export class Deck {
    private cards: Card[] = [];
    private discardedPile: Card[] = [];

    constructor() {
        this.reset();
    }

    reset(): void {
        this.cards = [];
        this.discardedPile = [];
        const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
        const ranks = [
            Rank.Ace, Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
            Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King
        ];

        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count: number): Card[] {
        if (count > this.cards.length) {
            throw new Error('Not enough cards in deck');
        }
        return this.cards.splice(0, count);
    }

    dealWithChange(cards: Card[]): Card[] {
        if (cards.length > this.cards.length) {
            this.discardedPile.sort(() => Math.random() - 0.5);
            this.cards.push(...this.discardedPile);
            this.discardedPile = [];
        }
        this.discardedPile.push(...cards);
        return this.deal(cards.length);
    }

    get remaining(): number {
        return this.cards.length;
    }
}
