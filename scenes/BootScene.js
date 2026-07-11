/**
 * Boot scene — hands off to PreloadScene.
 * Textures are installed there (embedded data URIs + optional disk PNGs).
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.scene.start('PreloadScene');
  }
}

window.BootScene = BootScene;
