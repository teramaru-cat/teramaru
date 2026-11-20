// 「よこにしてね」の画面のてらまる：獲物をねらって、おしりをフリフリ → ちょっと止まる、をくり返す

import { SPR } from './sprites.js';
import { CAT } from './palette.js';

const PAD_L = 3; // しっぽの分
const PAD_T = 4; // おしりを上げる分＋しっぽの分
const K = 8; // 画面での拡大率
const LOOP = 2.6; // フリフリ 1.8秒 → 止まる 0.8秒
const REAR = 11; // おしり側（この列より左）を持ち上げる

export function startRotateCat(canvas) {
  const img = SPR.catLying;
  const w = img.width + PAD_L;
  const h = img.height + PAD_T;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * K}px`;
  canvas.style.height = `${h * K}px`;
  const ctx = canvas.getContext('2d');

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!document.body.classList.contains('portrait')) return; // 縦のときだけ動かす
    const t = (now / 1000) % LOOP;
    const wiggle = t < 1.8;
    // おしりの高さ：フリフリ中はすばやく 1⇔2、止まっている間は 1
    const lift = wiggle ? 1 + (Math.floor(t * 9) % 2) : 1;
    // しっぽ：フリフリ中は速く、止まると先だけゆっくり
    const sway = wiggle ? (Math.floor(t * 9) % 2 ? 1 : -1) : Math.round(Math.sin(t * 4));
    ctx.clearRect(0, 0, w, h);
    drawTail(ctx, PAD_L, PAD_T - lift, sway);
    // 体：おしり側ほど高く（1列ずつずらして、なめらかに曲げる）
    for (let x = 0; x < img.width; x++) {
      const k = Math.max(0, (REAR - x) / REAR);
      const dy = -Math.round(lift * k);
      ctx.drawImage(img, x, 0, 1, img.height, PAD_L + x, PAD_T + dy, 1, img.height);
    }
  };
  requestAnimationFrame(frame);
}

// しっぽ：おしりの上から立ち上がって、先が左右にゆれる（縁取り付き）
function drawTail(ctx, ox, oy, sway) {
  const cells = [[2, 4], [1, 3], [1, 2], [1 + sway, 1], [1 + sway, 0]];
  ctx.fillStyle = CAT.o;
  for (const [x, y] of cells) ctx.fillRect(ox + x - 1, oy + y - 1, 3, 3);
  cells.forEach(([x, y], i) => {
    ctx.fillStyle = i === cells.length - 1 ? CAT.b : CAT.c; // 先だけ黒
    ctx.fillRect(ox + x, oy + y, 1, 1);
  });
}
