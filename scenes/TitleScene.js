/**
 * Title / splash screen — Paper Squadron.
 * Press Enter to begin the fight.
 */
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;

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
    const title = this.add.text(width / 2, height * 0.34, 'PAPER\nSQUADRON', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '64px',
      color: '#e8dcc6',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, height * 0.52, 'A hand-cut paper shooter', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '16px',
      color: '#b8a890',
    }).setOrigin(0.5).setDepth(10);

    const prompt = this.add.text(width / 2, height * 0.68, 'PRESS ENTER', {
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

    this.add.text(width / 2, height * 0.86, 'Arrows / WASD · Space fire · L laser · 1-4 shot · 0 random', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12px',
      color: '#7a7060',
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5).setDepth(10);

    // Gentle paper sway on the title block.
    this.tweens.add({
      targets: title,
      y: title.y + 6,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const start = () => this.scene.start('GameScene');
    this.input.keyboard.once('keydown-ENTER', start);
    // Also allow click / tap for convenience on the splash.
    this.input.once('pointerdown', start);
  }
}

window.TitleScene = TitleScene;
