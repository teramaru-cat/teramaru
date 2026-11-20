// ステージ選択（4つのステージを横に並べる。開いていないステージはカギ）

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Menu, Button, panel } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { STAGES } from '../data/stages.js';
import { getTown } from '../game/town.js';

const IDS = [1, 2, 3, 4];
const NAMES = { 1: 'しょうてんがい', 2: 'こうえん', 3: 'えきまえ', 4: 'かんこうち' };

export class StageSelectScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.menu = new Menu(IDS.map((id) => ({ id, label: '' })));
    const sv = game.save;
    // 最後に開いたステージ（いちばん大きい番号）にカーソルを合わせておく
    const open = IDS.filter((id) => this.isOpen(id));
    this.menu.focus = IDS.indexOf(open[open.length - 1] ?? 1);
    this.backBtn = new Button('back', 'もどる', { font: 'small', pad: 6 });
    this.town = getTown(1);
    this.shake = 0;
    void sv;
  }

  isOpen(id) { return this.game.save.unlockedStages.includes(id) && !!STAGES[id]; }

  enter() { input.releaseAll(); audio.music('play'); }

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    this.layout();
    if (input.hit(KEY.pause)) { this.game.toTitle(); return; }
    for (const p of input.fresh()) {
      if (this.backBtn.contains(p.x, p.y)) { p.role = 'button:back'; audio.sfx('ui'); this.game.toTitle(); return; }
    }
    const id = this.menu.pick();
    if (id == null) return;
    if (this.isOpen(id)) {
      audio.sfx('ui');
      this.game.startPlay(id);
    } else {
      audio.sfx('no');
      this.shake = 0.3;
      this.shakeId = id;
    }
  }

  layout() {
    const W = screen.W;
    const n = IDS.length;
    const gap = 6;
    const cw = Math.min(92, Math.floor((W - 16 - gap * (n - 1)) / n));
    const x0 = Math.round((W - (cw * n + gap * (n - 1))) / 2);
    this.menu.buttons.forEach((b, i) => b.place(x0 + i * (cw + gap), 40, cw, 112));
    this.backBtn.place(6, 6, 44, 16);
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    ctx.drawImage(this.town.image, -Math.round(this.town.w / 2 - W / 2), -150);
    ctx.fillStyle = 'rgba(255,246,224,0.7)';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'ステージを えらぶ', W / 2, 12, { font: 'small', scale: 2, color: UI.orangeD, align: 'center' });

    this.menu.buttons.forEach((b, i) => this.drawCard(ctx, b, IDS[i], i === this.menu.focus));
    this.backBtn.draw(ctx, { pressed: this.backBtn.isHeld() });
  }

  drawCard(ctx, b, id, focused) {
    const open = this.isOpen(id);
    const ready = !!STAGES[id];
    const pressed = input.withRole(`menu:${IDS.indexOf(id)}`).some((p) => b.contains(p.x, p.y));
    let x = b.x;
    if (this.shake > 0 && this.shakeId === id) x += Math.round(Math.sin(this.shake * 60) * 2);
    const y = b.y + (pressed ? 1 : 0) + (focused && open ? -Math.round(Math.abs(Math.sin(this.t * 4)) * 2) : 0);
    if (!pressed) panel(ctx, x, b.y + 2, b.w, b.h, UI.ink);
    panel(ctx, x, y, b.w, b.h, open ? (focused ? '#ffe8b8' : UI.cream) : '#d8d0c4');
    const cx = x + Math.round(b.w / 2);

    // 番号
    drawDigits(ctx, id, cx, y + 6, { color: open ? UI.orangeD : '#8a8278', align: 'center', scale: 2 });
    drawText(ctx, NAMES[id], cx, y + 24, { font: 'small', color: open ? UI.ink : '#8a8278', align: 'center' });

    // 絵：開いていれば、そのステージの街を小さく。開いていなければカギ
    const iy = y + 36;
    const iw = b.w - 12;
    const ih = 40;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x + 5, iy - 1, iw + 2, ih + 2);
    if (open) {
      // 街ぜんたいを小さく（縮めるときだけなめらかに）
      const town = getTown(id);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(town.image, x + 6, iy, iw, ih);
      ctx.restore();
      if (focused) {
        const img = SPR.cat.down[Math.floor(this.t * 4) % 2 ? 1 : 2];
        ctx.drawImage(img, cx - 8, iy + ih / 2 - 10);
      }
    } else {
      ctx.fillStyle = '#b8b0a4';
      ctx.fillRect(x + 6, iy, iw, ih);
      drawLock(ctx, cx, iy + ih / 2);
    }

    // 下：ベスト、または開く条件
    const by = y + 82;
    if (open) {
      const best = this.game.save.bestScore[id] ?? 0;
      ctx.drawImage(SPR.star, cx - Math.round((9 + digitsWidth(String(best))) / 2), by + 1);
      drawDigits(ctx, best, cx - Math.round((9 + digitsWidth(String(best))) / 2) + 9, by + 1, { color: UI.ink });
      if (focused) drawText(ctx, 'あそぶ！', cx, by + 13, { font: 'small', color: UI.orangeD, align: 'center' });
    } else if (!ready) {
      drawText(ctx, 'じゅんび', cx, by, { font: 'small', color: '#6a6258', align: 'center' });
      drawText(ctx, 'ちゅう', cx, by + 10, { font: 'small', color: '#6a6258', align: 'center' });
    } else {
      const need = BAL.unlock[id];
      drawText(ctx, `ステージ${id - 1}で`, cx, by, { font: 'small', color: '#6a6258', align: 'center' });
      const tw = digitsWidth(String(need)) + 2 + textWidth('てん', 'small');
      drawDigits(ctx, need, cx - Math.round(tw / 2), by + 11, { color: '#6a6258' });
      drawText(ctx, 'てん', cx - Math.round(tw / 2) + digitsWidth(String(need)) + 2, by + 10, { font: 'small', color: '#6a6258' });
    }
  }
}

// カギの絵（中心 cx, cy）
function drawLock(ctx, cx, cy) {
  ctx.fillStyle = UI.ink;
  ctx.fillRect(cx - 5, cy - 9, 10, 2);
  ctx.fillRect(cx - 6, cy - 8, 2, 6);
  ctx.fillRect(cx + 4, cy - 8, 2, 6);
  ctx.fillRect(cx - 8, cy - 3, 16, 12);
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(cx - 7, cy - 2, 14, 10);
  ctx.fillStyle = UI.ink;
  ctx.fillRect(cx - 1, cy + 1, 2, 4);
}
