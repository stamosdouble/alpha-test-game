/**
 * Tiled flaming paper laser — repeats beam_segment.png via TileSprite
 * (no stretching), and pins impact_tip.png at the exact end of the beam
 * each frame. Fuel / cooldown / damage live in GameScene + GameConfig.laser.
 */
class Laser {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options]
   * @param {string} [options.beamKey]
   * @param {string} [options.tipKey]
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.laser) || {};
    this.beamKey = options.beamKey || cfg.beamKey || 'beam_segment';
    this.tipKey = options.tipKey || cfg.tipKey || 'impact_tip';

    // TileSprite length is driven by distance; height matches the segment texture.
    const frame = scene.textures.get(this.beamKey).get();
    this.segmentWidth = frame.width;
    this.segmentHeight = frame.height;

    this.beam = scene.add.tileSprite(0, 0, this.segmentWidth, this.segmentHeight, this.beamKey);
    this.beam.setOrigin(0, 0.5);
    this.beam.setVisible(false);
    this.beam.setDepth(40);

    this.tip = scene.add.image(0, 0, this.tipKey);
    this.tip.setOrigin(0.5, 0.5);
    this.tip.setVisible(false);
    this.tip.setDepth(41);

    this.active = false;
    this._flickerT = 0;
  }

  /** Preload laser assets. */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.laser) || {};
    scene.load.image(
      cfg.beamKey || 'beam_segment',
      resolveAsset(cfg.beamPath || 'assets/laser/beam_segment.png')
    );
    scene.load.image(
      cfg.tipKey || 'impact_tip',
      resolveAsset(cfg.tipPath || 'assets/laser/impact_tip.png')
    );
  }

  /**
   * Fire / update the laser between two world points.
   * Call every frame while the beam should be visible.
   *
   * @param {number} fromX ship X
   * @param {number} fromY ship Y
   * @param {number} toX   boss / target X
   * @param {number} toY   boss / target Y
   * @param {number} [delta=16] frame delta for flame flicker
   */
  update(fromX, fromY, toX, toY, delta = 16) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      this.hide();
      return;
    }

    const angle = Math.atan2(dy, dx);

    this.beam.setVisible(true);
    this.tip.setVisible(true);
    this.active = true;

    // Position beam at the ship; length = distance so segments tile, not stretch.
    this.beam.setPosition(fromX, fromY);
    this.beam.setRotation(angle);
    this.beam.width = distance;
    // Keep the tile pattern scrolling for a rushing flame feel.
    this.beam.tilePositionX -= 6;

    // Red ↔ yellow paper flicker.
    this._flickerT += delta;
    const pulse = 0.5 + 0.5 * Math.sin(this._flickerT / 45);
    const r = 255;
    const g = Math.floor(70 + pulse * 150);
    const b = Math.floor(40 + pulse * 30);
    const tintInt = (r << 16) | (g << 8) | b;
    this.beam.setTint(tintInt);
    this.tip.setTint(tintInt);
    this.tip.setScale(0.95 + pulse * 0.22);
    this.tip.setAlpha(0.85 + pulse * 0.15);

    // Impact tip sits at the exact end of the tiled beam.
    this.tip.setPosition(toX, toY);
    this.tip.setRotation(angle + this._flickerT / 180);
  }

  hide() {
    this.active = false;
    this.beam.setVisible(false);
    this.tip.setVisible(false);
    if (this.beam.clearTint) this.beam.clearTint();
    if (this.tip.clearTint) this.tip.clearTint();
  }

  destroy() {
    this.beam.destroy();
    this.tip.destroy();
  }
}

window.Laser = Laser;
