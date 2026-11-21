// 街の地図：じゅうたくち（1-1）
// 十字路のまわりに一軒家とアパート。家の前に庭と生け垣、歩道に電柱（爪とぎ）。右下は小さな公園、左下は空き地。
// 地面：S=歩道 R=道路 G=芝生（庭・空き地） P=レンガ（公園の小道）

const T = 16;
const at = (c, r) => ({ x: c * T + 8, y: r * T + 8 });

// 家の前の生け垣：row の行に c0〜c1 まで。doors の列（玄関の前）はあける
function hedges(row, c0, c1, doors) {
  const list = [];
  for (let c = c0; c <= c1; c++) if (!doors.includes(c)) list.push({ type: 'hedge', ...at(c, row), y: row * T + 14 });
  return list;
}

export const JUTAKU = {
  cols: 56,
  rows: 32,
  seed: 31,
  paint(g) {
    g.fill(0, 0, 55, 31, 'S');
    g.fill(0, 12, 55, 14, 'R'); // 横の道路
    g.fill(26, 0, 28, 31, 'R'); // 縦の道路
    // 庭（家の前）
    g.fill(1, 7, 24, 9, 'G');
    g.fill(30, 8, 45, 9, 'G');
    g.fill(1, 23, 24, 24, 'G');
    g.fill(30, 23, 45, 24, 'G');
    // 左下の空き地・右下の小さな公園
    g.fill(0, 26, 25, 31, 'G');
    g.fill(29, 26, 55, 31, 'G');
    g.fill(29, 28, 55, 28, 'P');
    g.fill(42, 26, 43, 31, 'P');
  },
  crosswalks: [
    { c: 24, r: 12, w: 2, h: 3, dir: 'v' },
    { c: 29, r: 12, w: 2, h: 3, dir: 'v' },
    { c: 26, r: 10, w: 3, h: 2, dir: 'h' },
    { c: 26, r: 15, w: 3, h: 2, dir: 'h' },
  ],
  centerLines: [
    { dir: 'h', r: 13.5, c0: 0, c1: 55, skip: [23, 31] },
    { dir: 'v', c: 27.5, r0: 0, r1: 31, skip: [9, 17] },
  ],
  // 家と家の間は2マスあけて、通りぬけられる（生け垣もそこは切る）
  buildings: [
    // 左上
    { c: 1, r: 1, w: 6, h: 6, kind: 'home', wall: '#f0e0c0', roof: '#c05050' },
    { c: 9, r: 1, w: 6, h: 6, kind: 'home', wall: '#dde8d0', roof: '#4060a0' },
    { c: 17, r: 1, w: 7, h: 6, kind: 'home', wall: '#f4ece0', roof: '#5a8a4a' },
    // 右上
    { c: 30, r: 1, w: 6, h: 7, kind: 'home', wall: '#efe0d8', roof: '#8a5a8a' },
    { c: 38, r: 1, w: 6, h: 7, kind: 'home', wall: '#e8e4d0', roof: '#c08040' },
    { c: 47, r: 0, w: 8, h: 9, kind: 'apart', wall: '#e0dcd4', roof: '#807870' },
    // 左下
    { c: 1, r: 17, w: 6, h: 6, kind: 'home', wall: '#e8dcc8', roof: '#3a6a8a' },
    { c: 9, r: 17, w: 6, h: 6, kind: 'home', wall: '#f6e8d8', roof: '#b04848' },
    { c: 17, r: 17, w: 7, h: 6, kind: 'home', wall: '#dfe6e8', roof: '#6a6a72' },
    // 右下
    { c: 30, r: 17, w: 6, h: 6, kind: 'home', wall: '#f0e8d0', roof: '#4a7a6a' },
    { c: 38, r: 17, w: 7, h: 6, kind: 'home', wall: '#f4e0e0', roof: '#a05a3a' },
    { c: 48, r: 17, w: 7, h: 7, kind: 'apart', wall: '#e8e0d0', roof: '#7a7068' },
  ],
  props: [
    // 生け垣（玄関の前と、家と家の間の通り道はあける）
    ...hedges(9, 1, 24, [3, 4, 7, 8, 11, 12, 15, 16, 20, 21]),
    ...hedges(9, 30, 45, [32, 33, 36, 37, 40, 41, 44, 45]),
    ...hedges(24, 1, 24, [3, 4, 7, 8, 11, 12, 15, 16, 20, 21]),
    ...hedges(24, 30, 45, [32, 33, 36, 37, 41, 42, 45]),
    // 電柱（爪とぎ）
    { type: 'scratch', ...at(8, 11), y: 11 * T + 12 },
    { type: 'scratch', ...at(19, 11), y: 11 * T + 12 },
    { type: 'scratch', ...at(36, 11), y: 11 * T + 12 },
    { type: 'scratch', ...at(51, 11), y: 11 * T + 12 },
    { type: 'scratch', ...at(14, 16), y: 16 * T + 4 },
    { type: 'scratch', ...at(45, 16), y: 16 * T + 4 },
    // 庭の木・自転車・ポスト
    { type: 'tree', ...at(1, 8) },
    { type: 'tree', ...at(24, 8) },
    { type: 'tree', ...at(1, 23) },
    { type: 'tree', ...at(35, 23) },
    { type: 'bicycle', ...at(5, 8) },
    { type: 'bicycle', ...at(34, 8) },
    { type: 'bicycle', ...at(52, 10) },
    { type: 'mailbox', ...at(25, 10) },
    { type: 'mailbox', ...at(43, 15), y: 15 * T + 6 },
    { type: 'flowerpot', ...at(14, 8) },
    { type: 'flowerpot', ...at(29, 8) },
    { type: 'vending', ...at(29, 16), y: 16 * T + 12 },
    // 左下の空き地
    { type: 'tree', ...at(3, 28) },
    { type: 'tree', ...at(12, 30) },
    { type: 'tree', ...at(20, 27) },
    // 右下の小さな公園
    { type: 'tree', ...at(31, 27) },
    { type: 'tree', ...at(37, 30) },
    { type: 'tree', ...at(47, 27) },
    { type: 'tree', ...at(53, 30) },
    { type: 'flowerpot', ...at(40, 27) },
    { type: 'flowerpot', ...at(45, 27) },
    { type: 'scratch', ...at(50, 29), y: 29 * T + 12 },
  ],
  start: at(24, 16),
  hospital: at(5, 16),
};
