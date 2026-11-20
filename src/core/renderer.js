// 画面の大きさ合わせ（内部解像度 → 端末の画面へ整数倍で拡大）
// 高さは 180 ドット固定。横幅は端末の横長さに合わせて 320〜416 ドットで伸び縮みする。

export const VIEW_H = 180;
const MIN_W = 320;
const MAX_W = 416;

export const screen = {
  W: MIN_W,
  H: VIEW_H,
  scale: 1,
  dpr: 1,
  canvas: null,
  ctx: null,
  portrait: false,
  probe: null,
};

export function initScreen(canvas) {
  screen.canvas = canvas;
  screen.ctx = canvas.getContext('2d', { alpha: false });
  const probe = document.createElement('div');
  probe.id = 'safe-probe';
  document.body.appendChild(probe);
  screen.probe = probe;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
}

function safeInsets() {
  const cs = getComputedStyle(screen.probe);
  return {
    l: parseFloat(cs.paddingLeft) || 0,
    r: parseFloat(cs.paddingRight) || 0,
    t: parseFloat(cs.paddingTop) || 0,
    b: parseFloat(cs.paddingBottom) || 0,
  };
}

function resize() {
  const ins = safeInsets();
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, window.innerWidth - ins.l - ins.r);
  const cssH = Math.max(1, window.innerHeight - ins.t - ins.b);
  const devW = Math.floor(cssW * dpr);
  const devH = Math.floor(cssH * dpr);
  const scale = Math.max(1, Math.min(Math.floor(devH / VIEW_H), Math.floor(devW / MIN_W)));
  const W = Math.max(MIN_W, Math.min(MAX_W, Math.floor(devW / scale)));

  // キャンバスは端末のピクセル数で持ち、描くときに scale 倍する。
  // こうすると画面のスクロールを1ドットより細かく（端末の1ピクセル単位で）動かせて、カクつきが減る。
  const c = screen.canvas;
  if (c.width !== W * scale) c.width = W * scale;
  if (c.height !== VIEW_H * scale) c.height = VIEW_H * scale;
  const w = (W * scale) / dpr;
  const h = (VIEW_H * scale) / dpr;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  // 端末の1ピクセル単位にそろえて、ドットの太さがばらつかないようにする
  c.style.left = `${Math.round((ins.l + (cssW - w) / 2) * dpr) / dpr}px`;
  c.style.top = `${Math.round((ins.t + (cssH - h) / 2) * dpr) / dpr}px`;

  screen.W = W;
  screen.scale = scale;
  screen.dpr = dpr;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  screen.portrait = coarse && window.innerHeight > window.innerWidth;
  document.body.classList.toggle('portrait', screen.portrait);
}

// 画面上の位置（clientX/Y）→ 内部のドット座標
export function toView(clientX, clientY) {
  const r = screen.canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * screen.W,
    y: ((clientY - r.top) / r.height) * screen.H,
  };
}

// 端末の1ピクセル単位にそろえる（スクロール用）
export function snapPx(v) {
  return Math.round(v * screen.scale) / screen.scale;
}

// ドット絵用の円（塗りつぶし）
export function fillCircle(ctx, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

// ドット絵用の楕円（塗りつぶし）
export function fillEllipse(ctx, cx, cy, rx, ry) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    const half = Math.floor(rx * Math.sqrt(Math.max(0, t)) + 0.5);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// '#rrggbb' を明るく(+)・暗く(-)する
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
