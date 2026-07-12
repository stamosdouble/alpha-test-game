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
    this.flashOverlays = {};
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
   * @param {string[]} partNames e.g. ['hull', 'rivets']
   */
  assemble(partNames) {
    this.removeAll(true);
    this.partSprites = {};
    this.flashOverlays = {};
    this.shadowSprites = {};
    this.partNames = partNames.slice();

    // Shadows first (back of the stack), then paper parts, then flash overlays.
    const span = (window.GameConfig && GameConfig.boss && GameConfig.boss.wingSpanOffset) || 0;
    partNames.forEach((name) => {
      const key = Boss.textureKey(name);
      if (!this.scene.textures.exists(key)) return;
      if (window.DropShadow) {
        const shadow = DropShadow.createLocal(this.scene, this, key);
        if (name === 'wing_l') shadow.x -= span;
        if (name === 'wing_r') shadow.x += span;
        this.shadowSprites[name] = shadow;
      }
    });

    partNames.forEach((name) => {
      const key = Boss.textureKey(name);
      if (!this.scene.textures.exists(key)) {
        console.warn(`[Boss] Missing texture "${key}" — drop ${name}.png into /assets/boss_parts/`);
        return;
      }

      // Create as a bare Image (not scene.add) so it only lives in this container.
      const sprite = new Phaser.GameObjects.Image(this.scene, 0, 0, key);
      sprite.setOrigin(0.5, 0.5);
      // Push wing parts outward for a wider wingspan silhouette.
      if (name === 'wing_l') sprite.x = -span;
      if (name === 'wing_r') sprite.x = span;
      this.add(sprite);
      this.partSprites[name] = sprite;

      // Hit-flash layer: same PNG silhouette, ADD-blended so only the art
      // brightens to white (no rectangle wash, no arms/player).
      const flash = new Phaser.GameObjects.Image(this.scene, sprite.x, 0, key);
      flash.setOrigin(0.5, 0.5);
      flash.setBlendMode(Phaser.BlendModes.ADD);
      flash.setAlpha(0);
      flash.setVisible(false);
      this.add(flash);
      this.flashOverlays[name] = flash;
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
   * Flash only the boss part PNGs (hull / wings / rivets) toward white.
   */
  flash(durationMs = 130) {
    if (this._flashTimer) {
      this._flashTimer.remove(false);
      this._flashTimer = null;
    }
    if (this._flashTween) {
      this._flashTween.stop();
      this._flashTween = null;
    }

    const overlays = Object.values(this.flashOverlays).filter(Boolean);
    if (overlays.length === 0) return;

    overlays.forEach((flash) => {
      flash.setVisible(true);
      flash.setAlpha(1);
      this.bringToTop(flash);
    });

    this._flashTween = this.scene.tweens.add({
      targets: overlays,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
        overlays.forEach((flash) => {
          if (flash && flash.scene) flash.setVisible(false);
        });
        this._flashTween = null;
      },
    });

    this._flashTimer = this.scene.time.delayedCall(durationMs + 10, () => {
      if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
      overlays.forEach((flash) => {
        if (flash && flash.scene) {
          flash.setAlpha(0);
          flash.setVisible(false);
        }
      });
      this._flashTimer = null;
    });
  }

  /**
   * World-space wing bay exits where minions launch from.
   * Slightly inboard of the muzzle tips so fighters read as leaving the wing.
   * @returns {{x:number, y:number}[]}
   */
  getWingExits() {
    const cfg = (window.GameConfig && GameConfig.boss) || {};
    const exits = cfg.wingExits && cfg.wingExits.length
      ? cfg.wingExits
      : (cfg.muzzles && cfg.muzzles.length ? cfg.muzzles : [{ x: 0, y: 0 }]);
    return exits.map((m) => ({
      x: this.x + m.x * this.scaleX,
      y: this.y + m.y * this.scaleY,
    }));
  }
}

window.Boss = Boss;
