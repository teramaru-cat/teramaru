// キーボード・マウス・タッチの入力をまとめる
//
// - キー：keys（押している）、pressed（この更新で押された）
// - ポインタ（マウス・指）：pointers に1本ずつ入る。
//   押された直後は role が null。シーンが「どこを押したか」で役割（'move'・'button:pause' など）を決める。
//   役割は指を離すまで変わらない。離すと up=true になり、次の更新の終わりで消える。

import { toView } from './renderer.js';

const PREVENT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab',
]);

export const KEY = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space'],
  pause: ['Escape', 'KeyP'],
};

export const input = {
  keys: new Set(),
  pressed: new Set(),
  pointers: new Map(),
  hover: null, // マウスの今の位置（押していなくても）
  lastDevice: 'keyboard', // 'keyboard' | 'mouse' | 'touch'

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* 古いブラウザ */ }
      const v = toView(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, {
        id: e.pointerId,
        type: e.pointerType === 'mouse' ? 'mouse' : 'touch',
        x: v.x, y: v.y,
        sx: v.x, sy: v.y, // 押し始めた位置
        role: null,
        up: false,
        data: {},
      });
      this.lastDevice = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    });
    canvas.addEventListener('pointermove', (e) => {
      const v = toView(e.clientX, e.clientY);
      const p = this.pointers.get(e.pointerId);
      if (p) { p.x = v.x; p.y = v.y; }
      if (e.pointerType === 'mouse') this.hover = v;
    });
    const end = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p) {
        const v = toView(e.clientX, e.clientY);
        p.x = v.x; p.y = v.y;
        p.up = true;
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.hover = null; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  },

  down(names) { return names.some((c) => this.keys.has(c)); },
  hit(names) { return names.some((c) => this.pressed.has(c)); },

  // キーボードの移動方向（斜めは長さ1）
  keyVector() {
    let x = 0;
    let y = 0;
    if (this.down(KEY.left)) x -= 1;
    if (this.down(KEY.right)) x += 1;
    if (this.down(KEY.up)) y -= 1;
    if (this.down(KEY.down)) y += 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  },

  // まだ役割の決まっていないポインタ
  fresh() { return [...this.pointers.values()].filter((p) => p.role === null); },

  withRole(role) { return [...this.pointers.values()].filter((p) => p.role === role); },

  // 1回の更新の終わりに呼ぶ
  endTick() {
    this.pressed.clear();
    for (const [id, p] of this.pointers) if (p.up) this.pointers.delete(id);
  },

  // シーンが切り替わったとき、押しっぱなしの指で誤作動しないようにする
  releaseAll() {
    for (const p of this.pointers.values()) p.role = p.role ?? 'none';
    this.keys.clear();
    this.pressed.clear();
  },
};
