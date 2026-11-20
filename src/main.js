// 起動とゲームループ

import { initScreen, screen } from './core/renderer.js';
import { input } from './core/input.js';
import { loadFonts } from './core/text.js';
import { SceneStack } from './core/scenes.js';
import { load } from './core/save.js';
import { audio } from './core/audio.js';
import { buildSprites, SPR } from './art/sprites.js';
import { buildProps } from './art/props.js';
import { startRotateCat } from './art/rotateCat.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';
import { StageSelectScene } from './scenes/stageselect.js';

const STEP = 1 / 60;
const MAX_STEPS = 5;

const game = {
  scenes: new SceneStack(),
  save: load(),
  debug: new URLSearchParams(location.search).has('debug'),
  fps: 0,
  alpha: 0, // 前回の更新から次の更新までの割合（描画の補間用）
  startPlay(stageId) { this.scenes.replace(new PlayScene(this, stageId)); },
  toTitle() { this.scenes.replace(new TitleScene(this)); },
  toStageSelect() { this.scenes.replace(new StageSelectScene(this)); },
};
window.teramaru = game; // ブラウザのコンソールから確認できるように
game.SPR = SPR;

async function boot() {
  const canvas = document.getElementById('screen');
  initScreen(canvas);
  input.init(canvas);
  audio.init(game.save.settings?.mute);
  await loadFonts();
  buildSprites();
  // 「よこにしてね」の画面に、獲物をねらってフリフリするてらまる
  const rc = document.getElementById('rotate-cat');
  if (rc) startRotateCat(rc);
  buildProps();
  game.toTitle();

  // Android など：最初のタップで全画面にして横向きに固定（できない端末では何もしない）
  const goFull = () => {
    window.removeEventListener('pointerdown', goFull, true);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const el = document.documentElement;
    if (!coarse || document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => window.screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  };
  window.addEventListener('pointerdown', goFull, true);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.scenes.top()?.onHidden?.();
  });

  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fpsT = 0;

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    fpsT += dt;
    frames++;
    if (fpsT >= 1) { game.fps = frames; frames = 0; fpsT = 0; }

    if (screen.portrait) {
      input.endTick();
    } else {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < MAX_STEPS) {
        game.scenes.update(STEP);
        input.endTick();
        acc -= STEP;
        n++;
      }
      if (n === MAX_STEPS) acc = 0; // 重いときは追いつくのをあきらめる
    }

    game.alpha = Math.min(1, acc / STEP);
    const ctx = screen.ctx;
    ctx.setTransform(screen.scale, 0, 0, screen.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, screen.W, screen.H);
    game.scenes.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
