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
    this.sceneData = data;

    // Safety net — never render Phaser's green __MISSING texture.
    PaperTextures.ensureAll(this);

    // Parallax: driven entirely by GameConfig.parallaxLayers
    this.parallax = new ParallaxBackground(this);

    // Boss assembled from part name list — drop PNGs into /assets/boss_parts/
    const bossCfg = GameConfig.boss;
    const bossTargetY = bossCfg.y || 160;
    this.boss = new Boss(
      this,
      bossCfg.x || width / 2,
      bossTargetY,
      GameConfig.bossParts
    );
    this.boss.setDepth(10);
    this.boss.setScale(bossCfg.scale != null ? bossCfg.scale : 1.5);

    // Horizontal sway across the screen (bullets track the moving boss).
    this.bossHomeX = this.boss.x;
    this.bossSwayAmplitude = bossCfg.swayAmplitude != null ? bossCfg.swayAmplitude : 200;
    this.bossSwaySpeed = bossCfg.swaySpeed != null ? bossCfg.swaySpeed : 0.45;

    // Entrance: lower onto the screen from above, then start the fight.
    this.bossEntranceDone = false;
    this.boss.y = -this.boss.getBounds().height;
    this.tweens.add({
      targets: this.boss,
      y: bossTargetY,
      duration: bossCfg.entranceMs || 2400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.bossEntranceDone = true;
        this.swayStartTime = this.time.now;
        if (this.bossArms) this.bossArms.arm();
        // Subtle idle bob so the paper boss feels alive
        this.tweens.add({
          targets: this.boss,
          y: bossTargetY + 8,
          duration: 2200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
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

    // Shield power-up ("S" token → flickering ring around the ship)
    this.shield = new Shield(this);

    // Collectible white pellets from the boss → power meter → homing blast
    this.powerPellets = new PowerPellets(this);
    this.powerCfg = GameConfig.power || {};
    this.powerCharge = 0;
    this.powerMax = this.powerCfg.meterMax || 8;
    this.homingBlasts = [];

    // Wing-launched minion fighters (green bullets, one-hit kill)
    this.minions = new Minions(this);

    // Bullet-hell waves from the boss (rings, aimed fans, spirals)
    this.bossBullets = new BossBullets(this);
    this.hitsTaken = 0;

    // Mechanical arms that reach down and try to grab the player.
    this.bossArms = new BossArms(this, this.boss);

    // Combo chain: consecutive hits on the boss build it; getting hit
    // or going quiet for a while breaks it.
    this.combo = 0;
    this.bestCombo = 0;
    this.lastComboHitAt = 0;
    this.comboTimeoutMs = (GameConfig.combo && GameConfig.combo.timeoutMs) || 3000;

    this.playerDead = false;
    this.bossDefeated = false;
    this.maxHits = (GameConfig.player && GameConfig.player.maxHits) || 6;
    this.projectileDamage = (GameConfig.projectile && GameConfig.projectile.damage) || 5;

    this.physics.add.overlap(this.player, this.bossBullets.group, (player, bullet) => {
      this._onPlayerHitByBullet(player, bullet);
    });

    this.physics.add.overlap(this.player, this.minions.bullets, (player, bullet) => {
      this._onPlayerHitByBullet(player, bullet);
    });

    // Player projectiles destroy minions in one hit.
    this.physics.add.overlap(this.projectiles.group, this.minions.group, (shot, minion) => {
      if (!shot.active || !minion.active) return;
      this.projectiles.group.killAndHide(shot);
      if (shot.body) shot.body.stop();
      this.minions.destroyShip(minion);
      this._registerComboHit();
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

    // Number keys 1..9 lock a projectile type; 0 returns to random.
    const types = this.projectiles.getTypes();
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === '0') {
        this.projectiles.setRandom();
        this.weapon = 'projectile';
        this._updateShotLabel();
        return;
      }
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

    this.add.text(12, 12, 'WASD / arrows · Space · L laser · Enter from title', {
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

    this.shieldLabel = this.add.text(width - 12, 52, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#f0c542',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);
    this._updateShieldLabel();

    // Power meter — vertical bar on the right; fills as pellets are collected.
    this.powerBarH = 180;
    const barX = width - 26;
    const barBottom = height - 70;
    this.add.rectangle(barX, barBottom - this.powerBarH / 2, 18, this.powerBarH + 8, 0x2a241c, 0.85)
      .setDepth(100).setScrollFactor(0);
    this.powerFill = this.add.rectangle(barX, barBottom, 10, 2, 0xf8f4ec)
      .setOrigin(0.5, 1).setDepth(101).setScrollFactor(0);
    this.powerLabel = this.add.text(barX, barBottom + 10, 'POWER', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#d8cbb8',
    }).setOrigin(0.5, 0).setDepth(101).setScrollFactor(0);
    this._updatePowerMeter();

    this.comboLabel = this.add.text(width / 2, 64, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#f0c542',
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);
    this._updateComboLabel();

    // Boss health bar — paper strip that empties as damage lands.
    const barW = Math.min(360, width - 80);
    this.bossHpBarW = barW;
    this.add.rectangle(width / 2, 40, barW + 6, 20, 0x2a241c, 0.85)
      .setDepth(100).setScrollFactor(0);
    this.bossHpFill = this.add.rectangle(width / 2 - barW / 2, 40, barW, 12, 0xd05a46)
      .setOrigin(0, 0.5).setDepth(101).setScrollFactor(0);
    this.bossHpText = this.add.text(width / 2, 40, `${this.boss.hp} / ${this.boss.maxHp}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#e8dcc6',
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
    this._updateBossHpBar();

    // Restart after victory or defeat.
    this.input.keyboard.on('keydown-R', () => {
      if (this.playerDead || this.bossDefeated) {
        this.scene.restart(this.sceneData);
      }
    });

    const report = window.__assetReport || data || {};
    const diskApplied = report.diskApplied || (report.loadedFromDisk && report.loadedFromDisk.length) || 0;
    const usedFallbacks = (data && data.usedFallbacks) || (report.generated && report.generated.length > 0);
    const footer = diskApplied > 0
      ? `Loaded ${diskApplied} files from /assets — swap PNGs then Ctrl+Shift+R`
      : usedFallbacks
        ? 'PNG load failed — showing paper fallbacks (see console __assetReport)'
        : 'Put PNGs in /assets beside index.html, then Ctrl+Shift+R';

    this.add.text(12, height - 28, footer, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: diskApplied > 0 ? '#8fbf8a' : '#e8a060',
    }).setDepth(100).setScrollFactor(0);
  }

  update(time, delta) {
    this.parallax.update(delta, 0.15, 1);
    this.projectiles.update(delta);
    this.bossBullets.update(delta);

    if (!this.playerDead) {
      this.player.update(time, delta);
    }

    if (!this.bossDefeated) {
      this._checkBossHits();

      // Boss sways back and forth once its entrance is complete.
      if (this.bossEntranceDone) {
        const t = (time - this.swayStartTime) / 1000;
        this.boss.x = this.bossHomeX + Math.sin(t * this.bossSwaySpeed * Math.PI) * this.bossSwayAmplitude;
      }

      if (this.bossArms) {
        if (this.bossEntranceDone) {
          this.bossArms.update(time, delta, this.playerDead ? null : this.player, {
            onGrab: (x, y) => this._onGrabbedByArm(x, y),
            onMissileHit: (x, y) => this._onArmMissileHit(x, y),
          });
          // Player shots can destroy claw-launched homing missiles.
          this.bossArms.collideProjectiles(this.projectiles.group, {
            onShotDown: (x, y) => {
              this.sparks.burst(x, y);
              this._registerComboHit();
            },
          });
          // Shoot the claw / arm heads (100 HP, 5 dmg per hit).
          this.bossArms.damageHeads(this.projectiles.group, {
            onHeadHit: (x, y) => {
              this.sparks.burst(x, y);
              this._registerComboHit();
            },
            onArmDestroyed: (x, y) => {
              for (let i = 0; i < 4; i++) {
                this.sparks.burst(
                  x + Phaser.Math.Between(-20, 20),
                  y + Phaser.Math.Between(-20, 20)
                );
              }
              this._registerComboHit();
            },
          });
        } else {
          this.bossArms.poseOnly(time, delta);
        }
      }
    }

    // Combo decays if no hit lands within the timeout window.
    if (this.combo > 0 && time - this.lastComboHitAt > this.comboTimeoutMs) {
      this._breakCombo();
    }

    const triggerHeld = (this.shooting || this.firing) && !this.playerDead;
    if (triggerHeld) {
      if (this.weapon === 'laser') {
        if (this.bossDefeated) {
          this.laser.hide();
        } else {
          // Beam from ship center to boss center; tip tracks every frame.
          this.laser.update(this.player.x, this.player.y, this.boss.x, this.boss.y);
        }
      } else {
        // Volley from both wing muzzles, travelling straight up.
        this.projectiles.fireVolley(this.player.getMuzzles());
      }
    }

    this.shield.update(time, delta);
    this._updateShieldLabel();
    this.powerPellets.update(delta, () => this._collectPowerPellet());
    this.minions.update(time, delta);
    this._updateHomingBlasts(delta);
  }

  /** Shared damage path for boss bullets and minion green shots. */
  _onPlayerHitByBullet(player, bullet) {
    if (!bullet.active || this.playerDead) return;

    // Find which group owns this bullet and recycle it.
    const recycle = (group) => {
      group.killAndHide(bullet);
      if (bullet.body) bullet.body.stop();
    };
    if (this.bossBullets.group.contains(bullet)) recycle(this.bossBullets.group);
    else if (this.minions.bullets.contains(bullet)) recycle(this.minions.bullets);
    else return;

    this._applyPlayerDamage(player.x, player.y);
  }

  /** Claw pinch from a boss mechanical arm. */
  _onGrabbedByArm(x, y) {
    if (this.playerDead || this.bossDefeated) return;
    this.sparks.burst(x, y);
    this._applyPlayerDamage(x, y);
    // Brief yank toward the claw so the grab reads clearly.
    if (this.player && this.player.active) {
      this.tweens.add({
        targets: this.player,
        x: x,
        y: Math.min(this.player.y, y + 10),
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
  }

  /** Homing missile launched from a claw tip. */
  _onArmMissileHit(x, y) {
    if (this.playerDead || this.bossDefeated) return;
    this.sparks.burst(x, y);
    this._applyPlayerDamage(x, y);
  }

  /**
   * Hull damage shared by bullets and grab-arms (shield / i-frames apply).
   * @param {number} x
   * @param {number} y
   */
  _applyPlayerDamage(x, y) {
    if (this.playerDead) return;

    if (this.shield.isActive()) {
      this.shield.absorbHit();
      this._updateShieldLabel();
      return;
    }

    if (this.player.isInvulnerable()) return;
    this.sparks.burst(x, y);
    this.hitsTaken += 1;
    this._breakCombo();
    this._updateHitsLabel();

    if (this.hitsTaken >= this.maxHits) {
      this._destroyPlayer();
    } else {
      this.player.onHit();
    }
  }

  _collectPowerPellet() {
    this.powerCharge = Math.min(this.powerMax, this.powerCharge + 1);
    this._updatePowerMeter();
    // Brief flash so the fill reads clearly.
    this.powerFill.setFillStyle(0xfff1d6);
    this.time.delayedCall(80, () => {
      if (this.powerFill) this.powerFill.setFillStyle(0xf8f4ec);
    });
    if (this.powerCharge >= this.powerMax) {
      this.powerCharge = 0;
      this._updatePowerMeter();
      this._launchHomingBlast();
    }
  }

  _updateShotLabel() {
    if (!this.shotLabel) return;
    if (this.weapon === 'laser') {
      this.shotLabel.setText('Weapon: paper laser');
      return;
    }
    if (this.projectiles.randomize) {
      this.shotLabel.setText('Shot: random');
      return;
    }
    const type = this.projectiles.currentType;
    this.shotLabel.setText(type ? `Shot: ${type}` : 'Shot: projectile');
  }

  _updateHitsLabel() {
    if (!this.hitsLabel) return;
    this.hitsLabel.setText(`Hull: ${Math.max(0, this.maxHits - this.hitsTaken)} / ${this.maxHits}`);
  }

  _updateComboLabel() {
    if (!this.comboLabel) return;
    if (this.combo >= 2) {
      this.comboLabel.setText(`Combo x${this.combo}`);
    } else {
      this.comboLabel.setText('');
    }
  }

  _registerComboHit() {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.lastComboHitAt = this.time.now;
    this._updateComboLabel();

    // Quick pulse so building the chain feels punchy.
    if (this.combo >= 2) {
      this.comboLabel.setScale(1.35);
      this.tweens.add({
        targets: this.comboLabel,
        scale: 1,
        duration: 180,
        ease: 'Back.easeOut',
      });
    }
  }

  _breakCombo() {
    if (this.combo === 0) return;
    this.combo = 0;
    this._updateComboLabel();
  }

  _updateShieldLabel() {
    if (!this.shieldLabel) return;
    const text = this.shield.isActive() ? `Shield: ${this.shield.hitsLeft} / ${this.shield.maxHits}` : '';
    if (this.shieldLabel.text !== text) this.shieldLabel.setText(text);
  }

  _updatePowerMeter() {
    if (!this.powerFill) return;
    const ratio = this.powerCharge / this.powerMax;
    const h = Math.max(2, this.powerBarH * ratio);
    // setSize is required — assigning .height alone can leave Phaser rectangles stale.
    this.powerFill.setSize(10, h);
    this.powerFill.setDisplaySize(10, h);
    if (this.powerLabel) {
      this.powerLabel.setText(this.powerCharge > 0 ? `${this.powerCharge}/${this.powerMax}` : 'POWER');
    }
  }

  /** Full meter: launch a giant homing missile that seeks the boss. */
  _launchHomingBlast() {
    if (this.bossDefeated || this.playerDead) return;

    const key = this.powerCfg.blastKey || 'giant_homing_missile';
    const blast = this.textures.exists(key)
      ? this.add.image(this.player.x, this.player.y - 28, key)
      : (this.textures.exists('arm_missile')
        ? this.add.image(this.player.x, this.player.y - 28, 'arm_missile')
        : this.add.image(this.player.x, this.player.y - 28, GameConfig.projectile.key));

    blast.setScale(this.powerCfg.blastScale != null ? this.powerCfg.blastScale : 2.6);
    blast.setDepth(30);
    blast.vx = 0;
    blast.vy = -(this.powerCfg.blastSpeed || 320);
    blast.isGiantMissile = true;
    this.homingBlasts.push(blast);
  }

  _updateHomingBlasts(delta) {
    if (this.homingBlasts.length === 0) return;
    const dt = delta / 1000;
    const speed = this.powerCfg.blastSpeed || 320;

    this.homingBlasts = this.homingBlasts.filter((blast) => {
      if (this.bossDefeated || !this.boss.visible) {
        blast.destroy();
        return false;
      }

      // Steer toward the boss — velocity eases onto the intercept course.
      const dx = this.boss.x - blast.x;
      const dy = this.boss.y - blast.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      blast.vx = Phaser.Math.Linear(blast.vx, (dx / dist) * speed, 0.1);
      blast.vy = Phaser.Math.Linear(blast.vy, (dy / dist) * speed, 0.1);
      blast.x += blast.vx * dt;
      blast.y += blast.vy * dt;
      blast.setRotation(Math.atan2(blast.vy, blast.vx) + Math.PI / 2);

      // Impact against the same visible-art ellipse as regular shots.
      const bossCfg = GameConfig.boss;
      const hw = ((bossCfg.hitWidth || 245) / 2) * this.boss.scaleX;
      const hh = ((bossCfg.hitHeight || 185) / 2) * this.boss.scaleY;
      const ex = blast.x - this.boss.x;
      const ey = blast.y - this.boss.y;
      if ((ex * ex) / (hw * hw) + (ey * ey) / (hh * hh) <= 1) {
        for (let i = 0; i < 5; i++) {
          this.sparks.burst(
            blast.x + Phaser.Math.Between(-36, 36),
            blast.y + Phaser.Math.Between(-36, 36)
          );
        }
        const remaining = this.boss.takeDamage(this.powerCfg.blastDamage || 150);
        this._updateBossHpBar();
        if (remaining <= 0) this._defeatBoss();
        blast.destroy();
        return false;
      }
      return true;
    });
  }

  /** Pop sparks where projectiles strike the boss, damage it, chain combo. */
  _checkBossHits() {
    if (!this.boss || !this.boss.visible) return;

    // Hit ellipse matched to the visible paper art — the container's
    // bounding box includes transparent padding, which made sparks pop
    // before shots actually reached the ship.
    const bossCfg = GameConfig.boss;
    const hw = ((bossCfg.hitWidth || 205) / 2) * this.boss.scaleX;
    const hh = ((bossCfg.hitHeight || 185) / 2) * this.boss.scaleY;
    const bx = this.boss.x;
    const by = this.boss.y;

    this.projectiles.group.children.each((shot) => {
      if (!shot.active) return;
      const dx = shot.x - bx;
      const dy = shot.y - by;
      if ((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh) <= 1) {
        this.sparks.burst(shot.x, shot.y);
        this.projectiles.group.killAndHide(shot);
        shot.body.stop();
        this._registerComboHit();

        const remaining = this.boss.takeDamage(this.projectileDamage);
        this._updateBossHpBar();
        if (remaining <= 0) {
          this._defeatBoss();
        }
      }
    });
  }

  _updateBossHpBar() {
    if (!this.bossHpFill) return;
    const ratio = this.boss.maxHp > 0 ? this.boss.hp / this.boss.maxHp : 0;
    this.bossHpFill.width = this.bossHpBarW * ratio;
    this.bossHpText.setText(`${this.boss.hp} / ${this.boss.maxHp}`);
  }

  _defeatBoss() {
    if (this.bossDefeated) return;
    this.bossDefeated = true;

    if (this.bossArms) {
      this.bossArms.destroy();
      this.bossArms = null;
    }

    // Paper confetti send-off, then hide the boss.
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 120, () => {
        this.sparks.burst(
          this.boss.x + Phaser.Math.Between(-80, 80),
          this.boss.y + Phaser.Math.Between(-60, 60)
        );
      });
    }
    this.time.delayedCall(700, () => this.boss.setVisible(false));
    this.laser.hide();

    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Boss defeated!\nPress R to play again', {
      fontFamily: 'Georgia, serif',
      fontSize: '30px',
      color: '#f0c542',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(110).setScrollFactor(0);
  }

  _destroyPlayer() {
    if (this.playerDead) return;
    this.playerDead = true;

    this.sparks.burst(this.player.x, this.player.y);
    this.sparks.burst(this.player.x - 10, this.player.y + 8);
    this.sparks.burst(this.player.x + 10, this.player.y - 8);
    this.player.setVisible(false);
    this.laser.hide();

    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Ship destroyed!\nPress R to try again', {
      fontFamily: 'Georgia, serif',
      fontSize: '30px',
      color: '#e8a060',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(110).setScrollFactor(0);
  }
}

window.GameScene = GameScene;
