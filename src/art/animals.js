// 動物とランドマーク（ステージ2〜）のドット絵
// - 街の姿：文字で描いた絵（sprites.js で画像にする）
// - てらまりんぐ画面：足（drawAnimalLeg）と体（drawAnimalBody）を2倍の大きさで描く

import { box, E } from './people.js'; // 関数は描くときに使う（読み込みが循環しても大丈夫）
import { shade } from '../core/renderer.js';

const INK = '#2a1d17';

// ---- 街の姿 ----

const DOG_PAL = { o: INK, f: '#c8904a', l: '#f4e2c4', e: INK, n: INK, c: '#d04040', d: '#96643a' };
const DOG_TOP = [
  '.............oo.....',
  '............odo.....',
  '............oddooo..',
  '...........offffffo.',
  '...........offeffffo',
  '.o.........offffflnn',
  'odo........occfflllo',
  '.odoooooooocccfooo..',
  '..offffffffffffo....',
  '..offffffffffffo....',
  '..ollllllllllllo....',
];
const DOG_LEGS = [
  ['..ofo.ofo..ofo.ofo..', '..olo.olo..olo.olo..', '..ooo.ooo..ooo.ooo..'],
  ['..ofo..ofo.ofo..ofo.', '..olo..olo.olo..olo.', '..ooo..ooo.ooo..ooo.'],
];

const PIGEON_PAL = { o: INK, g: '#969cab', h: '#7a7e8e', r: '#5a968c', n: '#e6aa6e', p: '#e6828c', w: '#cdd2dc' };
const PIGEON = ['.ooo.....', 'ohhho....', 'nhoho....', 'ohrrooooo', '.orrggwwo', '.oggwwwgo', '..oggggo.', '...p.p...'];
const PIGEON_PECK = ['.........', '.ooo.....', 'ohhho....', 'nhohooooo', 'ohrrggwwo', '.oggwwwgo', '..oggggo.', '...p.p...'];

// 3羽をならべた絵（frames：それぞれの鳩の絵）
function pigeonGroup(frames) {
  const W = 27;
  const H = 11;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  [[0, 3], [9, 0], [18, 3]].forEach(([ox, oy], i) => {
    frames[i].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && oy + y < H) g[oy + y][ox + x] = ch; }));
  });
  return g.map((r) => r.join(''));
}

const BENCH_PAL = { o: INK, w: '#b07a48', d: '#8a5a32', m: '#4a4a4a' };
const BENCH = [
  'oooooooooooooooooooo',
  'owwwwwwwwwwwwwwwwwwo',
  'oddddddddddddddddddo',
  'oooooooooooooooooooo',
  'owwwwwwwwwwwwwwwwwwo',
  'oddddddddddddddddddo',
  'oooooooooooooooooooo',
  '.om..............mo.',
  '.om..............mo.',
  '.oo..............oo.',
];

// id → [ふだん, 歩く・つつくコマ] の文字の絵と色
export const ANIMAL_ROWS = {
  dog: { frames: [[...DOG_TOP, ...DOG_LEGS[0]], [...DOG_TOP, ...DOG_LEGS[1]]], pal: DOG_PAL },
  pigeons: { frames: [pigeonGroup([PIGEON, PIGEON, PIGEON]), pigeonGroup([PIGEON_PECK, PIGEON, PIGEON_PECK])], pal: PIGEON_PAL },
  bench: { frames: [BENCH, BENCH], pal: BENCH_PAL },
};

// ---- てらまりんぐ画面（2倍） ----

// 1本の足。y は地面に着いている点、lift は持ち上がっている高さ、gy は体の地面（ゆれ込み）
export function drawAnimalLeg(ctx, look, leg, x, y, lift) {
  const fy = y - lift;
  const gy = y - (leg.y ?? 0); // 体の基準の地面
  if (lift > 0.5) {
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(E(x) - 6, E(y) - 2, 12, 4);
  }
  const far = (leg.y ?? 0) < 0; // 奥の足は少し暗く
  if (look.type === 'dog') {
    const top = gy - 22;
    box(ctx, x - 3, top, 6, fy - top - 4, far ? shade(look.fur, -0.2) : look.fur);
    box(ctx, x - 4, fy - 4, 8, 4, look.light);
  } else if (look.type === 'pigeons') {
    ctx.fillStyle = shade(look.leg, far ? -0.15 : 0);
    ctx.fillRect(E(x) - 1, E(fy - 12), 2, 12);
    ctx.fillRect(E(x) - 4, E(fy) - 2, 8, 2);
  } else if (look.type === 'bench') {
    const top = gy - 50;
    box(ctx, x - 3, top, 6, fy - top, far ? '#3a3a3a' : '#4a4a4a');
  }
}

// 足の上にかぶさる体（cx：画面の真ん中、bx/by：体ごとのゆれ、GROUND：地面の高さ）
export function drawAnimalBody(ctx, look, cx, bx, by, GROUND) {
  const x = cx + bx;
  const gy = GROUND + by;
  const t = performance.now() / 1000;
  if (look.type === 'dog') {
    // 小型の犬（てらまるより少し大きいくらい）
    const wag = Math.round(Math.sin(t * 14) * 2);
    box(ctx, x - 42 + wag, gy - 54, 6, 18, look.dark); // しっぽ
    box(ctx, x - 34, gy - 40, 64, 20, look.fur); // 胴
    ctx.fillStyle = look.light;
    ctx.fillRect(E(x - 28), E(gy - 24), 52, 4);
    box(ctx, x + 22, gy - 42, 8, 18, look.collar); // 首輪
    box(ctx, x + 26, gy - 58, 22, 22, look.fur); // 頭
    box(ctx, x + 28, gy - 66, 8, 10, look.dark); // 耳
    box(ctx, x + 42, gy - 46, 10, 8, look.light); // 口まわり
    ctx.fillStyle = INK;
    ctx.fillRect(E(x + 50), E(gy - 46), 2, 2); // 鼻
    ctx.fillRect(E(x + 36), E(gy - 52), 2, 2); // 目
    ctx.fillStyle = '#ec8c96';
    if (Math.floor(t * 3) % 2) ctx.fillRect(E(x + 44), E(gy - 38), 2, 4); // ベロ
  } else if (look.type === 'pigeons') {
    [-44, 0, 44].forEach((off, i) => {
      const k = i === 1 ? -6 : 0; // 真ん中は少し奥
      const bxk = x + off;
      const g = gy + k;
      const peck = Math.floor(t * 3 + i * 0.7) % 3 === 0 ? 6 : 0; // ときどき地面をつつく
      box(ctx, bxk - 12, g - 30, 26, 18, look.body);
      box(ctx, bxk - 2, g - 26, 14, 10, look.wing);
      box(ctx, bxk + 12, g - 26, 10, 6, look.head); // しっぽ
      box(ctx, bxk - 16, g - 38 + peck, 8, 12, look.neck);
      box(ctx, bxk - 22, g - 46 + peck, 12, 10, look.head);
      box(ctx, bxk - 28, g - 42 + peck, 6, 4, look.beak);
      ctx.fillStyle = '#e65a28';
      ctx.fillRect(E(bxk - 18), E(g - 44 + peck), 2, 2); // 目
    });
  } else if (look.type === 'bench') {
    // 背もたれと座面（てらまるは座面の下をくぐれる）
    box(ctx, x - 44, gy - 96, 6, 46, '#3a3a3a');
    box(ctx, x + 38, gy - 96, 6, 46, '#3a3a3a');
    box(ctx, x - 64, gy - 94, 128, 10, look.wood);
    box(ctx, x - 64, gy - 78, 128, 10, look.wood);
    box(ctx, x - 66, gy - 58, 132, 10, look.wood);
    ctx.fillStyle = shade(look.wood, 0.25);
    ctx.fillRect(E(x - 64), E(gy - 94), 128, 2);
    ctx.fillRect(E(x - 64), E(gy - 78), 128, 2);
    ctx.fillRect(E(x - 66), E(gy - 58), 132, 2);
  }
}
