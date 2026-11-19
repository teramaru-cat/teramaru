// 人のドット絵
// - 街で見る小さい姿（makePerson）：look から機械的に描いて、まわりに縁取りを付ける
// - てらまりんぐ画面の足元（drawLegs / drawGarment）：2倍の大きさで、足・靴・杖・すそを描く

import { makeCanvas, shade } from '../core/renderer.js';
import { UI } from './palette.js';

const INK = '#2a1d17';
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

// 街の姿（14×26、足元が下の真ん中）。step=true で片足を上げたコマ
export function makePerson(look, step = false) {
  const [c, ctx] = makeCanvas(14, 26);
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, w, h); };
  const k = look.child ? 5 : 0; // 子どもは頭の位置を下げて小さく
  const lift = step ? 1 : 0;

  // 足
  if (look.child) {
    R(3, 18, 6, 3, look.bottom); // 半ズボン
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
  const top = look.child ? 12 : 9;
  const bot = look.child ? 18 : 17;
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

  // 頭
  R(3, 4 + k, 6, 5, look.skin);
  R(3, 3 + k, 6, 2, look.hair);
  R(2, 4 + k, 1, 3, look.hair);
  R(9, 4 + k, 1, 3, look.hair);
  R(4, 6 + k, 1, 1, INK);
  R(7, 6 + k, 1, 1, INK);
  if (look.bun) R(5, 1 + k, 2, 2, look.hair);
  if (look.hat === 'chef') {
    R(2, 0, 8, 2, WHITE);
    R(3, 2, 6, 2, WHITE);
  }
  if (look.hat === 'cap') {
    R(3, 2 + k, 6, 2, look.capColor);
    R(2, 4 + k, 8, 1, look.capColor);
  }
  if (look.hat === 'band') R(2, 4 + k, 8, 1, look.bandColor ?? WHITE);

  outline(c, ctx);
  return c;
}

// しゃがんだ姿（なでなで用。14×26、足元が下の真ん中）。向かって左の腕は、のばした腕を別に描くので無し。
// 返す canvas の shoulderY に、肩の高さ（ドット）を入れておく
export function makeCrouch(look) {
  const [c, ctx] = makeCanvas(14, 26);
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, w, h); };
  const child = !!look.child;
  const d = child ? 7 : 3; // 頭を下げる量
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

  // 頭
  const k = (child ? 5 : 0) + d - (child ? 5 : 0);
  R(3, 4 + k, 6, 5, look.skin);
  R(3, 3 + k, 6, 2, look.hair);
  R(2, 4 + k, 1, 3, look.hair);
  R(9, 4 + k, 1, 3, look.hair);
  R(4, 6 + k, 1, 1, INK);
  R(7, 6 + k, 1, 1, INK);
  R(5, 8 + k, 2, 1, '#e08080'); // にっこり
  if (look.bun) R(5, 1 + k, 2, 2, look.hair);
  if (look.hat === 'chef') {
    R(2, k, 8, 2, WHITE);
    R(3, 2 + k, 6, 2, WHITE);
  }
  if (look.hat === 'cap') {
    R(3, 2 + k, 6, 2, look.capColor);
    R(2, 4 + k, 8, 1, look.capColor);
  }
  if (look.hat === 'band') R(2, 4 + k, 8, 1, look.bandColor ?? WHITE);

  outline(c, ctx);
  c.shoulderY = top + 2;
  return c;
}

// ---- てらまりんぐ画面（2倍） ----

const E = (v) => Math.round(v / 2) * 2; // 2ドット単位にそろえる

function box(ctx, x, y, w, h, col) {
  ctx.fillStyle = INK;
  ctx.fillRect(E(x) - 2, E(y) - 2, E(w) + 4, E(h) + 4);
  ctx.fillStyle = col;
  ctx.fillRect(E(x), E(y), E(w), E(h));
}

// 1本の足（x, y は地面に着いている点。lift は持ち上がっている高さ）
export function drawLeg(ctx, look, leg, x, y, lift, topY) {
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
export function drawGarment(ctx, look, cx, bx) {
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

// HUD の「ご飯」アイコン（猫のごはん皿）
export const FOOD_ICON = {
  rows: ['..c.c.c..', '.ccccccc.', 'ooooooooo', 'orrrrrrro', '.orrrrro.', '..ooooo..'],
  pal: { o: INK, c: '#b8783a', r: '#e05050' },
};
