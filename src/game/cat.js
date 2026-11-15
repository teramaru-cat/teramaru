// てらまる（M1：歩くだけ）

import { BAL } from '../data/balance.js';
import { SPR } from '../art/sprites.js';

const WALK_ORDER = [1, 0, 2, 0]; // 歩きのコマ（a → 立ち → b → 立ち）

export class Cat {
  constructor(x, y) {
    this.x = x;
    this.y = y; // 足元
    this.px = x; // 1つ前の更新での位置（描画の補間用）
    this.py = y;
    this.dir = 'down';
    this.moving = false;
    this.animT = 0;
  }

  update(dt, mv, town, speedMul = 1) {
    this.px = this.x;
    this.py = this.y;
    const len = Math.hypot(mv.x, mv.y);
    this.moving = len > 0.05;
    if (!this.moving) {
      this.animT = 0;
      return;
    }
    const sp = BAL.cat.speed * speedMul;
    const dx = mv.x * sp * dt;
    const dy = mv.y * sp * dt;
    const { footW, footH } = BAL.cat;
    // 横と縦を別々に動かして、壁に沿って滑れるようにする
    if (!town.blocked(this.x + dx, this.y, footW, footH)) this.x += dx;
    if (!town.blocked(this.x, this.y + dy, footW, footH)) this.y += dy;

    const ax = Math.abs(mv.x);
    const ay = Math.abs(mv.y);
    if (ax > ay * 1.1) this.dir = mv.x > 0 ? 'right' : 'left';
    else if (ay > ax * 1.1) this.dir = mv.y > 0 ? 'down' : 'up';
    this.animT += dt * Math.min(1, len);
  }

  // 描画用の位置（更新と更新の間をなめらかにつなぐ）
  drawPos(alpha) {
    return { x: this.px + (this.x - this.px) * alpha, y: this.py + (this.y - this.py) * alpha };
  }

  sprite() {
    const set = SPR.cat[this.dir];
    if (!this.moving) return set[0];
    return set[WALK_ORDER[Math.floor(this.animT * 5) % 4]];
  }
}
