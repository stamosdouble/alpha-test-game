/**
 * Phaser 3 entry — boots even when opened via file://.
 * Placeholders come from EmbeddedAssets (data URIs); disk PNGs load over HTTP.
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
  if (isFile) {
    showBanner(
      'Tip: swap PNGs in /assets, then refresh',
      `<p>Your local <code>/assets</code> files load even from <code>file://</code>. Replace a PNG and press <code>Ctrl+Shift+R</code>.</p>
       <p>For a smoother art loop you can also leave a server running once: <code>npm start</code></p>`
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
