// ねこたちの意志（姿のないキラキラ）の声
// てらまるはしゃべらない。チュートリアルの使命・結果発表の評価は、この声が言う。
// 文字は四角い枠に出す（ふきだしにしない）。枠の角でキラキラがまたたく。

import { drawText, textWidth } from '../core/text.js';
import { panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { tr } from '../i18n/index.js';

// 名前（言葉は i18n の voice.name / voice.fullName）
export const VOICE = {
  get name() { return tr('voice.name'); }, // 枠の名札に出す愛称
  get fullName() { return tr('voice.fullName'); }, // 正式な名前（せかいじゅうの ねこの いし）
};

const CHAR_SPEED = 18; // 1秒に出す文字数

// いまの経過秒で、何文字まで出ているか
export function shownChars(t) { return Math.max(0, Math.floor(t * CHAR_SPEED)); }
export function totalChars(lines) { return lines.reduce((n, l) => n + [...l].length, 0); }
export function typeTime(lines) { return totalChars(lines) / CHAR_SPEED; }

// 声の枠。x, y, w：枠の位置と幅。t：出しはじめてからの秒（1文字ずつ出す）。
// name：名札を出すか。align：'center' | 'left'。返り値は枠の高さ
export function drawVoiceBox(ctx, lines, { x, y, w, t = 99, now = 0, name = true, align = 'center', color = UI.ink, more = false }) {
  const h = lines.length * 10 + 8;
  panel(ctx, x, y, w, h, '#fffaf0');
  let n = shownChars(t);
  lines.forEach((l, i) => {
    const s = [...l].slice(0, Math.max(0, n)).join('');
    n -= [...l].length;
    const tx = align === 'center' ? x + Math.round(w / 2) : x + 7;
    drawText(ctx, s, tx, y + 5 + i * 10, { font: 'small', color, align });
  });
  if (name) {
    const nw = textWidth(VOICE.name, 'small') + 8;
    panel(ctx, x + 6, y - 7, nw, 11, '#fff0b8', '#c89018');
    drawText(ctx, VOICE.name, x + 10, y - 5, { font: 'small', color: '#a06810' });
  }
  // 次へ（▼がぴょこぴょこ）
  if (more && shownChars(t) >= totalChars(lines)) {
    const bx = x + w - 10;
    const by = y + h - 7 + (Math.floor(now * 3) % 2);
    ctx.fillStyle = '#c89018';
    ctx.fillRect(bx - 2, by, 5, 1);
    ctx.fillRect(bx - 1, by + 1, 3, 1);
    ctx.fillRect(bx, by + 2, 1, 1);
  }
  drawFrameSparkles(ctx, x, y, w, h, now);
  return h;
}

// キラキラ1つ（中心 cx, cy、大きさ r＝0〜4）
export function drawSpark(ctx, cx, cy, r) {
  if (r <= 0) return;
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = '#c89018'; // ふち
  ctx.fillRect(cx - r - 1, cy - 1, r * 2 + 3, 3);
  ctx.fillRect(cx - 1, cy - r - 1, 3, r * 2 + 3);
  ctx.fillStyle = '#ffe870';
  ctx.fillRect(cx - r, cy, r * 2 + 1, 1);
  ctx.fillRect(cx, cy - r, 1, r * 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx, cy, 1, 1);
}

// 小→大→小の大きさ（k＝0〜1）
export function sparkSize(k) { return [1, 2, 3, 4, 3, 2, 1, 0][Math.floor(((k % 1) + 1) % 1 * 8)]; }

// 枠の4つの角で、順にまたたく
const CORNERS = [[-1, -1, 0], [1, -1, 0.25], [1, 1, 0.5], [-1, 1, 0.75]];
function drawFrameSparkles(ctx, x, y, w, h, t) {
  for (const [sx, sy, ph] of CORNERS) {
    drawSpark(ctx, sx < 0 ? x + 2 : x + w - 3, sy < 0 ? y + 1 : y + h - 2, sparkSize(t * 0.9 + ph));
  }
}

// 姿のない声のいるところ：キラキラがたくさん集まって、ゆっくり回る（てらまるに語りかける）
export function drawPresence(ctx, cx, cy, t, a = 1) {
  ctx.globalAlpha = a;
  // まわりのぼんやりした光
  ctx.fillStyle = 'rgba(255,240,170,0.18)';
  for (let r = 22; r > 6; r -= 6) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const ang = t * 0.8 + (i / 9) * Math.PI * 2;
    const rr = 8 + (i % 3) * 7 + Math.sin(t * 1.7 + i) * 2;
    drawSpark(ctx, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.7, sparkSize(t * 0.8 + i * 0.37));
  }
  drawPaw(ctx, cx, cy - Math.round(Math.sin(t * 2) * 1.5));
  ctx.globalAlpha = 1;
}

// まん中の肉球（ピンクの指4つと大きい肉球に、金色のふち）
const PAW = [
  '....oo.oo....',
  '...oppoppo...',
  '.oooppoppooo.',
  'oppoooooooppo',
  '.oo.ooooo.oo.',
  '...opppppo...',
  '..opppppppo..',
  '..opppppppo..',
  '...opppppo...',
  '....ooooo....',
];
const PAW_COL = { o: '#c89018', p: '#ffb0c0', w: '#ffffff' };
function drawPaw(ctx, cx, cy) {
  const x0 = Math.round(cx - PAW[0].length / 2);
  const y0 = Math.round(cy - PAW.length / 2);
  PAW.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!PAW_COL[ch]) return;
    ctx.fillStyle = PAW_COL[ch];
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }));
  ctx.fillStyle = PAW_COL.w; // 光
  ctx.fillRect(x0 + 4, y0 + 6, 1, 1);
}
