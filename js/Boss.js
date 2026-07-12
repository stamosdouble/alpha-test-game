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

    const cfg = (window.GameConfig && GameConfig.boss) || {};
    this.maxHp = cfg.maxHp || 1000;
    this.hp = this.maxHp;
    this._flashTimer = null;
    this._flashTween = null;

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
        const path = `${dir}${name}.png`;
        scene.load.image(key, resolveAsset(path));
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

      // Create as a bare Image (not scene.add) so it only lives in this container.
      const sprite = new Phaser.GameObjects.Image(this.scene, 0, 0, key);
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

  /**
   * Apply damage, flash the paper parts, and report remaining HP.
   * @param {number} amount
   * @returns {number} hp remaining (never below 0)
   */
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.flash();
    return this.hp;
  }

  /**
   * World-space muzzle positions (config offsets scaled with the boss).
   * Falls back to the boss center when no muzzles are configured.
   * @returns {{x:number, y:number}[]}
   */
  getMuzzles() {
    const cfg = (window.GameConfig && GameConfig.boss) || {};
    const offsets = cfg.muzzles && cfg.muzzles.length ? cfg.muzzles : [{ x: 0, y: 0 }];
    return offsets.map((m) => ({
      x: this.x + m.x * this.scaleX,
      y: this.y + m.y * this.scaleY,
    }));
  }

  /**
   * Bright hit flash across every hull/wing part.
   * Uses a world-space wash (reliable on Canvas + WebGL) plus part tint when supported.
   */
  flash(durationMs = 160) {
    if (this._flashTimer) {
      this._flashTimer.remove(false);
      this._flashTimer = null;
    }
    if (this._flashTween) {
      this._flashTween.stop();
      this._flashTween = null;
    }

    Object.values(this.partSprites).forEach((part) => {
      if (!part) return;
      if (part.setTintFill) part.setTintFill(0xfff6e0);
    });

    const bounds = this.getBounds();
    const w = Math.max(120, bounds.width * 1.08);
    const h = Math.max(90, bounds.height * 1.08);
    if (!this._worldFlash) {
      this._worldFlash = this.scene.add.rectangle(this.x, this.y, w, h, 0xfff8e8, 0.8);
      this._worldFlash.setDepth(28);
    }
    this._worldFlash.setPosition(this.x, this.y);
    this._worldFlash.setSize(w, h);
    this._worldFlash.setVisible(true);
    this._worldFlash.setAlpha(0.85);
    if (this._worldFlash.setBlendMode) {
      this._worldFlash.setBlendMode(Phaser.BlendModes.ADD);
    }

    this._flashTween = this.scene.tweens.add({
      targets: this._worldFlash,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this._worldFlash) this._worldFlash.setVisible(false);
        this._flashTween = null;
      },
    });

    this._flashTimer = this.scene.time.delayedCall(durationMs, () => {
      Object.values(this.partSprites).forEach((part) => {
        if (part && part.clearTint) part.clearTint();
      });
      this._flashTimer = null;
    });
  }
}

window.Boss = Boss;
