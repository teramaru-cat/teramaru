// キャンバスに描く画面部品（ボタン・メニュー・スティック）

import { UI } from '../art/palette.js';
import { drawText } from './text.js';
import { input, KEY } from './input.js';
import { fillCircle } from './renderer.js';
import { audio } from './audio.js';

// 角を1ドット落とした四角
export function panel(ctx, x, y, w, h, fill, border = UI.ink) {
  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

export class Button {
  constructor(id, label, opts = {}) {
    this.id = id;
    this.label = label;
    this.font = opts.font ?? 'body';
    this.icon = opts.icon ?? null; // 'pause'
    this.pad = opts.pad ?? 4; // 指で押しやすいよう、見た目より広く当たりを取る
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
  }

  place(x, y, w, h) {
    this.x = Math.round(x); this.y = Math.round(y); this.w = w; this.h = h;
    return this;
  }

  contains(px, py) {
    const p = this.pad;
    return px >= this.x - p && px < this.x + this.w + p && py >= this.y - p && py < this.y + this.h + p;
  }

  draw(ctx, { pressed = false, focused = false, lit = false } = {}) {
    const { x, w, h } = this;
    const y = this.y + (pressed ? 1 : 0);
    if (!pressed) panel(ctx, x, this.y + 2, w, h, UI.ink); // 下の影
    const face = focused ? UI.focus : lit ? '#ffe8b8' : UI.cream;
    panel(ctx, x, y, w, h, face);
    ctx.fillStyle = UI.white;
    ctx.fillRect(x + 2, y + 1, w - 4, 1);
    if (this.icon === 'pause') {
      ctx.fillStyle = UI.ink;
      const cx = x + Math.floor(w / 2);
      const cy = y + Math.floor(h / 2);
      ctx.fillRect(cx - 3, cy - 4, 2, 8);
      ctx.fillRect(cx + 1, cy - 4, 2, 8);
    } else if (this.icon === 'left' || this.icon === 'right') {
      // 三角の矢印
      ctx.fillStyle = UI.ink;
      const cx = x + Math.floor(w / 2);
      const cy = y + Math.floor(h / 2);
      for (let i = 0; i < 4; i++) {
        const xx = this.icon === 'left' ? cx - 2 + i : cx + 1 - i;
        ctx.fillRect(xx, cy - i, 1, i * 2 + 1);
      }
    } else if (this.icon === 'sound') {
      drawSpeaker(ctx, x + Math.floor(w / 2) - 5, y + Math.floor(h / 2) - 4, audio.muted);
    } else {
      const th = this.font === 'small' ? 8 : 12;
      drawText(ctx, this.label, x + w / 2, y + Math.floor((h - th) / 2), { font: this.font, color: UI.ink, align: 'center' });
    }
    if (focused) {
      // 左に ▶
      ctx.fillStyle = UI.orangeD;
      const ay = y + Math.floor(h / 2);
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 7 + i, ay - 3 + i, 1, 7 - i * 2);
    }
  }

  // このボタンを押している指があるか
  isHeld() {
    return input.withRole(`button:${this.id}`).some((p) => !p.up);
  }
}

// 縦に並んだメニュー。キーボード（上下＋決定）・マウス・タッチで選べる。
export class Menu {
  constructor(items, opts = {}) {
    this.buttons = items.map((it) => new Button(it.id, it.label, opts));
    this.focus = 0;
  }

  layout(cx, y, w, h, gap) {
    this.buttons.forEach((b, i) => b.place(cx - w / 2, y + i * (h + gap), w, h));
  }

  // 選ばれたら id を返す
  update() {
    const id = this.pick();
    if (id) audio.sfx('ui');
    return id;
  }

  pick() {
    const n = this.buttons.length;
    if (input.hit(KEY.up) || input.hit(KEY.left)) this.focus = (this.focus + n - 1) % n;
    if (input.hit(KEY.down) || input.hit(KEY.right)) this.focus = (this.focus + 1) % n;
    if (input.hit(KEY.confirm)) return this.buttons[this.focus].id;

    if (input.hover && input.pointers.size === 0) {
      const i = this.buttons.findIndex((b) => b.contains(input.hover.x, input.hover.y));
      if (i >= 0) this.focus = i;
    }
    for (const p of input.fresh()) {
      const i = this.buttons.findIndex((b) => b.contains(p.x, p.y));
      p.role = i >= 0 ? `menu:${i}` : 'none';
      if (i >= 0) this.focus = i;
    }
    for (const p of input.pointers.values()) {
      if (!p.up || !p.role?.startsWith('menu:')) continue;
      const i = Number(p.role.slice(5));
      p.role = 'done';
      if (this.buttons[i].contains(p.x, p.y)) return this.buttons[i].id;
    }
    return null;
  }

  draw(ctx) {
    this.buttons.forEach((b, i) => {
      const pressed = input.withRole(`menu:${i}`).some((p) => b.contains(p.x, p.y));
      b.draw(ctx, { focused: i === this.focus, pressed });
    });
  }
}

// スピーカーの絵（10×8）。muted なら ×
function drawSpeaker(ctx, x, y, muted) {
  ctx.fillStyle = UI.ink;
  ctx.fillRect(x, y + 2, 2, 4);
  ctx.fillRect(x + 2, y + 1, 1, 6);
  ctx.fillRect(x + 3, y, 1, 8);
  if (muted) {
    ctx.fillStyle = UI.red;
    for (let i = 0; i < 5; i++) { ctx.fillRect(x + 5 + i, y + 1 + i, 1, 1); ctx.fillRect(x + 9 - i, y + 1 + i, 1, 1); }
  } else {
    ctx.fillRect(x + 5, y + 3, 1, 2);
    ctx.fillRect(x + 7, y + 1, 1, 1); ctx.fillRect(x + 8, y + 2, 1, 4); ctx.fillRect(x + 7, y + 6, 1, 1);
  }
}

// タッチのバーチャルスティック
export function drawStick(ctx, sx, sy, kx, ky, radius) {
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = UI.ink;
  fillCircle(ctx, Math.round(sx), Math.round(sy), radius);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = UI.cream;
  fillCircle(ctx, Math.round(kx), Math.round(ky), 7);
  ctx.globalAlpha = 1;
}
