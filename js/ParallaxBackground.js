/**
 * Parallax scrolling via TileSprites.
 * Add layers to GameConfig.parallaxLayers (or pass an array) — speeds are applied automatically.
 */
class ParallaxBackground {
  /**
   * @param {Phaser.Scene} scene
   * @param {Array<{key:string, path?:string, speed:number}>} [layers]
   */
  constructor(scene, layers) {
    this.scene = scene;
    this.layers = [];
    this.config = layers || (window.GameConfig && GameConfig.parallaxLayers) || [];

    this.config.forEach((entry) => {
      const tile = scene.add.tileSprite(
        0,
        0,
        scene.scale.width,
        scene.scale.height,
        entry.key
      );
      tile.setOrigin(0, 0);
      tile.setScrollFactor(0);
      // Depth: earlier entries sit farther back.
      tile.setDepth(-100 + this.layers.length);

      this.layers.push({
        tile,
        speed: entry.speed != null ? entry.speed : 0.5,
      });
    });
  }

  /**
   * Preload every layer listed in the parallax array.
   * @param {Phaser.Scene} scene
   * @param {Array<{key:string, path:string}>} [layers]
   */
  static preload(scene, layers) {
    const list = layers || (window.GameConfig && GameConfig.parallaxLayers) || [];
    list.forEach((entry) => {
      if (entry.path) {
        scene.load.image(entry.key, entry.path);
      }
    });
  }

  /**
   * Scroll all layers by their relative speeds.
   * @param {number} delta frame delta ms
   * @param {number} [directionX=0] optional horizontal drift
   * @param {number} [directionY=1] vertical scroll (top-down: usually 1 = down)
   */
  update(delta, directionX = 0, directionY = 1) {
    const factor = delta / 16.6667; // normalize to ~60fps units
    this.layers.forEach(({ tile, speed }) => {
      tile.tilePositionX += directionX * speed * factor;
      tile.tilePositionY += directionY * speed * factor;
    });
  }

  /**
   * Append a layer at runtime (texture must already be loaded).
   * @param {string} key
   * @param {number} speed
   */
  addLayer(key, speed) {
    const tile = this.scene.add.tileSprite(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height,
      key
    );
    tile.setOrigin(0, 0);
    tile.setScrollFactor(0);
    tile.setDepth(-100 + this.layers.length);
    this.layers.push({ tile, speed });
  }

  destroy() {
    this.layers.forEach(({ tile }) => tile.destroy());
    this.layers = [];
  }
}

window.ParallaxBackground = ParallaxBackground;
