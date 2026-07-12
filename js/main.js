/**
 * Phaser 3 entry.
 *
 * Custom /assets PNGs:
 * - Prefer HTTP: run start.sh / start.bat / npm start, then refresh after swaps.
 * - file:// works too, but Chrome WebGL cannot use sibling local PNGs (unique
 *   origins), so we force the Canvas renderer on file:// so disk art displays.
 */
(function boot() {
  const errorEl = document.getElementById('boot-error');
  const container = document.getElementById('game-container');

  function showBanner(title, detailHtml) {
    if (!errorEl) return;
    errorEl.style.display = 'block';
    errorEl.innerHTML = `<strong>${title}</strong>${detailHtml}`;
  }

  if (typeof Phaser === 'undefined') {
    showBanner(
      'Phaser failed to load',
      '<p>Expected local file <code>js/vendor/phaser.min.js</code>.</p>'
    );
    if (container) container.style.display = 'none';
    return;
  }

  const isFile = window.location.protocol === 'file:';

  // WebGL + file:// cannot upload sibling PNGs (browser treats each file as its
  // own origin). Canvas can still draw them — required for double-click art swaps.
  const renderType = isFile ? Phaser.CANVAS : Phaser.AUTO;
  window.__PS_FILE_PROTOCOL = isFile;
  window.__PS_RENDER_TYPE = isFile ? 'CANVAS' : 'AUTO';

  console.info(
    '[Paper Squadron] protocol=',
    window.location.protocol,
    'renderer=',
    window.__PS_RENDER_TYPE,
    '| After load: window.__assetReport | Swap PNG then hard-refresh'
  );

  if (isFile) {
    showBanner(
      'Opened as a local file — use Canvas mode for art swaps',
      `<p>Chrome blocks WebGL from reading PNGs next to <code>index.html</code>.
       This build uses Canvas so your <code>/assets</code> swaps can show.</p>
       <p><strong>Most reliable:</strong> double-click <code>start.bat</code> (Windows) or run
       <code>./start.sh</code> / <code>npm start</code>, then open the localhost link and refresh after swaps.</p>`
    );
  } else {
    showBanner(
      'Local server — PNG swaps work on refresh',
      `<p>Replace files under <code>/assets</code> (exact names), then <code>Ctrl+Shift+R</code>.
       Splash shows how many disk files loaded. Console: <code>window.__assetReport</code>.</p>`
    );
  }

  const config = {
    type: renderType,
    parent: 'game-container',
    width: GameConfig.width,
    height: GameConfig.height,
    backgroundColor: GameConfig.backgroundColor,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, TitleScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    loader: {
      path: '',
    },
    banner: false,
  };

  window.addEventListener('load', () => {
    window.game = new Phaser.Game(config);
  });
})();
