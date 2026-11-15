// 小さな演出（ハート・数字・ご飯が飛んでいく など）
// 1つ1つが update(dt) → まだ続くなら true、draw(ctx) を持つ。

import { drawText } from '../core/text.js';
import { SPR } from '../art/sprites.js';
import { UI } from '../art/palette.js';

export class Effects {
  constructor() { this.list = []; }
  add(e) { this.list.push(e); return e; }
  update(dt) { this.list = this.list.filter((e) => e.update(dt)); }
  draw(ctx) { for (const e of this.list) e.draw(ctx); }
  get size() { return this.list.length; }
}

// ふわっと上がって消える文字
export class PopText {
  constructor(x, y, text, color = UI.pink, life = 0.9) {
    Object.assign(this, { x, y, text, color, life, t: 0 });
  }
  update(dt) { this.t += dt; this.y -= 14 * dt; return this.t < this.life; }
  draw(ctx) {
    ctx.globalAlpha = Math.min(1, (this.life - this.t) * 3);
    drawText(ctx, this.text, Math.round(this.x), Math.round(this.y), { font: 'small', color: this.color, outline: UI.white, align: 'center' });
    ctx.globalAlpha = 1;
  }
}

// 飛び出して → ちょっと浮いて → target（てらまる）へ吸い込まれるもの
// img：絵、getTarget()：吸い込まれ先の位置、onArrive()：届いたとき
export class Absorb {
  constructor({ img, x, y, vx, vy, gravity = 0, floor = null, wait = 0.6, getTarget, onArrive }) {
    Object.assign(this, { img, x, y, vx, vy, gravity, floor, wait, getTarget, onArrive });
    this.t = 0;
    this.z = 0; // 地面からの高さ（ご飯が跳ねる用）
    this.vz = floor !== null ? 70 + Math.random() * 40 : 0;
    this.speed = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.t < this.wait) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 1 - 2.5 * dt;
      this.vy *= 1 - 2.5 * dt;
      this.vy += this.gravity * dt;
      if (this.floor !== null) {
        this.vz -= 320 * dt;
        this.z += this.vz * dt;
        if (this.z < 0) { this.z = 0; this.vz = -this.vz * 0.35; }
      }
      return true;
    }
    const tg = this.getTarget();
    const dx = tg.x - this.x;
    const dy = tg.y - (this.y - this.z);
    const d = Math.hypot(dx, dy);
    this.speed = Math.min(420, this.speed + 700 * dt);
    const step = this.speed * dt;
    if (d <= step + 2) {
      this.onArrive?.();
      return false;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return true;
  }
  draw(ctx) {
    const w = this.img.width;
    const h = this.img.height;
    if (this.floor !== null && this.z > 0 && this.t < this.wait) {
      ctx.fillStyle = 'rgba(40,30,20,0.25)';
      ctx.fillRect(Math.round(this.x - w / 2), Math.round(this.y), w, 2);
    }
    ctx.drawImage(this.img, Math.round(this.x - w / 2), Math.round(this.y - this.z - h));
  }
}

// ハートを1つ作る（吸い込まれる）
export function heartAbsorb(x, y, getTarget, onArrive) {
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
  const v = 70 + Math.random() * 60;
  return new Absorb({ img: SPR.heart, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, wait: 0.55 + Math.random() * 0.3, getTarget, onArrive });
}
