// ターゲットの定義（仕様書 §5.4・§6.2）。数値の調整はここで。
// どのステージに何人出るかは areas.js の targets で決める。
//
// 1人分の書き方：
//   name        … 画面に出す名前
//   kind        … human（人）| animal（動物）| landmark（ベンチなど）。下の KINDS のふつうの値が入る
//   durability  … メロメロに必要な周回（ハートの数）
//   tp          … メロメロにしたときにもらえる TP
//   drops       … 落とすご飯 { item: ITEMS の id, count: 個数 }。なければ null
//   motion      … still（棒立ち）| stomp（足踏み、period 秒ごとに左右交互）| lively（よく動く。sway で揺れの大きさと速さ）
//   legs        … てらまりんぐ画面での足の位置（足元の地面の真ん中からのずれ、画面ドット）と太さ r。cane: true は杖
//   look        … 見た目。人は服などの色（glasses: メガネのふちの色、longHair: 長い髪）、動物・ベンチは type（dog | pigeons | bench、絵は art/animals.js）
//   wander      … 街でうろうろする速さ（ドット/秒）。なければ立ち止まったまま
//   fixed       … true なら地図の決まった場所にずっといる（地図の fixedTargets に置く）
//   owner       … 一緒に歩く飼い主の見た目（犬）
//   onedari     … おねだりの成功確率 { base: 基本, perTp: TP 1 あたりの上がり幅 }
//   ふつうの値を変えたいときだけ書くもの（KINDS を上書き）：
//   canOnedari  … おねだりできるか
//   scratchBonus… 爪とぎの TP 2倍が効くか
//   leaves      … メロメロにしたら去るか（false ならその場で休む）
//   winText     … メロメロにしたときの言葉
//   kamatteTitle… 構ってもらう（なでなで）のときの題（なければ「なでなで」）
//   words       … 構ってもらっているときに出る言葉（2つ）
//   faces       … 街の絵の向き（right なら、構ってもらう画面で左＝てらまるの方へ向け直す）

// 種類ごとのふつうの値
export const KINDS = {
  human: { canOnedari: true, scratchBonus: true, leaves: true, winText: 'メロメロ！', kamatteTitle: null, words: ['ゴロゴロ', 'なでなで'] },
  animal: { canOnedari: true, scratchBonus: false, leaves: true, winText: 'メロメロ！', kamatteTitle: 'なかよし', words: ['ゴロゴロ', 'すりすり'] },
  landmark: { canOnedari: false, scratchBonus: false, leaves: false, winText: 'マーキング！', kamatteTitle: null, words: [] },
};

export const TARGETS = {
  salaryman: {
    name: '棒立ちの会社員',
    kind: 'human',
    durability: 2,
    tp: 4,
    drops: null,
    motion: 'still',
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#f2c9a0', hair: '#2a2a30', top: '#3c4a6a', bottom: '#34405e', shoes: '#2a1d17', tie: '#c84040', garment: 'coat' },
    onedari: { base: 0.40, perTp: 0.010 },
  },
  baker: {
    name: 'パン屋さん',
    kind: 'human',
    durability: 3,
    tp: 8,
    drops: { item: 'bread', count: 4 },
    motion: 'stomp',
    period: 1.8,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#f2c9a0', hair: '#6a4a30', hat: 'chef', top: '#f6f2ea', apron: '#e8cf9a', bottom: '#6b5040', shoes: '#3a2a20', garment: 'apron' },
    onedari: { base: 0.30, perTp: 0.009 },
  },
  grandma: {
    name: '杖のおばあちゃん',
    kind: 'human',
    durability: 3,
    tp: 10,
    drops: { item: 'onigiri', count: 3 },
    motion: 'still',
    legs: [{ x: -16, y: 0, r: 6 }, { x: 10, y: 0, r: 6 }, { x: 36, y: 8, r: 3, cane: true }],
    look: { skin: '#f0cfae', hair: '#c8c8d0', bun: true, top: '#8a6aa0', skirt: '#5a4a70', legs: '#c8b098', shoes: '#4a3a30', cane: '#7a5030', garment: 'skirt' },
    onedari: { base: 0.35, perTp: 0.010 },
  },
  child: {
    name: '元気な子ども',
    kind: 'human',
    durability: 2,
    tp: 12,
    drops: { item: 'candy', count: 3 },
    motion: 'lively',
    legs: [{ x: -13, y: 0, r: 6 }, { x: 13, y: 0, r: 6 }],
    sway: { x: 17, y: 7, speed: 0.95 }, // 体ごと動く大きさと速さ（lively 用）
    look: { skin: '#f6d0a8', hair: '#3a2a20', hat: 'cap', capColor: '#f0c030', top: '#e05050', bottom: '#3a6ab0', legs: '#f6d0a8', socks: '#f6f2ea', shoes: '#40a0e0', garment: 'shorts', child: true },
    wander: 10, // 街でもうろうろする（ドット/秒）
    onedari: { base: 0.20, perTp: 0.008 },
  },
  fishmonger: {
    name: '魚屋さん',
    kind: 'human',
    durability: 4,
    tp: 12,
    drops: { item: 'fish', count: 5 },
    motion: 'stomp',
    period: 1.1,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#e8b890', hair: '#2a2a30', hat: 'band', top: '#f6f2ea', apron: '#2a4a7a', bottom: '#5a5a62', shoes: '#22262c', boots: true, garment: 'longApron' },
    onedari: { base: 0.30, perTp: 0.009 },
  },
  butcher: {
    name: 'お肉屋さん',
    kind: 'human',
    durability: 4,
    tp: 10,
    drops: { item: 'meat', count: 4 },
    motion: 'stomp',
    period: 1.4,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#f0c098', hair: '#3a2a20', hat: 'cap', capColor: '#f6f2ea', top: '#c84040', apron: '#f6f2ea', bottom: '#4a4a52', shoes: '#22262c', boots: true, garment: 'longApron' },
    onedari: { base: 0.30, perTp: 0.009 },
  },
  greengrocer: {
    name: '八百屋さん',
    kind: 'human',
    durability: 3,
    tp: 8,
    drops: { item: 'tomato', count: 4 },
    motion: 'stomp',
    period: 2.2,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#e8b890', hair: '#2a2a30', hat: 'band', bandColor: '#3a6ab0', top: '#f0e0b0', apron: '#3a8a4a', bottom: '#6b5a40', shoes: '#3a2a20', garment: 'apron' },
    onedari: { base: 0.35, perTp: 0.010 },
  },
  // てらまるの飼い主（チュートリアルの家だけ）。家の中をゆっくり歩く。メロメロにしても去らない
  ownerA: {
    name: 'かいぬし',
    kind: 'human',
    durability: 2,
    tp: 5,
    drops: null,
    motion: 'stomp',
    period: 2.0,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#f2c9a0', hair: '#3a2a24', glasses: '#9a6a48', top: '#6a9ac8', bottom: '#3a4a6a', shoes: '#f6f2ea', garment: 'coat' }, // 青い服にメガネ
    fixed: true,
    wander: 6,
    leaves: false,
    canOnedari: false,
    onedari: { base: 0.5, perTp: 0.01 },
  },
  ownerB: {
    name: 'かいぬし',
    kind: 'human',
    durability: 2,
    tp: 5,
    drops: null,
    motion: 'stomp',
    period: 1.6,
    legs: [{ x: -16, y: 0, r: 6 }, { x: 16, y: 0, r: 6 }],
    look: { skin: '#f6d0b0', hair: '#5a3a28', longHair: true, top: '#f0a8a0', skirt: '#8a7a5a', legs: '#f6d0b0', shoes: '#f6f2ea', garment: 'skirt' },
    fixed: true,
    wander: 6,
    leaves: false,
    canOnedari: false,
    onedari: { base: 0.5, perTp: 0.01 },
  },
  dog: {
    name: '散歩中の犬',
    kind: 'animal',
    durability: 4,
    tp: 10,
    drops: { item: 'jerky', count: 3 },
    motion: 'lively',
    sway: { x: 12, y: 3, speed: 0.6 },
    legs: [{ x: -26, y: 0, r: 4 }, { x: -14, y: -6, r: 4 }, { x: 14, y: -6, r: 4 }, { x: 26, y: 0, r: 4 }],
    look: { type: 'dog', fur: '#c8904a', light: '#f4e2c4', dark: '#96643a', collar: '#d04040' },
    faces: 'right',
    words: ['ペロペロ', 'わんっ'],
    // 飼い主（街ではリードでつないで一緒に歩く。てらまりんぐの相手にはならない）
    owner: { skin: '#f2c9a0', hair: '#5a3a2a', top: '#7aa8c8', bottom: '#5a5a6a', shoes: '#3a2a20', garment: 'coat' },
    wander: 12,
    onedari: { base: 0.15, perTp: 0.007 },
  },
  pigeons: {
    name: '鳩の群れ',
    kind: 'animal',
    durability: 3,
    tp: 12,
    drops: { item: 'crumbs', count: 3 }, // 食べ残しのパンくず
    motion: 'lively',
    sway: { x: 20, y: 4, speed: 1.6 },
    legs: [{ x: -48, y: 0, r: 2 }, { x: -40, y: 0, r: 2 }, { x: -4, y: -6, r: 2 }, { x: 4, y: -6, r: 2 }, { x: 40, y: 0, r: 2 }, { x: 48, y: 0, r: 2 }],
    words: ['クルック', 'ポッポー'],
    look: { type: 'pigeons', body: '#969cab', wing: '#cdd2dc', head: '#7a7e8e', neck: '#5a968c', beak: '#e6aa6e', leg: '#e6828c' },
    wander: 6,
    onedari: { base: 0.05, perTp: 0.006 },
  },
  // ランドマーク：決まった場所にずっとある（去らない。メロメロにしたあとはしばらく休み）
  bench: {
    name: '公園のベンチ',
    kind: 'landmark',
    durability: 5,
    tp: 8,
    drops: null,
    fixed: true,
    motion: 'still',
    legs: [{ x: -44, y: 0, r: 4 }, { x: -36, y: -12, r: 4 }, { x: 36, y: -12, r: 4 }, { x: 44, y: 0, r: 4 }],
    look: { type: 'bench', wood: '#b07a48' },
  },
};

// 種類のふつうの値を入れる（それぞれに書いたものが優先）
for (const [id, t] of Object.entries(TARGETS)) TARGETS[id] = { ...KINDS[t.kind], ...t };

// 落とし物（ご飯）。1個 = ご飯ポイント fp
export const ITEMS = {
  bread: { name: '食パン', fp: 2 },
  onigiri: { name: 'おにぎり', fp: 2 },
  candy: { name: 'お菓子', fp: 2 },
  fish: { name: 'おさかな', fp: 2 },
  meat: { name: 'ほねつき肉', fp: 2 },
  tomato: { name: 'トマト', fp: 2 },
  jerky: { name: 'ジャーキー', fp: 2 },
  crumbs: { name: 'パンくず', fp: 2 },
};
