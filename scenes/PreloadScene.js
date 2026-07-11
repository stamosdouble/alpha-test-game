/**
 * PreloadScene — always loads embedded data-URI placeholders first
 * (works when you double-click index.html). Over HTTP, disk PNGs from
 * /assets replace those keys when present.
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
    const label = this.add.text(width / 2, height / 2 - 40, 'Cutting paper…', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d8cbb8',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 4 + 312 * value;
    });

    this.load.on('loaderror', (file) => {
      const src = (file && (file.src || file.url || file.key)) || 'unknown';
      this.failedFiles.push(String(src));
      console.warn('[Preload] Optional asset failed (fallback OK):', src);
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      label.destroy();
    });

    // 1) Embedded data URIs — always available, including file://
    this._loadEmbedded();

    // 2) Disk PNGs — only attempted over http(s); swap onto real keys in create()
    if (window.location.protocol !== 'file:') {
      this._queueDiskOverrides();
    }
  }

  _loadEmbedded() {
    const pack = window.EmbeddedAssets || {};
    Object.keys(pack).forEach((key) => {
      // Ensure the loader can register this key (Boot must not pre-create it).
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.load.image(key, pack[key]);
    });
  }

  _queueDiskOverrides() {
    const cfg = GameConfig;
    this.diskSwaps = [];

    const queue = (realKey, path) => {
      if (!path) return;
      const tempKey = `${realKey}__disk`;
      this.diskSwaps.push({ realKey, tempKey });
      this.load.image(tempKey, resolveAsset(path));
    };

    (cfg.parallaxLayers || []).forEach((layer) => queue(layer.key, layer.path));
    queue(cfg.player.key, cfg.player.path);
    queue(cfg.laser.beamKey, cfg.laser.beamPath);
    queue(cfg.laser.tipKey, cfg.laser.tipPath);
    (cfg.bossParts || []).forEach((name) => {
      queue(`boss_part_${name}`, `${cfg.boss.partsFolder}${name}.png`);
    });
  }

  _applyDiskOverrides() {
    let applied = 0;
    this.diskSwaps.forEach(({ realKey, tempKey }) => {
      if (!this.textures.exists(tempKey)) return;
      // Skip failed loads that somehow registered as missing.
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

  create() {
    const diskApplied = this._applyDiskOverrides();

    // Ultimate safety: procedural paper for any key still missing.
    const generated = (window.PaperTextures && PaperTextures.ensureAll(this)) || [];

    const usedEmbeddedOnly =
      window.location.protocol === 'file:' || (diskApplied === 0 && this.diskSwaps.length > 0);

    this.scene.start('GameScene', {
      usedFallbacks: generated.length > 0,
      usedEmbeddedOnly,
      diskApplied,
      failedFiles: this.failedFiles.slice(),
    });
  }
}

window.PreloadScene = PreloadScene;
