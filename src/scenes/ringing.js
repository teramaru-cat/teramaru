// てらまりんぐ（足元にズームインして、足のまわりをぐるぐる回るミニゲーム）
//
// 流れ：in（ズームイン）→ play（回る）→ win（ハートとご飯を吸い込む）→ out（街へ戻る）
// 画面の端から出ると途中でやめる（そのターゲットにはしばらく近づけない）。

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Button, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawLeg, drawGarment } from '../art/people.js';
import { BAL } from '../data/balance.js';
import { ITEMS } from '../data/targets.js';
import { Cat } from '../game/cat.js';
import { claimMove, moveVector, drawSticks } from '../game/control.js';
import { Effects, PopText, Absorb, heartAbsorb } from '../game/effects.js';
import { PauseScene } from './pause.js';

const TAU = Math.PI * 2;
const GROUND_Y = 112; // 足が地面に着いている高さ（画面）
const TOP_LIMIT = 58; // てらまるはこれより上（服の中）には行けない
const LAP_WORDS = ['すりっ', 'すりすり', 'ゴロゴロ']; // 足を1周したときに出る言葉（ランダム）

function wrap(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export class RingingScene {
  constructor(game, play, target) {
    this.game = game;
    this.play = play;
    this.target = target;
    this.def = target.def;
    this.phase = 'in';
    this.pt = 0; // いまの段階に入ってからの秒数
    this.t = 0;
    this.legs = this.def.legs.map((b) => ({ base: b, x: 0, y: 0, vx: 0, vy: 0, lift: 0, prevLift: 0, acc: 0, prevA: null, laps: 0, ready: false }));
    this.gauge = 0;
    this.bx = 0;
    this.by = 0;
    this.cat = new Cat(0, 0);
    this.cat.dir = 'up';
    this.placed = false;
    this.stun = 0;
    this.immune = 0;
    this.result = null;
    this.fx = new Effects();
    this.pauseBtn = new Button('pause', '', { icon: 'pause', pad: 6 });
    this.ground = { blocked: (x, y) => y < TOP_LIMIT };
    this.updateLegs(1 / 60);
  }

  get gx() { return Math.round(screen.W / 2); }

  // 街で押していた指・キーはそのまま使えるようにする（入ってすぐ動ける）
  enter() {}
  resume() { input.releaseAll(); }
  onHidden() { if (this.phase === 'play') this.openPause(); }
  openPause() { this.game.scenes.push(new PauseScene(this.game, this.play)); }

  catScreen() { return { x: this.cat.x, y: this.cat.y - 14 }; }

  update(dt) {
    this.t += dt;
    this.pt += dt;
    this.pauseBtn.place(screen.W - 24, 4, 20, 16);
    if (!this.placed) {
      this.cat.x = this.cat.px = this.gx;
      this.cat.y = this.cat.py = screen.H - 22;
      this.placed = true;
    }
    this.updateLegs(dt);
    this.fx.update(dt);
    if (this.phase !== 'out') this.play.tick(dt); // てらまりんぐ中も残り時間は減る

    if (this.phase === 'in') {
      if (this.pt >= BAL.ring.intro) this.setPhase('play');
      this.cat.update(dt, { x: 0, y: 0 }, this.ground);
      return;
    }
    if (this.phase === 'play') { this.updatePlay(dt); return; }
    this.cat.update(dt, { x: 0, y: 0 }, this.ground);
    if (this.phase === 'win' && this.pt > 1.0 && this.fx.size === 0) this.setPhase('out');
    if (this.phase === 'out' && this.pt >= 0.3) this.finish();
  }

  setPhase(p) { this.phase = p; this.pt = 0; }

  updatePlay(dt) {
    if (input.hit(KEY.pause)) { this.openPause(); return; }
    for (const p of input.fresh()) {
      if (this.pauseBtn.contains(p.x, p.y)) {
        p.role = 'button:pause';
        this.openPause();
        return;
      }
      claimMove(p);
    }

    let mv = moveVector(this.catScreen());
    if (this.stun > 0) { this.stun -= dt; mv = { x: 0, y: 0 }; }
    if (this.immune > 0) this.immune -= dt;
    this.cat.update(dt, mv, this.ground, BAL.ring.zoom);
    this.collide();
    this.countLaps();

    const dur = this.def.durability;
    if (this.gauge >= dur && this.legs.every((L) => L.laps >= 1)) { this.startWin(); return; }

    // 時間切れ：その場で街へ戻る（リザルトへ）
    if (this.play.state.timeLeft <= 0) { this.result = 'timeup'; this.setPhase('out'); return; }

    const c = this.cat;
    if (c.x < -8 || c.x > screen.W + 8 || c.y > screen.H + 14) {
      this.result = 'abort';
      this.target.cooldown = BAL.ring.abortCooldown;
      this.setPhase('out');
    }
  }

  // 足の動き
  updateLegs(dt) {
    const def = this.def;
    const t = this.t;
    let bx = 0;
    let by = 0;
    if (def.motion === 'lively') {
      const sw = def.sway ?? { x: 20, y: 8, speed: 1 };
      bx = sw.x * Math.sin(t * 1.1 * sw.speed);
      by = sw.y * Math.sin(t * 1.7 * sw.speed + 1);
    }
    this.bx = bx;
    this.by = by;
    this.legs.forEach((L, i) => {
      let lift = 0;
      let dx = 0;
      if (!L.base.cane && (def.motion === 'stomp' || def.motion === 'lively')) {
        const P = def.motion === 'lively' ? 0.7 : def.period;
        const ph = (t / P + i * 0.5) % 1;
        if (ph < 0.3) lift = Math.sin((ph / 0.3) * Math.PI) * (def.motion === 'lively' ? 6 : 8);
      }
      if (L.base.cane) dx = 3 * Math.sin(t * 1.3);
      const nx = this.gx + L.base.x + bx + dx;
      const ny = GROUND_Y + L.base.y + by;
      if (L.ready) {
        L.vx = (nx - L.x) / dt;
        L.vy = (ny - L.y) / dt;
      }
      L.ready = true;
      L.x = nx;
      L.y = ny;
      L.prevLift = L.lift;
      L.lift = lift < 0.3 ? 0 : lift;
    });
  }

  // 足とぶつかる：止まっている足は通れないだけ。動いている足・踏み下ろした足に当たるとよろける
  collide() {
    const c = this.cat;
    const R = BAL.ring.catR;
    for (const L of this.legs) {
      if (L.lift > 3) continue; // 足が上がっている間は下をくぐれる
      const dx = c.x - L.x;
      const dy = c.y - L.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = L.base.r + R;
      const landed = L.prevLift > 0 && L.lift === 0;
      if (d < min) {
        const speed = Math.hypot(L.vx, L.vy);
        if ((speed > 12 || landed) && this.immune <= 0) this.hit(dx / d, dy / d, landed);
        c.x = L.x + (dx / d) * min;
        c.y = Math.max(TOP_LIMIT, L.y + (dy / d) * min);
      } else if (landed && d < min + 4 && this.immune <= 0) {
        this.hit(dx / d, dy / d, true);
      }
    }
  }

  hit(nx, ny, stomped) {
    this.stun = BAL.ring.stun;
    this.immune = 1.2;
    this.gauge = Math.max(0, this.gauge - BAL.ring.hitPenalty);
    this.cat.x += nx * 8;
    this.cat.y = Math.max(TOP_LIMIT, this.cat.y + ny * 8);
    this.fx.add(new PopText(this.cat.x, this.cat.y - 44, stomped ? 'ふまれそう！' : 'ぶつかった！', UI.red));
  }

  // 足ごとに、まわった角度を足していく（360°で1周）
  countLaps() {
    const c = this.cat;
    const dur = this.def.durability;
    for (const L of this.legs) {
      const dx = c.x - L.x;
      const dy = c.y - L.y;
      const d = Math.hypot(dx, dy);
      const r = L.base.r;
      const inBand = d >= r + BAL.ring.bandIn && d <= r + BAL.ring.bandOut;
      if (!inBand) { L.prevA = null; continue; }
      const a = Math.atan2(dy, dx);
      if (L.prevA !== null) {
        L.acc += wrap(a - L.prevA);
        if (Math.abs(L.acc) >= TAU) {
          L.acc -= Math.sign(L.acc) * TAU;
          L.laps++;
          this.gauge = Math.min(dur, this.gauge + 1);
          this.fx.add(new PopText(L.x, L.y - 34, LAP_WORDS[Math.floor(Math.random() * LAP_WORDS.length)], UI.orangeD));
        }
      }
      L.prevA = a;
    }
  }

  catCenter() { return { x: this.cat.x, y: this.cat.y - 16 }; }

  startWin() {
    this.setPhase('win');
    this.result = 'win';
    const st = this.play.state;
    const mid = this.gx + this.bx;
    // ハート：TPをいくつかに分けて、てらまるへ吸い込む
    const tp = this.def.tp;
    const n = Math.max(3, Math.min(12, tp));
    for (let i = 0; i < n; i++) {
      const v = Math.floor(tp / n) + (i < tp % n ? 1 : 0);
      this.fx.add(heartAbsorb(mid + (Math.random() - 0.5) * 50, GROUND_Y - 30 - Math.random() * 20, () => this.catCenter(), () => {
        if (v > 0) {
          st.tp += v;
          st.tpTotal += v;
          this.fx.add(new PopText(this.cat.x + (Math.random() - 0.5) * 16, this.cat.y - 42, `+${v}TP`, UI.pink, 0.7));
        }
      }));
    }
    // ご飯：近くに軽く散らばって、ハートと一緒に吸い込まれる（1個 +2）
    const drop = this.def.drops;
    if (drop) {
      const fp = ITEMS[drop.item].fp;
      for (let i = 0; i < drop.count; i++) {
        const a = Math.random() * TAU;
        const v = 40 + Math.random() * 50;
        this.fx.add(new Absorb({
          img: SPR.food[drop.item],
          scale: BAL.ring.zoom,
          x: mid + (Math.random() - 0.5) * 20,
          y: GROUND_Y + 8,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v * 0.5,
          floor: 0,
          wait: 0.8 + Math.random() * 0.3,
          getTarget: () => this.catCenter(),
          onArrive: () => {
            st.fp += fp;
            st.fpTotal += fp;
            this.fx.add(new PopText(this.cat.x + (Math.random() - 0.5) * 16, this.cat.y - 50, `+${fp}`, UI.orangeD, 0.7));
          },
        }));
      }
    }
  }

  finish() {
    this.game.scenes.pop();
    this.play.onRingingEnd(this.target, this.result === 'win');
  }

  // ---- 描画 ----

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    if (this.phase === 'in') {
      // 街の絵ごと、ターゲットの足元へ寄っていく
      const k = Math.min(1, this.pt / BAL.ring.intro);
      const e = k * k * (3 - 2 * k);
      const z = 1 + (BAL.ring.zoom - 1) * e;
      const ts = this.play.worldToScreen(this.target.x, this.target.y);
      ctx.fillStyle = '#d8c8a8'; // 街の外が見えても黒くならないように
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(ts.x + (this.gx - ts.x) * e, ts.y + (GROUND_Y - ts.y) * e);
      ctx.scale(z, z);
      ctx.translate(-ts.x, -ts.y);
      this.play.drawWorld(ctx);
      ctx.restore();
      const a = Math.max(0, (k - 0.55) / 0.45);
      ctx.fillStyle = `rgba(255,250,240,${a})`;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    this.drawField(ctx);
    this.fx.draw(ctx);
    this.drawHud(ctx);

    let white = 0;
    if (this.phase === 'play' && this.pt < 0.25) white = 1 - this.pt / 0.25;
    if (this.phase === 'out') white = Math.min(1, this.pt / 0.3);
    if (white > 0) {
      ctx.fillStyle = `rgba(255,250,240,${white})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawField(ctx) {
    const W = screen.W;
    const H = screen.H;
    const Z = BAL.ring.zoom;
    const town = this.play.town;
    // 地面：街の地面だけの絵を拡大（建物は描かない）
    const sw = W / Z;
    const sh = H / Z;
    const sx = Math.round(Math.max(0, Math.min(town.w - sw, this.target.x - this.gx / Z)));
    const sy = Math.round(Math.max(0, Math.min(town.h - sh, this.target.y - GROUND_Y / Z)));
    ctx.drawImage(town.groundImage, sx, sy, sw, sh, 0, 0, W, H);
    // 人の体の影（ここに立っている感じを出す）
    const bx = Math.round((this.gx + this.bx) / 2) * 2;
    ctx.fillStyle = 'rgba(40,30,20,0.18)';
    for (const [hw, hy] of [[30, -2], [36, 0], [38, 2], [36, 4], [30, 6]]) ctx.fillRect(bx - hw, GROUND_Y + this.by - 4 + hy, hw * 2, 2);

    // 足のまわりの輪：回った分だけ点が光る
    for (const L of this.legs) this.drawRing(ctx, L);

    // 足とてらまるを奥から順に
    const look = this.def.look;
    const items = this.legs.map((L) => ({ y: L.y, draw: () => drawLeg(ctx, look, L.base, L.x, L.y, L.lift, -4) }));
    items.push({ y: this.cat.y, draw: () => this.drawCat(ctx) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    drawGarment(ctx, look, this.gx, this.bx);
  }

  drawRing(ctx, L) {
    const N = 16;
    const rad = L.base.r + 14;
    const frac = Math.abs(L.acc) / TAU;
    const lit = Math.floor(frac * N);
    const sgn = L.acc < 0 ? -1 : 1;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * TAU * sgn; // 上から、回った向きに光る
      const x = Math.round(L.x + Math.cos(a) * rad);
      const y = Math.round(L.y + Math.sin(a) * rad);
      if (L.laps > 0) ctx.fillStyle = i < lit ? UI.orange : UI.pink;
      else ctx.fillStyle = i < lit ? UI.orange : 'rgba(58,42,32,0.55)';
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    if (L.laps > 0) {
      // 回り終わった足には小さいハート
      ctx.drawImage(SPR.heart, Math.round(L.x - 3), Math.round(L.y + L.base.r + 4));
    }
  }

  drawCat(ctx) {
    const p = this.cat.drawPos(this.game.alpha);
    const img = this.cat.sprite();
    const Z = BAL.ring.zoom;
    const w = img.width * Z;
    const h = img.height * Z;
    let x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = 'rgba(40,30,20,0.28)';
    ctx.fillRect(x - 12, y - 2, 24, 4);
    ctx.fillRect(x - 8, y - 4, 16, 8);
    if (this.stun > 0) {
      x += Math.floor(this.t * 30) % 2 ? 1 : -1;
      if (Math.floor(this.t * 12) % 2) ctx.globalAlpha = 0.6;
    }
    ctx.drawImage(img, x - w / 2, y - h, w, h);
    ctx.globalAlpha = 1;
  }

  drawHud(ctx) {
    const W = screen.W;
    const H = screen.H;
    // 名前とメロメロゲージ
    const dur = this.def.durability;
    const pw = Math.max(textWidth(this.def.name, 'small') + 12, dur * 9 + 12);
    panel(ctx, 4, 4, pw, 26, UI.cream);
    drawText(ctx, this.def.name, 10, 7, { font: 'small', color: UI.ink });
    for (let i = 0; i < dur; i++) {
      const f = Math.max(0, Math.min(1, this.gauge - i));
      const x = 10 + i * 9;
      const y = 18;
      ctx.drawImage(SPR.heartEmpty, x, y);
      if (f >= 1) ctx.drawImage(SPR.heart, x, y);
      else if (f >= 0.5) ctx.drawImage(SPR.heart, 0, 0, 4, 6, x, y, 4, 6);
    }

    this.play.drawCounters(ctx, W - 28, 4, true);
    this.play.drawTimer(ctx);
    this.pauseBtn.draw(ctx, { pressed: this.pauseBtn.isHeld() });

    if (this.phase === 'play' && this.pt < 3.5) {
      drawText(ctx, 'あしのまわりを ぐるぐる まわろう', W / 2, H - 22, { font: 'small', color: UI.ink, outline: UI.white, align: 'center' });
      drawText(ctx, 'はしから でると やめる', W / 2, H - 12, { font: 'small', color: UI.ink, outline: UI.white, align: 'center' });
    }
    if (this.phase === 'win' || this.phase === 'out') {
      const bob = Math.round(Math.sin(this.pt * 8) * 1);
      drawText(ctx, 'メロメロ！', W / 2, 40 + bob, { scale: 2, color: UI.pink, outline: UI.ink, align: 'center' });
    }
    drawSticks(ctx);
  }
}
