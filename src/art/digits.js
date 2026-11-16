// ドット絵の数字（5×7ドット、角までつながった四角い形でそろえる）
// 数字・＋・−・：だけ。ほかの文字はふつうのドット文字（text.js）で描く。

const GLYPH = {
  0: ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  2: ['#####', '....#', '....#', '#####', '#....', '#....', '#####'],
  3: ['#####', '....#', '....#', '#####', '....#', '....#', '#####'],
  4: ['#...#', '#...#', '#...#', '#####', '....#', '....#', '....#'],
  5: ['#####', '#....', '#....', '#####', '....#', '....#', '#####'],
  6: ['#####', '#....', '#....', '#####', '#...#', '#...#', '#####'],
  7: ['#####', '....#', '....#', '....#', '....#', '....#', '....#'],
  8: ['#####', '#...#', '#...#', '#####', '#...#', '#...#', '#####'],
  9: ['#####', '#...#', '#...#', '#####', '....#', '....#', '#####'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  ':': ['.....', '.....', '..#..', '.....', '..#..', '.....', '.....'],
};

const DOTS = {};
for (const [ch, rows] of Object.entries(GLYPH)) {
  DOTS[ch] = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') DOTS[ch].push([x, y]); }));
}

const ADV = 6; // 1文字の幅（すきま込み）

export function digitsWidth(str) {
  return String(str).length * ADV - 1;
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
      for (const [dx, dy] of DOTS[ch] ?? []) ctx.fillRect(x0 + i * ADV + dx + ox, y + dy + oy, 1, 1);
    });
  };
  if (outline) {
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pass(outline, ox, oy);
  }
  pass(color, 0, 0);
  return digitsWidth(str);
}
