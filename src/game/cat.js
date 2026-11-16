// てらまる（移動・向き・歩きのコマ）

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
    this.vx = 0; // 今の進む向き（体重で曲がりにくくするため、入力とは別に持つ）
    this.vy = 0;
  }

  // mv：入力の向き（長さ0〜1）、speedMul：速さの倍率、turn：曲がる速さ（0 ならすぐ曲がれる。体重が重いと小さくなる）
  update(dt, mv, town, speedMul = 1, turn = 0) {
    this.px = this.x;
    this.py = this.y;
    // 重いときは、入力の向きへ少しずつしか向きを変えられない
    if (turn > 0 && (this.vx || this.vy)) {
      const k = Math.min(1, turn * dt);
      this.vx += (mv.x - this.vx) * k;
      this.vy += (mv.y - this.vy) * k;
    } else {
      this.vx = mv.x;
      this.vy = mv.y;
    }
    const v = { x: this.vx, y: this.vy };
    const len = Math.hypot(v.x, v.y);
    this.moving = len > 0.05;
    if (!this.moving) {
      this.animT = 0;
      if (Math.hypot(mv.x, mv.y) < 0.05) { this.vx = 0; this.vy = 0; }
      return;
    }
    const sp = BAL.cat.speed * speedMul;
    const dx = v.x * sp * dt;
    const dy = v.y * sp * dt;
    const { footW, footH } = BAL.cat;
    // 横と縦を別々に動かして、壁に沿って滑れるようにする
    if (!town.blocked(this.x + dx, this.y, footW, footH)) this.x += dx;
    if (!town.blocked(this.x, this.y + dy, footW, footH)) this.y += dy;

    const ax = Math.abs(v.x);
    const ay = Math.abs(v.y);
    if (ax > ay * 1.1) this.dir = v.x > 0 ? 'right' : 'left';
    else if (ay > ax * 1.1) this.dir = v.y > 0 ? 'down' : 'up';
    this.animT += dt * Math.min(1, len);
  }

  stop() {
    this.px = this.x;
    this.py = this.y;
    this.vx = 0;
    this.vy = 0;
    this.moving = false;
    this.animT = 0;
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
