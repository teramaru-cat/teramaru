// 「よこにしてにゃ〜」の画面のてらまる：獲物をねらって、おしりを左右にフリフリ → ちょっと止まる、をくり返す
// 絵はゆがめず、「ふつう」と「おしりを1ドット前へ寄せた」2コマを切り替える

import { SPR } from './sprites.js';
import { CAT } from './palette.js';

const PAD_L = 3; // しっぽの分
const PAD_T = 3;
const K = 8; // 画面での拡大率
const LOOP = 2.6; // フリフリ 1.8秒 → 止まる 0.8秒
const STEP = 0.12; // フリフリ1回の速さ（秒）

export function startRotateCat(canvas) {
  const w = SPR.catLying.width + PAD_L;
  const h = SPR.catLying.height + PAD_T;
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
    const inFrame = wiggle && Math.floor(t / STEP) % 2 === 1;
    // しっぽ：フリフリ中はおしりと一緒に左右へ、止まると先だけゆっくり
    const sway = wiggle ? (inFrame ? 1 : -1) : Math.round(Math.sin(t * 4));
    ctx.clearRect(0, 0, w, h);
    drawTail(ctx, PAD_L + (inFrame ? 1 : 0), PAD_T, sway);
    ctx.drawImage(inFrame ? SPR.catLyingIn : SPR.catLying, PAD_L, PAD_T);
  };
  requestAnimationFrame(frame);
}

// しっぽ：おしりの上から立ち上がって、先が左右にゆれる（縁取り付き）
function drawTail(ctx, ox, oy, sway) {
  // 背中の上（体の縁より内側）から生やして、体の横に黒いはみ出しができないようにする
  const cells = [[3, 3], [2, 2], [2, 1], [2 + sway, 0], [2 + sway, -1]];
  ctx.fillStyle = CAT.o;
  for (const [x, y] of cells) ctx.fillRect(ox + x - 1, oy + y - 1, 3, 3);
  cells.forEach(([x, y], i) => {
    ctx.fillStyle = i === cells.length - 1 ? CAT.b : CAT.c; // 先だけ黒
    ctx.fillRect(ox + x, oy + y, 1, 1);
  });
}
