/**
 * Procedural paper placeholders — used when PNG files fail to load
 * so the game never falls back to Phaser's green __MISSING grid.
 *
 * Drop real scans into /assets and they replace these automatically
 * on the next successful preload (same texture keys).
 */
const PaperTextures = {
  /**
   * Ensure every gameplay texture key exists. Generates canvas art
   * only for keys that are missing after the file loader finishes.
   * @param {Phaser.Scene} scene
   * @returns {string[]} keys that were generated as fallbacks
   */
  ensureAll(scene) {
    const created = [];
    const cfg = window.GameConfig || {};

    const need = (key, builder) => {
      if (!scene.textures.exists(key)) {
        builder(scene, key);
        created.push(key);
      }
    };

    (cfg.parallaxLayers || []).forEach((layer, i) => {
      need(layer.key, (s, k) => this.makeBackground(s, k, i));
    });

    need(cfg.player?.key || 'player_ship', (s, k) => this.makeShip(s, k));
    need(cfg.projectile?.key || 'player_projectile', (s, k) => this.makeProjectile(s, k));
    need(cfg.projectile?.atlasKey || 'projectiles', (s, k) => this.makeProjectileAtlas(s, k));
    need(cfg.sparks?.key || 'spark', (s, k) => this.makeSpark(s, k));
    need(cfg.bossBullets?.key || 'enemy_bullet', (s, k) => this.makeEnemyBullet(s, k));
    need(cfg.shield?.key || 'shield_orb', (s, k) => this.makeShieldOrb(s, k));
    need(cfg.laser?.beamKey || 'beam_segment', (s, k) => this.makeBeam(s, k));
    need(cfg.laser?.tipKey || 'impact_tip', (s, k) => this.makeTip(s, k));

    (cfg.bossParts || []).forEach((name) => {
      const key = `boss_part_${name}`;
      need(key, (s, k) => this.makeBossPart(s, k, name));
    });

    return created;
  },

  makeBackground(scene, key, index) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bases = [
      [52, 62, 82],
      [78, 92, 108],
      [40, 44, 54],
    ];
    const base = bases[index % bases.length];
    this._paperFill(ctx, size, size, base, 14);

    ctx.fillStyle = `rgba(200, 190, 170, ${0.04 + index * 0.03})`;
    for (let i = 0; i < 12 + index * 4; i++) {
      const x = (i * 73) % size;
      const y = (i * 97) % size;
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + index * 10, 12 + index * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    scene.textures.addCanvas(key, canvas);
  },

  makeShip(scene, key) {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Paper grain body
    const body = document.createElement('canvas');
    body.width = size;
    body.height = size;
    const bctx = body.getContext('2d');
    this._paperFill(bctx, size, size, [70, 130, 155], 12);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(48, 10);
    ctx.lineTo(78, 72);
    ctx.lineTo(64, 84);
    ctx.lineTo(32, 84);
    ctx.lineTo(18, 72);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(body, 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(200, 230, 240, 0.85)';
    ctx.beginPath();
    ctx.ellipse(48, 40, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(50, 90, 110, 0.9)';
    ctx.beginPath();
    ctx.moveTo(22, 58); ctx.lineTo(8, 78); ctx.lineTo(28, 70); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(74, 58); ctx.lineTo(88, 78); ctx.lineTo(68, 70); ctx.fill();

    scene.textures.addCanvas(key, canvas);
  },

  makeProjectileAtlas(scene, key) {
    // 4 frames of 128px, matching the layout in assets/player/projectiles.json
    // so registerFrames() can attach the same frame names.
    const frame = 128;
    const canvas = document.createElement('canvas');
    canvas.width = frame * 4;
    canvas.height = frame;
    const ctx = canvas.getContext('2d');

    const drawDisc = (ox, outer, inner) => {
      const paper = document.createElement('canvas');
      paper.width = frame;
      paper.height = frame;
      this._paperFill(paper.getContext('2d'), frame, frame, outer, 10);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox + 64, 64, 54, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(paper, ox, 0);
      ctx.restore();

      const paper2 = document.createElement('canvas');
      paper2.width = frame;
      paper2.height = frame;
      this._paperFill(paper2.getContext('2d'), frame, frame, inner, 10);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox + 61, 61, 34, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(paper2, ox, 0);
      ctx.restore();
    };

    drawDisc(0, [238, 74, 63], [240, 197, 66]);
    drawDisc(128, [70, 120, 190], [225, 235, 240]);
    drawDisc(256, [90, 160, 90], [240, 197, 66]);

    // Simple star for the fourth frame.
    ctx.save();
    ctx.translate(384 + 64, 66);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 56 : 26;
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgb(235, 140, 50)';
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 34 : 15;
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgb(250, 225, 120)';
    ctx.fill();
    ctx.restore();

    scene.textures.addCanvas(key, canvas);
  },

  makeShieldOrb(scene, key) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const paper = document.createElement('canvas');
    paper.width = size;
    paper.height = size;
    this._paperFill(paper.getContext('2d'), size, size, [240, 197, 66], 12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(paper, 0, 0);
    ctx.restore();

    scene.textures.addCanvas(key, canvas);
  },

  makeEnemyBullet(scene, key) {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const paper = document.createElement('canvas');
    paper.width = size;
    paper.height = size;
    this._paperFill(paper.getContext('2d'), size, size, [180, 45, 45], 12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(24, 24, 19, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(paper, 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(245, 235, 220, 0.95)';
    ctx.beginPath();
    ctx.arc(23, 23, 9, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas(key, canvas);
  },

  makeSpark(scene, key) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Small yellow paper triangle.
    const paper = document.createElement('canvas');
    paper.width = size;
    paper.height = size;
    this._paperFill(paper.getContext('2d'), size, size, [245, 205, 70], 14);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(16, 3);
    ctx.lineTo(29, 27);
    ctx.lineTo(3, 27);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(paper, 0, 0);
    ctx.restore();

    scene.textures.addCanvas(key, canvas);
  },

  makeProjectile(scene, key) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Red paper disc with offset yellow center — matches the scanned art.
    const red = document.createElement('canvas');
    red.width = size;
    red.height = size;
    this._paperFill(red.getContext('2d'), size, size, [238, 74, 63], 10);
    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 27, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(red, 0, 0);
    ctx.restore();

    const yellow = document.createElement('canvas');
    yellow.width = size;
    yellow.height = size;
    this._paperFill(yellow.getContext('2d'), size, size, [240, 197, 66], 10);
    ctx.save();
    ctx.beginPath();
    ctx.arc(30, 30, 17, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(yellow, 0, 0);
    ctx.restore();

    scene.textures.addCanvas(key, canvas);
  },

  makeBeam(scene, key) {
    const w = 16;
    const h = 32;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    this._paperFill(ctx, w, h, [220, 80, 55], 20);
    ctx.fillStyle = 'rgba(255, 210, 160, 0.7)';
    ctx.fillRect(5, 0, 6, h);
    scene.textures.addCanvas(key, canvas);
  },

  makeTip(scene, key) {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 22);
    g.addColorStop(0, 'rgba(255, 250, 230, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 180, 100, 0.9)');
    g.addColorStop(1, 'rgba(210, 70, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
    scene.textures.addCanvas(key, canvas);
  },

  makeBossPart(scene, key, name) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (name === 'hull') {
      const paper = document.createElement('canvas');
      paper.width = size;
      paper.height = size;
      this._paperFill(paper.getContext('2d'), size, size, [200, 85, 65], 14);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(128, 28);
      ctx.lineTo(210, 90);
      ctx.lineTo(198, 210);
      ctx.lineTo(128, 230);
      ctx.lineTo(58, 210);
      ctx.lineTo(46, 90);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
      ctx.strokeStyle = 'rgba(90, 40, 30, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (name === 'wing_l' || name === 'wing_r') {
      const left = name === 'wing_l';
      const paper = document.createElement('canvas');
      paper.width = size;
      paper.height = size;
      this._paperFill(paper.getContext('2d'), size, size, [195, 175, 140], 14);
      ctx.save();
      ctx.beginPath();
      if (left) {
        ctx.moveTo(120, 70); ctx.lineTo(120, 190); ctx.lineTo(20, 200); ctx.lineTo(35, 130); ctx.lineTo(70, 60);
      } else {
        ctx.moveTo(136, 70); ctx.lineTo(136, 190); ctx.lineTo(236, 200); ctx.lineTo(221, 130); ctx.lineTo(186, 60);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
    } else if (name === 'rivets') {
      const spots = [[100, 80], [128, 70], [156, 80], [110, 120], [146, 120], [128, 150], [100, 170], [156, 170]];
      spots.forEach(([x, y]) => {
        ctx.fillStyle = 'rgba(120, 100, 80, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 185, 160, 0.7)';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Generic extra part — rounded paper plate centered for any new filename.
      const paper = document.createElement('canvas');
      paper.width = size;
      paper.height = size;
      this._paperFill(paper.getContext('2d'), size, size, [180, 150, 120], 12);
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 128, 60, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
    }

    scene.textures.addCanvas(key, canvas);
  },

  _paperFill(ctx, w, h, rgb, variance) {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < w * h; i++) {
      const n = ((i * 1103515245 + 12345) >>> 0) % (variance * 2 + 1) - variance;
      const o = i * 4;
      d[o] = Math.max(0, Math.min(255, rgb[0] + n));
      d[o + 1] = Math.max(0, Math.min(255, rgb[1] + n));
      d[o + 2] = Math.max(0, Math.min(255, rgb[2] + n));
      d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
};

window.PaperTextures = PaperTextures;
