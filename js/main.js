/**
 * Phaser 3 entry — boots the papercraft shooter skeleton.
 *
 * Assets must be served over http(s). Opening index.html via file:// blocks
 * the Phaser loader (browser CORS), so sprites never appear.
 */
(function boot() {
  const errorEl = document.getElementById('boot-error');
  const container = document.getElementById('game-container');

  function showError(title, detailHtml) {
    if (!errorEl) return;
    errorEl.style.display = 'block';
    errorEl.innerHTML = `<strong>${title}</strong>${detailHtml}`;
    if (container) container.style.display = 'none';
  }

  if (typeof Phaser === 'undefined') {
    showError(
      'Phaser failed to load',
      '<p>Expected local file <code>js/vendor/phaser.min.js</code>. Check that you are serving the project root.</p>'
    );
    return;
  }

  if (window.location.protocol === 'file:') {
    showError(
      'Assets cannot load from file://',
      `<p>Serve the project folder over HTTP, then open the printed URL:</p>
       <p><code>npx serve .</code> &nbsp;or&nbsp; <code>npm start</code> &nbsp;or&nbsp; <code>python3 -m http.server 8080</code></p>
       <p>Opening <code>index.html</code> directly in the browser blocks image loading.</p>`
    );
    return;
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
    scene: [BootScene, PreloadScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Resolve asset paths relative to this HTML page (project root).
    loader: {
      path: '',
    },
    banner: false,
  };

  window.addEventListener('load', () => {
    window.game = new Phaser.Game(config);
  });
})();
