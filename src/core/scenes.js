// シーンの切り替え（スタック式）
// いちばん上のシーンだけ更新する。描画は、上のシーンが overlay（半透明の重ね表示）なら下も描く。

export class SceneStack {
  constructor() {
    this.stack = [];
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  push(scene) {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop() {
    const s = this.stack.pop();
    s?.exit?.();
    this.top()?.resume?.();
    return s;
  }

  replace(scene) {
    while (this.stack.length) this.stack.pop().exit?.();
    this.push(scene);
  }

  update(dt) {
    this.top()?.update(dt);
  }

  draw(ctx) {
    let i = this.stack.length - 1;
    while (i > 0 && this.stack[i].overlay) i--;
    for (; i < this.stack.length; i++) this.stack[i].draw(ctx);
  }
}
