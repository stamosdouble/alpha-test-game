/**
 * Modular Boss — Phaser.GameObjects.Container assembled from paper part PNGs.
 *
 * Drop new PNGs into /assets/boss_parts/, list their names (sans extension) in
 * the parts array, and the boss updates without position hardcoding.
 * Each part is placed at local (0, 0) so alignment comes from the art itself.
 */
class Boss extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string[]} [partNames] optional; defaults to GameConfig.bossParts
   */
  constructor(scene, x, y, partNames) {
    super(scene, x, y);
    this.partSprites = {};
    this.partNames = partNames || (window.GameConfig && GameConfig.bossParts) || [];

    scene.add.existing(this);
    this.assemble(this.partNames);
  }

  /**
   * Preload boss part textures from /assets/boss_parts/{name}.png
   * Call from a Preload scene before create().
   *
   * @param {Phaser.Scene} scene
   * @param {string[]} partNames
   * @param {string} [folder]
   */
  static preload(scene, partNames, folder) {
    const dir = folder || (window.GameConfig && GameConfig.boss.partsFolder) || 'assets/boss_parts/';
    const names = partNames || (window.GameConfig && GameConfig.bossParts) || [];

    names.forEach((name) => {
      const key = Boss.textureKey(name);
      if (!scene.textures.exists(key)) {
        scene.load.image(key, `${dir}${name}.png`);
      }
    });
  }

  /** Texture key used for a part name. */
  static textureKey(partName) {
    return `boss_part_${partName}`;
  }

  /**
   * Build the container from an array of part names.
   * Parts stack in array order (first = bottom, last = top).
   * All sprites are added at local (0, 0) — compose in your PNG scans.
   *
   * @param {string[]} partNames e.g. ['hull', 'wing_l', 'wing_r', 'rivets']
   */
  assemble(partNames) {
    this.removeAll(true);
    this.partSprites = {};
    this.partNames = partNames.slice();

    partNames.forEach((name) => {
      const key = Boss.textureKey(name);
      if (!this.scene.textures.exists(key)) {
        console.warn(`[Boss] Missing texture "${key}" — drop ${name}.png into /assets/boss_parts/`);
        return;
      }

      const sprite = this.scene.add.image(0, 0, key);
      sprite.setOrigin(0.5, 0.5);
      this.add(sprite);
      this.partSprites[name] = sprite;
    });
  }

  /**
   * Swap or re-order parts at runtime (e.g. damage states).
   * @param {string[]} partNames
   */
  setParts(partNames) {
    this.assemble(partNames);
  }

  /**
   * Access a single assembled part sprite by name.
   * @param {string} name
   * @returns {Phaser.GameObjects.Image|undefined}
   */
  getPart(name) {
    return this.partSprites[name];
  }
}

window.Boss = Boss;
