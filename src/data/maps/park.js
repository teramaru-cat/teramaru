// 街の地図：公園
// 地面は 16ドット四方のマスで塗る。S=歩道 R=道路 G=芝生 P=レンガ W=池（入れない）
// 建物・小物・特別な場所は、マス座標（c, r）で置く。
// start：スタート地点、hospital：倒れたときに運ばれる病院の前、fixedTargets：ずっと同じ場所にいるターゲット（ベンチなど）

const T = 16;
const at = (c, r) => ({ x: c * T + 8, y: r * T + 8 });

export const PARK = {
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
};
