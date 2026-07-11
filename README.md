# Papercraft Shooter — Phaser 3 Skeleton

Asset-driven 2D top-down shooter scaffold with a hand-cut papercraft workflow. Swap scanned paper PNGs into `/assets` without editing game logic.

## Quick start

**Do not open `index.html` as a file.** Browsers block Phaser’s image loader on `file://`, so the canvas stays empty.

Serve the **project root** over HTTP:

```bash
npm start
# or: npx serve .
# or: python3 -m http.server 8080
```

Open the printed URL (e.g. `http://localhost:3000`), then use **Arrows / WASD** to move and **hold Space or click** to fire the tiled paper laser.

## Folder structure

```
/
├── index.html
├── assets/
│   ├── boss_parts/     # hull.png, wing_l.png, wing_r.png, rivets.png, …
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
| Backgrounds | `assets/background/*.png` | Prefer seamless / tileable |

Placeholder PNGs are included so the skeleton runs immediately. Replace them with your high-resolution scans using the same filenames (or update paths in `js/config.js` only).
