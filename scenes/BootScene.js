/**
 * Boot scene — kicks off asset loading.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Minimal boot; all game assets load in PreloadScene.
  }

  create() {
    this.scene.start('PreloadScene');
  }
}

window.BootScene = BootScene;
