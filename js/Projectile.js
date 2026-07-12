/**
 * Player projectiles — pooled paper discs fired upward from the ship.
 * Art comes from /assets/player/projectile.png (swap the PNG freely).
 */
class Projectiles {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.projectile
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    this.key = options.key || cfg.key || 'player_projectile';
    this.speed = options.speed != null ? options.speed : (cfg.speed || 420);
    this.fireRateMs = options.fireRateMs != null ? options.fireRateMs : (cfg.fireRateMs || 220);
    this.scale = options.scale != null ? options.scale : (cfg.scale || 0.35);
    this.spinSpeed = options.spinSpeed != null ? options.spinSpeed : (cfg.spinSpeed || 4);

    this.lastFiredAt = 0;

    this.group = scene.physics.add.group({
      defaultKey: this.key,
      maxSize: 40,
    });
  }

  /** Preload the projectile sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    scene.load.image(
      cfg.key || 'player_projectile',
      resolveAsset(cfg.path || 'assets/player/projectile.png')
    );
  }

  /**
   * Fire one projectile from (x, y) if the fire-rate cooldown allows.
   * @param {number} x
   * @param {number} y
   * @param {number} [angleRad=-Math.PI/2] direction; default straight up
   * @returns {boolean} true when a shot was fired
   */
  fire(x, y, angleRad = -Math.PI / 2) {
    const now = this.scene.time.now;
    if (now - this.lastFiredAt < this.fireRateMs) return false;

    const shot = this.group.get(x, y);
    if (!shot) return false;

    this.lastFiredAt = now;

    shot.setTexture(this.key);
    shot.setActive(true);
    shot.setVisible(true);
    shot.setOrigin(0.5, 0.5);
    shot.setScale(this.scale);
    shot.setDepth(15);
    shot.body.reset(x, y);
    shot.body.setAllowGravity(false);
    shot.setVelocity(
      Math.cos(angleRad) * this.speed,
      Math.sin(angleRad) * this.speed
    );
    // Random spin direction gives the paper disc a tossed feel.
    shot.spin = (Math.random() < 0.5 ? -1 : 1) * this.spinSpeed;
    return true;
  }

  /**
   * Recycle projectiles that leave the screen; spin active ones.
   * @param {number} delta frame delta ms
   */
  update(delta) {
    const dt = delta / 1000;
    const cam = this.scene.cameras.main;
    const margin = 64;

    this.group.children.each((shot) => {
      if (!shot.active) return;
      shot.rotation += (shot.spin || 0) * dt;
      if (
        shot.y < -margin || shot.y > cam.height + margin ||
        shot.x < -margin || shot.x > cam.width + margin
      ) {
        this.group.killAndHide(shot);
        shot.body.stop();
      }
    });
  }
}

window.Projectiles = Projectiles;
