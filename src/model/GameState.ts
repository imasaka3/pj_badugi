import type { Card } from './Card';
import { Deck } from './Deck';
import { HandEvaluator } from './HandEvaluator';
import type { TournamentStructure } from './TournamentStructure';

export const GamePhase = {
    Betting1: 0,
    Draw1: 1,
    Betting2: 2,
    Draw2: 3,
    Betting3: 4,
    Draw3: 5,
    Betting4: 6,
    Showdown: 7,
    GameOver: 8
} as const;

export const StartStack = 30000;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export interface Player {
    id: string;
    name: string;
    isCpu: boolean;
    chips: number;
    hand: Card[];
    currentRoundBet: number; // Amount bet in the current betting round
    hasFolded: boolean;
    isAllIn: boolean;
    lastAction: string | null;
    drawHistory: number[]; // [draw1, draw2, draw3] - cards discarded in each draw phase
}

export interface ActionLog {
    playerName: string;
    action: string;
    amount?: number;
}

export interface RoundLog {
    phase: string;
    actions: ActionLog[];
    hands: Record<string, string[]>; // Snapshot of hands at start of round (or after draw)
}

export interface HandLog {
    timestamp: number;
    level: number;
    pot: number;
    winners: string[];
    players: {
        name: string;
        hand: string[];
        result: string;
        chipsChange: number;
    }[];
    rounds: RoundLog[];
}

export class GameState {
    deck: Deck;
    players: Player[];
    pot: number;
    currentBet: number; // The amount needed to match (total for the round)
    dealerIndex: number;
    currentPlayerIndex: number;
    phase: GamePhase;
    tournament: TournamentStructure;
    betsInRound: number; // Number of raises in current round (0 = check/open, 1 = bet, 2 = raise, etc.)
    // Actually, usually: Bet (1), Raise (2), Re-raise (3), Cap (4).
    // User said "5 bet cap". So Bet, Raise, Raise, Raise, Raise? Or Bet + 4 Raises?
    // Let's assume 5 bets total allowed.

    // Logging
    private currentHandLog: HandLog | null = null;
    private currentRoundLog: RoundLog | null = null;

    constructor(tournament: TournamentStructure) {
        this.tournament = tournament;
        this.deck = new Deck();
        this.players = [
            { id: 'p1', name: 'You', isCpu: false, chips: StartStack, hand: [], currentRoundBet: 0, hasFolded: false, isAllIn: false, lastAction: null, drawHistory: [0, 0, 0] }
        ];
        // Add 6 CPU players
        for (let i = 1; i <= 6; i++) {
            this.players.push({
                id: `cpu${i}`,
                name: `CPU ${i}`,
                isCpu: true,
                chips: StartStack,
                hand: [],
                currentRoundBet: 0,
                hasFolded: false,
                isAllIn: false,
                lastAction: null,
                drawHistory: [0, 0, 0],
            });
        }

        this.pot = 0;
        this.currentBet = 0;
        this.dealerIndex = 0; // Randomize?
        this.currentPlayerIndex = 0;
        this.phase = GamePhase.GameOver; // Start in GameOver state, need to call startHand
        this.betsInRound = 0;
    }

    startHand() {
        const level = this.tournament.getCurrentLevel();
        this.deck.reset();
        this.deck.shuffle();
        this.phase = GamePhase.Betting1;
        this.pot = 0;
        this.currentBet = 0;
        this.betsInRound = 0;

        // Rotate dealer
        // If it's the first hand (phase is GameOver and dealerIndex is 0), maybe don't rotate?
        // But we initialized dealerIndex to 0.
        // Let's assume we rotate at the START of every hand except the very first one?
        // Or just rotate every time.
        // If we want random start, we should have done it in constructor.
        // Let's rotate here.
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

        // Reset players
        for (const p of this.players) {
            if (p.chips > 0) {
                p.hand = this.deck.deal(4);
                p.hasFolded = false;
            } else {
                p.hand = [];
                p.hasFolded = true; // Effectively folded/out
            }
            p.currentRoundBet = 0;
            p.isAllIn = false;
            p.lastAction = null;
            p.drawHistory = [0, 0, 0]; // Initialize draw tracking
        }

        // Initialize Log
        this.currentHandLog = {
            timestamp: Date.now(),
            level: level.level,
            pot: 0,
            winners: [],
            players: [],
            rounds: []
        };
        this.startNewRoundLog('Pre-Draw Betting');

        // Blinds
        const activePlayers = this.players.filter(p => p.chips > 0);
        if (activePlayers.length < 2) {
            // Game over, winner determined
            return;
        }

        // Find SB and BB relative to Dealer
        // We need to skip busted players for blinds?
        // Standard rule: Blinds move to next active players.

        let sbIndex = (this.dealerIndex + 1) % this.players.length;
        while (this.players[sbIndex].chips === 0) sbIndex = (sbIndex + 1) % this.players.length;

        let bbIndex = (sbIndex + 1) % this.players.length;
        while (this.players[bbIndex].chips === 0) bbIndex = (bbIndex + 1) % this.players.length;

        this.postBlind(this.players[sbIndex], level.smallBlind);
        this.postBlind(this.players[bbIndex], level.bigBlind);

        // Pre-draw action starts left of BB
        let startIndex = (bbIndex + 1) % this.players.length;
        while (this.players[startIndex].chips === 0) startIndex = (startIndex + 1) % this.players.length;

        this.currentPlayerIndex = startIndex;
        this.currentBet = level.bigBlind;
    }

    private startNewRoundLog(phaseName: string) {
        if (this.currentRoundLog) {
            this.currentHandLog?.rounds.push(this.currentRoundLog);
        }

        const handsSnapshot: Record<string, string[]> = {};
        this.players.forEach(p => {
            if (!p.hasFolded && (p.chips > 0 || p.isAllIn)) {
                handsSnapshot[p.name] = p.hand.map(c => c.toString());
            }
        });

        this.currentRoundLog = {
            phase: phaseName,
            actions: [],
            hands: handsSnapshot
        };
    }

    private logAction(player: Player, action: string, amount?: number) {
        if (this.currentRoundLog) {
            this.currentRoundLog.actions.push({
                playerName: player.name,
                action: action,
                amount: amount
            });
        }
    }

    private postBlind(player: Player, amount: number) {
        if (player.chips <= 0) return; // Should not happen if we check active
        const actualAmount = Math.min(player.chips, amount);
        player.chips -= actualAmount;
        player.currentRoundBet += actualAmount;
        this.pot += actualAmount;
        if (player.chips === 0) player.isAllIn = true;

        this.logAction(player, `Post Blind`, actualAmount);
    }

    // Actions
    fold() {
        const player = this.getCurrentPlayer();
        player.hasFolded = true;
        player.lastAction = 'Fold';
        this.logAction(player, 'Fold');

        // Check if only one player left
        const activePlayers = this.players.filter(p => !p.hasFolded);
        if (activePlayers.length === 1) {
            this.awardPot(activePlayers[0]);
            this.phase = GamePhase.GameOver;
        } else {
            this.advanceTurn();
        }
    }

    call() {
        const player = this.getCurrentPlayer();
        const amountNeeded = this.currentBet - player.currentRoundBet;

        if (amountNeeded <= 0) {
            // It's actually a check
            this.check();
            return;
        }

        const actualAmount = Math.min(player.chips, amountNeeded);

        player.chips -= actualAmount;
        player.currentRoundBet += actualAmount;
        this.pot += actualAmount;
        if (player.chips === 0) player.isAllIn = true;

        player.lastAction = 'Call';
        this.logAction(player, 'Call', actualAmount);
        this.advanceTurn();
    }

    check() {
        const player = this.getCurrentPlayer();
        if (player.currentRoundBet < this.currentBet) {
            throw new Error("Cannot check, must call");
        }
        player.lastAction = 'Check';
        this.logAction(player, 'Check');
        this.advanceTurn();
    }

    betOrRaise() {
        const player = this.getCurrentPlayer();
        const level = this.tournament.getCurrentLevel();

        // Determine bet size
        let betSize = level.bigBlind;
        if (this.phase === GamePhase.Betting3 || this.phase === GamePhase.Betting4) {
            betSize = level.bigBlind * 2;
        }

        // Check if this is a Bet or a Raise
        // If currentBet is 0, it's a Bet. If > 0, it's a Raise.
        // Note: In Betting1, currentBet starts at BB, so it's always a Raise (opening raise).
        const isBet = this.currentBet === 0;
        const actionLabel = isBet ? 'Bet' : 'Raise';

        // Check cap
        if (this.betsInRound >= 5) {
            // Cannot raise
            throw new Error("Cap reached");
        }

        const newTotalBet = this.currentBet + betSize;
        const amountNeeded = newTotalBet - player.currentRoundBet;

        if (player.chips < amountNeeded) {
            // All-in
            const allInAmount = player.chips;
            player.chips = 0;
            player.currentRoundBet += allInAmount;
            this.pot += allInAmount;
            player.isAllIn = true;
            if (player.currentRoundBet > this.currentBet) {
                this.currentBet = player.currentRoundBet;
            }
            this.logAction(player, `All-In ${actionLabel}`, allInAmount);
        } else {
            player.chips -= amountNeeded;
            player.currentRoundBet += amountNeeded;
            this.pot += amountNeeded;
            this.currentBet = newTotalBet;
            this.betsInRound++;
            this.logAction(player, actionLabel, amountNeeded);
        }

        player.lastAction = actionLabel;
        this.advanceTurn();
    }

    draw(cardsToDiscard: Card[]) {
        const player = this.getCurrentPlayer();
        
        // Record draw count for strategy tracking
        const drawCount = cardsToDiscard.length;
        if (this.phase === GamePhase.Draw1) player.drawHistory[0] = drawCount;
        else if (this.phase === GamePhase.Draw2) player.drawHistory[1] = drawCount;
        else if (this.phase === GamePhase.Draw3) player.drawHistory[2] = drawCount;
        
        // Remove discarded cards
        player.hand = player.hand.filter(c => !cardsToDiscard.includes(c));
        // Deal new cards
        const newCards = this.deck.dealWithChange(cardsToDiscard);
        player.hand.push(...newCards);

        player.lastAction = `Drew ${cardsToDiscard.length}`;
        this.logAction(player, `Draw ${cardsToDiscard.length}`);
        this.advanceTurn();
    }

    standPat() {
        const player = this.getCurrentPlayer();
        
        // Record standing pat as 0 draws
        if (this.phase === GamePhase.Draw1) player.drawHistory[0] = 0;
        else if (this.phase === GamePhase.Draw2) player.drawHistory[1] = 0;
        else if (this.phase === GamePhase.Draw3) player.drawHistory[2] = 0;
        
        player.lastAction = 'Stand Pat';
        this.logAction(player, 'Stand Pat');
        this.advanceTurn();
    }

    private playersActedInRound: Set<string> = new Set();

    private advanceTurn() {
        const currentPlayer = this.getCurrentPlayer();
        this.playersActedInRound.add(currentPlayer.id);

        if (this.isRoundComplete()) {
            this.nextPhase();
        } else {
            // Find next active player
            let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
            let loopCount = 0;

            const isBetting = [GamePhase.Betting1, GamePhase.Betting2, GamePhase.Betting3, GamePhase.Betting4].includes(this.phase as any);

            while (loopCount < this.players.length) {
                const p = this.players[nextIndex];
                // Skip if folded
                // Skip if eliminated (chips=0 and not all-in)
                // Skip if all-in AND it is a betting phase

                const isEliminated = p.chips === 0 && !p.isAllIn;
                const skipAllIn = p.isAllIn && isBetting;

                if (!p.hasFolded && !isEliminated && !skipAllIn) {
                    break; // Found valid player
                }

                nextIndex = (nextIndex + 1) % this.players.length;
                loopCount++;
            }

            this.currentPlayerIndex = nextIndex;

            // Check again if round complete (e.g. everyone else is all-in)
            if (this.isRoundComplete()) {
                this.nextPhase();
            }
        }
    }

    private isRoundComplete(): boolean {
        const playersInHand = this.players.filter(p => !p.hasFolded);

        // Check if all players who CAN act have acted
        // Players who can act: Not Folded.
        // If Betting phase: Not All-In.
        // If Draw phase: All-In players CAN act.

        const isBetting = [GamePhase.Betting1, GamePhase.Betting2, GamePhase.Betting3, GamePhase.Betting4].includes(this.phase as any);

        const playersCanAct = playersInHand.filter(p => {
            if (isBetting) return !p.isAllIn;
            return true; // In draw phase, everyone in hand can act (even all-in)
        });

        if (playersCanAct.length === 0) return true; // Everyone all-in or folded

        // 1. All players who can act have acted at least once in this round
        const allActed = playersCanAct.every(p => this.playersActedInRound.has(p.id));

        // 2. Bets match (only relevant for betting phase)
        let betsMatch = true;
        if (isBetting) {
            betsMatch = playersInHand.every(p => p.currentRoundBet === this.currentBet || p.isAllIn);
        }

        return allActed && betsMatch;
    }

    private nextPhase() {
        this.playersActedInRound.clear();
        this.betsInRound = 0;
        this.currentBet = 0;

        for (const p of this.players) {
            p.currentRoundBet = 0;
        }

        let phaseName = '';
        switch (this.phase) {
            case GamePhase.Betting1:
                this.phase = GamePhase.Draw1;
                phaseName = 'Draw 1';
                break;
            case GamePhase.Draw1:
                this.phase = GamePhase.Betting2;
                phaseName = 'Betting 2';
                break;
            case GamePhase.Betting2:
                this.phase = GamePhase.Draw2;
                phaseName = 'Draw 2';
                break;
            case GamePhase.Draw2:
                this.phase = GamePhase.Betting3;
                phaseName = 'Betting 3';
                break;
            case GamePhase.Betting3:
                this.phase = GamePhase.Draw3;
                phaseName = 'Draw 3';
                break;
            case GamePhase.Draw3:
                this.phase = GamePhase.Betting4;
                phaseName = 'Betting 4';
                break;
            case GamePhase.Betting4:
                this.phase = GamePhase.Showdown;
                this.handleShowdown();
                return;
        }

        this.startNewRoundLog(phaseName);

        // Set start player for next phase
        // Betting rounds: Starts left of Dealer (SB)
        // Draw rounds: Starts left of Dealer (SB)

        let startIndex = (this.dealerIndex + 1) % this.players.length;
        const isBetting = [GamePhase.Betting1, GamePhase.Betting2, GamePhase.Betting3, GamePhase.Betting4].includes(this.phase as any);

        // Find first active player
        let loopCount = 0;
        while (loopCount < this.players.length) {
            const p = this.players[startIndex];
            const isEliminated = p.chips === 0 && !p.isAllIn;
            const skipAllIn = p.isAllIn && isBetting;

            if (!p.hasFolded && !isEliminated && !skipAllIn) {
                break;
            }
            startIndex = (startIndex + 1) % this.players.length;
            loopCount++;
        }
        this.currentPlayerIndex = startIndex;
    }

    private handleShowdown() {
        this.startNewRoundLog('Showdown');
        const activePlayers = this.players.filter(p => !p.hasFolded);

        if (activePlayers.length === 1) {
            this.awardPot(activePlayers[0]);
            this.phase = GamePhase.GameOver; // Immediate end if everyone folded
        } else {
            // Evaluate all hands
            const evaluations = activePlayers.map(p => ({
                player: p,
                rank: HandEvaluator.evaluate(p.hand)
            }));

            // Sort by rank (descending, but remember compareTo returns >0 if better)
            evaluations.sort((a, b) => b.rank.compareTo(a.rank));

            // Handle ties
            const winnerRank = evaluations[0].rank;
            const winners = evaluations.filter(e => e.rank.compareTo(winnerRank) === 0).map(e => e.player);

            if (winners.length === 1) {
                this.awardPot(winners[0]);
            } else {
                this.awardPot(null, winners);
            }

            // Stay in Showdown phase so UI can show cards
            this.phase = GamePhase.Showdown;
        }

        // Dealer rotation moved to startHand
    }

    private saveHandLog(winners: Player[]) {
        if (!this.currentHandLog) return;

        // Push final round log
        if (this.currentRoundLog) {
            this.currentHandLog.rounds.push(this.currentRoundLog);
        }

        this.currentHandLog.pot = this.pot; // Note: pot is cleared in awardPot, so we need to capture it before or pass it.
        // Actually awardPot clears pot. We should call saveHandLog BEFORE clearing pot or pass the pot value.
        // Let's modify awardPot to call saveHandLog.
        this.currentHandLog.winners = winners.map(p => p.name);
        this.currentHandLog.players = this.players.map(p => ({
            name: p.name,
            hand: p.hand.map(c => c.toString()),
            result: p.lastAction || '',
            chipsChange: 0 // Placeholder for now
        }));

        const logs: HandLog[] = JSON.parse(localStorage.getItem('badugi_logs') || '[]');
        logs.unshift(this.currentHandLog); // Add to beginning
        if (logs.length > 100) logs.pop(); // Limit to 100
        localStorage.setItem('badugi_logs', JSON.stringify(logs));

        this.currentHandLog = null;
        this.currentRoundLog = null;
    }

    private awardPot(winner: Player | null, winners: Player[] = []) {
        const actualWinners = winner ? [winner] : winners;

        // Save log before modifying chips/pot too much (though we need to know who won)
        // But we need the pot value.
        // const currentPot = this.pot; // Unused

        if (winner) {
            winner.chips += this.pot;
            winner.lastAction = 'Win';
        } else if (winners.length > 0) {
            const share = Math.floor(this.pot / winners.length);
            for (const w of winners) {
                w.chips += share;
                w.lastAction = 'Tie';
            }
            // Odd chips
            let remainder = this.pot % winners.length;
            if (remainder > 0) {
                winners[0].chips += remainder;
            }
        }

        this.saveHandLog(actualWinners);
        this.pot = 0;
    }

    getCurrentPlayer(): Player {
        return this.players[this.currentPlayerIndex];
    }
}


