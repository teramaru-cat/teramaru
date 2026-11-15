// タイトル画面

import { screen } from '../core/renderer.js';
import { input } from '../core/input.js';
import { drawText } from '../core/text.js';
import { Menu, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { getTown } from '../game/town.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.town = getTown(1);
    this.menu = new Menu([{ id: 'start', label: 'はじめる' }]);
    this.hearts = [];
  }

  enter() { input.releaseAll(); }

  update(dt) {
    this.t += dt;
    if (Math.random() < dt * 2.5) {
      this.hearts.push({ x: screen.W / 2 + (Math.random() - 0.5) * 60, y: 112, vy: -14 - Math.random() * 10, life: 2.2 });
    }
    for (const h of this.hearts) { h.y += h.vy * dt; h.life -= dt; }
    this.hearts = this.hearts.filter((h) => h.life > 0);

    const id = this.menu.update();
    if (id === 'start') this.game.startPlay(1);
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    // 背景：街がゆっくり流れる
    const span = this.town.w - W;
    const bx = Math.round((Math.sin(this.t * 0.05) * 0.5 + 0.5) * span);
    ctx.drawImage(this.town.image, -bx, -150);
    ctx.fillStyle = 'rgba(255,246,224,0.55)';
    ctx.fillRect(0, 0, W, H);

    // タイトル
    drawText(ctx, 'てらまる', W / 2, 14, { scale: 3, color: UI.orange, outline: UI.ink, align: 'center' });
    drawText(ctx, '〜てらまりんぐ大作戦〜', W / 2, 54, { font: 'small', color: UI.ink, align: 'center' });

    // ハート
    for (const h of this.hearts) {
      ctx.globalAlpha = Math.min(1, h.life);
      ctx.drawImage(SPR.heart, Math.round(h.x), Math.round(h.y));
    }
    ctx.globalAlpha = 1;

    // てらまる（4倍）
    const bob = Math.floor(this.t * 2) % 2;
    const img = SPR.cat.down[0];
    ctx.drawImage(img, W / 2 - 32, 130 - img.height * 4 + bob, 64, img.height * 4);

    this.menu.layout(W / 2, 138, 96, 20, 6);
    this.menu.draw(ctx);

    const coins = this.game.save.coins;
    panel(ctx, 4, H - 14, 104, 11, UI.cream);
    drawText(ctx, `てらまるコイン ${coins}まい`, 8, H - 12, { font: 'small', color: UI.ink });
  }
}
