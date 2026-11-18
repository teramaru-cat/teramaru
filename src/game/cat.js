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
    const free = (x, y) => !town.blocked(x, y, footW, footH);
    // もし何かにめり込んでいたら、出られるまでは自由に動ける（挟まって動けなくならないように）
    if (!free(this.x, this.y)) {
      this.x = Math.max(footW / 2, Math.min(town.w - footW / 2, this.x + dx));
      this.y = Math.max(footH, Math.min(town.h, this.y + dy));
    } else {
      // 横と縦を別々に動かして、壁に沿って滑れるようにする
      const step = Math.hypot(dx, dy);
      if (free(this.x + dx, this.y)) this.x += dx;
      else if (Math.abs(dx) >= Math.abs(dy)) this.y += this.cornerNudge(free, this.x + dx, this.y, 0, 1, step);
      if (free(this.x, this.y + dy)) this.y += dy;
      else if (Math.abs(dy) > Math.abs(dx)) this.x += this.cornerNudge(free, this.x, this.y + dy, 1, 0, step);
    }

    const ax = Math.abs(v.x);
    const ay = Math.abs(v.y);
    if (ax > ay * 1.1) this.dir = v.x > 0 ? 'right' : 'left';
    else if (ay > ax * 1.1) this.dir = v.y > 0 ? 'down' : 'up';
    this.animT += dt * Math.min(1, len);
  }

  // 角に引っかかったとき：少し横（縦）にずらせば進めるなら、そちらへ寄せる（細い道に入りやすく）
  cornerNudge(free, tx, ty, ox, oy, step) {
    for (let d = 1; d <= 6; d++) {
      for (const s of [1, -1]) {
        if (free(tx + ox * d * s, ty + oy * d * s) && free(this.x + ox * Math.min(step, d) * s, this.y + oy * Math.min(step, d) * s)) {
          return Math.min(step, d) * s;
        }
      }
    }
    return 0;
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
