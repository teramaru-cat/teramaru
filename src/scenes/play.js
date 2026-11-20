// プレイ画面（街を歩く・てらまりんぐ・お水・爪とぎ・トイレ・倒れて病院・ポーズ）

import { screen, snapPx } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Button, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { ITEMS } from '../data/targets.js';
import { getTown } from '../game/town.js';
import { Cat } from '../game/cat.js';
import { Spawner } from '../game/target.js';
import { claimMove, moveVector, drawSticks } from '../game/control.js';
import { Effects, PopText, Absorb, heartAbsorb } from '../game/effects.js';
import { liveScore } from '../game/score.js';
import { RingingScene } from './ringing.js';
import { KamatteScene } from './kamatte.js';
import { audio } from '../core/audio.js';
import { ResultScene } from './result.js';
import { PauseScene } from './pause.js';

export class PlayScene {
  constructor(game, stageId = 1) {
    this.game = game;
    this.stageId = stageId;
    this.town = getTown(stageId);
    const s = this.town.stage.start;
    this.cat = new Cat(s.x, s.y);
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
    this.banner = 2.6; // ステージ名の表示時間
    this.feverIntro = 0; // 「トイレフィーバー！」の表示時間
    this.bubble = 0; // 「にゃ」の吹き出し
    this.aim = null; // おねだりの照準中 { pointer | key | button, sel, t }
    this.leap = null; // おねだりで飛びついている途中
    this.timeBonus = 0; // 「+3びょう」を時計の下に出す残り秒
    this.timeBonusText = '';
    this.hintShown = false; // 「おねだりできるよ」を出したか
    this.t = 0;
    this.pauseBtn = new Button('pause', '', { icon: 'pause', pad: 6 });
    this.confirmBtn = new Button('confirm', 'けってい', { pad: 6 });
    // 1プレイ分の状態
    this.state = {
      timeLeft: BAL.playSeconds,
      tp: 0, // 今持っているTP（おねだりで使う）
      fp: 0, // おなか（ご飯ポイントでたまる。BAL.tummy.full でいっぱい）
      tpTotal: 0, // スコア用：もらった合計
      fpTotal: 0,
      kamaware: 0,
      faints: 0,
      thirst: 0, // 最後に水を飲んでからの秒数
      lastDrink: -99, // 最後にご飯ポイントをもらった水飲みの時刻（連打よけ）
      over: 0, // おなかがいっぱいになってから食べたご飯ポイント
      scratch: 0, // 爪とぎボーナスの残り秒
      lastScratch: -99, // 最後に爪とぎした時刻
      toilet: 0, // トイレのあとのダッシュの残り秒
    };
    this.action = null; // { kind: 'scratch' | 'toilet' | 'faint', t } 動けない動作中
    this.ending = 0; // 時間切れの「おしまい！」を見せている残り秒
    this.spawner = new Spawner(this.town, stageId);
    this.spawner.fill(this.cat);
    this.fx = new Effects(); // 街の中の演出（座標は街）
    this.flash = 0; // 白いフェード
    this.lastCam = { x: 0, y: 0 };
  }

  enter() { input.releaseAll(); audio.music('play'); this.feverMusic = false; }
  resume() { input.releaseAll(); }

  onHidden() { if (!this.ending) this.openPause(); }

  openPause() {
    this.game.scenes.push(new PauseScene(this.game, this));
  }

  layoutButtons() {
    const W = screen.W;
    this.pauseBtn.place(W - 24, 4, 20, 16);
    this.confirmBtn.place(W - 58, screen.H - 30, 52, 22);
  }

  // てらまるの画面上の位置
  catScreen() {
    return { x: this.cat.x - this.cam.x, y: this.cat.y - 8 - this.cam.y };
  }

  // ---- 状態 ----

  // おなかの段階：0 ふつう、1 ぽっちゃり、2 いっぱい（がまん中）
  tummyLevel() {
    const f = this.state.fp;
    return f >= BAL.tummy.full ? 2 : f >= BAL.tummy.chubby ? 1 : 0;
  }

  full() { return this.state.fp >= BAL.tummy.full; }

  // 食べすぎの重さ（0〜1）。いっぱいのあと食べるたびに増える
  gamanRate() { return this.full() ? Math.min(1, this.state.over / BAL.tummy.over) : 0; }

  speedMul() {
    const T = BAL.tummy;
    const lv = this.tummyLevel();
    let s = T.speed[lv];
    if (lv === 2) s += (T.gamanSpeed - s) * this.gamanRate();
    return s * (this.state.toilet > 0 ? BAL.toilet.speed : 1);
  }

  turnRate() {
    const T = BAL.tummy;
    const lv = this.tummyLevel();
    let r = T.turn[lv];
    if (lv === 2) r += (T.gamanTurn - r) * this.gamanRate();
    return r;
  }

  addTp(n) {
    audio.sfx('heart');
    this.state.tp += n;
    this.state.tpTotal += n;
    if (!this.hintShown && this.state.tp >= BAL.onedari.minTp) {
      this.hintShown = true;
      this.hintT = 3;
    }
  }

  addFp(n, quiet = false) {
    const st = this.state;
    const wasFull = this.full();
    // フィーバー中は、おなかには半分だけたまる（点数はそのまま）
    const fill = st.toilet > 0 ? n * BAL.toilet.feverTummy : n;
    if (wasFull) st.over += fill;
    st.fp = Math.min(BAL.tummy.full, st.fp + fill);
    st.fpTotal += n;
    if (!quiet) audio.sfx('eat');
    if (!wasFull && this.full()) {
      st.over = 0;
      audio.sfx('full');
      this.fx.add(new PopText(this.cat.x, this.cat.y - 34, 'もじもじ…', UI.pink, 1.4));
    }
  }

  // 残り時間・お水・ボーナスの時間を進める（てらまりんぐ中も RingingScene から呼ばれる）
  // thirst=false：お水の時間は進めない（てらまりんぐ中）
  tick(dt, thirst = true) {
    const st = this.state;
    const prevSec = Math.ceil(st.timeLeft);
    const prevThirst = st.thirst;
    st.timeLeft = Math.max(0, st.timeLeft - dt);
    if (thirst && this.action?.kind !== 'faint') st.thirst += dt;
    if (prevThirst < BAL.water.warn && st.thirst >= BAL.water.warn) audio.sfx('warn');
    if (Math.ceil(st.timeLeft) < prevSec && prevSec <= BAL.hurryAt && st.timeLeft > 0) audio.sfx('tick');
    if (st.scratch > 0) st.scratch = Math.max(0, st.scratch - dt);
    if (st.toilet > 0) st.toilet = Math.max(0, st.toilet - dt);
  }

  thirsty() { return this.state.thirst >= BAL.water.limit; }

  // ---- 更新 ----

  update(dt) {
    this.t += dt;
    this.layoutButtons();
    // トイレフィーバーの間は、てらまるの歌（頭から）
    const fever = this.state.toilet > 0;
    if (fever !== this.feverMusic) {
      this.feverMusic = fever;
      audio.music(fever ? 'song' : 'play', { restart: fever });
    }
    this.fx.update(dt);
    if (this.flash > 0) this.flash -= dt;

    // 時間切れ → 「おしまい！」を少し見せてからリザルトへ
    if (this.ending > 0) {
      this.ending -= dt;
      if (this.ending <= 0) this.game.scenes.replace(new ResultScene(this.game, this.stageId, this.state));
      return;
    }
    if (this.state.timeLeft <= 0) { this.startEnding(); return; }

    if (input.hit(KEY.pause)) { this.openPause(); return; }
    if (this.game.debug) this.debugKeys();

    if (this.timeBonus > 0) this.timeBonus -= dt;
    if (this.hintT > 0) this.hintT -= dt;
    // おねだり：照準中・飛びついている途中は、街も時間も止まる
    if (this.aim) { this.updateAim(dt); return; }
    if (this.leap) { this.updateLeap(dt); return; }

    for (const p of input.fresh()) {
      if (this.pauseBtn.contains(p.x, p.y)) {
        p.role = 'button:pause';
        this.openPause();
        return;
      }
      if (this.confirmBtn.contains(p.x, p.y)) {
        p.role = 'button:confirm';
        if (this.onConfirm({ button: p })) return;
      } else if (this.grabsCat(p) && this.canOnedari()) {
        p.role = 'aim';
        this.startAim({ pointer: p });
        return;
      } else {
        if (this.grabsCat(p) && !this.action) this.needTpHint();
        claimMove(p);
      }
    }
    if (input.hit(KEY.confirm) && this.onConfirm({ key: true })) return;

    this.tick(dt);
    if (this.banner > 0) this.banner -= dt;
    if (this.bubble > 0) this.bubble -= dt;
    if (this.feverIntro > 0) this.feverIntro -= dt;

    // 動けない動作（爪とぎ・トイレ・倒れる）
    if (this.action) {
      this.cat.stop();
      this.updateAction(dt);
      this.spawner.update(dt, this.cat);
      return;
    }
    if (this.thirsty()) { this.startFaint(); return; }

    this.cat.update(dt, moveVector(this.catScreen()), this.town, this.speedMul(), this.turnRate());
    this.followCamera(dt);
    this.spawner.update(dt, this.cat);
    if (this.state.toilet > 0 && Math.random() < dt * (this.cat.moving ? 40 : 16)) this.addDashSpark();

    this.checkWater();
    this.checkScratch();
    this.checkLitter();

    // ターゲットに触れたら、てらまりんぐへ（トイレのあとのダッシュ中は自動で成功）
    const t = this.spawner.touching(this.cat);
    if (t) {
      const mult = this.takeScratchBonus(t);
      if (this.state.toilet > 0) this.autoRing(t, mult);
      else this.game.scenes.push(new RingingScene(this.game, this, t, mult));
    }
  }

  debugKeys() {
    if (input.hit(['KeyT'])) this.state.timeLeft = Math.min(this.state.timeLeft, 5);
    if (input.hit(['KeyF'])) this.addFp(30);
    if (input.hit(['KeyH'])) this.state.thirst = BAL.water.limit - 3;
    if (input.hit(['KeyG'])) this.addFp(BAL.tummy.full);
    if (input.hit(['KeyK'])) this.addTp(30);
  }

  // 爪とぎボーナス：人に触れたら使う（TP2倍）
  takeScratchBonus(target) {
    if (this.state.scratch > 0 && target.def.kind === 'human') {
      this.state.scratch = 0;
      return BAL.scratch.mult;
    }
    return 1;
  }

  // 近くの小物（水飲み・爪とぎ）。当たり箱を pad だけ広げて重なるか
  findProp(types, pad) {
    const c = this.cat;
    for (const p of this.town.props) {
      if (!types.includes(p.type)) continue;
      const s = p.def.solid;
      if (s) {
        if (c.x > p.x - s.w / 2 - pad && c.x < p.x + s.w / 2 + pad && c.y > p.y - s.h - pad && c.y < p.y + pad + 4) return p;
      } else if (Math.hypot(c.x - p.x, c.y - p.y) < 12) {
        return p;
      }
    }
    return null;
  }

  checkWater() {
    const p = this.findProp(['water', 'fountain'], 8);
    if (!p) return;
    const st = this.state;
    if (st.thirst < 0.5) return; // 飲んだばかり
    const award = this.t - st.lastDrink >= BAL.water.refill;
    st.thirst = 0;
    this.fx.add(new PopText(this.cat.x, this.cat.y - 26, 'ごくごく', '#2a70c0'));
    audio.sfx('drink');
    if (award) {
      st.lastDrink = this.t;
      this.addFp(BAL.water.fp, true);
      this.fx.add(new PopText(this.cat.x + 10, this.cat.y - 18, `+${BAL.water.fp}`, UI.orangeD, 0.8));
    }
  }

  // 決定：TPが足りていればおねだりの照準（押している間）。足りなければ「にゃ」
  onConfirm(src) {
    if (this.action) return false;
    if (this.canOnedari()) { this.startAim(src); return true; }
    this.bubble = 1.0;
    this.needTpHint();
    return false;
  }

  // ---- おねだり ----

  canOnedari() { return !this.action && this.state.tp >= BAL.onedari.minTp; }

  grabsCat(p) {
    const cs = this.catScreen();
    return Math.hypot(p.x - cs.x, p.y - (cs.y - 2)) < BAL.onedari.grab;
  }

  needTpHint() {
    const need = BAL.onedari.minTp - this.state.tp;
    if (need <= 0) return;
    if (this.fx.list.some((e) => e.hint)) return;
    const e = new PopText(this.cat.x, this.cat.y - 34, `おねだりは TP あと${need}`, UI.ink, 1.2);
    e.hint = true;
    this.fx.add(e);
  }

  // おねだりできる相手（人・動物で、近くにいて、去っていないもの）
  onedariList() {
    const R = BAL.onedari.radius;
    return this.spawner.targets.filter((t) => t.state === 'idle' && (t.def.kind === 'human' || t.def.kind === 'animal')
      && Math.hypot(t.x - this.cat.x, t.y - this.cat.y) <= R);
  }

  chance(t) {
    const o = t.def.onedari;
    return Math.min(1, o.base + this.state.tp * o.perTp);
  }

  startAim(src) {
    this.cat.stop();
    this.aim = { ...src, sel: null, t: 0 };
    if (!src.pointer) {
      // キーボード・ボタン：いちばん確率の高い相手（同じなら近い方）を最初に狙う
      const list = this.onedariList();
      list.sort((a, b) => this.chance(b) - this.chance(a) || this.distTo(a) - this.distTo(b));
      this.aim.sel = list[0] ?? null;
    }
  }

  distTo(t) { return Math.hypot(t.x - this.cat.x, t.y - this.cat.y); }

  updateAim(dt) {
    const a = this.aim;
    a.t += dt;
    const list = this.onedariList();
    for (const t of list) t.t += dt; // その場でぴこぴこ
    const cs = this.catScreen();

    if (a.pointer) {
      const p = a.pointer;
      const dx = p.x - cs.x;
      const dy = p.y - cs.y;
      // 指が相手の絵の上にあれば、その相手
      let sel = list.find((t) => {
        const s = this.worldToScreen(t.x, t.y);
        return p.x > s.x - 9 && p.x < s.x + 9 && p.y > s.y - 28 && p.y < s.y + 2;
      }) ?? null;
      if (!sel && Math.hypot(dx, dy) >= BAL.onedari.dead) {
        const ang = Math.atan2(dy, dx);
        let best = Infinity;
        for (const t of list) {
          const ta = Math.atan2(t.y - 12 - this.cat.y + 8, t.x - this.cat.x);
          let diff = Math.abs(ang - ta);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > BAL.onedari.cone) continue;
          const score = diff * 60 + this.distTo(t) * 0.2;
          if (score < best) { best = score; sel = t; }
        }
      }
      a.sel = sel;
      if (p.up) this.fireOnedari();
      return;
    }

    // キーボード・ボタン：方向キーで狙いを切り替える
    const dirs = [[KEY.left, -1, 0], [KEY.right, 1, 0], [KEY.up, 0, -1], [KEY.down, 0, 1]];
    for (const [k, vx, vy] of dirs) {
      if (!input.hit(k)) continue;
      const from = a.sel ?? this.cat;
      let best = null;
      let bs = Infinity;
      for (const t of list) {
        if (t === a.sel) continue;
        const dx = t.x - from.x;
        const dy = t.y - from.y;
        const along = dx * vx + dy * vy;
        if (along <= 0) continue;
        const side = Math.abs(dx * vy - dy * vx);
        const sc = along + side * 2;
        if (sc < bs) { bs = sc; best = t; }
      }
      if (best) a.sel = best;
    }
    // ボタンを押している別の指で相手をタップしても選べる
    for (const p of input.fresh()) {
      p.role = 'none';
      const hit = list.find((t) => {
        const s = this.worldToScreen(t.x, t.y);
        return p.x > s.x - 10 && p.x < s.x + 10 && p.y > s.y - 30 && p.y < s.y + 4;
      });
      if (hit) a.sel = hit;
    }
    if (a.sel && !list.includes(a.sel)) a.sel = null;
    const released = a.key ? !input.down(KEY.confirm) : a.button.up;
    if (released) this.fireOnedari();
  }

  fireOnedari() {
    const t = this.aim.sel;
    this.aim = null;
    input.releaseAll();
    if (!t) return; // 相手のいない方で離した：何も起きない（TPも減らない）
    const st = this.state;
    const chance = this.chance(t);
    const spent = st.tp;
    st.tp = 0;
    const win = Math.random() < chance;
    this.leap = { t: 0, target: t, fx: this.cat.x, fy: this.cat.y, win, spent, base: t.def.onedari.base };
    const dx = t.x - this.cat.x;
    const dy = t.y - this.cat.y;
    this.cat.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.fx.add(new PopText(this.cat.x, this.cat.y - 30, 'にゃーん', UI.pink, 0.8));
    audio.sfx('meow');
  }

  updateLeap(dt) {
    const L = this.leap;
    L.t += dt;
    const k = Math.min(1, L.t / BAL.onedari.leap);
    const t = L.target;
    // 相手の手前（てらまる側）まで飛ぶ
    const dx = L.fx - t.x;
    const dy = L.fy - t.y;
    const d = Math.hypot(dx, dy) || 1;
    let ex = t.x + (dx / d) * 12;
    let ey = t.y + (dy / d) * 4 + 2;
    // 着地点が建物などにめり込むなら、手前（飛んできた方）へずらす
    if (L.land === undefined) {
      const { footW, footH } = BAL.cat;
      let land = { x: L.fx, y: L.fy };
      for (let i = 0; i <= 10; i++) {
        const x = ex + (L.fx - ex) * (i / 10);
        const y = ey + (L.fy - ey) * (i / 10);
        if (!this.town.blocked(x, y, footW, footH)) { land = { x, y }; break; }
      }
      L.land = land;
    }
    ex = L.land.x;
    ey = L.land.y;
    this.cat.px = this.cat.x;
    this.cat.py = this.cat.y;
    this.cat.x = L.fx + (ex - L.fx) * k;
    this.cat.y = L.fy + (ey - L.fy) * k;
    L.z = Math.sin(Math.PI * k) * 12;
    this.snapCamera();
    if (k < 1) return;
    L.z = 0;
    this.cat.px = this.cat.x;
    this.cat.py = this.cat.y;
    if (L.wait === undefined) {
      L.wait = 0;
      if (L.win) this.fx.add(new PopText(t.x, t.y - 34, 'しょうがないなぁ', UI.pink, 0.9));
      else this.fx.add(new PopText(t.x, t.y - 34, 'また今度ね', UI.ink, 1.2));
      audio.sfx(L.win ? 'yes' : 'no');
    }
    L.wait += dt;
    if (L.wait < 0.5) return;
    this.leap = null;
    if (L.win) {
      this.game.scenes.push(new KamatteScene(this.game, this, t, this.pickKamatte(L.spent, L.base)));
    } else {
      t.leave(this.cat.x, this.cat.y);
      this.fx.add(new PopText(this.cat.x, this.cat.y - 28, 'しょんぼり', '#6a7a9a', 1.0));
    }
  }

  // 使ったTPで内容を選ぶ（確率の低い相手は、ときどき一段よい内容に）
  pickKamatte(spent, base) {
    const K = BAL.kamatte;
    const kinds = ['nade', 'toy', 'chase'];
    const w = K.weights.find((r) => spent >= r.tp).w;
    let r = Math.random() * w.reduce((s, x) => s + x, 0);
    let i = 0;
    while (r >= w[i]) { r -= w[i]; i++; }
    if (base < K.upgradeBelow && i < 2 && Math.random() < K.upgrade) i++;
    return kinds[i];
  }

  onKamatteEnd(target, score, sec) {
    const st = this.state;
    st.kamaware += score;
    st.timeLeft += sec;
    this.timeBonus = 1.8;
    this.timeBonusText = `+${sec}`;
    audio.sfx('timeBonus');
    target.leave(this.cat.x, this.cat.y);
    this.flash = 0.3;
    input.releaseAll();
  }

  // 爪とぎスポットに触れたら、勝手にガリガリ（ボーナス中・したばかりのときはしない）
  checkScratch() {
    const st = this.state;
    if (st.scratch > 0 || this.t - st.lastScratch < BAL.scratch.again) return;
    if (this.findProp(['scratch'], 6)) this.startScratch();
  }

  startScratch() {
    this.state.lastScratch = this.t;
    this.action = { kind: 'scratch', t: 0 };
    this.cat.dir = 'up';
    this.fx.add(new PopText(this.cat.x, this.cat.y - 30, 'ガリガリ', UI.orangeD));
    audio.sfx('scratch');
  }

  // おなかがいっぱいで猫砂に着いたら、トイレ
  checkLitter() {
    if (!this.full()) return;
    const p = this.findProp(['litter'], BAL.toilet.reach);
    if (!p) return;
    this.cat.x = this.cat.px = p.x;
    this.cat.y = this.cat.py = p.y + 2;
    this.startToilet();
  }

  startToilet() {
    this.action = { kind: 'toilet', t: 0, sand: 0 };
    this.cat.dir = 'down';
    this.fx.add(new PopText(this.cat.x, this.cat.y - 30, 'カキカキ', UI.orangeD));
    audio.sfx('toilet');
  }

  // 猫砂が飛ぶ
  addSand() {
    const c = this.cat;
    const side = Math.random() < 0.5 ? -1 : 1;
    const sp = { x: c.x + side * 4, y: c.y - 1, vx: side * (20 + Math.random() * 30), vy: -30 - Math.random() * 30, t: 0 };
    this.fx.add({
      update(dt) { sp.t += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 160 * dt; return sp.t < 0.4; },
      draw(ctx) { ctx.fillStyle = '#d8c090'; ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 1, 1); },
    });
  }

  startFaint() {
    const st = this.state;
    st.faints++;
    st.scratch = 0;
    st.toilet = 0;
    this.action = { kind: 'faint', t: 0, moved: false };
    this.fx.add(new PopText(this.cat.x, this.cat.y - 26, 'バタッ', UI.red));
    audio.sfx('faint');
    audio.buzz([60, 60, 120]);
  }

  updateAction(dt) {
    const a = this.action;
    a.t += dt;
    const st = this.state;
    if (a.kind === 'scratch' && a.t >= BAL.scratch.motion) {
      st.scratch = BAL.scratch.window;
      this.fx.add(new PopText(this.cat.x, this.cat.y - 30, 'つめ ばっちり！', UI.orangeD));
      this.action = null;
    } else if (a.kind === 'toilet' && a.t < BAL.toilet.motion) {
      if (Math.random() < dt * 25) this.addSand();
    } else if (a.kind === 'toilet') {
      st.fp = 0;
      st.over = 0;
      st.toilet = BAL.toilet.buff;
      this.feverIntro = 1.8;
      this.fx.add(new PopText(this.cat.x, this.cat.y - 30, 'すっきり！', UI.orangeD));
      audio.sfx('fever');
      this.action = null;
    } else if (a.kind === 'faint') {
      // 倒れる → 白くなって病院へ → 休んで復帰
      const F = BAL.faint;
      if (!a.moved && a.t >= F.fall + 0.4) {
        a.moved = true;
        const h = this.town.stage.hospital;
        this.cat.x = this.cat.px = h.x;
        this.cat.y = this.cat.py = h.y;
        this.cat.dir = 'down';
        this.snapCamera();
        st.thirst = 0;
      }
      if (a.t >= F.total) {
        this.action = null;
        this.fx.add(new PopText(this.cat.x, this.cat.y - 26, 'げんきになった！', UI.orangeD));
        audio.sfx('recover');
      }
    }
  }

  // トイレのあとのダッシュ中：触れるだけで成功（ミニゲームなし）。ごほうびは同じ
  autoRing(target, mult) {
    const tp = target.def.tp * mult;
    const getCat = () => ({ x: this.cat.x, y: this.cat.y - 8 });
    this.fx.add(new PopText(target.x, target.y - 34, 'メロメロ！', UI.pink));
    audio.sfx('win');
    if (mult > 1) this.fx.add(new PopText(target.x, target.y - 44, `TP×${mult}`, UI.orangeD));
    const n = Math.max(3, Math.min(10, tp));
    for (let i = 0; i < n; i++) {
      const v = Math.floor(tp / n) + (i < tp % n ? 1 : 0);
      this.fx.add(heartAbsorb(target.x + (Math.random() - 0.5) * 12, target.y - 16, getCat, () => { if (v > 0) this.addTp(v); }));
    }
    const drop = target.def.drops;
    if (drop) {
      const fp = ITEMS[drop.item].fp;
      for (let i = 0; i < drop.count; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.add(new Absorb({
          img: SPR.food[drop.item], x: target.x, y: target.y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 15,
          floor: 0, wait: 0.5, getTarget: getCat, onArrive: () => this.addFp(fp),
        }));
      }
    }
    target.leave(this.cat.x, this.cat.y);
  }

  addDashSpark() {
    const c = this.cat;
    const cols = ['#ff7090', '#f8c838', '#70d0ff', '#90e070', '#c090ff'];
    const sp = {
      x: c.x + (Math.random() - 0.5) * 22, y: c.y - 2 - Math.random() * 22, t: 0,
      col: cols[Math.floor(Math.random() * cols.length)], big: Math.random() < 0.6,
    };
    this.fx.add({
      update(dt) { sp.t += dt; sp.y -= 8 * dt; return sp.t < 0.5; },
      draw(ctx) {
        const x = Math.round(sp.x);
        const y = Math.round(sp.y);
        ctx.fillStyle = sp.t < 0.12 ? '#ffffff' : sp.col;
        ctx.fillRect(x, y, 1, 1);
        if (sp.big && sp.t < 0.35) {
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
        }
      },
    });
  }

  startEnding() {
    this.ending = 1.8;
    audio.sfx('end');
    this.action = null;
    input.releaseAll();
  }

  // てらまりんぐが終わったとき（RingingScene から呼ばれる）
  onRingingEnd(target, won) {
    if (won) target.leave(this.cat.x, this.cat.y);
    this.flash = 0.3;
  }

  worldToScreen(x, y) {
    return { x: x - this.lastCam.x, y: y - this.lastCam.y };
  }

  // カメラはてらまるにぴったり付いていく（遅れて追うと、マウス操作のときに
  // てらまるの画面位置が前後に揺れて方向が変わり、画面が揺れて見えるため）
  camAt(x, y) {
    const W = screen.W;
    const H = screen.H;
    return {
      x: Math.max(0, Math.min(this.town.w - W, x - W / 2)),
      y: Math.max(0, Math.min(this.town.h - H, y - 8 - H / 2)),
    };
  }

  snapCamera() {
    const c = this.camAt(this.cat.x, this.cat.y);
    this.cam.x = c.x;
    this.cam.y = c.y;
  }

  followCamera() {
    this.snapCamera();
  }

  // ---- 描画 ----

  draw(ctx) {
    this.layoutButtons();
    this.drawWorld(ctx);
    if (this.game.debug) this.drawDebug(ctx, this.lastCam.x, this.lastCam.y);
    this.drawHud(ctx);
    if (this.action?.kind === 'faint') this.drawFaint(ctx);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,250,240,${Math.min(1, this.flash / 0.3)})`;
      ctx.fillRect(0, 0, screen.W, screen.H);
    }
    if (this.ending > 0) {
      const a = Math.min(1, (1.8 - this.ending) * 4);
      ctx.fillStyle = `rgba(20,12,8,${0.45 * a})`;
      ctx.fillRect(0, 0, screen.W, screen.H);
      const pop = Math.round(Math.max(0, 1 - (1.8 - this.ending) * 5) * -20);
      drawText(ctx, 'おしまい！', screen.W / 2, 70 + pop, { scale: 2, color: UI.orange, outline: UI.ink, align: 'center' });
    }
  }

  // 倒れたとき：白くなって病院へ。病院では「やすみちゅう」と残り秒
  drawFaint(ctx) {
    const a = this.action;
    const F = BAL.faint;
    const W = screen.W;
    let white = 0;
    if (a.t > F.fall && a.t < F.fall + 0.4) white = (a.t - F.fall) / 0.4;
    else if (a.t >= F.fall + 0.4 && a.t < F.fall + 0.8) white = 1 - (a.t - F.fall - 0.4) / 0.4;
    if (a.t >= F.fall + 0.4) {
      const left = Math.max(0, Math.ceil(F.total - a.t));
      const msg = 'びょういんで やすみちゅう';
      const w = textWidth(msg, 'small') + 30;
      panel(ctx, Math.round(W / 2 - w / 2), 44, w, 14, UI.cream);
      drawText(ctx, msg, Math.round(W / 2 - w / 2) + 6, 47, { font: 'small', color: UI.ink });
      drawDigits(ctx, left, Math.round(W / 2 + w / 2) - 8, 48, { color: UI.red, align: 'right' });
    }
    if (white > 0) {
      ctx.fillStyle = `rgba(255,250,240,${white})`;
      ctx.fillRect(0, 0, W, screen.H);
    }
  }

  // 残り時間（てらまりんぐ画面でも使う）
  drawTimer(ctx) {
    const W = screen.W;
    const sec = Math.ceil(this.state.timeLeft);
    const hurry = sec <= BAL.hurryAt;
    const w = 44;
    const x = Math.round(W / 2 - w / 2);
    panel(ctx, x, 3, w, 20, hurry ? '#ffe0d8' : UI.cream);
    ctx.drawImage(SPR.clock, x + 5, 9);
    const blink = hurry && Math.floor(this.state.timeLeft * 4) % 2 === 0;
    drawDigits(ctx, sec, x + w - 6, 6, { color: hurry ? (blink ? UI.red : '#a02020') : UI.ink, align: 'right', scale: 2 });
  }

  drawScore(ctx, rightX, y) {
    const sc = String(liveScore(this.state));
    const w = 4 + 7 + 3 + digitsWidth(sc) + 5;
    const x = rightX - w;
    panel(ctx, x, y, w, 16, UI.cream);
    ctx.drawImage(SPR.star, x + 4, y + 5);
    drawDigits(ctx, sc, x + 14, y + 5, { color: UI.ink });
  }

  // 街（地面・物・ターゲット・てらまる）。てらまりんぐのズームインでも使う
  drawWorld(ctx) {
    // 描画は更新の合間を補間した位置で。カメラは端末の1ピクセル単位で動かす
    const cp = this.cat.drawPos(this.game.alpha);
    const cam = this.camAt(cp.x, cp.y);
    const cx = snapPx(cam.x);
    const cy = snapPx(cam.y);
    this.drawPosCat = cp;
    this.lastCam = { x: cx, y: cy };
    ctx.drawImage(this.town.image, -cx, -cy);

    // 奥（上）から順に描く
    const things = this.town.props.map((p) => ({ y: p.y, draw: () => this.drawProp(ctx, p, cx, cy) }));
    for (const t of this.spawner.targets) things.push({ y: t.y, draw: () => t.draw(ctx, cx, cy) });
    things.push({ y: this.cat.y, draw: () => this.drawCat(ctx, cx, cy) });
    things.sort((a, b) => a.y - b.y);
    for (const t of things) t.draw();

    ctx.save();
    ctx.translate(-cx, -cy);
    this.fx.draw(ctx);
    ctx.restore();

    if (this.bubble > 0) this.drawBubble(ctx, cx, cy);
    if (this.aim) this.drawAim(ctx, cx, cy);
    if (this.full() && this.action?.kind !== 'toilet') this.drawLitterGuide(ctx, cx, cy);
  }

  // おなかがいっぱいのとき：猫砂の上で矢印が跳ねる。画面の外なら、いちばん近い猫砂の方向を画面の端に出す
  drawLitterGuide(ctx, cx, cy) {
    const W = screen.W;
    const H = screen.H;
    const bob = Math.round(Math.abs(Math.sin(this.t * 5)) * -4);
    const col = Math.floor(this.t * 4) % 2 ? UI.pink : '#ff9ab8';
    let near = null;
    let nd = Infinity;
    for (const p of this.town.props) {
      if (p.type !== 'litter') continue;
      const sx = p.x - cx;
      const sy = p.y - cy;
      const d = Math.hypot(p.x - this.cat.x, p.y - this.cat.y);
      const seen = sx > 6 && sx < W - 6 && sy > 44 && sy < H + 4; // 矢印まで見えるか（上はHUDの下から）
      if (d < nd) { nd = d; near = { sx, sy, seen }; }
      if (!seen) continue;
      // 下向きの矢印
      const ax = Math.round(sx);
      const ay = Math.round(sy) - 22 + bob;
      ctx.fillStyle = UI.white;
      ctx.fillRect(ax - 4, ay - 1, 9, 5);
      ctx.fillRect(ax - 2, ay + 4, 5, 3);
      ctx.fillStyle = col;
      ctx.fillRect(ax - 3, ay, 7, 3);
      ctx.fillRect(ax - 1, ay + 3, 3, 2);
      ctx.fillRect(ax, ay + 5, 1, 1);
      drawText(ctx, 'トイレ', ax, ay - 9, { font: 'small', color: UI.pink, outline: UI.white, align: 'center' });
    }
    // いちばん近い猫砂が画面の外 → 端に三角
    if (near && !near.seen) {
      const ccx = this.cat.x - cx;
      const ccy = this.cat.y - 8 - cy;
      const ang = Math.atan2(near.sy - ccy, near.sx - ccx);
      const m = 22;
      const k = Math.min(Math.abs((W / 2 - m) / (Math.cos(ang) || 1e-6)), Math.abs((H / 2 - m) / (Math.sin(ang) || 1e-6)));
      const ex = Math.round(W / 2 + Math.cos(ang) * k);
      const ey = Math.round(H / 2 + Math.sin(ang) * k);
      // 白い丸に猫砂の絵、外側にピンクの三角
      const R = 12;
      const tx = ex + Math.cos(ang) * (R + 5);
      const ty = ey + Math.sin(ang) * (R + 5);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(ex + Math.cos(ang) * (R - 2) + nx * 6, ey + Math.sin(ang) * (R - 2) + ny * 6);
      ctx.lineTo(ex + Math.cos(ang) * (R - 2) - nx * 6, ey + Math.sin(ang) * (R - 2) - ny * 6);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ex, ey, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = UI.white;
      ctx.beginPath();
      ctx.arc(ex, ey, R - 2, 0, Math.PI * 2);
      ctx.fill();
      const li = this.town.props.find((p) => p.type === 'litter').def.img;
      ctx.drawImage(li, ex - Math.floor(li.width / 2), ey - Math.floor(li.height / 2));
    }
  }

  // TP・ご飯（トイレまで ○/100）の数（てらまりんぐ画面でも使う）。right=true なら x を右端として並べる
  drawCounters(ctx, x, y, right = false) {
    const tp = String(this.state.tp);
    const w = 4 + 10 + digitsWidth(tp) + 5;
    if (right) x -= w;
    panel(ctx, x, y, w, 16, this.state.tp >= BAL.onedari.minTp ? '#ffe0ea' : UI.cream); // おねだりできるときはピンク
    ctx.drawImage(SPR.heart, x + 4, y + 5);
    drawDigits(ctx, tp, x + 14, y + 5, { color: UI.ink });
    return w;
  }

  // お水・体重・ボーナス（2段目）。てらまりんぐ画面でも使う
  drawStatus(ctx, x, y, right = false) {
    const st = this.state;
    const parts = [];
    // お水：残り時間を4つのしずくで
    const left = Math.max(0, BAL.water.limit - st.thirst);
    const warn = st.thirst >= BAL.water.warn;
    const blink = warn && Math.floor(this.t * 6) % 2 === 0;
    const wW = 4 * 6 - 1;
    // おなか：6つの目盛り（いっぱいで赤く点滅）
    const SEG = 6;
    const wl = this.tummyLevel();
    const weightCol = ['#7ab050', '#e0a030', UI.red][wl];
    const fullBlink = wl === 2 && Math.floor(this.t * 4) % 2 === 0;
    const lab = 'おなか';
    const lw = textWidth(lab, 'small');
    if (st.scratch > 0) parts.push({ img: SPR.paw, sec: Math.ceil(st.scratch) });
    if (st.toilet > 0) parts.push({ img: SPR.bolt, sec: Math.ceil(st.toilet) });
    let w = 4 + wW + 6 + lw + 2 + SEG * 3 + 3;
    for (const p of parts) w += 6 + 9 + digitsWidth(String(p.sec));
    if (right) x -= w;
    panel(ctx, x, y, w, 13, warn || fullBlink ? '#ffe0d8' : UI.cream);
    let cx = x + 4;
    for (let i = 0; i < 4; i++) {
      const full = left > i * (BAL.water.limit / 4);
      if (blink && full) continue;
      ctx.drawImage(full ? SPR.drop : SPR.dropEmpty, cx + i * 6, y + 3);
    }
    cx += wW + 6;
    drawText(ctx, lab, cx, y + 3, { font: 'small', color: UI.ink });
    cx += lw + 2;
    for (let i = 0; i < SEG; i++) {
      ctx.fillStyle = st.fp >= ((i + 1) * BAL.tummy.full) / SEG ? weightCol : '#d8d0c0';
      ctx.fillRect(cx + i * 3, y + 4, 2, 5);
    }
    cx += SEG * 3;
    for (const p of parts) {
      cx += 6;
      ctx.drawImage(p.img, cx, y + 3);
      cx += 9;
      cx += drawDigits(ctx, p.sec, cx, y + 3, { color: UI.ink });
    }
  }

  drawProp(ctx, p, cx, cy) {
    const d = p.def;
    const x = Math.round(p.x - d.ox) - cx;
    const y = Math.round(p.y - d.oy) - cy;
    if (x > screen.W || y > screen.H || x + d.img.width < 0 || y + d.img.height < 0) return;
    ctx.drawImage(d.img, x, y);
  }

  drawCat(ctx, cx, cy) {
    let x = snapPx(this.drawPosCat.x - cx);
    const y = snapPx(this.drawPosCat.y - cy);
    const a = this.action;
    ctx.fillStyle = 'rgba(40,30,20,0.28)';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillRect(x - 4, y - 2, 8, 4);

    // 倒れている（横向きの絵を倒して描く）
    if (a?.kind === 'faint') {
      const img = SPR.cat.right[0];
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width + 2, -8);
      ctx.restore();
      // 目が回っている
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 4 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = '#f8c838';
        ctx.fillRect(Math.round(x + Math.cos(ang) * 7), Math.round(y - 14 + Math.sin(ang) * 2), 2, 2);
      }
      return;
    }

    const img = this.cat.sprite();
    const lz = Math.round(this.leap?.z ?? 0); // おねだりで飛びつく高さ
    // 太ると横に広がる
    const w = img.width + this.tummyLevel() * 2;
    let h = img.height;
    if (a?.kind === 'scratch') x += Math.floor(this.t * 20) % 2 ? 1 : -1;
    if (a?.kind === 'toilet') { h -= 2; x += Math.floor(this.t * 12) % 2 ? 1 : 0; } // しゃがんでカキカキ
    else if (!a && this.full() && !this.cat.moving) x += Math.floor(this.t * 3) % 2; // 止まっているときだけ、ゆっくりもじもじ
    ctx.drawImage(img, x - w / 2, y - h - lz, w, h);

    // おなかいっぱい：頭の横にピンクの線（体は揺らさない）
    if (!a && this.full() && Math.floor(this.t * 2) % 2 === 0) {
      ctx.fillStyle = UI.pink;
      ctx.fillRect(x - w / 2 - 3, y - h + 4, 2, 1);
      ctx.fillRect(x - w / 2 - 4, y - h + 6, 2, 1);
      ctx.fillRect(x + w / 2 + 1, y - h + 4, 2, 1);
      ctx.fillRect(x + w / 2 + 2, y - h + 6, 2, 1);
    }

    // 汗（お水が足りない）
    if (this.state.thirst >= BAL.water.warn && Math.floor(this.t * 4) % 2 === 0) {
      ctx.fillStyle = '#4aa0e0';
      ctx.fillRect(x + 6, y - h - 1, 1, 2);
      ctx.fillRect(x + 7, y - h + 1, 2, 2);
    }
  }

  drawBubble(ctx, cx, cy) {
    const x = snapPx(Math.round(this.drawPosCat.x) - cx);
    const y = snapPx(Math.round(this.drawPosCat.y) - cy) - 32;
    panel(ctx, x - 10, y, 22, 12, UI.white);
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x - 1, y + 12, 3, 1);
    ctx.fillRect(x, y + 13, 1, 1);
    drawText(ctx, 'にゃ', x + 1, y + 2, { font: 'small', color: UI.ink, align: 'center' });
  }

  drawHud(ctx) {
    this.drawCounters(ctx, 4, 4);
    this.drawStatus(ctx, 4, 22);
    this.drawTimer(ctx);
    this.drawScore(ctx, screen.W - 28, 4);

    this.drawFever(ctx);

    // ステージ名
    if (this.banner > 0) {
      const a = Math.min(1, this.banner * 2, (2.6 - this.banner) * 4);
      const slide = Math.round((1 - a) * -60);
      panel(ctx, 6 + slide, 40, 112, 30, UI.cream);
      drawText(ctx, `ステージ${this.stageId}`, 12 + slide, 43, { font: 'small', color: UI.orangeD });
      drawText(ctx, this.town.stage.name, 12 + slide, 53, { color: UI.ink });
    }

    this.drawOnedariHint(ctx);
    this.pauseBtn.draw(ctx, { pressed: this.pauseBtn.isHeld() });
    const ok = this.canOnedari();
    this.confirmBtn.label = ok ? 'おねだり' : 'けってい';
    this.confirmBtn.draw(ctx, { pressed: this.confirmBtn.isHeld(), lit: ok && Math.floor(this.t * 2) % 2 === 0 });

    drawSticks(ctx);
  }

  // トイレフィーバー：始まりの大きな文字と、残り時間のバー
  drawFever(ctx) {
    const W = screen.W;
    const left = this.state.toilet;
    if (left <= 0) return;
    const rainbow = ['#ff5080', '#f8a020', '#e8c000', '#40b040', '#3090e0', '#9050e0'];
    const k = Math.floor(this.t * 8);

    // 残り時間のバー（時計の下）
    const lw = textWidth('フィーバー', 'small');
    const bw = lw + 40;
    const bx = Math.round(W / 2 - bw / 2);
    const by = 26;
    const end = left < 3 && Math.floor(left * 6) % 2 === 0; // 終わりぎわは点滅
    panel(ctx, bx, by, bw, 15, end ? '#fff0f4' : UI.cream);
    drawText(ctx, 'フィーバー', bx + 4, by + 4, { font: 'small', color: rainbow[k % rainbow.length] });
    const gx = bx + lw + 8;
    const gw = bw - lw - 12;
    ctx.fillStyle = '#e0d4c0';
    ctx.fillRect(gx, by + 5, gw, 5);
    ctx.fillStyle = rainbow[(k + 2) % rainbow.length];
    ctx.fillRect(gx, by + 5, Math.ceil(gw * left / BAL.toilet.buff), 5);

    // はじまり：「トイレフィーバー！」を大きく（1文字ずつ色が変わる）
    if (this.feverIntro > 0) {
      const t = 1.8 - this.feverIntro;
      const a = Math.min(1, this.feverIntro * 3);
      const pop = t < 0.15 ? 3 : 2;
      const text = 'トイレフィーバー！';
      const chars = [...text];
      const total = chars.reduce((w, ch) => w + textWidth(ch, 'small') * pop + pop, 0) - pop;
      let x = Math.round(W / 2 - total / 2);
      const y = 44 - (pop - 2) * 4;
      ctx.globalAlpha = a;
      chars.forEach((ch, i) => {
        const bob = Math.round(Math.sin(this.t * 10 + i * 0.8) * 2);
        drawText(ctx, ch, x, y + bob, { font: 'small', scale: pop, color: rainbow[(i + k) % rainbow.length], outline: UI.white });
        x += textWidth(ch, 'small') * pop + pop;
      });
      drawText(ctx, 'さわるだけで メロメロ！', W / 2, y + 22, { font: 'small', color: UI.ink, outline: UI.white, align: 'center' });
      ctx.globalAlpha = 1;
    }
  }

  // おねだりの照準：街を少し暗くして、相手と確率・矢印を出す
  drawAim(ctx, cx, cy) {
    const a = this.aim;
    const list = this.onedariList();
    ctx.fillStyle = 'rgba(20,12,8,0.35)';
    ctx.fillRect(0, 0, screen.W, screen.H);
    // 届く範囲（点の輪）
    const ccx = Math.round(this.cat.x - cx);
    const ccy = Math.round(this.cat.y - 8 - cy);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const R = BAL.onedari.radius;
    for (let i = 0; i < 64; i++) {
      const ang = (i / 64) * Math.PI * 2 + this.t * 0.3;
      ctx.fillRect(Math.round(ccx + Math.cos(ang) * R), Math.round(ccy + Math.sin(ang) * R * 0.8), 1, 1);
    }
    // 相手とてらまるを明るく描き直す
    const things = list.map((t) => ({ y: t.y, draw: () => t.draw(ctx, cx, cy) }));
    things.push({ y: this.cat.y, draw: () => this.drawCat(ctx, cx, cy) });
    things.sort((p, q) => p.y - q.y);
    for (const t of things) t.draw();

    // 矢印：指の方（キーボードは狙っている相手の方）
    let ex = null;
    let ey = null;
    if (a.pointer) { ex = a.pointer.x; ey = a.pointer.y; }
    if (a.sel) { ex = Math.round(a.sel.x - cx); ey = Math.round(a.sel.y - 14 - cy); }
    if (ex !== null && Math.hypot(ex - ccx, ey - ccy) > 6) {
      const d = Math.hypot(ex - ccx, ey - ccy);
      const ux = (ex - ccx) / d;
      const uy = (ey - ccy) / d;
      const off = (this.t * 20) % 6;
      ctx.fillStyle = a.sel ? UI.pink : 'rgba(255,255,255,0.8)';
      for (let s = 8 + off; s < d - 6; s += 6) ctx.fillRect(Math.round(ccx + ux * s) - 1, Math.round(ccy + uy * s) - 1, 2, 2);
      if (a.sel) {
        // 矢じり
        const tx = ccx + ux * (d - 4);
        const ty = ccy + uy * (d - 4);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - ux * 6 - uy * 4, ty - uy * 6 + ux * 4);
        ctx.lineTo(tx - ux * 6 + uy * 4, ty - uy * 6 - ux * 4);
        ctx.fill();
      }
    }

    // 確率
    for (const t of list) {
      const p = Math.round(this.chance(t) * 100);
      const sel = t === a.sel;
      const str = `${p}%`;
      const w = digitsWidth(str) + 6;
      const x = Math.round(t.x - cx - w / 2);
      const y = Math.round(t.y - cy) - 44 - (sel ? 2 : 0);
      const blink = sel && Math.floor(this.t * 6) % 2 === 0;
      panel(ctx, x, y, w, 12, sel ? (blink ? '#ffd0dc' : UI.white) : UI.cream);
      const col = p >= 100 ? '#c88a10' : sel ? UI.pink : UI.ink;
      drawDigits(ctx, str, x + 3, y + 3, { color: col });
      if (sel) {
        ctx.fillStyle = UI.pink;
        ctx.fillRect(x + Math.floor(w / 2) - 2, y + 12, 5, 1);
        ctx.fillRect(x + Math.floor(w / 2) - 1, y + 13, 3, 1);
      }
    }
    // 説明
    const msg = list.length === 0 ? 'ちかくに おねだりできる人が いない'
      : a.pointer ? 'あいてのほうへ スライドして はなす' : '←→↑↓で えらんで はなす';
    drawText(ctx, msg, screen.W / 2, screen.H - 40, { font: 'small', color: UI.white, outline: UI.ink, align: 'center' });
    drawText(ctx, `TP ${this.state.tp} を ぜんぶ つかうよ`, screen.W / 2, screen.H - 30, { font: 'small', color: '#ffd0dc', outline: UI.ink, align: 'center' });
  }

  // はじめてTPが10になったとき・時間がのびたとき
  drawOnedariHint(ctx) {
    if (this.hintT > 0 && !this.aim) {
      const msg = input.lastDevice === 'keyboard' ? 'けってい ながおしで おねだり！' : 'てらまるを おさえて おねだり！';
      const a = Math.min(1, this.hintT * 2);
      ctx.globalAlpha = a;
      const w = textWidth(msg, 'small') + 12;
      panel(ctx, Math.round(screen.W / 2 - w / 2), screen.H - 44, w, 14, '#ffe8f0');
      drawText(ctx, msg, screen.W / 2, screen.H - 41, { font: 'small', color: UI.pink, align: 'center' });
      ctx.globalAlpha = 1;
    }
    if (this.timeBonus > 0) {
      const a = Math.min(1, this.timeBonus * 2);
      ctx.globalAlpha = a;
      const y = 26 - Math.round((1.8 - this.timeBonus) * 4);
      const tw = digitsWidth(this.timeBonusText, 2);
      drawDigits(ctx, this.timeBonusText, screen.W / 2 - 6, y, { color: '#2a70c0', outline: UI.white, align: 'center', scale: 2 });
      drawText(ctx, 'びょう', screen.W / 2 - 6 + tw / 2 + 2, y + 5, { font: 'small', color: '#2a70c0', outline: UI.white });
      ctx.globalAlpha = 1;
    }
  }

  drawDebug(ctx, cx, cy) {
    ctx.strokeStyle = 'rgba(255,0,0,0.8)';
    ctx.lineWidth = 1;
    const { footW, footH } = BAL.cat;
    ctx.strokeRect(Math.round(this.cat.x - footW / 2 - cx) + 0.5, Math.round(this.cat.y - footH - cy) + 0.5, footW - 1, footH - 1);
    for (const p of this.town.props) {
      const s = p.def.solid;
      if (!s) continue;
      ctx.strokeRect(Math.round(p.x - s.w / 2 - cx) + 0.5, Math.round(p.y - s.h - cy) + 0.5, s.w - 1, s.h - 1);
    }
    const st = this.state;
    drawText(ctx, `${Math.round(this.cat.x)},${Math.round(this.cat.y)} ${this.game.fps}fps お${st.fp} 水${st.thirst.toFixed(1)}`, 4, screen.H - 10, { font: 'small', color: '#ffffff', outline: '#000000' });
  }
}
