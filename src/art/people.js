// 人のドット絵
// - 街で見る小さい姿（makePerson）：look から機械的に描いて、まわりに縁取りを付ける
// - てらまりんぐ画面の足元（drawLegs / drawGarment）：2倍の大きさで、足・靴・杖・すそを描く

import { makeCanvas, shade } from '../core/renderer.js';
import { UI } from './palette.js';
import { drawAnimalLeg, drawAnimalBody } from './animals.js';

export const INK = '#2a1d17';
const WHITE = '#f6f2ea';

function outline(c, ctx) {
  const w = c.width;
  const h = c.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const add = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push([x, y]);
    }
  }
  ctx.fillStyle = INK;
  for (const [x, y] of add) ctx.fillRect(x, y, 1, 1);
}

// ---- 頭（顔がわかる大きさ：はば10・高さ10。目は2×2で光が入る、口・ほっぺ） ----
// y0 は髪のいちばん上。mood：'smile'（ふつう、にこっ）| 'happy'（口をあけて笑う。なでなで）
// look のオプション：glasses（メガネのふちの色。目のまわりに丸いふち）・longHair（肩までの髪）・
//   ponytail（ポニーテール）・bun（おだんご）・mustache（口ひげの色）・hat（chef | cap | band）
const CHEEK = '#f4a8a0';
const MOUTH = '#a05a4a'; // 口（赤すぎると血に見えるので、茶色がかった色）
const SMILE = '#6a3a30'; // 笑った口の線
function drawHead(R, look, y0, mood = 'smile') {
  const H = look.hair;
  // うしろ髪（顔より先に描く）
  if (look.longHair) {
    R(0, y0 + 5, 1, 6, H);
    R(11, y0 + 5, 1, 6, H);
    R(1, y0 + 4, 1, 8, H);
    R(10, y0 + 4, 1, 8, H);
  }
  if (look.ponytail) {
    R(10, y0 + 1, 2, 3, H);
    R(11, y0 + 4, 1, 5, H);
  }
  // 髪
  R(3, y0, 6, 1, H);
  R(2, y0 + 1, 8, 1, H);
  R(1, y0 + 2, 10, 1, H);
  R(1, y0 + 3, 3, 1, H); // 前髪（まん中で分ける）
  R(8, y0 + 3, 3, 1, H);
  R(1, y0 + 4, 1, 2, H);
  R(10, y0 + 4, 1, 2, H);
  // 顔
  R(4, y0 + 3, 4, 1, look.skin);
  R(2, y0 + 4, 8, 4, look.skin);
  R(1, y0 + 6, 1, 1, look.skin); // 耳
  R(10, y0 + 6, 1, 1, look.skin);
  R(3, y0 + 8, 6, 1, look.skin); // あご
  R(5, y0 + 9, 2, 1, look.skin); // 首
  if (look.longHair) { R(1, y0 + 6, 1, 1, H); R(10, y0 + 6, 1, 1, H); }
  // 目（2×2、左上に光）
  for (const ex of [3, 7]) {
    R(ex, y0 + 5, 2, 2, INK);
    R(ex, y0 + 5, 1, 1, '#ffffff');
  }
  // ほっぺと口
  R(2, y0 + 7, 1, 1, CHEEK);
  R(9, y0 + 7, 1, 1, CHEEK);
  if (mood === 'happy') {
    // にっこり：口の線だけ（中は塗らない）
    R(4, y0 + 7, 1, 1, SMILE);
    R(7, y0 + 7, 1, 1, SMILE);
    R(5, y0 + 8, 2, 1, SMILE);
  } else {
    R(5, y0 + 8, 2, 1, MOUTH);
  }
  if (look.mustache) R(4, y0 + 7, 4, 1, look.mustache); // 口ひげ
  // メガネ：目のまわりに丸いふち（左右の四角の角を落とす）
  if (look.glasses) {
    const G = look.glasses;
    for (const gx of [2, 6]) {
      R(gx + 1, y0 + 4, 2, 1, G);
      R(gx + 1, y0 + 7, 2, 1, G);
      R(gx, y0 + 5, 1, 2, G);
      R(gx + 3, y0 + 5, 1, 2, G);
    }
    R(1, y0 + 5, 1, 1, G); // つる
    R(10, y0 + 5, 1, 1, G);
  }
  if (look.bun) R(5, y0 - 2, 2, 2, H);
  if (look.hat === 'chef') {
    R(2, y0 - 2, 8, 2, WHITE);
    R(3, y0, 6, 2, WHITE);
  }
  if (look.hat === 'cap') {
    R(2, y0, 8, 2, look.capColor);
    R(1, y0 + 2, 10, 1, look.capColor);
  }
  if (look.hat === 'band') R(1, y0 + 2, 10, 1, look.bandColor ?? WHITE);
}

export const PERSON_W = 14;
export const PERSON_H = 29;
const DY = 3; // 頭を大きくした分、体と足を下げる

// 街の姿（14×29、足元が下の真ん中）。step=true で片足を上げたコマ
export function makePerson(look, step = false) {
  const [c, ctx] = makeCanvas(PERSON_W, PERSON_H);
  const R0 = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, w, h); };
  const R = (x, y, w, h, col) => R0(x, y + DY, w, h, col); // 体と足
  const lift = step ? 1 : 0;

  // 足
  if (look.child) {
    R(3, 19, 6, 2, look.bottom); // 半ズボン
    R(3, 21, 2, 1 - lift, look.legs);
    R(7, 21, 2, 1, look.legs);
    R(3, 22 - lift, 2, 1, look.socks);
    R(7, 22, 2, 1, look.socks);
    R(2, 23 - lift, 4, 1, look.shoes);
    R(6, 23, 4, 1, look.shoes);
  } else if (look.garment === 'skirt') {
    R(2, 15, 8, 5, look.skirt);
    R(3, 20, 2, 3 - lift, look.legs);
    R(7, 20, 2, 3, look.legs);
    R(2, 23 - lift, 4, 1, look.shoes);
    R(6, 23, 4, 1, look.shoes);
  } else {
    R(3, 17, 3, 6 - lift, look.bottom);
    R(6, 17, 3, 6, shade(look.bottom, -0.15));
    if (look.boots) {
      R(3, 19, 3, 4 - lift, look.shoes);
      R(6, 19, 3, 4, look.shoes);
    }
    R(2, 23 - lift, 4, 1, look.shoes);
    R(6, 23, 4, 1, look.shoes);
  }

  // 体
  const top = look.child ? 15 : 9; // 子どもは体が短くて、背が低い
  const bot = look.child ? 19 : 17;
  R(2, top, 8, bot - top, look.top);
  R(1, top + 1, 1, bot - top - 2, look.top);
  R(10, top + 1, 1, bot - top - 2, look.top);
  R(1, bot - 1, 1, 1, look.skin);
  R(10, bot - 1, 1, 1, look.skin);
  if (look.tie) {
    R(4, top, 1, 1, WHITE);
    R(7, top, 1, 1, WHITE);
    R(5, top, 2, 5, look.tie);
  }
  if (look.garment === 'apron') R(3, top + 2, 6, bot - top - 1, look.apron);
  if (look.garment === 'longApron') R(3, top + 2, 6, 12, look.apron);
  if (look.cane) R(11, 15, 1, 9, look.cane);

  // 頭（首が体のいちばん上に付く）
  drawHead(R0, look, top + DY - 10);

  outline(c, ctx);
  return c;
}

// しゃがんだ姿（なでなで用。14×29、足元が下の真ん中）。向かって左の腕は、のばした腕を別に描くので無し。
// 返す canvas の shoulderY に、肩の高さ（ドット）を入れておく
export function makeCrouch(look) {
  const [c, ctx] = makeCanvas(PERSON_W, PERSON_H);
  const R0 = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, w, h); };
  const R = (x, y, w, h, col) => R0(x, y + DY, w, h, col);
  const child = !!look.child;
  const top = child ? 15 : 12;
  const bot = child ? 19 : 17;

  // 足：ひざを左右に開いてしゃがむ
  if (look.garment === 'skirt') {
    R(1, bot - 1, 10, 4, look.skirt);
    R(2, bot + 3, 2, 3, look.legs);
    R(8, bot + 3, 2, 3, look.legs);
  } else {
    const thigh = child ? look.legs : look.bottom;
    if (child) {
      R(2, bot - 1, 8, 2, look.bottom); // 半ズボン
    }
    R(1, bot, 4, 2, child ? look.bottom : thigh);
    R(7, bot, 4, 2, child ? look.bottom : shade(thigh, -0.15));
    R(1, bot + 2, 3, 4, thigh);
    R(8, bot + 2, 3, 4, child ? thigh : shade(thigh, -0.15));
    if (look.socks) { R(1, 22, 3, 1, look.socks); R(8, 22, 3, 1, look.socks); }
    if (look.boots) { R(1, 20, 3, 3, look.shoes); R(8, 20, 3, 3, look.shoes); }
  }
  R(0, 23, 4, 1, look.shoes);
  R(8, 23, 4, 1, look.shoes);

  // 体（少し前かがみで短く）
  R(2, top, 8, bot - top, look.top);
  R(10, top + 1, 1, bot - top - 1, look.top); // 右腕はひざの上
  R(10, bot, 1, 1, look.skin);
  if (look.tie) {
    R(4, top, 1, 1, WHITE);
    R(7, top, 1, 1, WHITE);
    R(5, top, 2, Math.min(5, bot - top), look.tie);
  }
  if (look.garment === 'apron' || look.garment === 'longApron') R(3, top + 2, 6, bot - top, look.apron);
  if (look.cane) R(12, 14, 1, 10, look.cane);

  // 頭（にっこり口をあけて笑う）
  drawHead(R0, look, top + DY - 10, 'happy');

  outline(c, ctx);
  c.shoulderY = top + DY + 2;
  return c;
}

// ---- てらまりんぐ画面（2倍） ----

export const E = (v) => Math.round(v / 2) * 2; // 2ドット単位にそろえる

export function box(ctx, x, y, w, h, col) {
  ctx.fillStyle = INK;
  ctx.fillRect(E(x) - 2, E(y) - 2, E(w) + 4, E(h) + 4);
  ctx.fillStyle = col;
  ctx.fillRect(E(x), E(y), E(w), E(h));
}

// 1本の足（x, y は地面に着いている点。lift は持ち上がっている高さ）
export function drawLeg(ctx, look, leg, x, y, lift, topY) {
  if (leg.pair) {
    // 2本でひとまとまり（家族の1人の足）
    // lift が [左, 右] なら、1本ずつ上げる（子どもの足ぶみ）
    leg.pair.forEach((dx, i) => drawLeg(ctx, look, { ...leg, pair: null }, x + dx, y, Array.isArray(lift) ? lift[i] : lift, topY));
    return;
  }
  if (look.type) { drawAnimalLeg(ctx, look, leg, x, y, lift); return; }
  const fy = y - lift;
  if (lift > 0.5) {
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(E(x) - 8, E(y) - 2, 16, 4);
  }
  if (leg.cane) {
    box(ctx, x - 2, topY, 4, fy - topY - 4, look.cane);
    box(ctx, x - 2, fy - 4, 4, 4, INK);
    return;
  }
  const legCol = look.garment === 'skirt' || look.child ? look.legs : look.bottom;
  const legW = look.garment === 'skirt' || look.child ? 8 : 12;
  box(ctx, x - legW / 2, topY, legW, fy - topY - 6, legCol);
  ctx.fillStyle = shade(legCol, -0.18);
  ctx.fillRect(E(x - legW / 2) + legW - 2, E(topY), 2, E(fy - topY - 6));
  if (look.socks) {
    ctx.fillStyle = look.socks;
    ctx.fillRect(E(x - legW / 2), E(fy) - 12, legW, 6);
  }
  if (look.boots) {
    box(ctx, x - 7, fy - 30, 14, 24, look.shoes);
    ctx.fillStyle = shade(look.shoes, 0.25);
    ctx.fillRect(E(x - 7) + 2, E(fy - 30) + 2, 2, 20);
  }
  // 靴（つま先が手前）
  box(ctx, x - 8, fy - 8, 16, 8, look.shoes);
  ctx.fillStyle = shade(look.shoes, 0.3);
  ctx.fillRect(E(x - 8) + 2, E(fy - 8), 6, 2);
}

// 足の上にかぶさる服のすそ（体ごと動くので bx でずらす）
export function drawGarment(ctx, look, cx, bx, by = 0, ground = 112) {
  if (look.type) { drawAnimalBody(ctx, look, cx, bx, by, ground); return; }
  const x = cx + bx;
  switch (look.garment) {
    case 'coat':
      box(ctx, x - 34, -4, 68, 30, look.top);
      ctx.fillStyle = shade(look.top, -0.25);
      ctx.fillRect(E(x) - 2, 0, 2, 24);
      break;
    case 'apron':
      box(ctx, x - 32, -4, 64, 22, look.top);
      box(ctx, x - 26, -4, 52, 34, look.apron);
      break;
    case 'longApron':
      box(ctx, x - 30, -4, 60, 18, look.top);
      box(ctx, x - 28, -4, 56, 50, look.apron);
      ctx.fillStyle = shade(look.apron, 0.2);
      ctx.fillRect(E(x - 28) + 4, 0, 2, 40);
      break;
    case 'skirt':
      box(ctx, x - 36, -4, 66, 42, look.skirt);
      ctx.fillStyle = shade(look.skirt, -0.2);
      for (let i = 0; i < 5; i++) ctx.fillRect(E(x - 30 + i * 12), 6, 2, 30);
      break;
    case 'shorts':
      box(ctx, x - 22, -4, 44, 26, look.bottom);
      ctx.fillStyle = shade(look.bottom, -0.25);
      ctx.fillRect(E(x) - 2, 8, 2, 14);
      break;
    default:
      break;
  }
}

// 落とし物（ご飯）の小さい絵
// てらまりんぐ画面では2倍で描く
export const FOOD_ROWS = {
  // パン屋さん：食パン（1枚）
  bread: {
    rows: [
      '.oooooooo.',
      'occcccccco',
      'ocwwwwwwco',
      'ocwlwwwwco',
      '.ocwwwwco.',
      '.ocwwwwco.',
      '.ocwwwwco.',
      '.occcccco.',
      '.oooooooo.',
    ],
    pal: { o: INK, c: '#c8823a', w: '#fbecc8', l: '#fff8e8' },
  },
  // おばあちゃん：おにぎり
  onigiri: {
    rows: [
      '....oo....',
      '...owwo...',
      '..owwwwo..',
      '.owlwwwwo.',
      '.owwwwwwo.',
      'owwbbbbwwo',
      'owbbbbbbwo',
      'owbbbbbbwo',
      '.oooooooo.',
    ],
    pal: { o: INK, w: '#fbf8f0', l: '#ffffff', b: '#2f3a30' },
  },
  // 子ども：包み紙のあめ
  candy: {
    rows: [
      'oo..ooo..oo',
      'oyoorrrooyo',
      'oyyrwrrryyo',
      'oyoorrrooyo',
      'oo..ooo..oo',
    ],
    pal: { o: INK, r: '#f07890', w: UI.white, y: '#f0d040' },
  },
  // 魚屋さん：おさかな
  fish: {
    rows: [
      '....oooo....',
      '..oobbbboo.o',
      '.oebbbbbbobo',
      'obbbbbbbbbto',
      '.ollllllloto',
      '..oolllloo.o',
      '....oooo....',
    ],
    pal: { o: INK, b: '#5a88b8', l: '#d8e4ee', e: '#fbf8f0', t: '#7aa0c8' },
  },
};

// お肉屋さん：ほねつき肉
FOOD_ROWS.meat = {
  rows: [
    '..oooooo.....',
    '.ommmlmmo....',
    'ommmmmmmmo.oo',
    'ommmmmmmmwwwo',
    'ommmmmmmmo.oo',
    '.ommmmmmo....',
    '..oooooo.....',
  ],
  pal: { o: INK, m: '#c0503a', l: '#e88a6a', w: '#f4ead8' },
};

// 八百屋さん：トマト
FOOD_ROWS.tomato = {
  rows: [
    '...o.o...',
    '..ogggo..',
    '.oorgroo.',
    'orrrrrrro',
    'orwrrrrro',
    'orrrrrrro',
    'orrrrrrro',
    '.orrrrro.',
    '..ooooo..',
  ],
  pal: { o: INK, r: '#e04030', g: '#3a9a3a', w: '#ff9a8a' },
};

// 犬：ジャーキー
FOOD_ROWS.jerky = {
  rows: [
    '.ooooooo...',
    'ojjjjjjjoo.',
    'ojljjjjjjjo',
    '.ojjjjjjjjo',
    '..oojjjjjjo',
    '....ooooo..',
  ],
  pal: { o: INK, j: '#a0522d', l: '#c87850' },
};

// 鳩：パンくず（小さなかけらが3つ）
FOOD_ROWS.crumbs = {
  rows: [
    '.oo......',
    'occo..oo.',
    'olco.occo',
    '.oo..oclo',
    '..oo..oo.',
    '.occo....',
    '.oooo....',
  ],
  pal: { o: INK, c: '#d8a868', l: '#f4dca8' },
};

// HUD の「ご飯」アイコン（猫のごはん皿）
export const FOOD_ICON = {
  rows: ['..c.c.c..', '.ccccccc.', 'ooooooooo', 'orrrrrrro', '.orrrrro.', '..ooooo..'],
  pal: { o: INK, c: '#b8783a', r: '#e05050' },
};
