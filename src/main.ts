import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

import { LogListScene } from './scenes/LogListScene';
import { LogDetailScene } from './scenes/LogDetailScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'app',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [BootScene, MenuScene, GameScene, LogListScene, LogDetailScene]
};

// Request landscape orientation lock on mobile devices
if (screen.orientation && 'lock' in screen.orientation) {
  const orientation = screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> };
  orientation.lock('landscape').catch((err: unknown) => {
    console.log('Orientation lock not supported or failed:', err);
  });
}

new Phaser.Game(config);
