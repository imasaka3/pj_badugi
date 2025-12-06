import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x2c3e50).setOrigin(0);

        // Title
        this.add.text(width / 2, height / 3, 'BADUGI POKER', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Start Button
        const startBtn = this.add.rectangle(width / 2, height / 2 + 50, 200, 60, 0x27ae60)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height / 2 + 50, 'START GAME', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        startBtn.on('pointerover', () => startBtn.setFillStyle(0x2ecc71));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x27ae60));
        startBtn.on('pointerdown', () => this.scene.start('GameScene'));

        // Logs Button
        const logsBtn = this.add.rectangle(width / 2, height / 2 + 130, 200, 60, 0x3498db)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height / 2 + 130, 'LOGS', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        logsBtn.on('pointerover', () => logsBtn.setFillStyle(0x2980b9));
        logsBtn.on('pointerout', () => logsBtn.setFillStyle(0x3498db));
        logsBtn.on('pointerdown', () => this.scene.start('LogListScene'));
    }
}
