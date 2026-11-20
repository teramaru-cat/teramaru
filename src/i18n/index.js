// ことば（多言語）
// 画面に出す文字は、ぜんぶ src/i18n/<言語>.js の表に書く。コードには文字を直接書かず tr('key') で取り出す。
// 新しい言語を足すとき：ja.js をまねて <言語>.js を作り、下の LANGS に足す（足りないところは日本語が出る）。
//
//   tr('select.title')            … 'ステージを えらぶ'
//   tr('play.needTp', { n: 3 })   … 'おねだりは TP あと3'（{n} を入れかえる）
//   tr('tutorial.mission')        … 配列もそのまま返す（中の {…} も入れかえる）

import ja from './ja.js';
import en from './en.js';

const LANGS = { ja, en };
export const LANG_IDS = Object.keys(LANGS);

let cur = 'ja';
const listeners = [];

// はじめての人：ブラウザの言語が日本語なら日本語、それ以外は英語
export function detectLang() {
  const nav = (navigator.languages?.[0] ?? navigator.language ?? 'ja').toLowerCase();
  return nav.startsWith('ja') ? 'ja' : 'en';
}

export function lang() { return cur; }

export function setLang(id) {
  if (!LANGS[id]) id = 'ja';
  cur = id;
  document.documentElement.lang = id;
  for (const f of listeners) f(id);
}

// 言語が変わったときに呼ぶ（街の看板を描き直す など）
export function onLangChange(f) { listeners.push(f); }

function lookup(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function fill(v, p) {
  if (typeof v === 'string') return v.replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? String(p[k]) : m));
  if (Array.isArray(v)) return v.map((x) => fill(x, p));
  return v;
}

// いまの言語の文字。なければ日本語、それもなければ key をそのまま出す（抜けがすぐわかるように）
export function tr(key, params) {
  let v = lookup(LANGS[cur], key);
  if (v === undefined) v = lookup(ja, key);
  if (v === undefined) return key;
  return fill(v, params);
}

// その key があるか（ターゲットごとの上書きなど）
export function has(key) { return lookup(LANGS[cur], key) !== undefined || lookup(ja, key) !== undefined; }
