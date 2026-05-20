export default class Camera {
  constructor(width, height) {
    this.width   = width;
    this.height  = height;
    this.x       = 0;
    this.y       = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom    = 2.2;
    this.targetZoom = 2.2;
    this.shake   = 0;
    this.shakeX  = 0;
    this.shakeY  = 0;
  }

  resize(w, h) { this.width = w; this.height = h; }

  addShake(amount) {
    this.shake = Math.min(this.shake + amount, 22);
  }

  follow(target, dt) {
    // Bike ALWAYS centered — snap to position, no smoothing lag
    this.targetX = target.x;
    this.targetY = target.y - 60;

    const baseZoom = 2.2;
    this.targetZoom = baseZoom;

    // Snap X so bike is perfectly centered, smoothly track Y
    this.x = this.targetX;
    const yLerp = 1 - Math.pow(0.02, dt);
    this.y += (this.targetY - this.y) * yLerp;
    const zoomLerp = 1 - Math.pow(0.08, dt);
    this.zoom += (this.targetZoom - this.zoom) * zoomLerp;


    if (this.shake > 0.05) {
      this.shakeX  = (Math.random() - 0.5) * this.shake * 2.2;
      this.shakeY  = (Math.random() - 0.5) * this.shake * 2.2;
      this.shake  *= 0.88;
    } else {
      this.shake  = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.width  / 2 + this.shakeX,
      y: (wy - this.y) * this.zoom + this.height / 2 + this.shakeY,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width  / 2 - this.shakeX) / this.zoom + this.x,
      y: (sy - this.height / 2 - this.shakeY) / this.zoom + this.y,
    };
  }

  applyTransform(ctx) {
    ctx.save();
    ctx.translate(this.width / 2 + this.shakeX, this.height / 2 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restore(ctx) { ctx.restore(); }
}
