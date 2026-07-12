/**
 * PreloadScene — prefers PNGs from /assets, falls back to embedded art.
 *
 * Disk files load via HTML Image (works on http:// and file://). Do not set
 * crossOrigin on file:// — that breaks local Image loads in Chromium.
 * Splash + window.__assetReport show what actually came from disk.
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this.failedFiles = [];
    this.loadedFromDisk = [];
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this._barBg = this.add.rectangle(width / 2, height / 2, 320, 24, 0x2a303c);
    this._bar = this.add.rectangle(width / 2 - 158, height / 2, 4, 16, 0xc4a484).setOrigin(0, 0.5);
    this._loadLabel = this.add.text(width / 2, height / 2 - 40, 'Loading /assets…', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d8cbb8',
    }).setOrigin(0.5);

    // Disk + embedded loads run in create() via Image / fetch (not Phaser XHR).
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

  _assetUrl(path) {
    const base = typeof resolveAsset === 'function' ? resolveAsset(path) : path;
    // Cache-bust so a PNG swap + refresh always picks up the new file.
    // Skip query on file:// — some browsers reject local URLs with ?query.
    if (window.location.protocol === 'file:') return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}t=${Date.now()}`;
  }

  /**
   * Load one image into the texture manager.
   * @param {string} key
   * @param {string} src relative path or data URI
   * @returns {Promise<boolean>}
   */
  _loadImageKey(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      const isData = String(src).startsWith('data:');
      // CORS only for http(s). Setting crossOrigin on file:// breaks loads.
      if (!isData && /^https?:/i.test(window.location.protocol)) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          if (this.textures.exists(key)) {
            this.textures.remove(key);
          }
          this.textures.addImage(key, img);
          resolve(true);
        } catch (err) {
          console.warn('[Preload] addImage failed for', key, err);
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);

      img.src = isData ? src : this._assetUrl(src);
    });
  }

  async _loadDiskFirst() {
    const entries = this._diskManifest();
    let done = 0;

    for (const { key, path } of entries) {
      const ok = await this._loadImageKey(key, path);
      if (ok) {
        this.loadedFromDisk.push(path);
      } else {
        this.failedFiles.push(path);
        console.warn('[Preload] Disk miss:', path);
      }
      done += 1;
      if (this._bar) {
        this._bar.width = 4 + 312 * (done / Math.max(1, entries.length));
      }
      if (this._loadLabel) {
        this._loadLabel.setText(ok ? `Loaded ${path}` : `Missing ${path}`);
      }
    }
  }

  async _fillEmbeddedGaps() {
    const pack = window.EmbeddedAssets || {};
    for (const key of Object.keys(pack)) {
      if (this.textures.exists(key)) continue;
      await this._loadImageKey(key, pack[key]);
    }
  }

  /** Pull atlas JSON from disk when fetch is allowed (HTTP). file:// uses embedded. */
  async _loadAtlasJsonFromDisk() {
    const cfg = (window.GameConfig && GameConfig.projectile) || {};
    const atlasKey = cfg.atlasKey || 'projectiles';
    const path = cfg.atlasDataPath || 'assets/player/projectiles.json';
    const cacheKey = `${atlasKey}_data`;

    if (window.location.protocol === 'file:') return false;

    try {
      const res = await fetch(this._assetUrl(path), { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (this.cache.json.exists(cacheKey)) {
        this.cache.json.remove(cacheKey);
      }
      this.cache.json.add(cacheKey, data);
      return true;
    } catch (err) {
      console.warn('[Preload] Atlas JSON not loaded from disk:', path, err);
      return false;
    }
  }

  async create() {
    await this._loadDiskFirst();
    await this._fillEmbeddedGaps();
    const atlasJsonFromDisk = await this._loadAtlasJsonFromDisk();

    if (this._barBg) this._barBg.destroy();
    if (this._bar) this._bar.destroy();
    if (this._loadLabel) this._loadLabel.destroy();

    const generated = (window.PaperTextures && PaperTextures.ensureAll(this)) || [];
    Projectiles.registerFrames(this);

    const report = {
      loadedFromDisk: this.loadedFromDisk.slice(),
      failedDisk: this.failedFiles.slice(),
      diskApplied: this.loadedFromDisk.length,
      atlasJsonFromDisk,
      generated,
      protocol: window.location.protocol,
      href: window.location.href,
    };
    window.__assetReport = report;
    console.log('[Paper Squadron] Asset report — check loadedFromDisk vs failedDisk', report);

    this.scene.start('TitleScene', {
      usedFallbacks: generated.length > 0,
      usedEmbeddedOnly: this.loadedFromDisk.length === 0,
      diskApplied: this.loadedFromDisk.length,
      loadedFromDisk: this.loadedFromDisk.slice(),
      failedFiles: this.failedFiles.slice(),
    });
  }
}

window.PreloadScene = PreloadScene;
