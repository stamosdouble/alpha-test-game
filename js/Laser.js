/**
 * Tiled Paper Laser — repeats beam_segment.png via TileSprite (no stretching),
 * and pins impact_tip.png at the exact end of the beam each frame.
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

    this.tip = scene.add.image(0, 0, this.tipKey);
    this.tip.setOrigin(0.5, 0.5);
    this.tip.setVisible(false);

    this.active = false;
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
   */
  update(fromX, fromY, toX, toY) {
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
    // Keep the tile pattern scrolling gently for a paper-cut energy feel.
    this.beam.tilePositionX -= 2;

    // Impact tip sits at the exact end of the tiled beam.
    this.tip.setPosition(toX, toY);
    this.tip.setRotation(angle);
  }

  hide() {
    this.active = false;
    this.beam.setVisible(false);
    this.tip.setVisible(false);
  }

  destroy() {
    this.beam.destroy();
    this.tip.destroy();
  }
}

window.Laser = Laser;
