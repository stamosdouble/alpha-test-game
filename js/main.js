/**
 * Phaser 3 entry — game canvas fills the browser window.
 *
 * Custom /assets PNGs:
 * - Prefer HTTP: run start.sh / start.bat / npm start, then refresh after swaps.
 * - file:// works too, but Chrome WebGL cannot use sibling local PNGs (unique
 *   origins), so we force the Canvas renderer on file:// so disk art displays.
 */
(function boot() {
  const errorEl = document.getElementById('boot-error');
  const container = document.getElementById('game-container');
  const hintEl = document.getElementById('fs-hint');

  function showBanner(title, detailHtml) {
    if (!errorEl) return;
    errorEl.style.display = 'block';
    errorEl.innerHTML = `<strong>${title}</strong>${detailHtml}`;
    // Auto-hide tips so they don't sit over the fullscreen playfield forever.
    setTimeout(() => {
      if (errorEl) errorEl.style.display = 'none';
    }, 10000);
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
       Prefer <code>start.bat</code> / <code>npm start</code> for art swaps.</p>`
    );
  }

  function toggleBrowserFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) req.call(root);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Don't steal F when typing isn't a concern — no text fields in this game.
      e.preventDefault();
      toggleBrowserFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (hintEl) {
      hintEl.textContent = document.fullscreenElement ? 'Esc · exit fullscreen' : 'F · fullscreen';
    }
  });

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
      // Fill the browser window as large as possible while keeping 960×720.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GameConfig.width,
      height: GameConfig.height,
      parent: 'game-container',
      expandParent: true,
    },
    loader: {
      path: '',
    },
    banner: false,
  };

  window.addEventListener('load', () => {
    window.game = new Phaser.Game(config);
    // Ensure scale refreshes if the window/CSS settles after boot.
    if (window.game && window.game.scale) {
      window.game.scale.refresh();
    }
  });

  window.addEventListener('resize', () => {
    if (window.game && window.game.scale) {
      window.game.scale.refresh();
    }
  });
})();
