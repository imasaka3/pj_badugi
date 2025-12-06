import Phaser from 'phaser';
import type { HandLog } from '../model/GameState';

export class LogDetailScene extends Phaser.Scene {
    private log!: HandLog;

    constructor() {
        super('LogDetailScene');
    }

    init(data: { log: HandLog }) {
        this.log = data.log;
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x2c3e50).setOrigin(0);

        // Title
        this.add.text(width / 2, 40, 'HAND DETAILS', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back Button
        const backBtn = this.add.rectangle(80, 40, 100, 40, 0xe74c3c)
            .setInteractive({ useHandCursor: true });
        this.add.text(80, 40, 'BACK', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

        backBtn.on('pointerdown', () => this.scene.start('LogListScene'));

        // Info Header
        const date = new Date(this.log.timestamp).toLocaleString();
        this.add.text(width / 2, 80, `${date} | Level: ${this.log.level} | Pot: ${this.log.pot}`, {
            fontSize: '20px',
            color: '#f1c40f'
        }).setOrigin(0.5);

        // Scrollable Container for Rounds
        // Phaser doesn't have native scrolling, so we'll implement a simple drag-to-scroll container
        // or just list them and hope it fits. For detailed logs, it likely won't fit.
        // Let's implement a simple camera scroll or container drag.
        // Using a container and masking is standard.

        const contentX = 50;
        const contentY = 120;
        const contentWidth = width - 100;
        const contentHeight = height - 140;

        const container = this.add.container(contentX, contentY);

        // Mask
        const shape = this.make.graphics();
        shape.fillStyle(0xffffff);
        shape.fillRect(contentX, contentY, contentWidth, contentHeight);
        const mask = shape.createGeometryMask();
        container.setMask(mask);

        let currentY = 0;

        // Render Rounds
        if (this.log.rounds) {
            this.log.rounds.forEach(round => {
                // Round Header
                const roundHeader = this.add.text(0, currentY, `--- ${round.phase} ---`, {
                    fontSize: '22px',
                    color: '#3498db',
                    fontStyle: 'bold'
                });
                container.add(roundHeader);
                currentY += 30;

                // Hands Snapshot (if available)
                if (round.hands) {
                    // Only show hands for active players in this round? Or all?
                    // Let's show all available in snapshot
                    let handY = currentY;
                    Object.entries(round.hands).forEach(([name, hand]) => {
                        const handText = this.add.text(20, handY, `${name}: ${hand.join(' ')}`, {
                            fontSize: '16px',
                            color: '#bdc3c7'
                        });
                        container.add(handText);
                        handY += 20;
                    });
                    currentY = handY + 10;
                }

                // Actions
                round.actions.forEach(action => {
                    let actionStr = `${action.playerName}: ${action.action}`;
                    if (action.amount) actionStr += ` (${action.amount})`;

                    const actionText = this.add.text(20, currentY, actionStr, {
                        fontSize: '18px',
                        color: '#ecf0f1'
                    });
                    container.add(actionText);
                    currentY += 25;
                });

                currentY += 20; // Spacing between rounds
            });
        } else {
            // Fallback for old logs without rounds
            const text = this.add.text(0, 0, "Detailed history not available for this log.", {
                fontSize: '20px', color: '#bdc3c7'
            });
            container.add(text);
        }

        // Final Result Summary
        const summaryHeader = this.add.text(0, currentY, `--- Final Results ---`, {
            fontSize: '22px',
            color: '#2ecc71',
            fontStyle: 'bold'
        });
        container.add(summaryHeader);
        currentY += 30;

        this.log.players.forEach(p => {
            let color = '#ffffff';
            if (this.log.winners.includes(p.name)) color = '#2ecc71';
            else if (p.result === 'Fold') color = '#95a5a6';

            const resText = this.add.text(20, currentY, `${p.name} (${p.result}) - ${p.hand.join(' ')}`, {
                fontSize: '18px',
                color: color
            });
            container.add(resText);
            currentY += 25;
        });

        currentY += 50; // Bottom padding

        // Scrolling Logic
        const zone = this.add.zone(contentX, contentY, contentWidth, contentHeight)
            .setOrigin(0)
            .setInteractive();

        zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
                container.y += (pointer.y - pointer.prevPosition.y);

                // Bounds
                const minY = contentY - (currentY - contentHeight);
                const maxY = contentY;

                if (currentY < contentHeight) {
                    container.y = contentY; // No scroll needed
                } else {
                    if (container.y > maxY) container.y = maxY;
                    if (container.y < minY) container.y = minY;
                }
            }
        });

        // Mouse wheel support
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
            container.y -= deltaY * 0.5;
            // Bounds
            const minY = contentY - (currentY - contentHeight);
            const maxY = contentY;

            if (currentY < contentHeight) {
                container.y = contentY;
            } else {
                if (container.y > maxY) container.y = maxY;
                if (container.y < minY) container.y = minY;
            }
        });
    }
}
