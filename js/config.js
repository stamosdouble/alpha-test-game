/**
 * Game configuration — swap art freely; only change keys/paths here if you rename files.
 * All visual content lives under /assets and is referenced by string keys.
 */
const GameConfig = {
  width: 800,
  height: 600,
  backgroundColor: '#1a1e28',

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
    scale: 0.35,
    spinSpeed: 4,
  },

  bossBullets: {
    key: 'enemy_bullet',
    path: 'assets/effects/enemy_bullet.png',
    speed: 130,
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
    x: 400,
    y: 140,
    /** Horizontal sway across the screen while firing. */
    swayAmplitude: 240,
    swaySpeed: 0.45,
  },
};

// Export for browser globals (no bundler required).
window.GameConfig = GameConfig;
