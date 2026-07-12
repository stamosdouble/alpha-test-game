/**
 * Title / splash screen — Paper Squadron.
 * Press Enter to begin the fight.
 * Shows whether /assets PNGs actually loaded (so art swaps are verifiable).
 */
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(data) {
    const { width, height } = this.scale;
    this.bootData = data || {};
    const diskApplied = this.bootData.diskApplied || 0;
    const failed = this.bootData.failedFiles || [];

    // Soft paper atmosphere behind the title.
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1e28);
    const wash = this.add.rectangle(width / 2, height * 0.38, width * 0.92, height * 0.42, 0x2a241c, 0.55);
    this.tweens.add({
      targets: wash,
      alpha: 0.35,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Brand first — hero-level title.
    const title = this.add.text(width / 2, height * 0.30, 'PAPER\nSQUADRON', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '64px',
      color: '#e8dcc6',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, height * 0.48, 'A hand-cut paper shooter', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '16px',
      color: '#b8a890',
    }).setOrigin(0.5).setDepth(10);

    const statusColor = diskApplied > 0 ? '#8fbf8a' : '#e8a060';
    const proto = (typeof location !== 'undefined' && location.protocol) || '';
    const via = proto === 'file:' ? 'file' : 'server';
    const statusLine =
      diskApplied > 0
        ? `Using ${diskApplied} file(s) from /assets (${via})`
        : 'No /assets PNGs found — built-in placeholders';
    this.add.text(width / 2, height * 0.56, statusLine, {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '14px',
      color: statusColor,
    }).setOrigin(0.5).setDepth(10);

    if (diskApplied === 0) {
      this.add.text(
        width / 2,
        height * 0.61,
        'Run start.bat / start.sh / npm start, put PNGs in assets/, then Ctrl+Shift+R',
        {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '12px',
          color: '#7a7060',
          align: 'center',
          wordWrap: { width: width - 48 },
        }
      ).setOrigin(0.5).setDepth(10);
    } else if (failed.length > 0) {
      this.add.text(width / 2, height * 0.61, `${failed.length} path(s) missing — see console __assetReport`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '12px',
        color: '#7a7060',
      }).setOrigin(0.5).setDepth(10);
    } else if (proto === 'file:') {
      this.add.text(width / 2, height * 0.61, 'Tip: start.bat / npm start is more reliable than double-click', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '12px',
        color: '#7a7060',
      }).setOrigin(0.5).setDepth(10);
    }

    const prompt = this.add.text(width / 2, height * 0.72, 'PRESS ENTER', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '22px',
      color: '#f0c542',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, height * 0.88, 'Arrows / WASD · Space fire · Hold L flame laser · 1-4 shot · 0 random', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12px',
      color: '#7a7060',
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: title,
      y: title.y + 6,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const start = () => this.scene.start('GameScene', this.bootData);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}

window.TitleScene = TitleScene;
