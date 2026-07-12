/**
 * Phaser 3 entry — boots even when opened via file://.
 * Disk PNGs under /assets are tried first; EmbeddedAssets fill gaps.
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

  console.info(
    '[Paper Squadron] Disk art loads from paths next to index.html (js/config.js). ' +
      'After preload, open console: window.__assetReport — loadedFromDisk vs failedDisk. ' +
      'Splash also shows how many /assets files loaded. After a PNG swap: Ctrl+Shift+R.'
  );

  const isFile = window.location.protocol === 'file:';
  if (isFile) {
    showBanner(
      'Art loads from /assets beside this HTML',
      `<p>Splash shows how many PNGs loaded. If it says placeholders only, check filenames
       (e.g. <code>assets/player/ship.png</code>) and hard-refresh (<code>Ctrl+Shift+R</code>).</p>
       <p>Optional smoother loop: <code>npm start</code> then open the localhost URL.</p>`
    );
  }

  const config = {
    type: Phaser.AUTO,
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
