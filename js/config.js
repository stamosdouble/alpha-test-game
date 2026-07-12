/**
 * Game configuration — swap art freely; only change keys/paths here if you rename files.
 * All visual content lives under /assets and is referenced by string keys.
 */
const GameConfig = {
  /** Landscape playfield. */
  width: 960,
  height: 720,
  backgroundColor: '#1a1e28',
  title: 'Paper Squadron',

  /** Boss part filenames (without .png) from /assets/boss_parts/ */
  bossParts: ['hull', 'wing_l', 'wing_r', 'rivets'],

  /** Parallax layers: add entries to scroll new backgrounds automatically. */
  parallaxLayers: [
    { key: 'bg_far', path: 'assets/background/layer_far.png', speed: 0.15 },
    { key: 'bg_mid', path: 'assets/background/layer_mid.png', speed: 0.35 },
    { key: 'bg_near', path: 'assets/background/layer_near.png', speed: 0.7 },
  ],

  player: {
    key: 'player_ship',
    path: 'assets/player/ship.png',
    scale: 0.5,
    speed: 220,
    swayAmplitude: 2.5,
    swaySpeed: 3.2,
    /** Bullet hits the ship can take before it is destroyed. */
    maxHits: 6,
    /** Wing muzzle offsets (unscaled, relative to ship center) for projectiles. */
    muzzles: [
      { x: -32, y: -6 },
      { x: 32, y: -6 },
    ],
  },

  shield: {
    key: 'shield_orb',
    path: 'assets/effects/shield_orb.png',
    ringKey: 'shield_ring',
    ringPath: 'assets/effects/shield_ring.png',
    /** Bullet hits the shield absorbs before breaking. */
    hits: 10,
    /** Single ring that circles the ship while flickering. */
    ringScale: 0.72,
    ringSpinSpeed: 1.6,
    flickerSpeed: 9,
    /** Pickup drifts down from the top; respawns on this interval. */
    pickupIntervalMs: 12000,
    pickupDriftSpeed: 55,
  },

  power: {
    pelletKey: 'power_pellet',
    pelletPath: 'assets/effects/power_pellet.png',
    /** Boss occasionally emits a string of collectible white pellets. */
    stringIntervalMs: 7000,
    stringCount: 6,
    stringGapMs: 130,
    pelletSpeed: 120,
    /** Collect radius around the player (more forgiving than the tiny hurtbox). */
    collectRadius: 42,
    /** Pellets collected to fill the meter. */
    meterMax: 8,
    /** Full meter launches a giant homing missile at the boss. */
    blastDamage: 150,
    blastSpeed: 320,
    blastScale: 1.3,
    blastKey: 'giant_homing_missile',
  },

  minions: {
    key: 'minion_ship',
    path: 'assets/effects/minion_ship.png',
    bulletKey: 'green_bullet',
    bulletPath: 'assets/effects/green_bullet.png',
    /** How often the boss launches a pair of wing fighters. */
    spawnIntervalMs: 6500,
    maxAlive: 6,
    scale: 0.85,
    speed: 90,
    fireRateMs: 1100,
    bulletSpeed: 187,
    bulletScale: 0.7,
  },

  projectile: {
    /** Texture atlas: one PNG sheet + JSON frame data. Add new frames to
     *  both files and they become selectable by name — no logic changes. */
    atlasKey: 'projectiles',
    atlasTexturePath: 'assets/player/projectiles.png',
    atlasDataPath: 'assets/player/projectiles.json',
    defaultFrame: 'disc_red',
    /** Fire a random atlas frame per shot (press 1-9 to lock one, 0 for random). */
    randomize: true,
    /** Per-shot size jitter for hand-made variety. */
    scaleJitter: 0.18,

    /** Single-image fallback if the atlas is unavailable. */
    key: 'player_projectile',
    path: 'assets/player/projectile.png',

    speed: 420,
    fireRateMs: 220,
    scale: 0.175,
    spinSpeed: 4.6,
    /** Damage dealt to the boss per hit. */
    damage: 5,
  },

  bossBullets: {
    key: 'enemy_bullet',
    path: 'assets/effects/enemy_bullet.png',
    speed: 143,
    scale: 0.55,
    waveIntervalMs: 1900,
    ringCount: 18,
    fanCount: 7,
    fanSpreadRad: 0.7,
    spiralCount: 24,
    spiralDurationMs: 1100,
  },

  combo: {
    /** Chain resets if no boss hit lands within this window, or when the player is hit. */
    timeoutMs: 3000,
  },

  sparks: {
    key: 'spark',
    path: 'assets/effects/spark.png',
    count: 8,
    speed: 160,
    lifetimeMs: 450,
    scale: 0.6,
  },

  laser: {
    beamKey: 'beam_segment',
    beamPath: 'assets/laser/beam_segment.png',
    tipKey: 'impact_tip',
    tipPath: 'assets/laser/impact_tip.png',
  },

  boss: {
    partsFolder: 'assets/boss_parts/',
    x: 480,
    y: 160,
    scale: 1.5,
    maxHp: 1000,
    /** Descend-from-above entrance before the fight starts. */
    entranceMs: 2400,
    /** Muzzle offsets (unscaled, relative to boss center) at the wing-tip barrels. */
    muzzles: [
      { x: -114, y: 48 },
      { x: 114, y: 48 },
    ],
    /** Visible-art hit ellipse (unscaled) — tighter than the container box so
     *  impacts register on the paper, not the transparent padding. */
    hitWidth: 255,
    hitHeight: 195,
    /** Horizontal sway across the screen while firing. */
    swayAmplitude: 260,
    swaySpeed: 0.45,
    /** Mechanical grab-arms that reach down toward the player. */
    arms: {
      enabled: true,
      segKey: 'boss_arm_seg',
      clawKey: 'boss_claw',
      intervalMs: 4000,
      reachMs: 920,
      holdMs: 320,
      retractMs: 720,
      grabRadius: 48,
      /** Keep claw this far from the player — threaten, don't grab. */
      standoffDistance: 110,
      canGrab: false,
      /** Coiled rest lengths — arms stretch elastically up to full screen. */
      restUpper: 70,
      restLower: 64,
      /** Claw / head hit points — shoot the claw tips to disable an arm. */
      maxHp: 100,
      hitDamage: 5,
      headHitRadius: 48,
      /** Shoulder mounts in unscaled boss-local space. */
      shoulders: [
        { x: -100, y: 40 },
        { x: 100, y: 40 },
      ],
      /** Homing missiles launched from each claw tip. */
      missiles: {
        enabled: true,
        key: 'arm_missile',
        intervalMs: 2600,
        speed: 175,
        turn: 0.09,
        scale: 0.7,
        hitRadius: 28,
        /** Player projectile proximity that destroys a missile. */
        shootRadius: 34,
      },
    },
  },
};

// Export for browser globals (no bundler required).
window.GameConfig = GameConfig;
