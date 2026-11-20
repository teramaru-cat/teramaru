// ドット絵（文字で描いて、起動時に画像にする）
// 1文字＝1ドット。'.' は透明。

import { CAT } from './palette.js';
import { makeCanvas } from '../core/renderer.js';
import { makePerson, makeCrouch, FOOD_ROWS, FOOD_ICON } from './people.js';
import { TARGETS } from '../data/targets.js';
import { ANIMAL_ROWS } from './animals.js';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function makeSprite(rows, pal, { flip = false } = {}) {
  const h = rows.length;
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) console.warn(`sprite row ${i} の長さが ${r.length}（${w} のはず）: ${r}`);
  });
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][flip ? w - 1 - x : x];
      const col = pal[ch];
      if (!col) continue;
      const [r, g, b] = hexToRgb(col);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---- てらまる（16×18、足元が下の真ん中） ----
// 写真を参考に：小顔・首は短く・足は白くて長め。背中は茶に黒の縞、おなかと胸は白。

// 正面（写真を参考に）：頭のてっぺんは茶、額から鼻へ白い筋。
// 向かって左は大きな黒い模様に茶色の目（左耳の内側はピンク）。右は目の周りが黒で黄緑の目、ほおは白。
// 口の両わきに茶のぶち、胸から下は白。
const FRONT_TOP = [
  '....o......o....',
  '...obo....obo...',
  '...opcoooocbo...',
  '...obbcwwccbo...',
  '...obbbwwcbbo...',
  '...obebwwbgbo...',
  '...obbwppwbwo...',
  '....owcwwcwo....',
  '....owwwwwwo....',
  '...ocwwwwwwbo...',
  '...ocwwwwwwbo...',
  '...owwwwwwwwo...',
  '...owwwwwwwwo...',
];

// 後ろ姿：頭の後ろは左右で茶と黒、背中は茶に黒の縞、両わきにおなかの白（大きさは正面と同じ）
const BACK_TOP = [
  '....o......o....',
  '...oco....obo...',
  '...occoooobbo...',
  '...occccbbbbo...',
  '...occcccbbbo...',
  '...occcccbbbo...',
  '...occccccbbo...',
  '....owccbbwo....',
  '....occccbbo....',
  '...occbbccbbo...',
  '...occcbbcbco...',
  '...owccbbccwo...',
  '...owcbbccbwo...',
];

const FB_LEGS = {
  idle: ['...owoooooowo...', '...owo....owo...', '...owo....owo...', '...owo....owo...', '...ooo....ooo...'],
  a: ['...owoooooowo...', '...owo....owo...', '...owo....owo...', '...ooo....owo...', '..........ooo...'],
  b: ['...owoooooowo...', '...owo....owo...', '...owo....owo...', '...owo....ooo...', '...ooo..........'],
};

// 横向き（右向き）。H＝耳・頭の後ろ、F＝目の周り、E＝目。頭は背中の高さにそのまま付く（首は短い）。
// 右を向くと、てらまるの右側（黒・茶色の目）が見える。左を向くと左側（目の周りが茶・黄緑の目）。
const SIDE_TOP = [
  '................',
  '................',
  '................',
  '...........o..o.',
  '..........oHooHo',
  '..........oHFFFo',
  '..o.......oHFEwo',
  '.oco.oooooHFwwpo',
  '.oco.occbcbbwwwo',
  '..oocbccbcccwwo.',
  '...ocbccbbccwwo.',
  '...owwcccbbwwwo.',
  '...owwwwwwwwwwo.',
];

const SIDE_LEGS = {
  idle: ['...owo.....owo..', '...owo.....owo..', '...owo.....owo..', '...owo.....owo..', '...ooo.....ooo..'],
  a: ['...owo.....owo..', '..owo.......owo.', '..owo.......owo.', '.owo.........owo', '.oo...........oo'],
  b: ['...owo.....owo..', '....owo...owo...', '....owo...owo...', '....owo...owo...', '....ooo...ooo...'],
};

const RIGHT_PAL = { ...CAT, H: CAT.b, F: CAT.b, E: CAT.e };
const LEFT_PAL = { ...CAT, H: CAT.b, F: CAT.c, E: CAT.g };

function frames(top, legs, pal, flip = false) {
  return ['idle', 'a', 'b'].map((k) => makeSprite([...top, ...legs[k]], pal, { flip }));
}

// 寝そべったてらまる（22×11。「よこにしてね」の画面用）：獲物をねらう低い姿勢、顔は正面、前足2本を顔の下に出す。
// 後ろ足は、おしりの下に足先だけ出す（体の途中から足が生えて見えないように）。
// しっぽは動かすので別に描く（rotateCat.js）
const LYING = [
  '............o......o..',
  '...........obo....obo.',
  '...........opcoooocbo.',
  '...oooooooobbcwwccbo..',
  '..occbccbccbbbwwcbbo..',
  '.ocbbccbccobebwwbgbo..',
  '.ocbccbcccobbwppwbwo..',
  '.owwccwwwwoowcwwcwo...',
  '.owwwwwwwwwowwwwwwoo..',
  '.owwwowwwwwowwwowwwo..',
  '.oooooooooooooooooo...',
];

// ---- ハート ----
const HEART = [
  '.oo.oo.',
  'ohhohho',
  'ohwhhho',
  '.ohhho.',
  '..oho..',
  '...o...',
];

const CLOCK = ['..ooo..', '.owwwo.', 'owwowwo', 'owwoowo', 'owwwwwo', '.owwwo.', '..ooo..'];
const STAR = ['...o...', '..oyo..', 'ooyyyoo', 'oyyyyyo', '.oyyyo.', '.oyoyo.', '.oo.oo.'];
const COIN = ['..ooo..', '.oyyyo.', 'oyywyyo', 'oyyyyyo', 'oyyyyyo', '.oyyyo.', '..ooo..'];

const DROP = ['..o..', '.obo.', '.obo.', 'obbbo', 'obwbo', 'obbbo', '.ooo.'];
const PAW = ['p.p.p', '.....', '.ppp.', 'ppppp', 'ppppp', '.p.p.'];
const BOLT = ['..oo.', '.oyo.', 'oyyo.', 'oyyyo', '.oyyo', '.oyo.', '.oo..'];

export const SPR = {};

export function buildSprites() {
  SPR.cat = {
    down: frames(FRONT_TOP, FB_LEGS, CAT),
    up: frames(BACK_TOP, FB_LEGS, CAT),
    right: frames(SIDE_TOP, SIDE_LEGS, RIGHT_PAL),
    left: frames(SIDE_TOP, SIDE_LEGS, LEFT_PAL, true),
  };
  SPR.catLying = makeSprite(LYING, CAT);
  // おしりを前へ寄せたコマ：後ろ足の先より右の1列を抜いて、左を1つ空ける（ドットはくずさない）
  SPR.catLyingIn = makeSprite(LYING.map((r) => `.${r.slice(0, 7)}${r.slice(8)}`), CAT);
  SPR.heart = makeSprite(HEART, { o: '#8a2040', h: '#f06080', w: '#ffd0dc' });
  SPR.drop = makeSprite(DROP, { o: '#1f4f9a', b: '#4aa0e0', w: '#ffffff' });
  SPR.dropEmpty = makeSprite(DROP, { o: '#8a8a90', b: '#d8d4cc', w: '#eeeae2' });
  SPR.paw = makeSprite(PAW, { p: '#d06070' });
  SPR.bolt = makeSprite(BOLT, { o: '#8a5a10', y: '#f8d838' });
  SPR.clock = makeSprite(CLOCK, { o: '#3a2a20', w: '#fbf8f0' });
  SPR.star = makeSprite(STAR, { o: '#8a5a10', y: '#f8c838' });
  SPR.coin = makeSprite(COIN, { o: '#8a5a10', y: '#f0b828', w: '#fff0b0' });
  SPR.heartEmpty = makeSprite(HEART, { o: '#8a2040', h: '#e8d8c8', w: '#f4ece0' });
  SPR.food = {};
  for (const [k, f] of Object.entries(FOOD_ROWS)) SPR.food[k] = makeSprite(f.rows, f.pal);
  SPR.foodIcon = makeSprite(FOOD_ICON.rows, FOOD_ICON.pal);
  SPR.people = {};
  for (const [id, t] of Object.entries(TARGETS)) {
    if (t.kind === 'human') SPR.people[id] = [makePerson(t.look), makePerson(t.look, true), makeCrouch(t.look)];
    else if (ANIMAL_ROWS[id]) SPR.people[id] = ANIMAL_ROWS[id].frames.map((rows) => makeSprite(rows, ANIMAL_ROWS[id].pal));
    if (t.owner) SPR.owners = { ...SPR.owners, [id]: [makePerson(t.owner), makePerson(t.owner, true)] };
  }
}
