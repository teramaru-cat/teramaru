// かまってもらう（おねだり成功のあと）。街の上に重ねて出す小さな画面。
// なでなで（見るだけ）・おもちゃ（タップでパンチ）・追いかけっこ（動かして捕まえる）
// この間はプレイの時間は止まる。終わったらスコアと残り時間を足す。

import { screen, makeCanvas } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { audio } from '../core/audio.js';
import { drawText, textWidth } from '../core/text.js';
import { panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { claimMove, moveVector, drawSticks } from '../game/control.js';
import { Effects, PopText, heartAbsorb } from '../game/effects.js';
import { tr } from '../i18n/index.js';

// なでる手（ドット絵。o＝ふち s＝肌）
const HAND_BIG = [
  '.ooooooooo.',
  'ossssssssso',
  'ossssssssso',
  'ossssssssso',
  'ossssssssso',
  'osossossoso',
  '.ooooooooo.',
];
const HAND = [
  '.oooooo.',
  'osssssso',
  'osssssso',
  'ososssso',
  '.oooooo.',
];
function drawRows(ctx, rows, x0, y0, pal) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (!pal[ch]) return;
    ctx.fillStyle = pal[ch];
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }));
}

// ブロック塀（てらまるが すわる台）。ベタ塗りに、ブロックの目地の線だけ
// 立ってなでる人（腰の悪いおばあちゃん）のときの、ブロック塀の高さ
const WALL_HIGH = 30;
function drawWall(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(40,30,20,0.25)';
  ctx.fillRect(x + 2, y + h, w - 4, 2);
  ctx.fillStyle = UI.ink;
  ctx.fillRect(x, y, w, h + 1);
  ctx.fillStyle = '#c4beb2';
  ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
  ctx.fillStyle = '#d8d2c6'; // 上の笠木
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  ctx.fillStyle = '#9c968a'; // 目地
  ctx.fillRect(x + 1, y + 4, w - 2, 1);
  for (let r = 0; r < 3; r++) {
    const ry = y + 5 + r * 6;
    if (r < 2) ctx.fillRect(x + 1, ry + 5, w - 2, 1);
    for (let cx = x + (r % 2 ? 8 : 15); cx < x + w - 2; cx += 14) ctx.fillRect(cx, ry, 1, Math.min(5, y + h - ry));
  }
}

// 人のなでなでの腕の形（サンプルページ sample/arm.html で見くらべる）
//   gap：てらまると人のあいだ  k：上腕・前腕の長さ（肩から手までの何倍か）  elbow：ひじの向き
//   tx, ty：手の位置（頭のてっぺんのまん中から）
export const ARM_STYLE = { gap: 6, k: 0.6, elbow: 'up', tx: 1, ty: 0 };

const PW = 240; // 枠の大きさ
const PH = 124;
const TITLE = (kind) => tr(`kamatte.${kind}`);

export class KamatteScene {
  constructor(game, play, target, kind) {
    this.game = game;
    this.play = play;
    this.target = target;
    this.kind = kind;
    this.cfg = BAL.kamatte[kind];
    this.overlay = true;
    this.phase = 'in'; // in | play | out
    this.pt = 0;
    this.fx = new Effects();
    this.bonus = 0; // パンチ・捕まえたボーナス
    this.punch = 0; // パンチの残り秒（絵）
    this.punches = 0;
    this.caught = false;
    // 追いかけっこ用（枠の中の座標）
    this.cat = { x: 50, y: 100, dir: 'right', moving: false, t: 0 };
    this.run = { x: 180, y: 90, vx: -1, vy: 0, t: 0, turn: 0 };
  }

  enter() { input.releaseAll(); }

  get box() {
    return { x: Math.round((screen.W - PW) / 2), y: Math.round((screen.H - PH) / 2) + 8 };
  }

  update(dt) {
    this.pt += dt;
    this.fx.update(dt);
    if (this.punch > 0) this.punch -= dt;
    if (this.phase === 'in') {
      if (this.pt >= 0.45) this.setPhase('play');
      return;
    }
    if (this.phase === 'out') {
      // 押したら早めに戻る
      const skip = input.hit(KEY.confirm) || input.fresh().length;
      for (const p of input.fresh()) p.role = 'none';
      if (this.pt >= 1.6 || (skip && this.pt > 0.5)) this.finish();
      return;
    }
    if (this.kind === 'nade') this.updateNade(dt);
    if (this.kind === 'toy') this.updateToy(dt);
    if (this.kind === 'chase') this.updateChase(dt);
    if (this.phase === 'play' && this.pt >= this.cfg.dur) this.setPhase('out');
  }

  setPhase(p) {
    this.phase = p;
    this.pt = 0;
    if (p === 'out') {
      for (const q of input.fresh()) q.role = 'none';
      this.total = this.cfg.score + this.bonus;
    }
  }

  finish() {
    this.game.scenes.pop();
    this.play.onKamatteEnd(this.target, this.total, this.cfg.time);
  }

  // 枠の中の位置 → 画面
  scr(x, y) {
    const b = this.box;
    return { x: b.x + x, y: b.y + y };
  }

  hearts(n, x, y) {
    const c = this.scr(70, 70);
    for (let i = 0; i < n; i++) this.fx.add(heartAbsorb(x, y, () => c, null));
  }

  // ---- なでなで：見ているだけ。ときどきハート ----
  updateNade() {
    for (const p of input.fresh()) p.role = 'none';
    if (Math.floor(this.pt * 2.5) !== Math.floor((this.pt - 1 / 60) * 2.5)) {
      // 人のなでなで（アップ）は、てらまるの顔にかからないよう左のあいたところに
      const human = this.target.def.kind === 'human';
      const s = human ? this.scr(42, 58) : this.scr(76, 50);
      const words = this.target.def.words;
      this.fx.add(new PopText(s.x + (Math.random() - 0.5) * (human ? 16 : 30), s.y, words[Math.random() < 0.5 ? 0 : 1], UI.pink, 0.8));
    }
  }

  // ---- おもちゃ：タップ（決定）でパンチ ----
  updateToy() {
    let tap = input.hit(KEY.confirm);
    for (const p of input.fresh()) { p.role = 'none'; tap = true; }
    if (tap && this.punch <= 0.05 && this.punches < this.cfg.maxTaps) {
      this.punch = 0.18;
      this.punches++;
      audio.sfx('punch');
      this.bonus += this.cfg.tapBonus;
      const s = this.scr(100 + Math.random() * 30, 46);
      this.fx.add(new PopText(s.x, s.y, `+${this.cfg.tapBonus}`, UI.orangeD, 0.6));
      if (this.punches % 3 === 0) this.fx.add(new PopText(s.x - 20, s.y - 10, tr('kamatte.punch'), UI.pink, 0.7));
    }
  }

  // ---- 追いかけっこ：枠の中でてらまるを動かして、逃げる相手を捕まえる ----
  updateChase(dt) {
    if (this.caught) return;
    for (const p of input.fresh()) claimMove(p);
    const c = this.cat;
    const cs = this.scr(c.x, c.y - 8);
    const mv = moveVector(cs);
    const sp = this.cfg.catSpeed;
    c.moving = Math.hypot(mv.x, mv.y) > 0.05;
    c.t += dt;
    if (c.moving) {
      c.x = Math.max(12, Math.min(PW - 12, c.x + mv.x * sp * dt));
      c.y = Math.max(40, Math.min(PH - 8, c.y + mv.y * sp * dt));
      c.dir = Math.abs(mv.x) > Math.abs(mv.y) ? (mv.x > 0 ? 'right' : 'left') : (mv.y > 0 ? 'down' : 'up');
    }
    // 逃げる：てらまるから離れる向き＋ときどき向きを変える。壁で跳ね返る
    const r = this.run;
    r.t += dt;
    r.turn -= dt;
    const dx = r.x - c.x;
    const dy = r.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (r.turn <= 0) {
      const a = Math.random() * Math.PI * 2;
      r.wx = Math.cos(a);
      r.wy = Math.sin(a);
      r.turn = 0.6 + Math.random() * 0.6;
    }
    const near = d < 60 ? 1 : 0.3;
    let vx = (dx / d) * near + (r.wx ?? 0) * 0.8;
    let vy = (dy / d) * near + (r.wy ?? 0) * 0.8;
    const vl = Math.hypot(vx, vy) || 1;
    vx /= vl;
    vy /= vl;
    r.x += vx * this.cfg.runSpeed * dt;
    r.y += vy * this.cfg.runSpeed * dt;
    if (r.x < 14 || r.x > PW - 14) { r.x = Math.max(14, Math.min(PW - 14, r.x)); r.wx = -(r.wx ?? 0); r.turn = 0.3; }
    if (r.y < 44 || r.y > PH - 8) { r.y = Math.max(44, Math.min(PH - 8, r.y)); r.wy = -(r.wy ?? 0); r.turn = 0.3; }
    r.flip = vx < 0;
    if (Math.hypot(r.x - c.x, r.y - c.y) < this.cfg.catchDist) {
      this.caught = true;
      audio.sfx('catch');
      this.bonus += this.cfg.catchBonus;
      const s = this.scr(r.x, r.y - 40);
      this.fx.add(new PopText(s.x, s.y, tr('kamatte.caught'), UI.pink, 1.2));
      this.hearts(6, s.x, s.y + 10);
      this.setPhase('out');
    }
  }

  // ---- 描画 ----

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    const k = this.phase === 'in' ? Math.min(1, this.pt / 0.3) : 1;
    ctx.fillStyle = `rgba(20,12,8,${0.45 * k})`;
    ctx.fillRect(0, 0, W, H);
    const b = this.box;
    const grow = this.phase === 'in' ? Math.round((1 - k) * 30) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + grow * 2, b.y + grow, PW - grow * 4, PH - grow * 2);
    ctx.clip();
    this.drawStage(ctx, b);
    ctx.restore();
    this.drawFrame(ctx, b, grow);
    if (this.phase === 'in') return;

    // 見出し
    const title = (this.kind === 'nade' && this.target.def.kamatteTitle) || TITLE(this.kind);
    // 点数を出すときは見出しのかわりに上の段へ（人の頭にかぶらないように）
    // 人のなでなで（アップ）は、人の頭にかからないよう左上に
    const petZoom = this.kind === 'nade' && this.target.def.kind === 'human';
    if (this.phase !== 'out') drawText(ctx, title, petZoom ? b.x + 6 : W / 2, b.y + 3, { font: 'small', scale: 2, color: UI.orangeD, outline: UI.white, align: petZoom ? 'left' : 'center' });
    this.fx.draw(ctx);
    if (this.phase === 'play') this.drawGuide(ctx, b);
    if (this.phase === 'out') this.drawScore(ctx, b);
    if (this.kind === 'chase' && this.phase === 'play') drawSticks(ctx);
  }

  drawFrame(ctx, b, grow) {
    ctx.strokeStyle = UI.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 1 + grow * 2, b.y - 1 + grow, PW + 2 - grow * 4, PH + 2 - grow * 2);
    ctx.strokeStyle = UI.white;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x - 2.5 + grow * 2, b.y - 2.5 + grow, PW + 5 - grow * 4, PH + 5 - grow * 2);
  }

  // 背景：空色の壁と、地面
  drawStage(ctx, b) {
    ctx.fillStyle = '#fbe9d0';
    ctx.fillRect(b.x, b.y, PW, PH);
    ctx.fillStyle = '#f3d9b4';
    for (let i = 0; i < PW; i += 16) ctx.fillRect(b.x + i, b.y, 8, 40);
    ctx.fillStyle = '#d8c8a8';
    ctx.fillRect(b.x, b.y + 40, PW, PH - 40);
    ctx.fillStyle = '#cbb894';
    for (let y = 48; y < PH; y += 16) ctx.fillRect(b.x, b.y + y, PW, 1);
    if (this.kind === 'chase') this.drawChase(ctx, b);
    else if (this.kind === 'nade' && this.target.def.kind === 'human') this.drawPetZoom(ctx, b);
    else this.drawPair(ctx, b);
  }

  // 人のなでなで：てらまるが主役の アップ。半分の大きさの絵に等倍で描いてから、まとめて2倍にする
  // （この場面の中のドットの大きさは全部そろう）。
  // てらまる（4kgもない猫）はブロック塀の上で、こっちを向いておすわり。となりに大きな人のうしろ姿（胸から下は画面の外）。
  // かさねる順：塀 → 腕（人と猫のうしろ） → 人 → てらまる → 手
  drawPetZoom(ctx, b) {
    const w = PW / 2;
    const h = PH / 2;
    if (!this.zoom) this.zoom = makeCanvas(w, h);
    const [off, o] = this.zoom;
    o.clearRect(0, 0, w, h);
    const t = this.pt;
    const look = this.target.def.look ?? {};
    const arm = this.armStyle ?? ARM_STYLE;
    const person = SPR.peopleBig[this.target.id];
    const cat = SPR.catHD.down;
    const catX = 46; // てらまるのまん中
    const catTop = 25; // 絵のいちばん上（耳の先の上）。足もとは画面の下はし
    const catBottom = catTop + cat.height;
    const px = catX + arm.gap; // 人の絵の左はし
    const py = -9; // 人の頭のてっぺんは少し画面の外（アップの写真のように）。肩が てらまるの頭の高さに来る
    const ground = py + person.height;

    drawWall(o, catX - 18, catBottom, 36, h - catBottom + 4);

    // 腕：肩（体の内がわ）から てらまるの頭へ。上腕・前腕の長さは変えず、ひじを下へ少し曲げる
    const squish = Math.sin(t * 9) > 0.3 ? 1 : 0; // なでられて頭が1ドット下がる
    const headY = catTop + 4 + squish; // 頭のてっぺん（耳のあいだ）
    const hx = Math.round(catX + arm.tx + Math.sin(t * 6) * 3);
    const hy = headY + arm.ty;
    const sx = px + person.shoulder.x;
    const sy = py + person.shoulder.y;
    const wx = hx + 5;
    const wy = hy + 1;
    const L = Math.hypot(catX + arm.tx + 5 - sx, headY + arm.ty + 1 - sy) * arm.k;
    const d = Math.min(Math.hypot(wx - sx, wy - sy), L * 2 - 0.01);
    const base = Math.atan2(wy - sy, wx - sx);
    const bend = Math.acos(Math.min(1, d / (2 * L)));
    const e1 = { x: sx + Math.cos(base + bend) * L, y: sy + Math.sin(base + bend) * L };
    const e2 = { x: sx + Math.cos(base - bend) * L, y: sy + Math.sin(base - bend) * L };
    const el = e1.y > e2.y ? e1 : e2;
    const seg = (x0, y0, x1, y1, r) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n);
        const y = Math.round(y0 + ((y1 - y0) * i) / n);
        o.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
      }
    };
    for (const [r, col] of [[person.armR + 1, UI.ink], [person.armR, look.top ?? '#3c4a6a']]) {
      o.fillStyle = col;
      seg(sx, sy, el.x, el.y, r);
      seg(el.x, el.y, wx, wy, r);
    }

    // 人（家族は子どもも、右どなりに）
    o.drawImage(person, px, py);
    if (this.target.def.kid) {
      const kid = SPR.kidsBig[this.target.id];
      o.drawImage(kid, px + person.width - 18, ground - kid.height);
    }

    // てらまる
    const neck = 16;
    const cx = Math.round(catX - cat.width / 2);
    o.drawImage(cat, 0, neck, cat.width, cat.height - neck, cx, catTop + neck, cat.width, cat.height - neck);
    o.drawImage(cat, 0, 0, cat.width, neck, cx, catTop + squish, cat.width, neck);

    // 手（頭の上）・気持ちよさそうなほっぺ
    drawRows(o, HAND_BIG, hx - 5, hy - 3, { o: UI.ink, s: look.skin ?? '#f2c9a0' });
    if (Math.floor(t * 3) % 2 === 0) {
      o.fillStyle = UI.pink;
      o.fillRect(cx + 5, catTop + 11 + squish, 2, 1);
      o.fillRect(cx + cat.width - 7, catTop + 11 + squish, 2, 1);
    }
    ctx.drawImage(off, b.x, b.y, PW, PH);
  }

  // なでなで・おもちゃ：右に人（大きく）、左にてらまる（大きく）
  drawPair(ctx, b) {
    const S = 3;
    const t = this.pt;
    // なでなでは、しゃがんだ絵（のばす腕は別に描く）。動物はそのままの絵を、てらまるの方へ向けて
    const animal = this.target.def.kind !== 'human';
    const frames = SPR.people[this.target.id];
    // 人は細かいドットの大きい絵（3倍の大きさで描いてあるので、そのまま 1倍で出す）
    const petBack = this.kind === 'nade' && !animal;
    // 人のなでなで（アップ）は大きいうしろ姿
    const person = animal ? frames[this.kind === 'nade' && Math.floor(t * 3) % 2 ? 1 : 0] : petBack ? SPR.peopleBig[this.target.id] : SPR.peopleHD[this.target.id][this.kind === 'nade' ? 1 : 0];
    const pS = person.hd ? 1 : S;
    // なでなで（人）：てらまるがまん中で、こっちを向いておすわり。人はそのとなりに うしろ姿ですわる。
    // 立ってなでる人（腰の悪いおばあちゃん）のときは、てらまるはブロック塀の上
    const onWall = petBack && person.standing;
    const wallH = onWall ? WALL_HIGH : 0;
    const catX = petBack ? b.x + 108 : b.x + 70;
    if (onWall) drawWall(ctx, catX - 18, b.y + PH - 6 - wallH, 36, wallH);
    const arm = this.armStyle ?? ARM_STYLE;
    const px = petBack ? catX + arm.gap : b.x + (this.kind === 'nade' ? 92 : animal ? 140 : 150);
    const py = b.y + PH - 6 - person.height * pS;
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(px + 4, b.y + PH - 8, person.width * pS - 8, 4);
    if (this.target.def.faces === 'right') {
      // 右向きの絵は、左（てらまるの方）へ向け直す
      ctx.save();
      ctx.translate(px + person.width * pS, py);
      ctx.scale(-1, 1);
      ctx.drawImage(person, 0, 0, person.width * pS, person.height * pS);
      ctx.restore();
    } else {
      ctx.drawImage(person, px, py, person.width * pS, person.height * pS);
    }
    // 家族：子どもも親のとなりに（なでなでは一緒にしゃがむ）
    if (this.target.def.kid) {
      const kid = petBack ? SPR.kidsBig[this.target.id] : SPR.kidsHD[this.target.id][this.kind === 'nade' ? 1 : 0];
      const kx = px + person.width * pS - (petBack ? 16 : 10);
      const kbob = Math.floor(t * 4) % 2; // うれしくて ぴょこぴょこ
      ctx.fillStyle = 'rgba(40,30,20,0.25)';
      ctx.fillRect(kx + 6, b.y + PH - 8, kid.width - 12, 4);
      ctx.drawImage(kid, kx, b.y + PH - 6 - kid.height - kbob, kid.width, kid.height);
    }

    // てらまる
    let img = SPR.catHD.right;
    let cy = 0;
    let squish = 0;
    if (this.kind === 'nade') {
      img = SPR.catHD.down; // こっちを向いて おすわり
      squish = Math.sin(t * 9) > 0.3 ? 1 : 0; // なでられて頭が下がる
    }
    if (this.kind === 'toy' && this.punch > 0) cy = -14;
    const cw = img.width;
    const ch = img.height;
    const cx = catX - cw / 2;
    // なでなで（人）は、てらまるがブロック塀の上におすわり（人の手がとどく高さ）
    const lift = wallH;
    const cyy = b.y + PH - 6 - ch + cy - lift;
    if (!lift) {
      ctx.fillStyle = 'rgba(40,30,20,0.25)';
      ctx.fillRect(catX - 18, b.y + PH - 8, 36, 4);
    }
    if (squish) {
      // なでられて頭が1ドット下がる（絵はのばしたりちぢめたりしない）
      const neck = 16;
      ctx.drawImage(img, 0, neck, img.width, img.height - neck, Math.round(cx), Math.round(cyy) + neck, img.width, img.height - neck);
      ctx.drawImage(img, 0, 0, img.width, neck, Math.round(cx), Math.round(cyy) + 1, img.width, neck);
    } else ctx.drawImage(img, Math.round(cx), Math.round(cyy));

    // 腕と手は てらまるの上に（うしろから見て、肩から頭へ手をのばす）
    let hx = 0;
    let hy = 0;
    if (this.kind === 'nade' && !animal) {
      // 腕は「上腕＋ひじ＋前腕」。長さは変えず、ひじを曲げのばしして手を頭の上で前後させる（ゴムのようにのびない）
      const look = this.target.def.look ?? {};
      const sx = px + (person.shoulder?.x ?? 8);
      const sy = py + (person.shoulder?.y ?? (person.shoulderY + 1) * pS);
      const headX = catX; // 頭のまん中
      const headY = Math.round(cyy) + 4; // 頭のてっぺん（耳のあいだ）
      hx = Math.round(headX + arm.tx + Math.sin(t * 6) * 3);
      hy = headY + arm.ty + squish;
      // 手首（手の右はし）をめざす
      const wx = hx + 3;
      const wy = hy;
      let el;
      if (person.big) {
        // 大きい人：上腕は体の絵にふくまれている（体の横にたらす）。ひじから前腕だけを頭へのばす
        el = { x: px + person.elbow.x, y: py + person.elbow.y };
      } else {
        const L = Math.hypot(headX + arm.tx + 3 - sx, headY + arm.ty - sy) * arm.k; // 上腕・前腕の長さ（いつも同じ）
        const dx = wx - sx;
        const dy = wy - sy;
        const d = Math.min(Math.hypot(dx, dy), L * 2 - 0.01);
        const base = Math.atan2(dy, dx);
        const bend = Math.acos(Math.min(1, d / (2 * L)));
        // ひじの向き（arm.elbow）：up＝上へ張る、down＝下にたたむ
        const e1 = { x: sx + Math.cos(base + bend) * L, y: sy + Math.sin(base + bend) * L };
        const e2 = { x: sx + Math.cos(base - bend) * L, y: sy + Math.sin(base - bend) * L };
        el = (arm.elbow === 'up') === (e1.y < e2.y) ? e1 : e2;
      }
      const seg = (x0, y0, x1, y1, r) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) {
          const x = Math.round(x0 + ((x1 - x0) * i) / n);
          const y = Math.round(y0 + ((y1 - y0) * i) / n);
          ctx.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
        }
      };
      // ふち → 服の色（ドットの格子にそって。ぼかしなし）
      const thick = person.big ? 1 : 0; // 大きい人は腕も太く
      for (const [r, col] of [[2 + thick, UI.ink], [1 + thick, look.top ?? '#3c4a6a']]) {
        ctx.fillStyle = col;
        if (!person.big) seg(sx, sy, el.x, el.y, r);
        seg(el.x, el.y, wx, wy, r);
      }
    }
    if (this.kind === 'nade' && !animal) {
      // 手（ドット絵）
      drawRows(ctx, HAND, hx - 4, hy - 2, { o: UI.ink, s: this.target.def.look?.skin ?? '#f2c9a0' });
      // 気持ちよさそう
      if (Math.floor(t * 3) % 2 === 0) {
        ctx.fillStyle = UI.pink;
        ctx.fillRect(Math.round(cx) + 5, Math.round(cyy) + 11, 2, 1);
        ctx.fillRect(Math.round(cx) + cw - 7, Math.round(cyy) + 11, 2, 1);
      }
    }
    if (this.kind === 'toy') {
      // 猫じゃらし：手から先が揺れる
      // 動物は口にくわえる
      const hx = animal ? px + 6 : px + (person.hand?.x ?? 6);
      const hy = animal ? py + 16 : py + (person.hand?.y ?? 40);
      const tipX = Math.round(b.x + 100 + Math.sin(t * 5) * 16);
      const tipY = Math.round(b.y + 52 + Math.cos(t * 7) * 12);
      // ひも：ドットの格子にそって描く（ぼかしなし）
      ctx.fillStyle = '#6a4a2a';
      const qx = (hx + tipX) / 2;
      const qy = Math.min(hy, tipY) - 16;
      for (let i = 0; i <= 240; i++) {
        const u = i / 240;
        const x = (1 - u) * (1 - u) * hx + 2 * (1 - u) * u * qx + u * u * tipX;
        const y = (1 - u) * (1 - u) * hy + 2 * (1 - u) * u * qy + u * u * tipY;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      // ふさふさの先
      ctx.fillStyle = '#a07820';
      ctx.fillRect(tipX - 7, tipY - 4, 14, 9);
      ctx.fillRect(tipX - 5, tipY - 6, 10, 13);
      ctx.fillStyle = '#f0d060';
      ctx.fillRect(tipX - 6, tipY - 3, 12, 7);
      ctx.fillRect(tipX - 4, tipY - 5, 8, 11);
      ctx.fillStyle = '#fff4b0';
      ctx.fillRect(tipX - 3, tipY - 3, 3, 3);
      // パンチの手
      if (this.punch > 0) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(tipX - 12, tipY + 2, 9, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tipX - 11, tipY + 3, 7, 5);
        ctx.fillStyle = UI.pink;
        ctx.fillRect(tipX - 9, tipY + 5, 3, 2);
      }
    }
  }

  drawChase(ctx, b) {
    const S = 2;
    const r = this.run;
    const person = SPR.people[this.target.id][Math.floor(r.t * 8) % 2];
    const c = this.cat;
    const things = [
      { y: r.y, draw: () => {
        const w = person.width * S;
        const h = person.height * S;
        const x = Math.round(b.x + r.x - w / 2);
        const y = Math.round(b.y + r.y - h);
        ctx.fillStyle = 'rgba(40,30,20,0.25)';
        ctx.fillRect(x + 4, Math.round(b.y + r.y - 2), w - 8, 3);
        if (r.flip) {
          ctx.save();
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(person, 0, 0, w, h);
          ctx.restore();
        } else ctx.drawImage(person, x, y, w, h);
      } },
      { y: c.y, draw: () => {
        const fr = SPR.cat[c.dir];
        const img = c.moving ? fr[1 + (Math.floor(c.t * 8) % 2)] : fr[0];
        const w = img.width * S;
        const h = img.height * S;
        ctx.fillStyle = 'rgba(40,30,20,0.25)';
        ctx.fillRect(Math.round(b.x + c.x - 10), Math.round(b.y + c.y - 2), 20, 3);
        ctx.drawImage(img, Math.round(b.x + c.x - w / 2), Math.round(b.y + c.y - h), w, h);
      } },
    ];
    things.sort((p, q) => p.y - q.y);
    for (const t of things) t.draw();
  }

  drawGuide(ctx, b) {
    let msg = '';
    if (this.kind === 'toy') msg = input.lastDevice === 'keyboard' ? tr('kamatte.toyKey') : tr('kamatte.toyTouch');
    if (this.kind === 'chase') msg = tr('kamatte.chaseHint');
    if (msg) drawText(ctx, msg, screen.W / 2, b.y + 22, { font: 'small', color: UI.ink, outline: UI.white, align: 'center' });
    // のこり時間のバー
    const left = Math.max(0, 1 - this.pt / this.cfg.dur);
    ctx.fillStyle = 'rgba(58,42,32,0.35)';
    ctx.fillRect(b.x + 4, b.y + PH - 4, PW - 8, 2);
    ctx.fillStyle = UI.pink;
    ctx.fillRect(b.x + 4, b.y + PH - 4, Math.round((PW - 8) * left), 2);
  }

  drawScore(ctx, b) {
    // 上の段に「+点数」と「じかん +n びょう」を横にならべる（キャラの頭より上）
    const W = screen.W;
    const pop = Math.round(Math.max(0, 1 - this.pt * 6) * 4);
    const s = `+${this.total}`;
    const pw = digitsWidth(s, 2) + 12;
    const tx = tr('kamatte.time', { n: this.cfg.time });
    const tw = textWidth(tx, 'small');
    const x0 = Math.round(W / 2 - (pw + 6 + tw) / 2);
    panel(ctx, x0, b.y + 4 - pop, pw, 22, UI.cream);
    drawDigits(ctx, s, x0 + pw / 2, b.y + 8 - pop, { color: UI.orangeD, align: 'center', scale: 2 });
    drawText(ctx, tx, x0 + pw + 6, b.y + 11, { font: 'small', color: '#2a70c0', outline: UI.white });
  }

}
