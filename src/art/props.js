// 街の小物（木・爪とぎ電柱・水皿・ベンチ・自販機・噴水・植木鉢）
// それぞれ画像と「足元の位置（ox, oy）」「ぶつかる箱（solid）」を返す。

import { makeCanvas, fillCircle, fillEllipse } from '../core/renderer.js';

function tree() {
  const [c, x] = makeCanvas(24, 32);
  // 幹
  x.fillStyle = '#5a3a24';
  x.fillRect(10, 18, 5, 13);
  x.fillStyle = '#7a5234';
  x.fillRect(11, 18, 2, 13);
  // 葉
  x.fillStyle = '#2f6e2a';
  fillCircle(x, 12, 11, 10);
  x.fillStyle = '#4c9a3c';
  fillCircle(x, 11, 10, 8);
  x.fillStyle = '#6cbc52';
  fillCircle(x, 9, 7, 4);
  x.fillStyle = '#8fd46a';
  x.fillRect(7, 5, 2, 1);
  x.fillRect(6, 6, 1, 2);
  return { img: c, ox: 12, oy: 31, solid: { w: 6, h: 4 } };
}

// 爪とぎ（電柱の根元に麻ひもが巻いてある）
function scratchPole() {
  const [c, x] = makeCanvas(14, 44);
  x.fillStyle = '#4a4a50';
  x.fillRect(1, 4, 12, 2); // 腕木
  x.fillStyle = '#7a6a58';
  x.fillRect(5, 0, 4, 44);
  x.fillStyle = '#9a8a74';
  x.fillRect(5, 0, 1, 44);
  x.fillStyle = '#5a4c3e';
  x.fillRect(8, 0, 1, 44);
  // 麻ひも
  x.fillStyle = '#dcc488';
  x.fillRect(4, 28, 6, 14);
  x.fillStyle = '#b89a5c';
  for (let y = 29; y < 42; y += 2) x.fillRect(4, y, 6, 1);
  x.fillStyle = '#8a7040';
  x.fillRect(4, 28, 1, 14);
  return { img: c, ox: 7, oy: 43, solid: { w: 6, h: 4 } };
}

function waterBowl() {
  const [c, x] = makeCanvas(14, 8);
  x.fillStyle = '#1f4f9a';
  fillEllipse(x, 7, 4, 6, 3);
  x.fillStyle = '#3a7ad0';
  fillEllipse(x, 7, 4, 5, 2);
  x.fillStyle = '#9ad4f4';
  fillEllipse(x, 7, 3, 4, 1);
  x.fillStyle = '#ffffff';
  x.fillRect(5, 3, 2, 1);
  return { img: c, ox: 7, oy: 7, solid: null };
}

function bench() {
  const [c, x] = makeCanvas(28, 16);
  x.fillStyle = '#3a3a3a';
  x.fillRect(3, 9, 2, 7);
  x.fillRect(23, 9, 2, 7);
  x.fillStyle = '#8a5a32';
  x.fillRect(1, 0, 26, 3);
  x.fillRect(1, 4, 26, 3);
  x.fillStyle = '#b07a48';
  x.fillRect(1, 0, 26, 2);
  x.fillRect(1, 4, 26, 2);
  x.fillStyle = '#9a6a3c';
  x.fillRect(0, 8, 28, 3);
  x.fillStyle = '#c08a58';
  x.fillRect(0, 8, 28, 1);
  return { img: c, ox: 14, oy: 15, solid: { w: 26, h: 5 } };
}

function vending() {
  const [c, x] = makeCanvas(16, 26);
  x.fillStyle = '#9a2a24';
  x.fillRect(0, 0, 16, 26);
  x.fillStyle = '#d84a3a';
  x.fillRect(1, 1, 14, 24);
  x.fillStyle = '#e8eef4';
  x.fillRect(2, 3, 12, 9);
  const cols = ['#3a8ad0', '#f0c030', '#40b060', '#e05050', '#f08a30', '#8a5ab0'];
  for (let i = 0; i < 6; i++) {
    x.fillStyle = cols[i];
    x.fillRect(3 + (i % 3) * 4, 4 + Math.floor(i / 3) * 4, 2, 3);
  }
  x.fillStyle = '#2a2a2a';
  x.fillRect(3, 19, 10, 4);
  x.fillStyle = '#f0f0f0';
  x.fillRect(11, 14, 2, 3);
  return { img: c, ox: 8, oy: 25, solid: { w: 14, h: 6 } };
}

function fountain() {
  const [c, x] = makeCanvas(52, 40);
  x.fillStyle = '#7a766e';
  fillEllipse(x, 26, 28, 25, 11);
  x.fillStyle = '#c8c4bc';
  fillEllipse(x, 26, 27, 24, 10);
  x.fillStyle = '#4a98d0';
  fillEllipse(x, 26, 27, 20, 7);
  x.fillStyle = '#7ac0ec';
  fillEllipse(x, 26, 26, 17, 5);
  // 真ん中の柱と水しぶき
  x.fillStyle = '#a8a49c';
  x.fillRect(23, 10, 6, 17);
  x.fillStyle = '#d8d4cc';
  x.fillRect(23, 10, 2, 17);
  x.fillStyle = '#c8ecff';
  fillEllipse(x, 26, 9, 8, 3);
  x.fillRect(25, 2, 2, 7);
  x.fillStyle = '#ffffff';
  x.fillRect(25, 1, 2, 2);
  x.fillRect(19, 8, 2, 1);
  x.fillRect(31, 8, 2, 1);
  return { img: c, ox: 26, oy: 38, solid: { w: 48, h: 18 } };
}

function flowerpot() {
  const [c, x] = makeCanvas(10, 12);
  x.fillStyle = '#3c8a3a';
  fillCircle(x, 5, 4, 4);
  x.fillStyle = '#f07890';
  x.fillRect(2, 2, 2, 2);
  x.fillRect(6, 1, 2, 2);
  x.fillStyle = '#f0d040';
  x.fillRect(4, 4, 2, 2);
  x.fillStyle = '#a85a30';
  x.fillRect(1, 7, 8, 5);
  x.fillStyle = '#c8784a';
  x.fillRect(1, 7, 8, 1);
  return { img: c, ox: 5, oy: 11, solid: { w: 8, h: 4 } };
}

export const PROPS = {};

export function buildProps() {
  Object.assign(PROPS, {
    tree: tree(),
    scratch: scratchPole(),
    water: waterBowl(),
    bench: bench(),
    vending: vending(),
    fountain: fountain(),
    flowerpot: flowerpot(),
  });
}
