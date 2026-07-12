/**
 * Shield power-up.
 *
 * An "S" token drifts down the screen; collecting it wraps the player in a
 * single yellow paper ring that circles the ship while flickering. The
 * shield absorbs bullet hits (10 by default) before breaking.
 * Ring art: /assets/effects/shield_ring.png · token art: shield_orb.png
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
    this.ringKey = options.ringKey || cfg.ringKey || 'shield_ring';
    this.maxHits = options.hits != null ? options.hits : (cfg.hits || 10);
    this.ringScale = options.ringScale != null ? options.ringScale : (cfg.ringScale || 0.72);
    this.ringSpinSpeed = options.ringSpinSpeed != null ? options.ringSpinSpeed : (cfg.ringSpinSpeed || 1.6);
    this.flickerSpeed = options.flickerSpeed != null ? options.flickerSpeed : (cfg.flickerSpeed || 9);
    this.pickupIntervalMs = options.pickupIntervalMs != null ? options.pickupIntervalMs : (cfg.pickupIntervalMs || 12000);
    this.pickupDriftSpeed = options.pickupDriftSpeed != null ? options.pickupDriftSpeed : (cfg.pickupDriftSpeed || 55);

    this.hitsLeft = 0;
    this.ring = null;
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

  /** Preload shield sprites (token + ring). */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.shield) || {};
    scene.load.image(
      cfg.key || 'shield_orb',
      resolveAsset(cfg.path || 'assets/effects/shield_orb.png')
    );
    scene.load.image(
      cfg.ringKey || 'shield_ring',
      resolveAsset(cfg.ringPath || 'assets/effects/shield_ring.png')
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

    // Punch the ring so absorption reads clearly.
    if (this.ring) {
      this.ring.setScale(this.ringScale * 1.2);
      this.scene.tweens.add({
        targets: this.ring,
        scale: this.ringScale,
        duration: 160,
        ease: 'Back.easeOut',
      });
    }

    if (this.hitsLeft <= 0) {
      this._break();
    }
    return true;
  }

  /** Activate (or refresh) the shield ring around the player. */
  activate() {
    this.hitsLeft = this.maxHits;
    if (!this.ring) {
      this.ring = this.scene.add.image(0, 0, this.ringKey);
      this.ring.setScale(this.ringScale);
      this.ring.setDepth(25);
    }
  }

  _break() {
    const player = this.scene.player;
    if (player && this.scene.sparks) {
      this.scene.sparks.burst(player.x, player.y);
    }
    if (this.ring) {
      this.ring.destroy();
      this.ring = null;
    }
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
   * Drift the pickup, check collection, and animate the flickering ring.
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

    if (this.isActive() && this.ring && player) {
      const t = time / 1000;
      this.ring.setPosition(player.x, player.y);
      this.ring.rotation = t * this.ringSpinSpeed;
      // Paper-lantern flicker.
      this.ring.setAlpha(0.62 + 0.3 * Math.sin(t * this.flickerSpeed) + 0.08 * Math.sin(t * 23));
      this.ring.setVisible(player.visible);
    }
  }
}

window.Shield = Shield;
