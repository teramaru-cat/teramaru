// てらまるを動かす入力（街とてらまりんぐ画面で共通）

import { input } from '../core/input.js';
import { drawStick } from '../core/ui.js';
import { BAL } from '../data/balance.js';

// 押された指・マウスを「移動」にする
export function claimMove(p) {
  p.role = 'move';
  p.data.cx = p.x;
  p.data.cy = p.y;
}

// 移動の向き（長さ0〜1）。catScreen はてらまるの画面上の位置（マウス用）
export function moveVector(catScreen) {
  // 押している「移動」の指のうち、最後に押したものを使う
  const movers = input.withRole('move').filter((p) => !p.up);
  const p = movers[movers.length - 1];
  if (!p) return input.keyVector();
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
    if (Math.hypot(dx, dy) / R < BAL.pointer.stickDead) return { x: 0, y: 0 };
    return { x: dx / R, y: dy / R };
  }
  const dx = p.x - catScreen.x;
  const dy = p.y - catScreen.y;
  const d = Math.hypot(dx, dy);
  if (d < BAL.pointer.mouseDead) return { x: 0, y: 0 };
  const m = Math.min(1, d / BAL.pointer.mouseFull);
  return { x: (dx / d) * m, y: (dy / d) * m };
}

// タッチのスティックを描く
export function drawSticks(ctx) {
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
