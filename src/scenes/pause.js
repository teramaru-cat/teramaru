// ポーズ（プレイの上に重ねて表示）

import { screen } from '../core/renderer.js';
import { input, KEY } from '../core/input.js';
import { drawText } from '../core/text.js';
import { Menu, panel } from '../core/ui.js';
import { UI } from '../art/palette.js';
import { audio } from '../core/audio.js';
import { save } from '../core/save.js';
import { tr } from '../i18n/index.js';

export class PauseScene {
  constructor(game, play) {
    this.game = game;
    this.play = play;
    this.overlay = true;
    this.menu = new Menu([
      { id: 'resume', label: tr('pause.resume') },
      { id: 'restart', label: tr('pause.restart') },
      { id: 'title', label: tr('pause.toTitle') },
      { id: 'sound', label: soundLabel() },
    ]);
  }

  enter() { input.releaseAll(); audio.duck(true); }

  exit() { audio.duck(false); }

  update() {
    if (input.hit(KEY.pause)) { this.game.scenes.pop(); return; }
    const id = this.menu.update();
    if (id === 'resume') this.game.scenes.pop();
    if (id === 'restart') this.game.startPlay(this.play.stageId);
    if (id === 'title') this.game.toTitle();
    if (id === 'sound') {
      toggleMute(this.game);
      this.menu.buttons[3].label = soundLabel();
    }
  }

  draw(ctx) {
    const W = screen.W;
    const H = screen.H;
    ctx.fillStyle = 'rgba(20,12,8,0.6)';
    ctx.fillRect(0, 0, W, H);
    const pw = 132;
    const ph = 141;
    const px = Math.round((W - pw) / 2);
    const py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph, UI.cream2);
    drawText(ctx, tr('pause.title'), W / 2, py + 9, { font: 'small', scale: 2, color: UI.ink, align: 'center' });
    this.menu.layout(W / 2, py + 36, 100, 20, 5);
    this.menu.draw(ctx);
  }
}

function soundLabel() { return audio.muted ? tr('pause.soundOff') : tr('pause.soundOn'); }

// ミュートを切り替えて保存する（タイトルからも使う）
export function toggleMute(game) {
  audio.setMuted(!audio.muted);
  game.save.settings = { ...game.save.settings, mute: audio.muted };
  save(game.save);
  audio.sfx('ui');
}
