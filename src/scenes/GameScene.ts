import Phaser from 'phaser';
import { GameState, GamePhase, type Player } from '../model/GameState';
import { TournamentStructure } from '../model/TournamentStructure';
import { Suit, Rank } from '../model/Card';
import { CpuStrategy } from '../model/CpuStrategy';

export class GameScene extends Phaser.Scene {
    private gameState!: GameState;
    private tournament!: TournamentStructure;

    // UI Elements
    private playerContainers: Phaser.GameObjects.Container[] = [];
    private actionButtons: Phaser.GameObjects.Container[] = [];
    private potText!: Phaser.GameObjects.Text;
    private infoText!: Phaser.GameObjects.Text;
    private phaseText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private dealerButton!: Phaser.GameObjects.Container; // Changed type to Container

    private selectedCardIndices: Set<number> = new Set();
    private turnTimerEvent: Phaser.Time.TimerEvent | null = null;
    private timeLeft: number = 30;

    constructor() {
        super('GameScene');
    }

    create() {
        this.tournament = new TournamentStructure();
        this.tournament.start();
        this.gameState = new GameState(this.tournament);
        this.gameState.startHand();

        this.createTable();
        this.createUI();
        this.updateUI();

        // Start turn timer
        this.startTurnTimer();
    }

    update(_time: number, _delta: number) {
        // Check CPU turn
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (currentPlayer.isCpu && this.gameState.phase !== GamePhase.GameOver && this.gameState.phase !== GamePhase.Showdown) {
            // Simple delay for CPU
            if (!this.turnTimerEvent || this.timeLeft > 28) { // Wait 2 seconds
                // Waiting
            } else {
                this.handleCpuTurn();
            }
        }
    }

    private createTable() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x2c3e50).setOrigin(0);

        // Table - moved up and made slightly narrower vertically
        this.add.ellipse(width / 2, height / 2 - 30, width * 0.8, height * 0.55, 0x27ae60);

        // Player Areas
        // 7 Players. P1 (User) at bottom (index 0).
        // Others distributed clockwise? Or standard poker table:
        // P1 bottom. P2 left bottom, P3 left top, P4 top, P5 right top, P6 right bottom?
        // Let's distribute evenly on ellipse.

        const centerX = width / 2;
        const centerY = height / 2 - 30; // Moved table up to provide more bottom spacing
        const radiusX = width * 0.35;
        const radiusY = height * 0.22; // Reduced vertical radius to bring players closer

        // Angles for 7 players. P1 at 90 degrees (bottom).
        // 0 is right. 90 is bottom.
        // We want P1 at bottom.
        const startAngle = Math.PI / 2;
        const angleStep = (2 * Math.PI) / 7;

        for (let i = 0; i < 7; i++) {
            const angle = startAngle + i * angleStep;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);

            const container = this.add.container(x, y);
            this.playerContainers.push(container);
        }

        // Dealer Button
        const dbContainer = this.add.container(0, 0);
        const dbBg = this.add.circle(0, 0, 15, 0xffffff).setStrokeStyle(2, 0x000000);
        const dbText = this.add.text(0, 0, 'D', { fontSize: '16px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
        dbContainer.add([dbBg, dbText]);
        this.dealerButton = dbContainer;
        this.add.existing(this.dealerButton); // Add to scene
    }

    private createUI() {
        const { width, height } = this.scale;

        this.potText = this.add.text(width / 2, height / 2 - 30, 'Pot: 0', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        this.infoText = this.add.text(width / 2, height / 2 - 70, '', { fontSize: '20px', color: '#ffff00' }).setOrigin(0.5);
        this.phaseText = this.add.text(20, 20, '', { fontSize: '24px', color: '#fff' });
        this.timerText = this.add.text(width - 150, 20, 'Time: 30', { fontSize: '32px', color: '#fff' });

        // Action Buttons
        this.createActionButtons();
    }

    private createActionButtons() {
        const { width, height } = this.scale;
        const buttonY = height - 120; // Moved higher to avoid being cut off by browser UI
        const buttonWidth = 120;
        const spacing = 20;
        const startX = width / 2 - (buttonWidth * 2 + spacing * 1.5);

        const actions = ['Fold', 'Check/Call', 'Bet/Raise', 'Draw', 'Stand Pat'];

        actions.forEach((action, index) => {
            const btn = this.add.container(startX + index * (buttonWidth + spacing), buttonY);
            const bg = this.add.rectangle(0, 0, buttonWidth, 40, 0x3498db).setInteractive({ useHandCursor: true });
            const text = this.add.text(0, 0, action, { fontSize: '16px', color: '#fff' }).setOrigin(0.5);

            btn.add([bg, text]);
            btn.setData('action', action);

            bg.on('pointerdown', () => this.handlePlayerAction(action));
            bg.on('pointerover', () => bg.setFillStyle(0x2980b9));
            bg.on('pointerout', () => bg.setFillStyle(0x3498db));

            this.actionButtons.push(btn);
        });
    }

    private updateUI() {
        // Update Players
        this.gameState.players.forEach((player, index) => {
            const container = this.playerContainers[index];

            // Hide only if chips are 0 AND not all-in (meaning they were eliminated in previous hand)
            if (player.chips === 0 && !player.isAllIn) {
                container.setVisible(false);
                return;
            }
            container.setVisible(true);

            const isUser = index === 0;
            // Show CPU cards at Showdown
            const isShowdown = this.gameState.phase === GamePhase.Showdown;
            const faceUp = isUser || isShowdown;

            this.renderPlayer(player, container, faceUp, isUser);
        });

        // Update Dealer Button Position
        const dealerContainer = this.playerContainers[this.gameState.dealerIndex];
        // If dealer is busted, button might be on invisible player.
        // But dealer rotation skips busted players, so dealerIndex should be valid.
        this.dealerButton.setPosition(dealerContainer.x + 50, dealerContainer.y - 50);
        this.dealerButton.setVisible(this.gameState.players[this.gameState.dealerIndex].chips > 0);

        this.potText.setText(`Pot: ${this.gameState.pot} (Bet: ${this.gameState.currentBet})`);

        const level = this.tournament.getCurrentLevel();
        const timeRemaining = this.tournament.getTimeRemaining();
        const nextLevel = this.tournament.getNextLevel();

        let infoStr = `Level ${level.level} - Blinds: ${level.smallBlind}/${level.bigBlind}\nNext: ${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;
        if (nextLevel) {
            infoStr += ` (${nextLevel.smallBlind}/${nextLevel.bigBlind})`;
        }
        this.infoText.setText(infoStr);

        // Phase Text
        let phaseStr = '';
        const p = this.gameState.phase;
        if (p === GamePhase.Betting1) phaseStr = 'Pre-Draw Betting';
        else if (p === GamePhase.Draw1) phaseStr = 'Draw 1';
        else if (p === GamePhase.Betting2) phaseStr = 'Betting 2';
        else if (p === GamePhase.Draw2) phaseStr = 'Draw 2';
        else if (p === GamePhase.Betting3) phaseStr = 'Betting 3';
        else if (p === GamePhase.Draw3) phaseStr = 'Draw 3';
        else if (p === GamePhase.Betting4) phaseStr = 'Betting 4';
        else if (p === GamePhase.Showdown) phaseStr = 'Showdown';
        else if (p === GamePhase.GameOver) phaseStr = 'Game Over';

        this.phaseText.setText(phaseStr);

        // Update buttons visibility/state
        const player = this.gameState.players[0];
        const isPlayerTurn = this.gameState.getCurrentPlayer() === player;
        const isDrawPhase = [GamePhase.Draw1, GamePhase.Draw2, GamePhase.Draw3].includes(this.gameState.phase as any);

        this.actionButtons.forEach(btn => {
            const action = btn.getData('action');
            let visible = isPlayerTurn;

            if (isDrawPhase) {
                if (action === 'Fold' || action === 'Check/Call' || action === 'Bet/Raise') visible = false;
            } else {
                if (action === 'Draw' || action === 'Stand Pat') visible = false;
            }

            btn.setVisible(visible);
            btn.setAlpha(visible ? 1 : 0.5);
        });
    }

    private renderPlayer(player: Player, container: Phaser.GameObjects.Container, faceUp: boolean, isUser: boolean) {
        container.removeAll(true);

        // Player Info
        const nameText = this.add.text(0, 60, `${player.name}\n$${player.chips}`, { fontSize: '16px', color: '#fff', align: 'center' }).setOrigin(0.5);
        container.add(nameText);

        // Current Bet (Chips in front)
        if (player.currentRoundBet > 0) {
            const betText = this.add.text(0, 90, `Bet: ${player.currentRoundBet}`, { fontSize: '14px', color: '#f1c40f' }).setOrigin(0.5);
            container.add(betText);
        }

        // Highlight active player
        if (this.gameState.getCurrentPlayer() === player) {
            const highlight = this.add.circle(0, 0, 60, 0xffff00, 0.3);
            container.addAt(highlight, 0);
        }

        // Last Action
        if (player.lastAction) {
            const actionText = this.add.text(0, -70, player.lastAction, { fontSize: '14px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
            container.add(actionText);
        }

        // Cards
        const cardWidth = 40; // Smaller cards for 7 players
        const cardHeight = 60;
        const spacing = 5;
        const totalWidth = (cardWidth + spacing) * player.hand.length;
        const startX = -totalWidth / 2 + cardWidth / 2;

        player.hand.forEach((card, index) => {
            const x = startX + index * (cardWidth + spacing);
            const cardContainer = this.add.container(x, 0);

            // Card Background
            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xffffff).setStrokeStyle(1, 0x000000);

            if (faceUp) {
                // Suit Color
                const color = (card.suit === Suit.Hearts || card.suit === Suit.Diamonds) ? '#e74c3c' : '#2c3e50';

                // Rank
                let rankStr = card.rank.toString();
                if (card.rank === Rank.Ace) rankStr = 'A';
                else if (card.rank === Rank.Jack) rankStr = 'J';
                else if (card.rank === Rank.Queen) rankStr = 'Q';
                else if (card.rank === Rank.King) rankStr = 'K';
                else if (card.rank === Rank.Ten) rankStr = 'T';

                // Suit Symbol
                let suitSym = '';
                if (card.suit === Suit.Spades) suitSym = '♠';
                else if (card.suit === Suit.Hearts) suitSym = '♡';
                else if (card.suit === Suit.Diamonds) suitSym = '♦';
                else if (card.suit === Suit.Clubs) suitSym = '♣';

                const rankText = this.add.text(-cardWidth / 2 + 2, -cardHeight / 2 + 2, rankStr, { fontSize: '14px', color: color, fontStyle: 'bold' });
                const suitText = this.add.text(0, 5, suitSym, { fontSize: '24px', color: color }).setOrigin(0.5);

                cardContainer.add([bg, rankText, suitText]);

                // Selection logic for Draw phase (User only)
                if (isUser && [GamePhase.Draw1, GamePhase.Draw2, GamePhase.Draw3].includes(this.gameState.phase as any)) {
                    bg.setInteractive({ useHandCursor: true });
                    if (this.selectedCardIndices.has(index)) {
                        bg.setFillStyle(0xbdc3c7); // Selected
                        cardContainer.y -= 10;
                    }

                    bg.on('pointerdown', () => {
                        if (this.selectedCardIndices.has(index)) {
                            this.selectedCardIndices.delete(index);
                        } else {
                            this.selectedCardIndices.add(index);
                        }
                        this.updateUI();
                    });
                }
            } else {
                // Face down
                const back = this.add.rectangle(0, 0, cardWidth - 4, cardHeight - 4, 0x34495e);
                cardContainer.add([bg, back]);
            }

            container.add(cardContainer);
        });
    }

    private startTurnTimer() {
        if (this.turnTimerEvent) this.turnTimerEvent.remove();
        this.timeLeft = 30;
        this.timerText.setText(`Time: ${this.timeLeft}`);

        this.turnTimerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.timerText.setText(`Time: ${this.timeLeft}`);
                if (this.timeLeft <= 0) {
                    this.handleTimeout();
                }
            },
            loop: true
        });
    }

    private handleTimeout() {
        // Auto fold or check
        const player = this.gameState.getCurrentPlayer();
        if (player.isCpu) {
            // Should not happen as CPU is fast, but just in case
            this.handlePlayerAction('Fold');
        } else {
            this.handlePlayerAction('Fold');
        }
    }

    private handlePlayerAction(action: string) {
        // Reset timer
        this.startTurnTimer();

        try {
            switch (action) {
                case 'Fold':
                    this.gameState.fold();
                    break;
                case 'Check/Call':
                    if (this.gameState.currentBet > this.gameState.players[0].currentRoundBet) {
                        this.gameState.call();
                    } else {
                        this.gameState.check();
                    }
                    break;
                case 'Bet/Raise':
                    this.gameState.betOrRaise();
                    break;
                case 'Draw':
                    const cardsToDiscard = this.gameState.players[0].hand.filter((_, i) => this.selectedCardIndices.has(i));
                    this.gameState.draw(cardsToDiscard);
                    this.selectedCardIndices.clear();
                    break;
                case 'Stand Pat':
                    this.gameState.standPat();
                    this.selectedCardIndices.clear();
                    break;
            }
            this.updateUI();

            if (this.gameState.phase === GamePhase.Showdown) {
                // Showdown phase, wait then restart
                this.time.delayedCall(4000, () => {
                    this.gameState.startHand();
                    this.updateUI();
                });
            } else if (this.gameState.phase === GamePhase.GameOver) {
                // Immediate end (everyone folded)
                this.time.delayedCall(2000, () => {
                    this.gameState.startHand();
                    this.updateUI();
                });
            }

        } catch (e) {
            console.error(e);
            // Show error message
        }
    }

    private handleCpuTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer.isCpu) return;

        const action = CpuStrategy.decideAction(this.gameState);

        // If draw phase, decide discards
        if (action === 'Draw') { // This is my custom return for draw phase
            const discards = CpuStrategy.decideDiscards(currentPlayer.hand);
            if (discards.length > 0) {
                this.gameState.draw(discards);
            } else {
                this.gameState.standPat();
            }
        } else {
            // Map string to method
            if (action === 'Fold') this.gameState.fold();
            else if (action === 'Call') this.gameState.call(); // Check is implied if bets equal
            else if (action === 'Raise') this.gameState.betOrRaise();
        }

        // Reset timer for next turn
        this.startTurnTimer();
        this.updateUI();

        if (this.gameState.phase === GamePhase.Showdown) {
            // Showdown phase, wait then restart
            this.time.delayedCall(4000, () => {
                this.gameState.startHand();
                this.updateUI();
            });
        } else if (this.gameState.phase === GamePhase.GameOver) {
            // Immediate end
            this.time.delayedCall(2000, () => {
                this.gameState.startHand();
                this.updateUI();
            });
        }
    }
}
