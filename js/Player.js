/**
 * Player ship with organic paper sway (Math.sin wobble on X/Y)
 * and a centered origin for correct mid-point rotation.
 */
class Player extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [options]
   */
  constructor(scene, x, y, options = {}) {
    const cfg = (window.GameConfig && GameConfig.player) || {};
    const key = options.key || cfg.key || 'player_ship';

    super(scene, x, y, key);

    // Center origin so rotation/spin happens around the sprite middle.
    this.setOrigin(0.5, 0.5);

    this.baseX = x;
    this.baseY = y;
    this.moveSpeed = options.speed != null ? options.speed : (cfg.speed || 220);
    this.swayAmplitude = options.swayAmplitude != null ? options.swayAmplitude : (cfg.swayAmplitude || 2.5);
    this.swaySpeed = options.swaySpeed != null ? options.swaySpeed : (cfg.swaySpeed || 3.2);
    this.swayTime = Math.random() * Math.PI * 2;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (this.body) {
      this.body.setCollideWorldBounds(true);
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  /** Preload player sprite. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.player) || {};
    scene.load.image(cfg.key || 'player_ship', cfg.path || 'assets/player/ship.png');
  }

  /**
   * Apply keyboard movement, then layer organic sin-based paper sway.
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    const dt = delta / 1000;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * this.moveSpeed;
      vy = (vy / len) * this.moveSpeed;
    }

    // Advance logical position (pre-sway).
    this.baseX += vx * dt;
    this.baseY += vy * dt;

    // Clamp to world bounds using display size.
    const halfW = this.displayWidth * 0.5;
    const halfH = this.displayHeight * 0.5;
    const bounds = this.scene.physics.world.bounds;
    this.baseX = Phaser.Math.Clamp(this.baseX, bounds.x + halfW, bounds.right - halfW);
    this.baseY = Phaser.Math.Clamp(this.baseY, bounds.y + halfH, bounds.bottom - halfH);

    // Organic paper sway — independent sin phases on X and Y.
    this.swayTime += dt * this.swaySpeed;
    const swayX = Math.sin(this.swayTime) * this.swayAmplitude;
    const swayY = Math.sin(this.swayTime * 1.37 + 1.1) * this.swayAmplitude;

    this.setPosition(this.baseX + swayX, this.baseY + swayY);

    // Gentle tilt toward movement for a paper-cut feel.
    const targetAngle = vx !== 0 ? Phaser.Math.Clamp(vx / this.moveSpeed, -1, 1) * 0.25 : 0;
    this.rotation = Phaser.Math.Linear(this.rotation, targetAngle, 0.12);

    if (this.body) {
      this.body.reset(this.x, this.y);
    }
  }
}

window.Player = Player;
