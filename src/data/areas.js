// エリアとステージ（連絡.txt の構成）
//
// ステージの並び・出てくる人・使えるしくみ・開く条件は、ここを書きかえるだけで変えられる。
// 1つのエリアに「ステージ3つ＋ボス」を並べる（チュートリアルだけはステージ1つ）。
//
// ステージの書き方：
//   id      … 半角の名前（保存データのベストスコアなどに使う。あとから変えない）
//   name    … 画面に出す名前（ひらがな）
//   map     … 街の地図（src/data/maps/）。まだ作っていないステージは null（「じゅんびちゅう」になる）
//   boss    … ボス戦なら true
//   targets … 出てくるターゲットと人数 { id: 人数 }（id は src/data/targets.js）
//   rules   … 使えるしくみ（下の RULES を土台に、ちがうところだけ書く）
//   unlock  … 開く条件 { after: 前のステージの id, score: その点数以上 }。なければ最初から開いている。
//             前のステージがまだ「じゅんびちゅう」なら、その条件は飛ばして開いている扱いにする

import { SHOTENGAI } from './maps/shotengai.js';
import { PARK } from './maps/park.js';

// しくみ（ステージごとに、オン・オフや数を変える）
export const RULES = {
  water: true, // お水：のどが渇く・水飲み・倒れて病院
  food: true, // ご飯・おなか・猫砂でトイレ（ターゲットがご飯を落とす）
  fever: true, // トイレのあとのトイレフィーバー（ボス猫戦で覚える）
  scratch: true, // 爪とぎで TP 2倍
  onedari: true, // おねだり（構ってもらう）
  strays: 0, // ほかの猫の数（ニガテゾーン）
};

// ステージごとの「最初に流すしくみ」は少しずつ増やす：公園でお水、商店街でご飯・トイレ、ボス猫戦でフィーバー
const BASIC = { water: false, food: false, fever: false };

export const AREAS = [
  {
    id: 'tutorial',
    name: 'チュートリアル',
    stages: [
      {
        id: 'home',
        name: 'てらまるのいえ',
        // てらまるの1フロアの家。飼い主2人をメロメロ → 使命をもらう（猫は家で飼おうね）→ 予防接種 → 街へ
        map: null,
        targets: {},
        rules: { ...BASIC, scratch: false, onedari: false },
      },
    ],
  },
  {
    id: 'kinjo',
    name: 'きんじょ',
    stages: [
      {
        id: 'jutaku',
        name: 'じゅうたくち',
        map: null,
        targets: { salaryman: 3, grandma: 3, child: 3 },
        rules: { ...BASIC },
        unlock: { after: 'home' },
      },
      {
        id: 'park',
        name: 'こうえん',
        // ここで初めてお水。ブランコ・すべり台はこれから
        map: PARK,
        targets: { pigeons: 3, dog: 3, salaryman: 3, grandma: 3, child: 3 },
        rules: { ...BASIC, water: true, strays: 3 },
        unlock: { after: 'jutaku', score: 1500 },
      },
      {
        id: 'shotengai',
        name: 'しょうてんがい',
        // ここで初めてご飯・おなか・トイレ
        map: SHOTENGAI,
        targets: { greengrocer: 3, fishmonger: 3, butcher: 3, baker: 3, grandma: 3, child: 3, salaryman: 3 },
        rules: { ...BASIC, water: true, food: true },
        unlock: { after: 'park', score: 1500 },
      },
      {
        id: 'bossneko',
        name: 'ボスねこ',
        boss: true,
        // ストーリーに縦にからむボス猫。戦いの途中でトイレフィーバーを覚える
        map: null,
        targets: {},
        rules: { water: true, food: true, fever: true },
        unlock: { after: 'shotengai', score: 2000 },
      },
    ],
  },
];

// ---- ここから下は、上の表を使いやすくするための道具 ----

export const STAGES = {};
AREAS.forEach((area, ai) => {
  area.stages.forEach((st, si) => {
    st.area = area;
    st.areaNo = ai + 1;
    st.no = si + 1;
    st.label = st.boss ? `${ai + 1}-ボス` : `${ai + 1}-${si + 1}`;
    st.rules = { ...RULES, ...st.rules };
    STAGES[st.id] = st;
  });
});

export const FIRST_STAGE = 'park'; // いま遊べる最初のステージ（チュートリアルと住宅地ができたら 'home' にする）

// 遊べるか（地図ができているか）
export function isReady(id) { return !!STAGES[id]?.map; }

// 開いているか：地図ができていて、（保存データで開いている／開く条件がない／前のステージがまだできていない）
export function isOpen(id, save) {
  const st = STAGES[id];
  if (!st || !isReady(id)) return false;
  const u = st.unlock;
  return save.unlocked.includes(id) || !u || !isReady(u.after);
}

// この点数で新しく開くステージ
export function newlyOpened(id, score, save) {
  return Object.values(STAGES).filter((st) => st.unlock?.after === id && score >= (st.unlock.score ?? 0)
    && isReady(st.id) && !save.unlocked.includes(st.id));
}
