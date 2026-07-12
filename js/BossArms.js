/**
 * Boss mechanical grab-arms — articulated paper limbs that reach down
 * toward the player and try to pinch the ship.
 *
 * Art keys (procedural by default; swap PNGs later if desired):
 *   boss_arm_seg  — brass tube segment
 *   boss_claw     — open pincer
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
    this.reachMs = options.reachMs != null ? options.reachMs : (cfg.reachMs || 780);
    this.holdMs = options.holdMs != null ? options.holdMs : (cfg.holdMs || 280);
    this.retractMs = options.retractMs != null ? options.retractMs : (cfg.retractMs || 520);
    this.grabRadius = options.grabRadius != null ? options.grabRadius : (cfg.grabRadius || 42);
    this.upperLen = options.upperLen != null ? options.upperLen : (cfg.upperLen || 110);
    this.lowerLen = options.lowerLen != null ? options.lowerLen : (cfg.lowerLen || 100);
    this.shoulders = (options.shoulders || cfg.shoulders || [
      { x: -96, y: 36 },
      { x: 96, y: 36 },
    ]).map((s) => ({ ...s }));

    this.segKey = cfg.segKey || 'boss_arm_seg';
    this.clawKey = cfg.clawKey || 'boss_claw';

    this.arms = this.shoulders.map((shoulder, i) => this._createArm(shoulder, i === 0 ? -1 : 1));
    this._nextAttackAt = 0;
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

    // Segment sprites are optional detail; thick graphics limbs carry the silhouette.
    const upper = this.scene.add.image(0, 0, this.segKey).setDepth(13).setAlpha(0.85);
    upper.setOrigin(0.5, 0);
    const lower = this.scene.add.image(0, 0, this.segKey).setDepth(13).setAlpha(0.85);
    lower.setOrigin(0.5, 0);

    return {
      shoulder,
      bendSign,
      graphics: g,
      upper,
      lower,
      claw,
      state: 'idle',
      /** 0..1 blend from rest pose toward strike target */
      reach: 0,
      handX: 0,
      handY: 0,
      restHandX: 0,
      restHandY: 0,
      targetX: 0,
      targetY: 0,
      grabbed: false,
      stateUntil: 0,
    };
  }

  /** World position of a shoulder mount on the boss. */
  _shoulderWorld(arm) {
    return {
      x: this.boss.x + arm.shoulder.x * this.boss.scaleX,
      y: this.boss.y + arm.shoulder.y * this.boss.scaleY,
    };
  }

  /** Idle hang point below the shoulder. */
  _restHand(arm) {
    const s = this._shoulderWorld(arm);
    return {
      x: s.x + arm.bendSign * 36,
      y: s.y + this.upperLen * 0.75 + this.lowerLen * 0.45,
    };
  }

  /**
   * Two-bone IK: place elbow so the arm bends outward.
   * @returns {{elbow:{x:number,y:number}, hand:{x:number,y:number}}}
   */
  _solve(shoulder, hand, bendSign) {
    const dx = hand.x - shoulder.x;
    const dy = hand.y - shoulder.y;
    let dist = Math.hypot(dx, dy) || 0.0001;
    const maxReach = this.upperLen + this.lowerLen - 2;
    const minReach = Math.abs(this.upperLen - this.lowerLen) + 2;
    if (dist > maxReach) {
      hand = {
        x: shoulder.x + (dx / dist) * maxReach,
        y: shoulder.y + (dy / dist) * maxReach,
      };
      dist = maxReach;
    } else if (dist < minReach) {
      hand = {
        x: shoulder.x + (dx / dist) * minReach,
        y: shoulder.y + (dy / dist) * minReach,
      };
      dist = minReach;
    }

    const a = this.upperLen;
    const b = this.lowerLen;
    const c = dist;
    // Law of cosines — angle at shoulder between hand vector and upper bone.
    let cosAngle = (a * a + c * c - b * b) / (2 * a * c);
    cosAngle = Phaser.Math.Clamp(cosAngle, -1, 1);
    const angle = Math.acos(cosAngle);
    const base = Math.atan2(dy, dx);
    const elbowAngle = base + bendSign * angle;
    const elbow = {
      x: shoulder.x + Math.cos(elbowAngle) * a,
      y: shoulder.y + Math.sin(elbowAngle) * a,
    };
    return { elbow, hand };
  }

  _placeSegment(sprite, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    // Use source frame height so scale stays stable across frames.
    const srcH = (sprite.frame && sprite.frame.realHeight) || sprite.height || 96;
    sprite.setPosition(from.x, from.y);
    sprite.setRotation(Math.atan2(dy, dx) - Math.PI / 2);
    sprite.setScale(0.7, Math.max(0.2, len / Math.max(1, srcH * 0.9)));
    sprite.setVisible(true);
  }

  _drawLimb(g, shoulder, elbow, hand) {
    g.clear();
    // Thick paper arm beams (drawn so reach always reads, even if sprites scale oddly).
    g.lineStyle(14, 0x6b4e32, 1);
    g.beginPath();
    g.moveTo(shoulder.x, shoulder.y);
    g.lineTo(elbow.x, elbow.y);
    g.strokePath();
    g.lineStyle(12, 0xc4a484, 1);
    g.beginPath();
    g.moveTo(shoulder.x, shoulder.y);
    g.lineTo(elbow.x, elbow.y);
    g.strokePath();

    g.lineStyle(13, 0x5a4030, 1);
    g.beginPath();
    g.moveTo(elbow.x, elbow.y);
    g.lineTo(hand.x, hand.y);
    g.strokePath();
    g.lineStyle(11, 0xd0b090, 1);
    g.beginPath();
    g.moveTo(elbow.x, elbow.y);
    g.lineTo(hand.x, hand.y);
    g.strokePath();

    // Rivet joints
    g.fillStyle(0x3a2c20, 1);
    g.fillCircle(shoulder.x, shoulder.y, 9);
    g.fillStyle(0xc4a484, 1);
    g.fillCircle(shoulder.x, shoulder.y, 5);
    g.fillStyle(0x3a2c20, 1);
    g.fillCircle(elbow.x, elbow.y, 8);
    g.fillStyle(0xd8b896, 1);
    g.fillCircle(elbow.x, elbow.y, 4.5);
    g.fillStyle(0x3a2c20, 1);
    g.fillCircle(hand.x, hand.y, 6);
  }

  _drawJoints(g, shoulder, elbow, hand) {
    this._drawLimb(g, shoulder, elbow, hand);
  }

  /**
   * @param {number} time
   * @param {number} delta
   * @param {Phaser.GameObjects.Sprite} player
   * @param {{onGrab: Function}} hooks
   */
  update(time, delta, player, hooks = {}) {
    if (!this.enabled || this.destroyed || !this.boss.visible) return;

    // Kick off staggered grabs once armed (after boss entrance).
    if (!this._armed) return;

    if (this._nextAttackAt === 0) {
      this._nextAttackAt = time + 1400;
    }

    if (time >= this._nextAttackAt) {
      this._startAttack(time, player);
      this._nextAttackAt = time + this.intervalMs;
    }

    this.arms.forEach((arm) => this._updateArm(arm, time, delta, player, hooks));
  }

  /** Call once the boss has finished descending onto the playfield. */
  arm() {
    this._armed = true;
  }

  /**
   * Keep limbs posed while the boss is still entering (no grabs yet).
   */
  poseOnly(time, delta) {
    if (this.destroyed) return;
    this.arms.forEach((arm) => {
      arm.state = 'idle';
      arm.reach = 0;
      this._updateArm(arm, time, delta, null, {});
    });
  }

  _startAttack(time, player) {
    if (!player || !player.active) return;
    const arm = this.arms[this._activeIndex % this.arms.length];
    this._activeIndex += 1;

    // Prefer the arm on the same side as the player relative to the boss.
    const side = player.x < this.boss.x ? 0 : 1;
    const preferred = this.arms[side];
    const chosen = preferred.state === 'idle' ? preferred : arm;
    if (chosen.state !== 'idle') return;

    chosen.state = 'reaching';
    chosen.reach = 0;
    chosen.grabbed = false;
    chosen.targetX = player.x;
    chosen.targetY = player.y - 8;
    chosen.stateUntil = time + this.reachMs;
    chosen.claw.setDepth(26);
  }

  _updateArm(arm, time, delta, player, hooks) {
    const shoulder = this._shoulderWorld(arm);
    const rest = this._restHand(arm);
    arm.restHandX = rest.x;
    arm.restHandY = rest.y;

    if (arm.state === 'reaching') {
      // Track the player while extending so the grab feels aimed.
      if (player && player.active) {
        arm.targetX = Phaser.Math.Linear(arm.targetX, player.x, 0.12);
        arm.targetY = Phaser.Math.Linear(arm.targetY, player.y - 6, 0.12);
      }
      const t = 1 - Math.max(0, (arm.stateUntil - time) / this.reachMs);
      arm.reach = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(t, 0, 1));
      if (time >= arm.stateUntil) {
        arm.state = 'pinch';
        arm.stateUntil = time + this.holdMs;
        arm.reach = 1;
      }
    } else if (arm.state === 'pinch') {
      arm.reach = 1;
      if (!arm.grabbed && player && player.active) {
        const d = Phaser.Math.Distance.Between(arm.handX, arm.handY, player.x, player.y);
        if (d <= this.grabRadius) {
          arm.grabbed = true;
          if (typeof hooks.onGrab === 'function') {
            hooks.onGrab(arm.handX, arm.handY);
          }
          // Snap closed pose briefly.
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
      if (time >= arm.stateUntil) {
        arm.state = 'idle';
        arm.reach = 0;
        arm.claw.setDepth(16);
      }
    } else {
      // Idle sway.
      const sway = Math.sin(time / 430 + arm.bendSign) * 10;
      arm.targetX = rest.x + sway;
      arm.targetY = rest.y + Math.cos(time / 510 + arm.bendSign) * 6;
      arm.reach = 0;
    }

    const hand = {
      x: Phaser.Math.Linear(rest.x, arm.targetX, arm.reach),
      y: Phaser.Math.Linear(rest.y, arm.targetY, arm.reach),
    };
    const solved = this._solve(shoulder, hand, arm.bendSign);
    arm.handX = solved.hand.x;
    arm.handY = solved.hand.y;

    this._placeSegment(arm.upper, shoulder, solved.elbow);
    this._placeSegment(arm.lower, solved.elbow, solved.hand);
    arm.claw.setPosition(solved.hand.x, solved.hand.y);
    arm.claw.setRotation(Math.atan2(solved.hand.y - solved.elbow.y, solved.hand.x - solved.elbow.x) + Math.PI / 2);
    // Open claw while reaching, pinch while grabbing.
    if (arm.state === 'pinch' && arm.grabbed) {
      arm.claw.setScale(1.25, 0.55);
    } else if (arm.state === 'pinch') {
      arm.claw.setScale(1.1, 0.85);
    } else {
      arm.claw.setScale(1.15);
    }
    this._drawJoints(arm.graphics, shoulder, solved.elbow, solved.hand);
  }

  destroy() {
    this.destroyed = true;
    this.arms.forEach((arm) => {
      arm.graphics.destroy();
      arm.upper.destroy();
      arm.lower.destroy();
      arm.claw.destroy();
    });
    this.arms = [];
  }
}

window.BossArms = BossArms;
