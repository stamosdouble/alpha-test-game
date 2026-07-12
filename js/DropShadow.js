/**
 * Papercraft drop shadows — dark silhouette copies offset behind sprites.
 */
const DropShadow = {
  defaults: {
    offsetX: 6,
    offsetY: 8,
    alpha: 0.38,
    tint: 0x1a1410,
  },

  /** Resolve options from GameConfig.shadow + overrides. */
  options(extra = {}) {
    const cfg = (window.GameConfig && GameConfig.shadow) || {};
    return {
      offsetX: extra.offsetX != null ? extra.offsetX : (cfg.offsetX != null ? cfg.offsetX : this.defaults.offsetX),
      offsetY: extra.offsetY != null ? extra.offsetY : (cfg.offsetY != null ? cfg.offsetY : this.defaults.offsetY),
      alpha: extra.alpha != null ? extra.alpha : (cfg.alpha != null ? cfg.alpha : this.defaults.alpha),
      tint: extra.tint != null ? extra.tint : (cfg.tint != null ? cfg.tint : this.defaults.tint),
    };
  },

  /**
   * Create (or refresh) a world-space shadow Image that tracks `sprite`.
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Sprite|Phaser.GameObjects.Image} sprite
   * @param {object} [extra]
   * @returns {Phaser.GameObjects.Image}
   */
  attach(scene, sprite, extra = {}) {
    const opts = this.options(extra);
    let shadow = sprite._dropShadow;
    if (!shadow || !shadow.scene) {
      shadow = scene.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name);
      sprite._dropShadow = shadow;
    } else {
      shadow.setTexture(sprite.texture.key, sprite.frame.name);
    }
    shadow.setOrigin(sprite.originX, sprite.originY);
    shadow.setTintFill(opts.tint);
    shadow.setAlpha(opts.alpha);
    shadow.setDepth((sprite.depth || 0) - 1);
    shadow._shadowOpts = opts;
    this.sync(sprite);
    return shadow;
  },

  /**
   * Create a local shadow Image inside a Container (boss parts).
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Container} container
   * @param {string} textureKey
   * @param {object} [extra]
   * @returns {Phaser.GameObjects.Image}
   */
  createLocal(scene, container, textureKey, extra = {}) {
    const opts = this.options(extra);
    const shadow = new Phaser.GameObjects.Image(scene, opts.offsetX, opts.offsetY, textureKey);
    shadow.setOrigin(0.5, 0.5);
    shadow.setTintFill(opts.tint);
    shadow.setAlpha(opts.alpha);
    shadow._shadowOpts = opts;
    container.addAt(shadow, 0);
    return shadow;
  },

  /** Keep a world-space shadow matched to its owner sprite. */
  sync(sprite) {
    const shadow = sprite._dropShadow;
    if (!shadow || !shadow.scene) return;
    const opts = shadow._shadowOpts || this.options();
    const visible = sprite.visible && (sprite.active !== false) && sprite.alpha > 0.05;
    shadow.setVisible(visible);
    if (!visible) return;

    shadow.setPosition(sprite.x + opts.offsetX, sprite.y + opts.offsetY);
    shadow.setRotation(sprite.rotation);
    shadow.setScale(sprite.scaleX, sprite.scaleY);
    shadow.setAlpha(opts.alpha * Math.min(1, sprite.alpha));
    shadow.setDepth((sprite.depth || 0) - 1);
    if (sprite.frame && shadow.frame && sprite.frame.name !== shadow.frame.name) {
      shadow.setFrame(sprite.frame.name);
    }
  },

  /** Hide/destroy shadow when the owner is recycled. */
  hide(sprite) {
    const shadow = sprite._dropShadow;
    if (shadow && shadow.scene) shadow.setVisible(false);
  },

  destroy(sprite) {
    const shadow = sprite._dropShadow;
    if (shadow && shadow.scene) shadow.destroy();
    sprite._dropShadow = null;
  },
};

window.DropShadow = DropShadow;
