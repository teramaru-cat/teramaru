// 街のマップ：地面と建物を1枚の画像に描いておき、当たり判定も持つ

import { STAGES } from '../data/areas.js';
import { PROPS } from '../art/props.js';
import { makeCanvas, shade } from '../core/renderer.js';
import { drawText, textWidth } from '../core/text.js';
import { makeRng } from '../core/rng.js';
import { tr, onLangChange } from '../i18n/index.js';

export const TILE = 16;

const GROUND = {
  S: { base: '#d8c8a8', line: '#c4b290', dot: ['#cdbd9c', '#e2d4b6'] },
  R: { base: '#63626b', line: null, dot: ['#6d6c75', '#5a5961'] },
  G: { base: '#7fb65a', line: null, dot: ['#6aa24a', '#93c96a'] },
  P: { base: '#c99a76', line: '#b0805c', dot: ['#d4a884'] },
  W: { base: '#5aa8d8', line: null, dot: ['#6ab8e4', '#4e9acb'] }, // 池（入れない）
  // 家の中（チュートリアル）
  F: { base: '#c8955a', line: '#a87840', dot: ['#d2a068', '#bb8a50'] }, // 板の床
  K: { base: '#efe6d2', line: '#d6cab0', dot: ['#f4ecdc'] }, // 台所のタイル
  C: { base: '#d88a8a', line: '#c07070', dot: ['#e09a9a', '#cc7e7e'] }, // じゅうたん
  X: { base: '#e8dcc4', line: '#8a6a4a', dot: ['#e0d2b8'] }, // 壁（入れない）
};
const SOLID_GROUND = ['W', 'X'];

const towns = new Map();
onLangChange(() => towns.clear()); // 看板の文字が変わるので描き直す

// ステージの id → その地図の街（作るのは1回だけ）
export function getTown(stageId) {
  if (!towns.has(stageId)) towns.set(stageId, new Town(STAGES[stageId].map));
  return towns.get(stageId);
}

export class Town {
  constructor(stage) {
    this.stage = stage;
    this.cols = stage.cols;
    this.rows = stage.rows;
    this.w = stage.cols * TILE;
    this.h = stage.rows * TILE;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill('S'));
    stage.paint({
      fill: (c0, r0, c1, r1, ch) => {
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.grid[r][c] = ch;
      },
    });
    this.solid = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (SOLID_GROUND.includes(this.grid[r][c])) this.solid[r][c] = true;
    for (const b of stage.buildings) {
      for (let r = b.r; r < b.r + b.h; r++) for (let c = b.c; c < b.c + b.w; c++) this.solid[r][c] = true;
    }
    this.props = stage.props.map((p) => ({ ...p, def: PROPS[p.type] }));
    this.image = this.render();
  }

  // 足元の箱（中心 x, 下端 y）が通れないところに重なるか
  blocked(x, y, w, h) {
    const left = x - w / 2;
    const right = x + w / 2;
    const top = y - h;
    if (left < 0 || top < 0 || right > this.w || y > this.h) return true;
    const c0 = Math.floor(left / TILE);
    const c1 = Math.floor((right - 0.01) / TILE);
    const r0 = Math.floor(top / TILE);
    const r1 = Math.floor((y - 0.01) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.solid[r]?.[c]) return true;
    for (const p of this.props) {
      const s = p.def.solid;
      if (!s) continue;
      if (right > p.x - s.w / 2 && left < p.x + s.w / 2 && y > p.y - s.h && top < p.y) return true;
    }
    return false;
  }

  // 足元のまわり（pad ドット）に池があるか（池のふちで水を飲める）
  nearPond(x, y, pad) {
    for (const [dx, dy] of [[-pad, 0], [pad, 0], [0, -pad - 3], [0, pad], [-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad]]) {
      if (this.grid[Math.floor((y + dy) / TILE)]?.[Math.floor((x + dx) / TILE)] === 'W') return true;
    }
    return false;
  }

  render() {
    const [c, x] = makeCanvas(this.w, this.h);
    const rng = makeRng(this.stage.seed);
    // 地面
    for (let r = 0; r < this.rows; r++) {
      for (let col = 0; col < this.cols; col++) {
        const t = GROUND[this.grid[r][col]];
        const px = col * TILE;
        const py = r * TILE;
        x.fillStyle = t.base;
        x.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 6; i++) {
          x.fillStyle = rng.pick(t.dot);
          x.fillRect(px + rng.int(TILE), py + rng.int(TILE), 1, 1);
        }
        if (this.grid[r][col] === 'S') {
          x.fillStyle = t.line;
          x.fillRect(px, py + TILE - 1, TILE, 1);
          x.fillRect(px + TILE - 1, py, 1, TILE);
        } else if (this.grid[r][col] === 'P') {
          x.fillStyle = t.line;
          for (let yy = 0; yy < TILE; yy += 4) {
            x.fillRect(px, py + yy + 3, TILE, 1);
            const off = (yy / 4) % 2 ? 4 : 0;
            for (let xx = off; xx < TILE; xx += 8) x.fillRect(px + xx, py + yy, 1, 3);
          }
        } else if (this.grid[r][col] === 'G' && rng() < 0.35) {
          x.fillStyle = '#5e9a40';
          const gx = px + rng.int(12);
          const gy = py + rng.int(12);
          x.fillRect(gx, gy + 1, 1, 2);
          x.fillRect(gx + 2, gy, 1, 3);
          x.fillRect(gx + 4, gy + 1, 1, 2);
        }
        // 家の中：床板・タイル・じゅうたん・壁
        if (this.grid[r][col] === 'F') {
          // 板の床：横長の板が、段ごとに半分ずれて並ぶ（決まったパターン）
          x.fillStyle = t.base;
          x.fillRect(px, py, TILE, TILE); // 点々を消して、のっぺりした板に
          x.fillStyle = t.line;
          x.fillRect(px, py + 7, TILE, 1);
          x.fillRect(px, py + 15, TILE, 1);
          x.fillRect(px + 15, py, 1, 7); // 上の段の板のつなぎ目
          x.fillRect(px + 7, py + 8, 1, 7); // 下の段は半分ずらす
          x.fillStyle = '#d4a26a'; // 板の明るいすじ
          x.fillRect(px, py, TILE, 1);
          x.fillRect(px, py + 8, TILE, 1);
        } else if (this.grid[r][col] === 'K') {
          x.fillStyle = t.line;
          x.fillRect(px, py + 7, TILE, 1);
          x.fillRect(px + 7, py, 1, TILE);
          x.fillRect(px, py + 15, TILE, 1);
          x.fillRect(px + 15, py, 1, TILE);
        } else if (this.grid[r][col] === 'C') {
          const g = (rr, cc) => this.grid[rr]?.[cc];
          x.fillStyle = '#f0c8a0'; // ふちの模様
          if (g(r - 1, col) !== 'C') x.fillRect(px, py + 2, TILE, 1);
          if (g(r + 1, col) !== 'C') x.fillRect(px, py + TILE - 3, TILE, 1);
          if (g(r, col - 1) !== 'C') x.fillRect(px + 2, py, 1, TILE);
          if (g(r, col + 1) !== 'C') x.fillRect(px + TILE - 3, py, 1, TILE);
        } else if (this.grid[r][col] === 'X') {
          // 下も壁なら壁の上（こげ茶）、下が床なら壁の正面（壁紙と幅木）
          const below = this.grid[r + 1]?.[col];
          if (below === 'X' || below === undefined) {
            x.fillStyle = '#6a5040';
            x.fillRect(px, py, TILE, TILE);
            x.fillStyle = '#7a5e4c';
            x.fillRect(px, py, TILE, 1);
          } else {
            x.fillStyle = '#efe4cc';
            x.fillRect(px, py, TILE, TILE);
            x.fillStyle = '#e2d4b8';
            for (let xx = 2; xx < TILE; xx += 6) x.fillRect(px + xx, py, 1, TILE - 4);
            x.fillStyle = t.line;
            x.fillRect(px, py + TILE - 4, TILE, 4); // 幅木
            x.fillStyle = '#a8845e';
            x.fillRect(px, py + TILE - 4, TILE, 1);
          }
        }
        // 池：さざなみと、岸の石
        if (this.grid[r][col] === 'W') {
          x.fillStyle = '#9ad4f0';
          if (rng() < 0.5) x.fillRect(px + rng.int(10), py + rng.int(14), 5, 1);
          const g = (rr, cc) => this.grid[rr]?.[cc];
          x.fillStyle = '#b8b0a0';
          if (g(r - 1, col) && g(r - 1, col) !== 'W') { x.fillRect(px, py, TILE, 3); x.fillStyle = '#8a8478'; x.fillRect(px, py + 3, TILE, 1); x.fillStyle = '#b8b0a0'; }
          if (g(r + 1, col) && g(r + 1, col) !== 'W') x.fillRect(px, py + TILE - 3, TILE, 3);
          if (g(r, col - 1) && g(r, col - 1) !== 'W') x.fillRect(px, py, 3, TILE);
          if (g(r, col + 1) && g(r, col + 1) !== 'W') x.fillRect(px + TILE - 3, py, 3, TILE);
        }
        // 道路のふち（縁石）
        if (this.grid[r][col] === 'R') {
          x.fillStyle = '#a9a7ae';
          const g = (rr, cc) => this.grid[rr]?.[cc];
          if (g(r - 1, col) && g(r - 1, col) !== 'R') x.fillRect(px, py, TILE, 2);
          if (g(r + 1, col) && g(r + 1, col) !== 'R') x.fillRect(px, py + TILE - 2, TILE, 2);
          if (g(r, col - 1) && g(r, col - 1) !== 'R') x.fillRect(px, py, 2, TILE);
          if (g(r, col + 1) && g(r, col + 1) !== 'R') x.fillRect(px + TILE - 2, py, 2, TILE);
        }
      }
    }
    // 中央線
    x.fillStyle = '#e8e4d8';
    for (const l of this.stage.centerLines) {
      if (l.dir === 'h') {
        for (let px = l.c0 * TILE; px < (l.c1 + 1) * TILE; px += 16) {
          const cc = Math.floor(px / TILE);
          if (cc >= l.skip[0] && cc <= l.skip[1]) continue;
          x.fillRect(px + 2, l.r * TILE - 1, 9, 2);
        }
      } else {
        for (let py = l.r0 * TILE; py < (l.r1 + 1) * TILE; py += 16) {
          const rr = Math.floor(py / TILE);
          if (rr >= l.skip[0] && rr <= l.skip[1]) continue;
          x.fillRect(l.c * TILE - 1, py + 2, 2, 9);
        }
      }
    }
    // 横断歩道（白い帯は歩道と平行。渡る向きに帯が並ぶ）
    x.fillStyle = '#f2f0ea';
    for (const cw of this.stage.crosswalks) {
      const px = cw.c * TILE;
      const py = cw.r * TILE;
      if (cw.dir === 'v') {
        // 縦に渡る（道路は横向き）→ 横長の帯が縦に並ぶ
        for (let yy = 3; yy < cw.h * TILE - 3; yy += 6) x.fillRect(px + 3, py + yy, cw.w * TILE - 6, 3);
      } else {
        // 横に渡る（道路は縦向き）→ 縦長の帯が横に並ぶ
        for (let xx = 3; xx < cw.w * TILE - 3; xx += 6) x.fillRect(px + xx, py + 3, 3, cw.h * TILE - 6);
      }
    }
    // 地面だけの絵（てらまりんぐ画面の床に使う。建物の壁が後ろに見えないように）
    const [g, gctx] = makeCanvas(this.w, this.h);
    gctx.drawImage(c, 0, 0);
    this.groundImage = g;
    // 建物
    for (const b of this.stage.buildings) drawBuilding(x, b);
    return c;
  }
}

// 一軒家（住宅地）：大きな瓦の屋根、窓2つ、玄関
function drawHome(x, b) {
  const px = b.c * TILE;
  const py = b.r * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  x.fillStyle = 'rgba(40,30,20,0.22)';
  x.fillRect(px + 2, py + h, w, 3); // 影
  // 壁
  const roofH = Math.floor(h * 0.48);
  const wallY = py + roofH - 2;
  const wallH = h - roofH + 2;
  x.fillStyle = shade(b.wall, -0.3);
  x.fillRect(px + 3, wallY, w - 6, wallH);
  x.fillStyle = b.wall;
  x.fillRect(px + 4, wallY, w - 8, wallH);
  x.fillStyle = shade(b.wall, -0.1);
  x.fillRect(px + 4, wallY, w - 8, 3); // 軒下のかげ
  // 屋根：上がせまい台形（両はしは壁より少しはみ出す）。瓦の横すじ
  for (let yy = 0; yy < roofH; yy++) {
    const inset = Math.round((roofH - yy) * 0.55);
    x.fillStyle = yy % 4 === 3 ? shade(b.roof, -0.2) : b.roof;
    x.fillRect(px + inset, py + yy, w - inset * 2, 1);
  }
  x.fillStyle = shade(b.roof, 0.3);
  x.fillRect(px + Math.round(roofH * 0.55), py, w - Math.round(roofH * 0.55) * 2, 1); // 棟
  x.fillStyle = shade(b.roof, -0.4);
  x.fillRect(px, py + roofH - 2, w, 2); // 軒先
  // 窓（左右に1つずつ。カーテン）
  const winY = wallY + 7;
  for (const wx of [px + 10, px + w - 26]) {
    x.fillStyle = shade(b.wall, -0.45);
    x.fillRect(wx - 1, winY - 1, 18, 14);
    x.fillStyle = '#a8d4e8';
    x.fillRect(wx, winY, 16, 12);
    x.fillStyle = '#d8f0fa';
    x.fillRect(wx + 1, winY + 1, 4, 1);
    x.fillStyle = '#f0e0e8';
    x.fillRect(wx, winY, 3, 12); // カーテン
    x.fillRect(wx + 13, winY, 3, 12);
    x.fillStyle = shade(b.wall, -0.45);
    x.fillRect(wx + 7, winY, 1, 12);
    x.fillStyle = shade(b.wall, -0.25);
    x.fillRect(wx - 2, winY + 13, 20, 2); // 窓台
  }
  // 玄関（ひさし・扉・表札）
  const dx = px + Math.floor(w / 2) - 6;
  x.fillStyle = shade(b.roof, -0.2);
  x.fillRect(dx - 3, py + h - 22, 18, 3);
  x.fillStyle = '#4a3222';
  x.fillRect(dx - 1, py + h - 19, 14, 19);
  x.fillStyle = '#8a5a3a';
  x.fillRect(dx, py + h - 18, 12, 18);
  x.fillStyle = '#a87048';
  x.fillRect(dx + 2, py + h - 16, 3, 6);
  x.fillRect(dx + 7, py + h - 16, 3, 6);
  x.fillStyle = '#f0d070';
  x.fillRect(dx + 9, py + h - 8, 1, 2);
  x.fillStyle = '#f6f2ea';
  x.fillRect(dx + 15, py + h - 14, 4, 3); // 表札
}

function drawBuilding(x, b) {
  if (b.kind === 'home') { drawHome(x, b); return; }
  const px = b.c * TILE;
  const py = b.r * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;

  // 影
  x.fillStyle = 'rgba(40,30,20,0.22)';
  x.fillRect(px + 2, py + h, w, 3);

  // 屋根
  const roofH = Math.min(30, Math.floor(h * 0.3));
  x.fillStyle = b.roof;
  x.fillRect(px, py, w, roofH);
  x.fillStyle = shade(b.roof, -0.18);
  for (let yy = 3; yy < roofH - 2; yy += 4) x.fillRect(px, py + yy, w, 1);
  x.fillStyle = shade(b.roof, 0.25);
  x.fillRect(px, py, w, 1);
  x.fillStyle = shade(b.roof, -0.35);
  x.fillRect(px, py + roofH - 2, w, 2);

  // 壁
  const wallY = py + roofH;
  const wallH = h - roofH;
  x.fillStyle = b.wall;
  x.fillRect(px, wallY, w, wallH);
  x.fillStyle = shade(b.wall, -0.12);
  x.fillRect(px, wallY, 1, wallH);
  x.fillRect(px + w - 1, wallY, 1, wallH);
  x.fillRect(px, wallY, w, 1);

  const storeH = b.kind === 'shop' || b.kind === 'hospital' ? 28 : 18;
  const upperH = wallH - storeH;

  // 上の階の窓
  const winRows = Math.max(0, Math.floor((upperH - 6) / 14));
  for (let row = 0; row < winRows; row++) {
    for (let wx = px + 6; wx + 10 <= px + w - 4; wx += 18) {
      const wy = wallY + 5 + row * 14;
      x.fillStyle = shade(b.wall, -0.4);
      x.fillRect(wx - 1, wy - 1, 12, 10);
      x.fillStyle = '#a8d4e8';
      x.fillRect(wx, wy, 10, 8);
      x.fillStyle = '#d8f0fa';
      x.fillRect(wx + 1, wy + 1, 3, 1);
      x.fillRect(wx + 1, wy + 2, 1, 2);
      x.fillStyle = shade(b.wall, -0.4);
      x.fillRect(wx + 5, wy, 1, 8);
    }
  }

  const storeY = py + h - storeH;
  if (b.kind === 'shop') {
    // 日よけ（しま模様、下はギザギザ）
    for (let xx = 0; xx < w; xx++) {
      x.fillStyle = Math.floor(xx / 4) % 2 ? '#ffffff' : b.awning;
      x.fillRect(px + xx, storeY, 1, 7);
      if (xx % 2 === 0) x.fillRect(px + xx, storeY + 7, 1, 1);
    }
    x.fillStyle = shade(b.awning, -0.3);
    x.fillRect(px, storeY, w, 1);
    // ショーウィンドウ
    x.fillStyle = shade(b.wall, -0.45);
    x.fillRect(px + 4, storeY + 10, w - 8, 13);
    x.fillStyle = '#9fcfe2';
    x.fillRect(px + 5, storeY + 11, w - 10, 11);
    x.fillStyle = '#d8f0fa';
    for (let xx = px + 7; xx < px + w - 8; xx += 12) x.fillRect(xx, storeY + 12, 4, 1);
  }
  if (b.kind === 'hospital') {
    x.fillStyle = '#9fd8c8';
    x.fillRect(px + 4, storeY + 6, w - 8, 18);
    x.fillStyle = '#d8f4ec';
    x.fillRect(px + 6, storeY + 8, w - 12, 2);
    // 赤十字
    const cx = px + Math.floor(w / 2);
    const cy = wallY + Math.floor(upperH / 2);
    x.fillStyle = '#ffffff';
    x.fillRect(cx - 9, cy - 9, 18, 18);
    x.fillStyle = '#e04848';
    x.fillRect(cx - 2, cy - 7, 5, 15);
    x.fillRect(cx - 7, cy - 2, 15, 5);
  }
  // 扉
  const dx = px + Math.floor(w / 2) - 5;
  x.fillStyle = '#4a3222';
  x.fillRect(dx - 1, py + h - 17, 12, 17);
  x.fillStyle = b.kind === 'hospital' ? '#7ab8c8' : '#7a5236';
  x.fillRect(dx, py + h - 16, 10, 16);
  x.fillStyle = '#f0d070';
  x.fillRect(dx + 7, py + h - 9, 1, 2);

  // 看板
  if (b.sign) {
    const sign = tr(`sign.${b.sign}`);
    const tw = textWidth(sign, 'small');
    const sw = tw + 8;
    const sx = px + Math.floor((w - sw) / 2);
    const sy = b.kind === 'shop' ? storeY - 12 : wallY + 3;
    x.fillStyle = '#3a2a20';
    x.fillRect(sx, sy, sw, 11);
    x.fillStyle = '#fff6e0';
    x.fillRect(sx + 1, sy + 1, sw - 2, 9);
    drawText(x, sign, sx + 4, sy + 2, { font: 'small', color: '#3a2a20' });
  }
}
