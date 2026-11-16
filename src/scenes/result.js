// リザルト（スコアの内訳・総合スコア・獲得コイン・ベスト更新）

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText, textWidth } from '../core/text.js';
import { Menu, panel } from '../core/ui.js';
import { save } from '../core/save.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { finalScore } from '../game/score.js';
import { getTown } from '../game/town.js';

const ROW_GAP = 0.35; // 内訳を1行ずつ出す間隔（秒）

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
    const next = stageId + 1;
    const need = BAL.unlock[next];
    if (need && this.sc.total >= need && !sv.unlockedStages.includes(next)) sv.unlockedStages.push(next);
    save(sv);

    this.rows = [
      { label: 'てらまりんぐ', detail: [state.tpTotal, '×', BAL.score.tp], value: this.sc.ring },
      { label: 'ごはん', detail: [state.fpTotal, '×', BAL.score.fp], value: this.sc.food },
      { label: 'かまってもらった', detail: [], value: this.sc.kamaware },
      { label: 'ノーミス', detail: [], value: this.sc.noMiss },
    ];
    this.showAll = ROW_GAP * this.rows.length + 0.9; // 全部出し終わる時間
    this.menu = new Menu([{ id: 'again', label: 'もういちど' }, { id: 'title', label: 'タイトルへ' }]);
  }

  enter() { input.releaseAll(); }

  update(dt) {
    this.t += dt;
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
    if (id === 'title') this.game.toTitle();
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    // 背景：街をうすく
    ctx.drawImage(this.town.image, -Math.round(this.town.w / 2 - W / 2), -Math.round(this.town.h / 2 - H / 2));
    ctx.fillStyle = 'rgba(255,246,224,0.6)';
    ctx.fillRect(0, 0, W, H);

    const pw = 232;
    const ph = 166;
    const px = Math.round((W - pw) / 2);
    const py = 7;
    panel(ctx, px, py, pw, ph, UI.cream);
    drawText(ctx, 'けっか', W / 2, py + 5, { font: 'small', scale: 2, color: UI.orangeD, align: 'center' });

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
      this.menu.buttons[0].place(W / 2 - bw - 4, py + ph - 32, bw, 20);
      this.menu.buttons[1].place(W / 2 + 4, py + ph - 32, bw, 20);
      this.menu.draw(ctx);
    }
  }
}
