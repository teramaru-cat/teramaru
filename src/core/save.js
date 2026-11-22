// 保存データ
// 外に見せるのは load() と save() だけ。将来ログインを付けるときは、この中身をサーバー保存に差し替える。

const KEY = 'teramaru.save.v1';

const DEFAULT = () => ({
  version: 2,
  coins: 0,
  bestScore: {}, // ステージの id（'park' など）→ ベストスコア
  unlocked: [], // 点数で開いたステージの id
  cleared: [], // クリアしたステージの id（チュートリアルなど、点数のないステージ）
  learned: {}, // 覚えたこと（トイレフィーバーなど。ボス戦で覚える）
  seenIntro: [], // 「あそびかた」（はじめての しくみ の説明）を見たステージの id
  archive: {},
  settings: { mute: false },
});

// 古い保存データ（ステージを番号で持っていた版）を、ステージの id に直す。1＝商店街、2＝公園
const OLD_IDS = { 1: 'shotengai', 2: 'park' };
function migrate(d) {
  if ((d.version ?? 1) >= 2) return d;
  const best = {};
  for (const [k, v] of Object.entries(d.bestScore ?? {})) best[OLD_IDS[k] ?? k] = v;
  const unlocked = (d.unlockedStages ?? []).map((n) => OLD_IDS[n]).filter(Boolean);
  const { unlockedStages, ...rest } = d;
  void unlockedStages;
  return { ...rest, version: 2, bestScore: best, unlocked };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return { ...DEFAULT(), ...migrate(JSON.parse(raw)) };
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
