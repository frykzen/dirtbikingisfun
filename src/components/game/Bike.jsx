// Realistic dirt bike physics
// World units: pixels, but 1 pixel ≈ 0.5cm  → bike wheelbase ~145cm = 290px at 1x zoom (we use scale)
// 1 m = 30 px  → gravity = 9.81 * 30 = 294 px/s²

const PX_PER_M = 30;
const G = 9.81 * PX_PER_M;

const GEAR_RATIOS = [0, 7.5, 5.2, 3.8, 2.9, 2.3, 1.8];
const MAX_GEAR = 6;
const MAX_RPM  = 13500;
const IDLE_RPM = 1500;
const POWER_RPM = 9500;
const MAX_ACCEL = 560;
const BIKE_MASS  = 110;
const RIDER_MASS = 75;
const TOTAL_MASS = BIKE_MASS + RIDER_MASS;


export default class Bike {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x   = x || 300;
    this.y   = y || 350;
    this.vx  = 0;
    this.vy  = 0;
    this.angle      = 0;
    this.angularVel = 0;

    this.wheelBase  = 1.25 * PX_PER_M;
    this.wheelRad   = 0.23 * PX_PER_M;
    this.comOffset  = 0.0;

    // Front suspension — soft, long travel
    this.fSuspRest  = 0.50 * PX_PER_M;
    this.fSuspLen   = this.fSuspRest;
    this.fSuspVel   = 0;
    this.fSuspK     = TOTAL_MASS * G * 0.65;  // softer
    this.fSuspC     = 2 * Math.sqrt(this.fSuspK * TOTAL_MASS / 2) * 0.75;  // more damping
    this.fSuspMin   = 0.24 * PX_PER_M;        // bottom-out limit so wheel can't punch through fender
    this.fGrounded  = false;
    this.fWheelSpin = 0;

    // Rear suspension — soft, slightly stiffer than front
    this.rSuspRest  = 0.46 * PX_PER_M;
    this.rSuspLen   = this.rSuspRest;
    this.rSuspVel   = 0;
    this.rSuspK     = TOTAL_MASS * G * 1.25;  // softer
    this.rSuspC     = 2 * Math.sqrt(this.rSuspK * TOTAL_MASS / 2) * 0.62;
    this.rSuspMin   = 0.18 * PX_PER_M;
    this.rGrounded  = false;
    this.rWheelSpin = 0;

    this.rpm        = IDLE_RPM;
    this.gear       = 1;
    this.throttleIn = 0;
    this.clutch     = 0;

    this.riderLean        = 0;
    this.riderTargetLean  = 0;

    this.crashed    = false;
    this.crashTimer = 0;
    this.airTime    = 0;
    this.speed      = 0;
    this.wheeling   = false;
    this.stoppie    = false;
    this.wheelieAngle = 0;

    this.ragdoll = null;

    this.fWheelX = 0; this.fWheelY = 0;
    this.rWheelX = 0; this.rWheelY = 0;
    this._calcWheelPositions();
  }

  update(dt, input, terrain, particles, camera) {
    if (this.crashed) {
      this._updateRagdoll(dt, terrain);
      this.crashTimer += dt;
      if (input.respawn) this.reset(this.x, terrain.getHeightAt(this.x) - 3 * PX_PER_M);
      return;
    }
    if (input.respawn) {
      this.reset(this.x, terrain.getHeightAt(this.x) - 3 * PX_PER_M);
      return;
    }

    const maxSubDt = 1 / 120;
    const steps    = Math.ceil(dt / maxSubDt);
    const subDt    = dt / steps;
    for (let i = 0; i < steps; i++) {
      this._step(subDt, input, terrain, particles, camera);
    }
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  _step(dt, input, terrain, particles, camera) {
    const wasAirborne = !this.fGrounded && !this.rGrounded;
    this._calcWheelPositions();

    const fGndY   = terrain.getHeightAt(this.fWheelX);
    const rGndY   = terrain.getHeightAt(this.rWheelX);
    const rSurf   = terrain.getSurfaceAt(this.rWheelX);
    const fSurf   = terrain.getSurfaceAt(this.fWheelX);
    const rSpeedM = terrain.getSpeedMult(rSurf);

    // ── Suspension with proper velocity tracking ──────────────────────────────
    const fPen = (this.fWheelY + this.wheelRad) - fGndY;
    const rPen = (this.rWheelY + this.wheelRad) - rGndY;
    this.fGrounded = fPen > -1;
    this.rGrounded = rPen > -1;

    let fNormal = 0, rNormal = 0;

    if (this.fGrounded) {
      const compression = Math.max(fPen, 0);
      const prevLen = this.fSuspLen;
      this.fSuspLen = Math.max(this.fSuspMin, this.fSuspRest - compression);
      this.fSuspVel = (this.fSuspLen - prevLen) / dt;
      const springF = compression * this.fSuspK;
      const dampF   = -this.fSuspVel * this.fSuspC;
      fNormal = Math.max(0, springF + dampF);
    } else {
      const prevLen = this.fSuspLen;
      this.fSuspLen = Math.min(this.fSuspLen + 1.6 * PX_PER_M * dt, this.fSuspRest);
      this.fSuspVel = (this.fSuspLen - prevLen) / dt;
    }

    if (this.rGrounded) {
      const compression = Math.max(rPen, 0);
      const prevLen = this.rSuspLen;
      this.rSuspLen = Math.max(this.rSuspMin, this.rSuspRest - compression);
      this.rSuspVel = (this.rSuspLen - prevLen) / dt;
      const springF = compression * this.rSuspK;
      const dampF   = -this.rSuspVel * this.rSuspC;
      rNormal = Math.max(0, springF + dampF);
    } else {
      const prevLen = this.rSuspLen;
      this.rSuspLen = Math.min(this.rSuspLen + 1.6 * PX_PER_M * dt, this.rSuspRest);
      this.rSuspVel = (this.rSuspLen - prevLen) / dt;
    }

    const grounded  = this.fGrounded || this.rGrounded;
    const bothDown  = this.fGrounded && this.rGrounded;
    const onlyFrontDown = this.fGrounded && !this.rGrounded;
    const frontFirstLanding = wasAirborne && onlyFrontDown && this.vy > 0;

    if (frontFirstLanding) {
      this.vy *= 0.45;
      this.angularVel = Math.min(this.angularVel, 0.35);
      fNormal *= 0.35;
    }

    // ── Landing impact ────────────────────────────────────────────────────────
    if (grounded && this.airTime > 0.25) {
      const impact = Math.min(this.airTime * 3, 8);
      camera.addShake(impact);
      particles.emitDust(this.x, Math.min(fGndY, rGndY), impact * 0.4);
      particles.emitCrash(this.x, Math.min(fGndY, rGndY));
      if (Math.abs(this.vy) > 20 * PX_PER_M && Math.abs(this.angle) > 0.55) {
        this._crash(particles, camera);
        return;
      }
      this.airTime = 0;
    }
    if (!grounded) this.airTime += dt;
    else if (this.airTime > 0) this.airTime = Math.max(0, this.airTime - dt * 4);

    // ── Gravity ───────────────────────────────────────────────────────────────
    this.vy += G * dt;

    // ── Slope alignment — smooth terrain tracking when both wheels down ───────
    if (bothDown) {
      // Use angle between the two actual wheel contact points — much more stable than getSlopeAngle at center
      const wheelSlope = Math.atan2(
        (this.rWheelY + this.wheelRad - (this.fWheelY + this.wheelRad)) * -1,
        this.fWheelX - this.rWheelX
      );
      const diff = wheelSlope - this.angle;
      // Gentle correction — never spike on landing
      this.angularVel += diff * 8 * dt;
      this.angularVel *= Math.pow(0.15, dt);
    } else if (grounded) {
      this.angularVel *= Math.pow(0.45, dt);
    }

    // ── Throttle smoothing ────────────────────────────────────────────────────
    const rawThrottle = input.throttle ? 1 : 0;
    this.throttleIn  += (rawThrottle - this.throttleIn) * Math.min(1, 3 * dt); // was 8 — much smoother

    // ── Engine / RPM ──────────────────────────────────────────────────────────
    if (this.throttleIn > 0.05) {
      this.rpm += this.throttleIn * 9000 * dt;
    } else {
      this.rpm -= 4000 * dt;
    }
    this.rpm = Math.max(IDLE_RPM, Math.min(this.rpm, MAX_RPM));

    if (this.rpm > 11000 && this.gear < MAX_GEAR) { this.gear++; this.rpm *= 0.72; }
    else if (this.rpm < 2800 && this.gear > 1)    { this.gear--; this.rpm *= 1.3; }

    // ── Drive force ─── rear wheel only ───────────────────────────────────────
    if (this.rGrounded && !onlyFrontDown && this.throttleIn > 0.01) {
      const rpmNorm    = this.rpm / MAX_RPM;
      const peakNorm   = POWER_RPM / MAX_RPM;
      const torqueMult = Math.exp(-Math.pow((rpmNorm - peakNorm) / 0.38, 2));
      const driveF     = MAX_ACCEL * torqueMult * this.throttleIn * rSpeedM;

      this.vx += Math.cos(this.angle) * driveF * dt;
      this.vy += Math.sin(this.angle) * driveF * dt * 0.35;

      if (rSurf === 'mud') {
        particles.emitMud(this.rWheelX, this.rWheelY + this.wheelRad, this.speed);
      } else if (this.throttleIn > 0.5) {
        particles.emitDirt(this.rWheelX, this.rWheelY + this.wheelRad, this.speed, this.angle + Math.PI, rSurf);
      }

    }

    // ── Braking ───────────────────────────────────────────────────────────────
    if (input.brake && grounded) {
      const speedMs = Math.abs(this.vx) / PX_PER_M;
      const brakeForce = Math.min(0.72 * G, speedMs * 0.35 * G) * dt;
      if (Math.abs(this.vx) > 1) {
        this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), brakeForce);
        const weightTransfer = speedMs * 0.005 * dt;
        this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - weightTransfer * PX_PER_M * 0.9);
        this.rSuspLen = Math.min(this.rSuspRest, this.rSuspLen + weightTransfer * PX_PER_M * 0.6);
        if (this.fGrounded && speedMs > 3)
          particles.emitDirt(this.fWheelX, this.fWheelY + this.wheelRad, this.speed * 0.4, 0, fSurf);

      }
    }

    // ── A/D controls: wheelie on ground (A = lift front), stoppie assist (D = lean forward) ──
    const speedMs = Math.abs(this.vx) / PX_PER_M;
    const hasSpeed = speedMs > 0.8;

    if (grounded) {
      if (input.leanBack && this.rGrounded) {
        // A = wheelie: lift front wheel — works at any speed (even stationary balance)
        const liftTorque = (hasSpeed ? 12.0 : 9.0) * dt;
        this.angularVel -= liftTorque;
      } else if (input.leanForward && this.fGrounded && speedMs > 4) {
        // D = stoppie assist when going fast: nose down / rear up
        const stoppieTorque = 4.0 * dt;
        this.angularVel += stoppieTorque;
      }
    }

    // ── When bike is slow/stopped AND no lean input, gravity restores level ──
    if (!hasSpeed && grounded && !input.leanBack && !input.leanForward) {
      const tiltBack = -this.angle;
      this.angularVel += tiltBack * 18 * dt;
    }

    // ── Stoppie physics — hard braking at speed lifts rear ───────────────────
    if (input.brake && this.fGrounded && grounded) {
      if (speedMs > 5) {
        const stoppieTorque = Math.min(speedMs * 0.012, 0.10) * dt;
        this.angularVel += stoppieTorque;
      }
    }

    // ── Normal gravity restore when no A held and front wheel is up ──────────
    if (!input.leanBack && this.rGrounded && !this.fGrounded) {
      const tiltBack = Math.max(0, -this.angle);
      this.angularVel += tiltBack * 12 * dt;
    }

    // ── Front-only contact: strong decel + tip bike back down ────────────────
    if (onlyFrontDown) {
      this.vx *= Math.pow(0.72, dt);
      this.angularVel -= (frontFirstLanding ? 3.5 : 1.4) * dt;
      if (this.vy > 0) this.vy *= Math.pow(0.18, dt);
    }

    // ── Air control: A/D ONLY affects rotation in the air ────────────────────
    if (!grounded) {
      if      (input.leanBack)    { this.angularVel -= 5.5 * dt; this.riderTargetLean = -0.35; }
      else if (input.leanForward) { this.angularVel += 5.5 * dt; this.riderTargetLean = 0.35; }
      else                         { this.riderTargetLean = 0; this.angularVel *= Math.pow(0.2, dt); }
    } else {
      this.riderTargetLean = 0;
    }
    this.riderLean += (this.riderTargetLean - this.riderLean) * 7 * dt;

    // ── Aerodynamic drag ──────────────────────────────────────────────────────
    const vxMs = this.vx / PX_PER_M;
    this.vx -= (0.5 * 1.22 * 0.65 * vxMs * Math.abs(vxMs) / TOTAL_MASS) * PX_PER_M * dt;

    if (grounded && !input.brake) {
      const rollR = 0.014 * G * dt;
      if (Math.abs(this.vx) > rollR) this.vx -= Math.sign(this.vx) * rollR;
      else if (!input.throttle) this.vx *= Math.pow(0.4, dt);
    }

    // ── Angular damping ───────────────────────────────────────────────────────
    if (!grounded) {
      this.angularVel *= Math.pow(0.97, dt * 60);
    }

    // Hard clamp angular velocity — prevents jitter/flip from suspension spikes
    const maxAngVel = grounded ? 4.0 : 8.0;
    this.angularVel = Math.max(-maxAngVel, Math.min(maxAngVel, this.angularVel));

    this.angle      += this.angularVel * dt;

    // ── Vertical forces ───────────────────────────────────────────────────────
    const totalNormal = fNormal + rNormal;
    this.vy -= (totalNormal / TOTAL_MASS) * dt * 0.55;
    if (grounded && this.vy < 0) this.vy *= Math.pow(0.06, dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Floor clamp
    if (bothDown) {
      const midGnd = (fGndY + rGndY) / 2;
      if (this.y > midGnd - this.wheelRad * 0.5) {
        this.y = midGnd - this.wheelRad * 0.5;
        if (this.vy > 0) this.vy *= -0.02;
      }
    } else if (this.rGrounded && this.rWheelY + this.wheelRad > rGndY + 2) {
      this.y -= (this.rWheelY + this.wheelRad - rGndY);
      if (this.vy > 0) this.vy *= -0.02;
    } else if (this.fGrounded && this.fWheelY + this.wheelRad > fGndY + 2) {
      this.y -= (this.fWheelY + this.wheelRad - fGndY);
      if (this.vy > 0) this.vy *= -0.02;
    }

    // Wheelie/stoppie state — only if bike has speed
    this.wheeling = this.rGrounded && !this.fGrounded;
    this.stoppie  = this.fGrounded && !this.rGrounded && hasSpeed;

    const spinRate = (Math.abs(this.vx) / (2 * Math.PI * this.wheelRad));
    this.rWheelSpin += (spinRate + this.throttleIn * 3) * dt * 2 * Math.PI;
    this.fWheelSpin += spinRate * dt * 2 * Math.PI;

    if (this.throttleIn > 0.1 || this.rpm > 3000) {
      const ex = this.x - Math.cos(this.angle) * (this.wheelBase * 0.5 + 2);
      const ey = this.y - Math.sin(this.angle) * (this.wheelBase * 0.5 + 2) + 2;
      particles.emitExhaust(ex, ey);
    }

    if (grounded) {
      if (Math.abs(this.angle) > 1.35) { this._crash(particles, camera); return; }
      if (this.speed > 4 * PX_PER_M && Math.abs(this.angle) > 0.95) { this._crash(particles, camera); return; }
    }

    if (this.rGrounded && this.speed > 1.5 * PX_PER_M) {
      terrain.addRut(this.rWheelX, rGndY, Math.min(this.speed / (10 * PX_PER_M), 0.4));
    }

    this._checkObstacleCollisions(terrain, particles, camera);

    this.facingRight = this.vx >= 0 || (!grounded && (this.facingRight !== undefined ? this.facingRight : true));
  }

  // ─── OBSTACLE COLLISION ────────────────────────────────────────────────────
  _checkObstacleCollisions(terrain, particles, camera) {
    if (this.crashed) return;
    for (const ob of terrain.obstacles) {
      if (Math.abs(ob.x - this.x) > 150) continue;

      if (ob.type === 'log') {
        const r = ob.radius + this.wheelRad * 0.9;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          const dx = wx - ob.x, dy = (wy + this.wheelRad) - ob.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < r && dist > 0.1) {
            const nx = dx/dist, ny = dy/dist;
            if (ny < -0.3 && this.vx > 0) {
              const pen = r - dist;
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.7);
              else         this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.7);
              this.vy -= pen * 12;
            } else {
              this.x += nx * (r - dist) * 0.5;
              this.y += ny * (r - dist) * 0.5;
              const vDotN = this.vx * nx + this.vy * ny;
              if (vDotN < 0) {
                this.vx -= vDotN * nx * 1.2;
                this.vy -= vDotN * ny * 0.8;
                this.angularVel += nx * 0.003;
                if (Math.abs(vDotN) > 10 * PX_PER_M) { this._crash(particles, camera); return; }
              }
            }
          }
        }
      } else if (ob.type === 'rockBoulder') {
        const r = ob.size * 0.65 + this.wheelRad * 0.9;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          const dx = wx - ob.x, dy = (wy + this.wheelRad) - ob.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < r && dist > 0.1) {
            const nx = dx/dist, ny = dy/dist;
            if (ny < -0.25 && this.vx > 0) {
              const pen = r - dist;
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.8);
              else         this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.8);
              this.vy -= pen * 10;
              camera.addShake(2);
            } else {
              this.x += nx * (r - dist) * 0.6;
              this.y += ny * (r - dist) * 0.6;
              const vDotN = this.vx * nx + this.vy * ny;
              if (vDotN < 0) {
                this.vx -= vDotN * nx * 1.3;
                this.vy -= vDotN * ny * 0.7;
                this.angularVel -= ny * 0.015 * Math.sign(this.vx);
                camera.addShake(3);
                if (Math.abs(vDotN) > 12 * PX_PER_M && Math.abs(this.angle) > 0.35) { this._crash(particles, camera); return; }
              }
            }
          }
        }
      } else if (ob.type === 'bump') {
        const hw = ob.width / 2;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          if (Math.abs(wx - ob.x) > hw) continue;
          const t = 1 - Math.abs(wx - ob.x) / hw;
          const bumpTop = ob.y - ob.height * Math.sin(t * Math.PI);
          if (wy + this.wheelRad > bumpTop - 4 && wy + this.wheelRad < bumpTop + 18) {
            const pen = (wy + this.wheelRad) - bumpTop;
            if (pen > 0) {
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.6);
              else         this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.6);
              this.y -= pen * 0.35;
              if (this.vy > 0) this.vy = Math.min(-30, this.vy - pen * 50);
            }
          }
        }
      }
    }
  }

  _calcWheelPositions() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const hb  = this.wheelBase / 2;
    this.rWheelX = this.x - cos * hb;
    this.rWheelY = this.y - sin * hb + this.rSuspLen;
    this.fWheelX = this.x + cos * hb;
    this.fWheelY = this.y + sin * hb + this.fSuspLen;
  }

  _crash(particles, camera) {
    this.crashed    = true;
    this.crashTimer = 0;
    // Dust/dirt only — no spark explosion
    particles.emitCrash(this.x, this.y);
    camera.addShake(8);
    const vx = this.vx;
    const vy = this.vy;

    // True ragdoll: rider launches off bike as one body, parts stay connected
    // All parts get nearly the same velocity — they separate only under gravity/rotation
    const baseVx = vx * 0.9;
    const baseVy = Math.min(vy - 50, -30);
    const spin = this.angularVel;

    this.ragdoll = {
      parts: [
        // torso — center of mass of rider
        { name: 'torso', x: this.x,      y: this.y - 18, vx: baseVx,           vy: baseVy,           angle: this.angle, av: spin + (Math.random() - 0.5) * 3, w: 11, h: 18 },
        // head — sits on top of torso
        { name: 'head',  x: this.x,      y: this.y - 34, vx: baseVx * 0.98,    vy: baseVy - 10,      angle: 0,          av: spin + (Math.random() - 0.5) * 4, r: 5 },
        // arms — slightly off to the sides but same bulk velocity
        { name: 'armL',  x: this.x - 7,  y: this.y - 16, vx: baseVx - 8,       vy: baseVy + 5,       angle: 0.4,        av: (Math.random() - 0.5) * 6,        w: 4, h: 14 },
        { name: 'armR',  x: this.x + 7,  y: this.y - 16, vx: baseVx + 8,       vy: baseVy + 5,       angle: -0.4,       av: (Math.random() - 0.5) * 6,        w: 4, h: 14 },
        // legs — hang below hips, tumble with body
        { name: 'legL',  x: this.x - 4,  y: this.y - 2,  vx: baseVx - 5,       vy: baseVy + 15,      angle: 0.2,        av: (Math.random() - 0.5) * 5,        w: 5, h: 18 },
        { name: 'legR',  x: this.x + 4,  y: this.y - 2,  vx: baseVx + 5,       vy: baseVy + 15,      angle: -0.2,       av: (Math.random() - 0.5) * 5,        w: 5, h: 18 },
      ],
    };
  }

  _updateRagdoll(dt, terrain) {
    if (!this.ragdoll) return;
    for (const p of this.ragdoll.parts) {
      p.vy += G * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.angle += p.av * dt;
      const gnd = terrain.getHeightAt(p.x);
      // Support both circle (r) and rect (h) parts
      const halfH = p.r !== undefined ? p.r : (p.h || 10) / 2;
      if (p.y + halfH > gnd) {
        p.y   = gnd - halfH;
        // Realistic bounce: low restitution, friction kills spin on landing
        const normalRestitution = 0.12;
        p.vy *= -normalRestitution;
        // Sliding friction — proportional to normal force approximation
        const frictionCoeff = 0.55;
        p.vx *= (1 - frictionCoeff * dt * 60 * 0.016);
        p.av *= 0.60;
        // If nearly stopped vertically, just rest on ground
        if (Math.abs(p.vy) < 8) p.vy = 0;
      }
      // Air resistance / drag
      p.vx *= Math.pow(0.994, dt * 60);
      p.vy *= Math.pow(0.999, dt * 60);
    }
  }
}
