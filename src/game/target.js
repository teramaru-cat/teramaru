// 街にいるターゲット（人など）と、出現・補充

import { TARGETS } from '../data/targets.js';
import { STAGES } from '../data/areas.js';
import { BAL } from '../data/balance.js';
import { SPR } from '../art/sprites.js';
import { TILE } from './town.js';

const FOOT_W = 10;
const FOOT_H = 4;

export class Target {
  constructor(id, x, y) {
    this.id = id;
    this.def = TARGETS[id];
    this.x = x;
    this.y = y; // 足元
    this.cooldown = 0; // >0 のあいだは近づいても始まらない（途中でやめたあと）
    this.state = 'idle'; // idle | leaving | gone
    this.t = Math.random() * 10;
    this.leaveT = 0;
    this.wdir = { x: 0, y: 0 };
    this.wtime = 0;
    this.moving = false;
    this.flip = Math.random() < 0.5;
    this.charmed = false; // チュートリアルの飼い主：メロメロのまま、その場でハートを出す
  }

  update(dt, town) {
    this.t += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.moving = false;
    if (this.state === 'leaving') {
      // てらまりんぐされて満足して去っていく
      this.leaveT += dt;
      this.moving = true;
      const nx = this.x + this.wdir.x * 28 * dt;
      const ny = this.y + this.wdir.y * 28 * dt;
      if (!town.blocked(nx, ny, FOOT_W, FOOT_H)) { this.x = nx; this.y = ny; }
      if (this.leaveT > 1.6) this.state = 'gone';
      return;
    }
    const sp = this.charmed ? 0 : this.def.wander ?? 0;
    if (sp > 0) {
      this.wtime -= dt;
      if (this.wtime <= 0) {
        const a = Math.random() * Math.PI * 2;
        const go = Math.random() < 0.7;
        this.wdir = go ? { x: Math.cos(a), y: Math.sin(a) } : { x: 0, y: 0 };
        this.wtime = 1 + Math.random() * 1.5;
      }
      if (this.wdir.x || this.wdir.y) {
        const nx = this.x + this.wdir.x * sp * dt;
        const ny = this.y + this.wdir.y * sp * dt;
        if (!town.blocked(nx, ny, FOOT_W, FOOT_H)) {
          this.x = nx;
          this.y = ny;
          this.moving = true;
          if (Math.abs(this.wdir.x) > 0.3) this.flip = this.wdir.x < 0;
        } else {
          this.wtime = 0;
        }
      }
    }
  }

  leave(fromX, fromY) {
    // ランドマーク（ベンチなど）は去らずに、しばらく休むだけ
    if (!this.def.leaves) { this.cooldown = BAL.town.landmarkRest; return; }
    this.state = 'leaving';
    this.leaveT = 0;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.wdir = { x: dx / d, y: dy / d };
  }

  canRing() { return this.state === 'idle' && this.cooldown <= 0 && !this.charmed; }

  sprite() {
    const fr = SPR.people[this.id];
    return this.moving ? fr[Math.floor(this.t * 6) % 2] : fr[0];
  }

  draw(ctx, cx, cy) {
    const img = this.sprite();
    const x = Math.round(this.x) - cx;
    const y = Math.round(this.y) - cy;
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    const hw = Math.floor(img.width / 2);
    ctx.fillRect(x - hw + 1, y - 1, img.width - 2, 2);
    const a = this.state === 'leaving' ? Math.max(0, 1 - this.leaveT / 1.6) : this.cooldown > 0 && !this.charmed ? 0.55 : 1;
    ctx.globalAlpha = a;
    const bob = !this.moving && this.def.motion !== 'still' && Math.floor(this.t * 3) % 2 ? 1 : 0;
    if (this.def.owner) this.drawOwner(ctx, x, y, hw, img);
    if (this.flip) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -hw, y - img.height + 1 + bob);
      ctx.restore();
    } else {
      ctx.drawImage(img, x - hw, y - img.height + 1 + bob);
    }
    ctx.globalAlpha = 1;
    if (this.charmed) {
      // メロメロ：頭の上でハートがぴょこぴょこ
      const hb = Math.floor(this.t * 3) % 2;
      ctx.drawImage(SPR.heart, x - 3, y - img.height - 8 - hb);
    }
  }

  // 犬の飼い主：犬のうしろを歩いて、リードで首輪とつながる
  drawOwner(ctx, x, y, hw, img) {
    const fr = SPR.owners[this.id];
    const o = this.moving ? fr[Math.floor(this.t * 6) % 2] : fr[0];
    const dir = this.flip ? -1 : 1; // 犬の向いている方
    const ox = x - dir * (hw + 6);
    const oy = y - 2;
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(ox - 5, oy - 1, 10, 2);
    if (this.flip) {
      ctx.save();
      ctx.translate(ox, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(o, -7, oy - o.height + 1);
      ctx.restore();
    } else {
      ctx.drawImage(o, ox - 7, oy - o.height + 1);
    }
    // リード：飼い主の手 → 犬の首輪（1ドットの線）
    const hx = ox + dir * 5;
    const hy = oy - 9;
    const cxr = x + dir * (12 - hw);
    const cyr = y - img.height + 8;
    const n = Math.max(Math.abs(cxr - hx), Math.abs(cyr - hy));
    ctx.fillStyle = '#c03030';
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const sag = Math.round(Math.sin(k * Math.PI) * 2); // 少したるませる
      ctx.fillRect(Math.round(hx + (cxr - hx) * k), Math.round(hy + (cyr - hy) * k) + sag, 1, 1);
    }
  }
}

// ターゲットの出し入れ
export class Spawner {
  constructor(town, stageId) {
    this.town = town;
    // 出てくるターゲットと人数は、ステージの表（areas.js）の targets
    this.quota = Object.fromEntries(Object.entries(STAGES[stageId].targets).filter(([id]) => SPR.people[id] && !TARGETS[id].fixed));
    this.ids = Object.keys(this.quota);
    // 決まった場所にずっといるターゲット（ベンチなど）
    this.fixed = (town.stage.fixedTargets ?? []).map((f) => { const t = new Target(f.id, f.x, f.y); t.flip = false; return t; });
    this.targets = [];
    this.waiting = 0; // 補充待ちの数
    this.timers = [];
    // 出られる場所：歩道・広場・小道・芝生で、ぶつからないところ
    this.spots = [];
    for (let r = 0; r < town.rows; r++) {
      for (let c = 0; c < town.cols; c++) {
        const g = town.grid[r][c];
        if (g !== 'S' && g !== 'P' && g !== 'G') continue;
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE - 2;
        if (!town.blocked(x, y, FOOT_W + 4, FOOT_H + 4)) this.spots.push({ x, y });
      }
    }
  }

  fill(cat) {
    for (const t of this.fixed) if (!this.targets.includes(t)) this.targets.push(t);
    const total = Object.values(this.quota).reduce((a, b) => a + b, 0);
    while (this.roaming() + this.timers.length < total) {
      const t = this.spawn(cat, true);
      if (!t) break;
    }
  }

  roaming() { return this.targets.filter((t) => !t.def.fixed).length; }

  spawn(cat, initial = false) {
    for (let tries = 0; tries < 40; tries++) {
      const s = this.spots[Math.floor(Math.random() * this.spots.length)];
      const dc = Math.hypot(s.x - cat.x, s.y - cat.y);
      if (dc < (initial ? 60 : 110)) continue;
      if (this.targets.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < 56)) continue;
      // 決まった人数より少ない種類を優先（足りない割合が大きいものから）
      const counts = Object.fromEntries(this.ids.map((id) => [id, 0]));
      for (const t of this.targets) if (t.id in counts) counts[t.id] += 1;
      const lack = (id) => counts[id] / this.quota[id];
      const min = Math.min(...this.ids.map(lack));
      const pool = this.ids.filter((id) => lack(id) === min);
      const id = pool[Math.floor(Math.random() * pool.length)];
      const t = new Target(id, s.x + (Math.random() - 0.5) * 6, s.y);
      this.targets.push(t);
      return t;
    }
    return null;
  }

  update(dt, cat) {
    for (const t of this.targets) t.update(dt, this.town);
    const before = this.targets.length;
    this.targets = this.targets.filter((t) => t.state !== 'gone');
    for (let i = this.targets.length; i < before; i++) this.timers.push(BAL.town.respawn);
    this.timers = this.timers.map((x) => x - dt);
    while (this.timers.length && this.timers[0] <= 0) {
      this.timers.shift();
      this.spawn(cat);
    }
  }

  // てらまるが触れているターゲット
  touching(cat, skip = null) {
    let best = null;
    let bestD = BAL.town.touchDist;
    for (const t of this.targets) {
      if (!t.canRing() || skip?.(t)) continue;
      const d = Math.hypot(t.x - cat.x, (t.y - cat.y) * 1.4);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
}
