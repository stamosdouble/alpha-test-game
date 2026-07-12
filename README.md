# Paper Squadron

Landscape papercraft shmup with a hand-cut art workflow. Swap scanned paper PNGs into `/assets` without editing game logic.

## Swapping art

Replace PNGs under `/assets` using the **same filenames** (e.g. `assets/player/ship.png`).

**Recommended — local server (swap + refresh always works):**

```bash
npm start
# or double-click start.bat (Windows) / run ./start.sh
# → http://127.0.0.1:8080/  (leave that window open)
```

Then hard-refresh (`Ctrl+Shift+R`) after each PNG swap. Splash shows `Using N file(s) from /assets`.

**Double-click `index.html`:** art swaps work in Canvas mode (Chrome WebGL cannot read sibling `file://` PNGs). Prefer the server if anything looks stale.

## Folder structure

```
/
├── index.html
├── assets/
│   ├── boss_parts/     # hull.png, wing_l.png, wing_r.png, rivets.png, arm_seg.png, arm_claw.png, …
│   ├── laser/          # beam_segment.png, impact_tip.png
│   ├── player/         # ship.png
│   └── background/     # layer_far.png, layer_mid.png, layer_near.png
├── js/
│   ├── config.js       # part lists, parallax layers, paths
│   ├── Boss.js
│   ├── Laser.js
│   ├── Player.js
│   ├── ParallaxBackground.js
│   └── main.js
└── scenes/
    ├── BootScene.js
    ├── PreloadScene.js
    └── GameScene.js
```

## Modular systems

### Boss assembly

`Boss` is a `Phaser.GameObjects.Container`. Pass part names; each PNG from `/assets/boss_parts/{name}.png` is stacked at local `(0, 0)` so alignment lives in the art:

```js
new Boss(scene, x, y, ['hull', 'wing_l', 'wing_r', 'rivets']);
```

Add a new scan → drop it in `assets/boss_parts/` → append its name (no extension) to `GameConfig.bossParts` in `js/config.js`.

### Tiled paper laser

Uses `beam_segment.png` as a `TileSprite` (repeats by distance, never stretched) and places `impact_tip.png` at the beam end every frame via `Laser.update(fromX, fromY, toX, toY)`.

### Organic sway

`Player` keeps a centered origin (`0.5, 0.5`) for correct mid-point rotation and adds `Math.sin` wobble on X/Y after movement.

### Parallax

Add layers to `GameConfig.parallaxLayers`; each entry becomes a scrolling `TileSprite` at its `speed`:

```js
parallaxLayers: [
  { key: 'bg_far', path: 'assets/background/layer_far.png', speed: 0.15 },
  { key: 'bg_mid', path: 'assets/background/layer_mid.png', speed: 0.35 },
  // drop another PNG + entry here — scrolling is automatic
]
```

## Replacing art

| Slot | Path | Notes |
|------|------|--------|
| Boss parts | `assets/boss_parts/*.png` | Same canvas size / shared center; stack order = array order |
| Laser segment | `assets/laser/beam_segment.png` | Small tileable strip |
| Laser tip | `assets/laser/impact_tip.png` | Centered hotspot |
| Player | `assets/player/ship.png` | Designed around center |
| Projectiles | `assets/player/projectiles.png` + `.json` | Texture atlas: one sheet, many designs. Add a frame to both files and it becomes selectable in-game (keys 1-9). `projectile.png` remains as single-image fallback |
| Sparks | `assets/effects/spark.png` | Yellow triangle; burst tuning in `js/config.js` |
| Enemy bullets | `assets/effects/enemy_bullet.png` | Boss bullet-hell waves; pattern tuning under `bossBullets` in `js/config.js` |
| Shield orb | `assets/effects/shield_orb.png` | "S" pickup token; tuning under `shield` in `js/config.js` |
| Shield ring | `assets/effects/shield_ring.png` | Flickering ring that circles the shielded ship |
| Power pellets | `assets/effects/power_pellet.png` | Collectible white pellets that fill the POWER meter (homing blast when full) |
| Minion ships | `assets/effects/minion_ship.png` | Little fighters launched from boss wingtips; die in one hit |
| Green bullets | `assets/effects/green_bullet.png` | Projectiles fired by minion ships |
| Arm segment | `assets/boss_parts/arm_seg.png` | Brass tube for elastic grab-arms (~36×96; oriented along +Y) |
| Arm claw | `assets/boss_parts/arm_claw.png` | Pincer tip (~64×64; wrist hub near top center) |
| Arm missile | `assets/effects/arm_missile.png` | Homing shot from claw tips (~28×48; nose toward +Y) |
| Backgrounds | `assets/background/*.png` | Prefer seamless / tileable |

Placeholder PNGs are included so the skeleton runs immediately. Replace them with your high-resolution scans using the same filenames (or update paths in `js/config.js` only).
