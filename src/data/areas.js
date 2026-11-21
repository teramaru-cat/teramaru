// エリアとステージ（連絡.txt の構成）
//
// ステージの並び・出てくる人・使えるしくみ・開く条件は、ここを書きかえるだけで変えられる。
// 1つのエリアに「ステージ3つ＋ボス」を並べる（チュートリアルだけはステージ1つ）。
//
// ステージの書き方：
//   id      … 半角の名前（保存データのベストスコアなどに使う。あとから変えない）
//   名前    … src/i18n/<言語>.js の stage.<id>（エリアは area.<id>）
//   map     … 街の地図（src/data/maps/）。まだ作っていないステージは null（「じゅんびちゅう」になる）
//   boss    … ボス戦なら true
//   tutorial… チュートリアルなら true（時間なし。流れは src/game/tutorial.js。おわったら結果発表なしでステージ選択へ）
//   targets … 出てくるターゲットと人数 { id: 人数 }（id は src/data/targets.js）
//   rules   … 使えるしくみ（下の RULES を土台に、ちがうところだけ書く）
//   unlock  … 開く条件 { after: 前のステージの id, score: その点数以上 }。なければ最初から開いている。
//             前のステージがまだ「じゅんびちゅう」なら、その条件は飛ばして開いている扱いにする

import { SHOTENGAI } from './maps/shotengai.js';
import { PARK } from './maps/park.js';
import { HOME } from './maps/home.js';
import { JUTAKU } from './maps/jutaku.js';
import { tr } from '../i18n/index.js';

// しくみ（ステージごとに、オン・オフや数を変える）
export const RULES = {
  water: true, // お水：のどが渇く・水飲み・倒れて病院
  food: true, // ご飯・おなか・猫砂でトイレ（ターゲットがご飯を落とす）
  fever: true, // トイレのあとのトイレフィーバー（ボス猫戦で覚える）
  scratch: true, // 爪とぎで TP 2倍
  onedari: true, // おねだり（構ってもらう）
  strays: 0, // ほかの猫の数（ニガテゾーン）
  timer: true, // 制限時間（90秒）。false なら時間なし・スコアなし（チュートリアル）
};

// ステージごとの「最初に流すしくみ」は少しずつ増やす：公園でお水、商店街でご飯・トイレ、ボス猫戦でフィーバー
const BASIC = { water: false, food: false, fever: false };

export const AREAS = [
  {
    id: 'tutorial',
    stages: [
      {
        id: 'home',
        // てらまるの1フロアの家。飼い主2人をメロメロ → ウィルニャが使命を伝える（猫は家で飼おうね）→ 予防接種 → 街へ
        // 流れは src/game/tutorial.js
        tutorial: true,
        map: HOME,
        targets: {}, // 飼い主2人は地図の fixedTargets
        rules: { ...BASIC, scratch: false, onedari: false, timer: false },
      },
    ],
  },
  {
    id: 'kinjo',
    stages: [
      {
        id: 'jutaku',
        // 一軒家とアパートの住宅地。会社員・杖のおばあちゃん・子ども。しくみは爪とぎとおねだりだけ
        map: JUTAKU,
        targets: { salaryman: 5, grandma: 4, family: 4 },
        rules: { ...BASIC },
        unlock: { after: 'home' },
      },
      {
        id: 'park',
        // ここで初めてお水。ブランコ・すべり台はこれから
        map: PARK,
        targets: { pigeons: 3, dog: 3, salaryman: 3, grandma: 3, child: 3 },
        rules: { ...BASIC, water: true, strays: 3 },
        unlock: { after: 'jutaku', score: 1500 },
      },
      {
        id: 'shotengai',
        // ここで初めてご飯・おなか・トイレ
        map: SHOTENGAI,
        targets: { greengrocer: 3, fishmonger: 3, butcher: 3, baker: 3, grandma: 3, child: 3, salaryman: 3 },
        rules: { ...BASIC, water: true, food: true },
        unlock: { after: 'park', score: 1500 },
      },
      {
        id: 'bossneko',
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
  Object.defineProperty(area, 'name', { get: () => tr(`area.${area.id}`) }); // 名前は i18n
  area.stages.forEach((st, si) => {
    Object.defineProperty(st, 'name', { get: () => tr(`stage.${st.id}`) });
    st.area = area;
    st.areaNo = ai; // チュートリアルがエリア0（てらまるのいえ＝0-1）、きんじょがエリア1（じゅうたくち＝1-1）
    st.no = si + 1;
    Object.defineProperty(st, 'label', { get: () => (st.boss ? `${ai}-${tr('common.boss')}` : `${ai}-${si + 1}`) });
    st.rules = { ...RULES, ...st.rules };
    STAGES[st.id] = st;
  });
});

export const FIRST_STAGE = 'home'; // 最初のステージ（チュートリアル）

// 遊べるか（地図ができているか）
export function isReady(id) { return !!STAGES[id]?.map; }

// 開いているか：地図ができていて、（保存データで開いている／開く条件がない／前のステージがまだできていない）
export function isOpen(id, save) {
  const st = STAGES[id];
  if (!st || !isReady(id)) return false;
  const u = st.unlock;
  // 一度遊んだステージも開いたまま（あとから前にステージが増えても、閉じないように）
  return save.unlocked.includes(id) || save.bestScore[id] != null || !u || !isReady(u.after);
}

// この点数で新しく開くステージ
export function newlyOpened(id, score, save) {
  return Object.values(STAGES).filter((st) => st.unlock?.after === id && score >= (st.unlock.score ?? 0)
    && isReady(st.id) && !save.unlocked.includes(st.id));
}
