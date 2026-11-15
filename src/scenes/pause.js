// ポーズ（プレイの上に重ねて表示）

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText } from '../core/text.js';
import { Menu, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';

export class PauseScene {
  constructor(game, play) {
    this.game = game;
    this.play = play;
    this.overlay = true;
    this.menu = new Menu([
      { id: 'resume', label: 'つづける' },
      { id: 'restart', label: 'さいしょから' },
      { id: 'title', label: 'タイトルへ' },
    ]);
  }

  enter() { input.releaseAll(); }

  update() {
    if (input.hit(KEY.pause)) { this.game.scenes.pop(); return; }
    const id = this.menu.update();
    if (id === 'resume') this.game.scenes.pop();
    if (id === 'restart') this.game.startPlay(this.play.stageId);
    if (id === 'title') this.game.toTitle();
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    ctx.fillStyle = 'rgba(20,12,8,0.6)';
    ctx.fillRect(0, 0, W, H);
    const pw = 132;
    const ph = 116;
    const px = Math.round((W - pw) / 2);
    const py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph, UI.cream2);
    drawText(ctx, 'ポーズ', W / 2, py + 8, { color: UI.ink, align: 'center' });
    this.menu.layout(W / 2, py + 30, 100, 20, 6);
    this.menu.draw(ctx);
  }
}
