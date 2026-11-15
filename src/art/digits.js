// デジタル時計ふうの数字（5×7ドット、7セグメント）
// 数字・＋・−・：だけ。ほかの文字はふつうのドット文字（text.js）で描く。

// セグメント：a 上、b 右上、c 右下、d 下、e 左下、f 左上、g 真ん中
const SEG = {
  a: [[1, 0], [2, 0], [3, 0]],
  b: [[4, 1], [4, 2]],
  c: [[4, 4], [4, 5]],
  d: [[1, 6], [2, 6], [3, 6]],
  e: [[0, 4], [0, 5]],
  f: [[0, 1], [0, 2]],
  g: [[1, 3], [2, 3], [3, 3]],
};

const DIGIT = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
};

function dots(ch) {
  // 1 は右寄せのセグメントだと「：」に見えるので、真ん中に縦棒
  if (ch === '1') return [[1, 1], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6]];
  if (DIGIT[ch]) return [...DIGIT[ch]].flatMap((s) => SEG[s]);
  if (ch === '+') return [[2, 1], [2, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [2, 4], [2, 5]];
  if (ch === '-') return SEG.g;
  if (ch === ':') return [[2, 2], [2, 4]];
  return [];
}

const ADV = 6; // 1文字の幅（すきま込み）

export function digitsWidth(str) {
  return str.length * ADV - 1;
}

// y は上端。align: left | center | right。outline を付けると縁取り
export function drawDigits(ctx, str, x, y, { color = '#000', outline = null, align = 'left' } = {}) {
  str = String(str);
  let x0 = x;
  if (align === 'center') x0 = x - Math.floor(digitsWidth(str) / 2);
  if (align === 'right') x0 = x - digitsWidth(str);
  x0 = Math.round(x0);
  y = Math.round(y);
  const pass = (col, ox, oy) => {
    ctx.fillStyle = col;
    [...str].forEach((ch, i) => {
      for (const [dx, dy] of dots(ch)) ctx.fillRect(x0 + i * ADV + dx + ox, y + dy + oy, 1, 1);
    });
  };
  if (outline) {
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pass(outline, ox, oy);
  }
  pass(color, 0, 0);
  return digitsWidth(str);
}
