// スコアとコインの計算（仕様書 §8）

import { BAL } from '../data/balance.js';

// プレイ中に見せるスコア（ノーミスボーナスは最後に足す）
export function liveScore(st) {
  return st.tpTotal * BAL.score.tp + st.fpTotal * BAL.score.fp + (st.kamaware ?? 0);
}

export function finalScore(st) {
  const ring = st.tpTotal * BAL.score.tp;
  const food = st.fpTotal * BAL.score.fp;
  const kamaware = st.kamaware ?? 0;
  const noMiss = (st.faints ?? 0) === 0 ? BAL.score.noMiss : 0;
  const total = ring + food + kamaware + noMiss;
  return { ring, food, kamaware, noMiss, total, coins: Math.floor(total * BAL.score.coinRate) };
}
