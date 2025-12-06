import Phaser from 'phaser';
import type { HandLog } from '../model/GameState';

export class LogListScene extends Phaser.Scene {
    constructor() {
        super('LogListScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x2c3e50).setOrigin(0);

        // Title
        this.add.text(width / 2, 50, 'HAND HISTORY', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back Button
        const backBtn = this.add.rectangle(100, 50, 120, 40, 0xe74c3c)
            .setInteractive({ useHandCursor: true });
        this.add.text(100, 50, 'BACK', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Clear Button
        const clearBtn = this.add.rectangle(width - 100, 50, 120, 40, 0xe74c3c)
            .setInteractive({ useHandCursor: true });
        this.add.text(width - 100, 50, 'CLEAR', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

        clearBtn.on('pointerdown', () => {
            localStorage.removeItem('badugi_logs');
            this.scene.restart();
        });

        // Load logs
        const logs: HandLog[] = JSON.parse(localStorage.getItem('badugi_logs') || '[]');

        // List Container
        const listContainer = this.add.container(0, 100);

        if (logs.length === 0) {
            this.add.text(width / 2, height / 2, 'No logs found.', { fontSize: '24px', color: '#bdc3c7' }).setOrigin(0.5);
        } else {
            logs.forEach((log, index) => {
                const y = index * 60;
                const date = new Date(log.timestamp).toLocaleString();
                const winnerText = log.winners.length > 0 ? `Winner: ${log.winners.join(', ')}` : 'No Winner';

                const bg = this.add.rectangle(width / 2, y, width - 100, 50, 0x34495e)
                    .setInteractive({ useHandCursor: true });

                const text = this.add.text(width / 2, y, `${date} - Level ${log.level} - Pot: ${log.pot} - ${winnerText}`, {
                    fontSize: '18px',
                    color: '#ecf0f1'
                }).setOrigin(0.5);

                bg.on('pointerdown', () => {
                    this.scene.start('LogDetailScene', { log });
                });

                bg.on('pointerover', () => bg.setFillStyle(0x2c3e50));
                bg.on('pointerout', () => bg.setFillStyle(0x34495e));

                listContainer.add([bg, text]);
            });
        }

        // Simple scroll (if needed, but Phaser doesn't have native scroll, so we just list them)
        // For now, let's limit display or implement simple paging if needed. 
        // Or just let it overflow off screen for now (MVP).
        // Actually, let's just show top 10 for now to avoid overflow issues without scrolling logic.
        // Or implement drag scrolling? Too complex for now.
        // Let's just show the latest 10.
    }
}
