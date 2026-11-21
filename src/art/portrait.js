// かまって画面の大きい人（等倍で1ドットずつ描く）
// ドット絵のきまり（docs/ドット絵の研究.md）：ベタ塗り・立体の影なし・ふちは1ドット・左右対称は半分を描いて反転・
// 大きさのちがうドットをまぜない。
//
// 文字の表で描く。左半分だけ書いて mirror() で右半分を作る（顔・体が左右対称になる）。
//   h 髪  s 肌  t 上の服  B ズボン  f くつ  n ネクタイ  W 白（えり・コック帽）  A エプロン
//   K スカート  L 足（肌・タイツ）  S くつした  C 帽子  D はちまき  o ふち・線（INK）
// 最後にまわりへ1ドットのふち（INK）を付ける。

import { makeCanvas } from '../core/renderer.js';

const INK = '#2a1d17';
const WHITE = '#f6f2ea';
const CHEEK = '#f4a8a0';
const MOUTH = '#a05a4a';

const mirror = (rows) => rows.map((r) => r + [...r].reverse().join(''));

// ---- 頭（はば26・高さ23）----
const HEAD = mirror([
  '........hhhhh',
  '......hhhhhhh',
  '.....hhhhhhhh',
  '....hhhhhhhhh',
  '...hhhhhhhhhh',
  '...hhhhhhhhhh',
  '..hhhhhhhhhhh',
  '..hhhhhhhhhhh',
  '..hhhhhhhhhhh',
  '..hhhhhhhhhss',
  '..hhhhhhhssss',
  '..hhhssssssss',
  '..hhsssssssss',
  '.shhsssssssss',
  '.shssssssssss',
  '.ssssssssssss',
  '.ssssssssssss',
  '..sssssssssss',
  '..sssssssssss',
  '...ssssssssss',
  '....sssssssss',
  '.....ssssssss',
  '.......ssssss',
]);
const HEAD_W = 26;
const HEAD_H = 23;

// 髪型・帽子（頭の上に重ねる。y は頭のいちばん上からの行。マイナスは頭より上）
const OVER = {
  // 肩までの髪：耳をかくす前髪の横
  longFront: { y: 11, rows: mirror(['.hhh.........', 'hhhh.........', 'hhh..........', 'hhh..........', 'hhh..........', 'hhh..........', 'hh...........', 'hh...........']) },
  bun: { y: -4, rows: mirror(['...........hh', '..........hhh', '..........hhh', '..........hhh']) },
  cap: {
    y: 0,
    rows: mirror([
      '........CCCCC',
      '......CCCCCCC',
      '.....CCCCCCCC',
      '....CCCCCCCCC',
      '...CCCCCCCCCC',
      '...CCCCCCCCCC',
      '..CCCCCCCCCCC',
      '..ooooooooooo',
      '.CCCCCCCCCCCC',
    ]),
  },
  chef: {
    y: -8,
    rows: mirror([
      '......WWWWWWW',
      '....WWWWWWWWW',
      '...WWWWWWWWWW',
      '...WWWWWWWWWW',
      '...WWWWWWWWWW',
      '....WWWWWWWWW',
      '....WWWWWWWWW',
      '....WWWWWWWWW',
      '....WWWWWWWWW',
      '....WWWWWWWWW',
      '....ooooooooo',
      '...WWWWWWWWWW',
      '...WWWWWWWWWW',
    ]),
  },
  band: { y: 7, rows: mirror(['..DDDDDDDDDDD', '..DDDDDDDDDDD']) },
};

// 頭のうしろ（体より先に描く）
const BACK = {
  // 肩までの髪
  longHair: { x: -1, y: 9, rows: mirror(['hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhhh..........', 'hhh...........', '.hh...........']) },
  // ポニーテール（向かって右うしろ）
  ponytail: {
    x: 22,
    y: 3,
    rows: ['...hh..', '..hhhh.', '.hhhhhh', '.hhhhhh', '..hhhhh', '...hhhh', '...hhhh', '...hhhh', '....hhh', '....hhh', '....hhh', '.....hh', '.....h.'],
  },
};

// ---- 体（はば30）。0〜1 行目が首 ----
const ARM = '..tttottttttttt';
const BODY_ADULT = [
  '............sss',
  '............sss',
  '.....tttttttttt',
  '...tttttttttttt',
  '..ttttttttttttt',
  ...Array(14).fill(ARM),
  '..sssottttttttt',
  '..sssottttttttt',
  '...s.ottttttttt',
];
const PANTS = [...Array(4).fill('.....BBBBBBBBBB'), ...Array(12).fill('.....BBBBBBBBBo'), '....fffffffff..', '...ffffffffff..'];
const SKIRT = [
  '.....KKKKKKKKKK',
  '.....KKKKKKKKKK',
  '....KKKKKKKKKKK',
  '....KKKKKKKKKKK',
  '...KKKKKKKKKKKK',
  '...KKKKKKKKKKKK',
  '..KKKKKKKKKKKKK',
  '..KKKKKKKKKKKKK',
  '..KKKKKKKKKKKKK',
  '........LLL....',
  '........LLL....',
  '........LLL....',
  '........LLL....',
  '.......ffffff..',
  '......fffffff..',
];

const CHILD_ARM = '....tttottttttt';
const BODY_CHILD = [
  '............sss',
  '.......tttttttt',
  '.....tttttttttt',
  '....ttttttttttt',
  ...Array(7).fill(CHILD_ARM),
  '....sssottttttt',
  '....sssottttttt',
  '.......BBBBBBBB',
  '.......BBBBBBBB',
  '.......BBBBBBBo',
  '.......BBBBBBo.',
  '........LLLL...',
  '........LLLL...',
  '........LLLL...',
  '........SSSS...',
  '........SSSS...',
  '.......ffffff..',
  '......fffffff..',
];

// ひざをそろえて座る（正座。正面から見ると、ひざが2つならぶ）。
// 向かって左の腕は、のばした腕を別に描くので消す
const CROUCH_ADULT = [
  '............sss',
  '............sss',
  '.....tttttttttt',
  '...tttttttttttt',
  '..ttttttttttttt',
  ...Array(7).fill(ARM),
  '..sssottttttttt',
  '...s.oBBBBBBBBB',
  '....BBBBBBBBBBB',
  '...BBBBBBBBBBBo',
  '...BBBBBBBBBBBo',
  '...BBBBBBBBBBBo',
  '....BBBBBBBBBo.',
  '......BBBBBBo..',
];
const CROUCH_CHILD = [
  '............sss',
  '.......tttttttt',
  '.....tttttttttt',
  '....ttttttttttt',
  ...Array(4).fill(CHILD_ARM),
  '....sssottttttt',
  '.....s.oBBBBBBB',
  '......BBBBBBBBB',
  '......LLLLLLLLo',
  '......LLLLLLLLo',
  '.......LLLLLLo.',
  '.........LLLo..',
];

// 服のかざり（半分の表に重ねる。y は体の行）
function decorate(rows, look, child) {
  const g = rows.map((r) => [...r]);
  const set = (x, y, ch) => { if (g[y] && g[y][x] !== undefined && g[y][x] !== '.') g[y][x] = ch; };
  if (look.tie) {
    set(12, 2, 'W'); set(13, 2, 'W'); set(13, 3, 'W');
    for (let y = 2; y <= 13; y++) set(14, y, 'n');
  }
  const top = child ? 1 : 2;
  if (look.garment === 'apron' || look.garment === 'longApron') {
    const end = look.garment === 'longApron' ? g.length - 3 : top + 22;
    for (let y = top; y < top + 5; y++) set(10, y, 'A');
    for (let y = top + 5; y <= end; y++) for (let x = 8; x <= 14; x++) set(x, y, 'A');
  }
  if (look.boots) {
    for (let y = 0; y < g.length; y++) for (let x = 0; x < 15; x++) if (g[y][x] === 'B' && y >= g.length - 9) g[y][x] = 'f';
  }
  return g.map((r) => r.join(''));
}

function bodyRows(look, pose) {
  const child = !!look.child;
  let half;
  if (pose === 'crouch') {
    if (child) half = CROUCH_CHILD;
    else if (look.garment === 'skirt') half = CROUCH_ADULT.map((r) => r.replace(/B/g, 'K'));
    else half = CROUCH_ADULT;
  } else if (child) half = BODY_CHILD;
  else half = [...BODY_ADULT, ...(look.garment === 'skirt' ? SKIRT : PANTS)];
  return mirror(decorate(half, look, child));
}

// 顔（目・ほっぺ・口・メガネ・口ひげ）。x, y は頭の左上
function drawFace(g, x0, y0, look, happy) {
  const P = (x, y, ch) => { if (g[y0 + y]) g[y0 + y][x0 + x] = ch; };
  if (happy) {
    for (const [x, y] of [[7, 16], [8, 15], [9, 15], [10, 16], [15, 16], [16, 15], [17, 15], [18, 16]]) P(x, y, 'o');
  } else {
    for (const ex of [8, 16]) {
      for (let y = 14; y <= 16; y++) { P(ex, y, 'o'); P(ex + 1, y, 'o'); }
      P(ex, 14, 'E');
    }
  }
  for (const x of [5, 6, 19, 20]) P(x, 18, 'k');
  for (const [x, y] of [[11, 19], [12, 20], [13, 20], [14, 19]]) P(x, y, 'm');
  if (look.mustache) {
    for (let x = 9; x <= 16; x++) P(x, 18, 'M');
    for (const x of [8, 9, 10, 15, 16, 17]) P(x, 19, 'M');
  }
  if (look.glasses) {
    for (const fx of [6, 14]) {
      for (let x = fx + 1; x <= fx + 4; x++) { P(x, 13, 'G'); P(x, 17, 'G'); }
      for (let y = 14; y <= 16; y++) { P(fx, y, 'G'); P(fx + 5, y, 'G'); }
    }
    P(12, 14, 'G'); P(13, 14, 'G');
    for (const x of [3, 4, 5, 20, 21, 22]) P(x, 14, 'G');
  }
}

// 人を描く。pose：'stand' | 'crouch'
export function makePortrait(look, pose = 'stand') {
  // pose：'stand'（立ち）| 'crouch'（正座でなでる）| 'standPet'（立ったまま なでる。腰の悪いおばあちゃん）
  const happy = pose !== 'stand';
  const body = bodyRows(look, pose === 'standPet' ? 'stand' : pose);
  const TOP = 9; // 帽子・おだんごの分
  const W = 34;
  const BX = 2; // 体の左はし
  const HX = BX + 2; // 頭の左はし
  const H = TOP + HEAD_H + body.length + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (rows, x0, y0) => rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== '.' && g[y0 + y] && x0 + x >= 0 && x0 + x < W) g[y0 + y][x0 + x] = ch;
  }));

  if (look.longHair) put(BACK.longHair.rows, HX + BACK.longHair.x, TOP + BACK.longHair.y);
  if (look.ponytail) put(BACK.ponytail.rows, HX + BACK.ponytail.x, TOP + BACK.ponytail.y);
  put(body, BX, TOP + HEAD_H - 1);
  if (pose !== 'stand') {
    // 向かって左の腕（と手）を消して、体のはしにする
    const y0 = TOP + HEAD_H - 1;
    const armEnd = look.child ? 7 : 5; // 腕と体のさかいの線の列
    const last = pose === 'crouch' ? 16 : 24;
    for (let y = y0 + 2; y < y0 + last; y++) for (let x = BX; x <= BX + armEnd; x++) {
      if (!'tso'.includes(g[y][x])) continue;
      g[y][x] = x === BX + armEnd && g[y][x + 1] !== '.' && g[y][x + 1] !== 'o' ? g[y][x + 1] : '.';
    }
  }
  put(HEAD, HX, TOP);
  if (look.longHair) put(OVER.longFront.rows, HX, TOP + OVER.longFront.y);
  if (look.bun) put(OVER.bun.rows, HX, TOP + OVER.bun.y);
  if (look.hat) put(OVER[look.hat].rows, HX, TOP + OVER[look.hat].y);
  drawFace(g, HX, TOP, look, happy);

  // 杖（向かって右の手に）
  if (look.cane) {
    const cx = BX + 29;
    const handY = TOP + HEAD_H - 1 + (pose === 'crouch' ? 13 : 20);
    for (let y = handY - 1; y < H - 1; y++) g[y][cx] = 'X';
    g[handY - 2][cx - 1] = 'X'; g[handY - 2][cx - 2] = 'X';
  }

  // まわりに1ドットのふち
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.')) add.push([x, y]);
  }
  for (const [x, y] of add) g[y][x] = 'o';

  // いちばん上のあいている行をけずる
  let top = 0;
  while (top < H && g[top].every((ch) => ch === '.')) top++;

  const pal = {
    o: INK, h: look.hair, s: look.skin, t: look.top, B: look.bottom ?? look.top, f: look.shoes, n: look.tie, W: WHITE,
    A: look.apron, K: look.skirt, L: look.legs ?? look.skin, S: look.socks ?? WHITE, C: look.capColor, D: look.bandColor ?? WHITE,
    E: '#ffffff', k: CHEEK, m: MOUTH, M: look.mustache, G: look.glasses, X: look.cane,
  };
  const [c, ctx] = makeCanvas(W, H - top);
  for (let y = top; y < H; y++) for (let x = 0; x < W; x++) {
    const col = pal[g[y][x]];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(x, y - top, 1, 1);
  }
  c.hd = true;
  // 肩（のばす腕の付け根）と、手の位置（おもちゃ）
  const bodyTop = TOP + HEAD_H - 1 - top;
  c.shoulder = { x: BX + 4, y: bodyTop + 4 };
  c.hand = { x: BX + 3, y: bodyTop + (look.child ? 13 : 20) };
  return c;
}
