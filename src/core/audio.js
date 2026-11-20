// 音（効果音はブラウザ内で合成、BGMは audio/ の曲ファイル）
//
// - スマホは最初のタップ・キーを押すまで音が出せない（ブラウザの仕様）。そのときに音の準備をする
// - ミュートは保存データの settings.mute に入れる
// - 外に見せるのは audio.init / audio.sfx(name) / audio.music(name) / audio.setMuted / audio.duck
//
// BGM：song＝てらまるの歌（トイレフィーバー）、play＝タイトルとふだんのプレイ中（ぴこぴこ版）。
// play の曲が無いときは song をそのまま流す。

const TRACKS = { song: 'audio/bgm.mp3', play: 'audio/bgm_play.mp3' };
const FADE = 0.5; // 曲を切り替えるときのフェード（秒）
const BGM_VOL = 0.07; // 曲は音が大きめに作られているので、かなり下げて後ろで流す（ポーズ中はさらに半分）
const SFX_VOL = 0.5;

let ac = null; // AudioContext
let master = null;
let sfxBus = null;
let bgmBus = null;
let noiseBuf = null;
let fiberBuf = null; // ガリガリ（細かく強弱のあるザラザラ）
let sandBuf = null; // 猫砂（ぱらぱらした粒の音）
const bufs = {}; // 読み込んだ曲（null＝ファイルが無い）
let want = null; // 流したい曲 { name, restart }
let cur = null; // 流れている曲 { name, src, gain }
const last = {}; // 同じ音を短い間に重ねすぎないように

export const audio = {
  muted: false,

  init(muted) {
    this.muted = !!muted;
    const unlock = () => {
      ensure();
      if (ac && ac.state !== 'running') ac.resume().catch(() => {});
      applyMusic();
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

  // BGM を切り替える。restart=true なら、同じ曲でも頭から
  music(name, { restart = false } = {}) {
    if (want && want.name === name && !restart) return;
    want = { name, restart };
    applyMusic();
  },

  // ポーズ中などは BGM を小さく
  duck(on) {
    if (bgmBus) bgmBus.gain.setTargetAtTime(on ? BGM_VOL * 0.5 : BGM_VOL, ac.currentTime, 0.1);
  },

  // スマホをブルッとさせる（Android など。iPhone のブラウザは非対応）。音を消しているときはしない
  buzz(ms) {
    if (this.muted) return;
    try { navigator.vibrate?.(ms); } catch { /* 非対応 */ }
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
  // 爪が繊維に引っかかる：9〜19ミリ秒ごと「ガッ」と引っかかっては抜ける（ガリガリの粒）
  fiberBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
  const fd = fiberBuf.getChannelData(0);
  const sr = ac.sampleRate;
  let next = 0;
  let k = 0;
  let amp = 0;
  for (let i = 0; i < fd.length; i++) {
    if (i >= next) { amp = Math.random() < 0.3 ? 1 : 0.35 + Math.random() * 0.5; k = 0; next = i + Math.floor(sr * (0.009 + Math.random() * 0.01)); }
    k++;
    const env = amp * Math.exp(-k / (sr * 0.003)); // 引っかかった瞬間が強く、すぐ弱まる
    fd[i] = (Math.random() * 2 - 1) * (env + 0.03);
  }
  // 砂粒：ときどきプチッと鳴る粒＋うすいサー
  sandBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const sd = sandBuf.getChannelData(0);
  for (let i = 0; i < sd.length; i++) sd[i] = (Math.random() < 0.06 ? Math.random() * 2 - 1 : 0) + (Math.random() * 2 - 1) * 0.12;
}

async function loadTrack(name) {
  if (bufs[name] !== undefined) return bufs[name];
  try {
    const res = await fetch(TRACKS[name]);
    if (!res.ok) return (bufs[name] = null); // ファイルが無い（何度も読みに行かない）
    const data = await res.arrayBuffer();
    bufs[name] = await new Promise((ok, ng) => ac.decodeAudioData(data, ok, ng));
  } catch {
    bufs[name] = null; // 読めなくてもゲームは続ける
  }
  return bufs[name];
}

let applying = false;
async function applyMusic() {
  if (!ac || !want || applying) return;
  applying = true;
  try {
    for (;;) {
      const w = want;
      let name = w.name;
      let buf = await loadTrack(name);
      if (!buf && name === 'play') { name = 'song'; buf = await loadTrack('song'); }
      if (want !== w) continue; // 読んでいる間に変わった
      if (cur && cur.name === name && !w.restart) break;
      w.restart = false;
      if (cur) {
        const old = cur;
        old.gain.gain.setTargetAtTime(0, ac.currentTime, FADE / 3);
        old.src.stop(ac.currentTime + FADE * 2);
        cur = null;
      }
      if (buf) {
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        // 曲の頭と終わりの無音は飛ばす（ループのつなぎ目にすき間ができないように）
        const head = leadingSilence(buf);
        src.loopStart = head;
        src.loopEnd = buf.duration - trailingSilence(buf);
        const gain = ac.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(1, ac.currentTime, FADE / 4);
        src.connect(gain).connect(bgmBus);
        src.start(0, head);
        cur = { name, src, gain };
        audio.bgmNow = name; // 確認用
      }
      if (want === w) break;
    }
  } finally {
    applying = false;
  }
}

// 頭の無音の長さ（秒）
function leadingSilence(buf) {
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.003) return Math.max(0, i / buf.sampleRate - 0.05);
  return 0;
}

// 終わりの無音の長さ（秒）
function trailingSilence(buf) {
  const d = buf.getChannelData(0);
  for (let i = d.length - 1; i >= 0; i--) if (Math.abs(d[i]) > 0.003) return Math.max(0, (d.length - 1 - i) / buf.sampleRate - 0.05);
  return 0;
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

// こする音：ふくらんでから消える（ぶつ切りにしない）。音の高さを f0→f1 へ動かす
let crunch = null; // 音を割って荒くする
function getCrunch() {
  if (crunch) return crunch;
  crunch = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    crunch[i] = Math.tanh(x * 6) * 0.8;
  }
  return crunch;
}

function scrape(t, dur, buf, { vol = 0.4, f0 = 1000, f1 = 600, q = 1, peak = 0.35, drive = false } = {}) {
  const s = ac.createBufferSource();
  s.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * peak);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  if (drive) {
    const w = ac.createWaveShaper();
    w.curve = getCrunch();
    s.connect(f).connect(w).connect(g).connect(sfxBus);
  } else {
    s.connect(f).connect(g).connect(sfxBus);
  }
  s.start(t, Math.random() * 0.3);
  s.stop(t + dur + 0.02);
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
  // ガリガリ：上から下へ長く引っかく。左右の前足で交互に2回（約1秒）
  scratch: (t) => {
    let at = t;
    for (let i = 0; i < 2; i++) {
      const left = i % 2 === 0;
      const dur = 0.45 + Math.random() * 0.04;
      scrape(at, dur, fiberBuf, { vol: 0.9, f0: left ? 2000 : 1800, f1: left ? 1000 : 900, q: 1.0, peak: 0.12 });
      at += dur + 0.04;
    }
  },
  // カキカキ：砂を後ろへかく「ザッ」と、ぱらぱら落ちる粒
  toilet: (t) => {
    let at = t;
    for (let i = 0; i < 5; i++) {
      scrape(at, 0.2, sandBuf, { vol: 0.9, f0: 2600, f1: 4200, q: 0.7, peak: 0.45 });
      scrape(at + 0.15, 0.18, sandBuf, { vol: 0.35, f0: 5000, f1: 5000, q: 1.5, peak: 0.2 });
      at += 0.27 + Math.random() * 0.04;
    }
  },
  // 足のあいだをくぐった
  pass: (t) => {
    scrape(t, 0.18, noiseBuf, { vol: 0.25, f0: 800, f1: 2400, q: 0.8, peak: 0.6 });
    notes(t + 0.08, [N.E6, N.G6], 0.05, { vol: 0.18 });
  },
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
