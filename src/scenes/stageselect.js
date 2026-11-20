// ステージ選択：エリアごとに、ステージ（3つ＋ボス）を横に並べる
// ◀ ▶（左右キー・ボタン）でステージを選ぶ。エリアのはしまで行くと、となりのエリアへ。
// 並びや開く条件は src/data/areas.js で決める。

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Button, panel } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { AREAS, STAGES, isOpen, isReady } from '../data/areas.js';
import { getTown } from '../game/town.js';

const ALL = AREAS.flatMap((a) => a.stages.map((s) => s.id)); // すべてのステージ（並び順）

export class StageSelectScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.shake = 0;
    // いちばん先の開いているステージにカーソルを合わせる
    const open = ALL.filter((id) => this.isOpen(id));
    this.sel = open[open.length - 1] ?? ALL[0];
    this.backBtn = new Button('back', 'もどる', { font: 'small', pad: 6 });
    this.prevBtn = new Button('prev', '', { icon: 'left', pad: 6 });
    this.nextBtn = new Button('next', '', { icon: 'right', pad: 6 });
    this.cards = []; // { id, x, y, w, h }
  }

  isOpen(id) { return isOpen(id, this.game.save); }
  get area() { return STAGES[this.sel].area; }

  enter() { input.releaseAll(); audio.music('play'); }

  move(d) {
    const i = ALL.indexOf(this.sel);
    const j = Math.max(0, Math.min(ALL.length - 1, i + d));
    if (j !== i) { this.sel = ALL[j]; audio.sfx('ui'); }
  }

  moveArea(d) {
    const ai = AREAS.indexOf(this.area);
    const to = AREAS[ai + d];
    if (!to) return;
    const open = to.stages.filter((s) => this.isOpen(s.id));
    this.sel = (open[open.length - 1] ?? to.stages[0]).id;
    audio.sfx('ui');
  }

  choose(id) {
    if (this.isOpen(id)) {
      audio.sfx('ui');
      this.game.startPlay(id);
    } else {
      audio.sfx('no');
      this.shake = 0.3;
      this.shakeId = id;
    }
  }

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    this.layout();
    if (input.hit(KEY.pause)) { this.game.toTitle(); return; }
    if (input.hit(KEY.left)) this.move(-1);
    if (input.hit(KEY.right)) this.move(1);
    if (input.hit(KEY.up)) this.moveArea(-1);
    if (input.hit(KEY.down)) this.moveArea(1);
    if (input.hit(KEY.confirm)) { this.choose(this.sel); return; }

    if (input.hover && input.pointers.size === 0) {
      const c = this.cards.find((k) => inside(k, input.hover));
      if (c) this.sel = c.id;
    }
    for (const p of input.fresh()) {
      if (this.backBtn.contains(p.x, p.y)) { p.role = 'button:back'; audio.sfx('ui'); this.game.toTitle(); return; }
      if (this.prevBtn.contains(p.x, p.y)) { p.role = 'button:prev'; this.moveArea(-1); continue; }
      if (this.nextBtn.contains(p.x, p.y)) { p.role = 'button:next'; this.moveArea(1); continue; }
      const c = this.cards.find((k) => inside(k, p));
      p.role = c ? `card:${c.id}` : 'none';
      if (c) this.sel = c.id;
    }
    // 押したカードの上で指を離したら決定
    for (const p of input.pointers.values()) {
      if (!p.up || !p.role?.startsWith('card:')) continue;
      const id = p.role.slice(5);
      p.role = 'done';
      const c = this.cards.find((k) => k.id === id);
      if (c && inside(c, p)) { this.choose(id); return; }
    }
  }

  layout() {
    const W = screen.W;
    const stages = this.area.stages;
    const n = 4; // カードの幅は4枚分で決める（少ないエリアは真ん中に寄せる）
    const gap = 6;
    const cw = Math.min(92, Math.floor((W - 16 - gap * (n - 1)) / n));
    const total = cw * stages.length + gap * (stages.length - 1);
    const x0 = Math.round((W - total) / 2);
    this.cards = stages.map((s, i) => ({ id: s.id, x: x0 + i * (cw + gap), y: 46, w: cw, h: 112 }));
    this.backBtn.place(6, 6, 44, 16);
    const ai = AREAS.indexOf(this.area);
    this.prevBtn.place(W / 2 - 96, 26, 16, 14);
    this.nextBtn.place(W / 2 + 80, 26, 16, 14);
    this.prevBtn.hidden = ai === 0;
    this.nextBtn.hidden = ai === AREAS.length - 1;
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    const bg = getTown('park');
    ctx.drawImage(bg.image, -Math.round(bg.w / 2 - W / 2), -150);
    ctx.fillStyle = 'rgba(255,246,224,0.72)';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'ステージを えらぶ', W / 2, 6, { font: 'small', scale: 2, color: UI.orangeD, align: 'center' });

    // エリア名と ◀ ▶
    const ai = AREAS.indexOf(this.area);
    const head = `エリア${ai}  ${this.area.name}`; // チュートリアルはエリア0
    const hw = textWidth(head, 'small') + 16;
    panel(ctx, Math.round(W / 2 - hw / 2), 26, hw, 14, '#fff6e0');
    drawText(ctx, head, W / 2, 29, { font: 'small', color: UI.ink, align: 'center' });
    if (!this.prevBtn.hidden) this.prevBtn.draw(ctx, { pressed: this.prevBtn.isHeld() });
    if (!this.nextBtn.hidden) this.nextBtn.draw(ctx, { pressed: this.nextBtn.isHeld() });

    for (const c of this.cards) this.drawCard(ctx, c, c.id === this.sel);
    this.backBtn.draw(ctx, { pressed: this.backBtn.isHeld() });
  }

  drawCard(ctx, b, focused) {
    const st = STAGES[b.id];
    const open = this.isOpen(b.id);
    const ready = isReady(b.id);
    const pressed = input.withRole(`card:${b.id}`).some((p) => inside(b, p));
    let x = b.x;
    if (this.shake > 0 && this.shakeId === b.id) x += Math.round(Math.sin(this.shake * 60) * 2);
    const y = b.y + (pressed ? 1 : 0) + (focused && open ? -Math.round(Math.abs(Math.sin(this.t * 4)) * 2) : 0);
    if (!pressed) panel(ctx, x, b.y + 2, b.w, b.h, UI.ink);
    const face = open ? (focused ? '#ffe8b8' : st.boss ? '#ffe0d8' : UI.cream) : focused ? '#e4dccf' : '#d8d0c4';
    panel(ctx, x, y, b.w, b.h, face);
    const cx = x + Math.round(b.w / 2);
    const ink = open ? UI.ink : '#8a8278';

    // 番号（2-1 など）と名前
    drawText(ctx, st.label, cx, y + 5, { font: 'small', color: open ? (st.boss ? UI.red : UI.orangeD) : '#8a8278', align: 'center' });
    drawText(ctx, st.name, cx, y + 16, { font: 'small', color: ink, align: 'center' });

    // 絵：開いていれば街を小さく。開いていなければカギ、作っていなければ「？」
    const iy = y + 28;
    const iw = b.w - 12;
    const ih = 44;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x + 5, iy - 1, iw + 2, ih + 2);
    if (open) {
      const town = getTown(b.id);
      ctx.save();
      ctx.imageSmoothingEnabled = true; // 縮めるときだけなめらかに
      ctx.drawImage(town.image, x + 6, iy, iw, ih);
      ctx.restore();
      if (focused) {
        const img = SPR.cat.down[Math.floor(this.t * 4) % 2 ? 1 : 2];
        ctx.drawImage(img, cx - 8, iy + ih / 2 - 10);
      }
    } else {
      ctx.fillStyle = '#b8b0a4';
      ctx.fillRect(x + 6, iy, iw, ih);
      if (ready) drawLock(ctx, cx, iy + ih / 2);
      else drawText(ctx, '？', cx, iy + ih / 2 - 6, { color: '#8a8278', align: 'center' });
    }

    // 下：ベスト、開く条件、または「じゅんびちゅう」
    const by = y + 80;
    if (open) {
      const best = this.game.save.bestScore[b.id] ?? 0;
      const bw = 9 + digitsWidth(String(best));
      ctx.drawImage(SPR.star, cx - Math.round(bw / 2), by + 1);
      drawDigits(ctx, best, cx - Math.round(bw / 2) + 9, by + 1, { color: UI.ink });
      if (focused) drawText(ctx, 'あそぶ！', cx, by + 13, { font: 'small', color: UI.orangeD, align: 'center' });
    } else if (!ready) {
      drawText(ctx, 'じゅんび', cx, by, { font: 'small', color: '#6a6258', align: 'center' });
      drawText(ctx, 'ちゅう', cx, by + 10, { font: 'small', color: '#6a6258', align: 'center' });
    } else {
      const u = st.unlock;
      drawText(ctx, `${STAGES[u.after].name}で`, cx, by, { font: 'small', color: '#6a6258', align: 'center' });
      const need = u.score ?? 0;
      const tw = digitsWidth(String(need)) + 2 + textWidth('てん', 'small');
      drawDigits(ctx, need, cx - Math.round(tw / 2), by + 11, { color: '#6a6258' });
      drawText(ctx, 'てん', cx - Math.round(tw / 2) + digitsWidth(String(need)) + 2, by + 10, { font: 'small', color: '#6a6258' });
    }
  }
}

function inside(b, p) { return p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h; }

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
