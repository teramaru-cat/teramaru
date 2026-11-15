// プレイ画面（街を歩く・ターゲットに触れるとてらまりんぐ・ポーズ・決定ボタン）

import { screen, snapPx } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText } from '../core/text.js';
import { Button, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { SPR } from '../art/sprites.js';
import { drawDigits, digitsWidth } from '../art/digits.js';
import { BAL } from '../data/balance.js';
import { getTown } from '../game/town.js';
import { Cat } from '../game/cat.js';
import { Spawner } from '../game/target.js';
import { claimMove, moveVector, drawSticks } from '../game/control.js';
import { RingingScene } from './ringing.js';
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
    this.bubble = 0; // 「にゃ」の吹き出し
    this.t = 0;
    this.pauseBtn = new Button('pause', '', { icon: 'pause', pad: 6 });
    this.confirmBtn = new Button('confirm', 'けってい', { pad: 6 });
    // 1プレイ分の状態（M3でタイマー・スコアを足す）
    this.state = { tp: 0, fp: 0, tpTotal: 0, fpTotal: 0 };
    this.spawner = new Spawner(this.town, stageId);
    this.spawner.fill(this.cat);
    this.flash = 0; // てらまりんぐから戻ったときの白いフェード
    this.lastCam = { x: 0, y: 0 };
  }

  enter() { input.releaseAll(); }
  resume() { input.releaseAll(); }

  onHidden() { this.openPause(); }

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

  update(dt) {
    this.t += dt;
    this.layoutButtons();

    if (input.hit(KEY.pause)) { this.openPause(); return; }

    for (const p of input.fresh()) {
      if (this.pauseBtn.contains(p.x, p.y)) {
        p.role = 'button:pause';
        this.openPause();
        return;
      }
      if (this.confirmBtn.contains(p.x, p.y)) {
        p.role = 'button:confirm';
        this.onConfirm();
      } else {
        claimMove(p);
      }
    }
    if (input.hit(KEY.confirm)) this.onConfirm();

    this.cat.update(dt, moveVector(this.catScreen()), this.town);
    this.followCamera(dt);
    this.spawner.update(dt, this.cat);
    if (this.banner > 0) this.banner -= dt;
    if (this.bubble > 0) this.bubble -= dt;
    if (this.flash > 0) this.flash -= dt;

    // ターゲットに触れたら、てらまりんぐへ
    const t = this.spawner.touching(this.cat);
    if (t) this.game.scenes.push(new RingingScene(this.game, this, t));
  }

  // てらまりんぐが終わったとき（RingingScene から呼ばれる）
  onRingingEnd(target, won) {
    if (won) target.leave(this.cat.x, this.cat.y);
    this.flash = 0.3;
  }

  worldToScreen(x, y) {
    return { x: x - this.lastCam.x, y: y - this.lastCam.y };
  }

  onConfirm() {
    // M1 では「にゃ」と鳴くだけ（爪とぎなどは M4 で）
    this.bubble = 1.0;
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

  draw(ctx) {
    this.layoutButtons();
    this.drawWorld(ctx);
    if (this.game.debug) this.drawDebug(ctx, this.lastCam.x, this.lastCam.y);
    this.drawHud(ctx);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,250,240,${Math.min(1, this.flash / 0.3)})`;
      ctx.fillRect(0, 0, screen.W, screen.H);
    }
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

    if (this.bubble > 0) this.drawBubble(ctx, cx, cy);
  }

  // TP・ご飯の数（てらまりんぐ画面でも使う）。right=true なら x を右端として並べる
  drawCounters(ctx, x, y, right = false) {
    const tp = String(this.state.tp);
    const fp = String(this.state.fp);
    const w = 4 + 7 + 3 + digitsWidth(tp) + 8 + 6 + 3 + digitsWidth(fp) + 5;
    if (right) x -= w;
    panel(ctx, x, y, w, 16, UI.cream);
    let cx = x + 4;
    ctx.drawImage(SPR.heart, cx, y + 5);
    cx += 10;
    cx += drawDigits(ctx, tp, cx, y + 5, { color: UI.ink }) + 8;
    ctx.drawImage(SPR.food.bread, cx, y + 6);
    cx += 9;
    drawDigits(ctx, fp, cx, y + 5, { color: UI.ink });
  }

  drawProp(ctx, p, cx, cy) {
    const d = p.def;
    const x = Math.round(p.x - d.ox) - cx;
    const y = Math.round(p.y - d.oy) - cy;
    if (x > screen.W || y > screen.H || x + d.img.width < 0 || y + d.img.height < 0) return;
    ctx.drawImage(d.img, x, y);
  }

  drawCat(ctx, cx, cy) {
    const x = snapPx(this.drawPosCat.x - cx);
    const y = snapPx(this.drawPosCat.y - cy);
    ctx.fillStyle = 'rgba(40,30,20,0.28)';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillRect(x - 4, y - 2, 8, 4);
    const img = this.cat.sprite();
    ctx.drawImage(img, x - 8, y - img.height);
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
    // ステージ名
    if (this.banner > 0) {
      const a = Math.min(1, this.banner * 2, (2.6 - this.banner) * 4);
      const slide = Math.round((1 - a) * -60);
      panel(ctx, 6 + slide, 24, 112, 30, UI.cream);
      drawText(ctx, `ステージ${this.stageId}`, 12 + slide, 27, { font: 'small', color: UI.orangeD });
      drawText(ctx, this.town.stage.name, 12 + slide, 37, { color: UI.ink });
    }
    this.drawCounters(ctx, 4, 4);

    this.pauseBtn.draw(ctx, { pressed: this.pauseBtn.isHeld() });
    this.confirmBtn.draw(ctx, { pressed: this.confirmBtn.isHeld() });

    drawSticks(ctx);
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
    drawText(ctx, `${Math.round(this.cat.x)},${Math.round(this.cat.y)} ${this.game.fps}fps`, 4, screen.H - 10, { font: 'small', color: '#ffffff', outline: '#000000' });
  }
}
