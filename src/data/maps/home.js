// 家の地図：てらまるのいえ（チュートリアル 0-1）
// 1フロアの家。左がリビング、右が台所とダイニング（まん中の壁に出入り口）。
// 地面：F=板の床 K=台所のタイル C=じゅうたん X=壁（入れない）
// 飼い主2人は fixedTargets（家の中をゆっくり歩く。メロメロにしても去らない）

const T = 16;
const at = (c, r) => ({ x: c * T + 8, y: r * T + 8 });

export const HOME = {
  cols: 26,
  rows: 15,
  seed: 7,
  paint(g) {
    g.fill(0, 0, 25, 14, 'X'); // まず全部壁
    g.fill(1, 2, 12, 13, 'F'); // リビング
    g.fill(3, 7, 9, 11, 'C'); // じゅうたん
    g.fill(14, 2, 24, 7, 'K'); // 台所
    g.fill(14, 8, 24, 13, 'F'); // ダイニング
    g.fill(13, 8, 13, 10, 'F'); // 出入り口
  },
  crosswalks: [],
  centerLines: [],
  buildings: [],
  props: [
    // リビング：上の壁にテレビ、じゅうたんにちゃぶ台、下にテレビを向いたソファ（うしろ姿）
    // 左下：三段ケージ（90度まわして左の壁にくっつける）と、その横に猫砂（てらまるのコーナー。テレビからははなす）
    { type: 'tv', x: 6 * T + 8, y: 4 * T + 2 },
    { type: 'lowTable', x: 6 * T + 8, y: 9 * T + 6 },
    { type: 'sofaBack', x: 6 * T + 8, y: 12 * T + 14 },
    { type: 'cageSide', x: 1 * T + 10, y: 13 * T + 14 }, // てらまるの三段ケージ（横向き）
    { type: 'litter', x: 2 * T + 14, y: 13 * T + 10 }, // てらまるのトイレ（ケージの横）
    { type: 'water', x: 1 * T + 10, y: 8 * T + 8 }, // てらまるの水皿（チュートリアルではかざり）
    { type: 'flowerpot', ...at(1, 3) },
    // 台所・ダイニング：右下にキャットタワー
    { type: 'counter', x: 18 * T, y: 3 * T + 12 },
    { type: 'fridge', x: 22 * T + 8, y: 3 * T + 12 },
    { type: 'diningTable', x: 19 * T, y: 11 * T + 4 },
    { type: 'catTower', x: 23 * T + 8, y: 13 * T + 14 },
    { type: 'flowerpot', ...at(24, 8) },
  ],
  fixedTargets: [
    { id: 'ownerA', ...at(9, 6) },
    { id: 'ownerB', ...at(17, 9) },
  ],
  start: at(10, 9),
  hospital: at(10, 9), // 家では倒れないが、念のため
};
