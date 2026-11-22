// 街の小物（木・爪とぎ電柱・水皿・猫砂・ベンチ・自販機・噴水・植木鉢・公園の遊具）と、家の家具（ソファ・テレビ・テーブル・台所・冷蔵庫・三段ケージ・キャットタワー）
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

// 水飲みのお皿（青い肉球のもようの白い器に、たっぷりの水）
function waterBowl() {
  const [c, x] = makeCanvas(18, 16);
  // 器（白い陶器、下がすぼまる）
  x.fillStyle = '#3a2a20';
  x.fillRect(1, 8, 16, 1);
  x.fillRect(0, 9, 18, 3);
  x.fillRect(1, 12, 16, 2);
  x.fillRect(3, 14, 12, 2);
  x.fillStyle = '#f6f2ea';
  x.fillRect(1, 11, 16, 1);
  x.fillRect(2, 12, 14, 2);
  x.fillRect(4, 14, 10, 1);
  x.fillStyle = '#d8d0c4';
  x.fillRect(4, 13, 10, 1); // かげ
  // 器のふちと、水
  x.fillStyle = '#e8e0d4';
  x.fillRect(1, 9, 16, 2);
  x.fillStyle = '#3a8ad0';
  x.fillRect(2, 9, 14, 2);
  x.fillStyle = '#9ad4f4';
  x.fillRect(4, 9, 4, 1);
  x.fillRect(11, 10, 3, 1);
  // 器のもよう（青い肉球）
  x.fillStyle = '#4aa0e0';
  x.fillRect(8, 12, 2, 2);
  x.fillRect(7, 12, 1, 1);
  x.fillRect(10, 12, 1, 1);
  return { img: c, ox: 9, oy: 15, solid: null };
}

// 猫砂のトイレ（水色の箱に砂）
function litterBox() {
  const [c, x] = makeCanvas(18, 11);
  x.fillStyle = '#2a5a7a';
  x.fillRect(0, 2, 18, 9);
  x.fillStyle = '#5aa8d8';
  x.fillRect(1, 3, 16, 7);
  x.fillStyle = '#8ccaee';
  x.fillRect(1, 3, 16, 1);
  // 砂
  x.fillStyle = '#e8d6a8';
  x.fillRect(2, 0, 14, 5);
  x.fillStyle = '#2a5a7a';
  x.fillRect(1, 0, 1, 3);
  x.fillRect(16, 0, 1, 3);
  x.fillStyle = '#c8b080';
  for (const [sx, sy] of [[4, 1], [8, 2], [12, 1], [6, 3], [14, 3], [10, 0]]) x.fillRect(sx, sy, 1, 1);
  x.fillStyle = '#fff4d8';
  x.fillRect(3, 0, 3, 1);
  return { img: c, ox: 9, oy: 9, solid: null };
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

// ---- 家の家具（チュートリアル） ----

// テレビ台と大きいテレビ（ソファの方を向いている）
function tv() {
  const [c, x] = makeCanvas(48, 36);
  x.fillStyle = '#1e1e24';
  x.fillRect(2, 0, 44, 24); // 画面のふち
  x.fillStyle = '#3a5a7a';
  x.fillRect(4, 2, 40, 19);
  // 映っているもの（青空と草原、ねこじゃらし）
  x.fillStyle = '#7ab8e0';
  x.fillRect(4, 2, 40, 11);
  x.fillStyle = '#6aaa50';
  x.fillRect(4, 13, 40, 8);
  x.fillStyle = '#f6f2ea';
  x.fillRect(10, 5, 6, 2);
  x.fillRect(12, 4, 3, 1);
  x.fillStyle = '#c8b060';
  x.fillRect(30, 8, 1, 9);
  x.fillRect(29, 6, 3, 3);
  x.fillStyle = '#b0d8f0';
  x.fillRect(5, 3, 8, 1); // 光の反射
  x.fillRect(5, 4, 2, 2);
  x.fillStyle = '#1e1e24';
  x.fillRect(21, 24, 6, 3); // 足
  x.fillStyle = '#e04848';
  x.fillRect(42, 22, 1, 1); // 電源ランプ
  // テレビ台
  x.fillStyle = '#5a3c24';
  x.fillRect(0, 26, 48, 10);
  x.fillStyle = '#8a6440';
  x.fillRect(0, 26, 48, 2);
  x.fillStyle = '#6a4a30';
  x.fillRect(2, 29, 21, 6);
  x.fillRect(25, 29, 21, 6);
  x.fillStyle = '#c8a070';
  x.fillRect(21, 31, 1, 2);
  x.fillRect(26, 31, 1, 2);
  return { img: c, ox: 24, oy: 35, solid: { w: 48, h: 8 } };
}

// ソファのうしろ姿（テレビの方を向いている）
function sofaBack() {
  const [c, x] = makeCanvas(48, 22);
  x.fillStyle = '#2f5a48';
  x.fillRect(0, 0, 48, 20);
  x.fillStyle = '#3e7a5c';
  x.fillRect(1, 1, 46, 18);
  x.fillStyle = '#4a8a6a';
  x.fillRect(1, 1, 6, 18); // ひじかけ
  x.fillRect(41, 1, 6, 18);
  x.fillStyle = '#5aa07c';
  x.fillRect(1, 1, 46, 2);
  x.fillStyle = '#356a50'; // 背もたれのぬい目
  x.fillRect(24, 4, 1, 14);
  x.fillStyle = '#f0c060'; // 上からのぞくクッション
  x.fillRect(10, 0, 8, 2);
  x.fillStyle = '#2a1d17';
  x.fillRect(3, 20, 2, 2);
  x.fillRect(43, 20, 2, 2);
  return { img: c, ox: 24, oy: 21, solid: { w: 48, h: 10 } };
}

// ひくいテーブル（みかんつき）
function lowTable() {
  const [c, x] = makeCanvas(30, 14);
  x.fillStyle = '#6a4428';
  x.fillRect(0, 0, 30, 9);
  x.fillStyle = '#a87448';
  x.fillRect(1, 1, 28, 6);
  x.fillStyle = '#c08a58';
  x.fillRect(1, 1, 28, 1);
  x.fillStyle = '#6a4428';
  x.fillRect(2, 9, 3, 5);
  x.fillRect(25, 9, 3, 5);
  x.fillStyle = '#f08a20';
  fillCircle(x, 10, 3, 2);
  fillCircle(x, 15, 4, 2);
  x.fillStyle = '#4a9a3c';
  x.fillRect(10, 1, 1, 1);
  x.fillRect(15, 2, 1, 1);
  return { img: c, ox: 15, oy: 13, solid: { w: 30, h: 6 } };
}

// 台所（流しとコンロ）
function counter() {
  const [c, x] = makeCanvas(56, 26);
  x.fillStyle = '#8a8a90';
  x.fillRect(0, 0, 56, 26);
  x.fillStyle = '#d8d8dc';
  x.fillRect(1, 1, 54, 8); // 天板
  x.fillStyle = '#f0f0f2';
  x.fillRect(1, 1, 54, 1);
  x.fillStyle = '#9a9aa2';
  x.fillRect(6, 3, 16, 5); // 流し
  x.fillStyle = '#7ab8d8';
  x.fillRect(7, 4, 14, 3);
  x.fillStyle = '#2a2a30';
  fillCircle(x, 36, 5, 2); // コンロ
  fillCircle(x, 46, 5, 2);
  x.fillStyle = '#e8e0d0';
  x.fillRect(1, 10, 54, 15); // 戸棚
  x.fillStyle = '#b8ae9a';
  for (const dx of [1, 19, 37]) x.fillRect(dx + 17, 10, 1, 15);
  x.fillStyle = '#8a8070';
  for (const dx of [14, 22, 32, 40]) x.fillRect(dx, 16, 2, 1);
  return { img: c, ox: 28, oy: 25, solid: { w: 56, h: 10 } };
}

function fridge() {
  const [c, x] = makeCanvas(18, 34);
  x.fillStyle = '#7a8a92';
  x.fillRect(0, 0, 18, 34);
  x.fillStyle = '#e8f0f2';
  x.fillRect(1, 1, 16, 32);
  x.fillStyle = '#c8d4d8';
  x.fillRect(1, 12, 16, 1);
  x.fillRect(15, 3, 1, 6);
  x.fillRect(15, 15, 1, 8);
  x.fillStyle = '#f07890'; // マグネット
  x.fillRect(4, 4, 2, 2);
  x.fillStyle = '#f0c030';
  x.fillRect(7, 18, 2, 2);
  return { img: c, ox: 9, oy: 33, solid: { w: 18, h: 8 } };
}

// ダイニングテーブルと いす2つ
function diningTable() {
  const [c, x] = makeCanvas(36, 26);
  x.fillStyle = '#6a4428';
  x.fillRect(3, 0, 6, 8); // 奥のいす
  x.fillRect(27, 0, 6, 8);
  x.fillStyle = '#5a3a24';
  x.fillRect(0, 7, 36, 12);
  x.fillStyle = '#b07c4c';
  x.fillRect(1, 8, 34, 9);
  x.fillStyle = '#c8935e';
  x.fillRect(1, 8, 34, 1);
  x.fillStyle = '#f6f2ea'; // お皿
  x.fillRect(8, 11, 6, 3);
  x.fillRect(22, 11, 6, 3);
  x.fillStyle = '#5a3a24';
  x.fillRect(2, 19, 3, 7);
  x.fillRect(31, 19, 3, 7);
  return { img: c, ox: 18, oy: 25, solid: { w: 36, h: 9 } };
}

// 三段ケージ（てらまるのおうち）：白い金網、段ごとの棚、ハンモックとベッド
function cage() {
  const [c, x] = makeCanvas(30, 54);
  x.fillStyle = '#e8e4dc';
  x.fillRect(0, 50, 30, 4); // 台（キャスター）
  x.fillStyle = '#5a5a60';
  x.fillRect(2, 53, 2, 1);
  x.fillRect(26, 53, 2, 1);
  // 中（うすい影）
  x.fillStyle = '#d8d0c4';
  x.fillRect(1, 1, 28, 49);
  // 棚（3段）
  x.fillStyle = '#c8a070';
  for (const y of [16, 33]) { x.fillRect(1, y, 18, 3); }
  x.fillStyle = '#a87c50';
  for (const y of [18, 35]) x.fillRect(1, y, 18, 1);
  // 上の段：ハンモック
  x.fillStyle = '#f07890';
  x.fillRect(5, 9, 18, 2);
  x.fillRect(7, 11, 14, 2);
  x.fillStyle = '#ffffff';
  x.fillRect(9, 9, 2, 2);
  x.fillRect(15, 11, 2, 2);
  // まん中：はしご
  x.fillStyle = '#c8a070';
  x.fillRect(22, 19, 1, 14);
  x.fillRect(26, 19, 1, 14);
  for (let y = 21; y < 33; y += 3) x.fillRect(22, y, 5, 1);
  // 下の段：ベッド
  x.fillStyle = '#7a9ac8';
  x.fillRect(4, 43, 16, 6);
  x.fillStyle = '#f6f2ea';
  x.fillRect(6, 44, 12, 3);
  // 金網（白い格子）
  x.fillStyle = '#ffffff';
  for (let xx = 0; xx < 30; xx += 3) x.fillRect(xx, 0, 1, 50);
  x.fillRect(0, 0, 30, 1);
  x.fillRect(0, 17, 30, 1);
  x.fillRect(0, 34, 30, 1);
  x.fillStyle = '#9a9690'; // ふち
  x.fillRect(0, 0, 1, 50);
  x.fillRect(29, 0, 1, 50);
  x.fillRect(0, 49, 30, 1);
  return { img: c, ox: 15, oy: 53, solid: { w: 30, h: 8 } };
}

// キャットタワー（麻ひもの柱、3つの台、ぶら下がるボール）
function catTower() {
  const [c, x] = makeCanvas(22, 44);
  x.fillStyle = '#dcc488';
  x.fillRect(9, 6, 4, 36); // 柱（麻ひも）
  x.fillStyle = '#b89a5c';
  for (let y = 7; y < 42; y += 2) x.fillRect(9, y, 4, 1);
  x.fillStyle = '#8a5a3a';
  x.fillRect(1, 2, 20, 5); // 上の台
  x.fillRect(0, 22, 14, 4); // 中の台
  x.fillRect(2, 40, 18, 4); // 土台
  x.fillStyle = '#c87850';
  x.fillRect(2, 2, 18, 3);
  x.fillRect(1, 22, 12, 2);
  x.fillRect(3, 40, 16, 2);
  x.fillStyle = '#f6f2ea'; // ぶら下がるボール
  x.fillRect(17, 26, 1, 4);
  x.fillStyle = '#f07890';
  x.fillRect(16, 30, 3, 3);
  return { img: c, ox: 11, oy: 43, solid: { w: 18, h: 5 } };
}

// 三段ケージを横から見たところ（壁ぎわに90度まわして置く）：奥行きだけの細い姿
function cageSide() {
  const [c, x] = makeCanvas(20, 54);
  x.fillStyle = '#e8e4dc';
  x.fillRect(0, 50, 20, 4); // 台
  x.fillStyle = '#5a5a60';
  x.fillRect(1, 53, 2, 1);
  x.fillRect(17, 53, 2, 1);
  x.fillStyle = '#d8d0c4';
  x.fillRect(1, 1, 18, 49);
  // 棚（横から見ると細い板）
  x.fillStyle = '#c8a070';
  x.fillRect(1, 16, 12, 2);
  x.fillRect(7, 33, 12, 2);
  // 上の段：ハンモック（横から見ると、たれた布）
  x.fillStyle = '#f07890';
  x.fillRect(3, 8, 1, 2);
  x.fillRect(16, 8, 1, 2);
  x.fillRect(4, 10, 2, 1);
  x.fillRect(14, 10, 2, 1);
  x.fillRect(6, 11, 8, 2);
  // はしご（ななめ）
  x.fillStyle = '#c8a070';
  for (let i = 0; i < 14; i++) x.fillRect(14 - Math.floor(i / 3), 19 + i, 1, 1);
  for (let i = 0; i < 14; i++) x.fillRect(17 - Math.floor(i / 3), 19 + i, 1, 1);
  // 下の段：ベッド
  x.fillStyle = '#7a9ac8';
  x.fillRect(3, 44, 12, 5);
  x.fillStyle = '#f6f2ea';
  x.fillRect(5, 45, 8, 2);
  // 金網
  x.fillStyle = '#ffffff';
  for (let xx = 0; xx < 20; xx += 3) x.fillRect(xx, 0, 1, 50);
  x.fillRect(0, 0, 20, 1);
  x.fillRect(0, 17, 20, 1);
  x.fillRect(0, 34, 20, 1);
  x.fillStyle = '#9a9690';
  x.fillRect(0, 0, 1, 50);
  x.fillRect(19, 0, 1, 50);
  x.fillRect(0, 49, 20, 1);
  return { img: c, ox: 10, oy: 53, solid: { w: 20, h: 10 } };
}

// ---- 住宅地 ----

// 生け垣（家の前の、低い植えこみ）
function hedge() {
  const [c, x] = makeCanvas(16, 11);
  x.fillStyle = '#2f6e2a';
  x.fillRect(0, 3, 16, 8);
  x.fillRect(1, 2, 14, 1);
  x.fillStyle = '#4c9a3c';
  x.fillRect(1, 3, 14, 6);
  x.fillStyle = '#6cbc52';
  for (const [hx, hy] of [[2, 3], [6, 4], [10, 3], [13, 5], [4, 6], [9, 6]]) x.fillRect(hx, hy, 2, 1);
  x.fillStyle = '#5a3a24';
  x.fillRect(0, 9, 16, 2);
  return { img: c, ox: 8, oy: 10, solid: { w: 16, h: 4 } };
}

// 郵便ポスト（赤くて丸い頭）
function mailbox() {
  const [c, x] = makeCanvas(10, 18);
  x.fillStyle = '#7a1818';
  x.fillRect(1, 1, 8, 13);
  x.fillRect(2, 0, 6, 1);
  x.fillStyle = '#d83a30';
  x.fillRect(2, 1, 6, 12);
  x.fillStyle = '#f07060';
  x.fillRect(2, 1, 6, 1);
  x.fillStyle = '#3a1010';
  x.fillRect(3, 4, 4, 1); // 投入口
  x.fillStyle = '#ffffff';
  x.fillRect(3, 8, 4, 2); // 〒のふだ
  x.fillStyle = '#d83a30';
  x.fillRect(4, 8, 2, 1);
  x.fillStyle = '#3a3a3a';
  x.fillRect(4, 14, 2, 4);
  return { img: c, ox: 5, oy: 17, solid: { w: 6, h: 4 } };
}

// 止めてある自転車（横向き）
function bicycle() {
  const [c, x] = makeCanvas(22, 14);
  const wheel = (cx) => {
    x.fillStyle = '#2a2a30';
    x.fillRect(cx - 3, 6, 7, 1);
    x.fillRect(cx - 3, 12, 7, 1);
    x.fillRect(cx - 4, 7, 1, 5);
    x.fillRect(cx + 4, 7, 1, 5);
    x.fillStyle = '#a8a8b0';
    x.fillRect(cx, 7, 1, 5);
    x.fillRect(cx - 3, 9, 7, 1);
  };
  wheel(5);
  wheel(17);
  x.fillStyle = '#3a8ad0'; // フレーム
  x.fillRect(5, 9, 6, 1);
  x.fillRect(10, 5, 1, 5);
  x.fillRect(10, 5, 6, 1);
  x.fillRect(15, 5, 1, 4);
  x.fillRect(11, 8, 5, 1);
  x.fillStyle = '#2a2a30';
  x.fillRect(8, 3, 4, 2); // サドル
  x.fillRect(15, 2, 1, 3); // ハンドル
  x.fillRect(14, 1, 4, 1);
  x.fillStyle = '#c8c8d0';
  x.fillRect(17, 2, 3, 3); // かご
  return { img: c, ox: 11, oy: 13, solid: { w: 18, h: 4 } };
}

// ---- 公園の遊具（ブランコ・すべり台・砂場・ジャングルジム） ----
const INK = '#2a1d17';
// 1ドットのふちを付けた四角
function boxO(x, X, Y, w, h, col) {
  x.fillStyle = INK;
  x.fillRect(X - 1, Y - 1, w + 2, h + 2);
  x.fillStyle = col;
  x.fillRect(X, Y, w, h);
}

// ブランコ：赤い柱の門と、くさりでつった座席2つ
function swing() {
  const [c, x] = makeCanvas(46, 40);
  const pole = '#d04a3a';
  // 柱（左右とも ハの字の2本）
  for (const [x0, dir] of [[3, 1], [42, -1]]) {
    for (let y = 2; y < 38; y++) {
      const off = Math.floor((38 - y) / 10) * dir;
      x.fillStyle = INK;
      x.fillRect(x0 + off - 1, y, 4, 1);
      x.fillStyle = pole;
      x.fillRect(x0 + off, y, 2, 1);
    }
  }
  boxO(x, 2, 2, 42, 3, pole); // 上の横棒
  // くさりと座席
  for (const sx of [12, 28]) {
    x.fillStyle = '#8a8a92';
    for (let y = 6; y < 27; y += 2) { x.fillRect(sx, y, 1, 1); x.fillRect(sx + 6, y, 1, 1); }
    boxO(x, sx - 1, 27, 9, 2, '#f0c040');
  }
  return { img: c, ox: 23, oy: 38, solid: { w: 44, h: 3 } };
}

// すべり台：右にはしご、上に台、左へすべる面
function slide() {
  const [c, x] = makeCanvas(52, 40);
  const metal = '#5aa0d8';
  // すべる面（左下へ）
  for (let i = 0; i < 30; i++) {
    const X = 6 + i;
    const Y = 36 - Math.floor(i * 0.9);
    x.fillStyle = INK;
    x.fillRect(X, Y - 1, 1, 6);
    x.fillStyle = '#f0c040';
    x.fillRect(X, Y, 1, 4);
  }
  x.fillStyle = INK;
  x.fillRect(2, 33, 6, 6);
  x.fillStyle = '#f0c040';
  x.fillRect(3, 34, 5, 4);
  // 台
  boxO(x, 34, 8, 12, 3, metal);
  // 柱
  boxO(x, 35, 11, 2, 27, metal);
  boxO(x, 44, 11, 2, 27, metal);
  // てすり
  boxO(x, 34, 2, 1, 6, metal);
  boxO(x, 45, 2, 1, 6, metal);
  boxO(x, 34, 2, 12, 1, metal);
  // はしごの段
  x.fillStyle = INK;
  for (let y = 15; y < 37; y += 5) x.fillRect(37, y, 7, 2);
  x.fillStyle = '#d8d8e0';
  for (let y = 15; y < 37; y += 5) x.fillRect(37, y, 7, 1);
  return { img: c, ox: 26, oy: 38, solid: { w: 46, h: 4 } };
}

// 砂場：木のわくの中に砂。バケツとシャベル（上を歩ける）
function sandbox() {
  const [c, x] = makeCanvas(48, 26);
  boxO(x, 1, 1, 46, 24, '#a87848'); // わく
  x.fillStyle = '#ecd8a6';
  x.fillRect(4, 4, 40, 18); // 砂
  x.fillStyle = '#dcc28a';
  for (const [X, Y] of [[8, 7], [20, 14], [33, 9], [14, 18], [38, 17], [27, 6]]) x.fillRect(X, Y, 3, 1);
  // 砂山
  x.fillStyle = '#dcc28a';
  x.fillRect(10, 11, 9, 3);
  x.fillRect(12, 9, 5, 2);
  // バケツ（赤）とシャベル（青）
  boxO(x, 31, 12, 6, 6, '#e05a5a');
  x.fillStyle = INK;
  x.fillRect(31, 11, 6, 1);
  boxO(x, 22, 17, 6, 2, '#4a8ad0');
  boxO(x, 27, 16, 3, 4, '#4a8ad0');
  return { img: c, ox: 24, oy: 25, solid: null };
}

// ジャングルジム：色つきの鉄の棒を組んだ立方体
function jungleGym() {
  const [c, x] = makeCanvas(40, 40);
  const cols = ['#e05a5a', '#f0c040', '#4a8ad0', '#5ab060'];
  // うしろの面（少し上・右にずらす）と前の面
  const grid = (ox, oy, col) => {
    for (let i = 0; i < 4; i++) {
      boxO(x, ox + i * 10, oy, 2, 30, col);
      boxO(x, ox, oy + i * 10, 32, 2, cols[(i + 1) % 4]);
    }
  };
  grid(6, 2, cols[2]);
  grid(1, 7, cols[0]);
  return { img: c, ox: 18, oy: 39, solid: { w: 34, h: 5 } };
}

export const PROPS = {};

export function buildProps() {
  Object.assign(PROPS, {
    tree: tree(),
    scratch: scratchPole(),
    water: waterBowl(),
    litter: litterBox(),
    bench: bench(),
    vending: vending(),
    fountain: fountain(),
    flowerpot: flowerpot(),
    sofaBack: sofaBack(),
    tv: tv(),
    lowTable: lowTable(),
    counter: counter(),
    fridge: fridge(),
    diningTable: diningTable(),
    cage: cage(),
    hedge: hedge(),
    mailbox: mailbox(),
    bicycle: bicycle(),
    cageSide: cageSide(),
    catTower: catTower(),
    swing: swing(),
    slide: slide(),
    sandbox: sandbox(),
    jungleGym: jungleGym(),
  });
}
