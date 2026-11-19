// 音（効果音はブラウザ内で合成、BGMは audio/bgm.mp3 があれば流す）
//
// - スマホは最初のタップ・キーを押すまで音が出せない（ブラウザの仕様）。そのときに音の準備をする
// - ミュートは保存データの settings.mute に入れる
// - 外に見せるのは audio.init / audio.sfx(name) / audio.setMuted / audio.duck

const BGM_URL = 'audio/bgm.mp3';
const BGM_VOL = 0.45;
const SFX_VOL = 0.5;

let ac = null; // AudioContext
let master = null;
let sfxBus = null;
let bgmBus = null;
let noiseBuf = null;
let bgmBuf = null;
let bgmSrc = null;
let bgmLoading = false;
let bgmMissing = false; // 曲のファイルが無い（何度も読みに行かない）
const last = {}; // 同じ音を短い間に重ねすぎないように

export const audio = {
  muted: false,

  init(muted) {
    this.muted = !!muted;
    const unlock = () => {
      ensure();
      if (ac && ac.state !== 'running') ac.resume().catch(() => {});
      startBgm();
    };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!ac) return;
      if (document.hidden) ac.suspend().catch(() => {});
      else ac.resume().catch(() => {});
    });
  },

  setMuted(m) {
    this.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.02);
  },

  // ポーズ中などは BGM を小さく
  duck(on) {
    if (bgmBus) bgmBus.gain.setTargetAtTime(on ? BGM_VOL * 0.35 : BGM_VOL, ac.currentTime, 0.1);
  },

  sfx(name, arg) {
    if (!ac || ac.state !== 'running' || this.muted) return;
    const f = SFX[name];
    if (!f) return;
    const now = ac.currentTime;
    const gap = GAP[name] ?? 0.03;
    if (last[name] !== undefined && now - last[name] < gap) return;
    last[name] = now;
    f(now, arg);
  },
};

function ensure() {
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = audio.muted ? 0 : 1;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = SFX_VOL;
  sfxBus.connect(master);
  bgmBus = ac.createGain();
  bgmBus.gain.value = BGM_VOL;
  bgmBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

async function startBgm() {
  if (!ac || bgmSrc || bgmLoading || bgmMissing) return;
  bgmLoading = true;
  try {
    if (!bgmBuf) {
      const res = await fetch(BGM_URL);
      if (!res.ok) { bgmMissing = true; return; } // 曲がまだ無いときは BGM なし
      const data = await res.arrayBuffer();
      bgmBuf = await new Promise((ok, ng) => ac.decodeAudioData(data, ok, ng));
    }
    bgmSrc = ac.createBufferSource();
    bgmSrc.buffer = bgmBuf;
    bgmSrc.loop = true;
    bgmSrc.connect(bgmBus);
    bgmSrc.start();
  } catch {
    bgmMissing = true; // 読めなくてもゲームは続ける
  } finally {
    bgmLoading = false;
  }
}

// ---- 音の部品 ----

// ピコッという音。type: square | triangle | sine | sawtooth
function tone(t, freq, dur, { type = 'square', vol = 0.3, to = null, attack = 0.005 } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// ザッという音（爪とぎ・猫砂など）
function noise(t, dur, { vol = 0.3, freq = 2000, q = 1 } = {}) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random() * 0.3);
  s.stop(t + dur + 0.02);
}

function notes(t, list, step, opts) {
  list.forEach((f, i) => tone(t + i * step, f, step * 1.6, opts));
}

// ド〜ドの音の高さ
const N = { C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, E6: 1319, G6: 1568, C4: 262, E4: 330, G4: 392 };

// 同じ音を鳴らせる最短の間隔（秒）
const GAP = { heart: 0.06, eat: 0.08, tick: 0.5, drink: 1.2 };

const SFX = {
  ui: (t) => tone(t, 880, 0.06, { vol: 0.2 }),
  // 1周（何周目かで少しずつ高く）
  lap: (t, n = 1) => {
    const f = 660 * Math.pow(2, Math.min(n - 1, 6) / 12);
    tone(t, f, 0.08, { vol: 0.25 });
    tone(t + 0.07, f * 1.5, 0.12, { vol: 0.25 });
  },
  hit: (t) => {
    noise(t, 0.12, { vol: 0.4, freq: 400 });
    tone(t, 220, 0.15, { to: 90, vol: 0.25 });
  },
  win: (t) => notes(t, [N.C5, N.E5, N.G5, N.C6], 0.07, { vol: 0.25 }),
  lose: (t) => notes(t, [N.G4, N.E4, N.C4], 0.12, { type: 'triangle', vol: 0.35 }),
  heart: (t) => tone(t, 1400 + Math.random() * 300, 0.05, { type: 'triangle', vol: 0.15 }),
  eat: (t) => {
    tone(t, 300, 0.05, { vol: 0.15 });
    tone(t + 0.07, 360, 0.05, { vol: 0.15 });
  },
  drink: (t) => {
    tone(t, 400, 0.08, { type: 'sine', to: 900, vol: 0.35 });
    tone(t + 0.12, 450, 0.08, { type: 'sine', to: 1000, vol: 0.35 });
  },
  scratch: (t) => { for (let i = 0; i < 4; i++) noise(t + i * 0.22, 0.12, { vol: 0.35, freq: 1800, q: 0.8 }); },
  toilet: (t) => { for (let i = 0; i < 5; i++) noise(t + i * 0.28, 0.1, { vol: 0.25, freq: 3000, q: 0.6 }); },
  full: (t) => notes(t, [N.E5, N.D5, N.E5, N.D5], 0.08, { type: 'triangle', vol: 0.2 }),
  fever: (t) => notes(t, [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 0.05, { vol: 0.22 }),
  warn: (t) => {
    tone(t, 1000, 0.08, { vol: 0.15 });
    tone(t + 0.14, 1000, 0.08, { vol: 0.15 });
  },
  faint: (t) => {
    tone(t, 700, 0.5, { type: 'triangle', to: 120, vol: 0.35 });
    noise(t + 0.45, 0.15, { vol: 0.4, freq: 300 });
  },
  recover: (t) => notes(t, [N.C5, N.G5], 0.1, { type: 'triangle', vol: 0.3 }),
  // にゃーん（上がって下がる）
  meow: (t) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(600, t);
    o.frequency.linearRampToValueAtTime(950, t + 0.12);
    o.frequency.linearRampToValueAtTime(520, t + 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.03);
    g.gain.linearRampToValueAtTime(0.25, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.5);
  },
  yes: (t) => notes(t, [N.G5, N.C6, N.E6], 0.08, { vol: 0.22 }),
  no: (t) => notes(t, [N.E4, N.C4], 0.16, { type: 'triangle', vol: 0.35 }),
  punch: (t) => {
    tone(t, 500 + Math.random() * 200, 0.05, { vol: 0.2 });
    noise(t, 0.04, { vol: 0.2, freq: 2500 });
  },
  catch: (t) => notes(t, [N.C6, N.G5, N.C6, N.E6], 0.06, { vol: 0.22 }),
  timeBonus: (t) => notes(t, [N.B5, N.E6], 0.06, { vol: 0.22 }),
  tick: (t) => tone(t, 1200, 0.03, { vol: 0.12 }),
  end: (t) => notes(t, [N.G5, N.E5, N.C5, N.G5, N.C6], 0.1, { vol: 0.25 }),
  row: (t) => tone(t, 700, 0.05, { vol: 0.15 }),
  best: (t) => notes(t, [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6], 0.08, { vol: 0.25 }),
};
