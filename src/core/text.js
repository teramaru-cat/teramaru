// ドット文字の描画
// フォントを設計サイズちょうどで描き、半透明のピクセルを「塗る／塗らない」に二値化してにじみを消す。
// できた文字画像はキャッシュして使い回す。

import { makeCanvas } from './renderer.js';
import { hasLatin, latinWidth, drawLatin, LATIN_H } from './latin.js';

export const FONTS = {
  small: { family: 'Misaki', size: 8 }, // 美咲ゴシック 8×8
  body: { family: 'k8x12', size: 12 }, // k8x12 8×12
};

export async function loadFonts() {
  const faces = [
    new FontFace('Misaki', 'url(fonts/misaki_gothic.ttf)'),
    new FontFace('k8x12', 'url(fonts/k8x12.ttf)'),
  ];
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => document.fonts.add(f));
}

const cache = new Map();
const [, mctx] = makeCanvas(1, 1);

// 日本語以外の言語のとき：半角の英数字・記号は latin.js のドット文字で描く（読みやすい横5ドット）
let latin = false;
export function useLatinFont(on) {
  if (latin === on) return;
  latin = on;
  cache.clear();
}
const LATIN_TOP = { small: 0, body: 2 }; // 大文字の上の位置（ほかの文字とならべたときにそろうように）

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function glyphs(str, fontKey, color) {
  const key = `${latin ? 'L' : ''}${fontKey}|${color}|${str}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = latin && [...str].some(hasLatin) ? mixed(str, fontKey, color) : fontGlyphs(str, fontKey, color);
  if (cache.size > 600) cache.clear();
  cache.set(key, c);
  return c;
}

// ラテン文字はドット文字、それ以外（かな・記号など）はフォントで、左からならべた1枚の絵
function mixed(str, fontKey, color) {
  const runs = [];
  for (const ch of str) {
    const isL = hasLatin(ch);
    const last = runs[runs.length - 1];
    if (last && last.latin === isL) last.text += ch;
    else runs.push({ latin: isL, text: ch });
  }
  const top = LATIN_TOP[fontKey] ?? 0;
  let w = 0;
  let h = top + LATIN_H;
  for (const r of runs) {
    if (r.latin) {
      r.w = [...r.text].reduce((n, ch) => n + latinWidth(ch) + 1, 0);
    } else {
      r.img = fontGlyphs(r.text, fontKey, color);
      r.w = r.img.width;
      h = Math.max(h, r.img.height);
    }
    w += r.w;
  }
  const [c, ctx] = makeCanvas(Math.max(1, w - (runs[runs.length - 1].latin ? 1 : 0)), h);
  ctx.fillStyle = color;
  let x = 0;
  for (const r of runs) {
    if (r.latin) {
      for (const ch of r.text) { drawLatin(ctx, ch, x, top); x += latinWidth(ch) + 1; }
    } else {
      ctx.drawImage(r.img, x, 0);
      x += r.w;
    }
  }
  return c;
}

function fontGlyphs(str, fontKey, color) {
  const f = FONTS[fontKey];
  const font = `${f.size}px ${f.family}`;
  mctx.font = font;
  const m = mctx.measureText(str);
  const asc = Math.round(m.fontBoundingBoxAscent ?? f.size * 0.875);
  const desc = Math.round(m.fontBoundingBoxDescent ?? f.size * 0.125);
  const w = Math.max(1, Math.ceil(m.width));
  const h = Math.max(1, asc + desc);

  const [c, ctx] = makeCanvas(w, h);
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(str, 0, asc);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = rgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] >= 110) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    } else {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// 文字列の幅（ドット）
export function textWidth(str, fontKey = 'body', scale = 1) {
  return glyphs(str, fontKey, '#000000').width * scale;
}

/**
 * ドット文字を描く。y は文字の上端。
 * opts: font('small'|'body'), color, align('left'|'center'|'right'), outline(色), scale(整数)
 */
export function drawText(ctx, str, x, y, opts = {}) {
  const { font = 'body', color = '#ffffff', align = 'left', outline = null, scale = 1 } = opts;
  const lines = String(str).split('\n');
  const lineH = FONTS[font].size * scale;
  let maxW = 0;
  lines.forEach((line, i) => {
    if (!line) return;
    const img = glyphs(line, font, color);
    const w = img.width * scale;
    const h = img.height * scale;
    maxW = Math.max(maxW, w);
    let lx = Math.round(x);
    if (align === 'center') lx = Math.round(x - w / 2);
    else if (align === 'right') lx = Math.round(x - w);
    const ly = Math.round(y + i * lineH);
    if (outline) {
      const o = glyphs(line, font, outline);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.drawImage(o, lx + dx * scale, ly + dy * scale, w, h);
      }
    }
    ctx.drawImage(img, lx, ly, w, h);
  });
  return maxW;
}
