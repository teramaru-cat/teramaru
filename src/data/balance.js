// ゲームの数値はここにまとめる（遊びながら調整する）

export const BAL = {
  playSeconds: 90,
  cat: {
    speed: 32, // ドット/秒。ふつうに歩く速さ（トイレ中は1.5倍の48）
    footW: 10, // 当たり判定（足元の箱）
    footH: 6,
  },
  pointer: {
    stickRadius: 20, // タッチのスティックの半径（ドット）
    stickDead: 0.15,
    mouseFull: 32, // マウスでこれ以上離れたら全速
    mouseDead: 6,
  },
};
