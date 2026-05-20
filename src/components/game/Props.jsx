const PX_PER_M = 30;
const G = 9.81 * PX_PER_M;

export default class PropsManager {
  constructor(terrain) {
    this.props   = [];
    this.terrain = terrain;
    this._generate();
  }

  _generate() {
    // All props/obstacles removed — clean track
  }

  _addRamp(x, gY) {
    this.props.push({
      type: 'ramp', x, y: gY,
      width: 3 * PX_PER_M + Math.random() * 2 * PX_PER_M,
      height: 0.9 * PX_PER_M + Math.random() * PX_PER_M,
      angle: 0, static: true,
    });
  }

  _addBarrel(x, gY) {
    this.props.push({
      type: 'barrel', x, y: gY - 0.6 * PX_PER_M,
      radius: 0.6 * PX_PER_M, vx: 0, vy: 0, av: 0, mass: 30, static: false,
    });
  }

  _addCrate(x, gY) {
    const sz = 1.0 * PX_PER_M;
    this.props.push({
      type: 'crate', x, y: gY - sz / 2,
      width: sz, height: sz, angle: 0,
      vx: 0, vy: 0, av: 0, mass: 22, static: false,
    });
  }

  _addTireStack(x, gY) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.props.push({
        type: 'tire', x: x + (Math.random() - 0.5) * 12,
        y: gY - 0.4 * PX_PER_M - i * 0.75 * PX_PER_M,
        radius: 0.4 * PX_PER_M, vx: 0, vy: 0, av: 0, mass: 14, static: false,
      });
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt, bike) {
    for (const p of this.props) {
      if (p.static) continue;

      // Gravity
      p.vy += G * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      if (p.angle !== undefined) p.angle += p.av * dt;

      // Ground
      const gnd    = this.terrain.getHeightAt(p.x);
      const bottom = (p.type === 'barrel' || p.type === 'tire') ? p.y + p.radius : p.y + (p.height || 0) / 2;
      if (bottom > gnd) {
        p.y  -= bottom - gnd;
        p.vy *= -0.28;
        p.vx *= 0.88;
        if (p.av !== undefined) p.av *= 0.82;
      }

      // Drag
      p.vx *= Math.pow(0.92, dt * 10);

      // ── Bike collision ───────────────────────────────────────────────────
      if (!bike.crashed) {
        const dx   = bike.x - p.x;
        const dy   = bike.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const collR = (p.radius || Math.max(p.width, p.height) / 2 || PX_PER_M) + bike.wheelRad * 1.2;

        if (dist < collR && dist > 0.1) {
          const nx  = dx / dist;
          const ny  = dy / dist;
          // Relative velocity along normal
          const rv  = (bike.vx - p.vx) * nx + (bike.vy - p.vy) * ny;

          if (rv < 0) {
            const totalMass = 185 + p.mass;     // rider+bike + prop
            const imp       = (2 * rv) / (1 / 185 + 1 / p.mass);
            // Prop gets kicked
            p.vx  -= (imp / p.mass) * nx * 0.6;
            p.vy  -= (imp / p.mass) * ny * 0.6;
            if (p.av !== undefined) p.av += (Math.random() - 0.5) * 4;
            // Bike gets slight push-back (feel of hitting something solid)
            bike.vx += (imp / 185) * nx * 0.25;
            bike.vy += (imp / 185) * ny * 0.15;
          }
        }
      }
    }
  }

  // ── Ramp interaction ────────────────────────────────────────────────────────
  checkRamp(bike) {
    if (bike.crashed) return;
    for (const r of this.terrain.ramps) {
      // Ramp runs from base (r.x, r.y) → tip (r.tipX, r.tipY) in world space
      const rw = r.tipX - r.x;
      if (rw <= 0) continue;

      // Is bike x within the ramp's horizontal span?
      const dx = bike.x - r.x;
      if (dx < -bike.wheelRad || dx > rw + bike.wheelRad) continue;

      // Ramp surface Y at bike.x (linear interpolation base→tip)
      const t        = Math.max(0, Math.min(1, dx / rw));
      const surfaceY = r.y + t * (r.tipY - r.y);   // y increases downward in canvas
      const bikeBot  = bike.y + bike.wheelRad * 0.5; // approximate bike contact point

      // Penetration: positive means bike is inside/below the ramp surface
      const pen = bikeBot - surfaceY;

      if (pen > -bike.wheelRad && pen < bike.wheelRad * 2) {
        // Push bike up off the surface
        bike.y -= pen + 2;

        // Ramp surface normal — perpendicular to the ramp slope
        const rampDY = r.tipY - r.y;
        const rampDX = r.tipX - r.x;
        const rampLen = Math.sqrt(rampDX * rampDX + rampDY * rampDY);
        // Surface tangent (forward along ramp surface, pointing tip-ward)
        const tx = rampDX / rampLen;
        const ty = rampDY / rampLen;
        // Normal (pointing away from ramp body, i.e. upward-ish)
        const nx = -ty;
        const ny =  tx;

        // Project bike velocity onto tangent and normal
        const vDotN = bike.vx * nx + bike.vy * ny;
        const vDotT = bike.vx * tx + bike.vy * ty;

        if (vDotN < 0) {
          // Remove normal component (stop going into ramp), keep tangent (slide along)
          bike.vx = vDotT * tx;
          bike.vy = vDotT * ty;
        }

        // At the tip (t > 0.88): launch — redirect full speed along ramp angle
        if (t > 0.88) {
          const spd = Math.sqrt(bike.vx * bike.vx + bike.vy * bike.vy);
          if (spd > 80) {
            // Launch direction = ramp surface tangent boosted slightly upward
            const launchBoost = 1.15;
            bike.vx = tx * spd * launchBoost;
            bike.vy = (ty - 0.18) * spd * launchBoost; // extra upward kick
            bike.fGrounded = false;
            bike.rGrounded = false;
          }
        }
      }
    }
  }
}