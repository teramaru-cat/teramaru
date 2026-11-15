// ターゲットの定義（仕様書 §5.4・§6.2）。数値の調整はここで。
//
// legs: てらまりんぐ画面での足の位置（足元の地面の真ん中からのずれ、画面ドット）と太さ r
//       cane: true は杖（細い）
// motion: still（棒立ち）| stomp（足踏み、period 秒ごとに左右交互）| lively（よく動く）
// look: 街での見た目と、てらまりんぐ画面での足の見た目

export const TARGETS = {
  salaryman: {
    name: '棒立ちの会社員',
    kind: 'human',
    durability: 2,
    tp: 2,
    drops: null,
    stages: [1, 2, 3, 4],
    motion: 'still',
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#f2c9a0', hair: '#2a2a30', top: '#3c4a6a', bottom: '#34405e', shoes: '#2a1d17', tie: '#c84040', garment: 'coat' },
    onedari: { base: 0.40, perTp: 0.010 },
  },
  baker: {
    name: 'パン屋さん',
    kind: 'human',
    durability: 3,
    tp: 4,
    drops: { item: 'bread', count: 4 },
    stages: [1, 2, 3, 4],
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
    tp: 5,
    drops: { item: 'niboshi', count: 3 },
    stages: [1, 2, 3, 4],
    motion: 'still',
    legs: [{ x: -16, y: 0, r: 6 }, { x: 10, y: 0, r: 6 }, { x: 36, y: 8, r: 3, cane: true }],
    look: { skin: '#f0cfae', hair: '#c8c8d0', bun: true, top: '#8a6aa0', skirt: '#5a4a70', legs: '#c8b098', shoes: '#4a3a30', cane: '#7a5030', garment: 'skirt' },
    onedari: { base: 0.35, perTp: 0.010 },
  },
  child: {
    name: '元気な子ども',
    kind: 'human',
    durability: 3,
    tp: 6,
    drops: { item: 'candy', count: 3 },
    stages: [1, 2, 3, 4],
    motion: 'lively',
    legs: [{ x: -12, y: 0, r: 6 }, { x: 12, y: 0, r: 6 }],
    look: { skin: '#f6d0a8', hair: '#3a2a20', hat: 'cap', capColor: '#f0c030', top: '#e05050', bottom: '#3a6ab0', legs: '#f6d0a8', socks: '#f6f2ea', shoes: '#40a0e0', garment: 'shorts', child: true },
    wander: 10, // 街でもうろうろする（ドット/秒）
    onedari: { base: 0.20, perTp: 0.008 },
  },
  fishmonger: {
    name: '魚屋さん',
    kind: 'human',
    durability: 4,
    tp: 6,
    drops: { item: 'fish', count: 5 },
    stages: [1, 2, 3, 4],
    motion: 'stomp',
    period: 1.1,
    legs: [{ x: -18, y: 0, r: 7 }, { x: 18, y: 0, r: 7 }],
    look: { skin: '#e8b890', hair: '#2a2a30', hat: 'band', top: '#f6f2ea', apron: '#2a4a7a', bottom: '#5a5a62', shoes: '#22262c', boots: true, garment: 'longApron' },
    onedari: { base: 0.30, perTp: 0.009 },
  },
};

// 落とし物（ご飯）。1個 = ご飯ポイント fp
export const ITEMS = {
  bread: { name: 'パンくず', fp: 2 },
  niboshi: { name: 'にぼし', fp: 2 },
  candy: { name: 'お菓子', fp: 2 },
  fish: { name: '魚の切り身', fp: 2 },
};
