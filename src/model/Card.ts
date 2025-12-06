export const Suit = {
    Spades: 's',
    Hearts: 'h',
    Diamonds: 'd',
    Clubs: 'c'
} as const;

export type Suit = typeof Suit[keyof typeof Suit];

export const Rank = {
    Ace: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
    Ten: 10,
    Jack: 11,
    Queen: 12,
    King: 13
} as const;

export type Rank = typeof Rank[keyof typeof Rank];

export class Card {
    public readonly suit: Suit;
    public readonly rank: Rank;

    constructor(suit: Suit, rank: Rank) {
        this.suit = suit;
        this.rank = rank;
    }

    toString(): string {
        // Shorten rank string for display if needed, or use value
        let r = this.rank.toString();
        if (this.rank === Rank.Ace) r = 'A';
        else if (this.rank === Rank.Jack) r = 'J';
        else if (this.rank === Rank.Queen) r = 'Q';
        else if (this.rank === Rank.King) r = 'K';
        else if (this.rank === Rank.Ten) r = 'T';

        return `${r}${this.suit}`;
    }

    get value(): number {
        return this.rank;
    }
}
