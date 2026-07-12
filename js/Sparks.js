/**
 * Paper sparks — little yellow triangles that burst outward on impact.
 * Art comes from /assets/effects/spark.png (swap the PNG freely).
 */
class Sparks {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.sparks
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.sparks) || {};
    this.key = options.key || cfg.key || 'spark';
    this.count = options.count != null ? options.count : (cfg.count || 8);
    this.speed = options.speed != null ? options.speed : (cfg.speed || 160);
    this.lifetimeMs = options.lifetimeMs != null ? options.lifetimeMs : (cfg.lifetimeMs || 450);
    this.scale = options.scale != null ? options.scale : (cfg.scale || 0.6);

    this.pool = scene.add.group({
      defaultKey: this.key,
      maxSize: 96,
    });
  }

  /** Preload the spark sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.sparks) || {};
    scene.load.image(
      cfg.key || 'spark',
      resolveAsset(cfg.path || 'assets/effects/spark.png')
    );
  }

  /**
   * Burst a ring of paper triangles at (x, y).
   * Each triangle flies outward, spins, shrinks, and fades.
   * @param {number} x
   * @param {number} y
   */
  burst(x, y) {
    for (let i = 0; i < this.count; i++) {
      const spark = this.pool.get(x, y);
      if (!spark) return;

      spark.setTexture(this.key);
      spark.setActive(true);
      spark.setVisible(true);
      spark.setOrigin(0.5, 0.5);
      spark.setDepth(30);
      spark.setAlpha(1);
      spark.setScale(this.scale * Phaser.Math.FloatBetween(0.7, 1.2));
      spark.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

      // Even spread with a little jitter so bursts feel hand-made.
      const angle = (i / this.count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = this.speed * Phaser.Math.FloatBetween(0.6, 1.3);
      const life = this.lifetimeMs * Phaser.Math.FloatBetween(0.8, 1.2);

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed * (life / 1000),
        y: y + Math.sin(angle) * speed * (life / 1000),
        rotation: spark.rotation + Phaser.Math.FloatBetween(-3, 3),
        alpha: 0,
        scale: spark.scale * 0.3,
        duration: life,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.pool.killAndHide(spark);
        },
      });
    }
  }
}

window.Sparks = Sparks;
