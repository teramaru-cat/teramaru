// チュートリアル（0-1 てらまるのいえ）の流れ
//
// 1. walk    … 歩いてみる（上に案内の枠）
// 2. ring    … 飼い主2人をてらまりんぐでメロメロに（まだの人の上に▼）
// 3. mission … ウィルにゃん（ねこたちの意志。姿のないキラキラ）があらわれて使命を伝える。「猫は家で飼おうね」
// 4. vet     … 動物病院で予防接種（チクッ）
// 5. after   … 「さあ、まちへ」→ 暗くなってステージ選択へ（結果発表はなし）
//
// セリフはここの PAGES を書きかえる。てらまるはしゃべらない。

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText } from '../core/text.js';
import { panel } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { save } from '../core/save.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { newlyOpened } from '../data/areas.js';
import { VOICE, drawVoiceBox, drawPresence, drawSpark, sparkSize, shownChars, totalChars } from './voice.js';

// セリフ（1ページ＝1〜3行）
const PAGES = {
  mission: [
    ['……てらまる。', 'きこえるかにゃ？'],
    [`われらは ${VOICE.fullName}。`, 'せかいじゅうの ねこの いし だにゃ'],
    [`${VOICE.name} って よんでほしいにゃ`],
    ['いまの てらまりんぐ、', 'みごと だったにゃ'],
    ['まちには まだ ねこの かわいさを', 'しらない にんげんが いっぱい いるにゃ'],
    ['まちじゅうを てらまりんぐで', 'メロメロに するにゃ！', 'それが てらまるの しめい だにゃ'],
    ['……でも ほんとうは、', 'ねこは いえの なかで かうのが', 'いちばん だにゃ'],
    ['おそとに でるのは', 'この ゲームの なか だけ。', 'やくそく だにゃ'],
    ['そのまえに、どうぶつびょういんで', 'よぼうせっしゅを うけるにゃ'],
  ],
  after: [
    ['よく がまん したにゃ！'],
    ['これで びょうきも', 'へっちゃら だにゃ'],
    ['さあ、まちへ でかけるにゃ！'],
  ],
};

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
        this.say(PAGES.mission, () => { this.go('toVet'); });
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
      if (t >= VET.end && !this.dialog && !this.afterSaid) {
        this.afterSaid = true;
        this.say(PAGES.after, () => { this.go('out'); });
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
      this.drawHint(ctx);
      if (this.step === 'ring') this.drawOwnerMarks(ctx);
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

  // 上の案内（ウィルにゃんの声。操作のやり方も）
  drawHint(ctx) {
    const W = screen.W;
    const touch = input.lastDevice !== 'keyboard';
    let lines;
    let sub;
    if (this.step === 'walk') {
      lines = ['てらまる、まずは', 'おうちを あるいてみるにゃ'];
      sub = touch ? 'がめんを なぞると あるくよ' : 'やじるしキー で あるくよ';
    } else if (this.charmed === 0) {
      lines = ['かいぬしの あしもとに さわって', 'てらまりんぐ するにゃ！'];
      sub = 'さわると てらまりんぐ が はじまるよ';
    } else {
      lines = ['その ちょうし だにゃ！', 'あと ひとり だにゃ'];
      sub = null;
    }
    const w = Math.min(W - 70, 210);
    const x = Math.round(W / 2 - w / 2);
    const h = drawVoiceBox(ctx, lines, { x, y: 10, w, t: this.t, now: this.now });
    if (sub) drawText(ctx, sub, W / 2, 10 + h + 3, { font: 'small', color: UI.white, outline: UI.ink, align: 'center' });
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

  // 動物病院：診察台のてらまる（3倍）に、白衣の手が注射をする
  drawVet(ctx) {
    const W = screen.W;
    const H = screen.H;
    const t = this.step === 'out' ? VET.end + 1 : this.t;
    // 部屋
    ctx.fillStyle = '#e4f2ea';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d2e6dc';
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 12, 112);
    ctx.fillStyle = '#c8d8cc';
    ctx.fillRect(0, 112, W, H - 112);
    ctx.fillStyle = '#a8bcb0';
    ctx.fillRect(0, 112, W, 2);
    // 看板
    const sign = 'どうぶつびょういん';
    panel(ctx, 8, 8, 92, 15, '#ffffff');
    ctx.fillStyle = '#e04848';
    ctx.fillRect(13, 13, 5, 1);
    ctx.fillRect(15, 11, 1, 5);
    drawText(ctx, sign, 21, 11, { font: 'small', color: UI.ink });
    // 診察台
    const cx = Math.round(W / 2);
    const top = 104;
    ctx.fillStyle = '#7a8a92';
    ctx.fillRect(cx - 44, top, 88, 8);
    ctx.fillStyle = '#c8d4d8';
    ctx.fillRect(cx - 43, top + 1, 86, 4);
    ctx.fillStyle = '#7a8a92';
    ctx.fillRect(cx - 4, top + 8, 8, 26);
    ctx.fillRect(cx - 20, top + 32, 40, 4);

    // てらまる
    const k = 3;
    const img = SPR.cat.down[0];
    const w = img.width * k;
    const h = img.height * k;
    let x = cx - w / 2;
    let y = top + 2 - h;
    const shaking = t >= VET.poke && t < VET.poke + 0.7;
    if (shaking) x += Math.floor(t * 30) % 2 ? 2 : -2;
    if (t >= VET.happy) y -= Math.abs(Math.round(Math.sin((t - VET.happy) * 7) * 4)); // ぴょんぴょん
    ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
    if (shaking) {
      // 毛が逆立つ
      ctx.fillStyle = UI.red;
      for (const [dx, dy] of [[-28, 6], [-22, -4], [22, -4], [28, 6]]) ctx.fillRect(cx + dx, y + dy + 10, 2, 5);
    }

    // 白衣の手と注射（右から入って、出ていく）
    let armK = 0;
    if (t >= VET.armIn - 0.6 && t < VET.armIn) armK = (t - (VET.armIn - 0.6)) / 0.6;
    else if (t >= VET.armIn && t < VET.armOut) armK = 1;
    else if (t >= VET.armOut && t < VET.armOut + 0.5) armK = 1 - (t - VET.armOut) / 0.5;
    if (armK > 0) {
      const push = t >= VET.poke - 0.2 && t < VET.poke + 0.3 ? 4 : 0;
      const tipX = Math.round(W + 10 - (W / 2 - 4) * armK) - push; // 針の先
      const ay = top - 22;
      // 腕（白衣）と手
      ctx.fillStyle = '#9aa8ae';
      ctx.fillRect(tipX + 40, ay - 6, W, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tipX + 41, ay - 5, W, 14);
      ctx.fillStyle = '#f2c9a0';
      ctx.fillRect(tipX + 32, ay - 3, 10, 9);
      // 注射
      ctx.fillStyle = '#5a6a72';
      ctx.fillRect(tipX + 12, ay - 2, 22, 7);
      ctx.fillStyle = '#eef6fa';
      ctx.fillRect(tipX + 13, ay - 1, 20, 5);
      ctx.fillStyle = '#7ac0ec';
      ctx.fillRect(tipX + 13, ay, t >= VET.poke ? 6 : 14, 3);
      ctx.fillStyle = '#5a6a72';
      ctx.fillRect(tipX + 34, ay - 4, 2, 11);
      ctx.fillStyle = '#a8b0b4';
      ctx.fillRect(tipX, ay + 1, 12, 1); // 針
    }
    if (t >= VET.poke && t < VET.poke + 0.9) {
      const pop = t < VET.poke + 0.1 ? -3 : 0;
      drawText(ctx, 'チクッ！', cx + 30, top - 64 + pop, { scale: 2, color: UI.red, outline: UI.white, align: 'center' });
    }
    if (t >= VET.poke + 0.9 && t < VET.happy) {
      drawText(ctx, 'ぷるぷる…', cx, top - h - 14, { font: 'small', color: '#4a5a7a', align: 'center' });
    }
    if (t >= VET.happy) {
      // ハートとキラキラ
      for (let i = 0; i < 5; i++) {
        const ph = (this.now * 0.6 + i / 5) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.drawImage(SPR.heart, Math.round(cx - 30 + i * 14), Math.round(top - h - 4 - ph * 26));
      }
      ctx.globalAlpha = 1;
      [[-44, -50], [42, -58], [-36, -14], [46, -20]].forEach(([dx, dy], i) => drawSpark(ctx, cx + dx, top + dy, sparkSize(this.now + i * 0.25)));
    }
  }
}
