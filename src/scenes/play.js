// プレイ画面（M1：街を歩く・ポーズ・決定ボタン）

import { screen, snapPx } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText } from '../core/text.js';
import { Button, panel, drawStick } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { BAL } from '../data/balance.js';
import { getTown } from '../game/town.js';
import { Cat } from '../game/cat.js';
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

  moveVector() {
    // 押している「移動」の指のうち、最後に押したものを使う
    const movers = input.withRole('move').filter((p) => !p.up);
    const p = movers[movers.length - 1];
    if (p) {
      if (p.type === 'touch') {
        const R = BAL.pointer.stickRadius;
        let dx = p.x - p.data.cx;
        let dy = p.y - p.data.cy;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          // 指が遠くへ行ったらスティックの中心もついてくる
          p.data.cx = p.x - (dx / d) * R;
          p.data.cy = p.y - (dy / d) * R;
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        const m = Math.min(1, Math.hypot(dx, dy) / R);
        if (m < BAL.pointer.stickDead) return { x: 0, y: 0 };
        return { x: (dx / R), y: (dy / R) };
      }
      const cs = this.catScreen();
      const dx = p.x - cs.x;
      const dy = p.y - cs.y;
      const d = Math.hypot(dx, dy);
      if (d < BAL.pointer.mouseDead) return { x: 0, y: 0 };
      const m = Math.min(1, d / BAL.pointer.mouseFull);
      return { x: (dx / d) * m, y: (dy / d) * m };
    }
    return input.keyVector();
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
        p.role = 'move';
        p.data.cx = p.x;
        p.data.cy = p.y;
      }
    }
    if (input.hit(KEY.confirm)) this.onConfirm();

    this.cat.update(dt, this.moveVector(), this.town);
    this.followCamera(dt);
    if (this.banner > 0) this.banner -= dt;
    if (this.bubble > 0) this.bubble -= dt;
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
    // 描画は更新の合間を補間した位置で。カメラは端末の1ピクセル単位で動かす
    const cp = this.cat.drawPos(this.game.alpha);
    const cam = this.camAt(cp.x, cp.y);
    const cx = snapPx(cam.x);
    const cy = snapPx(cam.y);
    this.drawPosCat = cp;
    ctx.drawImage(this.town.image, -cx, -cy);

    // 奥（上）から順に描く
    const things = this.town.props.map((p) => ({ y: p.y, draw: () => this.drawProp(ctx, p, cx, cy) }));
    things.push({ y: this.cat.y, draw: () => this.drawCat(ctx, cx, cy) });
    things.sort((a, b) => a.y - b.y);
    for (const t of things) t.draw();

    if (this.bubble > 0) this.drawBubble(ctx, cx, cy);
    if (this.game.debug) this.drawDebug(ctx, cx, cy);

    this.drawHud(ctx);
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
      panel(ctx, 6 + slide, 6, 112, 30, UI.cream);
      drawText(ctx, `ステージ${this.stageId}`, 12 + slide, 9, { font: 'small', color: UI.orangeD });
      drawText(ctx, this.town.stage.name, 12 + slide, 19, { color: UI.ink });
    }

    this.pauseBtn.draw(ctx, { pressed: this.pauseBtn.isHeld() });
    this.confirmBtn.draw(ctx, { pressed: this.confirmBtn.isHeld() });

    // タッチのスティック
    for (const p of input.withRole('move')) {
      if (p.type !== 'touch' || p.up) continue;
      const R = BAL.pointer.stickRadius;
      const dx = p.x - p.data.cx;
      const dy = p.y - p.data.cy;
      const d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      drawStick(ctx, p.data.cx, p.data.cy, p.data.cx + dx * k, p.data.cy + dy * k, R);
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
    drawText(ctx, `${Math.round(this.cat.x)},${Math.round(this.cat.y)} ${this.game.fps}fps`, 4, screen.H - 10, { font: 'small', color: '#ffffff', outline: '#000000' });
  }
}
