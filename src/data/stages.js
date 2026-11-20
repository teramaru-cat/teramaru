// ステージ定義
// 地面は 16ドット四方のマスで塗る。S=歩道 R=道路 G=芝生 P=レンガ
// 建物・小物・特別な場所は、マス座標（c, r）で置く。

const T = 16;
const at = (c, r) => ({ x: c * T + 8, y: r * T + 8 });

export const STAGES = {
  1: {
    id: 1,
    name: 'しょうてんがい',
    cols: 60,
    rows: 34,
    seed: 11,
    paint(g) {
      g.fill(0, 0, 59, 33, 'S');
      g.fill(25, 0, 32, 6, 'P'); // 上の広場
      g.fill(0, 10, 59, 13, 'R'); // 横の道路
      g.fill(28, 14, 31, 33, 'R'); // 縦の道路
      g.fill(33, 16, 59, 33, 'G'); // 公園
      g.fill(33, 24, 59, 25, 'P');
      g.fill(45, 16, 46, 33, 'P');
    },
    // 横断歩道（道路の上に白線）
    crosswalks: [
      { c: 25, r: 10, w: 2, h: 4, dir: 'v' },
      { c: 34, r: 10, w: 2, h: 4, dir: 'v' },
      { c: 28, r: 15, w: 4, h: 2, dir: 'h' },
    ],
    centerLines: [
      { dir: 'h', r: 12, c0: 0, c1: 59, skip: [24, 36] },
      { dir: 'v', c: 30, r0: 14, r1: 33, skip: [14, 17] },
    ],
    buildings: [
      { c: 1, r: 0, w: 7, h: 7, kind: 'shop', sign: 'パン', wall: '#f3dcb2', roof: '#b0533a', awning: '#e0703a' },
      { c: 9, r: 0, w: 7, h: 7, kind: 'shop', sign: 'さかな', wall: '#dfe9ef', roof: '#3c6e9a', awning: '#3a8ad0' },
      { c: 17, r: 0, w: 7, h: 7, kind: 'shop', sign: 'カフェ', wall: '#e8d5c4', roof: '#6b4a3a', awning: '#2f8a5a' },
      { c: 34, r: 0, w: 6, h: 7, kind: 'shop', sign: 'ほん', wall: '#efe3c8', roof: '#7a5a9a', awning: '#8a5ab0' },
      { c: 41, r: 0, w: 6, h: 7, kind: 'shop', sign: 'はな', wall: '#fbe8ee', roof: '#c25a7a', awning: '#e888a8' },
      { c: 48, r: 0, w: 11, h: 7, kind: 'shop', sign: 'スーパー', wall: '#f0f0e8', roof: '#4a8a4a', awning: '#e04a3a' },
      { c: 1, r: 16, w: 11, h: 6, kind: 'hospital', sign: 'びょういん', wall: '#fafafa', roof: '#8fb8c8' },
      { c: 14, r: 16, w: 6, h: 6, kind: 'house', wall: '#f0e0c0', roof: '#c05050' },
      { c: 21, r: 16, w: 6, h: 6, kind: 'house', wall: '#dde8d0', roof: '#4060a0' },
      { c: 1, r: 26, w: 12, h: 8, kind: 'apart', wall: '#e0dcd4', roof: '#807870' },
      { c: 14, r: 26, w: 7, h: 8, kind: 'shop', sign: 'ラーメン', wall: '#f5e6c8', roof: '#3a3a3a', awning: '#c8302a' },
      { c: 21, r: 26, w: 6, h: 8, kind: 'shop', sign: 'くすり', wall: '#eef4f8', roof: '#2a6aaa', awning: '#2aa0d0' },
    ],
    props: [
      // 街路樹
      ...[3, 11, 19, 37, 44, 52].map((c) => ({ type: 'tree', ...at(c, 8), y: 8 * T + 14 })),
      ...[36, 40, 50, 55, 38, 57, 52].map((c, i) => ({ type: 'tree', ...at(c, [18, 21, 19, 22, 30, 29, 32][i]) })),
      // 爪とぎ
      { type: 'scratch', ...at(27, 8), y: 8 * T + 12 },
      { type: 'scratch', ...at(9, 23) },
      { type: 'scratch', ...at(24, 23) },
      { type: 'scratch', ...at(48, 8), y: 8 * T + 12 },
      { type: 'scratch', ...at(43, 30) },
      // 水飲み
      { type: 'water', ...at(5, 8) },
      { type: 'water', ...at(7, 23) },
      { type: 'water', ...at(41, 28) },
      { type: 'water', ...at(33, 8) },
      { type: 'water', ...at(50, 14) },
      // 猫砂（おなかがいっぱいになったら行く）
      { type: 'litter', ...at(15, 8) },
      { type: 'litter', ...at(17, 24) },
      { type: 'litter', ...at(54, 17) },
      { type: 'litter', ...at(36, 31) },
      // その他
      { type: 'fountain', x: 46 * T, y: 25 * T + 14 },
      { type: 'bench', ...at(40, 23) },
      { type: 'bench', ...at(52, 27) },
      { type: 'vending', ...at(27, 3) },
      { type: 'vending', ...at(31, 3) },
      { type: 'flowerpot', ...at(42, 7), y: 7 * T + 6 },
      { type: 'flowerpot', ...at(46, 7), y: 7 * T + 6 },
    ],
    start: at(18, 14),
    hospital: at(6, 22),
  },
  2: {
    id: 2,
    name: 'こうえん',
    cols: 60,
    rows: 34,
    seed: 22,
    paint(g) {
      g.fill(0, 0, 59, 33, 'G');
      g.fill(0, 0, 59, 2, 'S'); // 上の歩道（お店の前）
      g.fill(0, 31, 59, 33, 'S'); // 下の歩道
      g.fill(0, 15, 59, 17, 'P'); // 横の大通り
      g.fill(27, 0, 31, 33, 'P'); // 縦の大通り
      g.fill(23, 12, 35, 20, 'P'); // 噴水の広場
      g.fill(4, 6, 6, 30, 'P'); // 左の小道
      g.fill(4, 6, 26, 7, 'P');
      g.fill(4, 25, 26, 26, 'P');
      g.fill(36, 20, 54, 30, 'P'); // 池のまわり
      g.fill(38, 22, 52, 28, 'W'); // 池
      g.fill(42, 6, 57, 8, 'P'); // 右上の小道
      g.fill(55, 6, 57, 20, 'P');
    },
    crosswalks: [],
    centerLines: [],
    buildings: [
      { c: 1, r: 9, w: 8, h: 5, kind: 'hospital', sign: 'びょういん', wall: '#fafafa', roof: '#8fb8c8' },
      { c: 33, r: 3, w: 6, h: 5, kind: 'shop', sign: 'ばいてん', wall: '#f5e6c8', roof: '#2f8a5a', awning: '#f0a030' },
      { c: 10, r: 9, w: 5, h: 5, kind: 'house', wall: '#efe3c8', roof: '#7a5a3a' }, // 管理小屋
      { c: 12, r: 27, w: 7, h: 4, kind: 'house', wall: '#f0e0c0', roof: '#c05050' }, // トイレ（公園の）
    ],
    props: [
      // 木（芝生の上にたくさん）
      ...[[9, 4], [15, 4], [21, 4], [36, 11], [41, 12], [47, 11], [52, 13], [9, 20], [15, 22], [21, 20], [11, 30], [24, 29],
        [34, 25], [57, 27], [45, 4], [51, 4], [19, 12], [38, 32]].map(([c, r]) => ({ type: 'tree', ...at(c, r) })),
      // 爪とぎ
      { type: 'scratch', ...at(8, 14) },
      { type: 'scratch', ...at(33, 21) },
      { type: 'scratch', ...at(54, 9) },
      // 水飲み
      { type: 'water', ...at(7, 24) },
      { type: 'water', ...at(25, 8) },
      { type: 'water', ...at(53, 21) },
      { type: 'water', ...at(32, 31) },
      // 猫砂
      { type: 'litter', ...at(18, 24) },
      { type: 'litter', ...at(48, 9) },
      { type: 'litter', ...at(36, 29) },
      { type: 'litter', ...at(2, 30) },
      // 噴水・ベンチ・花・自販機
      { type: 'fountain', x: 29 * T + 8, y: 16 * T + 18 },
      { type: 'flowerpot', ...at(26, 21) },
      { type: 'flowerpot', ...at(32, 21) },
      { type: 'vending', ...at(40, 1), y: T * 2 + 6 },
    ],
    // ベンチ（ランドマーク）：ずっとここにある。てらまりんぐ（マーキング）できる。飾りのベンチは置かない（見分けがつかないので）
    fixedTargets: [[24, 13], [34, 13], [44, 21], [46, 29], [14, 8], [14, 16]].map(([c, r]) => ({ id: 'bench', ...at(c, r) })),
    start: at(29, 21),
    hospital: at(5, 15),
  },
};
