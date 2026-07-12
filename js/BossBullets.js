/**
 * Bullet-hell waves fired by the boss.
 *
 * Patterns cycle automatically: expanding rings, fans aimed at the player,
 * and rotating spirals. All timing/density knobs live in GameConfig.bossBullets
 * and the bullet art is /assets/effects/enemy_bullet.png — swap freely.
 */
class BossBullets {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.bossBullets
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.bossBullets) || {};
    this.key = options.key || cfg.key || 'enemy_bullet';
    this.speed = options.speed != null ? options.speed : (cfg.speed || 130);
    this.scale = options.scale != null ? options.scale : (cfg.scale || 0.55);
    this.waveIntervalMs = options.waveIntervalMs != null ? options.waveIntervalMs : (cfg.waveIntervalMs || 1900);
    this.ringCount = options.ringCount != null ? options.ringCount : (cfg.ringCount || 18);
    this.fanCount = options.fanCount != null ? options.fanCount : (cfg.fanCount || 7);
    this.fanSpreadRad = options.fanSpreadRad != null ? options.fanSpreadRad : (cfg.fanSpreadRad || 0.7);
    this.spiralCount = options.spiralCount != null ? options.spiralCount : (cfg.spiralCount || 24);
    this.spiralDurationMs = options.spiralDurationMs != null ? options.spiralDurationMs : (cfg.spiralDurationMs || 1100);

    this.group = scene.physics.add.group({
      defaultKey: this.key,
      maxSize: 200,
    });

    this.patterns = ['ring', 'fan', 'spiral'];
    this.patternIndex = 0;
    this.spiralPhase = 0;

    this.waveTimer = scene.time.addEvent({
      delay: this.waveIntervalMs,
      loop: true,
      callback: () => this.fireWave(),
    });
  }

  /** Stop wave timer (scene restart / shutdown). */
  destroy() {
    if (this.waveTimer) {
      this.waveTimer.remove(false);
      this.waveTimer = null;
    }
  }

  /** Preload the enemy bullet sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.bossBullets) || {};
    scene.load.image(
      cfg.key || 'enemy_bullet',
      resolveAsset(cfg.path || 'assets/effects/enemy_bullet.png')
    );
  }

  /** Fire the next wave in the pattern cycle from the boss position. */
  fireWave() {
    const boss = this.scene.boss;
    if (!boss || !boss.visible) return;
    // Hold fire until the entrance descent finishes.
    if (this.scene.bossEntranceDone === false) return;

    const pattern = this.patterns[this.patternIndex];
    this.patternIndex = (this.patternIndex + 1) % this.patterns.length;

    if (pattern === 'ring') this.fireRing();
    else if (pattern === 'fan') this.fireFan();
    else this.fireSpiral();
  }

  /** Current world muzzle points on the boss. */
  _muzzles() {
    const boss = this.scene.boss;
    return boss && boss.getMuzzles ? boss.getMuzzles() : [{ x: boss.x, y: boss.y }];
  }

  /** Even ring of bullets, alternating between muzzles; offset rotates per wave. */
  fireRing() {
    const muzzles = this._muzzles();
    this.spiralPhase += 0.35;
    for (let i = 0; i < this.ringCount; i++) {
      const angle = (i / this.ringCount) * Math.PI * 2 + this.spiralPhase;
      const m = muzzles[i % muzzles.length];
      this.spawn(m.x, m.y, angle, this.speed);
    }
  }

  /** Fan of bullets aimed at the player, fired from every muzzle. */
  fireFan() {
    const player = this.scene.player;

    this._muzzles().forEach((m) => {
      const aim = player
        ? Math.atan2(player.y - m.y, player.x - m.x)
        : Math.PI / 2;

      for (let i = 0; i < this.fanCount; i++) {
        const t = this.fanCount === 1 ? 0.5 : i / (this.fanCount - 1);
        const angle = aim + (t - 0.5) * this.fanSpreadRad;
        this.spawn(m.x, m.y, angle, this.speed * 1.35);
      }
    });
  }

  /** Bullets emitted one-by-one along a rotating angle, alternating muzzles. */
  fireSpiral() {
    const golden = 2.399963; // radians; produces a pleasing non-repeating spiral
    for (let i = 0; i < this.spiralCount; i++) {
      this.scene.time.delayedCall((i / this.spiralCount) * this.spiralDurationMs, () => {
        if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
        const boss = this.scene.boss;
        if (!boss || !boss.visible) return;
        const muzzles = this._muzzles();
        const m = muzzles[i % muzzles.length];
        this.spiralPhase += golden * 0.25;
        this.spawn(m.x, m.y, this.spiralPhase, this.speed * 0.9);
      });
    }
  }

  /** Spawn one pooled bullet moving along angleRad. */
  spawn(x, y, angleRad, speed) {
    const bullet = this.group.get(x, y);
    if (!bullet) return;

    bullet.setTexture(this.key);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setOrigin(0.5, 0.5);
    bullet.setScale(this.scale);
    bullet.setDepth(12);
    bullet.body.reset(x, y);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    bullet.spin = (Math.random() < 0.5 ? -1 : 1) * 2.5;
  }

  /**
   * Spin bullets and recycle the ones that leave the screen.
   * @param {number} delta frame delta ms
   */
  update(delta) {
    const dt = delta / 1000;
    const cam = this.scene.cameras.main;
    const margin = 64;

    this.group.children.each((bullet) => {
      if (!bullet.active) return;
      bullet.rotation += (bullet.spin || 0) * dt;
      if (
        bullet.y < -margin || bullet.y > cam.height + margin ||
        bullet.x < -margin || bullet.x > cam.width + margin
      ) {
        this.group.killAndHide(bullet);
        bullet.body.stop();
      }
    });
  }
}

window.BossBullets = BossBullets;
