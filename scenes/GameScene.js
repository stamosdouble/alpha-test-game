/**
 * Main gameplay scene — wires modular systems together.
 * Art stays in /assets; this file only composes behavior.
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(data) {
    const { width, height } = this.scale;

    // Safety net — never render Phaser's green __MISSING texture.
    PaperTextures.ensureAll(this);

    // Parallax: driven entirely by GameConfig.parallaxLayers
    this.parallax = new ParallaxBackground(this);

    // Boss assembled from part name list — drop PNGs into /assets/boss_parts/
    const bossCfg = GameConfig.boss;
    this.boss = new Boss(
      this,
      bossCfg.x || width / 2,
      bossCfg.y || 140,
      GameConfig.bossParts
    );
    this.boss.setDepth(10);

    // Subtle idle bob so the paper boss feels alive
    this.tweens.add({
      targets: this.boss,
      y: this.boss.y + 8,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Player with centered origin + organic sway
    this.player = new Player(this, width / 2, height - 100);
    this.player.setDepth(20);

    // Tiled paper laser (beam_segment + impact_tip)
    this.laser = new Laser(this);

    this.firing = false;
    this.input.keyboard.on('keydown-SPACE', () => { this.firing = true; });
    this.input.keyboard.on('keyup-SPACE', () => {
      this.firing = false;
      this.laser.hide();
    });

    // Hold mouse / pointer to fire as well
    this.input.on('pointerdown', () => { this.firing = true; });
    this.input.on('pointerup', () => {
      this.firing = false;
      this.laser.hide();
    });

    this.add.text(12, 12, 'Arrows / WASD move · Hold Space or click to fire laser', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#b8a890',
    }).setDepth(100).setScrollFactor(0);

    const footer = (data && data.usedEmbeddedOnly && window.location.protocol === 'file:')
      ? 'file:// mode — embedded placeholders. Use npm start to load /assets PNGs.'
      : (data && data.usedFallbacks)
        ? 'PNG load failed — showing paper fallbacks. Serve project root over HTTP.'
        : 'Swap PNGs in /assets — no JS changes needed';

    this.add.text(12, height - 28, footer, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: (data && (data.usedFallbacks || data.usedEmbeddedOnly)) ? '#e8a060' : '#7a7060',
    }).setDepth(100).setScrollFactor(0);
  }

  update(time, delta) {
    this.parallax.update(delta, 0.15, 1);
    this.player.update(time, delta);

    if (this.firing) {
      // Beam from ship center to boss center; tip tracks every frame.
      this.laser.update(this.player.x, this.player.y, this.boss.x, this.boss.y);
    }
  }
}

window.GameScene = GameScene;
