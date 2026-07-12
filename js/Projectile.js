/**
 * Player projectiles — pooled paper discs fired upward from the ship.
 *
 * Uses a texture atlas (assets/player/projectiles.png + .json) so multiple
 * projectile designs live on one sheet and are chosen by frame name via
 * setType(). Falls back to the single projectile.png if the atlas is missing.
 */
class Projectiles {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options] overrides for GameConfig.projectile
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    this.atlasKey = options.atlasKey || cfg.atlasKey || 'projectiles';
    this.fallbackKey = options.key || cfg.key || 'player_projectile';
    this.speed = options.speed != null ? options.speed : (cfg.speed || 420);
    this.fireRateMs = options.fireRateMs != null ? options.fireRateMs : (cfg.fireRateMs || 220);
    this.scale = options.scale != null ? options.scale : (cfg.scale || 0.35);
    this.spinSpeed = options.spinSpeed != null ? options.spinSpeed : (cfg.spinSpeed || 4);

    this.usingAtlas = scene.textures.exists(this.atlasKey) && this.getTypes().length > 0;
    this.currentType = null;
    if (this.usingAtlas) {
      const types = this.getTypes();
      const preferred = options.defaultFrame || cfg.defaultFrame;
      this.currentType = types.includes(preferred) ? preferred : types[0];
    }

    this.lastFiredAt = 0;

    this.group = scene.physics.add.group({
      defaultKey: this.usingAtlas ? this.atlasKey : this.fallbackKey,
      maxSize: 40,
    });
  }

  /** Preload atlas texture + frame data (and the single-image fallback). */
  static preload(scene) {
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    scene.load.image(
      cfg.key || 'player_projectile',
      resolveAsset(cfg.path || 'assets/player/projectile.png')
    );
    // Atlas texture loads like any image; frames attach in registerFrames().
    if (window.location.protocol !== 'file:') {
      scene.load.json(
        `${cfg.atlasKey || 'projectiles'}_data`,
        resolveAsset(cfg.atlasDataPath || 'assets/player/projectiles.json')
      );
    }
  }

  /**
   * Attach frame data to the atlas texture. Call once after textures load.
   * Prefers the JSON fetched from disk; falls back to the embedded copy.
   * @param {Phaser.Scene} scene
   */
  static registerFrames(scene) {
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    const key = cfg.atlasKey || 'projectiles';
    if (!scene.textures.exists(key)) return;

    const diskData = scene.cache.json.get(`${key}_data`);
    const embedded = (window.EmbeddedAtlasData || {})[key];
    const data = diskData || embedded;
    if (!data || !data.frames) return;

    const texture = scene.textures.get(key);
    Object.entries(data.frames).forEach(([name, def]) => {
      if (!texture.has(name)) {
        const f = def.frame;
        texture.add(name, 0, f.x, f.y, f.w, f.h);
      }
    });
  }

  /** Frame names available on the atlas (the selectable projectile types). */
  getTypes() {
    if (!this.scene.textures.exists(this.atlasKey)) return [];
    return this.scene.textures.get(this.atlasKey)
      .getFrameNames()
      .filter((n) => n !== '__BASE');
  }

  /**
   * Choose which projectile design to fire next.
   * @param {string} frameName a frame from the atlas (e.g. 'disc_blue')
   * @returns {boolean} true when the type exists and was selected
   */
  setType(frameName) {
    if (!this.usingAtlas || !this.getTypes().includes(frameName)) return false;
    this.currentType = frameName;
    return true;
  }

  /**
   * Fire one projectile from (x, y) if the fire-rate cooldown allows.
   * @param {number} x
   * @param {number} y
   * @param {number} [angleRad=-Math.PI/2] direction; default straight up
   * @returns {boolean} true when a shot was fired
   */
  fire(x, y, angleRad = -Math.PI / 2) {
    const now = this.scene.time.now;
    if (now - this.lastFiredAt < this.fireRateMs) return false;

    const shot = this.group.get(x, y);
    if (!shot) return false;

    this.lastFiredAt = now;

    if (this.usingAtlas) {
      shot.setTexture(this.atlasKey, this.currentType);
    } else {
      shot.setTexture(this.fallbackKey);
    }
    shot.setActive(true);
    shot.setVisible(true);
    shot.setOrigin(0.5, 0.5);
    shot.setScale(this.scale);
    shot.setDepth(15);
    shot.body.reset(x, y);
    shot.body.setAllowGravity(false);
    shot.setVelocity(
      Math.cos(angleRad) * this.speed,
      Math.sin(angleRad) * this.speed
    );
    // Random spin direction gives the paper disc a tossed feel.
    shot.spin = (Math.random() < 0.5 ? -1 : 1) * this.spinSpeed;
    return true;
  }

  /**
   * Recycle projectiles that leave the screen; spin active ones.
   * @param {number} delta frame delta ms
   */
  update(delta) {
    const dt = delta / 1000;
    const cam = this.scene.cameras.main;
    const margin = 64;

    this.group.children.each((shot) => {
      if (!shot.active) return;
      shot.rotation += (shot.spin || 0) * dt;
      if (
        shot.y < -margin || shot.y > cam.height + margin ||
        shot.x < -margin || shot.x > cam.width + margin
      ) {
        this.group.killAndHide(shot);
        shot.body.stop();
      }
    });
  }
}

window.Projectiles = Projectiles;
