/**
 * Main gameplay scene — wires modular systems together.
 * Art stays in /assets; this file only composes behavior.
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(data) {
    const { width, height } = this.scale;

    // Safety net — never render Phaser's green __MISSING texture.
    PaperTextures.ensureAll(this);

    // Parallax: driven entirely by GameConfig.parallaxLayers
    this.parallax = new ParallaxBackground(this);

    // Boss assembled from part name list — drop PNGs into /assets/boss_parts/
    const bossCfg = GameConfig.boss;
    this.boss = new Boss(
      this,
      bossCfg.x || width / 2,
      bossCfg.y || 140,
      GameConfig.bossParts
    );
    this.boss.setDepth(10);

    // Horizontal sway across the screen (bullets track the moving boss).
    this.bossHomeX = this.boss.x;
    this.bossSwayAmplitude = bossCfg.swayAmplitude != null ? bossCfg.swayAmplitude : 240;
    this.bossSwaySpeed = bossCfg.swaySpeed != null ? bossCfg.swaySpeed : 0.45;

    // Subtle idle bob so the paper boss feels alive
    this.tweens.add({
      targets: this.boss,
      y: this.boss.y + 8,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Player with centered origin + organic sway
    this.player = new Player(this, width / 2, height - 100);
    this.player.setDepth(20);

    // Tiled paper laser (beam_segment + impact_tip)
    this.laser = new Laser(this);

    // Paper disc projectiles fired from the ship's nose
    this.projectiles = new Projectiles(this);

    // Yellow triangle sparks on projectile impact
    this.sparks = new Sparks(this);

    // Bullet-hell waves from the boss (rings, aimed fans, spirals)
    this.bossBullets = new BossBullets(this);
    this.hitsTaken = 0;

    this.physics.add.overlap(this.player, this.bossBullets.group, (player, bullet) => {
      if (!bullet.active || player.isInvulnerable()) return;
      this.bossBullets.group.killAndHide(bullet);
      bullet.body.stop();
      this.sparks.burst(player.x, player.y);
      player.onHit();
      this.hitsTaken += 1;
      this._updateHitsLabel();
    });

    // Main weapon: 'projectile' or 'laser' — toggled with L.
    this.weapon = 'projectile';

    this.shooting = false;
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => { this.shooting = true; });
    this.spaceKey.on('up', () => {
      this.shooting = false;
      if (!this.firing) this.laser.hide();
    });

    this.input.keyboard.on('keydown-L', () => {
      this.weapon = this.weapon === 'projectile' ? 'laser' : 'projectile';
      this.laser.hide();
      this._updateShotLabel();
    });

    // Number keys 1..9 switch projectile type (atlas frame order).
    const types = this.projectiles.getTypes();
    this.input.keyboard.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= types.length && this.projectiles.setType(types[n - 1])) {
        this.weapon = 'projectile';
        this._updateShotLabel();
      }
    });

    // Mouse / pointer fires the active weapon too
    this.firing = false;
    this.input.on('pointerdown', () => { this.firing = true; });
    this.input.on('pointerup', () => {
      this.firing = false;
      if (!this.shooting) this.laser.hide();
    });

    this.add.text(12, 12, 'Arrows / WASD move · Space or click fires · L swaps weapon · 1-4 shot type', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#b8a890',
    }).setDepth(100).setScrollFactor(0);

    this.shotLabel = this.add.text(width - 12, 12, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#d8cbb8',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);
    this._updateShotLabel();

    this.hitsLabel = this.add.text(width - 12, 32, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#e8a060',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);
    this._updateHitsLabel();

    const footer = (data && data.usedEmbeddedOnly && window.location.protocol === 'file:')
      ? 'file:// mode — embedded placeholders. Use npm start to load /assets PNGs.'
      : (data && data.usedFallbacks)
        ? 'PNG load failed — showing paper fallbacks. Serve project root over HTTP.'
        : 'Swap PNGs in /assets — no JS changes needed';

    this.add.text(12, height - 28, footer, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: (data && (data.usedFallbacks || data.usedEmbeddedOnly)) ? '#e8a060' : '#7a7060',
    }).setDepth(100).setScrollFactor(0);
  }

  update(time, delta) {
    this.parallax.update(delta, 0.15, 1);
    this.player.update(time, delta);
    this.projectiles.update(delta);
    this.bossBullets.update(delta);
    this._checkBossHits();

    // Boss sways back and forth across the screen while it fires.
    this.boss.x = this.bossHomeX + Math.sin((time / 1000) * this.bossSwaySpeed * Math.PI) * this.bossSwayAmplitude;

    const triggerHeld = this.shooting || this.firing;
    if (triggerHeld) {
      if (this.weapon === 'laser') {
        // Beam from ship center to boss center; tip tracks every frame.
        this.laser.update(this.player.x, this.player.y, this.boss.x, this.boss.y);
      } else {
        // Spawn at the ship's nose, travelling straight up.
        this.projectiles.fire(this.player.x, this.player.y - this.player.displayHeight * 0.5);
      }
    }
  }

  _updateShotLabel() {
    if (!this.shotLabel) return;
    if (this.weapon === 'laser') {
      this.shotLabel.setText('Weapon: paper laser');
      return;
    }
    const type = this.projectiles.currentType;
    this.shotLabel.setText(type ? `Shot: ${type}` : 'Shot: projectile');
  }

  _updateHitsLabel() {
    if (!this.hitsLabel) return;
    this.hitsLabel.setText(`Hits: ${this.hitsTaken}`);
  }

  /** Pop sparks where projectiles strike the boss, then recycle the shot. */
  _checkBossHits() {
    if (!this.boss || !this.boss.visible) return;
    const bounds = this.boss.getBounds();

    this.projectiles.group.children.each((shot) => {
      if (!shot.active) return;
      if (bounds.contains(shot.x, shot.y)) {
        this.sparks.burst(shot.x, shot.y);
        this.projectiles.group.killAndHide(shot);
        shot.body.stop();
      }
    });
  }
}

window.GameScene = GameScene;
