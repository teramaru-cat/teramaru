// 保存データ
// 外に見せるのは load() と save() だけ。将来ログインを付けるときは、この中身をサーバー保存に差し替える。

const KEY = 'teramaru.save.v1';

const DEFAULT = () => ({
  version: 1,
  coins: 0,
  bestScore: {},
  unlockedStages: [1],
  archive: {},
  settings: { mute: false },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return { ...DEFAULT(), ...JSON.parse(raw) };
  } catch {
    return DEFAULT();
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // プライベートモードなどで保存できないときも、ゲームは続けられるようにする
  }
}
