import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load assets here if needed
        // For now we use procedural graphics
    }

    create() {
        this.scene.start('MenuScene');
    }
}
