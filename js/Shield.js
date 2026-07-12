/**
 * Shield power-up.
 *
 * An "S" token drifts down the screen; collecting it wraps the player in
 * orbiting yellow paper circles. The shield absorbs bullet hits (10 by
 * default) before breaking. Art is /assets/effects/shield_orb.png.
 */
class Shield {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.shield
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.shield) || {};
    this.key = options.key || cfg.key || 'shield_orb';
    this.maxHits = options.hits != null ? options.hits : (cfg.hits || 10);
    this.orbCount = options.orbCount != null ? options.orbCount : (cfg.orbCount || 3);
    this.orbitRadius = options.orbitRadius != null ? options.orbitRadius : (cfg.orbitRadius || 42);
    this.orbitSpeed = options.orbitSpeed != null ? options.orbitSpeed : (cfg.orbitSpeed || 2.6);
    this.orbScale = options.orbScale != null ? options.orbScale : (cfg.orbScale || 0.45);
    this.pickupIntervalMs = options.pickupIntervalMs != null ? options.pickupIntervalMs : (cfg.pickupIntervalMs || 12000);
    this.pickupDriftSpeed = options.pickupDriftSpeed != null ? options.pickupDriftSpeed : (cfg.pickupDriftSpeed || 55);

    this.hitsLeft = 0;
    this.orbs = [];
    this.pickup = null;
    this.pickupText = null;
    this.pickupBornAt = 0;

    // First token appears shortly after the fight starts, then on a cycle.
    scene.time.delayedCall(4000, () => this._maybeSpawnPickup());
    scene.time.addEvent({
      delay: this.pickupIntervalMs,
      loop: true,
      callback: () => this._maybeSpawnPickup(),
    });
  }

  /** Preload the shield orb sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.shield) || {};
    scene.load.image(
      cfg.key || 'shield_orb',
      resolveAsset(cfg.path || 'assets/effects/shield_orb.png')
    );
  }

  /** True while the shield is up. */
  isActive() {
    return this.hitsLeft > 0;
  }

  /**
   * Absorb one bullet hit. Breaks the shield at zero.
   * @returns {boolean} true if the hit was absorbed
   */
  absorbHit() {
    if (!this.isActive()) return false;
    this.hitsLeft -= 1;

    // Flash the orbs so absorption reads clearly.
    this.orbs.forEach((orb) => {
      orb.setAlpha(0.35);
      this.scene.tweens.add({ targets: orb, alpha: 1, duration: 160 });
    });

    if (this.hitsLeft <= 0) {
      this._break();
    }
    return true;
  }

  /** Activate (or refresh) the shield around the player. */
  activate() {
    this.hitsLeft = this.maxHits;
    if (this.orbs.length === 0) {
      for (let i = 0; i < this.orbCount; i++) {
        const orb = this.scene.add.image(0, 0, this.key);
        orb.setScale(this.orbScale);
        orb.setDepth(25);
        this.orbs.push(orb);
      }
    }
  }

  _break() {
    const player = this.scene.player;
    if (player && this.scene.sparks) {
      this.scene.sparks.burst(player.x, player.y);
    }
    this.orbs.forEach((orb) => orb.destroy());
    this.orbs = [];
    this.hitsLeft = 0;
  }

  _maybeSpawnPickup() {
    if (this.pickup || this.isActive()) return;
    const { width } = this.scene.scale;
    const x = Phaser.Math.Between(80, width - 80);

    this.pickup = this.scene.add.image(x, -30, this.key);
    this.pickup.setScale(0.9);
    this.pickup.setDepth(18);
    this.pickupText = this.scene.add.text(x, -30, 'S', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#2a241c',
    }).setOrigin(0.5).setDepth(19);
    this.pickupBornAt = this.scene.time.now;
  }

  _destroyPickup() {
    if (this.pickup) this.pickup.destroy();
    if (this.pickupText) this.pickupText.destroy();
    this.pickup = null;
    this.pickupText = null;
  }

  /**
   * Drift the pickup, check collection, and orbit the shield circles.
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    const dt = delta / 1000;
    const player = this.scene.player;

    if (this.pickup) {
      const age = (time - this.pickupBornAt) / 1000;
      this.pickup.y += this.pickupDriftSpeed * dt;
      this.pickup.x += Math.sin(age * 2.2) * 40 * dt;
      this.pickup.rotation = Math.sin(age * 1.6) * 0.25;
      this.pickupText.setPosition(this.pickup.x, this.pickup.y);
      this.pickupText.rotation = this.pickup.rotation;

      if (this.pickup.y > this.scene.scale.height + 40) {
        this._destroyPickup();
      } else if (player && player.visible) {
        const d = Phaser.Math.Distance.Between(player.x, player.y, this.pickup.x, this.pickup.y);
        if (d < 36) {
          this._destroyPickup();
          this.activate();
        }
      }
    }

    if (this.isActive() && player) {
      const base = (time / 1000) * this.orbitSpeed;
      this.orbs.forEach((orb, i) => {
        const angle = base + (i / this.orbs.length) * Math.PI * 2;
        orb.setPosition(
          player.x + Math.cos(angle) * this.orbitRadius,
          player.y + Math.sin(angle) * this.orbitRadius
        );
        orb.setVisible(player.visible);
      });
    }
  }
}

window.Shield = Shield;
