/**
 * PreloadScene — loads embedded placeholders, then overlays /assets PNGs.
 *
 * Disk art is loaded over HTTP *and* when you open index.html directly
 * (via HTML Image, which browsers allow on file:// for local folders).
 * Leave a server running once, or just double-click + refresh after swaps.
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this.failedFiles = [];
    this.diskSwaps = [];
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 24, 0x2a303c);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 4, 16, 0xc4a484).setOrigin(0, 0.5);
    this._loadLabel = this.add.text(width / 2, height / 2 - 40, 'Cutting paper…', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d8cbb8',
    }).setOrigin(0.5);
    this._barBg = barBg;
    this._bar = bar;

    this.load.on('progress', (value) => {
      bar.width = 4 + 312 * value;
    });

    this.load.on('loaderror', (file) => {
      const src = (file && (file.src || file.url || file.key)) || 'unknown';
      this.failedFiles.push(String(src));
      console.warn('[Preload] Optional asset failed (fallback OK):', src);
    });

    // Embedded placeholders first so something always exists.
    this._loadEmbedded();

    // Over HTTP, queue disk PNGs through Phaser's loader.
    if (window.location.protocol !== 'file:') {
      this._queueDiskOverrides();
    }
  }

  _diskManifest() {
    const cfg = GameConfig;
    const entries = [];
    const add = (key, path) => {
      if (key && path) entries.push({ key, path });
    };

    (cfg.parallaxLayers || []).forEach((layer) => add(layer.key, layer.path));
    add(cfg.player.key, cfg.player.path);
    add(cfg.projectile.key, cfg.projectile.path);
    add(cfg.projectile.atlasKey, cfg.projectile.atlasTexturePath);
    add(cfg.sparks.key, cfg.sparks.path);
    add(cfg.bossBullets.key, cfg.bossBullets.path);
    add(cfg.shield.key, cfg.shield.path);
    add(cfg.shield.ringKey, cfg.shield.ringPath);
    add(cfg.power.pelletKey, cfg.power.pelletPath);
    add(cfg.minions.key, cfg.minions.path);
    add(cfg.minions.bulletKey, cfg.minions.bulletPath);
    add(cfg.laser.beamKey, cfg.laser.beamPath);
    add(cfg.laser.tipKey, cfg.laser.tipPath);
    (cfg.bossParts || []).forEach((name) => {
      add(`boss_part_${name}`, `${cfg.boss.partsFolder}${name}.png`);
    });
    return entries;
  }

  _loadEmbedded() {
    const pack = window.EmbeddedAssets || {};
    Object.keys(pack).forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.load.image(key, pack[key]);
    });
  }

  _queueDiskOverrides() {
    this.diskSwaps = [];
    this._diskManifest().forEach(({ key, path }) => {
      const tempKey = `${key}__disk`;
      this.diskSwaps.push({ realKey: key, tempKey, path });
      // Cache-bust so swapping a PNG + refresh always picks up the new file.
      this.load.image(tempKey, `${resolveAsset(path)}?t=${Date.now()}`);
    });
  }

  _applyDiskOverrides() {
    let applied = 0;
    this.diskSwaps.forEach(({ realKey, tempKey }) => {
      if (!this.textures.exists(tempKey)) return;
      const temp = this.textures.get(tempKey);
      if (!temp || temp.key === '__MISSING') return;
      const source = temp.getSourceImage();
      if (!source) return;

      if (this.textures.exists(realKey)) {
        this.textures.remove(realKey);
      }
      this.textures.addImage(realKey, source);
      this.textures.remove(tempKey);
      applied += 1;
    });
    return applied;
  }

  /**
   * On file://, Phaser XHR can't read local PNGs — but <img src="assets/..."> can.
   * Load each disk path that way and replace the embedded texture when it works.
   */
  _applyDiskOverridesViaImage() {
    const entries = this._diskManifest();
    let done = 0;
    let applied = 0;

    return new Promise((resolve) => {
      if (entries.length === 0) {
        resolve(0);
        return;
      }

      entries.forEach(({ key, path }) => {
        const img = new Image();
        const finish = (ok) => {
          if (ok) applied += 1;
          else this.failedFiles.push(path);
          done += 1;
          if (this._bar) {
            this._bar.width = 4 + 312 * (done / entries.length);
          }
          if (done >= entries.length) resolve(applied);
        };

        img.onload = () => {
          try {
            if (this.textures.exists(key)) this.textures.remove(key);
            this.textures.addImage(key, img);
            finish(true);
          } catch (err) {
            console.warn('[Preload] Could not install', path, err);
            finish(false);
          }
        };
        img.onerror = () => finish(false);
        // Relative to index.html — works for file:// and cache-busts swaps.
        img.src = `${path}?t=${Date.now()}`;
      });
    });
  }

  async create() {
    let diskApplied = 0;

    if (window.location.protocol === 'file:') {
      if (this._loadLabel) this._loadLabel.setText('Loading /assets…');
      diskApplied = await this._applyDiskOverridesViaImage();
    } else {
      diskApplied = this._applyDiskOverrides();
    }

    if (this._barBg) this._barBg.destroy();
    if (this._bar) this._bar.destroy();
    if (this._loadLabel) this._loadLabel.destroy();

    const generated = (window.PaperTextures && PaperTextures.ensureAll(this)) || [];
    Projectiles.registerFrames(this);

    const usedEmbeddedOnly = diskApplied === 0;

    this.scene.start('TitleScene', {
      usedFallbacks: generated.length > 0,
      usedEmbeddedOnly,
      diskApplied,
      failedFiles: this.failedFiles.slice(),
    });
  }
}

window.PreloadScene = PreloadScene;
