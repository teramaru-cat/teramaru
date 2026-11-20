// リザルト（スコアの内訳・総合スコア・獲得コイン・ベスト更新）

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Menu, panel } from '../core/ui.js';
import { save } from '../core/save.js';
import { audio } from '../core/audio.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { finalScore } from '../game/score.js';
import { getTown } from '../game/town.js';
import { newlyOpened } from '../data/areas.js';

const ROW_GAP = 0.35; // 内訳を1行ずつ出す間隔（秒）
const PW = 216; // 結果のパネルの幅（左に、しんさいんとてらまるが出る）

// しんさいん（蝶ネクタイの白猫）の評価。てらまるはしゃべらない。
// スコアで評価が変わる（同じ評価の中からランダム）。mood はてらまるの様子（ぴょんぴょん・しょんぼりなど）
const COMMENTS = {
  best: [['ベストこうしん！', 'きょうの てらまるは', 'さいこう だにゃ'], ['ベストこうしん！', 'みごとな', 'てらまりんぐ だにゃ']],
  great: [['まちじゅう メロメロ！', 'おみごと だにゃ'], ['かわいさ', 'まんてん だにゃ！'], ['きょうの てらまるは', 'むてき だったにゃ']],
  good: [['なかなか', 'やるにゃ'], ['すりすり じょうず', 'だったにゃ'], ['いい ちょうし', 'だにゃ']],
  ok: [['まあまあ', 'だにゃ'], ['もっと すりすり', 'できるはず だにゃ']],
  low: [['まだまだ', 'だにゃ…'], ['あいきょうが', 'たりないにゃ…']],
  faint: [['おみずは', 'こまめに のむにゃ'], ['たおれちゃ', 'だめ だにゃ…']],
  kamatte: [['かまってもらえて', 'よかったにゃ'], ['あまえじょうず', 'だにゃ']],
};

function pickComment(sc, st, newBest) {
  const pick = (k) => ({ mood: k, lines: COMMENTS[k][Math.floor(Math.random() * COMMENTS[k].length)] });
  const total = sc.total;
  if (newBest && total >= 1000) return { ...pick('best'), mood: 'great' };
  if (total >= 2000) return pick('great');
  if ((st.faints ?? 0) > 0) return { ...pick('faint'), mood: 'low' };
  if (total >= 1500) return sc.kamaware > 0 && Math.random() < 0.5 ? { ...pick('kamatte'), mood: 'good' } : pick('good');
  if (total >= 1000) return pick('ok');
  return pick('low');
}

// 数字はドット数字、それ以外はドット文字で、左から並べて描く
function drawMixed(ctx, parts, x, y, color) {
  let cx = x;
  for (const p of parts) {
    const s = String(p);
    if (/^[0-9+\-]+$/.test(s)) cx += drawDigits(ctx, s, cx, y + 1, { color }) + 2;
    else { drawText(ctx, s, cx, y, { font: 'small', color }); cx += textWidth(s, 'small') + 1; }
  }
  return cx - x;
}

export class ResultScene {
  constructor(game, stageId, state) {
    this.game = game;
    this.stageId = stageId;
    this.st = state;
    this.sc = finalScore(state);
    this.town = getTown(stageId);
    this.t = 0;

    // 保存：コインを足す・ベスト・次のステージ
    const sv = game.save;
    sv.coins += this.sc.coins;
    const best = sv.bestScore[stageId] ?? 0;
    this.prevBest = best;
    this.newBest = this.sc.total > best;
    if (this.newBest) sv.bestScore[stageId] = this.sc.total;
    // この点数で開くステージ（areas.js の unlock）
    this.unlocked = null;
    for (const st of newlyOpened(stageId, this.sc.total, sv)) {
      sv.unlocked.push(st.id);
      this.unlocked = st;
    }
    save(sv);

    this.rows = [
      { label: 'てらまりんぐ', detail: [state.tpTotal, '×', BAL.score.tp], value: this.sc.ring },
      { label: 'ごはん', detail: [state.fpTotal, '×', BAL.score.fp], value: this.sc.food },
      { label: 'かまってもらった', detail: [], value: this.sc.kamaware },
      { label: 'ノーミス', detail: [], value: this.sc.noMiss },
    ];
    this.showAll = ROW_GAP * this.rows.length + 0.9; // 全部出し終わる時間
    this.comment = pickComment(this.sc, state, this.newBest);
    this.catIn = ROW_GAP * this.rows.length; // てらまるが歩いてくる（0.6秒）
    this.hearts = [];
    this.menu = new Menu([{ id: 'again', label: 'もういちど' }, { id: 'select', label: 'ステージへ' }]);
  }

  enter() { input.releaseAll(); }

  update(dt) {
    const prev = this.t;
    this.t += dt;
    this.sounds(prev, this.t);
    // 気分がいいときはハートが出る
    const rate = { great: 3, good: 1.2 }[this.comment.mood] ?? 0;
    if (this.t > this.catIn + 0.6 && Math.random() < dt * rate) {
      this.hearts.push({ x: this.catX() + (Math.random() - 0.5) * 24, y: screen.H - 62, vy: -12 - Math.random() * 8, life: 1.8 });
    }
    for (const h of this.hearts) { h.y += h.vy * dt; h.life -= dt; }
    this.hearts = this.hearts.filter((h) => h.life > 0);
    if (this.t < this.showAll) {
      // 押したら演出を飛ばす
      if (input.hit(KEY.confirm) || input.fresh().length) {
        for (const p of input.fresh()) p.role = 'none';
        this.t = this.showAll;
      }
      return;
    }
    const id = this.menu.update();
    if (id === 'again') this.game.startPlay(this.stageId);
    if (id === 'select') this.game.toStageSelect();
  }

  // 内訳が1行出るごとにピッ、総合スコアが出たらベスト更新の音
  sounds(a, b) {
    const n = this.rows.length;
    for (let i = 1; i <= n; i++) if (a < ROW_GAP * i && b >= ROW_GAP * i) audio.sfx('row');
    const done = ROW_GAP * n + 0.6;
    if (a < done && b >= done) audio.sfx(this.newBest ? 'best' : 'row');
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    // 背景：街をうすく
    ctx.drawImage(this.town.image, -Math.round(this.town.w / 2 - W / 2), -Math.round(this.town.h / 2 - H / 2));
    ctx.fillStyle = 'rgba(255,246,224,0.6)';
    ctx.fillRect(0, 0, W, H);

    const pw = PW;
    const ph = 166;
    const px = W - pw - 6;
    const py = 7;
    panel(ctx, px, py, pw, ph, UI.cream);
    drawText(ctx, 'けっか', px + pw / 2, py + 5, { font: 'small', scale: 2, color: UI.orangeD, align: 'center' });

    // 内訳
    const lx = px + 12;
    const rx = px + pw - 12;
    this.rows.forEach((r, i) => {
      if (this.t < ROW_GAP * (i + 1)) return;
      const y = py + 28 + i * 13;
      drawText(ctx, r.label, lx, y, { font: 'small', color: UI.ink });
      if (r.detail.length) drawMixed(ctx, r.detail, lx + 72, y, '#8a7a6a');
      drawDigits(ctx, r.value, rx, y + 1, { color: UI.ink, align: 'right' });
    });

    // 総合スコア（数えあげ）
    const tTotal = ROW_GAP * this.rows.length;
    if (this.t >= tTotal) {
      ctx.fillStyle = UI.ink;
      ctx.fillRect(lx, py + 82, pw - 24, 1);
      const k = Math.min(1, (this.t - tTotal) / 0.6);
      const shown = Math.round(this.sc.total * k);
      drawText(ctx, 'そうごうスコア', lx, py + 92, { font: 'small', color: UI.ink });
      drawDigits(ctx, shown, rx, py + 88, { color: UI.orangeD, align: 'right', scale: 2 });

      if (k >= 1) {
        // コイン
        ctx.drawImage(SPR.coin, lx, py + 108);
        drawMixed(ctx, ['てらまるコイン', `+${this.sc.coins}`, 'まい'], lx + 10, py + 107, UI.ink);
        if (this.unlocked) {
          // 新しいステージが開いた
          const msg = `「${this.unlocked.name}」が ひらいた！`;
          const mw = textWidth(msg, 'small') + 10;
          const mx = px + Math.round((pw - mw) / 2);
          panel(ctx, mx, py + 119, mw, 13, Math.floor(this.t * 3) % 2 ? '#ffe8b8' : '#fff6e0');
          drawText(ctx, msg, mx + 5, py + 122, { font: 'small', color: UI.orangeD });
        }
        if (this.newBest && Math.floor(this.t * 3) % 2 === 0) {
          drawText(ctx, 'ベストこうしん！', rx, py + 107, { font: 'small', color: UI.pink, align: 'right' });
        } else if (!this.newBest) {
          const bw = digitsWidth(String(this.prevBest));
          drawText(ctx, 'ベスト', rx - bw - 3 - textWidth('ベスト', 'small'), py + 107, { font: 'small', color: '#8a7a6a' });
          drawDigits(ctx, this.prevBest, rx, py + 108, { color: '#8a7a6a', align: 'right' });
        }
      }
    }

    // ボタン（横に2つ）
    if (this.t >= this.showAll) {
      const bw = 92;
      const cx = px + pw / 2;
      this.menu.buttons[0].place(cx - bw - 4, py + ph - 32, bw, 20);
      this.menu.buttons[1].place(cx + 4, py + ph - 32, bw, 20);
      this.menu.draw(ctx);
    }

    this.judgeTop = this.drawJudge(ctx, this.t >= this.catIn + 0.6);
    this.drawCat(ctx);
  }

  // パネルの左の空き：左にしんさいん、右にてらまる
  midX() { return Math.round((screen.W - PW - 6) / 2); }
  catX() { return this.midX() + 16; }
  judgeX() { return this.midX() - 20; }

  // しんさいん：はじめから座っていて、てらまるが来たら評価を言う（言っている間は少しうなずく）
  drawJudge(ctx, talking) {
    const k = 2;
    const feet = screen.H - 14;
    const img = SPR.judge[0];
    const w = img.width * k;
    const h = img.height * k;
    const x = this.judgeX();
    const y = feet - (talking && Math.floor(this.t * 3) % 2 ? 1 : 0);
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(x - 12, feet - 2, 24, 4);
    ctx.drawImage(img, x - w / 2, y - h, w, h);
    return feet - h;
  }

  // てらまるが左から歩いてきて、正面を向く（しゃべらない。気分は動きとハート・汗で見せる）
  drawCat(ctx) {
    const H = screen.H;
    const k = 2;
    const gx = this.catX();
    const feet = H - 14;
    const t = this.t - this.catIn;
    if (t < 0) return;
    const walk = Math.min(1, t / 0.6);
    let img;
    let x = gx;
    let y = feet;
    if (walk < 1) {
      x = Math.round(-20 + (gx + 20) * walk);
      img = SPR.cat.right[1 + (Math.floor(this.t * 8) % 2)];
    } else {
      img = SPR.cat.down[0];
      const mood = this.comment.mood;
      if (mood === 'great') y -= Math.abs(Math.round(Math.sin(this.t * 7) * 4)); // ぴょんぴょん
      else if (mood === 'good') y -= Math.floor(this.t * 2) % 2; // ゆらゆら
    }
    const w = img.width * k;
    const h = img.height * k;
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(x - 12, feet - 2, 24, 4);
    ctx.drawImage(img, x - w / 2, y - h, w, h);

    for (const hh of this.hearts) {
      ctx.globalAlpha = Math.min(1, hh.life);
      ctx.drawImage(SPR.heart, Math.round(hh.x), Math.round(hh.y));
    }
    ctx.globalAlpha = 1;

    if (walk < 1) return;
    if (this.comment.mood === 'low') {
      // しょんぼり：頭の横に汗（縁取りのあるしずく。ゆっくり垂れてはくり返す）
      const k2 = (this.t * 0.8) % 1;
      ctx.drawImage(SPR.drop, x + 9, Math.round(y - h + 6 + k2 * 6));
    }
    // ふきだし（しんさいんの評価）
    const jx = this.judgeX();
    const lines = this.comment.lines;
    const bw = Math.max(...lines.map((l) => textWidth(l, 'small'))) + 10;
    const bh = lines.length * 10 + 6;
    const bx = Math.max(3, Math.min(screen.W - PW - 9 - bw, jx - Math.round(bw / 2)));
    const by = Math.min(feet - h, this.judgeTop) - 12 - bh;
    panel(ctx, bx, by, bw, bh, UI.white);
    ctx.fillStyle = UI.ink;
    ctx.fillRect(jx - 3, by + bh - 1, 7, 1);
    ctx.fillRect(jx - 2, by + bh, 5, 2);
    ctx.fillRect(jx - 1, by + bh + 2, 3, 2);
    ctx.fillStyle = UI.white;
    ctx.fillRect(jx - 2, by + bh - 1, 5, 1);
    ctx.fillRect(jx - 1, by + bh, 3, 2);
    lines.forEach((l, i) => drawText(ctx, l, bx + 5, by + 4 + i * 10, { font: 'small', color: this.comment.mood === 'low' ? '#4a5a7a' : UI.ink }));
  }
}
