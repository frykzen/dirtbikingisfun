const G = 9.81 * 30;  // same gravity as Bike

export default class Dummy {
  constructor(x, terrain) {
    this.x = x;
    this.terrain = terrain;
    this._spawn(x);
  }

  _spawn(x) {
    this.hit = false;
    this.hitTimer = 0;
    const groundY = this.terrain.getHeightAt(x);

    // Body parts: each has x,y,vx,vy,angle,av,w,h
    // Standing upright — head at top, feet at bottom
    this.parts = {
      head:   { x, y: groundY - 52, vx: 0, vy: 0, angle: 0, av: 0, w: 10, h: 10, r: 6 },
      torso:  { x, y: groundY - 35, vx: 0, vy: 0, angle: 0, av: 0, w: 10, h: 22 },
      armL:   { x: x - 9, y: groundY - 35, vx: 0, vy: 0, angle: 0.2,  av: 0, w: 5, h: 16 },
      armR:   { x: x + 9, y: groundY - 35, vx: 0, vy: 0, angle: -0.2, av: 0, w: 5, h: 16 },
      legL:   { x: x - 4, y: groundY - 11, vx: 0, vy: 0, angle: 0,    av: 0, w: 6, h: 20 },
      legR:   { x: x + 4, y: groundY - 11, vx: 0, vy: 0, angle: 0,    av: 0, w: 6, h: 20 },
    };
    this.groundY = groundY;
  }

  respawn() {
    this._spawn(this.x);
  }

  update(dt, bike) {
    if (!this.hit) {
      // Check if bike wheel hits the dummy (simple AABB + circle check)
      const torso = this.parts.torso;
      for (const [wx, wy] of [
        [bike.fWheelX, bike.fWheelY + bike.wheelRad],
        [bike.rWheelX, bike.rWheelY + bike.wheelRad],
      ]) {
        const dx = wx - torso.x;
        const dy = wy - (torso.y);
        if (Math.abs(dx) < 22 && Math.abs(dy) < 40) {
          this._knock(bike);
          break;
        }
      }
    }

    if (this.hit) {
      this.hitTimer += dt;
      const keys = Object.keys(this.parts);
      for (const k of keys) {
        const p = this.parts[k];
        p.vy += G * dt;
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        p.angle += p.av * dt;

        // Ground collision per part
        const gnd = this.terrain.getHeightAt(p.x);
        const bottom = p.y + (p.h || p.r * 2) / 2;
        if (bottom > gnd) {
          p.y   = gnd - (p.h || p.r * 2) / 2;
          p.vy *= -0.22;
          p.vx *= 0.80;
          p.av *= 0.72;
        }
        p.vx *= Math.pow(0.985, dt * 60);
      }
    }
  }

  _knock(bike) {
    this.hit = true;
    const spd = Math.sqrt(bike.vx ** 2 + bike.vy ** 2);
    const dir = Math.sign(bike.vx) || 1;

    // Each part flies with velocity based on impact + random spin
    const base = { vx: bike.vx * 0.7, vy: -spd * 0.5 - 80 };
    const rand = () => (Math.random() - 0.5);

    this.parts.head.vx  = base.vx + rand() * 60;
    this.parts.head.vy  = base.vy - 120 + rand() * 40;
    this.parts.head.av  = rand() * 12;

    this.parts.torso.vx = base.vx + rand() * 40;
    this.parts.torso.vy = base.vy + rand() * 30;
    this.parts.torso.av = rand() * 8;

    this.parts.armL.vx  = base.vx - 40 + rand() * 80;
    this.parts.armL.vy  = base.vy - 60 + rand() * 40;
    this.parts.armL.av  = rand() * 18;

    this.parts.armR.vx  = base.vx + 40 + rand() * 80;
    this.parts.armR.vy  = base.vy - 60 + rand() * 40;
    this.parts.armR.av  = rand() * 18;

    this.parts.legL.vx  = base.vx - 20 + rand() * 60;
    this.parts.legL.vy  = base.vy + 40 + rand() * 40;
    this.parts.legL.av  = rand() * 14;

    this.parts.legR.vx  = base.vx + 20 + rand() * 60;
    this.parts.legR.vy  = base.vy + 40 + rand() * 40;
    this.parts.legR.av  = rand() * 14;
  }
}
