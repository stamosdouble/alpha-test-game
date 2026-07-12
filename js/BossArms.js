/**
 * Boss mechanical grab-arms — elastic paper limbs bolted through the
 * hull rivets. They stretch the full playfield height, pinch the player,
 * and launch homing missiles from each claw tip.
 *
 * Art keys (procedural by default):
 *   boss_arm_seg  — brass tube segment
 *   boss_claw     — open pincer
 *   arm_missile   — homing missile (falls back to enemy_bullet)
 */
class BossArms {
  /**
   * @param {Phaser.Scene} scene
   * @param {Boss} boss
   * @param {object} [options]
   */
  constructor(scene, boss, options = {}) {
    this.scene = scene;
    this.boss = boss;
    const cfg = (window.GameConfig && GameConfig.boss && GameConfig.boss.arms) || {};
    this.enabled = options.enabled != null ? options.enabled : cfg.enabled !== false;
    this.intervalMs = options.intervalMs != null ? options.intervalMs : (cfg.intervalMs || 4800);
    this.reachMs = options.reachMs != null ? options.reachMs : (cfg.reachMs || 900);
    this.holdMs = options.holdMs != null ? options.holdMs : (cfg.holdMs || 320);
    this.retractMs = options.retractMs != null ? options.retractMs : (cfg.retractMs || 700);
    this.grabRadius = options.grabRadius != null ? options.grabRadius : (cfg.grabRadius || 48);
    this.standoffDistance = options.standoffDistance != null
      ? options.standoffDistance
      : (cfg.standoffDistance != null ? cfg.standoffDistance : 110);
    this.canGrab = options.canGrab != null ? options.canGrab : cfg.canGrab === true;

    // Rest (coiled) bone lengths — stretch elastically far beyond these.
    this.restUpper = options.restUpper != null ? options.restUpper : (cfg.restUpper || 70);
    this.restLower = options.restLower != null ? options.restLower : (cfg.restLower || 64);
    // Legacy aliases still accepted.
    if (cfg.upperLen != null && options.restUpper == null) this.restUpper = cfg.upperLen * 0.65;
    if (cfg.lowerLen != null && options.restLower == null) this.restLower = cfg.lowerLen * 0.65;

    this.shoulders = (options.shoulders || cfg.shoulders || [
      { x: -64, y: 22 },
      { x: 64, y: 22 },
    ]).map((s) => ({ ...s }));

    this.segKey = cfg.segKey || 'boss_arm_seg';
    this.clawKey = cfg.clawKey || 'boss_claw';
    this.armMaxHp = options.maxHp != null ? options.maxHp : (cfg.maxHp != null ? cfg.maxHp : 100);
    this.armHitDamage = options.hitDamage != null ? options.hitDamage : (cfg.hitDamage != null ? cfg.hitDamage : 5);
    this.headHitRadius = options.headHitRadius != null ? options.headHitRadius : (cfg.headHitRadius || 48);

    const mcfg = cfg.missiles || {};
    this.missilesEnabled = mcfg.enabled !== false;
    this.missileIntervalMs = mcfg.intervalMs != null ? mcfg.intervalMs : 2400;
    this.missileSpeed = mcfg.speed != null ? mcfg.speed : 175;
    this.missileTurn = mcfg.turn != null ? mcfg.turn : 0.085;
    this.missileScale = mcfg.scale != null ? mcfg.scale : 0.65;
    this.missileHitRadius = mcfg.hitRadius != null ? mcfg.hitRadius : 28;
    /** How close a player shot must be to destroy a missile. */
    this.missileShootRadius = mcfg.shootRadius != null ? mcfg.shootRadius : 34;
    this.missileKey = mcfg.key
      || (scene.textures.exists('arm_missile') ? 'arm_missile' : 'enemy_bullet');

    this.arms = this.shoulders.map((shoulder, i) => this._createArm(shoulder, i === 0 ? -1 : 1));
    this.missiles = [];
    this._nextAttackAt = 0;
    this._nextMissileAt = 0;
    this._activeIndex = 0;
    this._armed = false;
    this.destroyed = false;
  }

  _createArm(shoulder, bendSign) {
    const g = this.scene.add.graphics().setDepth(14);
    const claw = this.scene.add.image(0, 0, this.clawKey).setDepth(16);
    claw.setOrigin(0.5, 0.15);
    claw.setScale(1.15);
    claw.setVisible(true);

    const upper = this.scene.add.image(0, 0, this.segKey).setDepth(13).setAlpha(0.8);
    upper.setOrigin(0.5, 0);
    const lower = this.scene.add.image(0, 0, this.segKey).setDepth(13).setAlpha(0.8);
    lower.setOrigin(0.5, 0);

    return {
      shoulder,
      bendSign,
      graphics: g,
      upper,
      lower,
      claw,
      alive: true,
      hp: this.armMaxHp,
      maxHp: this.armMaxHp,
      state: 'idle',
      reach: 0,
      handX: 0,
      handY: 0,
      restHandX: 0,
      restHandY: 0,
      targetX: 0,
      targetY: 0,
      stretch: 1,
      grabbed: false,
      firedOnPinch: false,
      stateUntil: 0,
      _flashUntil: 0,
    };
  }

  /** World position of a shoulder mount on the boss. */
  _shoulderWorld(arm) {
    return {
      x: this.boss.x + arm.shoulder.x * this.boss.scaleX,
      y: this.boss.y + arm.shoulder.y * this.boss.scaleY,
    };
  }

  /** How far an arm can stretch from this shoulder (full playfield). */
  _maxReachFrom(shoulder) {
    const { width, height } = this.scene.scale;
    // Farthest corner of the playfield from the shoulder.
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ];
    let max = height; // at least full screen height
    corners.forEach((c) => {
      max = Math.max(max, Phaser.Math.Distance.Between(shoulder.x, shoulder.y, c.x, c.y));
    });
    return max - 8;
  }

  /** Idle hang — short coiled pose under the wing. */
  _restHand(arm) {
    const s = this._shoulderWorld(arm);
    return {
      x: s.x + arm.bendSign * 32,
      y: s.y + this.restUpper * 0.85 + this.restLower * 0.55,
    };
  }

  /**
   * Elastic two-bone solve: segments stretch to the hand with a springy elbow bend.
   * @returns {{elbow:{x:number,y:number}, hand:{x:number,y:number}, stretch:number}}
   */
  _solveElastic(shoulder, desiredHand, bendSign) {
    let dx = desiredHand.x - shoulder.x;
    let dy = desiredHand.y - shoulder.y;
    let dist = Math.hypot(dx, dy) || 0.001;
    const maxReach = this._maxReachFrom(shoulder);

    if (dist > maxReach) {
      desiredHand = {
        x: shoulder.x + (dx / dist) * maxReach,
        y: shoulder.y + (dy / dist) * maxReach,
      };
      dx = desiredHand.x - shoulder.x;
      dy = desiredHand.y - shoulder.y;
      dist = maxReach;
    }

    const restTotal = this.restUpper + this.restLower;
    const stretch = Math.max(1, dist / Math.max(restTotal * 0.9, 1));

    // Elbow sits off the midline; bend collapses as the hose stretches taut.
    const nx = -dy / dist;
    const ny = dx / dist;
    const bendAmt = Phaser.Math.Clamp(95 / Math.sqrt(stretch), 10, 88);
    const elbow = {
      x: shoulder.x + dx * 0.48 + nx * bendSign * bendAmt,
      y: shoulder.y + dy * 0.48 + ny * bendSign * bendAmt,
    };

    return { elbow, hand: desiredHand, stretch };
  }

  _placeSegment(sprite, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const srcH = (sprite.frame && sprite.frame.realHeight) || 96;
    sprite.setPosition(from.x, from.y);
    sprite.setRotation(Math.atan2(dy, dx) - Math.PI / 2);
    // Thin slightly when elastically stretched.
    const thin = Phaser.Math.Clamp(1.05 / Math.sqrt(len / 80), 0.35, 0.85);
    sprite.setScale(thin, Math.max(0.15, len / Math.max(1, srcH * 0.9)));
    sprite.setVisible(true);
  }

  /** Elastic hose drawn as a thick bezier through the elbow. */
  _drawLimb(g, shoulder, elbow, hand, stretch) {
    g.clear();
    const thin = Phaser.Math.Clamp(16 / Math.sqrt(stretch), 6, 16);

    // Dark outline
    g.lineStyle(thin + 4, 0x4a3424, 1);
    g.beginPath();
    g.moveTo(shoulder.x, shoulder.y);
    g.lineTo(elbow.x, elbow.y);
    g.lineTo(hand.x, hand.y);
    g.strokePath();

    // Brass fill
    g.lineStyle(thin, 0xc8a888, 1);
    g.beginPath();
    g.moveTo(shoulder.x, shoulder.y);
    g.lineTo(elbow.x, elbow.y);
    g.lineTo(hand.x, hand.y);
    g.strokePath();

    // Highlight streak
    g.lineStyle(Math.max(2, thin * 0.35), 0xe8d4b8, 0.75);
    g.beginPath();
    g.moveTo(shoulder.x, shoulder.y);
    g.lineTo(elbow.x, elbow.y);
    g.lineTo(hand.x, hand.y);
    g.strokePath();

    // Spring “coil” ticks along the upper half when stretched
    if (stretch > 1.35) {
      const ticks = Math.min(10, Math.floor(stretch * 3));
      for (let i = 1; i < ticks; i++) {
        const t = i / ticks;
        const x = Phaser.Math.Linear(shoulder.x, elbow.x, t);
        const y = Phaser.Math.Linear(shoulder.y, elbow.y, t);
        g.fillStyle(0x6b4e32, 0.7);
        g.fillCircle(x, y, Math.max(1.5, thin * 0.22));
      }
    }

    // Rivet socket on the hull — arms read as bolted through the paper rivet.
    g.fillStyle(0x2a2018, 1);
    g.fillCircle(shoulder.x, shoulder.y, 14);
    g.fillStyle(0x6b5540, 1);
    g.fillCircle(shoulder.x, shoulder.y, 11);
    g.fillStyle(0xc4a484, 1);
    g.fillCircle(shoulder.x, shoulder.y, 7);
    g.fillStyle(0xe8dcc6, 0.9);
    g.fillCircle(shoulder.x - 2, shoulder.y - 2, 2.5);
    g.fillStyle(0x3a2c20, 1);
    g.fillCircle(elbow.x, elbow.y, 8);
    g.fillStyle(0xd8b896, 1);
    g.fillCircle(elbow.x, elbow.y, 4.5);
    g.fillStyle(0x3a2c20, 1);
    g.fillCircle(hand.x, hand.y, 6);
  }

  /**
   * @param {number} time
   * @param {number} delta
   * @param {Phaser.GameObjects.Sprite} player
   * @param {{onGrab?: Function, onMissileHit?: Function}} hooks
   */
  update(time, delta, player, hooks = {}) {
    if (!this.enabled || this.destroyed || !this.boss.visible) return;
    if (!this._armed) return;

    if (this._nextAttackAt === 0) {
      this._nextAttackAt = time + 1400;
      this._nextMissileAt = time + 900;
    }

    if (time >= this._nextAttackAt) {
      this._startAttack(time, player);
      this._nextAttackAt = time + this.intervalMs;
    }

    if (this.missilesEnabled && time >= this._nextMissileAt) {
      this.livingArms().forEach((arm) => this._fireMissile(arm, player));
      this._nextMissileAt = time + this.missileIntervalMs;
    }

    this.arms.forEach((arm) => this._updateArm(arm, time, delta, player, hooks));
    this._updateMissiles(delta, player, hooks);
  }

  /** Living arms only. */
  livingArms() {
    return this.arms.filter((a) => a.alive);
  }

  /** Call once the boss has finished descending onto the playfield. */
  arm() {
    this._armed = true;
  }

  /** Keep limbs posed while the boss is still entering (no grabs yet). */
  poseOnly(time, delta) {
    if (this.destroyed) return;
    this.arms.forEach((arm) => {
      if (!arm.alive) return;
      arm.state = 'idle';
      arm.reach = 0;
      this._updateArm(arm, time, delta, null, {});
    });
  }

  /**
   * Aim point near the player but stopped short by standoffDistance.
   * @returns {{x:number,y:number}}
   */
  _aimNearPlayer(shoulder, player) {
    if (!player || !player.active) {
      return { x: shoulder.x, y: shoulder.y + 180 };
    }
    const dx = player.x - shoulder.x;
    const dy = player.y - shoulder.y;
    const dist = Math.hypot(dx, dy) || 1;
    const stopAt = Math.max(40, dist - this.standoffDistance);
    return {
      x: shoulder.x + (dx / dist) * stopAt,
      y: shoulder.y + (dy / dist) * stopAt,
    };
  }

  _startAttack(time, player) {
    if (!player || !player.active) return;
    const living = this.livingArms();
    if (living.length === 0) return;

    const side = player.x < this.boss.x ? 0 : 1;
    const preferred = this.arms[side];
    let chosen = preferred && preferred.alive && preferred.state === 'idle' ? preferred : null;
    if (!chosen) {
      chosen = living.find((a) => a.state === 'idle') || null;
    }
    if (!chosen) return;

    chosen.state = 'reaching';
    chosen.reach = 0;
    chosen.grabbed = false;
    chosen.firedOnPinch = false;
    const shoulder = this._shoulderWorld(chosen);
    const aim = this._aimNearPlayer(shoulder, player);
    chosen.targetX = aim.x;
    chosen.targetY = aim.y;
    chosen.stateUntil = time + this.reachMs;
    chosen.claw.setDepth(26);
  }

  _updateArm(arm, time, delta, player, hooks) {
    if (!arm.alive) return;

    const shoulder = this._shoulderWorld(arm);
    const rest = this._restHand(arm);
    arm.restHandX = rest.x;
    arm.restHandY = rest.y;

    if (arm.state === 'reaching') {
      if (player && player.active) {
        const aim = this._aimNearPlayer(shoulder, player);
        arm.targetX = Phaser.Math.Linear(arm.targetX, aim.x, 0.16);
        arm.targetY = Phaser.Math.Linear(arm.targetY, aim.y, 0.16);
      }
      const t = 1 - Math.max(0, (arm.stateUntil - time) / this.reachMs);
      const eased = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(t, 0, 1));
      arm.reach = Math.min(1.08, eased * 1.08);
      if (time >= arm.stateUntil) {
        arm.state = 'pinch';
        arm.stateUntil = time + this.holdMs;
        arm.reach = 1;
      }
    } else if (arm.state === 'pinch') {
      arm.reach = 1;
      if (player && player.active) {
        const aim = this._aimNearPlayer(shoulder, player);
        arm.targetX = Phaser.Math.Linear(arm.targetX, aim.x, 0.08);
        arm.targetY = Phaser.Math.Linear(arm.targetY, aim.y, 0.08);
      }
      if (!arm.firedOnPinch) {
        arm.firedOnPinch = true;
        this._fireMissile(arm, player);
      }
      // Optional grab — off by default so claws only threaten / fire missiles.
      if (this.canGrab && !arm.grabbed && player && player.active) {
        const d = Phaser.Math.Distance.Between(arm.handX, arm.handY, player.x, player.y);
        if (d <= this.grabRadius) {
          arm.grabbed = true;
          if (typeof hooks.onGrab === 'function') {
            hooks.onGrab(arm.handX, arm.handY);
          }
          arm.claw.setScale(1.2, 0.7);
        }
      }
      if (time >= arm.stateUntil) {
        arm.state = 'retract';
        arm.stateUntil = time + this.retractMs;
        arm.claw.setScale(1.15);
      }
    } else if (arm.state === 'retract') {
      const t = 1 - Math.max(0, (arm.stateUntil - time) / this.retractMs);
      arm.reach = 1 - Phaser.Math.Easing.Cubic.In(Phaser.Math.Clamp(t, 0, 1));
      arm.reach = Math.max(0, arm.reach);
      if (time >= arm.stateUntil) {
        arm.state = 'idle';
        arm.reach = 0;
        arm.claw.setDepth(16);
      }
    } else {
      const sway = Math.sin(time / 430 + arm.bendSign) * 12;
      arm.targetX = rest.x + sway;
      arm.targetY = rest.y + Math.cos(time / 510 + arm.bendSign) * 8;
      arm.reach = 0;
    }

    const hand = {
      x: Phaser.Math.Linear(rest.x, arm.targetX, Math.min(1, arm.reach)),
      y: Phaser.Math.Linear(rest.y, arm.targetY, Math.min(1, arm.reach)),
    };
    const solved = this._solveElastic(shoulder, hand, arm.bendSign);
    arm.handX = solved.hand.x;
    arm.handY = solved.hand.y;
    arm.stretch = solved.stretch;

    this._placeSegment(arm.upper, shoulder, solved.elbow);
    this._placeSegment(arm.lower, solved.elbow, solved.hand);
    arm.claw.setPosition(solved.hand.x, solved.hand.y);
    arm.claw.setRotation(
      Math.atan2(solved.hand.y - solved.elbow.y, solved.hand.x - solved.elbow.x) + Math.PI / 2
    );
    if (arm.state === 'pinch' && arm.grabbed) {
      arm.claw.setScale(1.25, 0.55);
    } else if (arm.state === 'pinch') {
      arm.claw.setScale(1.1, 0.85);
    } else {
      arm.claw.setScale(1.15);
    }
    // Hit flash on the claw head.
    if (time < arm._flashUntil) {
      arm.claw.setTintFill(0xfff6e0);
    } else if (arm.claw.clearTint) {
      arm.claw.clearTint();
    }
    this._drawLimb(arm.graphics, shoulder, solved.elbow, solved.hand, solved.stretch);
    this._drawHeadHp(arm);
  }

  /** Tiny HP pip above the claw so arm health is readable. */
  _drawHeadHp(arm) {
    if (!arm.hpGfx) {
      arm.hpGfx = this.scene.add.graphics().setDepth(27);
    }
    const g = arm.hpGfx;
    g.clear();
    if (!arm.alive) return;
    const w = 36;
    const ratio = arm.maxHp > 0 ? arm.hp / arm.maxHp : 0;
    g.fillStyle(0x1a1410, 0.75);
    g.fillRect(arm.handX - w / 2, arm.handY - 28, w, 5);
    g.fillStyle(ratio > 0.35 ? 0xd05a46 : 0xe8a060, 1);
    g.fillRect(arm.handX - w / 2, arm.handY - 28, w * ratio, 5);
  }

  _fireMissile(arm, player) {
    if (!this.missilesEnabled || this.destroyed || !arm || !arm.alive) return;
    if (!this.scene.textures.exists(this.missileKey)) return;

    const m = this.scene.add.image(arm.handX, arm.handY, this.missileKey);
    m.setDepth(24);
    m.setScale(this.missileScale);
    // Initial velocity shoots out along the forearm, then homes.
    const ang = Math.atan2(
      (player && player.active ? player.y : arm.handY + 80) - arm.handY,
      (player && player.active ? player.x : arm.handX) - arm.handX
    );
    m.vx = Math.cos(ang) * this.missileSpeed * 0.55;
    m.vy = Math.sin(ang) * this.missileSpeed * 0.55;
    m.setRotation(ang + Math.PI / 2);
    this.missiles.push(m);
  }

  _updateMissiles(delta, player, hooks) {
    if (this.missiles.length === 0) return;
    const dt = delta / 1000;
    const { width, height } = this.scene.scale;
    const speed = this.missileSpeed;

    this.missiles = this.missiles.filter((m) => {
      if (!m.active) return false;

      if (player && player.active) {
        const dx = player.x - m.x;
        const dy = player.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        m.vx = Phaser.Math.Linear(m.vx, (dx / dist) * speed, this.missileTurn);
        m.vy = Phaser.Math.Linear(m.vy, (dy / dist) * speed, this.missileTurn);
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.setRotation(Math.atan2(m.vy, m.vx) + Math.PI / 2);

      if (player && player.active) {
        const hit = Phaser.Math.Distance.Between(m.x, m.y, player.x, player.y);
        if (hit <= this.missileHitRadius) {
          if (typeof hooks.onMissileHit === 'function') {
            hooks.onMissileHit(m.x, m.y);
          }
          m.destroy();
          return false;
        }
      }

      if (m.x < -40 || m.x > width + 40 || m.y < -40 || m.y > height + 40) {
        m.destroy();
        return false;
      }
      return true;
    });
  }

  /**
   * Damage claw / arm heads with player projectiles.
   * Each hit deals armHitDamage (default 5); arm dies at 0 HP.
   * @param {Phaser.Physics.Arcade.Group} shots
   * @param {{onHeadHit?: Function, onArmDestroyed?: Function}} [hooks]
   * @returns {number} hits applied
   */
  damageHeads(shots, hooks = {}) {
    if (!shots || this.destroyed) return 0;
    let hits = 0;
    const radius = this.headHitRadius;
    const dmg = this.armHitDamage;
    const now = this.scene.time.now;

    shots.children.each((shot) => {
      if (!shot.active) return;

      let hitArm = null;
      for (let i = 0; i < this.arms.length; i++) {
        const arm = this.arms[i];
        if (!arm.alive) continue;
        if (Phaser.Math.Distance.Between(shot.x, shot.y, arm.handX, arm.handY) <= radius) {
          hitArm = arm;
          break;
        }
      }
      if (!hitArm) return;

      shots.killAndHide(shot);
      if (shot.body) shot.body.stop();

      hitArm.hp = Math.max(0, hitArm.hp - dmg);
      hitArm._flashUntil = now + 90;
      hits += 1;

      if (typeof hooks.onHeadHit === 'function') {
        hooks.onHeadHit(hitArm.handX, hitArm.handY, hitArm.hp, hitArm.maxHp);
      }

      if (hitArm.hp <= 0) {
        this._destroyArm(hitArm);
        if (typeof hooks.onArmDestroyed === 'function') {
          hooks.onArmDestroyed(hitArm.handX, hitArm.handY);
        }
      }
    });

    return hits;
  }

  _destroyArm(arm) {
    if (!arm.alive) return;
    arm.alive = false;
    arm.state = 'dead';
    arm.hp = 0;
    arm.graphics.clear();
    arm.graphics.setVisible(false);
    arm.upper.setVisible(false);
    arm.lower.setVisible(false);
    arm.claw.setVisible(false);
    if (arm.hpGfx) {
      arm.hpGfx.clear();
      arm.hpGfx.setVisible(false);
    }
  }

  /**
   * Let player projectiles shoot down arm missiles.
   * @param {Phaser.Physics.Arcade.Group} shots
   * @param {{onShotDown?: (x:number, y:number) => void}} [hooks]
   * @returns {number} missiles destroyed this frame
   */
  collideProjectiles(shots, hooks = {}) {
    if (!shots || this.destroyed || this.missiles.length === 0) return 0;
    let destroyed = 0;
    const radius = this.missileShootRadius;

    this.missiles = this.missiles.filter((m) => {
      if (!m.active) return false;

      let hitShot = null;
      shots.children.each((shot) => {
        if (hitShot || !shot.active) return;
        if (Phaser.Math.Distance.Between(m.x, m.y, shot.x, shot.y) <= radius) {
          hitShot = shot;
        }
      });

      if (!hitShot) return true;

      shots.killAndHide(hitShot);
      if (hitShot.body) hitShot.body.stop();
      if (typeof hooks.onShotDown === 'function') {
        hooks.onShotDown(m.x, m.y);
      }
      m.destroy();
      destroyed += 1;
      return false;
    });

    return destroyed;
  }

  destroy() {
    this.destroyed = true;
    this.arms.forEach((arm) => {
      arm.graphics.destroy();
      arm.upper.destroy();
      arm.lower.destroy();
      arm.claw.destroy();
      if (arm.hpGfx) arm.hpGfx.destroy();
    });
    this.arms = [];
    this.missiles.forEach((m) => m.destroy());
    this.missiles = [];
  }
}

window.BossArms = BossArms;
