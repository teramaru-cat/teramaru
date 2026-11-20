// ほかの猫（ステージ2〜。仕様書 §7.6）
// てらまるは猫が苦手。猫のまわり（BAL.strays.radius）はニガテゾーンで、てらまるは入れない。
// ゾーンの中にいるターゲットには、てらまりんぐもおねだりもできない。
// 猫はうろうろ歩いたり、ターゲットのそばに座り込んで じゃまをする。

import { BAL } from '../data/balance.js';
import { SPR } from '../art/sprites.js';
import { STAGES } from '../data/areas.js';

const FOOT_W = 10;
const FOOT_H = 4;

class Stray {
  constructor(kind, x, y) {
    this.kind = kind; // 'black' | 'tabby'
    this.x = x;
    this.y = y;
    this.dir = 'down';
    this.state = 'walk'; // walk | sit
    this.timer = 0;
    this.goal = null; // 座りに行く先
    this.vx = 0;
    this.vy = 0;
    this.t = Math.random() * 10;
    this.moving = false;
  }

  update(dt, town, targets, cat) {
    this.t += dt;
    this.timer -= dt;
    this.moving = false;
    const B = BAL.strays;
    if (this.state === 'sit') {
      if (this.timer <= 0) this.pickWalk(targets);
      return;
    }
    if (this.timer <= 0) this.pickWalk(targets);
    if (this.goal) {
      const dx = this.goal.x - this.x;
      const dy = this.goal.y + 6 - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4 || this.goal.state !== 'idle') {
        // ターゲットのそばに座り込む
        this.state = 'sit';
        this.dir = 'down';
        this.timer = B.sit[0] + Math.random() * (B.sit[1] - B.sit[0]);
        this.goal = null;
        return;
      }
      this.vx = dx / d;
      this.vy = dy / d;
    }
    if (!this.vx && !this.vy) return;
    const nx = this.x + this.vx * B.speed * dt;
    const ny = this.y + this.vy * B.speed * dt;
    // てらまるにはぶつからない（猫の方がよける）
    const near = Math.hypot(nx - cat.x, ny - cat.y) < B.radius;
    if (near || town.blocked(nx, ny, FOOT_W, FOOT_H)) {
      this.goal = null;
      this.timer = 0;
      return;
    }
    this.x = nx;
    this.y = ny;
    this.moving = true;
    this.dir = Math.abs(this.vx) > Math.abs(this.vy) ? (this.vx > 0 ? 'right' : 'left') : (this.vy > 0 ? 'down' : 'up');
  }

  pickWalk(targets) {
    const B = BAL.strays;
    this.state = 'walk';
    this.goal = null;
    this.timer = 1.5 + Math.random() * 2;
    // ときどき、近くのターゲットのそばへ座りに行く
    if (Math.random() < B.guardRate) {
      const near = targets.filter((t) => t.state === 'idle' && Math.hypot(t.x - this.x, t.y - this.y) < 150);
      if (near.length) {
        this.goal = near[Math.floor(Math.random() * near.length)];
        this.timer = 8;
        return;
      }
    }
    if (Math.random() < 0.3) { this.vx = 0; this.vy = 0; return; } // ちょっと立ち止まる
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a);
    this.vy = Math.sin(a);
  }

  sprite() {
    const fr = SPR.strays[this.kind][this.dir];
    return this.moving ? fr[1 + (Math.floor(this.t * 6) % 2)] : fr[0];
  }
}

export class Strays {
  constructor(town, stageId, cat) {
    this.list = [];
    const n = STAGES[stageId].rules.strays; // 数はステージの表（areas.js）の rules.strays
    const kinds = ['black', 'tabby'];
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 60; tries++) {
        const x = 16 + Math.random() * (town.w - 32);
        const y = 16 + Math.random() * (town.h - 32);
        if (town.blocked(x, y, FOOT_W + 4, FOOT_H + 4)) continue;
        if (Math.hypot(x - cat.x, y - cat.y) < 140) continue;
        if (this.list.some((s) => Math.hypot(s.x - x, s.y - y) < 100)) continue;
        this.list.push(new Stray(kinds[i % kinds.length], x, y));
        break;
      }
    }
  }

  update(dt, town, targets, cat) {
    for (const s of this.list) s.update(dt, town, targets, cat);
  }

  // ターゲットがニガテゾーンの中にいるか
  guards(t) {
    const R = BAL.strays.radius;
    return this.list.some((s) => Math.hypot(t.x - s.x, t.y - s.y) < R);
  }

  // てらまるをゾーンの外へ押し戻す。押し戻したら true
  repel(cat, town) {
    const R = BAL.strays.radius;
    let hit = false;
    for (const s of this.list) {
      const dx = cat.x - s.x;
      const dy = cat.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d >= R) continue;
      hit = true;
      const ux = d > 0.01 ? dx / d : 0;
      const uy = d > 0.01 ? dy / d : 1;
      const nx = s.x + ux * R;
      const ny = s.y + uy * R;
      if (!town.blocked(nx, ny, BAL.cat.footW, BAL.cat.footH)) { cat.x = nx; cat.y = ny; } else { cat.x = cat.px; cat.y = cat.py; }
    }
    return hit;
  }

  // 近くにいるか（ゾーンの輪を見せる距離）
  nearest(cat) {
    let best = null;
    let bd = Infinity;
    for (const s of this.list) {
      const d = Math.hypot(cat.x - s.x, cat.y - s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return { s: best, d: bd };
  }
}
