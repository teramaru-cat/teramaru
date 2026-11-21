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

// うしろ姿で正座（なでなで）：おしりの下に足の裏が2つ見える
const BACK_SIT_ADULT = [
  '............sss',
  '............sss',
  '.....tttttttttt',
  '...tttttttttttt',
  '..ttttttttttttt',
  ...Array(8).fill(ARM),
  '..sssottttttttt',
  '..sssoBBBBBBBBB',
  '...BBBBBBBBBBBB',
  '..BBBBBBBBBBBBB',
  '..BBBBBBBBBBBBB',
  '..BBBBBBBBBBBBB',
  '......ffff.....',
];
const BACK_SIT_CHILD = [
  '............sss',
  '.......tttttttt',
  '.....tttttttttt',
  '....ttttttttttt',
  ...Array(5).fill(CHILD_ARM),
  '....sssottttttt',
  '....sssBBBBBBBB',
  '.....BBBBBBBBBB',
  '.....BBBBBBBBBB',
  '.......fff.....',
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
  if (pose === 'backSit') {
    half = child ? BACK_SIT_CHILD : BACK_SIT_ADULT;
    if (look.garment === 'skirt') half = half.map((r) => r.replace(/B/g, 'K'));
  } else if (pose === 'crouch') {
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
  //       'backSit'（うしろ姿で正座してなでる）| 'backStand'（うしろ姿で立ってなでる）
  const back = pose === 'backSit' || pose === 'backStand';
  const happy = pose !== 'stand';
  // うしろ姿：ネクタイ・エプロンの前は見えない
  const bodyLook = back ? { ...look, tie: null, garment: look.garment === 'apron' || look.garment === 'longApron' ? 'coat' : look.garment } : look;
  const body = bodyRows(bodyLook, pose === 'standPet' || pose === 'backStand' ? 'stand' : pose);
  const TOP = 9; // 帽子・おだんごの分
  const W = 34;
  const BX = 2; // 体の左はし
  const HX = BX + 2; // 頭の左はし
  const H = TOP + HEAD_H + body.length + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (rows, x0, y0) => rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== '.' && g[y0 + y] && x0 + x >= 0 && x0 + x < W) g[y0 + y][x0 + x] = ch;
  }));

  if (!back && look.longHair) put(BACK.longHair.rows, HX + BACK.longHair.x, TOP + BACK.longHair.y);
  if (!back && look.ponytail) put(BACK.ponytail.rows, HX + BACK.ponytail.x, TOP + BACK.ponytail.y);
  put(body, BX, TOP + HEAD_H - 1);
  if (pose !== 'stand') {
    // 向かって左の腕（と手）を消して、体のはしにする
    const y0 = TOP + HEAD_H - 1;
    const armEnd = look.child ? 7 : 5; // 腕と体のさかいの線の列
    const last = pose === 'crouch' || pose === 'backSit' ? 16 : 24;
    for (let y = y0 + 2; y < y0 + last; y++) for (let x = BX; x <= BX + armEnd; x++) {
      if (!'tso'.includes(g[y][x])) continue;
      g[y][x] = x === BX + armEnd && g[y][x + 1] !== '.' && g[y][x + 1] !== 'o' ? g[y][x + 1] : '.';
    }
  }
  if (back) {
    // うしろ姿の頭：髪でおおわれ、耳だけ肌（首のうしろは体の首の行）
    put(HEAD.map((r) => r.replace(/s/g, 'h')), HX, TOP);
    for (const ex of [1, HEAD_W - 2]) for (let y = 13; y <= 16; y++) if (!look.longHair) g[TOP + y][HX + ex] = 's';
    if (look.longHair) put(mirror(Array(12).fill('...hhhhhhhhhh')), HX, TOP + 17); // 肩までの髪
    if (look.ponytail) put(mirror(['...........hh', '...........hh', '...........hh', '...........hh', '...........hh', '...........hh', '............h']), HX, TOP + HEAD_H - 1); // 背中にたれる
    if (look.bun) put(OVER.bun.rows, HX, TOP + OVER.bun.y);
    if (look.hat === 'cap') put(OVER.cap.rows.slice(0, 8), HX, TOP);
    else if (look.hat) put(OVER[look.hat].rows, HX, TOP + OVER[look.hat].y);
  } else {
    put(HEAD, HX, TOP);
    if (look.longHair) put(OVER.longFront.rows, HX, TOP + OVER.longFront.y);
    if (look.bun) put(OVER.bun.rows, HX, TOP + OVER.bun.y);
    if (look.hat) put(OVER[look.hat].rows, HX, TOP + OVER[look.hat].y);
    drawFace(g, HX, TOP, look, happy);
  }

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
  c.standing = pose !== 'crouch' && pose !== 'backSit';
  // 肩（のばす腕の付け根）と、手の位置（おもちゃ）
  const bodyTop = TOP + HEAD_H - 1 - top;
  c.shoulder = { x: BX + 4, y: bodyTop + 4 };
  c.hand = { x: BX + 3, y: bodyTop + (look.child ? 13 : 20) };
  return c;
}

// ---- 大きいうしろ姿（人のなでなで・アップ用）----
// てらまるより ずっと大きい人（本物に近い比率：頭は小さめ、肩はばが広い）。
// 小さい絵を拡大せず、この大きさで形（だ円・四角）から1ドットずつ描く。ベタ塗り・ふち1ドット・左右対称。
// pose：'sit'（正座）| 'stand'（立つ。腰の悪いおばあちゃん）。向かって左の腕は、のばす腕を別に描くので描かない
export function makeBigBack(look, pose = 'sit') {
  const k = (look.child ? 0.78 : 1) * 1.4; // てらまる（4kgもない猫）より ずっと大きく。子どもは小さめ
  const W = 76;
  const H = 140;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const cx = W / 2; // まん中（ドットのさかい）
  const set = (x, y, ch) => { if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = ch; };
  // だ円（ドットの中心が中に入るところを塗る）
  const ell = (ex, ey, rx, ry, ch, yMax = Infinity) => {
    for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x++) {
      const dx = (x + 0.5 - ex) / rx;
      const dy = (y + 0.5 - ey) / ry;
      if (dx * dx + dy * dy <= 1 && y <= yMax) set(x, y, ch);
    }
  };
  // 左右対称の段（y ごとの半はば）
  const rows = (y0, halfs, ch) => halfs.forEach((hw, i) => { for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) set(x, y0 + i, ch); });

  const R = (v) => Math.round(v * k);
  const TOP = 10; // 帽子・おだんごの分
  const headR = R(10);
  const headY = TOP + headR + 1; // 頭のまん中
  const neckY = headY + headR - 1;
  const shY = neckY + 3; // 肩の上
  const shW = R(17); // 肩の半はば
  const torsoH = R(22);
  const waistW = R(14);

  // 髪（うしろ）：肩までの髪・ポニーテールは体より先に
  if (look.longHair) rows(headY, Array(R(20)).fill(R(11)).map((v, i, a) => (i > a.length - 3 ? v - 1 : v)), 'h');

  // 体
  const torso = [];
  for (let i = 0; i < torsoH; i++) {
    const t = i / torsoH;
    // 肩は丸く（はじめの3段で広がる）、そこから腰へ少しすぼまる
    const hw = i < 3 ? shW - [4, 2, 1][i] : shW - (shW - waistW) * Math.max(0, (t - 0.2) / 0.8);
    torso.push(hw);
  }
  rows(neckY, [R(3), R(3), R(3)], 's'); // 首のうしろ
  rows(shY, torso, 't');
  // 向かって右の腕（体の横にたらす）。腕と体のさかいに線
  const armX = Math.round(cx + shW) - R(5);
  for (let y = shY + 3; y < shY + torsoH + 2; y++) {
    for (let x = armX; x < armX + R(5); x++) set(x, y, 't');
    set(armX - 1, y, 'o');
  }
  ell(armX + R(5) / 2, shY + torsoH + 3, R(3), R(2.5), 's'); // 手
  const lArmX = Math.round(cx - shW);
  const baseY = shY + torsoH;
  if (pose === 'sit') {
    // 正座（うしろから）：まるいおしりが かかとの上にのる。おしりの下に くつの裏が2つ、つま先を内がわに向けてならぶ
    const sole = 'U';
    ell(cx - R(5), baseY + R(7), R(5), R(2.2), sole);
    ell(cx + R(5), baseY + R(7), R(5), R(2.2), sole);
    const lowW = waistW + R(2);
    rows(baseY - 2, [waistW, waistW + 1, lowW, lowW, lowW, lowW, lowW - 1, lowW - 2, lowW - 4], look.garment === 'skirt' ? 'K' : 'B');
  } else {
    // 立つ：スカート（すそが広がる）と足
    const skirtH = R(22);
    const sk = [];
    for (let i = 0; i < skirtH; i++) sk.push(waistW + 1 + Math.round((i / skirtH) * R(5)));
    rows(baseY - 1, sk, look.garment === 'skirt' ? 'K' : 'B');
    const ly = baseY - 1 + skirtH;
    for (const lx of [cx - R(7), cx + R(3)]) {
      for (let y = ly; y < ly + R(14); y++) for (let x = Math.round(lx); x < Math.round(lx + R(4)); x++) set(x, y, 'L');
      ell(lx + R(2), ly + R(14) + 1, R(3.5), R(2), 'f');
    }
    if (look.cane) {
      const x = armX + R(7);
      for (let y = shY + torsoH + 2; y < ly + R(15); y++) set(x, y, 'X');
      set(x - 1, shY + torsoH + 1, 'X'); set(x - 2, shY + torsoH + 1, 'X');
    }
  }

  // 頭（うしろは髪。耳だけ肌）
  ell(cx - headR - 0.5, headY + 1, 2, 3, look.longHair ? 'h' : 's');
  ell(cx + headR + 0.5, headY + 1, 2, 3, look.longHair ? 'h' : 's');
  ell(cx, headY, headR, headR + 0.5, 'h');
  if (look.ponytail) {
    ell(cx, headY + headR - 2, R(2.5), R(2), 'D'); // 髪どめ
    rows(headY + headR, Array(R(14)).fill(R(2.5)).map((v, i, a) => (i > a.length - 4 ? v - 1 : v)), 'h');
  }
  if (look.bun) ell(cx, headY - headR, R(4), R(3.5), 'h');
  if (look.hat === 'cap') {
    ell(cx, headY, headR + 0.5, headR + 1, 'C', headY - 2);
    rows(headY - 2, [headR + 0.5], 'o');
  }
  if (look.hat === 'chef') {
    ell(cx, headY - headR - 2, headR + 2, R(7), 'W');
    rows(headY - headR + 1, Array(R(5)).fill(headR - 0.5), 'W');
    rows(headY - headR + 1, [headR - 0.5], 'o');
  }
  if (look.hat === 'band') rows(headY - R(3), [headR, headR], 'D');

  // まわりに1ドットのふち
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.')) add.push([x, y]);
  }
  for (const [x, y] of add) g[y][x] = 'o';
  let top = 0;
  while (top < H && g[top].every((ch) => ch === '.')) top++;
  let bot = H;
  while (bot > top && g[bot - 1].every((ch) => ch === '.')) bot--;

  const pal = {
    o: INK, h: look.hair, s: look.skin, t: look.top, B: look.bottom ?? look.top, f: look.shoes, W: WHITE,
    K: look.skirt, L: look.legs ?? look.skin, C: look.capColor, D: look.bandColor ?? (look.ponytail ? '#e07a8a' : WHITE), X: look.cane,
    U: '#8a7868', // くつの裏
  };
  const [c, ctx] = makeCanvas(W, bot - top);
  for (let y = top; y < bot; y++) for (let x = 0; x < W; x++) {
    const col = pal[g[y][x]];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(x, y - top, 1, 1);
  }
  c.hd = true;
  c.big = true;
  c.standing = pose === 'stand';
  // のばす腕のつけね（向かって左の肩。体の内がわ：腕は体のうしろから出てくる）
  c.shoulder = { x: lArmX + R(5), y: shY - top + R(4) };
  c.armR = Math.max(2, Math.round(R(5) / 2)); // 腕の太さ（半分）
  return c;
}
