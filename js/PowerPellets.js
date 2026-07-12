/**
 * Collectible power pellets.
 *
 * The boss occasionally exhales a string of white paper pellets that drift
 * toward the player's side of the screen. They deal no damage — flying into
 * them fills the power meter (see GameScene) toward a homing blast.
 * Art: /assets/effects/power_pellet.png
 */
class PowerPellets {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.power
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.power) || {};
    this.key = options.pelletKey || cfg.pelletKey || 'power_pellet';
    this.stringIntervalMs = options.stringIntervalMs != null ? options.stringIntervalMs : (cfg.stringIntervalMs || 9000);
    this.stringCount = options.stringCount != null ? options.stringCount : (cfg.stringCount || 6);
    this.stringGapMs = options.stringGapMs != null ? options.stringGapMs : (cfg.stringGapMs || 130);
    this.speed = options.pelletSpeed != null ? options.pelletSpeed : (cfg.pelletSpeed || 120);

    this.group = scene.physics.add.group({
      defaultKey: this.key,
      maxSize: 40,
    });

    scene.time.addEvent({
      delay: this.stringIntervalMs,
      loop: true,
      callback: () => this.fireString(),
    });
  }

  /** Preload the pellet sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.power) || {};
    scene.load.image(
      cfg.pelletKey || 'power_pellet',
      resolveAsset(cfg.pelletPath || 'assets/effects/power_pellet.png')
    );
  }

  /** Emit a string of pellets from one boss muzzle, spaced into a line. */
  fireString() {
    const boss = this.scene.boss;
    if (!boss || !boss.visible || this.scene.bossEntranceDone === false) return;
    if (this.scene.playerDead) return;

    // Alternate wings per string.
    this._muzzleFlip = !this._muzzleFlip;

    for (let i = 0; i < this.stringCount; i++) {
      this.scene.time.delayedCall(i * this.stringGapMs, () => {
        const b = this.scene.boss;
        if (!b || !b.visible) return;
        const muzzles = b.getMuzzles ? b.getMuzzles() : [{ x: b.x, y: b.y }];
        const m = muzzles[this._muzzleFlip ? 0 : muzzles.length - 1];

        // Gentle downward drift with a slight lean toward the player.
        const player = this.scene.player;
        const lean = player ? Phaser.Math.Clamp((player.x - m.x) / 900, -0.35, 0.35) : 0;
        const angle = Math.PI / 2 + lean;

        const pellet = this.group.get(m.x, m.y);
        if (!pellet) return;
        pellet.setTexture(this.key);
        pellet.setActive(true);
        pellet.setVisible(true);
        pellet.setOrigin(0.5, 0.5);
        pellet.setScale(0.8);
        pellet.setDepth(14);
        pellet.body.reset(m.x, m.y);
        pellet.body.setAllowGravity(false);
        pellet.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        pellet.spin = 1.5;
      });
    }
  }

  /**
   * Spin pellets and recycle off-screen ones.
   * @param {number} delta frame delta ms
   */
  update(delta) {
    const dt = delta / 1000;
    const cam = this.scene.cameras.main;
    const margin = 48;

    this.group.children.each((pellet) => {
      if (!pellet.active) return;
      pellet.rotation += (pellet.spin || 0) * dt;
      if (
        pellet.y < -margin || pellet.y > cam.height + margin ||
        pellet.x < -margin || pellet.x > cam.width + margin
      ) {
        this.group.killAndHide(pellet);
        pellet.body.stop();
      }
    });
  }
}

window.PowerPellets = PowerPellets;
