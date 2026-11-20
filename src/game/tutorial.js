// チュートリアル（0-1 てらまるのいえ）の流れ
//
// 1. walk    … 歩いてみる（上に「あそびかた」の操作説明。ウィルニャはまだ出ない）
// 2. ring    … 飼い主2人をてらまりんぐでメロメロに（まだの人の上に▼）
// 3. mission … みごとなてらまりんぐを見た ウィルニャ（ねこたちの意志。姿のないキラキラ）が、てらまるを見そめて使命を伝える。「猫は家で飼おうね」
// 4. vet     … 神の世界のようなレベチな場所で「ウルトラハイパーむてきゴッドワクチン」（チクッ）
// 5. after   … 「さあ、まちへ」→ 暗くなってステージ選択へ（結果発表はなし）
//
// セリフは src/i18n/<言語>.js の tutorial に書く。てらまるはしゃべらない。

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { panel } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { save } from '../core/save.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { newlyOpened } from '../data/areas.js';
import { tr } from '../i18n/index.js';
import { VOICE, drawVoiceBox, drawPresence, drawSpark, sparkSize, shownChars, totalChars } from './voice.js';

// セリフは i18n の tutorial.mission / tutorial.after（1ページ＝1〜3行）。{name}{fullName}{vaccine} を入れかえる
const PAGES = (key) => tr(`tutorial.${key}`, { name: VOICE.name, fullName: VOICE.fullName, vaccine: tr('tutorial.vaccine') });

// 予防接種の時間割（秒）
const VET = { fadeIn: 0.6, armIn: 1.0, poke: 1.7, armOut: 2.6, happy: 3.0, end: 3.8 };

export class Tutorial {
  constructor(play) {
    this.play = play;
    this.step = 'walk';
    this.t = 0; // いまの段階に入ってからの秒
    this.now = 0;
    this.moved = 0;
    this.charmed = 0;
    this.last = { x: play.cat.x, y: play.cat.y };
    this.dialog = null; // { pages, i, t, done }
    this.fade = 0;
  }

  get owners() { return this.play.spawner.targets.filter((t) => t.def.fixed && t.def.kind === 'human'); }

  go(step) { this.step = step; this.t = 0; }

  say(pages, done) {
    this.dialog = { pages, i: 0, t: 0, done, typed: 0 };
  }

  // true を返したら、プレイ画面の更新はここで止める（セリフ・病院の間）
  update(dt) {
    this.t += dt;
    this.now += dt;
    const P = this.play;
    if (this.step === 'walk') {
      this.moved += Math.hypot(P.cat.x - this.last.x, P.cat.y - this.last.y);
      this.last = { x: P.cat.x, y: P.cat.y };
      if (this.moved > 48 && this.t > 1) this.go('ring');
      return false;
    }
    if (this.step === 'ring') return false;
    if (this.step === 'wait') {
      // 2人目のメロメロを少し見せてから、キラキラがあらわれる
      if (this.t > 1.4) {
        this.go('mission');
        audio.sfx('sparkle');
        P.cat.stop();
        this.say(PAGES('mission'), () => { this.go('toVet'); });
      }
      return false;
    }
    if (this.step === 'toVet') {
      if (this.t >= 0.6) this.go('vet');
      return true;
    }
    if (this.step === 'vet') {
      const t = this.t;
      if (t - dt < VET.poke && t >= VET.poke) { audio.sfx('poke'); audio.buzz(40); }
      if (t - dt < VET.happy && t >= VET.happy) audio.sfx('yes');
      this.updateVetHearts(dt, t >= VET.happy);
      if (t >= VET.end && !this.dialog && !this.afterSaid) {
        this.afterSaid = true;
        this.say(PAGES('after'), () => { this.go('out'); });
      }
      this.updateDialog(dt);
      return true;
    }
    if (this.step === 'out') {
      if (this.t >= 1.0) this.finish();
      return true;
    }
    // mission
    this.updateDialog(dt);
    return true;
  }

  // 注射のあとのハート：ばらばらの場所・速さ・大きさで、ふわふわ上がる
  updateVetHearts(dt, spawn) {
    this.vetHearts ??= [];
    if (spawn && Math.random() < dt * (3 + Math.random() * 6)) {
      const big = Math.random() < 0.3;
      this.vetHearts.push({
        x: screen.W / 2 + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 34) - 4, // てらまるの左右（体の上は通らない）
        y: 70 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 12,
        vy: -(10 + Math.random() * 28),
        wob: 1 + Math.random() * 4, // 左右のゆれ
        ph: Math.random() * 6,
        life: 0.8 + Math.random() * 1.4,
        age: 0,
        big,
      });
    }
    for (const h of this.vetHearts) { h.age += dt; h.x += h.vx * dt; h.y += h.vy * dt; }
    this.vetHearts = this.vetHearts.filter((h) => h.age < h.life);
  }

  updateDialog(dt) {
    const d = this.dialog;
    if (!d) return;
    d.t += dt;
    const lines = d.pages[d.i];
    const n = Math.min(shownChars(d.t), totalChars(lines));
    if (n > d.typed) { d.typed = n; audio.sfx('voice'); }
    const pressed = input.hit(KEY.confirm) || input.fresh().length > 0;
    for (const p of input.fresh()) p.role = 'none';
    if (!pressed) return;
    if (n < totalChars(lines)) { d.t = 99; d.typed = totalChars(lines); return; } // 文字を全部出す
    audio.sfx('ui');
    d.i++;
    d.t = 0;
    d.typed = 0;
    if (d.i >= d.pages.length) {
      this.dialog = null;
      input.releaseAll();
      d.done?.();
    }
  }

  // てらまりんぐが終わったとき（飼い主ならメロメロのまま残る）
  onRingingEnd(target, won) {
    if (!won || !target.def.fixed || target.charmed) return;
    target.charmed = true;
    this.charmed++;
    if (this.charmed >= this.owners.length) this.go('wait');
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const game = this.play.game;
    const sv = game.save;
    const id = this.play.stageId;
    if (!sv.cleared.includes(id)) sv.cleared.push(id);
    for (const st of newlyOpened(id, 0, sv)) sv.unlocked.push(st.id);
    save(sv);
    game.toStageSelect();
  }

  // ---- 描画（プレイ画面の上に重ねる） ----

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    const P = this.play;
    if (this.step === 'walk' || this.step === 'ring') {
      if (P.banner > 0.6) return;
      if (this.step === 'ring') this.drawOwnerMarks(ctx);
      this.drawHint(ctx); // 操作説明は▼より手前
      return;
    }
    if (this.step === 'mission' || this.step === 'toVet') {
      ctx.fillStyle = 'rgba(20,12,30,0.4)';
      ctx.fillRect(0, 0, W, H);
      const cs = P.worldToScreen(P.cat.x, P.cat.y);
      const a = Math.min(1, this.t * 1.5);
      drawPresence(ctx, cs.x, cs.y - 46, this.now, this.step === 'mission' ? a : 1);
      this.drawDialog(ctx);
      if (this.step === 'toVet') {
        ctx.fillStyle = `rgba(255,250,240,${Math.min(1, this.t / 0.6)})`;
        ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    if (this.step === 'vet' || this.step === 'out') {
      this.drawVet(ctx);
      this.drawDialog(ctx);
      if (this.step === 'out') {
        ctx.fillStyle = `rgba(20,12,8,${Math.min(1, this.t / 0.9)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  // 上の操作説明（ウィルニャではなく、ふつうの「あそびかた」の枠。ウィルニャはまだ出てこない）
  // てらまりんぐのやり方は、ズームインしたあと（ringing.js が howToRing を出す）
  drawHint(ctx) {
    const touch = input.lastDevice !== 'keyboard';
    let lines;
    if (this.step === 'walk') lines = [tr(touch ? 'tutorial.walkTouch' : 'tutorial.walkKey')];
    else if (this.charmed === 0) lines = [tr('tutorial.ring1')];
    else lines = tr('tutorial.ring2');
    drawHowTo(ctx, lines, 12);
  }

  // まだメロメロにしていない飼い主の上に、ピンクの▼
  drawOwnerMarks(ctx) {
    const P = this.play;
    const bob = Math.round(Math.abs(Math.sin(this.now * 5)) * -3);
    for (const o of this.owners) {
      if (o.charmed) continue;
      const s = P.worldToScreen(o.x, o.y);
      const x = Math.round(s.x);
      const y = Math.round(s.y) - 40 + bob;
      ctx.fillStyle = UI.white;
      ctx.fillRect(x - 4, y - 1, 9, 5);
      ctx.fillRect(x - 2, y + 4, 5, 3);
      ctx.fillStyle = UI.pink;
      ctx.fillRect(x - 3, y, 7, 3);
      ctx.fillRect(x - 1, y + 3, 3, 2);
      ctx.fillRect(x, y + 5, 1, 1);
    }
  }

  // セリフの枠（下）
  drawDialog(ctx) {
    const d = this.dialog;
    if (!d) return;
    const W = screen.W;
    const H = screen.H;
    const lines = d.pages[d.i];
    const w = Math.min(W - 76, 300); // 右下の「けってい」ボタンにかからないように
    const h = 3 * 10 + 8;
    drawVoiceBox(ctx, lines, { x: 8, y: H - h - 8, w, t: d.t, now: this.now, align: 'left', more: true });
  }

  // 予防接種の場面（神の世界のようなレベチな場所）：
  // 金の柱と虹、上から光、雲の上の金の診察台。虹色のワクチンの注射だけが浮いてきて打つ。打ったら光があふれて「えらい！」
  drawVet(ctx) {
    const W = screen.W;
    const H = screen.H;
    const t = this.step === 'out' ? VET.end + 1 : this.t;
    const now = this.now;
    const cx = Math.round(W / 2);
    const top = 112; // 診察台の上

    // 空（金色から、うす紫へ）
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#fff2c8');
    sky.addColorStop(0.55, '#fde4f0');
    sky.addColorStop(1, '#e4d8ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // 上からの光（ゆっくり回る）
    ctx.save();
    ctx.translate(cx, -10);
    for (let i = 0; i < 12; i++) {
      const a = now * 0.15 + (i / 12) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(255,236,150,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.09) * 400, Math.sin(a - 0.09) * 400);
      ctx.lineTo(Math.cos(a + 0.09) * 400, Math.sin(a + 0.09) * 400);
      ctx.fill();
    }
    ctx.restore();
    // 虹
    const rainbow = ['#ff8aa8', '#ffb870', '#ffe070', '#9ae08a', '#8ac8ff', '#b89aff'];
    rainbow.forEach((col, i) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, top + 30, 118 - i * 3, Math.PI, 0);
      ctx.stroke();
    });
    // 金の柱（左右に2本ずつ）
    for (const px of [24, 58, W - 58, W - 24]) drawPillar(ctx, px, 30, top + 22);
    // 浮かぶハートとキラキラ（背景）
    for (let i = 0; i < 6; i++) {
      const fx = (i * 67 + 30) % W;
      const fy = 40 + ((i * 37) % 50) + Math.sin(now * 1.3 + i) * 4;
      if (i % 2) drawSpark(ctx, fx, fy, sparkSize(now * 0.7 + i * 0.3));
      else { ctx.globalAlpha = 0.6; ctx.drawImage(SPR.heart, Math.round(fx), Math.round(fy)); ctx.globalAlpha = 1; }
    }
    // 雲の床
    drawClouds(ctx, W, top + 20, now);
    // 看板（金のわく、肉球の十字）
    const sign = tr('tutorial.vaccine'); // 看板にワクチンの名前
    const sw = textWidth(sign, 'small') + 26;
    const sx = Math.round(cx - sw / 2);
    panel(ctx, sx - 1, 5, sw + 2, 17, '#c89018', '#8a5a10');
    panel(ctx, sx + 1, 7, sw - 2, 13, '#fffaf0', '#f0c040');
    ctx.fillStyle = '#e04868';
    ctx.fillRect(sx + 6, 13, 7, 1);
    ctx.fillRect(sx + 9, 10, 1, 7);
    drawText(ctx, sign, sx + 17, 10, { font: 'small', color: '#8a5a10' });
    drawSpark(ctx, sx - 2, 6, sparkSize(now));
    drawSpark(ctx, sx + sw + 1, 20, sparkSize(now + 0.5));

    // 雲の上の、金の診察台（ふわふわ浮く）
    const fl = Math.round(Math.sin(now * 2) * 1.5);
    ctx.fillStyle = 'rgba(255,240,170,0.5)';
    ctx.fillRect(cx - 50, top + 9 + fl, 100, 3);
    ctx.fillStyle = '#8a5a10';
    ctx.fillRect(cx - 46, top + fl, 92, 9);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(cx - 45, top + 1 + fl, 90, 3);
    ctx.fillStyle = '#ffe890';
    ctx.fillRect(cx - 45, top + 1 + fl, 90, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 44, top + 5 + fl, 88, 3); // 白いシーツ
    for (let i = 0; i < 5; i++) drawSpark(ctx, cx - 40 + i * 20, top + 6 + fl, i === Math.floor(now * 4) % 5 ? 2 : 0);

    // 注射のあとのハート（てらまるより奥に描く。てらまるの前にはかぶせない）
    for (const hh of this.vetHearts ?? []) {
      const hk = hh.age / hh.life;
      ctx.globalAlpha = Math.min(1, (1 - hk) * 2);
      const hs = hh.big ? 2 : 1;
      const hx = Math.round(hh.x + Math.sin(hh.ph + hh.age * 5) * hh.wob);
      ctx.drawImage(SPR.heart, hx, Math.round(hh.y), SPR.heart.width * hs, SPR.heart.height * hs);
    }
    ctx.globalAlpha = 1;

    // てらまる
    const k = 3;
    const img = SPR.cat.down[0];
    const w = img.width * k;
    const h = img.height * k;
    let x = cx - w / 2;
    let y = top + fl + 1 - h;
    const shaking = t >= VET.poke && t < VET.poke + 0.7;
    if (shaking) x += Math.floor(t * 30) % 2 ? 2 : -2;
    if (t >= VET.happy) y -= Math.abs(Math.round(Math.sin((t - VET.happy) * 7) * 4)); // ぴょんぴょん
    if (t >= VET.poke + 0.3) {
      // ワクチンが効いて、体のまわりが光る
      ctx.fillStyle = `rgba(255,240,160,${0.35 + Math.sin(now * 6) * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(cx, y + h / 2, w / 2 + 8, h / 2 + 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
    if (shaking) {
      ctx.fillStyle = UI.red;
      for (const [dx, dy] of [[-28, 6], [-22, -4], [22, -4], [28, 6]]) ctx.fillRect(cx + dx, y + dy + 10, 2, 5);
    }

    // 雲から、光る金の手（虹色のワクチン）
    let armK = 0;
    if (t >= VET.armIn - 0.6 && t < VET.armIn) armK = (t - (VET.armIn - 0.6)) / 0.6;
    else if (t >= VET.armIn && t < VET.armOut) armK = 1;
    else if (t >= VET.armOut && t < VET.armOut + 0.5) armK = 1 - (t - VET.armOut) / 0.5;
    if (armK > 0) {
      const push = t >= VET.poke - 0.2 && t < VET.poke + 0.3 ? 4 : 0;
      const tipX = Math.round(W + 10 - (W / 2 - 4) * armK) - push; // 針の先
      const ay = top - 22;
      // 注射だけが ふわふわ浮いてくる（まわりがぼんやり光る）
      const bob = Math.round(Math.sin(now * 4) * 1.5);
      const ayb = ay + bob;
      ctx.fillStyle = 'rgba(255,240,170,0.5)';
      ctx.fillRect(tipX + 8, ayb - 6, 34, 15);
      // ワクチン（金のつつに虹色の中身）
      ctx.fillStyle = '#8a5a10';
      ctx.fillRect(tipX + 12, ayb - 2, 22, 7);
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(tipX + 13, ayb - 1, 20, 5);
      const fill = t >= VET.poke ? 6 : 18;
      for (let i = 0; i < fill; i++) {
        ctx.fillStyle = rainbow[(i + Math.floor(now * 10)) % rainbow.length];
        ctx.fillRect(tipX + 14 + i, ayb, 1, 3);
      }
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(tipX + 34, ayb - 4, 2, 11);
      ctx.fillStyle = '#d8dce0';
      ctx.fillRect(tipX, ayb + 1, 12, 1); // 針
      drawSpark(ctx, tipX, ayb + 1, sparkSize(now * 2));
    }
    // 打った瞬間：光の輪が広がって、画面が白く光る
    if (t >= VET.poke && t < VET.poke + 0.8) {
      const k2 = (t - VET.poke) / 0.8;
      ctx.strokeStyle = `rgba(255,220,100,${1 - k2})`;
      ctx.lineWidth = 3;
      for (const r of [k2 * 90, k2 * 60]) {
        ctx.beginPath();
        ctx.arc(cx, top - 24, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (k2 < 0.25) {
        ctx.fillStyle = `rgba(255,255,255,${0.7 - k2 * 2.8})`;
        ctx.fillRect(0, 0, W, H);
      }
      const pop = t < VET.poke + 0.1 ? -3 : 0;
      drawText(ctx, tr('tutorial.poke'), cx + 34, top - 70 + pop, { scale: 2, color: UI.red, outline: UI.white, align: 'center' });
    }
    if (t >= VET.poke + 0.8 && t < VET.happy) {
      drawText(ctx, tr('tutorial.shiver'), cx, top - h - 14, { font: 'small', color: '#4a5a7a', align: 'center' });
    }
    if (t >= VET.happy) {
      // 虹色の「むてき！」とハート・キラキラ
      const chars = [...tr('tutorial.mighty')];
      const total = chars.reduce((n, ch) => n + textWidth(ch, 'small') * 2 + 1, 0);
      let wx = Math.min(cx + 44, W - total - 4); // 長い言語でも画面からはみ出さない
      chars.forEach((ch, i) => {
        const bob = Math.round(Math.sin(now * 8 + i) * 2);
        drawText(ctx, ch, wx, top - 66 + bob, { font: 'small', scale: 2, color: rainbow[(i + Math.floor(now * 6)) % rainbow.length], outline: UI.white });
        wx += textWidth(ch, 'small') * 2 + 1;
      });
      [[-48, -50], [-60, -20], [-36, -76], [46, -20], [62, -44]].forEach(([dx, dy], i) => drawSpark(ctx, cx + dx, top + dy, sparkSize(now + i * 0.2)));
    }
  }
}

// 金の柱（x：まん中、y0：上、y1：下）
function drawPillar(ctx, x, y0, y1) {
  ctx.fillStyle = '#8a5a10';
  ctx.fillRect(x - 9, y0 - 2, 18, 6); // 柱頭
  ctx.fillRect(x - 9, y1 - 4, 18, 6); // 台
  ctx.fillRect(x - 6, y0 + 4, 12, y1 - y0 - 8);
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(x - 8, y0 - 1, 16, 4);
  ctx.fillRect(x - 8, y1 - 3, 16, 4);
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(x - 5, y0 + 4, 10, y1 - y0 - 8);
  ctx.fillStyle = '#e8d090'; // みぞ
  for (const dx of [-3, 0, 3]) ctx.fillRect(x + dx, y0 + 5, 1, y1 - y0 - 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y0 + 4, 1, y1 - y0 - 8);
}

// 雲の床（ゆっくり流れる）
function drawClouds(ctx, W, y, now) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, y + 6, W, 200);
  for (let i = -1; i < W / 28 + 2; i++) {
    const x = ((i * 28 + now * 6) % (W + 56)) - 28;
    drawCloudPuff(ctx, x, y + 6 + (i % 2) * 3, 1);
  }
  ctx.fillStyle = '#efe8ff';
  for (let i = 0; i < W; i += 37) ctx.fillRect((i + Math.floor(now * 6)) % W, y + 30 + (i % 3) * 8, 14, 2);
}

function drawCloudPuff(ctx, x, y, s) {
  ctx.fillStyle = '#e8e0f8';
  ctx.beginPath();
  ctx.arc(x, y + 2, 12 * s, 0, Math.PI * 2);
  ctx.arc(x + 14 * s, y + 3, 9 * s, 0, Math.PI * 2);
  ctx.arc(x - 14 * s, y + 3, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 11 * s, 0, Math.PI * 2);
  ctx.arc(x + 13 * s, y + 2, 8 * s, 0, Math.PI * 2);
  ctx.arc(x - 13 * s, y + 2, 8 * s, 0, Math.PI * 2);
  ctx.fill();
}

// 「あそびかた」の枠（上のまん中）。y：枠の上
export function drawHowTo(ctx, lines, y) {
  const W = screen.W;
  const w = Math.min(W - 16, Math.max(...lines.map((l) => textWidth(l, 'small'))) + 16);
  const h = lines.length * 10 + 10;
  const x = Math.round(W / 2 - w / 2);
  panel(ctx, x, y, w, h, UI.cream);
  // 文字は「あそびかた」の札より下から
  lines.forEach((l, i) => drawText(ctx, l, W / 2, y + 7 + i * 10, { font: 'small', color: UI.ink, align: 'center' }));
  const tag = tr('tutorial.howto');
  const tw = textWidth(tag, 'small') + 8;
  panel(ctx, x + 6, y - 7, tw, 11, UI.orange);
  drawText(ctx, tag, x + 10, y - 5, { font: 'small', color: UI.white });
}
