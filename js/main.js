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
      'Running from file:// — using embedded paper placeholders',
      `<p>Gameplay works. To load scanned PNGs from <code>/assets</code>, serve the project root:</p>
       <p><code>npm start</code> &nbsp;or&nbsp; <code>python3 -m http.server 8080</code></p>`
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
