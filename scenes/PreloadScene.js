/**
 * PreloadScene — loads PNGs from /assets, then fills any gaps with
 * procedural paper textures so Phaser's green __MISSING grid never appears.
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
      console.error('[Preload] Failed to load:', src);
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      label.destroy();
    });

    ParallaxBackground.preload(this);
    Player.preload(this);
    Laser.preload(this);
    Boss.preload(this, GameConfig.bossParts);
  }

  create() {
    // Replace any missing PNG keys with procedural paper art (kills green grid).
    const generated = PaperTextures.ensureAll(this);

    if (generated.length > 0 || this.failedFiles.length > 0) {
      console.warn(
        '[Preload] Using procedural placeholders for:',
        generated,
        'Failed files:',
        this.failedFiles
      );
    }

    this.scene.start('GameScene', {
      usedFallbacks: generated.length > 0,
      failedFiles: this.failedFiles.slice(),
    });
  }
}

window.PreloadScene = PreloadScene;
