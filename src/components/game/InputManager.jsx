export default class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    if (!this.keys[e.code]) {
      this.justPressed[e.code] = true;
    }
    this.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasJustPressed(code) {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  get throttle()    { return this.isDown('ArrowUp')    || this.isDown('KeyW'); }
  get brake()       { return this.isDown('ArrowDown')  || this.isDown('KeyS'); }
  get leanBack()    { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); }
  get leanForward() { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
  get respawn()     { return this.isDown('KeyR'); }
  get slowMo()      { return false; }
}
