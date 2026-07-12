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

    // Paper disc projectiles fired from the ship's nose
    this.projectiles = new Projectiles(this);

    // Yellow triangle sparks on projectile impact
    this.sparks = new Sparks(this);

    this.shooting = false;
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => { this.shooting = true; });
    this.spaceKey.on('up', () => { this.shooting = false; });

    // Number keys 1..9 switch projectile type (atlas frame order).
    const types = this.projectiles.getTypes();
    this.input.keyboard.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= types.length && this.projectiles.setType(types[n - 1])) {
        this._updateShotLabel();
      }
    });

    // Hold mouse / pointer for the laser beam
    this.firing = false;
    this.input.on('pointerdown', () => { this.firing = true; });
    this.input.on('pointerup', () => {
      this.firing = false;
      this.laser.hide();
    });

    this.add.text(12, 12, 'Arrows / WASD move · Space shoots · 1-4 swaps shot · Hold click for laser', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#b8a890',
    }).setDepth(100).setScrollFactor(0);

    this.shotLabel = this.add.text(width - 12, 12, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#d8cbb8',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);
    this._updateShotLabel();

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
    this.projectiles.update(delta);
    this._checkBossHits();

    if (this.shooting) {
      // Spawn at the ship's nose, travelling straight up.
      this.projectiles.fire(this.player.x, this.player.y - this.player.displayHeight * 0.5);
    }

    if (this.firing) {
      // Beam from ship center to boss center; tip tracks every frame.
      this.laser.update(this.player.x, this.player.y, this.boss.x, this.boss.y);
    }
  }

  _updateShotLabel() {
    if (!this.shotLabel) return;
    const type = this.projectiles.currentType;
    this.shotLabel.setText(type ? `Shot: ${type}` : '');
  }

  /** Pop sparks where projectiles strike the boss, then recycle the shot. */
  _checkBossHits() {
    if (!this.boss || !this.boss.visible) return;
    const bounds = this.boss.getBounds();

    this.projectiles.group.children.each((shot) => {
      if (!shot.active) return;
      if (bounds.contains(shot.x, shot.y)) {
        this.sparks.burst(shot.x, shot.y);
        this.projectiles.group.killAndHide(shot);
        shot.body.stop();
      }
    });
  }
}

window.GameScene = GameScene;
