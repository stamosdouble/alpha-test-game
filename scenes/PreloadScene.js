/**
 * PreloadScene — loads every asset referenced by config / modules.
 * Swap PNGs under /assets freely; keys stay the same.
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 24, 0x2a303c);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 4, 16, 0xc4a484).setOrigin(0, 0.5);
    const label = this.add.text(width / 2, height / 2 - 40, 'Cutting paper…', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d8cbb8',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 4 + 312 * value;
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      label.destroy();
    });

    // Modular preload hooks — each system owns its asset paths.
    ParallaxBackground.preload(this);
    Player.preload(this);
    Laser.preload(this);
    Boss.preload(this, GameConfig.bossParts);
  }

  create() {
    this.scene.start('GameScene');
  }
}

window.PreloadScene = PreloadScene;
