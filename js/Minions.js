/**
 * Wing minions — little paper fighters that launch from the boss wingtips.
 * They dive toward the player, fire green projectiles, and die in one hit.
 * Art: /assets/effects/minion_ship.png + green_bullet.png
 */
class Minions {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.minions
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.minions) || {};
    this.key = options.key || cfg.key || 'minion_ship';
    this.bulletKey = options.bulletKey || cfg.bulletKey || 'green_bullet';
    this.spawnIntervalMs = options.spawnIntervalMs != null ? options.spawnIntervalMs : (cfg.spawnIntervalMs || 6500);
    this.maxAlive = options.maxAlive != null ? options.maxAlive : (cfg.maxAlive || 6);
    this.scale = options.scale != null ? options.scale : (cfg.scale || 0.85);
    this.speed = options.speed != null ? options.speed : (cfg.speed || 90);
    this.fireRateMs = options.fireRateMs != null ? options.fireRateMs : (cfg.fireRateMs || 1100);
    this.bulletSpeed = options.bulletSpeed != null ? options.bulletSpeed : (cfg.bulletSpeed || 170);
    this.bulletScale = options.bulletScale != null ? options.bulletScale : (cfg.bulletScale || 0.7);

    this.group = scene.physics.add.group({
      defaultKey: this.key,
      maxSize: this.maxAlive,
    });
    this.bullets = scene.physics.add.group({
      defaultKey: this.bulletKey,
      maxSize: 60,
    });

    this._spawnTimer = scene.time.addEvent({
      delay: this.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnPair(),
    });
  }

  /** Stop spawn timer for scene restart. */
  destroy() {
    if (this._spawnTimer) {
      this._spawnTimer.remove(false);
      this._spawnTimer = null;
    }
  }

  /** Preload minion + green bullet sprites. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.minions) || {};
    scene.load.image(cfg.key || 'minion_ship', resolveAsset(cfg.path || 'assets/effects/minion_ship.png'));
    scene.load.image(
      cfg.bulletKey || 'green_bullet',
      resolveAsset(cfg.bulletPath || 'assets/effects/green_bullet.png')
    );
  }

  /** Launch one fighter from each wingtip. */
  spawnPair() {
    const boss = this.scene.boss;
    if (!boss || !boss.visible || this.scene.bossEntranceDone === false) return;
    if (this.scene.playerDead || this.scene.bossDefeated) return;

    const alive = this.group.countActive(true);
    if (alive >= this.maxAlive) return;

    const muzzles = boss.getMuzzles ? boss.getMuzzles() : [{ x: boss.x, y: boss.y }];
    muzzles.forEach((m, i) => {
      if (this.group.countActive(true) >= this.maxAlive) return;
      this._spawnOne(m.x, m.y, i === 0 ? -1 : 1);
    });
  }

  _spawnOne(x, y, side) {
    const ship = this.group.get(x, y);
    if (!ship) return;

    ship.setTexture(this.key);
    ship.setActive(true);
    ship.setVisible(true);
    ship.setOrigin(0.5, 0.5);
    ship.setScale(this.scale);
    ship.setDepth(16);
    ship.body.reset(x, y);
    ship.body.setAllowGravity(false);
    ship.body.setSize(ship.width * 0.7, ship.height * 0.7, true);
    ship.side = side;
    ship.age = 0;
    ship.lastFiredAt = this.scene.time.now + Phaser.Math.Between(200, 600);
    // Dive out then bank toward the player.
    ship.setVelocity(side * 40, this.speed * 0.6);
  }

  /**
   * Drive minions, fire green shots, recycle off-screen.
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    const dt = delta / 1000;
    const player = this.scene.player;
    const cam = this.scene.cameras.main;
    const margin = 48;

    this.group.children.each((ship) => {
      if (!ship.active) return;
      ship.age += dt;

      if (player && player.visible) {
        // Soft steer toward the player after the initial dive.
        const dx = player.x - ship.x;
        const dy = player.y - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const tx = (dx / dist) * this.speed;
        const ty = (dy / dist) * this.speed;
        ship.body.velocity.x = Phaser.Math.Linear(ship.body.velocity.x, tx, 0.04);
        ship.body.velocity.y = Phaser.Math.Linear(ship.body.velocity.y, ty, 0.04);
        ship.rotation = Math.atan2(ship.body.velocity.y, ship.body.velocity.x) - Math.PI / 2;

        if (time - ship.lastFiredAt >= this.fireRateMs) {
          ship.lastFiredAt = time;
          this._fire(ship, player);
        }
      }

      if (
        ship.y > cam.height + margin || ship.y < -margin * 2 ||
        ship.x < -margin || ship.x > cam.width + margin
      ) {
        this.group.killAndHide(ship);
        ship.body.stop();
      }
    });

    this.bullets.children.each((bullet) => {
      if (!bullet.active) return;
      bullet.rotation += 3 * dt;
      if (
        bullet.y < -margin || bullet.y > cam.height + margin ||
        bullet.x < -margin || bullet.x > cam.width + margin
      ) {
        this.bullets.killAndHide(bullet);
        bullet.body.stop();
      }
    });
  }

  _fire(ship, player) {
    const bullet = this.bullets.get(ship.x, ship.y);
    if (!bullet) return;
    const angle = Math.atan2(player.y - ship.y, player.x - ship.x);
    bullet.setTexture(this.bulletKey);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setOrigin(0.5, 0.5);
    bullet.setScale(this.bulletScale);
    bullet.setDepth(13);
    bullet.body.reset(ship.x, ship.y);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed);
  }

  /** Kill a minion with sparks; returns true if it was alive. */
  destroyShip(ship) {
    if (!ship || !ship.active) return false;
    if (this.scene.sparks) this.scene.sparks.burst(ship.x, ship.y);
    this.group.killAndHide(ship);
    ship.body.stop();
    return true;
  }
}

window.Minions = Minions;
