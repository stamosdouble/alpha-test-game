/**
 * PreloadScene — loads every asset referenced by config / modules.
 * Swap PNGs under /assets freely; keys stay the same.
 * Surfaces load failures so missing art is obvious instead of silent blanks.
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this.failedFiles = [];
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

    this.load.on('loaderror', (file) => {
      const src = (file && (file.src || file.url || file.key)) || 'unknown';
      this.failedFiles.push(String(src));
      console.error('[Preload] Failed to load:', src, file);
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
    if (this.failedFiles.length > 0) {
      const width = this.cameras.main.width;
      this.add.rectangle(width / 2, 300, 700, 220, 0x2a1c14, 0.92);
      this.add.text(width / 2, 220, 'Some assets failed to load', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8a060',
      }).setOrigin(0.5);

      const list = this.failedFiles.slice(0, 8).map((f) => `• ${f}`).join('\n');
      this.add.text(width / 2, 320, `${list}\n\nServe from the project root:\nnpx serve .   or   python3 -m http.server 8080`, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#d8cbb8',
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5);

      // Still enter the game so any successful assets are visible.
      this.time.delayedCall(2500, () => this.scene.start('GameScene'));
      return;
    }

    this.scene.start('GameScene');
  }
}

window.PreloadScene = PreloadScene;
