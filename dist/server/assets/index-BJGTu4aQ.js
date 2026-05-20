import { v as getDefaultExportFromCjs, Q as reactExports, I as jsxRuntimeExports } from "./server-n_xMnEEd.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }
  init() {
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }
  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
  _onKeyDown(e) {
    if (!this.keys[e.code]) {
      this.justPressed[e.code] = true;
    }
    this.keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
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
  get throttle() {
    return this.isDown("ArrowUp") || this.isDown("KeyW");
  }
  get brake() {
    return this.isDown("ArrowDown") || this.isDown("KeyS");
  }
  get leanBack() {
    return this.isDown("ArrowLeft") || this.isDown("KeyA");
  }
  get leanForward() {
    return this.isDown("ArrowRight") || this.isDown("KeyD");
  }
  get respawn() {
    return this.isDown("KeyR");
  }
  get slowMo() {
    return false;
  }
}
class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 2.2;
    this.targetZoom = 2.2;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }
  resize(w, h) {
    this.width = w;
    this.height = h;
  }
  addShake(amount) {
    this.shake = Math.min(this.shake + amount, 22);
  }
  follow(target, dt) {
    this.targetX = target.x;
    this.targetY = target.y - 60;
    const baseZoom = 2.2;
    this.targetZoom = baseZoom;
    this.x = this.targetX;
    const yLerp = 1 - Math.pow(0.02, dt);
    this.y += (this.targetY - this.y) * yLerp;
    const zoomLerp = 1 - Math.pow(0.08, dt);
    this.zoom += (this.targetZoom - this.zoom) * zoomLerp;
    if (this.shake > 0.05) {
      this.shakeX = (Math.random() - 0.5) * this.shake * 2.2;
      this.shakeY = (Math.random() - 0.5) * this.shake * 2.2;
      this.shake *= 0.88;
    } else {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.width / 2 + this.shakeX,
      y: (wy - this.y) * this.zoom + this.height / 2 + this.shakeY
    };
  }
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width / 2 - this.shakeX) / this.zoom + this.x,
      y: (sy - this.height / 2 - this.shakeY) / this.zoom + this.y
    };
  }
  applyTransform(ctx) {
    ctx.save();
    ctx.translate(this.width / 2 + this.shakeX, this.height / 2 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
  restore(ctx) {
    ctx.restore();
  }
}
const PX_PER_M$4 = 30;
const SEG_W$1 = 12;
const CHUNK_W = 1200;
const LOOKAHEAD = 3;
const LOOKBEHIND = 2;
function noise(x, seed) {
  let h = x * 127.1 + seed * 311.7 | 0;
  h = (h ^ h >> 16) * 73244475 | 0;
  h = (h ^ h >> 16) * 73244475 | 0;
  h = h ^ h >> 16 | 0;
  return (h & 65535) / 65535;
}
function smoothNoise(x, seed, scale) {
  const ix = Math.floor(x / scale);
  const fx = x / scale - ix;
  const t = fx * fx * (3 - 2 * fx);
  const a = noise(ix, seed) * 2 - 1;
  const b = noise(ix + 1, seed) * 2 - 1;
  return a + (b - a) * t;
}
function terrainHeight(x, seed) {
  const BASE_Y = 420;
  let h = 0;
  h += smoothNoise(x, seed, 800) * 70;
  h += smoothNoise(x, seed + 100, 300) * 28;
  h += smoothNoise(x, seed + 200, 100) * 10;
  h += smoothNoise(x, seed + 300, 35) * 3.5;
  const y = BASE_Y + h;
  if (y < 160) return 160 + (y - 160) * 0.3;
  if (y > 580) return 580 + (y - 580) * 0.3;
  return y;
}
function surfaceType(x, seed) {
  const v = noise(Math.floor(x / 200), seed + 999);
  if (v < 0.45) return "dirt";
  if (v < 0.6) return "mud";
  if (v < 0.75) return "rock";
  return "sand";
}
function roadHeight(x) {
  const BASE_Y = 440;
  let h = 0;
  h += Math.sin(x * 8e-4) * 18;
  h += Math.sin(x * 3e-3 + 1) * 6;
  h += Math.sin(x * 0.015) * 2;
  const y = BASE_Y + h;
  return Math.max(300, Math.min(560, y));
}
class Terrain {
  constructor(mapName = "enduro") {
    this.mapName = mapName;
    this.seed = Math.random() * 9999 | 0;
    this.chunks = /* @__PURE__ */ new Map();
    this.ruts = [];
    this.obstacles = [];
    this.ramps = [];
    this.scenery = [];
    this._ensureChunks(0, LOOKAHEAD + LOOKBEHIND);
  }
  // ── Chunk management ──────────────────────────────────────────────────────
  _chunkIndex(x) {
    return Math.floor(x / CHUNK_W);
  }
  _ensureChunks(centerX, extraRadius) {
    const ci = this._chunkIndex(centerX);
    const lo = ci - LOOKBEHIND;
    const hi = ci + LOOKAHEAD + (extraRadius || 0);
    for (let i = lo; i <= hi; i++) {
      if (!this.chunks.has(i)) this._generateChunk(i);
    }
    for (const key of this.chunks.keys()) {
      if (key < lo - 2 || key > hi + 2) this.chunks.delete(key);
    }
  }
  _generateChunk(ci) {
    const startX = ci * CHUNK_W;
    const endX = startX + CHUNK_W;
    const segs = [];
    const types = [];
    const flatEnd = 700;
    for (let x = startX; x < endX; x += SEG_W$1) {
      let y, surfT;
      if (this.mapName === "road") {
        y = roadHeight(x);
        surfT = "road";
      } else if (x < flatEnd) {
        const blend = Math.max(0, Math.min(1, (x - 300) / 400));
        y = 420 * (1 - blend) + terrainHeight(x, this.seed) * blend;
        surfT = "dirt";
      } else {
        y = terrainHeight(x, this.seed);
        surfT = surfaceType(x, this.seed);
      }
      segs.push({ x, y: Math.round(y * 4) / 4 });
      types.push(surfT);
    }
    this.chunks.set(ci, { segs, types });
    this._generateSceneryForChunk(ci, startX, endX);
  }
  _generateRampsForChunk(ci, startX, endX) {
    const rng = (n) => noise(ci * 53 + n, this.seed + 777);
    if (rng(99) > 0.4) return;
    const x = startX + 400 + rng(0) * 500;
    if (x >= endX - 200) return;
    const w = (2 + rng(1) * 1.5) * PX_PER_M$4;
    const h = (0.6 + rng(2) * 0.9) * PX_PER_M$4;
    const slope = this.getSlopeAngle(x);
    const y0 = this.getHeightAt(x);
    const ytip = this.getHeightAt(x + w);
    this.ramps.push({
      x,
      y: y0,
      tipX: x + w,
      tipY: ytip - h,
      width: w,
      height: h,
      terrainSlope: slope,
      chunk: ci
    });
  }
  _generateSceneryForChunk(ci, startX, endX) {
    const rng = (n) => noise(ci * 71 + n, this.seed + 1234);
    let x = startX + rng(0) * 120;
    let idx = 0;
    while (x < endX) {
      const r = rng(idx + 10);
      const gndY = this.getHeightAt(x);
      if (this.mapName === "road") {
        if (r < 0.4) {
          this.scenery.push({ type: "lamppost", x, y: gndY, h: 70 + rng(idx + 20) * 10, chunk: ci });
        } else if (r < 0.65) {
          this.scenery.push({ type: "roadsign", x, y: gndY, h: 45 + rng(idx + 21) * 15, chunk: ci });
        } else if (r < 0.8) {
          this.scenery.push({ type: "pine", x, y: gndY, h: 50 + rng(idx + 22) * 40, chunk: ci });
        }
        x += 200 + rng(idx + 30) * 400;
      } else {
        if (r < 0.3) {
          const h = 60 + rng(idx + 20) * 80;
          this.scenery.push({ type: "pine", x, y: gndY, h, chunk: ci });
        } else if (r < 0.5) {
          const h = 40 + rng(idx + 21) * 50;
          this.scenery.push({ type: "deadtree", x, y: gndY, h, chunk: ci });
        } else if (r < 0.62) {
          const sz = 12 + rng(idx + 22) * 20;
          this.scenery.push({ type: "rock", x, y: gndY, sz, chunk: ci });
        } else if (r < 0.7) {
          const h = 25 + rng(idx + 23) * 30;
          this.scenery.push({ type: "cactus", x, y: gndY, h, chunk: ci });
        } else if (r < 0.82) {
          for (let fi = 0; fi < 4; fi++) {
            const fx = x + (rng(idx + 40 + fi) - 0.5) * 60;
            const fgndY = this.getHeightAt(fx);
            const sz = 5 + rng(idx + 50 + fi) * 7;
            this.scenery.push({ type: "flower", x: fx, y: fgndY, sz, chunk: ci });
          }
        } else if (r < 0.9) {
          const h2 = 50 + rng(idx + 25) * 60;
          this.scenery.push({ type: "pine", x: x + 40, y: this.getHeightAt(x + 40), h: h2 * 0.8, chunk: ci });
        }
        x += 80 + rng(idx + 30) * 200;
      }
      idx++;
    }
  }
  _generateObstaclesForChunk(ci, startX, endX) {
    const rng = (n) => noise(ci * 37 + n, this.seed + 500);
    const types = ["log", "rockBoulder", "mudHole", "bump", "doubleJump"];
    let x = startX + 200 + rng(0) * 400;
    let placed = 0;
    while (x < endX - 150 && placed < 4) {
      const spacing = 350 + rng(placed + 10) * 600;
      const gndY = this.getHeightAt(x);
      const ti = Math.floor(rng(placed + 20) * types.length);
      const type = types[ti];
      if (type === "log") {
        this.obstacles.push({ type: "log", x, y: gndY - 10, radius: 10, color: "#5C3A18", chunk: ci });
      } else if (type === "rockBoulder") {
        const sz = 18 + rng(placed + 30) * 22;
        this.obstacles.push({ type: "rockBoulder", x, y: gndY - sz * 0.5, size: sz, color: "#6A6560", chunk: ci });
      } else if (type === "mudHole") {
        this.obstacles.push({ type: "mudHole", x, y: gndY, width: 80 + rng(placed + 40) * 80, depth: 14 + rng(placed + 50) * 10, color: "#3A2E1E", chunk: ci });
      } else if (type === "bump") {
        this.obstacles.push({ type: "bump", x: x - 40, y: gndY, height: 20 + rng(placed + 60) * 20, width: 40, chunk: ci });
        this.obstacles.push({ type: "bump", x: x + 30, y: gndY - 5, height: 18 + rng(placed + 70) * 18, width: 35, chunk: ci });
      } else if (type === "doubleJump") {
        this.obstacles.push({ type: "doubleJump", x, y: gndY, totalWidth: 200, peakHeight: 40 + rng(placed + 80) * 30, chunk: ci });
      }
      x += spacing;
      placed++;
    }
  }
  // Flat list of segments visible between x range (assembled from chunks)
  get segments() {
    const all = [];
    const sorted = [...this.chunks.keys()].sort((a, b) => a - b);
    for (const ci of sorted) {
      const chunk = this.chunks.get(ci);
      for (const s of chunk.segs) all.push(s);
    }
    return all;
  }
  get surfaceTypes() {
    const all = [];
    const sorted = [...this.chunks.keys()].sort((a, b) => a - b);
    for (const ci of sorted) {
      const chunk = this.chunks.get(ci);
      for (const t of chunk.types) all.push(t);
    }
    return all;
  }
  // ── Query methods ──────────────────────────────────────────────────────────
  getHeightAt(x) {
    const ci = this._chunkIndex(x);
    if (!this.chunks.has(ci)) this._generateChunk(ci);
    const chunk = this.chunks.get(ci);
    const segs = chunk.segs;
    let lo = 0, hi = segs.length - 2;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      if (x < segs[mid].x) hi = mid - 1;
      else if (x >= segs[mid + 1]?.x) lo = mid + 1;
      else {
        const s = segs[mid], n = segs[mid + 1];
        if (!n) return s.y;
        const t = (x - s.x) / (n.x - s.x);
        return s.y + (n.y - s.y) * t;
      }
    }
    if (lo >= segs.length - 1) {
      const nextCi = ci + 1;
      if (!this.chunks.has(nextCi)) this._generateChunk(nextCi);
      const nextChunk = this.chunks.get(nextCi);
      if (nextChunk?.segs?.length) {
        const s = segs[segs.length - 1];
        const n = nextChunk.segs[0];
        const t = (x - s.x) / (n.x - s.x);
        return s.y + (n.y - s.y) * t;
      }
    }
    return segs[lo]?.y || 420;
  }
  getSlopeAngle(x) {
    const dx = SEG_W$1;
    const y1 = this.getHeightAt(x - dx);
    const y2 = this.getHeightAt(x + dx);
    return Math.atan2(y2 - y1, dx * 2);
  }
  getNormalAt(x) {
    const a = this.getSlopeAngle(x);
    return { x: -Math.sin(a), y: Math.cos(a) };
  }
  getSurfaceAt(x) {
    if (x < 700) return "dirt";
    if (this.mapName === "road") return "road";
    return surfaceType(x, this.seed);
  }
  getFriction(t) {
    return { dirt: 0.82, mud: 0.44, rock: 0.92, sand: 0.52 }[t] || 0.8;
  }
  getSpeedMult(t) {
    return { dirt: 1, mud: 0.65, rock: 0.88, sand: 0.72 }[t] || 1;
  }
  addRut(x, y, depth) {
    this.ruts.push({ x, y, depth, w: 7 + Math.random() * 5 });
    if (this.ruts.length > 400) this.ruts.shift();
  }
  // Called every frame with current bike X position
  update(bikeX) {
    this._ensureChunks(bikeX);
    const minX = (this._chunkIndex(bikeX) - LOOKBEHIND - 2) * CHUNK_W;
    const maxX = (this._chunkIndex(bikeX) + LOOKAHEAD + 3) * CHUNK_W;
    this.obstacles = this.obstacles.filter((o) => o.x > minX && o.x < maxX);
    this.ramps = this.ramps.filter((r) => r.x > minX && r.x < maxX);
    this.scenery = this.scenery.filter((s) => s.x > minX && s.x < maxX);
    this.ruts = this.ruts.filter((r) => Math.abs(r.x - bikeX) < 3e3);
  }
  // ── Legacy compat (used by renderer) ──────────────────────────────────────
  _segIndex(x) {
    const segs = this.segments;
    let lo = 0, hi = segs.length - 2;
    if (!segs.length) return -1;
    if (x < segs[0].x || x > segs[hi + 1].x) return -1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      if (x < segs[mid].x) hi = mid - 1;
      else if (x >= segs[mid + 1]?.x) lo = mid + 1;
      else return mid;
    }
    return lo;
  }
}
const PX_PER_M$3 = 30;
const G$1 = 9.81 * PX_PER_M$3;
const MAX_GEAR = 6;
const MAX_RPM = 13500;
const IDLE_RPM = 1500;
const POWER_RPM = 9500;
const MAX_ACCEL = 560;
const BIKE_MASS = 110;
const RIDER_MASS = 75;
const TOTAL_MASS = BIKE_MASS + RIDER_MASS;
class Bike {
  constructor(x, y) {
    this.reset(x, y);
  }
  reset(x, y) {
    this.x = x || 300;
    this.y = y || 350;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVel = 0;
    this.wheelBase = 1.25 * PX_PER_M$3;
    this.wheelRad = 0.23 * PX_PER_M$3;
    this.comOffset = 0;
    this.fSuspRest = 0.5 * PX_PER_M$3;
    this.fSuspLen = this.fSuspRest;
    this.fSuspVel = 0;
    this.fSuspK = TOTAL_MASS * G$1 * 0.65;
    this.fSuspC = 2 * Math.sqrt(this.fSuspK * TOTAL_MASS / 2) * 0.75;
    this.fSuspMin = 0.24 * PX_PER_M$3;
    this.fGrounded = false;
    this.fWheelSpin = 0;
    this.rSuspRest = 0.46 * PX_PER_M$3;
    this.rSuspLen = this.rSuspRest;
    this.rSuspVel = 0;
    this.rSuspK = TOTAL_MASS * G$1 * 1.25;
    this.rSuspC = 2 * Math.sqrt(this.rSuspK * TOTAL_MASS / 2) * 0.62;
    this.rSuspMin = 0.18 * PX_PER_M$3;
    this.rGrounded = false;
    this.rWheelSpin = 0;
    this.rpm = IDLE_RPM;
    this.gear = 1;
    this.throttleIn = 0;
    this.clutch = 0;
    this.riderLean = 0;
    this.riderTargetLean = 0;
    this.crashed = false;
    this.crashTimer = 0;
    this.airTime = 0;
    this.speed = 0;
    this.wheeling = false;
    this.stoppie = false;
    this.wheelieAngle = 0;
    this.ragdoll = null;
    this.fWheelX = 0;
    this.fWheelY = 0;
    this.rWheelX = 0;
    this.rWheelY = 0;
    this._calcWheelPositions();
  }
  update(dt, input, terrain, particles, camera) {
    if (this.crashed) {
      this._updateRagdoll(dt, terrain);
      this.crashTimer += dt;
      if (input.respawn) this.reset(this.x, terrain.getHeightAt(this.x) - 3 * PX_PER_M$3);
      return;
    }
    if (input.respawn) {
      this.reset(this.x, terrain.getHeightAt(this.x) - 3 * PX_PER_M$3);
      return;
    }
    const maxSubDt = 1 / 120;
    const steps = Math.ceil(dt / maxSubDt);
    const subDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      this._step(subDt, input, terrain, particles, camera);
    }
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
  _step(dt, input, terrain, particles, camera) {
    const wasAirborne = !this.fGrounded && !this.rGrounded;
    this._calcWheelPositions();
    const fGndY = terrain.getHeightAt(this.fWheelX);
    const rGndY = terrain.getHeightAt(this.rWheelX);
    const rSurf = terrain.getSurfaceAt(this.rWheelX);
    const fSurf = terrain.getSurfaceAt(this.fWheelX);
    const rSpeedM = terrain.getSpeedMult(rSurf);
    const fPen = this.fWheelY + this.wheelRad - fGndY;
    const rPen = this.rWheelY + this.wheelRad - rGndY;
    this.fGrounded = fPen > -1;
    this.rGrounded = rPen > -1;
    let fNormal = 0, rNormal = 0;
    if (this.fGrounded) {
      const compression = Math.max(fPen, 0);
      const prevLen = this.fSuspLen;
      this.fSuspLen = Math.max(this.fSuspMin, this.fSuspRest - compression);
      this.fSuspVel = (this.fSuspLen - prevLen) / dt;
      const springF = compression * this.fSuspK;
      const dampF = -this.fSuspVel * this.fSuspC;
      fNormal = Math.max(0, springF + dampF);
    } else {
      const prevLen = this.fSuspLen;
      this.fSuspLen = Math.min(this.fSuspLen + 1.6 * PX_PER_M$3 * dt, this.fSuspRest);
      this.fSuspVel = (this.fSuspLen - prevLen) / dt;
    }
    if (this.rGrounded) {
      const compression = Math.max(rPen, 0);
      const prevLen = this.rSuspLen;
      this.rSuspLen = Math.max(this.rSuspMin, this.rSuspRest - compression);
      this.rSuspVel = (this.rSuspLen - prevLen) / dt;
      const springF = compression * this.rSuspK;
      const dampF = -this.rSuspVel * this.rSuspC;
      rNormal = Math.max(0, springF + dampF);
    } else {
      const prevLen = this.rSuspLen;
      this.rSuspLen = Math.min(this.rSuspLen + 1.6 * PX_PER_M$3 * dt, this.rSuspRest);
      this.rSuspVel = (this.rSuspLen - prevLen) / dt;
    }
    const grounded = this.fGrounded || this.rGrounded;
    const bothDown = this.fGrounded && this.rGrounded;
    const onlyFrontDown = this.fGrounded && !this.rGrounded;
    const frontFirstLanding = wasAirborne && onlyFrontDown && this.vy > 0;
    if (frontFirstLanding) {
      this.vy *= 0.45;
      this.angularVel = Math.min(this.angularVel, 0.35);
      fNormal *= 0.35;
    }
    if (grounded && this.airTime > 0.25) {
      const impact = Math.min(this.airTime * 3, 8);
      camera.addShake(impact);
      particles.emitDust(this.x, Math.min(fGndY, rGndY), impact * 0.4);
      particles.emitCrash(this.x, Math.min(fGndY, rGndY));
      if (Math.abs(this.vy) > 20 * PX_PER_M$3 && Math.abs(this.angle) > 0.55) {
        this._crash(particles, camera);
        return;
      }
      this.airTime = 0;
    }
    if (!grounded) this.airTime += dt;
    else if (this.airTime > 0) this.airTime = Math.max(0, this.airTime - dt * 4);
    this.vy += G$1 * dt;
    if (bothDown) {
      const wheelSlope = Math.atan2(
        (this.rWheelY + this.wheelRad - (this.fWheelY + this.wheelRad)) * -1,
        this.fWheelX - this.rWheelX
      );
      const diff = wheelSlope - this.angle;
      this.angularVel += diff * 8 * dt;
      this.angularVel *= Math.pow(0.15, dt);
    } else if (grounded) {
      this.angularVel *= Math.pow(0.45, dt);
    }
    const rawThrottle = input.throttle ? 1 : 0;
    this.throttleIn += (rawThrottle - this.throttleIn) * Math.min(1, 3 * dt);
    if (this.throttleIn > 0.05) {
      this.rpm += this.throttleIn * 9e3 * dt;
    } else {
      this.rpm -= 4e3 * dt;
    }
    this.rpm = Math.max(IDLE_RPM, Math.min(this.rpm, MAX_RPM));
    if (this.rpm > 11e3 && this.gear < MAX_GEAR) {
      this.gear++;
      this.rpm *= 0.72;
    } else if (this.rpm < 2800 && this.gear > 1) {
      this.gear--;
      this.rpm *= 1.3;
    }
    if (this.rGrounded && !onlyFrontDown && this.throttleIn > 0.01) {
      const rpmNorm = this.rpm / MAX_RPM;
      const peakNorm = POWER_RPM / MAX_RPM;
      const torqueMult = Math.exp(-Math.pow((rpmNorm - peakNorm) / 0.38, 2));
      const driveF = MAX_ACCEL * torqueMult * this.throttleIn * rSpeedM;
      this.vx += Math.cos(this.angle) * driveF * dt;
      this.vy += Math.sin(this.angle) * driveF * dt * 0.35;
      if (rSurf === "mud") {
        particles.emitMud(this.rWheelX, this.rWheelY + this.wheelRad, this.speed);
      } else if (this.throttleIn > 0.5) {
        particles.emitDirt(this.rWheelX, this.rWheelY + this.wheelRad, this.speed, this.angle + Math.PI, rSurf);
      }
    }
    if (input.brake && grounded) {
      const speedMs2 = Math.abs(this.vx) / PX_PER_M$3;
      const brakeForce = Math.min(0.72 * G$1, speedMs2 * 0.35 * G$1) * dt;
      if (Math.abs(this.vx) > 1) {
        this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), brakeForce);
        const weightTransfer = speedMs2 * 5e-3 * dt;
        this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - weightTransfer * PX_PER_M$3 * 0.9);
        this.rSuspLen = Math.min(this.rSuspRest, this.rSuspLen + weightTransfer * PX_PER_M$3 * 0.6);
        if (this.fGrounded && speedMs2 > 3)
          particles.emitDirt(this.fWheelX, this.fWheelY + this.wheelRad, this.speed * 0.4, 0, fSurf);
      }
    }
    const speedMs = Math.abs(this.vx) / PX_PER_M$3;
    const hasSpeed = speedMs > 0.8;
    if (grounded) {
      if (input.leanBack && this.rGrounded) {
        const liftTorque = (hasSpeed ? 12 : 9) * dt;
        this.angularVel -= liftTorque;
      } else if (input.leanForward && this.fGrounded && speedMs > 4) {
        const stoppieTorque = 4 * dt;
        this.angularVel += stoppieTorque;
      }
    }
    if (!hasSpeed && grounded && !input.leanBack && !input.leanForward) {
      const tiltBack = -this.angle;
      this.angularVel += tiltBack * 18 * dt;
    }
    if (input.brake && this.fGrounded && grounded) {
      if (speedMs > 5) {
        const stoppieTorque = Math.min(speedMs * 0.012, 0.1) * dt;
        this.angularVel += stoppieTorque;
      }
    }
    if (!input.leanBack && this.rGrounded && !this.fGrounded) {
      const tiltBack = Math.max(0, -this.angle);
      this.angularVel += tiltBack * 12 * dt;
    }
    if (onlyFrontDown) {
      this.vx *= Math.pow(0.72, dt);
      this.angularVel -= (frontFirstLanding ? 3.5 : 1.4) * dt;
      if (this.vy > 0) this.vy *= Math.pow(0.18, dt);
    }
    if (!grounded) {
      if (input.leanBack) {
        this.angularVel -= 5.5 * dt;
        this.riderTargetLean = -0.35;
      } else if (input.leanForward) {
        this.angularVel += 5.5 * dt;
        this.riderTargetLean = 0.35;
      } else {
        this.riderTargetLean = 0;
        this.angularVel *= Math.pow(0.2, dt);
      }
    } else {
      this.riderTargetLean = 0;
    }
    this.riderLean += (this.riderTargetLean - this.riderLean) * 7 * dt;
    const vxMs = this.vx / PX_PER_M$3;
    this.vx -= 0.5 * 1.22 * 0.65 * vxMs * Math.abs(vxMs) / TOTAL_MASS * PX_PER_M$3 * dt;
    if (grounded && !input.brake) {
      const rollR = 0.014 * G$1 * dt;
      if (Math.abs(this.vx) > rollR) this.vx -= Math.sign(this.vx) * rollR;
      else if (!input.throttle) this.vx *= Math.pow(0.4, dt);
    }
    if (!grounded) {
      this.angularVel *= Math.pow(0.97, dt * 60);
    }
    const maxAngVel = grounded ? 4 : 8;
    this.angularVel = Math.max(-maxAngVel, Math.min(maxAngVel, this.angularVel));
    this.angle += this.angularVel * dt;
    const totalNormal = fNormal + rNormal;
    this.vy -= totalNormal / TOTAL_MASS * dt * 0.55;
    if (grounded && this.vy < 0) this.vy *= Math.pow(0.06, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (bothDown) {
      const midGnd = (fGndY + rGndY) / 2;
      if (this.y > midGnd - this.wheelRad * 0.5) {
        this.y = midGnd - this.wheelRad * 0.5;
        if (this.vy > 0) this.vy *= -0.02;
      }
    } else if (this.rGrounded && this.rWheelY + this.wheelRad > rGndY + 2) {
      this.y -= this.rWheelY + this.wheelRad - rGndY;
      if (this.vy > 0) this.vy *= -0.02;
    } else if (this.fGrounded && this.fWheelY + this.wheelRad > fGndY + 2) {
      this.y -= this.fWheelY + this.wheelRad - fGndY;
      if (this.vy > 0) this.vy *= -0.02;
    }
    this.wheeling = this.rGrounded && !this.fGrounded;
    this.stoppie = this.fGrounded && !this.rGrounded && hasSpeed;
    const spinRate = Math.abs(this.vx) / (2 * Math.PI * this.wheelRad);
    this.rWheelSpin += (spinRate + this.throttleIn * 3) * dt * 2 * Math.PI;
    this.fWheelSpin += spinRate * dt * 2 * Math.PI;
    if (this.throttleIn > 0.1 || this.rpm > 3e3) {
      const ex = this.x - Math.cos(this.angle) * (this.wheelBase * 0.5 + 2);
      const ey = this.y - Math.sin(this.angle) * (this.wheelBase * 0.5 + 2) + 2;
      particles.emitExhaust(ex, ey);
    }
    if (grounded) {
      if (Math.abs(this.angle) > 1.35) {
        this._crash(particles, camera);
        return;
      }
      if (this.speed > 4 * PX_PER_M$3 && Math.abs(this.angle) > 0.95) {
        this._crash(particles, camera);
        return;
      }
    }
    if (this.rGrounded && this.speed > 1.5 * PX_PER_M$3) {
      terrain.addRut(this.rWheelX, rGndY, Math.min(this.speed / (10 * PX_PER_M$3), 0.4));
    }
    this._checkObstacleCollisions(terrain, particles, camera);
    this.facingRight = this.vx >= 0 || !grounded && (this.facingRight !== void 0 ? this.facingRight : true);
  }
  // ─── OBSTACLE COLLISION ────────────────────────────────────────────────────
  _checkObstacleCollisions(terrain, particles, camera) {
    if (this.crashed) return;
    for (const ob of terrain.obstacles) {
      if (Math.abs(ob.x - this.x) > 150) continue;
      if (ob.type === "log") {
        const r = ob.radius + this.wheelRad * 0.9;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          const dx = wx - ob.x, dy = wy + this.wheelRad - ob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r && dist > 0.1) {
            const nx = dx / dist, ny = dy / dist;
            if (ny < -0.3 && this.vx > 0) {
              const pen = r - dist;
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.7);
              else this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.7);
              this.vy -= pen * 12;
            } else {
              this.x += nx * (r - dist) * 0.5;
              this.y += ny * (r - dist) * 0.5;
              const vDotN = this.vx * nx + this.vy * ny;
              if (vDotN < 0) {
                this.vx -= vDotN * nx * 1.2;
                this.vy -= vDotN * ny * 0.8;
                this.angularVel += nx * 3e-3;
                if (Math.abs(vDotN) > 10 * PX_PER_M$3) {
                  this._crash(particles, camera);
                  return;
                }
              }
            }
          }
        }
      } else if (ob.type === "rockBoulder") {
        const r = ob.size * 0.65 + this.wheelRad * 0.9;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          const dx = wx - ob.x, dy = wy + this.wheelRad - ob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r && dist > 0.1) {
            const nx = dx / dist, ny = dy / dist;
            if (ny < -0.25 && this.vx > 0) {
              const pen = r - dist;
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.8);
              else this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.8);
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
                if (Math.abs(vDotN) > 12 * PX_PER_M$3 && Math.abs(this.angle) > 0.35) {
                  this._crash(particles, camera);
                  return;
                }
              }
            }
          }
        }
      } else if (ob.type === "bump") {
        const hw = ob.width / 2;
        for (const [wx, wy, isFront] of [
          [this.fWheelX, this.fWheelY, true],
          [this.rWheelX, this.rWheelY, false]
        ]) {
          if (Math.abs(wx - ob.x) > hw) continue;
          const t = 1 - Math.abs(wx - ob.x) / hw;
          const bumpTop = ob.y - ob.height * Math.sin(t * Math.PI);
          if (wy + this.wheelRad > bumpTop - 4 && wy + this.wheelRad < bumpTop + 18) {
            const pen = wy + this.wheelRad - bumpTop;
            if (pen > 0) {
              if (isFront) this.fSuspLen = Math.max(this.fSuspMin, this.fSuspLen - pen * 0.6);
              else this.rSuspLen = Math.max(this.rSuspMin, this.rSuspLen - pen * 0.6);
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
    const hb = this.wheelBase / 2;
    this.rWheelX = this.x - cos * hb;
    this.rWheelY = this.y - sin * hb + this.rSuspLen;
    this.fWheelX = this.x + cos * hb;
    this.fWheelY = this.y + sin * hb + this.fSuspLen;
  }
  _crash(particles, camera) {
    this.crashed = true;
    this.crashTimer = 0;
    particles.emitCrash(this.x, this.y);
    camera.addShake(8);
    const vx = this.vx;
    const vy = this.vy;
    const baseVx = vx * 0.9;
    const baseVy = Math.min(vy - 50, -30);
    const spin = this.angularVel;
    this.ragdoll = {
      parts: [
        // torso — center of mass of rider
        { name: "torso", x: this.x, y: this.y - 18, vx: baseVx, vy: baseVy, angle: this.angle, av: spin + (Math.random() - 0.5) * 3, w: 11, h: 18 },
        // head — sits on top of torso
        { name: "head", x: this.x, y: this.y - 34, vx: baseVx * 0.98, vy: baseVy - 10, angle: 0, av: spin + (Math.random() - 0.5) * 4, r: 5 },
        // arms — slightly off to the sides but same bulk velocity
        { name: "armL", x: this.x - 7, y: this.y - 16, vx: baseVx - 8, vy: baseVy + 5, angle: 0.4, av: (Math.random() - 0.5) * 6, w: 4, h: 14 },
        { name: "armR", x: this.x + 7, y: this.y - 16, vx: baseVx + 8, vy: baseVy + 5, angle: -0.4, av: (Math.random() - 0.5) * 6, w: 4, h: 14 },
        // legs — hang below hips, tumble with body
        { name: "legL", x: this.x - 4, y: this.y - 2, vx: baseVx - 5, vy: baseVy + 15, angle: 0.2, av: (Math.random() - 0.5) * 5, w: 5, h: 18 },
        { name: "legR", x: this.x + 4, y: this.y - 2, vx: baseVx + 5, vy: baseVy + 15, angle: -0.2, av: (Math.random() - 0.5) * 5, w: 5, h: 18 }
      ]
    };
  }
  _updateRagdoll(dt, terrain) {
    if (!this.ragdoll) return;
    for (const p of this.ragdoll.parts) {
      p.vy += G$1 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.av * dt;
      const gnd = terrain.getHeightAt(p.x);
      const halfH = p.r !== void 0 ? p.r : (p.h || 10) / 2;
      if (p.y + halfH > gnd) {
        p.y = gnd - halfH;
        p.vy *= -0.12;
        const frictionCoeff = 0.55;
        p.vx *= 1 - frictionCoeff * dt * 60 * 0.016;
        p.av *= 0.6;
        if (Math.abs(p.vy) < 8) p.vy = 0;
      }
      p.vx *= Math.pow(0.994, dt * 60);
      p.vy *= Math.pow(0.999, dt * 60);
    }
  }
}
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500;
  }
  emit(x, y, count, config) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      const angle = (config.angle || 0) + (Math.random() - 0.5) * (config.spread || Math.PI);
      const speed = (config.speed || 100) * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: x + (Math.random() - 0.5) * (config.offsetX || 0),
        y: y + (Math.random() - 0.5) * (config.offsetY || 0),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life || 1,
        maxLife: config.life || 1,
        size: config.size || 3,
        color: config.color || "#8B7355",
        gravity: config.gravity !== void 0 ? config.gravity : 300,
        friction: config.friction || 0.98,
        type: config.type || "dust",
        alpha: 1
      });
    }
  }
  emitDirt(x, y, speed, direction, surface = "dirt") {
    const intensity = Math.min(Math.abs(speed) / 200, 1);
    const colors = {
      dirt: "#6B5B3E",
      rock: "#8A8078",
      sand: "#D8C880",
      road: "#7A7A82"
    };
    this.emit(x, y, Math.ceil(intensity * 4), {
      angle: direction + Math.PI * 0.5,
      spread: 0.8,
      speed: 50 + intensity * 150,
      life: 0.4 + intensity * 0.4,
      size: 2 + intensity * 4,
      color: colors[surface] || "#6B5B3E",
      gravity: 400,
      type: surface === "road" ? "smoke" : "dirt"
    });
  }
  emitMud(x, y, speed) {
    this.emit(x, y, 3, {
      angle: -Math.PI * 0.5,
      spread: 1.2,
      speed: 30 + Math.abs(speed) * 0.3,
      life: 0.6,
      size: 3 + Math.random() * 4,
      color: "#4A3C2A",
      gravity: 500,
      type: "mud"
    });
  }
  emitDust(x, y, intensity) {
    this.emit(x, y, Math.ceil(intensity * 2), {
      angle: -Math.PI * 0.5,
      spread: Math.PI * 0.8,
      speed: 20 + intensity * 40,
      life: 0.8 + intensity * 0.6,
      size: 8 + intensity * 15,
      color: "#9E8E6E",
      gravity: -20,
      friction: 0.95,
      type: "smoke"
    });
  }
  emitExhaust(x, y) {
    this.emit(x, y, 1, {
      angle: Math.PI,
      spread: 0.4,
      speed: 15 + Math.random() * 20,
      life: 0.3 + Math.random() * 0.3,
      size: 3 + Math.random() * 3,
      color: "#555555",
      gravity: -40,
      friction: 0.94,
      type: "smoke"
    });
  }
  emitSpark(x, y, count) {
    this.emit(x, y, count, {
      angle: -Math.PI * 0.5,
      spread: Math.PI,
      speed: 200 + Math.random() * 200,
      life: 0.2 + Math.random() * 0.3,
      size: 1.5,
      color: "#FFB347",
      gravity: 300,
      type: "spark"
    });
  }
  emitCrash(x, y) {
    this.emit(x, y, 20, {
      angle: -Math.PI * 0.5,
      spread: Math.PI * 2,
      speed: 100 + Math.random() * 200,
      life: 0.5 + Math.random() * 0.5,
      size: 3 + Math.random() * 5,
      color: "#8B7355",
      gravity: 400,
      type: "dirt"
    });
    this.emitSpark(x, y, 8);
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  draw(ctx, camera) {
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y);
      const size = p.size * camera.zoom;
      if (screen.x < -50 || screen.x > camera.width + 50 || screen.y < -50 || screen.y > camera.height + 50) continue;
      ctx.globalAlpha = p.alpha * (p.type === "smoke" ? 0.3 : 0.8);
      if (p.type === "spark") {
        ctx.fillStyle = p.color;
        ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);
      } else if (p.type === "smoke") {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
const PX_PER_M$2 = 30;
const G = 9.81 * PX_PER_M$2;
class PropsManager {
  constructor(terrain) {
    this.props = [];
    this.terrain = terrain;
    this._generate();
  }
  _generate() {
  }
  _addRamp(x, gY) {
    this.props.push({
      type: "ramp",
      x,
      y: gY,
      width: 3 * PX_PER_M$2 + Math.random() * 2 * PX_PER_M$2,
      height: 0.9 * PX_PER_M$2 + Math.random() * PX_PER_M$2,
      angle: 0,
      static: true
    });
  }
  _addBarrel(x, gY) {
    this.props.push({
      type: "barrel",
      x,
      y: gY - 0.6 * PX_PER_M$2,
      radius: 0.6 * PX_PER_M$2,
      vx: 0,
      vy: 0,
      av: 0,
      mass: 30,
      static: false
    });
  }
  _addCrate(x, gY) {
    const sz = 1 * PX_PER_M$2;
    this.props.push({
      type: "crate",
      x,
      y: gY - sz / 2,
      width: sz,
      height: sz,
      angle: 0,
      vx: 0,
      vy: 0,
      av: 0,
      mass: 22,
      static: false
    });
  }
  _addTireStack(x, gY) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.props.push({
        type: "tire",
        x: x + (Math.random() - 0.5) * 12,
        y: gY - 0.4 * PX_PER_M$2 - i * 0.75 * PX_PER_M$2,
        radius: 0.4 * PX_PER_M$2,
        vx: 0,
        vy: 0,
        av: 0,
        mass: 14,
        static: false
      });
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt, bike) {
    for (const p of this.props) {
      if (p.static) continue;
      p.vy += G * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.angle !== void 0) p.angle += p.av * dt;
      const gnd = this.terrain.getHeightAt(p.x);
      const bottom = p.type === "barrel" || p.type === "tire" ? p.y + p.radius : p.y + (p.height || 0) / 2;
      if (bottom > gnd) {
        p.y -= bottom - gnd;
        p.vy *= -0.28;
        p.vx *= 0.88;
        if (p.av !== void 0) p.av *= 0.82;
      }
      p.vx *= Math.pow(0.92, dt * 10);
      if (!bike.crashed) {
        const dx = bike.x - p.x;
        const dy = bike.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const collR = (p.radius || Math.max(p.width, p.height) / 2 || PX_PER_M$2) + bike.wheelRad * 1.2;
        if (dist < collR && dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          const rv = (bike.vx - p.vx) * nx + (bike.vy - p.vy) * ny;
          if (rv < 0) {
            185 + p.mass;
            const imp = 2 * rv / (1 / 185 + 1 / p.mass);
            p.vx -= imp / p.mass * nx * 0.6;
            p.vy -= imp / p.mass * ny * 0.6;
            if (p.av !== void 0) p.av += (Math.random() - 0.5) * 4;
            bike.vx += imp / 185 * nx * 0.25;
            bike.vy += imp / 185 * ny * 0.15;
          }
        }
      }
    }
  }
  // ── Ramp interaction ────────────────────────────────────────────────────────
  checkRamp(bike) {
    if (bike.crashed) return;
    for (const r of this.terrain.ramps) {
      const rw = r.tipX - r.x;
      if (rw <= 0) continue;
      const dx = bike.x - r.x;
      if (dx < -bike.wheelRad || dx > rw + bike.wheelRad) continue;
      const t = Math.max(0, Math.min(1, dx / rw));
      const surfaceY = r.y + t * (r.tipY - r.y);
      const bikeBot = bike.y + bike.wheelRad * 0.5;
      const pen = bikeBot - surfaceY;
      if (pen > -bike.wheelRad && pen < bike.wheelRad * 2) {
        bike.y -= pen + 2;
        const rampDY = r.tipY - r.y;
        const rampDX = r.tipX - r.x;
        const rampLen = Math.sqrt(rampDX * rampDX + rampDY * rampDY);
        const tx = rampDX / rampLen;
        const ty = rampDY / rampLen;
        const nx = -ty;
        const ny = tx;
        const vDotN = bike.vx * nx + bike.vy * ny;
        const vDotT = bike.vx * tx + bike.vy * ty;
        if (vDotN < 0) {
          bike.vx = vDotT * tx;
          bike.vy = vDotT * ty;
        }
        if (t > 0.88) {
          const spd = Math.sqrt(bike.vx * bike.vx + bike.vy * bike.vy);
          if (spd > 80) {
            const launchBoost = 1.15;
            bike.vx = tx * spd * launchBoost;
            bike.vy = (ty - 0.18) * spd * launchBoost;
            bike.fGrounded = false;
            bike.rGrounded = false;
          }
        }
      }
    }
  }
}
const PX_PER_M$1 = 30;
const SEG_W = 12;
const ALL_CHASSIS = [
  "Bike_Chassis_1",
  "Bike_Chassis_2",
  "Bike_Chassis_3",
  "Bike_Chassis_4",
  "Bike_Chassis_5",
  "Bike_Chassis_6",
  "Bike_Chassis_7",
  "Bike_Chassis_8"
];
class Renderer {
  constructor(ctx, camera, chassisName = "Bike_Chassis_1") {
    this.ctx = ctx;
    this.camera = camera;
    this.chassisName = chassisName;
    this._sprites = {};
    this._loadSprites();
    this._pixelSize = 3;
    this.ctx.imageSmoothingEnabled = false;
  }
  _loadSprites() {
    const names = [...ALL_CHASSIS, "Bike_Chain_Back", "Bike_Suspension_Front_2", "Wheel_Type_1"];
    names.forEach((name) => {
      const img = new Image();
      img.src = `/sprites/${name}.png`;
      img.onload = () => {
        this._sprites[name] = img;
      };
    });
  }
  clear(w, h) {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = "#87CEEB";
    this.ctx.fillRect(0, 0, w, h);
  }
  // ── PIXELATED SKY with bright daylight ─────────────────────────────────────
  drawSky(w, h, tod) {
    const ctx = this.ctx;
    const px = 32;
    const rows = Math.ceil(h * 0.7 / px);
    for (let row = 0; row < rows; row++) {
      const t = row / rows;
      const r = Math.round(91 + (168 - 91) * t);
      const g = Math.round(168 + (220 - 168) * t);
      const b = Math.round(232 + (250 - 232) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, row * px, w, px);
    }
    const sunX = Math.floor(w * 0.72 / px) * px;
    const sunY = Math.floor(h * 0.06 / px) * px;
    const sunS = px * 3;
    ctx.fillStyle = "rgba(255,250,180,0.35)";
    ctx.fillRect(sunX - sunS, sunY - sunS, sunS * 3, sunS * 3);
    ctx.fillStyle = "rgba(255,245,150,0.55)";
    ctx.fillRect(sunX - px, sunY - px, sunS, sunS);
    ctx.fillStyle = "#FFEE44";
    ctx.fillRect(sunX, sunY, sunS - px, sunS - px);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(sunX + 4, sunY + 4, px, px);
    ctx.fillStyle = "rgba(255,240,120,0.45)";
    const rayLen = px * 4;
    const rayW = 4;
    ctx.fillRect(sunX + px * 0.5, sunY - rayLen, rayW, rayLen);
    ctx.fillRect(sunX + px * 0.5, sunY + sunS, rayW, rayLen);
    ctx.fillRect(sunX - rayLen, sunY + px * 0.5, rayLen, rayW);
    ctx.fillRect(sunX + sunS, sunY + px * 0.5, rayLen, rayW);
    ctx.save();
    ctx.translate(sunX + px, sunY + px);
    for (let a = 45; a < 360; a += 90) {
      ctx.save();
      ctx.rotate(a * Math.PI / 180);
      ctx.fillRect(-rayW / 2, -rayLen * 1.2, rayW, rayLen * 0.8);
      ctx.restore();
    }
    ctx.restore();
  }
  // ── PARALLAX BACKGROUND ─────────────────────────────────────────────────────
  drawParallaxBG(w, h) {
    this._drawPixelMountains(w, h, 0.06, h * 0.38, "#6A8AAA", "#7A9ABB", 120, 60);
    this._drawPixelMountains(w, h, 0.18, h * 0.5, "#4A7840", "#5A8A50", 70, 35);
    this._drawPixelClouds(w, h, 0.025);
    this._drawPixelTreeLine(w, h, 0.18, h * 0.5, 70, 35);
  }
  _drawPixelClouds(w, h, parallax) {
    const ctx = this.ctx;
    const cx = this.camera.x * parallax;
    const cloudData = [
      { ox: 0, oy: h * 0.08, w: 96, hh: 32 },
      { ox: 900, oy: h * 0.05, w: 128, hh: 40 },
      { ox: 1800, oy: h * 0.1, w: 80, hh: 28 },
      { ox: 2900, oy: h * 0.06, w: 112, hh: 36 },
      { ox: 4e3, oy: h * 0.09, w: 96, hh: 30 },
      { ox: 5200, oy: h * 0.04, w: 140, hh: 44 }
    ];
    const px = 8;
    for (const c of cloudData) {
      const tileW = 5800;
      const baseX = ((c.ox - cx) % tileW + tileW) % tileW;
      const sx = baseX * (w / tileW);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(sx, c.oy, c.w, c.hh);
      ctx.fillRect(sx + px, c.oy - px, c.w - px * 2, px);
      ctx.fillRect(sx + px * 2, c.oy - px * 2, c.w - px * 4, px);
      ctx.fillStyle = "#E8F4FF";
      ctx.fillRect(sx + px, c.oy + px, c.w - px * 2, px * 2);
      ctx.fillStyle = "rgba(200,220,240,0.6)";
      ctx.fillRect(sx - px, c.oy + px, px, c.hh - px);
      ctx.fillRect(sx + c.w, c.oy + px, px, c.hh - px);
    }
  }
  _drawPixelMountains(w, h, parallax, baseY, col1, col2, amp1, amp2) {
    const ctx = this.ctx;
    const cx = this.camera.x * parallax;
    const px = 8;
    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + px; sx += px) {
      const wx = sx + cx;
      const hy = amp1 * Math.sin(wx * 6e-3) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 3e-3 + 1.5);
      const snappedY = Math.round((baseY - hy) / px) * px;
      ctx.lineTo(Math.round(sx / px) * px, snappedY);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col2;
    for (let sx = 0; sx <= w + px; sx += px) {
      const wx = sx + cx;
      const hy = amp1 * Math.sin(wx * 6e-3) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 3e-3 + 1.5);
      const snappedY = Math.round((baseY - hy) / px) * px;
      ctx.fillRect(Math.round(sx / px) * px, snappedY, px, px * 2);
    }
  }
  _drawPixelTreeLine(w, h, parallax, baseY, amp1 = 70, amp2 = 35) {
    const ctx = this.ctx;
    const cx = this.camera.x * parallax;
    const px = 8;
    const hillY = (sx) => {
      const wx = sx + cx;
      const hy = amp1 * Math.sin(wx * 6e-3) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 3e-3 + 1.5);
      return Math.round((baseY - hy) / px) * px;
    };
    const treeSpacing = px * 6;
    for (let sx = -treeSpacing * 2; sx <= w + treeSpacing * 2; sx += treeSpacing) {
      const wx = sx + cx;
      const slot = Math.floor(wx / treeSpacing);
      const n = Math.abs(Math.sin(slot * 127.1 + 1.7));
      if (Math.abs(Math.sin(slot * 53.7)) < 0.25) continue;
      const th = Math.round((24 + n * 32) / px) * px;
      const tx = Math.round(sx / px) * px;
      const ty = hillY(sx) + px;
      const dark = "#1A4020";
      const mid = "#2A5830";
      const light = "#3A7040";
      ctx.fillStyle = "#3A2010";
      ctx.fillRect(tx - px / 2, ty - px * 2, px, px * 2);
      const tiers = 5;
      for (let i = 0; i < tiers; i++) {
        const ty0 = ty - th + Math.round(i * th / tiers);
        const layerH = Math.ceil(th / tiers);
        const halfW = (i + 1) * px;
        ctx.fillStyle = i === 0 ? light : i % 2 === 0 ? mid : dark;
        ctx.fillRect(tx - halfW, ty0, halfW * 2, layerH);
        ctx.fillStyle = light;
        ctx.fillRect(tx - px, ty0, px * 2, px);
      }
    }
  }
  // ── TERRAIN with pixel art ──────────────────────────────────────────────────
  drawTerrain(terrain) {
    const ctx = this.ctx;
    const cam = this.camera;
    const L = cam.screenToWorld(0, 0).x - 200;
    const R = cam.screenToWorld(cam.width, 0).x + 200;
    cam.applyTransform(ctx);
    const surfCol = { dirt: "#8B6040", mud: "#5A4830", rock: "#8A8078", sand: "#C8B870", road: "#6A6A7A" };
    const subCol = { dirt: "#5A3820", mud: "#3A2A18", rock: "#585450", sand: "#9A8840", road: "#3A3A48" };
    const segs = terrain.segments;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i], n = segs[i + 1];
      if (n.x < L || s.x > R) continue;
      const surf = terrain.surfaceTypes[i] || "dirt";
      ctx.fillStyle = subCol[surf] || "#3A2E1A";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(n.x, n.y);
      ctx.lineTo(n.x, n.y + 500);
      ctx.lineTo(s.x, s.y + 500);
      ctx.fill();
      ctx.fillStyle = surfCol[surf] || "#8B6040";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(n.x, n.y);
      ctx.lineTo(n.x, n.y + 20);
      ctx.lineTo(s.x, s.y + 20);
      ctx.fill();
      if (surf === "dirt") {
        ctx.fillStyle = "#4AA830";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 4);
        ctx.lineTo(n.x, n.y - 4);
        ctx.lineTo(n.x, n.y + 4);
        ctx.lineTo(s.x, s.y + 4);
        ctx.fill();
        if (Math.floor(s.x / SEG_W) % 3 === 0) {
          ctx.fillStyle = "#5AC838";
          ctx.fillRect(s.x, s.y - 7, 2, 4);
          ctx.fillRect(s.x + SEG_W / 3, s.y - 9, 2, 6);
          ctx.fillRect(s.x + SEG_W * 0.7, s.y - 6, 2, 3);
        }
      }
      if (surf === "rock") {
        ctx.fillStyle = "rgba(60,55,50,0.5)";
        if (Math.floor(s.x / SEG_W) % 4 === 0) {
          ctx.fillRect(s.x, s.y + 2, 4, 2);
          ctx.fillRect(s.x + 6, s.y + 5, 3, 2);
        }
        ctx.fillStyle = "rgba(160,155,148,0.4)";
        ctx.fillRect(s.x, s.y - 2, SEG_W, 2);
      }
      if (surf === "sand") {
        ctx.fillStyle = "#E8D880";
        ctx.fillRect(s.x, s.y - 3, SEG_W, 3);
        if (Math.floor(s.x / SEG_W) % 5 === 0) {
          ctx.fillStyle = "#F0E890";
          ctx.fillRect(s.x + 2, s.y - 1, 3, 2);
        }
      }
      if (surf === "road") {
        ctx.fillStyle = "#787888";
        ctx.fillRect(s.x, s.y - 2, SEG_W, 2);
        if (Math.floor(s.x / 80) % 2 === 0) {
          ctx.fillStyle = "#F8E848";
          ctx.fillRect(s.x, s.y - 4, SEG_W, 3);
        }
        ctx.fillStyle = "#D8D8E0";
        ctx.fillRect(s.x, s.y, SEG_W, 2);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i], n = segs[i + 1];
      if (n.x < L || s.x > R) continue;
      ctx.fillRect(s.x, s.y + 4, SEG_W, 3);
    }
    for (const r of terrain.ruts) {
      if (r.x < L || r.x > R) continue;
      ctx.fillStyle = `rgba(40,25,8,${Math.min(r.depth * 1.2, 0.55)})`;
      ctx.fillRect(r.x - r.w, r.y, r.w * 2, Math.max(2, r.depth * 5));
    }
    this._drawObstacles(terrain.obstacles, L, R);
    this._drawScenery(terrain.scenery, L, R, terrain);
    this._drawRamps(terrain.ramps, L, R);
    cam.restore(ctx);
  }
  _drawObstacles(obstacles, L, R) {
    const ctx = this.ctx;
    for (const ob of obstacles) {
      if (ob.x + 200 < L || ob.x - 200 > R) continue;
      if (ob.type === "log") {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const r = ob.radius;
        ctx.fillStyle = "#7A4E28";
        ctx.fillRect(-r * 3, -r, r * 6, r * 2);
        ctx.fillStyle = "#4A2A0A";
        for (let k = -2; k <= 2; k++) {
          ctx.fillRect(k * r * 0.9, -r, 2, r * 2);
        }
        ctx.fillStyle = "#9A6838";
        ctx.fillRect(-r * 3 - r * 0.5, -r * 0.8, r * 0.5, r * 1.6);
        ctx.fillStyle = "#9A6838";
        ctx.fillRect(-r * 3, -r, r * 6, r * 0.4);
        ctx.restore();
      } else if (ob.type === "rockBoulder") {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const s = ob.size;
        const px = Math.max(4, Math.round(s / 6));
        ctx.fillStyle = "#6A6560";
        ctx.fillRect(-s * 0.7, -s * 0.9, s * 1.4, s * 0.9);
        ctx.fillStyle = "#8A8480";
        ctx.fillRect(-s * 0.5, -s * 0.9, s * 0.8, px);
        ctx.fillRect(-s * 0.6, -s * 0.8, px, px);
        ctx.fillStyle = "#4A4540";
        ctx.fillRect(s * 0.4, -s * 0.7, s * 0.3, s * 0.7);
        ctx.restore();
      } else if (ob.type === "mudHole") {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const hw = ob.width / 2, d = ob.depth;
        ctx.fillStyle = "#3A2A18";
        ctx.fillRect(-hw, 0, hw * 2, d);
        ctx.fillStyle = "rgba(80,60,30,0.6)";
        ctx.fillRect(-hw * 0.7, d * 0.4, hw * 1.4, d * 0.3);
        ctx.fillStyle = "rgba(120,100,60,0.3)";
        ctx.fillRect(-hw * 0.3, d * 0.5, hw * 0.6, d * 0.15);
        ctx.restore();
      } else if (ob.type === "bump") {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const hw = ob.width / 2, bh = ob.height;
        const steps = 6;
        ctx.fillStyle = "#6A5030";
        for (let si = 0; si < steps; si++) {
          const t0 = si / steps, t1 = (si + 1) / steps;
          const x0 = -hw + t0 * hw;
          const x1 = -hw + t1 * hw;
          const y0 = -bh * Math.sin(t0 * Math.PI);
          const y1 = -bh * Math.sin(t1 * Math.PI);
          ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y0 - y1) + 8);
        }
        for (let si = 0; si < steps; si++) {
          const t0 = si / steps, t1 = (si + 1) / steps;
          const x0 = hw * t0;
          const x1 = hw * t1;
          const y0 = -bh * Math.sin((1 - t0) * Math.PI);
          const y1 = -bh * Math.sin((1 - t1) * Math.PI);
          ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y0 - y1) + 8);
        }
        ctx.fillStyle = "#8A7050";
        ctx.fillRect(-4, -bh, 8, 4);
        ctx.restore();
      }
    }
  }
  // ── SCENERY — full pixel art, bright, more variety ─────────────────────────
  _drawScenery(scenery, L, R, terrain) {
    if (!scenery) return;
    const ctx = this.ctx;
    for (const s of scenery) {
      if (s.x + 200 < L || s.x - 200 > R) continue;
      ctx.save();
      const freshY = terrain ? terrain.getHeightAt(s.x) : s.y;
      ctx.translate(s.x, freshY);
      if (terrain && (s.type === "pine" || s.type === "deadtree" || s.type === "cactus" || s.type === "lamppost" || s.type === "roadsign")) {
        const slope = terrain.getSlopeAngle(s.x);
        ctx.rotate(Math.max(-0.45, Math.min(0.45, slope * 0.7)));
      }
      if (s.type === "pine") {
        const h = s.h;
        const u = Math.max(2, Math.round(h / 22));
        ctx.fillStyle = "#5A3818";
        ctx.fillRect(-u, 0, u * 2, -Math.round(h * 0.18));
        ctx.fillStyle = "#3A2008";
        ctx.fillRect(-u, -Math.round(h * 0.16), u, Math.round(h * 0.16));
        const greens = ["#1E6010", "#2A8018", "#3AA020", "#4ABC28"];
        const foliageH = h * 0.85;
        const tiers = 6;
        for (let i = 0; i < tiers; i++) {
          const t01 = i / tiers;
          const tNext = (i + 1) / tiers;
          const halfW = Math.max(u, Math.round(u * 1.2 + t01 * u * 4));
          const yTop = -Math.round(foliageH * (1 - t01)) - Math.round(h * 0.16);
          const yBot = -Math.round(foliageH * (1 - tNext)) - Math.round(h * 0.16);
          const tierH = Math.max(u, yBot - yTop);
          const col = greens[Math.min(greens.length - 1, Math.floor(t01 * greens.length))];
          ctx.fillStyle = col;
          ctx.fillRect(-halfW, yTop, halfW * 2, tierH);
          if (i < tiers - 1) {
            const nextHalfW = Math.max(u, Math.round(u * 1.2 + tNext * u * 4));
            ctx.fillStyle = greens[Math.max(0, Math.floor(t01 * greens.length) - 1)];
            ctx.fillRect(-nextHalfW, yBot - u, u, u);
            ctx.fillRect(nextHalfW - u, yBot - u, u, u);
          }
          ctx.fillStyle = greens[Math.min(greens.length - 1, Math.floor(t01 * greens.length) + 1)];
          ctx.fillRect(-halfW + u, yTop, halfW - u, u);
        }
        ctx.fillStyle = greens[0];
        ctx.fillRect(-u, -Math.round(foliageH) - Math.round(h * 0.16) - u, u * 2, u);
        ctx.fillStyle = "#E8F4FF";
        ctx.fillRect(-u, -Math.round(foliageH) - Math.round(h * 0.16) - u, u * 2, Math.max(1, Math.round(u * 0.5)));
      } else if (s.type === "deadtree") {
        const h = s.h;
        const tw = Math.max(3, Math.round(h * 0.07));
        ctx.fillStyle = "#3A2818";
        ctx.fillRect(-tw, -h, tw * 2, h);
        ctx.fillStyle = "#5A4030";
        ctx.fillRect(-tw, -h, tw * 0.5, h * 0.7);
        const bw = Math.max(2, Math.round(h * 0.04));
        ctx.fillStyle = "#3A2818";
        ctx.fillRect(-h * 0.3, -h * 0.82, h * 0.3, bw);
        ctx.fillRect(0, -h * 0.8, h * 0.24, bw);
        ctx.fillRect(-h * 0.15, -h * 0.95, h * 0.15, bw);
        ctx.fillRect(0, -h * 0.96, h * 0.13, bw);
        ctx.fillStyle = "#5A4030";
        ctx.fillRect(-h * 0.3, -h * 0.82, h * 0.1, bw * 0.5);
      } else if (s.type === "lamppost") {
        const h = s.h;
        const pw = 5;
        ctx.fillStyle = "#505060";
        ctx.fillRect(-pw / 2, -h, pw, h);
        ctx.fillStyle = "#707080";
        ctx.fillRect(-pw / 2, -h, 2, h);
        ctx.fillStyle = "#505060";
        ctx.fillRect(-pw / 2, -h, pw + 20, pw);
        ctx.fillStyle = "#404050";
        ctx.fillRect(18, -h - 12, 16, 12);
        ctx.fillStyle = "#FFEE44";
        ctx.fillRect(20, -h - 10, 12, 8);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(21, -h - 9, 5, 5);
        ctx.fillStyle = "rgba(255,240,100,0.25)";
        ctx.fillRect(12, -h - 16, 28, 20);
      } else if (s.type === "roadsign") {
        const h = s.h;
        ctx.fillStyle = "#606070";
        ctx.fillRect(-3, -h, 6, h);
        ctx.fillStyle = "#808090";
        ctx.fillRect(-3, -h, 2, h * 0.8);
        ctx.fillStyle = "#E83020";
        ctx.fillRect(-16, -h - 22, 32, 22);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-14, -h - 20, 28, 18);
        ctx.fillStyle = "#E83020";
        ctx.fillRect(-10, -h - 18, 20, 14);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-8, -h - 16, 4, 2);
        ctx.fillRect(-8, -h - 14, 4, 2);
        ctx.fillRect(-8, -h - 12, 4, 2);
        ctx.fillRect(-2, -h - 16, 4, 10);
        ctx.fillRect(-4, -h - 16, 8, 2);
      } else if (s.type === "rock") {
        const sz = s.sz;
        const px = Math.max(3, Math.round(sz / 5));
        ctx.fillStyle = "#6A6560";
        ctx.fillRect(-sz * 0.75, -sz, sz * 1.5, sz);
        ctx.fillStyle = "#888480";
        ctx.fillRect(-sz * 0.5, -sz, sz, px);
        ctx.fillRect(-sz * 0.75, -sz, px, sz);
        ctx.fillStyle = "#4A4540";
        ctx.fillRect(sz * 0.35, -sz * 0.7, sz * 0.4, sz * 0.7);
        ctx.fillStyle = "#B0ACA8";
        ctx.fillRect(-sz * 0.4, -sz * 0.85, px, px);
      } else if (s.type === "cactus") {
        const h = s.h;
        const tw = Math.max(4, Math.round(h * 0.12));
        ctx.fillStyle = "#2A7028";
        ctx.fillRect(-tw, -h, tw * 2, h);
        ctx.fillStyle = "#3A9038";
        ctx.fillRect(-tw, -h, tw * 0.5, h);
        ctx.fillStyle = "#2A7028";
        ctx.fillRect(-h * 0.5, -h * 0.65, h * 0.45, tw);
        ctx.fillRect(-h * 0.5, -h * 0.9, tw, h * 0.28);
        ctx.fillRect(tw, -h * 0.5, h * 0.38, tw);
        ctx.fillRect(h * 0.38, -h * 0.68, tw, h * 0.2);
        ctx.fillStyle = "#E8D880";
        for (let i = 0; i < 4; i++) {
          const sy = -h * 0.2 * (i + 1);
          ctx.fillRect(-tw - 4, sy, 4, 2);
          ctx.fillRect(tw, sy, 4, 2);
        }
      } else if (s.type === "flower") {
        const sz = s.sz || 8;
        const colors = ["#FF4488", "#FF8800", "#FFEE00", "#FF2266"];
        const col = colors[Math.floor(Math.abs(s.x * 0.07) % colors.length)];
        ctx.fillStyle = "#3A8018";
        ctx.fillRect(-1, 0, 2, -sz);
        ctx.fillStyle = col;
        ctx.fillRect(-sz * 0.6, -sz * 1.2, sz * 1.2, sz * 0.4);
        ctx.fillRect(-sz * 0.2, -sz * 1.6, sz * 0.4, sz * 1.2);
        ctx.fillStyle = "#FFEE44";
        ctx.fillRect(-sz * 0.2, -sz * 1.2, sz * 0.4, sz * 0.4);
      }
      ctx.restore();
    }
  }
  // ── TERRAIN RAMPS ─────────────────────────────────────────────────────────
  _drawRamps(ramps, L, R) {
    if (!ramps) return;
    const ctx = this.ctx;
    for (const r of ramps) {
      if (r.tipX + 50 < L || r.x - 50 > R) continue;
      const bx = r.x, by = r.y;
      const tx = r.tipX, ty = r.tipY;
      const steps = 8;
      for (let si = 0; si < steps; si++) {
        const t0 = si / steps, t1 = (si + 1) / steps;
        const x0 = bx + (tx - bx) * t0;
        const x1 = bx + (tx - bx) * t1;
        const y0 = by + (ty - by) * t0;
        const shade = Math.round(180 - si * 15);
        ctx.fillStyle = `rgb(${Math.round(shade * 0.55)},${Math.round(shade * 0.42)},${Math.round(shade * 0.22)})`;
        ctx.fillRect(x0, y0, x1 - x0 + 1, by - y0 + 4);
      }
      ctx.fillStyle = "#C8A870";
      ctx.beginPath();
      ctx.moveTo(bx, by - 2);
      ctx.lineTo(tx, ty - 2);
      ctx.lineTo(tx, ty + 2);
      ctx.lineTo(bx, by + 2);
      ctx.fill();
    }
  }
  // ── PROPS ──────────────────────────────────────────────────────────────────
  drawProps(propsManager) {
    const ctx = this.ctx;
    const cam = this.camera;
    const L = cam.screenToWorld(0, 0).x - 200;
    const R = cam.screenToWorld(cam.width, 0).x + 200;
    cam.applyTransform(ctx);
    for (const p of propsManager.props) {
      if (p.x < L || p.x > R) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.angle) ctx.rotate(p.angle);
      if (p.type === "ramp") {
        const steps = 5;
        for (let si = 0; si < steps; si++) {
          const t = si / steps;
          const px2 = -p.width / 2 + t * p.width;
          const py2 = -p.height * t;
          ctx.fillStyle = si % 2 === 0 ? "#9A8060" : "#7A6040";
          ctx.fillRect(px2, py2, p.width / steps + 1, p.height * (1 - t) + 4);
        }
        ctx.fillStyle = "#C8A870";
        ctx.fillRect(-p.width / 2, 0, p.width, 3);
      } else if (p.type === "barrel") {
        const r = p.radius;
        const px2 = Math.round(r);
        ctx.fillStyle = "#C8601A";
        ctx.fillRect(-px2, -px2, px2 * 2, px2 * 2);
        ctx.fillStyle = "#884010";
        ctx.fillRect(-px2, -px2, 3, px2 * 2);
        ctx.fillRect(px2 - 3, -px2, 3, px2 * 2);
        ctx.fillStyle = "#888";
        ctx.fillRect(-px2, -px2 * 0.7, px2 * 2, 3);
        ctx.fillRect(-px2, px2 * 0.4, px2 * 2, 3);
        ctx.fillStyle = "#E08030";
        ctx.fillRect(-px2 + 3, -px2, px2 * 2 - 6, 3);
      } else if (p.type === "crate") {
        ctx.fillStyle = "#C8A060";
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.fillStyle = "#A88040";
        ctx.fillRect(-p.width / 2, -p.height / 2, 3, p.height);
        ctx.fillRect(p.width / 2 - 3, -p.height / 2, 3, p.height);
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, 3);
        ctx.fillRect(-p.width / 2, p.height / 2 - 3, p.width, 3);
        ctx.fillStyle = "#E8C880";
        ctx.fillRect(-p.width / 2 + 3, -p.height / 2 + 3, 5, 5);
        ctx.fillRect(p.width / 2 - 8, p.height / 2 - 8, 5, 5);
      } else if (p.type === "tire") {
        const r = Math.round(p.radius);
        ctx.fillStyle = "#282828";
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.fillStyle = "#181818";
        ctx.fillRect(-Math.round(r * 0.55), -Math.round(r * 0.55), Math.round(r * 1.1), Math.round(r * 1.1));
        ctx.fillStyle = "#444";
        ctx.fillRect(-r, -2, r * 2, 4);
        ctx.fillRect(-2, -r, 4, r * 2);
      }
      ctx.restore();
    }
    cam.restore(ctx);
  }
  // ── BIKE ──────────────────────────────────────────────────────────────────
  drawBike(bike, bikeColor = "#E8640A", username = null) {
    const ctx = this.ctx;
    const cam = this.camera;
    if (bike.crashed && bike.ragdoll) {
      this._drawRagdoll(bike.ragdoll);
      this._drawCrashedBikeFrame(bike, bikeColor);
      return;
    }
    cam.applyTransform(ctx);
    ctx.save();
    ctx.translate(bike.x, bike.y);
    ctx.rotate(bike.angle);
    const hb = bike.wheelBase !== void 0 ? bike.wheelBase / 2 : 18.75;
    const wr = bike.wheelRad !== void 0 ? bike.wheelRad : 6.9;
    const fSL = bike.fSuspLen !== void 0 ? bike.fSuspLen : wr;
    const rSL = bike.rSuspLen !== void 0 ? bike.rSuspLen : wr;
    const sChain = this._sprites["Bike_Chain_Back"];
    const sChassis = this._sprites[bike.chassisName || this.chassisName];
    const sFork = this._sprites["Bike_Suspension_Front_2"];
    const sWheel = this._sprites["Wheel_Type_1"];
    const sc = hb * 2 / 65;
    const cw = 77 * sc;
    const ch = 36 * sc;
    const chassisLeft = -hb - 6 * sc;
    const chassisTop = -18 * sc;
    this._drawSpriteWheel(ctx, sWheel, -hb, rSL, wr, bike.rWheelSpin);
    {
      const pivotX = -hb * 0.3;
      const pivotY = -wr * 0.3;
      const axleX = -hb;
      const axleY = rSL;
      const legLen = Math.sqrt((axleX - pivotX) ** 2 + (axleY - pivotY) ** 2);
      const legAng = Math.atan2(axleY - pivotY, axleX - pivotX);
      const legW = Math.max(4, wr * 0.22);
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(legAng);
      ctx.fillStyle = "#9098a8";
      ctx.fillRect(0, -legW * 0.38, legLen, legW * 0.76);
      ctx.fillStyle = "rgba(220,230,240,0.35)";
      ctx.fillRect(2, -legW * 0.28, legLen - 4, legW * 0.22);
      ctx.fillStyle = "#707888";
      ctx.fillRect(legLen - legW * 0.52, -legW * 0.52, legW * 1.04, legW * 1.04);
      ctx.fillStyle = "#707888";
      ctx.fillRect(-legW * 0.45, -legW * 0.45, legW * 0.9, legW * 0.9);
      ctx.restore();
    }
    if (sChain && sChain.complete) {
      const fromX = -hb * 0.3;
      const fromY = wr * 0.1;
      const toX = -hb;
      const toY = rSL;
      const cLen = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      const cAng = Math.atan2(toY - fromY, toX - fromX);
      const cH = Math.max(4, wr * 0.18);
      ctx.save();
      ctx.translate(fromX, fromY);
      ctx.rotate(cAng);
      ctx.drawImage(sChain, 0, -cH * 0.5, cLen, cH);
      ctx.restore();
    }
    this._drawSpriteWheel(ctx, sWheel, hb, fSL, wr, bike.fWheelSpin);
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, chassisLeft, chassisTop, cw, ch);
    }
    {
      const forkTopX = chassisLeft + 58 * sc;
      const forkTopY = chassisTop + 4 * sc;
      const forkBotX = hb;
      const forkBotY = fSL;
      const fullLen = Math.sqrt((forkBotX - forkTopX) ** 2 + (forkBotY - forkTopY) ** 2);
      const legAng = Math.atan2(forkBotY - forkTopY, forkBotX - forkTopX);
      const legW = Math.max(5, wr * 0.38);
      const fenderBottom = chassisTop + ch * 0.43;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-hb * 3, fenderBottom, hb * 6, fSL + wr * 2);
      ctx.clip();
      if (sFork && sFork.complete) {
        ctx.save();
        ctx.translate(forkTopX, forkTopY);
        ctx.rotate(legAng - Math.PI / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(sFork, -legW / 2, 0, legW, fullLen);
        ctx.restore();
      } else {
        ctx.strokeStyle = "#8090A0";
        ctx.lineWidth = Math.max(3, legW * 0.5);
        ctx.beginPath();
        ctx.moveTo(forkTopX, forkTopY);
        ctx.lineTo(forkBotX, forkBotY);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, chassisLeft, chassisTop, cw, ch);
    }
    this._drawRagdollRider(ctx, bike);
    ctx.restore();
    if (username) {
      const sc2 = hb * 2 / 65;
      ctx.save();
      ctx.translate(bike.x, bike.y - wr * 3 - 14 * sc2);
      username.length * 7 + 14;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(username, 0, 0);
      ctx.restore();
    }
    cam.restore(ctx);
  }
  _drawSpriteWheel(ctx, sprite, cx, suspLen, r, spin) {
    ctx.save();
    ctx.translate(cx, suspLen);
    if (sprite && sprite.complete) {
      const d = r * 2;
      const snapSpin = spin % (Math.PI * 2);
      const BLUR_STEPS = 4;
      const BLUR_SPREAD = Math.PI / 6;
      ctx.rotate(snapSpin);
      for (let i = BLUR_STEPS; i >= 1; i--) {
        const off = i / BLUR_STEPS * BLUR_SPREAD;
        ctx.save();
        ctx.rotate(off);
        ctx.globalAlpha = 0.18 / i;
        ctx.drawImage(sprite, -r, -r, d, d);
        ctx.restore();
        ctx.save();
        ctx.rotate(-off);
        ctx.globalAlpha = 0.18 / i;
        ctx.drawImage(sprite, -r, -r, d, d);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite, -r, -r, d, d);
    } else {
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#D8DCE0";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00C8D4";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E8640A";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  _drawRagdollRider(ctx, bike) {
    const lean = bike.riderLean || 0;
    const hb = bike.wheelBase / 2;
    const wr = bike.wheelRad;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const hipX = -hb * 0.1 + lean * 7;
    const hipY = -wr * 0.82;
    const torsoAngle = lean * 0.3 - 0.15;
    const torsoLen = 11;
    const shoulderX = hipX + Math.sin(torsoAngle) * torsoLen;
    const shoulderY = hipY - Math.cos(torsoAngle) * torsoLen;
    const headRadius = 4;
    const headX = shoulderX + Math.sin(torsoAngle) * (headRadius + 1);
    const headY = shoulderY - Math.cos(torsoAngle) * (headRadius + 1);
    const barX = hb * 0.42;
    const barY = hipY - 4;
    const kneeFX = hipX + hb * 0.08;
    const kneeFY = hipY + 11;
    const C = "#f0f0f0";
    const LW_THICK = 3.5;
    const LW_THIN = 2.5;
    ctx.strokeStyle = C;
    ctx.lineWidth = LW_THICK;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY + 2);
    ctx.lineTo(kneeFX, kneeFY);
    ctx.stroke();
    ctx.fillStyle = C;
    ctx.beginPath();
    ctx.arc(kneeFX, kneeFY, LW_THICK * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C;
    ctx.lineWidth = LW_THICK;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();
    ctx.lineWidth = LW_THIN;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.bezierCurveTo(shoulderX + 5, shoulderY + 2, barX - 4, barY + 2, barX, barY);
    ctx.stroke();
    ctx.fillStyle = C;
    ctx.fillRect(headX - headRadius, headY - headRadius, headRadius * 2, headRadius * 2);
  }
  _drawRider(ctx, bike) {
    const lean = bike.riderLean;
    const hb = bike.wheelBase / 2;
    const rSL = bike.rSuspLen;
    const isWheeling = bike.wheeling;
    bike.stoppie;
    const leanBase = isWheeling ? -0.18 : 0;
    const hipX = -2 + lean * 18 + leanBase * 14;
    const hipY = -19;
    const torsoAngle = lean * 0.4 + leanBase * 0.22;
    const shoulderX = hipX + Math.sin(torsoAngle) * 19;
    const shoulderY = hipY - Math.cos(torsoAngle) * 19;
    const headX = shoulderX + Math.sin(torsoAngle) * 8;
    const headY = shoulderY - Math.cos(torsoAngle) * 8;
    const handX = hb * 0.5;
    const handY = -29;
    const footRX = -hb + 12;
    const footFX = hb * 0.18;
    const footY = rSL - 2;
    const pxl = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const kneeRX = hipX - 5;
    const kneeRY = hipY + 12;
    const kneeFX2 = hipX + 10;
    const kneeFY2 = hipY + 12;
    pxl(hipX - 7, hipY, 7, 6, "#2a2a38");
    pxl(kneeRX - 2, kneeRY - 1, 7, 5, "#2a2a38");
    pxl(kneeRX - 1, kneeRY - 2, 5, 3, "#D8DCE0");
    pxl(footRX - 2, footY - 8, 6, 8, "#2a2a38");
    pxl(hipX, hipY, 7, 6, "#32324a");
    pxl(kneeFX2 - 1, kneeFY2 - 1, 7, 5, "#32324a");
    pxl(kneeFX2, kneeFY2 - 2, 5, 3, "#D8DCE0");
    pxl(footFX - 2, footY - 8, 6, 8, "#32324a");
    ctx.fillStyle = "#111";
    ctx.fillRect(footRX - 10, footY - 4, 16, 8);
    ctx.fillRect(footRX - 14, footY, 6, 4);
    ctx.fillRect(footFX - 10, footY - 4, 14, 8);
    ctx.fillRect(footFX - 14, footY, 6, 4);
    ctx.fillStyle = "#D8DCE0";
    ctx.fillRect(footRX - 8, footY - 2, 10, 2);
    ctx.fillRect(footFX - 8, footY - 2, 9, 2);
    ctx.fillStyle = "#D8DCE0";
    ctx.fillRect(footRX - 8, footY + 1, 10, 1);
    const px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };
    px(hipX - 4, hipY, 9, 4, "#E8EEF4");
    px(hipX - 4, hipY - 4, 9, 4, "#E8640A");
    px(hipX - 3, hipY - 8, 8, 4, "#E8EEF4");
    px(shoulderX - 4, shoulderY, 8, 4, "#E8EEF4");
    const midAX = Math.round((shoulderX + handX) / 2);
    const midAY = Math.round((shoulderY + handY) / 2) + 3;
    px(shoulderX + 1, shoulderY + 1, 5, 4, "#E8EEF4");
    px(midAX - 1, midAY, 5, 4, "#E8640A");
    px(handX - 3, handY, 5, 4, "#E8EEF4");
    px(handX, handY - 1, 4, 3, "#111111");
    px(headX - 5, headY - 8, 10, 10, "#E8EEF4");
    px(headX - 6, headY - 5, 2, 5, "#E8EEF4");
    px(headX + 4, headY - 5, 2, 5, "#E8EEF4");
    px(headX - 5, headY - 8, 10, 3, "#E8640A");
    px(headX + 4, headY - 7, 6, 2, "#D8DCE0");
    px(headX - 4, headY - 2, 1, 5, "#E8640A");
    px(headX + 4, headY - 2, 1, 5, "#E8640A");
    px(headX - 3, headY - 2, 8, 1, "#E8640A");
    px(headX - 3, headY + 2, 8, 1, "#E8640A");
  }
  _drawRagdoll(ragdoll) {
    const ctx = this.ctx;
    const cam = this.camera;
    cam.applyTransform(ctx);
    for (const p of ragdoll.parts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle || 0);
      if (p.name === "head") {
        ctx.fillStyle = "#E8EEF4";
        ctx.beginPath();
        ctx.arc(0, 0, p.r || 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,200,220,0.7)";
        ctx.fillRect(-(p.r || 5) + 1, 0, (p.r || 5) * 2 - 2, 3);
      } else if (p.name === "torso") {
        ctx.fillStyle = "#E8640A";
        ctx.beginPath();
        ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 2);
        ctx.fill();
      } else if (p.name.startsWith("arm")) {
        ctx.fillStyle = "#E8EEF4";
        ctx.beginPath();
        ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.w / 2);
        ctx.fill();
      } else if (p.name.startsWith("leg")) {
        ctx.fillStyle = "#2a2a38";
        ctx.beginPath();
        ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.w / 2);
        ctx.fill();
      }
      ctx.restore();
    }
    cam.restore(ctx);
  }
  _drawCrashedBikeFrame(bike, bikeColor = "#E8640A") {
    const ctx = this.ctx;
    const cam = this.camera;
    cam.applyTransform(ctx);
    ctx.save();
    ctx.translate(bike.x, bike.y);
    ctx.rotate(bike.angle + Math.sin(bike.crashTimer * 2) * 0.05);
    ctx.globalAlpha = 0.65;
    const wr = bike.wheelRad;
    const hb = bike.wheelBase / 2;
    const sc = hb * 2 / 56;
    const sChassis = this._sprites[bike.chassisName || this.chassisName];
    const sWheel = this._sprites["Wheel_Type_1"];
    this._drawSpriteWheel(ctx, sWheel, -hb, wr, wr, 0.4);
    this._drawSpriteWheel(ctx, sWheel, hb, wr, wr, 0.4);
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, -hb - 10 * sc, -20 * sc, 77 * sc, 36 * sc);
    } else {
      ctx.fillStyle = "#E8EEF4";
      ctx.fillRect(-35, -8, 70, 14);
      ctx.fillStyle = "#E8640A";
      ctx.fillRect(-18, -7, 32, 12);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    cam.restore(ctx);
  }
  drawDummy(dummy) {
    const ctx = this.ctx;
    const cam = this.camera;
    cam.applyTransform(ctx);
    const p = dummy.parts;
    const drawPart = (part, color, isRect = true) => {
      ctx.save();
      ctx.translate(part.x, part.y);
      ctx.rotate(part.angle || 0);
      ctx.fillStyle = color;
      if (!isRect) {
        ctx.fillRect(-part.r, -part.r, part.r * 2, part.r * 2);
      } else {
        ctx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
      }
      ctx.restore();
    };
    drawPart(p.legL, "#3A3A50");
    drawPart(p.legR, "#3A3A50");
    drawPart(p.torso, "#CC4400");
    drawPart(p.armL, "#DDCCBB");
    drawPart(p.armR, "#DDCCBB");
    ctx.save();
    ctx.translate(p.head.x, p.head.y);
    ctx.fillStyle = "#DDCCBB";
    ctx.fillRect(-p.head.r, -p.head.r, p.head.r * 2, p.head.r * 2);
    ctx.restore();
    if (dummy.hit && dummy.hitTimer > 3) {
      ctx.font = "600 11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.fillText("ride further →", p.torso.x, p.torso.y - 30);
      ctx.textAlign = "left";
    }
    cam.restore(ctx);
  }
  // ── HUD — pixel art style ──────────────────────────────────────────────────
  drawHUD(bike, w, h, fps, _unused, isMobile = false) {
    const ctx = this.ctx;
    const kmh = Math.abs(bike.vx / PX_PER_M$1 * 3.6);
    const speedStr = kmh.toFixed(0);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(16, h - 68, 180, 56);
    ctx.fillStyle = "rgba(80,200,80,0.2)";
    ctx.fillRect(16, h - 68, 180, 4);
    ctx.font = "700 36px monospace";
    ctx.fillStyle = "#AAFFAA";
    ctx.textAlign = "left";
    ctx.fillText(speedStr, 24, h - 38);
    ctx.font = "500 11px monospace";
    ctx.fillStyle = "rgba(180,255,180,0.6)";
    ctx.fillText("KM/H", 24, h - 24);
    const rpmF = (bike.rpm - 1500) / (12500 - 1500);
    const barW = 130;
    const barX = 24, barY = h - 20;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(barX, barY, barW, 6);
    const barColor = rpmF > 0.85 ? "#FF4444" : rpmF > 0.65 ? "#FF9900" : "#44FF88";
    const barFill = barW * Math.max(0, Math.min(1, rpmF));
    const bpx = 5;
    for (let bx2 = 0; bx2 < barFill; bx2 += bpx + 1) {
      ctx.fillStyle = barColor;
      ctx.fillRect(barX + bx2, barY, bpx, 6);
    }
    ctx.font = "700 16px monospace";
    ctx.fillStyle = "#AAFFAA";
    ctx.textAlign = "left";
    ctx.fillText(`G${bike.gear}`, barX + barW + 8, barY + 6);
    if (bike.wheeling) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(w / 2 - 70, h - 45, 140, 28);
      ctx.fillStyle = "#44FF44";
      ctx.font = "700 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WHEELIE", w / 2, h - 24);
    }
    if (bike.stoppie) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(w / 2 - 70, h - 45, 140, 28);
      ctx.fillStyle = "#44CCFF";
      ctx.font = "700 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("STOPPIE", w / 2, h - 24);
    }
    if (bike.airTime > 0.4) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(w / 2 - 80, 30, 160, 28);
      ctx.font = "700 18px monospace";
      ctx.fillStyle = "#FFEE44";
      ctx.textAlign = "center";
      ctx.fillText(`AIR  ${bike.airTime.toFixed(1)}s`, w / 2, 49);
    }
    if (bike.crashed) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,60,60,0.95)";
      ctx.font = "700 32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CRASHED", w / 2, h / 2 - 12);
      ctx.font = "500 14px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(isMobile ? "Tap  R  to respawn" : "Press  R  to respawn", w / 2, h / 2 + 14);
    }
    ctx.font = "500 11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.textAlign = "right";
    ctx.fillText(`${fps} FPS`, w - 12, h - 10);
    ctx.textAlign = "left";
  }
  _lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
    const ar = ah >> 16 & 255, ag = ah >> 8 & 255, ab = ah & 255;
    const br = bh >> 16 & 255, bg = bh >> 8 & 255, bb = bh & 255;
    const rr = Math.round(ar + (br - ar) * t), rg = Math.round(ag + (bg - ag) * t), rb = Math.round(ab + (bb - ab) * t);
    return `#${(rr << 16 | rg << 8 | rb).toString(16).padStart(6, "0")}`;
  }
}
const STORAGE_KEY = "mx_track_layout";
const OBJECT_TYPES = {
  ramp_sm: { label: "Small Ramp", w: 80, h: 30, color: "#7A6B52", icon: "/" },
  ramp_md: { label: "Medium Ramp", w: 120, h: 55, color: "#7A6B52", icon: "//" },
  ramp_lg: { label: "Big Ramp", w: 180, h: 90, color: "#6B5C43", icon: "///" },
  tabletop: { label: "Tabletop", w: 220, h: 60, color: "#5C4A30", icon: "⬛" },
  doublejump: { label: "Double Jump", w: 250, h: 70, color: "#4A3A25", icon: "ΛΛ" },
  log: { label: "Log", w: 60, h: 20, color: "#5C3A18", icon: "━" },
  rock: { label: "Boulder", w: 40, h: 36, color: "#6A6560", icon: "◆" },
  barrel: { label: "Barrel", w: 36, h: 36, color: "#9B4A15", icon: "⬤" },
  crate: { label: "Crate", w: 32, h: 32, color: "#A0855C", icon: "▪" },
  tirestack: { label: "Tire Stack", w: 24, h: 60, color: "#222", icon: "⬛" },
  whoops: { label: "Whoops (5)", w: 200, h: 22, color: "#4A3A25", icon: "∿∿∿" }
};
class TrackEditor {
  constructor(terrain) {
    this.terrain = terrain;
    this.active = false;
    this.items = [];
    this.selected = null;
    this.hoverId = -1;
    this.curType = "ramp_md";
    this.cursorX = 0;
    this.cursorY = 0;
    this.snapAngle = 0;
    this.load();
  }
  // ── Persistence ───────────────────────────────────────────────────────────
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
    }
  }
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.items = JSON.parse(raw);
    } catch {
      this.items = [];
    }
  }
  clear() {
    this.items = [];
    this.save();
  }
  // ── World interaction ─────────────────────────────────────────────────────
  // worldX/Y = cursor in world coords
  // returns true if event was consumed
  onMouseMove(worldX, worldY) {
    this.cursorX = worldX;
    this.cursorY = worldY;
    if (this.selected) {
      this.selected.x = worldX;
      this.selected.y = this.terrain.getHeightAt(worldX);
      return true;
    }
    this.hoverId = -1;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this._hitTest(this.items[i], worldX, worldY)) {
        this.hoverId = i;
        break;
      }
    }
    return false;
  }
  onMouseDown(worldX, worldY) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this._hitTest(this.items[i], worldX, worldY)) {
        this.selected = this.items[i];
        return true;
      }
    }
    this._placeItem(worldX, worldY);
    return true;
  }
  onMouseUp() {
    if (this.selected) {
      this.selected = null;
      this.save();
      return true;
    }
    return false;
  }
  deleteHovered() {
    if (this.hoverId >= 0) {
      this.items.splice(this.hoverId, 1);
      this.hoverId = -1;
      this.save();
    }
  }
  rotateSelected(deg) {
    if (this.selected) {
      this.selected.angle = (this.selected.angle || 0) + deg * Math.PI / 180;
      this.save();
    } else {
      this.snapAngle = (this.snapAngle + deg) % 360;
    }
  }
  _placeItem(worldX, worldY) {
    const def = OBJECT_TYPES[this.curType];
    const gndY = this.terrain.getHeightAt(worldX);
    const item = {
      id: Date.now() + Math.random(),
      type: this.curType,
      x: worldX,
      y: gndY,
      angle: this.snapAngle * Math.PI / 180,
      w: def.w,
      h: def.h
    };
    this.items.push(item);
    this.save();
  }
  _hitTest(item, wx, wy) {
    const hw = item.w / 2 + 8, hh = item.h / 2 + 8;
    return Math.abs(wx - item.x) < hw && Math.abs(wy - item.y) < hh + 20;
  }
  // ── Draw (world-space, called inside camera transform) ───────────────────
  draw(ctx, camera) {
    const L = camera.screenToWorld(0, 0).x - 300;
    const R = camera.screenToWorld(camera.width, 0).x + 300;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.x < L || item.x > R) continue;
      const isHov = i === this.hoverId;
      const isSel = item === this.selected;
      this._drawItem(ctx, item, isHov, isSel);
    }
    if (!this.selected) {
      const def = OBJECT_TYPES[this.curType];
      const ghostY = this.terrain.getHeightAt(this.cursorX);
      ctx.globalAlpha = 0.45;
      this._drawItem(ctx, {
        type: this.curType,
        x: this.cursorX,
        y: ghostY,
        angle: this.snapAngle * Math.PI / 180,
        w: def.w,
        h: def.h
      }, false, false);
      ctx.globalAlpha = 1;
    }
  }
  _drawItem(ctx, item, hovered, selected) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle || 0);
    if (hovered || selected) {
      ctx.shadowColor = selected ? "#FFD700" : "#FFFFFF";
      ctx.shadowBlur = 10;
    }
    const t = item.type;
    const w = item.w, h = item.h;
    if (t === "ramp_sm" || t === "ramp_md" || t === "ramp_lg") {
      ctx.fillStyle = "#7A6B52";
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w / 2, -h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#5A4B32";
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 5; k++) {
        const t2 = k / 5, px = -w / 2 + t2 * w;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, -h * t2);
        ctx.stroke();
      }
      ctx.fillStyle = "#5A4B32";
      ctx.fillRect(w / 2 - 5, -h, 5, h);
    } else if (t === "tabletop") {
      ctx.fillStyle = "#5C4A30";
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w / 3, -h);
      ctx.lineTo(w / 3, -h);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#4A3820";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#6B5840";
      ctx.fillRect(-w / 3 + 2, -h - 2, w * 0.66 - 4, 4);
    } else if (t === "doublejump") {
      ctx.fillStyle = "#4A3A25";
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w * 0.05, -h);
      ctx.lineTo(w * 0.05, -h);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#362A1A";
      ctx.beginPath();
      ctx.moveTo(-w * 0.05, -h);
      ctx.lineTo(0, -h * 0.3);
      ctx.lineTo(w * 0.05, -h);
      ctx.closePath();
      ctx.fill();
    } else if (t === "log") {
      ctx.fillStyle = "#5C3A18";
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.strokeStyle = "#3A2208";
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 10, -h / 2);
        ctx.lineTo(k * 10 + 3, h / 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#7A5030";
      ctx.beginPath();
      ctx.ellipse(-w / 2, 0, h * 0.4, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === "rock") {
      ctx.fillStyle = "#6A6560";
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, h * 0.3);
      ctx.lineTo(-w * 0.6, -h * 0.1);
      ctx.lineTo(-w * 0.3, -h * 0.5);
      ctx.lineTo(w * 0.2, -h * 0.55);
      ctx.lineTo(w * 0.6, -h * 0.1);
      ctx.lineTo(w * 0.5, h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#888480";
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.5);
      ctx.lineTo(w * 0.2, -h * 0.55);
      ctx.lineTo(w * 0.35, -h * 0.2);
      ctx.lineTo(-w * 0.1, -h * 0.15);
      ctx.closePath();
      ctx.fill();
    } else if (t === "barrel") {
      ctx.fillStyle = "#9B4A15";
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5A2D0C";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 1.5;
      [0.85, 0.55].forEach((f) => {
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 * f, 0, Math.PI * 2);
        ctx.stroke();
      });
    } else if (t === "crate") {
      ctx.fillStyle = "#A0855C";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = "#7A6540";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.moveTo(w / 2, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.stroke();
    } else if (t === "tirestack") {
      const tr = 12;
      const count = Math.round(h / (tr * 2));
      for (let k = 0; k < count; k++) {
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(0, -k * tr * 2, tr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#181818";
        ctx.beginPath();
        ctx.arc(0, -k * tr * 2, tr * 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t === "whoops") {
      const bumpW = w / 5, bumpH = h;
      ctx.fillStyle = "#4A3A25";
      for (let k = 0; k < 5; k++) {
        const bx = -w / 2 + k * bumpW + bumpW / 2;
        ctx.beginPath();
        ctx.moveTo(bx - bumpW / 2, 0);
        ctx.bezierCurveTo(bx - bumpW * 0.3, -bumpH, bx + bumpW * 0.3, -bumpH, bx + bumpW / 2, 0);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (hovered || selected) {
      ctx.strokeStyle = selected ? "#FFD700" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-w / 2 - 4, -h - 4, w + 8, h + 8);
      ctx.setLineDash([]);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // ── UI overlay (screen-space) ─────────────────────────────────────────────
  drawUI(ctx, w, h) {
    ctx.fillStyle = "rgba(10,8,5,0.85)";
    ctx.fillRect(0, 0, w, 52);
    ctx.strokeStyle = "rgba(180,130,50,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(w, 52);
    ctx.stroke();
    ctx.font = '700 15px "Barlow Condensed", sans-serif';
    ctx.fillStyle = "#D4A020";
    ctx.textAlign = "left";
    ctx.fillText("TRACK EDITOR", 16, 22);
    ctx.font = '500 11px "Rajdhani", sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("CLICK = place   DRAG = move   DEL = delete hovered   Q/E = rotate   ESC = exit", 16, 40);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = '600 12px "Barlow Condensed", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(`ROT ${Math.round(this.snapAngle)}°`, w - 16, 22);
    ctx.fillText("E save / load", w - 16, 38);
    ctx.textAlign = "left";
  }
}
class $e8379818650e2442$export$93654d4f2d6cd524 {
  constructor() {
    this.encoder = new TextEncoder();
    this._pieces = [];
    this._parts = [];
  }
  append_buffer(data) {
    this.flush();
    this._parts.push(data);
  }
  append(data) {
    this._pieces.push(data);
  }
  flush() {
    if (this._pieces.length > 0) {
      const buf = new Uint8Array(this._pieces);
      this._parts.push(buf);
      this._pieces = [];
    }
  }
  toArrayBuffer() {
    const buffer = [];
    for (const part of this._parts) buffer.push(part);
    return $e8379818650e2442$var$concatArrayBuffers(buffer).buffer;
  }
}
function $e8379818650e2442$var$concatArrayBuffers(bufs) {
  let size = 0;
  for (const buf of bufs) size += buf.byteLength;
  const result = new Uint8Array(size);
  let offset = 0;
  for (const buf of bufs) {
    const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    result.set(view, offset);
    offset += buf.byteLength;
  }
  return result;
}
function $0cfd7828ad59115f$export$417857010dc9287f(data) {
  const unpacker = new $0cfd7828ad59115f$var$Unpacker(data);
  return unpacker.unpack();
}
function $0cfd7828ad59115f$export$2a703dbb0cb35339(data) {
  const packer = new $0cfd7828ad59115f$export$b9ec4b114aa40074();
  const res = packer.pack(data);
  if (res instanceof Promise) return res.then(() => packer.getBuffer());
  return packer.getBuffer();
}
class $0cfd7828ad59115f$var$Unpacker {
  constructor(data) {
    this.index = 0;
    this.dataBuffer = data;
    this.dataView = new Uint8Array(this.dataBuffer);
    this.length = this.dataBuffer.byteLength;
  }
  unpack() {
    const type = this.unpack_uint8();
    if (type < 128) return type;
    else if ((type ^ 224) < 32) return (type ^ 224) - 32;
    let size;
    if ((size = type ^ 160) <= 15) return this.unpack_raw(size);
    else if ((size = type ^ 176) <= 15) return this.unpack_string(size);
    else if ((size = type ^ 144) <= 15) return this.unpack_array(size);
    else if ((size = type ^ 128) <= 15) return this.unpack_map(size);
    switch (type) {
      case 192:
        return null;
      case 193:
        return void 0;
      case 194:
        return false;
      case 195:
        return true;
      case 202:
        return this.unpack_float();
      case 203:
        return this.unpack_double();
      case 204:
        return this.unpack_uint8();
      case 205:
        return this.unpack_uint16();
      case 206:
        return this.unpack_uint32();
      case 207:
        return this.unpack_uint64();
      case 208:
        return this.unpack_int8();
      case 209:
        return this.unpack_int16();
      case 210:
        return this.unpack_int32();
      case 211:
        return this.unpack_int64();
      case 212:
        return void 0;
      case 213:
        return void 0;
      case 214:
        return void 0;
      case 215:
        return void 0;
      case 216:
        size = this.unpack_uint16();
        return this.unpack_string(size);
      case 217:
        size = this.unpack_uint32();
        return this.unpack_string(size);
      case 218:
        size = this.unpack_uint16();
        return this.unpack_raw(size);
      case 219:
        size = this.unpack_uint32();
        return this.unpack_raw(size);
      case 220:
        size = this.unpack_uint16();
        return this.unpack_array(size);
      case 221:
        size = this.unpack_uint32();
        return this.unpack_array(size);
      case 222:
        size = this.unpack_uint16();
        return this.unpack_map(size);
      case 223:
        size = this.unpack_uint32();
        return this.unpack_map(size);
    }
  }
  unpack_uint8() {
    const byte = this.dataView[this.index] & 255;
    this.index++;
    return byte;
  }
  unpack_uint16() {
    const bytes = this.read(2);
    const uint16 = (bytes[0] & 255) * 256 + (bytes[1] & 255);
    this.index += 2;
    return uint16;
  }
  unpack_uint32() {
    const bytes = this.read(4);
    const uint32 = ((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3];
    this.index += 4;
    return uint32;
  }
  unpack_uint64() {
    const bytes = this.read(8);
    const uint64 = ((((((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3]) * 256 + bytes[4]) * 256 + bytes[5]) * 256 + bytes[6]) * 256 + bytes[7];
    this.index += 8;
    return uint64;
  }
  unpack_int8() {
    const uint8 = this.unpack_uint8();
    return uint8 < 128 ? uint8 : uint8 - 256;
  }
  unpack_int16() {
    const uint16 = this.unpack_uint16();
    return uint16 < 32768 ? uint16 : uint16 - 65536;
  }
  unpack_int32() {
    const uint32 = this.unpack_uint32();
    return uint32 < 2 ** 31 ? uint32 : uint32 - 2 ** 32;
  }
  unpack_int64() {
    const uint64 = this.unpack_uint64();
    return uint64 < 2 ** 63 ? uint64 : uint64 - 2 ** 64;
  }
  unpack_raw(size) {
    if (this.length < this.index + size) throw new Error(`BinaryPackFailure: index is out of range ${this.index} ${size} ${this.length}`);
    const buf = this.dataBuffer.slice(this.index, this.index + size);
    this.index += size;
    return buf;
  }
  unpack_string(size) {
    const bytes = this.read(size);
    let i = 0;
    let str = "";
    let c;
    let code;
    while (i < size) {
      c = bytes[i];
      if (c < 160) {
        code = c;
        i++;
      } else if ((c ^ 192) < 32) {
        code = (c & 31) << 6 | bytes[i + 1] & 63;
        i += 2;
      } else if ((c ^ 224) < 16) {
        code = (c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63;
        i += 3;
      } else {
        code = (c & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63;
        i += 4;
      }
      str += String.fromCodePoint(code);
    }
    this.index += size;
    return str;
  }
  unpack_array(size) {
    const objects = new Array(size);
    for (let i = 0; i < size; i++) objects[i] = this.unpack();
    return objects;
  }
  unpack_map(size) {
    const map = {};
    for (let i = 0; i < size; i++) {
      const key = this.unpack();
      map[key] = this.unpack();
    }
    return map;
  }
  unpack_float() {
    const uint32 = this.unpack_uint32();
    const sign = uint32 >> 31;
    const exp = (uint32 >> 23 & 255) - 127;
    const fraction = uint32 & 8388607 | 8388608;
    return (sign === 0 ? 1 : -1) * fraction * 2 ** (exp - 23);
  }
  unpack_double() {
    const h32 = this.unpack_uint32();
    const l32 = this.unpack_uint32();
    const sign = h32 >> 31;
    const exp = (h32 >> 20 & 2047) - 1023;
    const hfrac = h32 & 1048575 | 1048576;
    const frac = hfrac * 2 ** (exp - 20) + l32 * 2 ** (exp - 52);
    return (sign === 0 ? 1 : -1) * frac;
  }
  read(length) {
    const j = this.index;
    if (j + length <= this.length) return this.dataView.subarray(j, j + length);
    else throw new Error("BinaryPackFailure: read index out of range");
  }
}
class $0cfd7828ad59115f$export$b9ec4b114aa40074 {
  getBuffer() {
    return this._bufferBuilder.toArrayBuffer();
  }
  pack(value) {
    if (typeof value === "string") this.pack_string(value);
    else if (typeof value === "number") {
      if (Math.floor(value) === value) this.pack_integer(value);
      else this.pack_double(value);
    } else if (typeof value === "boolean") {
      if (value === true) this._bufferBuilder.append(195);
      else if (value === false) this._bufferBuilder.append(194);
    } else if (value === void 0) this._bufferBuilder.append(192);
    else if (typeof value === "object") {
      if (value === null) this._bufferBuilder.append(192);
      else {
        const constructor = value.constructor;
        if (value instanceof Array) {
          const res = this.pack_array(value);
          if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
        } else if (value instanceof ArrayBuffer) this.pack_bin(new Uint8Array(value));
        else if ("BYTES_PER_ELEMENT" in value) {
          const v = value;
          this.pack_bin(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
        } else if (value instanceof Date) this.pack_string(value.toString());
        else if (value instanceof Blob) return value.arrayBuffer().then((buffer) => {
          this.pack_bin(new Uint8Array(buffer));
          this._bufferBuilder.flush();
        });
        else if (constructor == Object || constructor.toString().startsWith("class")) {
          const res = this.pack_object(value);
          if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
        } else throw new Error(`Type "${constructor.toString()}" not yet supported`);
      }
    } else throw new Error(`Type "${typeof value}" not yet supported`);
    this._bufferBuilder.flush();
  }
  pack_bin(blob) {
    const length = blob.length;
    if (length <= 15) this.pack_uint8(160 + length);
    else if (length <= 65535) {
      this._bufferBuilder.append(218);
      this.pack_uint16(length);
    } else if (length <= 4294967295) {
      this._bufferBuilder.append(219);
      this.pack_uint32(length);
    } else throw new Error("Invalid length");
    this._bufferBuilder.append_buffer(blob);
  }
  pack_string(str) {
    const encoded = this._textEncoder.encode(str);
    const length = encoded.length;
    if (length <= 15) this.pack_uint8(176 + length);
    else if (length <= 65535) {
      this._bufferBuilder.append(216);
      this.pack_uint16(length);
    } else if (length <= 4294967295) {
      this._bufferBuilder.append(217);
      this.pack_uint32(length);
    } else throw new Error("Invalid length");
    this._bufferBuilder.append_buffer(encoded);
  }
  pack_array(ary) {
    const length = ary.length;
    if (length <= 15) this.pack_uint8(144 + length);
    else if (length <= 65535) {
      this._bufferBuilder.append(220);
      this.pack_uint16(length);
    } else if (length <= 4294967295) {
      this._bufferBuilder.append(221);
      this.pack_uint32(length);
    } else throw new Error("Invalid length");
    const packNext = (index) => {
      if (index < length) {
        const res = this.pack(ary[index]);
        if (res instanceof Promise) return res.then(() => packNext(index + 1));
        return packNext(index + 1);
      }
    };
    return packNext(0);
  }
  pack_integer(num) {
    if (num >= -32 && num <= 127) this._bufferBuilder.append(num & 255);
    else if (num >= 0 && num <= 255) {
      this._bufferBuilder.append(204);
      this.pack_uint8(num);
    } else if (num >= -128 && num <= 127) {
      this._bufferBuilder.append(208);
      this.pack_int8(num);
    } else if (num >= 0 && num <= 65535) {
      this._bufferBuilder.append(205);
      this.pack_uint16(num);
    } else if (num >= -32768 && num <= 32767) {
      this._bufferBuilder.append(209);
      this.pack_int16(num);
    } else if (num >= 0 && num <= 4294967295) {
      this._bufferBuilder.append(206);
      this.pack_uint32(num);
    } else if (num >= -2147483648 && num <= 2147483647) {
      this._bufferBuilder.append(210);
      this.pack_int32(num);
    } else if (num >= -9223372036854776e3 && num <= 9223372036854776e3) {
      this._bufferBuilder.append(211);
      this.pack_int64(num);
    } else if (num >= 0 && num <= 18446744073709552e3) {
      this._bufferBuilder.append(207);
      this.pack_uint64(num);
    } else throw new Error("Invalid integer");
  }
  pack_double(num) {
    let sign = 0;
    if (num < 0) {
      sign = 1;
      num = -num;
    }
    const exp = Math.floor(Math.log(num) / Math.LN2);
    const frac0 = num / 2 ** exp - 1;
    const frac1 = Math.floor(frac0 * 2 ** 52);
    const b32 = 2 ** 32;
    const h32 = sign << 31 | exp + 1023 << 20 | frac1 / b32 & 1048575;
    const l32 = frac1 % b32;
    this._bufferBuilder.append(203);
    this.pack_int32(h32);
    this.pack_int32(l32);
  }
  pack_object(obj) {
    const keys = Object.keys(obj);
    const length = keys.length;
    if (length <= 15) this.pack_uint8(128 + length);
    else if (length <= 65535) {
      this._bufferBuilder.append(222);
      this.pack_uint16(length);
    } else if (length <= 4294967295) {
      this._bufferBuilder.append(223);
      this.pack_uint32(length);
    } else throw new Error("Invalid length");
    const packNext = (index) => {
      if (index < keys.length) {
        const prop = keys[index];
        if (obj.hasOwnProperty(prop)) {
          this.pack(prop);
          const res = this.pack(obj[prop]);
          if (res instanceof Promise) return res.then(() => packNext(index + 1));
        }
        return packNext(index + 1);
      }
    };
    return packNext(0);
  }
  pack_uint8(num) {
    this._bufferBuilder.append(num);
  }
  pack_uint16(num) {
    this._bufferBuilder.append(num >> 8);
    this._bufferBuilder.append(num & 255);
  }
  pack_uint32(num) {
    const n = num & 4294967295;
    this._bufferBuilder.append((n & 4278190080) >>> 24);
    this._bufferBuilder.append((n & 16711680) >>> 16);
    this._bufferBuilder.append((n & 65280) >>> 8);
    this._bufferBuilder.append(n & 255);
  }
  pack_uint64(num) {
    const high = num / 2 ** 32;
    const low = num % 2 ** 32;
    this._bufferBuilder.append((high & 4278190080) >>> 24);
    this._bufferBuilder.append((high & 16711680) >>> 16);
    this._bufferBuilder.append((high & 65280) >>> 8);
    this._bufferBuilder.append(high & 255);
    this._bufferBuilder.append((low & 4278190080) >>> 24);
    this._bufferBuilder.append((low & 16711680) >>> 16);
    this._bufferBuilder.append((low & 65280) >>> 8);
    this._bufferBuilder.append(low & 255);
  }
  pack_int8(num) {
    this._bufferBuilder.append(num & 255);
  }
  pack_int16(num) {
    this._bufferBuilder.append((num & 65280) >> 8);
    this._bufferBuilder.append(num & 255);
  }
  pack_int32(num) {
    this._bufferBuilder.append(num >>> 24 & 255);
    this._bufferBuilder.append((num & 16711680) >>> 16);
    this._bufferBuilder.append((num & 65280) >>> 8);
    this._bufferBuilder.append(num & 255);
  }
  pack_int64(num) {
    const high = Math.floor(num / 2 ** 32);
    const low = num % 2 ** 32;
    this._bufferBuilder.append((high & 4278190080) >>> 24);
    this._bufferBuilder.append((high & 16711680) >>> 16);
    this._bufferBuilder.append((high & 65280) >>> 8);
    this._bufferBuilder.append(high & 255);
    this._bufferBuilder.append((low & 4278190080) >>> 24);
    this._bufferBuilder.append((low & 16711680) >>> 16);
    this._bufferBuilder.append((low & 65280) >>> 8);
    this._bufferBuilder.append(low & 255);
  }
  constructor() {
    this._bufferBuilder = new $e8379818650e2442$export$93654d4f2d6cd524();
    this._textEncoder = new TextEncoder();
  }
}
let logDisabled_ = true;
let deprecationWarnings_ = true;
function extractVersion(uastring, expr, pos) {
  const match = uastring.match(expr);
  return match && match.length >= pos && parseFloat(match[pos], 10);
}
function wrapPeerConnectionEvent(window2, eventNameToWrap, wrapper) {
  if (!window2.RTCPeerConnection) {
    return;
  }
  const addEventListener = Object.getOwnPropertyDescriptor(
    EventTarget.prototype,
    "addEventListener"
  );
  if (!addEventListener.writable) {
    log("Unable to polyfill events");
    return;
  }
  const proto = window2.RTCPeerConnection.prototype;
  const nativeAddEventListener = proto.addEventListener;
  proto.addEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap) {
      return nativeAddEventListener.apply(this, arguments);
    }
    const wrappedCallback = (e) => {
      const modifiedEvent = wrapper(e);
      if (modifiedEvent) {
        if (cb.handleEvent) {
          cb.handleEvent(modifiedEvent);
        } else {
          cb(modifiedEvent);
        }
      }
    };
    this._eventMap = this._eventMap || {};
    if (!this._eventMap[eventNameToWrap]) {
      this._eventMap[eventNameToWrap] = /* @__PURE__ */ new Map();
    }
    this._eventMap[eventNameToWrap].set(cb, wrappedCallback);
    return nativeAddEventListener.apply(this, [
      nativeEventName,
      wrappedCallback
    ]);
  };
  const nativeRemoveEventListener = proto.removeEventListener;
  proto.removeEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap || !this._eventMap || !this._eventMap[eventNameToWrap]) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    if (!this._eventMap[eventNameToWrap].has(cb)) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    const unwrappedCb = this._eventMap[eventNameToWrap].get(cb);
    this._eventMap[eventNameToWrap].delete(cb);
    if (this._eventMap[eventNameToWrap].size === 0) {
      delete this._eventMap[eventNameToWrap];
    }
    if (Object.keys(this._eventMap).length === 0) {
      delete this._eventMap;
    }
    return nativeRemoveEventListener.apply(this, [
      nativeEventName,
      unwrappedCb
    ]);
  };
  Object.defineProperty(proto, "on" + eventNameToWrap, {
    get() {
      return this["_on" + eventNameToWrap];
    },
    set(cb) {
      if (this["_on" + eventNameToWrap]) {
        this.removeEventListener(
          eventNameToWrap,
          this["_on" + eventNameToWrap]
        );
        delete this["_on" + eventNameToWrap];
      }
      if (cb) {
        this.addEventListener(
          eventNameToWrap,
          this["_on" + eventNameToWrap] = cb
        );
      }
    },
    enumerable: true,
    configurable: true
  });
}
function disableLog(bool) {
  if (typeof bool !== "boolean") {
    return new Error("Argument type: " + typeof bool + ". Please use a boolean.");
  }
  logDisabled_ = bool;
  return bool ? "adapter.js logging disabled" : "adapter.js logging enabled";
}
function disableWarnings(bool) {
  if (typeof bool !== "boolean") {
    return new Error("Argument type: " + typeof bool + ". Please use a boolean.");
  }
  deprecationWarnings_ = !bool;
  return "adapter.js deprecation warnings " + (bool ? "disabled" : "enabled");
}
function log() {
  if (typeof window === "object") {
    if (logDisabled_) {
      return;
    }
    if (typeof console !== "undefined" && typeof console.log === "function") {
      console.log.apply(console, arguments);
    }
  }
}
function deprecated(oldMethod, newMethod) {
  if (!deprecationWarnings_) {
    return;
  }
  console.warn(oldMethod + " is deprecated, please use " + newMethod + " instead.");
}
function detectBrowser(window2) {
  const result = { browser: null, version: null };
  if (typeof window2 === "undefined" || !window2.navigator || !window2.navigator.userAgent) {
    result.browser = "Not a browser.";
    return result;
  }
  const { navigator: navigator2 } = window2;
  if (navigator2.userAgentData && navigator2.userAgentData.brands) {
    const chromium = navigator2.userAgentData.brands.find((brand) => {
      return brand.brand === "Chromium";
    });
    if (chromium) {
      return { browser: "chrome", version: parseInt(chromium.version, 10) };
    }
  }
  if (navigator2.mozGetUserMedia) {
    result.browser = "firefox";
    result.version = parseInt(extractVersion(
      navigator2.userAgent,
      /Firefox\/(\d+)\./,
      1
    ));
  } else if (navigator2.webkitGetUserMedia || window2.isSecureContext === false && window2.webkitRTCPeerConnection) {
    result.browser = "chrome";
    result.version = parseInt(extractVersion(
      navigator2.userAgent,
      /Chrom(e|ium)\/(\d+)\./,
      2
    )) || null;
  } else if (window2.RTCPeerConnection && navigator2.userAgent.match(/AppleWebKit\/(\d+)\./)) {
    result.browser = "safari";
    result.version = parseInt(extractVersion(
      navigator2.userAgent,
      /AppleWebKit\/(\d+)\./,
      1
    ));
    result.supportsUnifiedPlan = window2.RTCRtpTransceiver && "currentDirection" in window2.RTCRtpTransceiver.prototype;
    result._safariVersion = extractVersion(
      navigator2.userAgent,
      /Version\/(\d+(\.?\d+))/,
      1
    );
  } else {
    result.browser = "Not a supported browser.";
    return result;
  }
  return result;
}
function isObject(val) {
  return Object.prototype.toString.call(val) === "[object Object]";
}
function compactObject(data) {
  if (!isObject(data)) {
    return data;
  }
  return Object.keys(data).reduce(function(accumulator, key) {
    const isObj = isObject(data[key]);
    const value = isObj ? compactObject(data[key]) : data[key];
    const isEmptyObject = isObj && !Object.keys(value).length;
    if (value === void 0 || isEmptyObject) {
      return accumulator;
    }
    return Object.assign(accumulator, { [key]: value });
  }, {});
}
function walkStats(stats, base, resultSet) {
  if (!base || resultSet.has(base.id)) {
    return;
  }
  resultSet.set(base.id, base);
  Object.keys(base).forEach((name) => {
    if (name.endsWith("Id")) {
      walkStats(stats, stats.get(base[name]), resultSet);
    } else if (name.endsWith("Ids")) {
      base[name].forEach((id) => {
        walkStats(stats, stats.get(id), resultSet);
      });
    }
  });
}
function filterStats(result, track, outbound) {
  const streamStatsType = outbound ? "outbound-rtp" : "inbound-rtp";
  const filteredResult = /* @__PURE__ */ new Map();
  if (track === null) {
    return filteredResult;
  }
  const trackStats = [];
  result.forEach((value) => {
    if (value.type === "track" && value.trackIdentifier === track.id) {
      trackStats.push(value);
    }
  });
  trackStats.forEach((trackStat) => {
    result.forEach((stats) => {
      if (stats.type === streamStatsType && stats.trackId === trackStat.id) {
        walkStats(result, stats, filteredResult);
      }
    });
  });
  return filteredResult;
}
const logging = log;
function shimGetUserMedia$2(window2, browserDetails) {
  const navigator2 = window2 && window2.navigator;
  if (!navigator2.mediaDevices) {
    return;
  }
  const constraintsToChrome_ = function(c) {
    if (typeof c !== "object" || c.mandatory || c.optional) {
      return c;
    }
    const cc = {};
    Object.keys(c).forEach((key) => {
      if (key === "require" || key === "advanced" || key === "mediaSource") {
        return;
      }
      const r = typeof c[key] === "object" ? c[key] : { ideal: c[key] };
      if (r.exact !== void 0 && typeof r.exact === "number") {
        r.min = r.max = r.exact;
      }
      const oldname_ = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return name === "deviceId" ? "sourceId" : name;
      };
      if (r.ideal !== void 0) {
        cc.optional = cc.optional || [];
        let oc = {};
        if (typeof r.ideal === "number") {
          oc[oldname_("min", key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_("max", key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_("", key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== void 0 && typeof r.exact !== "number") {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_("", key)] = r.exact;
      } else {
        ["min", "max"].forEach((mix) => {
          if (r[mix] !== void 0) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };
  const shimConstraints_ = function(constraints, func) {
    if (browserDetails.version >= 61) {
      return func(constraints);
    }
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && typeof constraints.audio === "object") {
      const remap = function(obj, a, b) {
        if (a in obj && !(b in obj)) {
          obj[b] = obj[a];
          delete obj[a];
        }
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      remap(constraints.audio, "autoGainControl", "googAutoGainControl");
      remap(constraints.audio, "noiseSuppression", "googNoiseSuppression");
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && typeof constraints.video === "object") {
      let face = constraints.video.facingMode;
      face = face && (typeof face === "object" ? face : { ideal: face });
      const getSupportedFacingModeLies = browserDetails.version < 66;
      if (face && (face.exact === "user" || face.exact === "environment" || face.ideal === "user" || face.ideal === "environment") && !(navigator2.mediaDevices.getSupportedConstraints && navigator2.mediaDevices.getSupportedConstraints().facingMode && !getSupportedFacingModeLies)) {
        delete constraints.video.facingMode;
        let matches;
        if (face.exact === "environment" || face.ideal === "environment") {
          matches = ["back", "rear"];
        } else if (face.exact === "user" || face.ideal === "user") {
          matches = ["front"];
        }
        if (matches) {
          return navigator2.mediaDevices.enumerateDevices().then((devices) => {
            devices = devices.filter((d) => d.kind === "videoinput");
            let dev = devices.find((d) => matches.some((match) => d.label.toLowerCase().includes(match)));
            if (!dev && devices.length && matches.includes("back")) {
              dev = devices[devices.length - 1];
            }
            if (dev) {
              constraints.video.deviceId = face.exact ? { exact: dev.deviceId } : { ideal: dev.deviceId };
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging("chrome: " + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging("chrome: " + JSON.stringify(constraints));
    return func(constraints);
  };
  const shimError_ = function(e) {
    if (browserDetails.version >= 64) {
      return e;
    }
    return {
      name: {
        PermissionDeniedError: "NotAllowedError",
        PermissionDismissedError: "NotAllowedError",
        InvalidStateError: "NotAllowedError",
        DevicesNotFoundError: "NotFoundError",
        ConstraintNotSatisfiedError: "OverconstrainedError",
        TrackStartError: "NotReadableError",
        MediaDeviceFailedDueToShutdown: "NotAllowedError",
        MediaDeviceKillSwitchOn: "NotAllowedError",
        TabCaptureError: "AbortError",
        ScreenCaptureError: "AbortError",
        DeviceCaptureError: "AbortError"
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraint || e.constraintName,
      toString() {
        return this.name + (this.message && ": ") + this.message;
      }
    };
  };
  const getUserMedia_ = function(constraints, onSuccess, onError) {
    shimConstraints_(constraints, (c) => {
      navigator2.webkitGetUserMedia(c, onSuccess, (e) => {
        if (onError) {
          onError(shimError_(e));
        }
      });
    });
  };
  navigator2.getUserMedia = getUserMedia_.bind(navigator2);
  if (navigator2.mediaDevices.getUserMedia) {
    const origGetUserMedia = navigator2.mediaDevices.getUserMedia.bind(navigator2.mediaDevices);
    navigator2.mediaDevices.getUserMedia = function(cs) {
      return shimConstraints_(cs, (c) => origGetUserMedia(c).then((stream) => {
        if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          throw new DOMException("", "NotFoundError");
        }
        return stream;
      }, (e) => Promise.reject(shimError_(e))));
    };
  }
}
function shimMediaStream(window2) {
  window2.MediaStream = window2.MediaStream || window2.webkitMediaStream;
}
function shimOnTrack$1(window2, browserDetails) {
  if (browserDetails.version > 102) {
    return;
  }
  if (typeof window2 === "object" && window2.RTCPeerConnection && !("ontrack" in window2.RTCPeerConnection.prototype)) {
    Object.defineProperty(window2.RTCPeerConnection.prototype, "ontrack", {
      get() {
        return this._ontrack;
      },
      set(f) {
        if (this._ontrack) {
          this.removeEventListener("track", this._ontrack);
        }
        this.addEventListener("track", this._ontrack = f);
      },
      enumerable: true,
      configurable: true
    });
    const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
    window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
      if (!this._ontrackpoly) {
        this._ontrackpoly = (e) => {
          e.stream.addEventListener("addtrack", (te) => {
            let receiver;
            if (window2.RTCPeerConnection.prototype.getReceivers) {
              receiver = this.getReceivers().find((r) => r.track && r.track.id === te.track.id);
            } else {
              receiver = { track: te.track };
            }
            const event = new Event("track");
            event.track = te.track;
            event.receiver = receiver;
            event.transceiver = { receiver };
            event.streams = [e.stream];
            this.dispatchEvent(event);
          });
          e.stream.getTracks().forEach((track) => {
            let receiver;
            if (window2.RTCPeerConnection.prototype.getReceivers) {
              receiver = this.getReceivers().find((r) => r.track && r.track.id === track.id);
            } else {
              receiver = { track };
            }
            const event = new Event("track");
            event.track = track;
            event.receiver = receiver;
            event.transceiver = { receiver };
            event.streams = [e.stream];
            this.dispatchEvent(event);
          });
        };
        this.addEventListener("addstream", this._ontrackpoly);
      }
      return origSetRemoteDescription.apply(this, arguments);
    };
  } else {
    wrapPeerConnectionEvent(window2, "track", (e) => {
      if (!e.transceiver) {
        Object.defineProperty(
          e,
          "transceiver",
          { value: { receiver: e.receiver } }
        );
      }
      return e;
    });
  }
}
function shimGetSendersWithDtmf(window2) {
  if (typeof window2 === "object" && window2.RTCPeerConnection && !("getSenders" in window2.RTCPeerConnection.prototype) && "createDTMFSender" in window2.RTCPeerConnection.prototype) {
    const shimSenderWithDtmf = function(pc, track) {
      return {
        track,
        get dtmf() {
          if (this._dtmf === void 0) {
            if (track.kind === "audio") {
              this._dtmf = pc.createDTMFSender(track);
            } else {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        },
        _pc: pc
      };
    };
    if (!window2.RTCPeerConnection.prototype.getSenders) {
      window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
        this._senders = this._senders || [];
        return this._senders.slice();
      };
      const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
      window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
        let sender = origAddTrack.apply(this, arguments);
        if (!sender) {
          sender = shimSenderWithDtmf(this, track);
          this._senders.push(sender);
        }
        return sender;
      };
      const origRemoveTrack = window2.RTCPeerConnection.prototype.removeTrack;
      window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
        origRemoveTrack.apply(this, arguments);
        const idx = this._senders.indexOf(sender);
        if (idx !== -1) {
          this._senders.splice(idx, 1);
        }
      };
    }
    const origAddStream = window2.RTCPeerConnection.prototype.addStream;
    window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      this._senders = this._senders || [];
      origAddStream.apply(this, [stream]);
      stream.getTracks().forEach((track) => {
        this._senders.push(shimSenderWithDtmf(this, track));
      });
    };
    const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
    window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      this._senders = this._senders || [];
      origRemoveStream.apply(this, [stream]);
      stream.getTracks().forEach((track) => {
        const sender = this._senders.find((s) => s.track === track);
        if (sender) {
          this._senders.splice(this._senders.indexOf(sender), 1);
        }
      });
    };
  } else if (typeof window2 === "object" && window2.RTCPeerConnection && "getSenders" in window2.RTCPeerConnection.prototype && "createDTMFSender" in window2.RTCPeerConnection.prototype && window2.RTCRtpSender && !("dtmf" in window2.RTCRtpSender.prototype)) {
    const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
    window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
      const senders = origGetSenders.apply(this, []);
      senders.forEach((sender) => sender._pc = this);
      return senders;
    };
    Object.defineProperty(window2.RTCRtpSender.prototype, "dtmf", {
      get() {
        if (this._dtmf === void 0) {
          if (this.track.kind === "audio") {
            this._dtmf = this._pc.createDTMFSender(this.track);
          } else {
            this._dtmf = null;
          }
        }
        return this._dtmf;
      }
    });
  }
}
function shimSenderReceiverGetStats(window2, browserDetails) {
  if (browserDetails.version >= 67) {
    return;
  }
  if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender && window2.RTCRtpReceiver)) {
    return;
  }
  if (!("getStats" in window2.RTCRtpSender.prototype)) {
    const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
    if (origGetSenders) {
      window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
        const senders = origGetSenders.apply(this, []);
        senders.forEach((sender) => sender._pc = this);
        return senders;
      };
    }
    const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
    if (origAddTrack) {
      window2.RTCPeerConnection.prototype.addTrack = function addTrack() {
        const sender = origAddTrack.apply(this, arguments);
        sender._pc = this;
        return sender;
      };
    }
    window2.RTCRtpSender.prototype.getStats = function getStats() {
      const sender = this;
      return this._pc.getStats().then((result) => (
        /* Note: this will include stats of all senders that
         *   send a track with the same id as sender.track as
         *   it is not possible to identify the RTCRtpSender.
         */
        filterStats(result, sender.track, true)
      ));
    };
  }
  if (!("getStats" in window2.RTCRtpReceiver.prototype)) {
    const origGetReceivers = window2.RTCPeerConnection.prototype.getReceivers;
    if (origGetReceivers) {
      window2.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
        const receivers = origGetReceivers.apply(this, []);
        receivers.forEach((receiver) => receiver._pc = this);
        return receivers;
      };
    }
    wrapPeerConnectionEvent(window2, "track", (e) => {
      e.receiver._pc = e.srcElement;
      return e;
    });
    window2.RTCRtpReceiver.prototype.getStats = function getStats() {
      const receiver = this;
      return this._pc.getStats().then((result) => filterStats(result, receiver.track, false));
    };
  }
  if (!("getStats" in window2.RTCRtpSender.prototype && "getStats" in window2.RTCRtpReceiver.prototype)) {
    return;
  }
  const origGetStats = window2.RTCPeerConnection.prototype.getStats;
  window2.RTCPeerConnection.prototype.getStats = function getStats() {
    if (arguments.length > 0 && arguments[0] instanceof window2.MediaStreamTrack) {
      const track = arguments[0];
      let sender;
      let receiver;
      let err;
      this.getSenders().forEach((s) => {
        if (s.track === track) {
          if (sender) {
            err = true;
          } else {
            sender = s;
          }
        }
      });
      this.getReceivers().forEach((r) => {
        if (r.track === track) {
          if (receiver) {
            err = true;
          } else {
            receiver = r;
          }
        }
        return r.track === track;
      });
      if (err || sender && receiver) {
        return Promise.reject(new DOMException(
          "There are more than one sender or receiver for the track.",
          "InvalidAccessError"
        ));
      } else if (sender) {
        return sender.getStats();
      } else if (receiver) {
        return receiver.getStats();
      }
      return Promise.reject(new DOMException(
        "There is no sender or receiver for the track.",
        "InvalidAccessError"
      ));
    }
    return origGetStats.apply(this, arguments);
  };
}
function shimAddTrackRemoveTrackWithNative(window2) {
  window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    return Object.keys(this._shimmedLocalStreams).map((streamId) => this._shimmedLocalStreams[streamId][0]);
  };
  const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
  window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
    if (!stream) {
      return origAddTrack.apply(this, arguments);
    }
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    const sender = origAddTrack.apply(this, arguments);
    if (!this._shimmedLocalStreams[stream.id]) {
      this._shimmedLocalStreams[stream.id] = [stream, sender];
    } else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) {
      this._shimmedLocalStreams[stream.id].push(sender);
    }
    return sender;
  };
  const origAddStream = window2.RTCPeerConnection.prototype.addStream;
  window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    stream.getTracks().forEach((track) => {
      const alreadyExists = this.getSenders().find((s) => s.track === track);
      if (alreadyExists) {
        throw new DOMException(
          "Track already exists.",
          "InvalidAccessError"
        );
      }
    });
    const existingSenders = this.getSenders();
    origAddStream.apply(this, arguments);
    const newSenders = this.getSenders().filter((newSender) => existingSenders.indexOf(newSender) === -1);
    this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
  };
  const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
  window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    delete this._shimmedLocalStreams[stream.id];
    return origRemoveStream.apply(this, arguments);
  };
  const origRemoveTrack = window2.RTCPeerConnection.prototype.removeTrack;
  window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    if (sender) {
      Object.keys(this._shimmedLocalStreams).forEach((streamId) => {
        const idx = this._shimmedLocalStreams[streamId].indexOf(sender);
        if (idx !== -1) {
          this._shimmedLocalStreams[streamId].splice(idx, 1);
        }
        if (this._shimmedLocalStreams[streamId].length === 1) {
          delete this._shimmedLocalStreams[streamId];
        }
      });
    }
    return origRemoveTrack.apply(this, arguments);
  };
}
function shimAddTrackRemoveTrack(window2, browserDetails) {
  if (!window2.RTCPeerConnection) {
    return;
  }
  if (window2.RTCPeerConnection.prototype.addTrack && browserDetails.version >= 65) {
    return shimAddTrackRemoveTrackWithNative(window2);
  }
  const origGetLocalStreams = window2.RTCPeerConnection.prototype.getLocalStreams;
  window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
    const nativeStreams = origGetLocalStreams.apply(this);
    this._reverseStreams = this._reverseStreams || {};
    return nativeStreams.map((stream) => this._reverseStreams[stream.id]);
  };
  const origAddStream = window2.RTCPeerConnection.prototype.addStream;
  window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};
    stream.getTracks().forEach((track) => {
      const alreadyExists = this.getSenders().find((s) => s.track === track);
      if (alreadyExists) {
        throw new DOMException(
          "Track already exists.",
          "InvalidAccessError"
        );
      }
    });
    if (!this._reverseStreams[stream.id]) {
      const newStream = new window2.MediaStream(stream.getTracks());
      this._streams[stream.id] = newStream;
      this._reverseStreams[newStream.id] = stream;
      stream = newStream;
    }
    origAddStream.apply(this, [stream]);
  };
  const origRemoveStream = window2.RTCPeerConnection.prototype.removeStream;
  window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};
    origRemoveStream.apply(this, [this._streams[stream.id] || stream]);
    delete this._reverseStreams[this._streams[stream.id] ? this._streams[stream.id].id : stream.id];
    delete this._streams[stream.id];
  };
  window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
    if (this.signalingState === "closed") {
      throw new DOMException(
        "The RTCPeerConnection's signalingState is 'closed'.",
        "InvalidStateError"
      );
    }
    const streams = [].slice.call(arguments, 1);
    if (streams.length !== 1 || !streams[0].getTracks().find((t) => t === track)) {
      throw new DOMException(
        "The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.",
        "NotSupportedError"
      );
    }
    const alreadyExists = this.getSenders().find((s) => s.track === track);
    if (alreadyExists) {
      throw new DOMException(
        "Track already exists.",
        "InvalidAccessError"
      );
    }
    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};
    const oldStream = this._streams[stream.id];
    if (oldStream) {
      oldStream.addTrack(track);
      Promise.resolve().then(() => {
        this.dispatchEvent(new Event("negotiationneeded"));
      });
    } else {
      const newStream = new window2.MediaStream([track]);
      this._streams[stream.id] = newStream;
      this._reverseStreams[newStream.id] = stream;
      this.addStream(newStream);
    }
    return this.getSenders().find((s) => s.track === track);
  };
  function replaceInternalStreamId(pc, description) {
    let sdp2 = description.sdp;
    Object.keys(pc._reverseStreams || []).forEach((internalId) => {
      const externalStream = pc._reverseStreams[internalId];
      const internalStream = pc._streams[externalStream.id];
      sdp2 = sdp2.replace(
        new RegExp(internalStream.id, "g"),
        externalStream.id
      );
    });
    return new RTCSessionDescription({
      type: description.type,
      sdp: sdp2
    });
  }
  function replaceExternalStreamId(pc, description) {
    let sdp2 = description.sdp;
    Object.keys(pc._reverseStreams || []).forEach((internalId) => {
      const externalStream = pc._reverseStreams[internalId];
      const internalStream = pc._streams[externalStream.id];
      sdp2 = sdp2.replace(
        new RegExp(externalStream.id, "g"),
        internalStream.id
      );
    });
    return new RTCSessionDescription({
      type: description.type,
      sdp: sdp2
    });
  }
  ["createOffer", "createAnswer"].forEach(function(method) {
    const nativeMethod = window2.RTCPeerConnection.prototype[method];
    const methodObj = { [method]() {
      const args = arguments;
      const isLegacyCall = arguments.length && typeof arguments[0] === "function";
      if (isLegacyCall) {
        return nativeMethod.apply(this, [
          (description) => {
            const desc = replaceInternalStreamId(this, description);
            args[0].apply(null, [desc]);
          },
          (err) => {
            if (args[1]) {
              args[1].apply(null, err);
            }
          },
          arguments[2]
        ]);
      }
      return nativeMethod.apply(this, arguments).then((description) => replaceInternalStreamId(this, description));
    } };
    window2.RTCPeerConnection.prototype[method] = methodObj[method];
  });
  const origSetLocalDescription = window2.RTCPeerConnection.prototype.setLocalDescription;
  window2.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
    if (!arguments.length || !arguments[0].type) {
      return origSetLocalDescription.apply(this, arguments);
    }
    arguments[0] = replaceExternalStreamId(this, arguments[0]);
    return origSetLocalDescription.apply(this, arguments);
  };
  const origLocalDescription = Object.getOwnPropertyDescriptor(
    window2.RTCPeerConnection.prototype,
    "localDescription"
  );
  Object.defineProperty(
    window2.RTCPeerConnection.prototype,
    "localDescription",
    {
      get() {
        const description = origLocalDescription.get.apply(this);
        if (description.type === "") {
          return description;
        }
        return replaceInternalStreamId(this, description);
      }
    }
  );
  window2.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    if (this.signalingState === "closed") {
      throw new DOMException(
        "The RTCPeerConnection's signalingState is 'closed'.",
        "InvalidStateError"
      );
    }
    if (!sender._pc) {
      throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.", "TypeError");
    }
    const isLocal = sender._pc === this;
    if (!isLocal) {
      throw new DOMException(
        "Sender was not created by this connection.",
        "InvalidAccessError"
      );
    }
    this._streams = this._streams || {};
    let stream;
    Object.keys(this._streams).forEach((streamid) => {
      const hasTrack = this._streams[streamid].getTracks().find((track) => sender.track === track);
      if (hasTrack) {
        stream = this._streams[streamid];
      }
    });
    if (stream) {
      if (stream.getTracks().length === 1) {
        this.removeStream(this._reverseStreams[stream.id]);
      } else {
        stream.removeTrack(sender.track);
      }
      this.dispatchEvent(new Event("negotiationneeded"));
    }
  };
}
function shimPeerConnection$1(window2, browserDetails) {
  if (!window2.RTCPeerConnection && window2.webkitRTCPeerConnection) {
    window2.RTCPeerConnection = window2.webkitRTCPeerConnection;
  }
  if (!window2.RTCPeerConnection) {
    return;
  }
  if (browserDetails.version < 53) {
    ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
      const nativeMethod = window2.RTCPeerConnection.prototype[method];
      const methodObj = { [method]() {
        arguments[0] = new (method === "addIceCandidate" ? window2.RTCIceCandidate : window2.RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      } };
      window2.RTCPeerConnection.prototype[method] = methodObj[method];
    });
  }
}
function fixNegotiationNeeded(window2, browserDetails) {
  if (browserDetails.version > 102) {
    return;
  }
  wrapPeerConnectionEvent(window2, "negotiationneeded", (e) => {
    const pc = e.target;
    if (browserDetails.version < 72 || pc.getConfiguration && pc.getConfiguration().sdpSemantics === "plan-b") {
      if (pc.signalingState !== "stable") {
        return;
      }
    }
    return e;
  });
}
const chromeShim = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  fixNegotiationNeeded,
  shimAddTrackRemoveTrack,
  shimAddTrackRemoveTrackWithNative,
  shimGetSendersWithDtmf,
  shimGetUserMedia: shimGetUserMedia$2,
  shimMediaStream,
  shimOnTrack: shimOnTrack$1,
  shimPeerConnection: shimPeerConnection$1,
  shimSenderReceiverGetStats
}, Symbol.toStringTag, { value: "Module" }));
function shimGetUserMedia$1(window2, browserDetails) {
  const navigator2 = window2 && window2.navigator;
  const MediaStreamTrack = window2 && window2.MediaStreamTrack;
  navigator2.getUserMedia = function(constraints, onSuccess, onError) {
    deprecated(
      "navigator.getUserMedia",
      "navigator.mediaDevices.getUserMedia"
    );
    navigator2.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  };
  if (!(browserDetails.version > 55 && "autoGainControl" in navigator2.mediaDevices.getSupportedConstraints())) {
    const remap = function(obj, a, b) {
      if (a in obj && !(b in obj)) {
        obj[b] = obj[a];
        delete obj[a];
      }
    };
    const nativeGetUserMedia = navigator2.mediaDevices.getUserMedia.bind(navigator2.mediaDevices);
    navigator2.mediaDevices.getUserMedia = function(c) {
      if (typeof c === "object" && typeof c.audio === "object") {
        c = JSON.parse(JSON.stringify(c));
        remap(c.audio, "autoGainControl", "mozAutoGainControl");
        remap(c.audio, "noiseSuppression", "mozNoiseSuppression");
      }
      return nativeGetUserMedia(c);
    };
    if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
      const nativeGetSettings = MediaStreamTrack.prototype.getSettings;
      MediaStreamTrack.prototype.getSettings = function() {
        const obj = nativeGetSettings.apply(this, arguments);
        remap(obj, "mozAutoGainControl", "autoGainControl");
        remap(obj, "mozNoiseSuppression", "noiseSuppression");
        return obj;
      };
    }
    if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
      const nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
      MediaStreamTrack.prototype.applyConstraints = function(c) {
        if (this.kind === "audio" && typeof c === "object") {
          c = JSON.parse(JSON.stringify(c));
          remap(c, "autoGainControl", "mozAutoGainControl");
          remap(c, "noiseSuppression", "mozNoiseSuppression");
        }
        return nativeApplyConstraints.apply(this, [c]);
      };
    }
  }
}
function shimGetDisplayMedia(window2, preferredMediaSource) {
  if (window2.navigator.mediaDevices && "getDisplayMedia" in window2.navigator.mediaDevices) {
    return;
  }
  if (!window2.navigator.mediaDevices) {
    return;
  }
  window2.navigator.mediaDevices.getDisplayMedia = function getDisplayMedia(constraints) {
    if (!(constraints && constraints.video)) {
      const err = new DOMException("getDisplayMedia without video constraints is undefined");
      err.name = "NotFoundError";
      err.code = 8;
      return Promise.reject(err);
    }
    if (constraints.video === true) {
      constraints.video = { mediaSource: preferredMediaSource };
    } else {
      constraints.video.mediaSource = preferredMediaSource;
    }
    return window2.navigator.mediaDevices.getUserMedia(constraints);
  };
}
function shimOnTrack(window2) {
  if (typeof window2 === "object" && window2.RTCTrackEvent && "receiver" in window2.RTCTrackEvent.prototype && !("transceiver" in window2.RTCTrackEvent.prototype)) {
    Object.defineProperty(window2.RTCTrackEvent.prototype, "transceiver", {
      get() {
        return { receiver: this.receiver };
      }
    });
  }
}
function shimPeerConnection(window2, browserDetails) {
  if (typeof window2 !== "object" || !(window2.RTCPeerConnection || window2.mozRTCPeerConnection)) {
    return;
  }
  if (!window2.RTCPeerConnection && window2.mozRTCPeerConnection) {
    window2.RTCPeerConnection = window2.mozRTCPeerConnection;
  }
  if (browserDetails.version < 53) {
    ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
      const nativeMethod = window2.RTCPeerConnection.prototype[method];
      const methodObj = { [method]() {
        arguments[0] = new (method === "addIceCandidate" ? window2.RTCIceCandidate : window2.RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      } };
      window2.RTCPeerConnection.prototype[method] = methodObj[method];
    });
  }
}
function shimGetStats(window2, browserDetails) {
  if (typeof window2 !== "object" || !(window2.RTCPeerConnection || window2.mozRTCPeerConnection)) {
    return;
  }
  if (browserDetails.version >= 151) {
    return;
  }
  const modernStatsTypes = {
    inboundrtp: "inbound-rtp",
    outboundrtp: "outbound-rtp",
    candidatepair: "candidate-pair",
    localcandidate: "local-candidate",
    remotecandidate: "remote-candidate"
  };
  const nativeGetStats = window2.RTCPeerConnection.prototype.getStats;
  window2.RTCPeerConnection.prototype.getStats = function getStats() {
    const [selector, onSucc, onErr] = arguments;
    if (this.signalingState === "closed") {
      return Promise.resolve(/* @__PURE__ */ new Map());
    }
    return nativeGetStats.apply(this, [selector || null]).then((stats) => {
      if (browserDetails.version < 53 && !onSucc) {
        try {
          stats.forEach((stat) => {
            stat.type = modernStatsTypes[stat.type] || stat.type;
          });
        } catch (e) {
          if (e.name !== "TypeError") {
            throw e;
          }
          stats.forEach((stat, i) => {
            stats.set(i, Object.assign({}, stat, {
              type: modernStatsTypes[stat.type] || stat.type
            }));
          });
        }
      }
      return stats;
    }).then(onSucc, onErr);
  };
}
function shimSenderGetStats(window2) {
  if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender)) {
    return;
  }
  if (window2.RTCRtpSender && "getStats" in window2.RTCRtpSender.prototype) {
    return;
  }
  const origGetSenders = window2.RTCPeerConnection.prototype.getSenders;
  if (origGetSenders) {
    window2.RTCPeerConnection.prototype.getSenders = function getSenders() {
      const senders = origGetSenders.apply(this, []);
      senders.forEach((sender) => sender._pc = this);
      return senders;
    };
  }
  const origAddTrack = window2.RTCPeerConnection.prototype.addTrack;
  if (origAddTrack) {
    window2.RTCPeerConnection.prototype.addTrack = function addTrack() {
      const sender = origAddTrack.apply(this, arguments);
      sender._pc = this;
      return sender;
    };
  }
  window2.RTCRtpSender.prototype.getStats = function getStats() {
    return this.track ? this._pc.getStats(this.track) : Promise.resolve(/* @__PURE__ */ new Map());
  };
}
function shimReceiverGetStats(window2) {
  if (!(typeof window2 === "object" && window2.RTCPeerConnection && window2.RTCRtpSender)) {
    return;
  }
  if (window2.RTCRtpSender && "getStats" in window2.RTCRtpReceiver.prototype) {
    return;
  }
  const origGetReceivers = window2.RTCPeerConnection.prototype.getReceivers;
  if (origGetReceivers) {
    window2.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
      const receivers = origGetReceivers.apply(this, []);
      receivers.forEach((receiver) => receiver._pc = this);
      return receivers;
    };
  }
  wrapPeerConnectionEvent(window2, "track", (e) => {
    e.receiver._pc = e.srcElement;
    return e;
  });
  window2.RTCRtpReceiver.prototype.getStats = function getStats() {
    return this._pc.getStats(this.track);
  };
}
function shimRemoveStream(window2) {
  if (!window2.RTCPeerConnection || "removeStream" in window2.RTCPeerConnection.prototype) {
    return;
  }
  window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    deprecated("removeStream", "removeTrack");
    this.getSenders().forEach((sender) => {
      if (sender.track && stream.getTracks().includes(sender.track)) {
        this.removeTrack(sender);
      }
    });
  };
}
function shimRTCDataChannel(window2) {
  if (window2.DataChannel && !window2.RTCDataChannel) {
    window2.RTCDataChannel = window2.DataChannel;
  }
}
function shimAddTransceiver(window2) {
  if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
    return;
  }
  const origAddTransceiver = window2.RTCPeerConnection.prototype.addTransceiver;
  if (origAddTransceiver) {
    window2.RTCPeerConnection.prototype.addTransceiver = function addTransceiver() {
      this.setParametersPromises = [];
      let sendEncodings = arguments[1] && arguments[1].sendEncodings;
      if (sendEncodings === void 0) {
        sendEncodings = [];
      }
      sendEncodings = [...sendEncodings];
      const shouldPerformCheck = sendEncodings.length > 0;
      if (shouldPerformCheck) {
        sendEncodings.forEach((encodingParam) => {
          if ("rid" in encodingParam) {
            const ridRegex = /^[a-z0-9]{0,16}$/i;
            if (!ridRegex.test(encodingParam.rid)) {
              throw new TypeError("Invalid RID value provided.");
            }
          }
          if ("scaleResolutionDownBy" in encodingParam) {
            if (!(parseFloat(encodingParam.scaleResolutionDownBy) >= 1)) {
              throw new RangeError("scale_resolution_down_by must be >= 1.0");
            }
          }
          if ("maxFramerate" in encodingParam) {
            if (!(parseFloat(encodingParam.maxFramerate) >= 0)) {
              throw new RangeError("max_framerate must be >= 0.0");
            }
          }
        });
      }
      const transceiver = origAddTransceiver.apply(this, arguments);
      if (shouldPerformCheck) {
        const { sender } = transceiver;
        const params = sender.getParameters();
        if (!("encodings" in params) || // Avoid being fooled by patched getParameters() below.
        params.encodings.length === 1 && Object.keys(params.encodings[0]).length === 0) {
          params.encodings = sendEncodings;
          sender.sendEncodings = sendEncodings;
          this.setParametersPromises.push(
            sender.setParameters(params).then(() => {
              delete sender.sendEncodings;
            }).catch(() => {
              delete sender.sendEncodings;
            })
          );
        }
      }
      return transceiver;
    };
  }
}
function shimGetParameters(window2) {
  if (!(typeof window2 === "object" && window2.RTCRtpSender)) {
    return;
  }
  const origGetParameters = window2.RTCRtpSender.prototype.getParameters;
  if (origGetParameters) {
    window2.RTCRtpSender.prototype.getParameters = function getParameters() {
      const params = origGetParameters.apply(this, arguments);
      if (!("encodings" in params)) {
        params.encodings = [].concat(this.sendEncodings || [{}]);
      }
      return params;
    };
  }
}
function shimCreateOffer(window2) {
  if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
    return;
  }
  const origCreateOffer = window2.RTCPeerConnection.prototype.createOffer;
  window2.RTCPeerConnection.prototype.createOffer = function createOffer() {
    if (this.setParametersPromises && this.setParametersPromises.length) {
      return Promise.all(this.setParametersPromises).then(() => {
        return origCreateOffer.apply(this, arguments);
      }).finally(() => {
        this.setParametersPromises = [];
      });
    }
    return origCreateOffer.apply(this, arguments);
  };
}
function shimCreateAnswer(window2) {
  if (!(typeof window2 === "object" && window2.RTCPeerConnection)) {
    return;
  }
  const origCreateAnswer = window2.RTCPeerConnection.prototype.createAnswer;
  window2.RTCPeerConnection.prototype.createAnswer = function createAnswer() {
    if (this.setParametersPromises && this.setParametersPromises.length) {
      return Promise.all(this.setParametersPromises).then(() => {
        return origCreateAnswer.apply(this, arguments);
      }).finally(() => {
        this.setParametersPromises = [];
      });
    }
    return origCreateAnswer.apply(this, arguments);
  };
}
const firefoxShim = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  shimAddTransceiver,
  shimCreateAnswer,
  shimCreateOffer,
  shimGetDisplayMedia,
  shimGetParameters,
  shimGetStats,
  shimGetUserMedia: shimGetUserMedia$1,
  shimOnTrack,
  shimPeerConnection,
  shimRTCDataChannel,
  shimReceiverGetStats,
  shimRemoveStream,
  shimSenderGetStats
}, Symbol.toStringTag, { value: "Module" }));
function shimLocalStreamsAPI(window2) {
  if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
    return;
  }
  if (!("getLocalStreams" in window2.RTCPeerConnection.prototype)) {
    window2.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
      if (!this._localStreams) {
        this._localStreams = [];
      }
      return this._localStreams;
    };
  }
  if (!("addStream" in window2.RTCPeerConnection.prototype)) {
    const _addTrack = window2.RTCPeerConnection.prototype.addTrack;
    window2.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      if (!this._localStreams) {
        this._localStreams = [];
      }
      if (!this._localStreams.includes(stream)) {
        this._localStreams.push(stream);
      }
      stream.getAudioTracks().forEach((track) => _addTrack.call(
        this,
        track,
        stream
      ));
      stream.getVideoTracks().forEach((track) => _addTrack.call(
        this,
        track,
        stream
      ));
    };
    window2.RTCPeerConnection.prototype.addTrack = function addTrack(track, ...streams) {
      if (streams) {
        streams.forEach((stream) => {
          if (!this._localStreams) {
            this._localStreams = [stream];
          } else if (!this._localStreams.includes(stream)) {
            this._localStreams.push(stream);
          }
        });
      }
      return _addTrack.apply(this, arguments);
    };
  }
  if (!("removeStream" in window2.RTCPeerConnection.prototype)) {
    window2.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      if (!this._localStreams) {
        this._localStreams = [];
      }
      const index = this._localStreams.indexOf(stream);
      if (index === -1) {
        return;
      }
      this._localStreams.splice(index, 1);
      const tracks = stream.getTracks();
      this.getSenders().forEach((sender) => {
        if (tracks.includes(sender.track)) {
          this.removeTrack(sender);
        }
      });
    };
  }
}
function shimRemoteStreamsAPI(window2) {
  if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
    return;
  }
  if (!("getRemoteStreams" in window2.RTCPeerConnection.prototype)) {
    window2.RTCPeerConnection.prototype.getRemoteStreams = function getRemoteStreams() {
      return this._remoteStreams ? this._remoteStreams : [];
    };
  }
  if (!("onaddstream" in window2.RTCPeerConnection.prototype)) {
    Object.defineProperty(window2.RTCPeerConnection.prototype, "onaddstream", {
      get() {
        return this._onaddstream;
      },
      set(f) {
        if (this._onaddstream) {
          this.removeEventListener("addstream", this._onaddstream);
          this.removeEventListener("track", this._onaddstreampoly);
        }
        this.addEventListener("addstream", this._onaddstream = f);
        this.addEventListener("track", this._onaddstreampoly = (e) => {
          e.streams.forEach((stream) => {
            if (!this._remoteStreams) {
              this._remoteStreams = [];
            }
            if (this._remoteStreams.includes(stream)) {
              return;
            }
            this._remoteStreams.push(stream);
            const event = new Event("addstream");
            event.stream = stream;
            this.dispatchEvent(event);
          });
        });
      }
    });
    const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
    window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
      const pc = this;
      if (!this._onaddstreampoly) {
        this.addEventListener("track", this._onaddstreampoly = function(e) {
          e.streams.forEach((stream) => {
            if (!pc._remoteStreams) {
              pc._remoteStreams = [];
            }
            if (pc._remoteStreams.indexOf(stream) >= 0) {
              return;
            }
            pc._remoteStreams.push(stream);
            const event = new Event("addstream");
            event.stream = stream;
            pc.dispatchEvent(event);
          });
        });
      }
      return origSetRemoteDescription.apply(pc, arguments);
    };
  }
}
function shimCallbacksAPI(window2) {
  if (typeof window2 !== "object" || !window2.RTCPeerConnection) {
    return;
  }
  const prototype = window2.RTCPeerConnection.prototype;
  const origCreateOffer = prototype.createOffer;
  const origCreateAnswer = prototype.createAnswer;
  const setLocalDescription = prototype.setLocalDescription;
  const setRemoteDescription = prototype.setRemoteDescription;
  const addIceCandidate = prototype.addIceCandidate;
  prototype.createOffer = function createOffer(successCallback, failureCallback) {
    const options = arguments.length >= 2 ? arguments[2] : arguments[0];
    const promise = origCreateOffer.apply(this, [options]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.createAnswer = function createAnswer(successCallback, failureCallback) {
    const options = arguments.length >= 2 ? arguments[2] : arguments[0];
    const promise = origCreateAnswer.apply(this, [options]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  let withCallback = function(description, successCallback, failureCallback) {
    const promise = setLocalDescription.apply(this, [description]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.setLocalDescription = withCallback;
  withCallback = function(description, successCallback, failureCallback) {
    const promise = setRemoteDescription.apply(this, [description]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.setRemoteDescription = withCallback;
  withCallback = function(candidate, successCallback, failureCallback) {
    const promise = addIceCandidate.apply(this, [candidate]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.addIceCandidate = withCallback;
}
function shimGetUserMedia(window2) {
  const navigator2 = window2 && window2.navigator;
  if (navigator2.mediaDevices && navigator2.mediaDevices.getUserMedia) {
    const mediaDevices = navigator2.mediaDevices;
    const _getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    navigator2.mediaDevices.getUserMedia = (constraints) => {
      return _getUserMedia(shimConstraints(constraints));
    };
  }
  if (!navigator2.getUserMedia && navigator2.mediaDevices && navigator2.mediaDevices.getUserMedia) {
    navigator2.getUserMedia = function getUserMedia(constraints, cb, errcb) {
      navigator2.mediaDevices.getUserMedia(constraints).then(cb, errcb);
    }.bind(navigator2);
  }
}
function shimConstraints(constraints) {
  if (constraints && constraints.video !== void 0) {
    return Object.assign(
      {},
      constraints,
      { video: compactObject(constraints.video) }
    );
  }
  return constraints;
}
function shimRTCIceServerUrls(window2) {
  if (!window2.RTCPeerConnection) {
    return;
  }
  const OrigPeerConnection = window2.RTCPeerConnection;
  window2.RTCPeerConnection = function RTCPeerConnection2(pcConfig, pcConstraints) {
    if (pcConfig && pcConfig.iceServers) {
      const newIceServers = [];
      for (let i = 0; i < pcConfig.iceServers.length; i++) {
        let server = pcConfig.iceServers[i];
        if (server.urls === void 0 && server.url) {
          deprecated("RTCIceServer.url", "RTCIceServer.urls");
          server = JSON.parse(JSON.stringify(server));
          server.urls = server.url;
          delete server.url;
          newIceServers.push(server);
        } else {
          newIceServers.push(pcConfig.iceServers[i]);
        }
      }
      pcConfig.iceServers = newIceServers;
    }
    return new OrigPeerConnection(pcConfig, pcConstraints);
  };
  window2.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
  if ("generateCertificate" in OrigPeerConnection) {
    Object.defineProperty(window2.RTCPeerConnection, "generateCertificate", {
      get() {
        return OrigPeerConnection.generateCertificate;
      }
    });
  }
}
function shimTrackEventTransceiver(window2) {
  if (typeof window2 === "object" && window2.RTCTrackEvent && "receiver" in window2.RTCTrackEvent.prototype && !("transceiver" in window2.RTCTrackEvent.prototype)) {
    Object.defineProperty(window2.RTCTrackEvent.prototype, "transceiver", {
      get() {
        return { receiver: this.receiver };
      }
    });
  }
}
function shimCreateOfferLegacy(window2) {
  const origCreateOffer = window2.RTCPeerConnection.prototype.createOffer;
  window2.RTCPeerConnection.prototype.createOffer = function createOffer(offerOptions) {
    if (offerOptions) {
      if (typeof offerOptions.offerToReceiveAudio !== "undefined") {
        offerOptions.offerToReceiveAudio = !!offerOptions.offerToReceiveAudio;
      }
      const audioTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "audio");
      if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
        if (audioTransceiver.direction === "sendrecv") {
          if (audioTransceiver.setDirection) {
            audioTransceiver.setDirection("sendonly");
          } else {
            audioTransceiver.direction = "sendonly";
          }
        } else if (audioTransceiver.direction === "recvonly") {
          if (audioTransceiver.setDirection) {
            audioTransceiver.setDirection("inactive");
          } else {
            audioTransceiver.direction = "inactive";
          }
        }
      } else if (offerOptions.offerToReceiveAudio === true && !audioTransceiver) {
        this.addTransceiver("audio", { direction: "recvonly" });
      }
      if (typeof offerOptions.offerToReceiveVideo !== "undefined") {
        offerOptions.offerToReceiveVideo = !!offerOptions.offerToReceiveVideo;
      }
      const videoTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video");
      if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
        if (videoTransceiver.direction === "sendrecv") {
          if (videoTransceiver.setDirection) {
            videoTransceiver.setDirection("sendonly");
          } else {
            videoTransceiver.direction = "sendonly";
          }
        } else if (videoTransceiver.direction === "recvonly") {
          if (videoTransceiver.setDirection) {
            videoTransceiver.setDirection("inactive");
          } else {
            videoTransceiver.direction = "inactive";
          }
        }
      } else if (offerOptions.offerToReceiveVideo === true && !videoTransceiver) {
        this.addTransceiver("video", { direction: "recvonly" });
      }
    }
    return origCreateOffer.apply(this, arguments);
  };
}
function shimAudioContext(window2) {
  if (typeof window2 !== "object" || window2.AudioContext) {
    return;
  }
  window2.AudioContext = window2.webkitAudioContext;
}
const safariShim = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  shimAudioContext,
  shimCallbacksAPI,
  shimConstraints,
  shimCreateOfferLegacy,
  shimGetUserMedia,
  shimLocalStreamsAPI,
  shimRTCIceServerUrls,
  shimRemoteStreamsAPI,
  shimTrackEventTransceiver
}, Symbol.toStringTag, { value: "Module" }));
var sdp$1 = { exports: {} };
var hasRequiredSdp;
function requireSdp() {
  if (hasRequiredSdp) return sdp$1.exports;
  hasRequiredSdp = 1;
  (function(module) {
    const SDPUtils2 = {};
    SDPUtils2.generateIdentifier = function() {
      return Math.random().toString(36).substring(2, 12);
    };
    SDPUtils2.localCName = SDPUtils2.generateIdentifier();
    SDPUtils2.splitLines = function(blob) {
      return blob.trim().split("\n").map((line) => line.trim());
    };
    SDPUtils2.splitSections = function(blob) {
      const parts = blob.split("\nm=");
      return parts.map((part, index) => (index > 0 ? "m=" + part : part).trim() + "\r\n");
    };
    SDPUtils2.getDescription = function(blob) {
      const sections = SDPUtils2.splitSections(blob);
      return sections && sections[0];
    };
    SDPUtils2.getMediaSections = function(blob) {
      const sections = SDPUtils2.splitSections(blob);
      sections.shift();
      return sections;
    };
    SDPUtils2.matchPrefix = function(blob, prefix) {
      return SDPUtils2.splitLines(blob).filter((line) => line.indexOf(prefix) === 0);
    };
    SDPUtils2.parseCandidate = function(line) {
      let parts;
      if (line.indexOf("a=candidate:") === 0) {
        parts = line.substring(12).split(" ");
      } else {
        parts = line.substring(10).split(" ");
      }
      const candidate = {
        foundation: parts[0],
        component: { 1: "rtp", 2: "rtcp" }[parts[1]] || parts[1],
        protocol: parts[2].toLowerCase(),
        priority: parseInt(parts[3], 10),
        ip: parts[4],
        address: parts[4],
        // address is an alias for ip.
        port: parseInt(parts[5], 10),
        // skip parts[6] == 'typ'
        type: parts[7]
      };
      for (let i = 8; i < parts.length; i += 2) {
        switch (parts[i]) {
          case "raddr":
            candidate.relatedAddress = parts[i + 1];
            break;
          case "rport":
            candidate.relatedPort = parseInt(parts[i + 1], 10);
            break;
          case "tcptype":
            candidate.tcpType = parts[i + 1];
            break;
          case "ufrag":
            candidate.ufrag = parts[i + 1];
            candidate.usernameFragment = parts[i + 1];
            break;
          default:
            if (candidate[parts[i]] === void 0) {
              candidate[parts[i]] = parts[i + 1];
            }
            break;
        }
      }
      return candidate;
    };
    SDPUtils2.writeCandidate = function(candidate) {
      const sdp2 = [];
      sdp2.push(candidate.foundation);
      const component = candidate.component;
      if (component === "rtp") {
        sdp2.push(1);
      } else if (component === "rtcp") {
        sdp2.push(2);
      } else {
        sdp2.push(component);
      }
      sdp2.push(candidate.protocol.toUpperCase());
      sdp2.push(candidate.priority);
      sdp2.push(candidate.address || candidate.ip);
      sdp2.push(candidate.port);
      const type = candidate.type;
      sdp2.push("typ");
      sdp2.push(type);
      if (type !== "host" && candidate.relatedAddress && candidate.relatedPort !== void 0) {
        sdp2.push("raddr");
        sdp2.push(candidate.relatedAddress);
        sdp2.push("rport");
        sdp2.push(candidate.relatedPort);
      }
      if (candidate.tcpType && candidate.protocol.toLowerCase() === "tcp") {
        sdp2.push("tcptype");
        sdp2.push(candidate.tcpType);
      }
      if (candidate.usernameFragment || candidate.ufrag) {
        sdp2.push("ufrag");
        sdp2.push(candidate.usernameFragment || candidate.ufrag);
      }
      return "candidate:" + sdp2.join(" ");
    };
    SDPUtils2.parseIceOptions = function(line) {
      return line.substring(14).split(" ");
    };
    SDPUtils2.parseRtpMap = function(line) {
      let parts = line.substring(9).split(" ");
      const parsed = {
        payloadType: parseInt(parts.shift(), 10)
        // was: id
      };
      parts = parts[0].split("/");
      parsed.name = parts[0];
      parsed.clockRate = parseInt(parts[1], 10);
      parsed.channels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
      parsed.numChannels = parsed.channels;
      return parsed;
    };
    SDPUtils2.writeRtpMap = function(codec) {
      let pt = codec.payloadType;
      if (codec.preferredPayloadType !== void 0) {
        pt = codec.preferredPayloadType;
      }
      const channels = codec.channels || codec.numChannels || 1;
      return "a=rtpmap:" + pt + " " + codec.name + "/" + codec.clockRate + (channels !== 1 ? "/" + channels : "") + "\r\n";
    };
    SDPUtils2.parseExtmap = function(line) {
      const parts = line.substring(9).split(" ");
      return {
        id: parseInt(parts[0], 10),
        direction: parts[0].indexOf("/") > 0 ? parts[0].split("/")[1] : "sendrecv",
        uri: parts[1],
        attributes: parts.slice(2).join(" ")
      };
    };
    SDPUtils2.writeExtmap = function(headerExtension) {
      return "a=extmap:" + (headerExtension.id || headerExtension.preferredId) + (headerExtension.direction && headerExtension.direction !== "sendrecv" ? "/" + headerExtension.direction : "") + " " + headerExtension.uri + (headerExtension.attributes ? " " + headerExtension.attributes : "") + "\r\n";
    };
    SDPUtils2.parseFmtp = function(line) {
      const parsed = {};
      let kv;
      const parts = line.substring(line.indexOf(" ") + 1).split(";");
      for (let j = 0; j < parts.length; j++) {
        kv = parts[j].trim().split("=");
        parsed[kv[0].trim()] = kv[1];
      }
      return parsed;
    };
    SDPUtils2.writeFmtp = function(codec) {
      let line = "";
      let pt = codec.payloadType;
      if (codec.preferredPayloadType !== void 0) {
        pt = codec.preferredPayloadType;
      }
      if (codec.parameters && Object.keys(codec.parameters).length) {
        const params = [];
        Object.keys(codec.parameters).forEach((param) => {
          if (codec.parameters[param] !== void 0) {
            params.push(param + "=" + codec.parameters[param]);
          } else {
            params.push(param);
          }
        });
        line += "a=fmtp:" + pt + " " + params.join(";") + "\r\n";
      }
      return line;
    };
    SDPUtils2.parseRtcpFb = function(line) {
      const parts = line.substring(line.indexOf(" ") + 1).split(" ");
      return {
        type: parts.shift(),
        parameter: parts.join(" ")
      };
    };
    SDPUtils2.writeRtcpFb = function(codec) {
      let lines = "";
      let pt = codec.payloadType;
      if (codec.preferredPayloadType !== void 0) {
        pt = codec.preferredPayloadType;
      }
      if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
        codec.rtcpFeedback.forEach((fb) => {
          lines += "a=rtcp-fb:" + pt + " " + fb.type + (fb.parameter && fb.parameter.length ? " " + fb.parameter : "") + "\r\n";
        });
      }
      return lines;
    };
    SDPUtils2.parseSsrcMedia = function(line) {
      const sp = line.indexOf(" ");
      const parts = {
        ssrc: parseInt(line.substring(7, sp), 10)
      };
      const colon = line.indexOf(":", sp);
      if (colon > -1) {
        parts.attribute = line.substring(sp + 1, colon);
        parts.value = line.substring(colon + 1);
      } else {
        parts.attribute = line.substring(sp + 1);
      }
      return parts;
    };
    SDPUtils2.parseSsrcGroup = function(line) {
      const parts = line.substring(13).split(" ");
      return {
        semantics: parts.shift(),
        ssrcs: parts.map((ssrc) => parseInt(ssrc, 10))
      };
    };
    SDPUtils2.getMid = function(mediaSection) {
      const mid = SDPUtils2.matchPrefix(mediaSection, "a=mid:")[0];
      if (mid) {
        return mid.substring(6);
      }
    };
    SDPUtils2.parseFingerprint = function(line) {
      const parts = line.substring(14).split(" ");
      return {
        algorithm: parts[0].toLowerCase(),
        // algorithm is case-sensitive in Edge.
        value: parts[1].toUpperCase()
        // the definition is upper-case in RFC 4572.
      };
    };
    SDPUtils2.getDtlsParameters = function(mediaSection, sessionpart) {
      const lines = SDPUtils2.matchPrefix(
        mediaSection + sessionpart,
        "a=fingerprint:"
      );
      return {
        role: "auto",
        fingerprints: lines.map(SDPUtils2.parseFingerprint)
      };
    };
    SDPUtils2.writeDtlsParameters = function(params, setupType) {
      let sdp2 = "a=setup:" + setupType + "\r\n";
      params.fingerprints.forEach((fp) => {
        sdp2 += "a=fingerprint:" + fp.algorithm + " " + fp.value + "\r\n";
      });
      return sdp2;
    };
    SDPUtils2.parseCryptoLine = function(line) {
      const parts = line.substring(9).split(" ");
      return {
        tag: parseInt(parts[0], 10),
        cryptoSuite: parts[1],
        keyParams: parts[2],
        sessionParams: parts.slice(3)
      };
    };
    SDPUtils2.writeCryptoLine = function(parameters) {
      return "a=crypto:" + parameters.tag + " " + parameters.cryptoSuite + " " + (typeof parameters.keyParams === "object" ? SDPUtils2.writeCryptoKeyParams(parameters.keyParams) : parameters.keyParams) + (parameters.sessionParams ? " " + parameters.sessionParams.join(" ") : "") + "\r\n";
    };
    SDPUtils2.parseCryptoKeyParams = function(keyParams) {
      if (keyParams.indexOf("inline:") !== 0) {
        return null;
      }
      const parts = keyParams.substring(7).split("|");
      return {
        keyMethod: "inline",
        keySalt: parts[0],
        lifeTime: parts[1],
        mkiValue: parts[2] ? parts[2].split(":")[0] : void 0,
        mkiLength: parts[2] ? parts[2].split(":")[1] : void 0
      };
    };
    SDPUtils2.writeCryptoKeyParams = function(keyParams) {
      return keyParams.keyMethod + ":" + keyParams.keySalt + (keyParams.lifeTime ? "|" + keyParams.lifeTime : "") + (keyParams.mkiValue && keyParams.mkiLength ? "|" + keyParams.mkiValue + ":" + keyParams.mkiLength : "");
    };
    SDPUtils2.getCryptoParameters = function(mediaSection, sessionpart) {
      const lines = SDPUtils2.matchPrefix(
        mediaSection + sessionpart,
        "a=crypto:"
      );
      return lines.map(SDPUtils2.parseCryptoLine);
    };
    SDPUtils2.getIceParameters = function(mediaSection, sessionpart) {
      const ufrag = SDPUtils2.matchPrefix(
        mediaSection + sessionpart,
        "a=ice-ufrag:"
      )[0];
      const pwd = SDPUtils2.matchPrefix(
        mediaSection + sessionpart,
        "a=ice-pwd:"
      )[0];
      if (!(ufrag && pwd)) {
        return null;
      }
      return {
        usernameFragment: ufrag.substring(12),
        password: pwd.substring(10)
      };
    };
    SDPUtils2.writeIceParameters = function(params) {
      let sdp2 = "a=ice-ufrag:" + params.usernameFragment + "\r\na=ice-pwd:" + params.password + "\r\n";
      if (params.iceLite) {
        sdp2 += "a=ice-lite\r\n";
      }
      return sdp2;
    };
    SDPUtils2.parseRtpParameters = function(mediaSection) {
      const description = {
        codecs: [],
        headerExtensions: [],
        fecMechanisms: [],
        rtcp: []
      };
      const lines = SDPUtils2.splitLines(mediaSection);
      const mline = lines[0].split(" ");
      description.profile = mline[2];
      for (let i = 3; i < mline.length; i++) {
        const pt = mline[i];
        const rtpmapline = SDPUtils2.matchPrefix(
          mediaSection,
          "a=rtpmap:" + pt + " "
        )[0];
        if (rtpmapline) {
          const codec = SDPUtils2.parseRtpMap(rtpmapline);
          const fmtps = SDPUtils2.matchPrefix(
            mediaSection,
            "a=fmtp:" + pt + " "
          );
          codec.parameters = fmtps.length ? SDPUtils2.parseFmtp(fmtps[0]) : {};
          codec.rtcpFeedback = SDPUtils2.matchPrefix(
            mediaSection,
            "a=rtcp-fb:" + pt + " "
          ).map(SDPUtils2.parseRtcpFb);
          description.codecs.push(codec);
          switch (codec.name.toUpperCase()) {
            case "RED":
            case "ULPFEC":
              description.fecMechanisms.push(codec.name.toUpperCase());
              break;
          }
        }
      }
      SDPUtils2.matchPrefix(mediaSection, "a=extmap:").forEach((line) => {
        description.headerExtensions.push(SDPUtils2.parseExtmap(line));
      });
      const wildcardRtcpFb = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-fb:* ").map(SDPUtils2.parseRtcpFb);
      description.codecs.forEach((codec) => {
        wildcardRtcpFb.forEach((fb) => {
          const duplicate = codec.rtcpFeedback.find((existingFeedback) => {
            return existingFeedback.type === fb.type && existingFeedback.parameter === fb.parameter;
          });
          if (!duplicate) {
            codec.rtcpFeedback.push(fb);
          }
        });
      });
      return description;
    };
    SDPUtils2.writeRtpDescription = function(kind, caps) {
      let sdp2 = "";
      sdp2 += "m=" + kind + " ";
      sdp2 += caps.codecs.length > 0 ? "9" : "0";
      sdp2 += " " + (caps.profile || "UDP/TLS/RTP/SAVPF") + " ";
      sdp2 += caps.codecs.map((codec) => {
        if (codec.preferredPayloadType !== void 0) {
          return codec.preferredPayloadType;
        }
        return codec.payloadType;
      }).join(" ") + "\r\n";
      sdp2 += "c=IN IP4 0.0.0.0\r\n";
      sdp2 += "a=rtcp:9 IN IP4 0.0.0.0\r\n";
      caps.codecs.forEach((codec) => {
        sdp2 += SDPUtils2.writeRtpMap(codec);
        sdp2 += SDPUtils2.writeFmtp(codec);
        sdp2 += SDPUtils2.writeRtcpFb(codec);
      });
      let maxptime = 0;
      caps.codecs.forEach((codec) => {
        if (codec.maxptime > maxptime) {
          maxptime = codec.maxptime;
        }
      });
      if (maxptime > 0) {
        sdp2 += "a=maxptime:" + maxptime + "\r\n";
      }
      if (caps.headerExtensions) {
        caps.headerExtensions.forEach((extension) => {
          sdp2 += SDPUtils2.writeExtmap(extension);
        });
      }
      return sdp2;
    };
    SDPUtils2.parseRtpEncodingParameters = function(mediaSection) {
      const encodingParameters = [];
      const description = SDPUtils2.parseRtpParameters(mediaSection);
      const hasRed = description.fecMechanisms.indexOf("RED") !== -1;
      const hasUlpfec = description.fecMechanisms.indexOf("ULPFEC") !== -1;
      const ssrcs = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((parts) => parts.attribute === "cname");
      const primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
      let secondarySsrc;
      const flows = SDPUtils2.matchPrefix(mediaSection, "a=ssrc-group:FID").map((line) => {
        const parts = line.substring(17).split(" ");
        return parts.map((part) => parseInt(part, 10));
      });
      if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
        secondarySsrc = flows[0][1];
      }
      description.codecs.forEach((codec) => {
        if (codec.name.toUpperCase() === "RTX" && codec.parameters.apt) {
          let encParam = {
            ssrc: primarySsrc,
            codecPayloadType: parseInt(codec.parameters.apt, 10)
          };
          if (primarySsrc && secondarySsrc) {
            encParam.rtx = { ssrc: secondarySsrc };
          }
          encodingParameters.push(encParam);
          if (hasRed) {
            encParam = JSON.parse(JSON.stringify(encParam));
            encParam.fec = {
              ssrc: primarySsrc,
              mechanism: hasUlpfec ? "red+ulpfec" : "red"
            };
            encodingParameters.push(encParam);
          }
        }
      });
      if (encodingParameters.length === 0 && primarySsrc) {
        encodingParameters.push({
          ssrc: primarySsrc
        });
      }
      let bandwidth = SDPUtils2.matchPrefix(mediaSection, "b=");
      if (bandwidth.length) {
        if (bandwidth[0].indexOf("b=TIAS:") === 0) {
          bandwidth = parseInt(bandwidth[0].substring(7), 10);
        } else if (bandwidth[0].indexOf("b=AS:") === 0) {
          bandwidth = parseInt(bandwidth[0].substring(5), 10) * 1e3 * 0.95 - 50 * 40 * 8;
        } else {
          bandwidth = void 0;
        }
        encodingParameters.forEach((params) => {
          params.maxBitrate = bandwidth;
        });
      }
      return encodingParameters;
    };
    SDPUtils2.parseRtcpParameters = function(mediaSection) {
      const rtcpParameters = {};
      const remoteSsrc = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((obj) => obj.attribute === "cname")[0];
      if (remoteSsrc) {
        rtcpParameters.cname = remoteSsrc.value;
        rtcpParameters.ssrc = remoteSsrc.ssrc;
      }
      const rsize = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-rsize");
      rtcpParameters.reducedSize = rsize.length > 0;
      rtcpParameters.compound = rsize.length === 0;
      const mux = SDPUtils2.matchPrefix(mediaSection, "a=rtcp-mux");
      rtcpParameters.mux = mux.length > 0;
      return rtcpParameters;
    };
    SDPUtils2.writeRtcpParameters = function(rtcpParameters) {
      let sdp2 = "";
      if (rtcpParameters.reducedSize) {
        sdp2 += "a=rtcp-rsize\r\n";
      }
      if (rtcpParameters.mux) {
        sdp2 += "a=rtcp-mux\r\n";
      }
      if (rtcpParameters.ssrc !== void 0 && rtcpParameters.cname) {
        sdp2 += "a=ssrc:" + rtcpParameters.ssrc + " cname:" + rtcpParameters.cname + "\r\n";
      }
      return sdp2;
    };
    SDPUtils2.parseMsid = function(mediaSection) {
      let parts;
      const spec = SDPUtils2.matchPrefix(mediaSection, "a=msid:");
      if (spec.length === 1) {
        parts = spec[0].substring(7).split(" ");
        return { stream: parts[0], track: parts[1] };
      }
      const planB = SDPUtils2.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils2.parseSsrcMedia(line)).filter((msidParts) => msidParts.attribute === "msid");
      if (planB.length > 0) {
        parts = planB[0].value.split(" ");
        return { stream: parts[0], track: parts[1] };
      }
    };
    SDPUtils2.parseSctpDescription = function(mediaSection) {
      const mline = SDPUtils2.parseMLine(mediaSection);
      const maxSizeLine = SDPUtils2.matchPrefix(mediaSection, "a=max-message-size:");
      let maxMessageSize;
      if (maxSizeLine.length > 0) {
        maxMessageSize = parseInt(maxSizeLine[0].substring(19), 10);
      }
      if (isNaN(maxMessageSize)) {
        maxMessageSize = 65536;
      }
      const sctpPort = SDPUtils2.matchPrefix(mediaSection, "a=sctp-port:");
      if (sctpPort.length > 0) {
        return {
          port: parseInt(sctpPort[0].substring(12), 10),
          protocol: mline.fmt,
          maxMessageSize
        };
      }
      const sctpMapLines = SDPUtils2.matchPrefix(mediaSection, "a=sctpmap:");
      if (sctpMapLines.length > 0) {
        const parts = sctpMapLines[0].substring(10).split(" ");
        return {
          port: parseInt(parts[0], 10),
          protocol: parts[1],
          maxMessageSize
        };
      }
    };
    SDPUtils2.writeSctpDescription = function(media, sctp) {
      let output = [];
      if (media.protocol !== "DTLS/SCTP") {
        output = [
          "m=" + media.kind + " 9 " + media.protocol + " " + sctp.protocol + "\r\n",
          "c=IN IP4 0.0.0.0\r\n",
          "a=sctp-port:" + sctp.port + "\r\n"
        ];
      } else {
        output = [
          "m=" + media.kind + " 9 " + media.protocol + " " + sctp.port + "\r\n",
          "c=IN IP4 0.0.0.0\r\n",
          "a=sctpmap:" + sctp.port + " " + sctp.protocol + " 65535\r\n"
        ];
      }
      if (sctp.maxMessageSize !== void 0) {
        output.push("a=max-message-size:" + sctp.maxMessageSize + "\r\n");
      }
      return output.join("");
    };
    SDPUtils2.generateSessionId = function() {
      return Math.random().toString().substr(2, 22);
    };
    SDPUtils2.writeSessionBoilerplate = function(sessId, sessVer, sessUser) {
      let sessionId;
      const version = sessVer !== void 0 ? sessVer : 2;
      if (sessId) {
        sessionId = sessId;
      } else {
        sessionId = SDPUtils2.generateSessionId();
      }
      const user = sessUser || "thisisadapterortc";
      return "v=0\r\no=" + user + " " + sessionId + " " + version + " IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";
    };
    SDPUtils2.getDirection = function(mediaSection, sessionpart) {
      const lines = SDPUtils2.splitLines(mediaSection);
      for (let i = 0; i < lines.length; i++) {
        switch (lines[i]) {
          case "a=sendrecv":
          case "a=sendonly":
          case "a=recvonly":
          case "a=inactive":
            return lines[i].substring(2);
        }
      }
      if (sessionpart) {
        return SDPUtils2.getDirection(sessionpart);
      }
      return "sendrecv";
    };
    SDPUtils2.getKind = function(mediaSection) {
      const lines = SDPUtils2.splitLines(mediaSection);
      const mline = lines[0].split(" ");
      return mline[0].substring(2);
    };
    SDPUtils2.isRejected = function(mediaSection) {
      return mediaSection.split(" ", 2)[1] === "0";
    };
    SDPUtils2.parseMLine = function(mediaSection) {
      const lines = SDPUtils2.splitLines(mediaSection);
      const parts = lines[0].substring(2).split(" ");
      return {
        kind: parts[0],
        port: parseInt(parts[1], 10),
        protocol: parts[2],
        fmt: parts.slice(3).join(" ")
      };
    };
    SDPUtils2.parseOLine = function(mediaSection) {
      const line = SDPUtils2.matchPrefix(mediaSection, "o=")[0];
      const parts = line.substring(2).split(" ");
      return {
        username: parts[0],
        sessionId: parts[1],
        sessionVersion: parseInt(parts[2], 10),
        netType: parts[3],
        addressType: parts[4],
        address: parts[5]
      };
    };
    SDPUtils2.isValidSDP = function(blob) {
      if (typeof blob !== "string" || blob.length === 0) {
        return false;
      }
      const lines = SDPUtils2.splitLines(blob);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length < 2 || lines[i].charAt(1) !== "=") {
          return false;
        }
      }
      return true;
    };
    {
      module.exports = SDPUtils2;
    }
  })(sdp$1);
  return sdp$1.exports;
}
var sdpExports = requireSdp();
const SDPUtils = /* @__PURE__ */ getDefaultExportFromCjs(sdpExports);
const sdp = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: SDPUtils
}, [sdpExports]);
function shimRTCIceCandidate(window2) {
  if (!window2.RTCIceCandidate || window2.RTCIceCandidate && "foundation" in window2.RTCIceCandidate.prototype) {
    return;
  }
  const NativeRTCIceCandidate = window2.RTCIceCandidate;
  window2.RTCIceCandidate = function RTCIceCandidate(args) {
    if (typeof args === "object" && args.candidate && args.candidate.indexOf("a=") === 0) {
      args = JSON.parse(JSON.stringify(args));
      args.candidate = args.candidate.substring(2);
    }
    if (args.candidate && args.candidate.length) {
      const nativeCandidate = new NativeRTCIceCandidate(args);
      const parsedCandidate = SDPUtils.parseCandidate(args.candidate);
      for (const key in parsedCandidate) {
        if (!(key in nativeCandidate)) {
          Object.defineProperty(
            nativeCandidate,
            key,
            { value: parsedCandidate[key] }
          );
        }
      }
      nativeCandidate.toJSON = function toJSON() {
        return {
          candidate: nativeCandidate.candidate,
          sdpMid: nativeCandidate.sdpMid,
          sdpMLineIndex: nativeCandidate.sdpMLineIndex,
          usernameFragment: nativeCandidate.usernameFragment
        };
      };
      return nativeCandidate;
    }
    return new NativeRTCIceCandidate(args);
  };
  window2.RTCIceCandidate.prototype = NativeRTCIceCandidate.prototype;
  wrapPeerConnectionEvent(window2, "icecandidate", (e) => {
    if (e.candidate) {
      Object.defineProperty(e, "candidate", {
        value: new window2.RTCIceCandidate(e.candidate),
        writable: "false"
      });
    }
    return e;
  });
}
function shimRTCIceCandidateRelayProtocol(window2) {
  if (!window2.RTCIceCandidate || window2.RTCIceCandidate && "relayProtocol" in window2.RTCIceCandidate.prototype) {
    return;
  }
  wrapPeerConnectionEvent(window2, "icecandidate", (e) => {
    if (e.candidate) {
      const parsedCandidate = SDPUtils.parseCandidate(e.candidate.candidate);
      if (parsedCandidate.type === "relay") {
        e.candidate.relayProtocol = {
          0: "tls",
          1: "tcp",
          2: "udp"
        }[parsedCandidate.priority >> 24];
      }
    }
    return e;
  });
}
function shimMaxMessageSize(window2, browserDetails) {
  if (!window2.RTCPeerConnection) {
    return;
  }
  if (!("sctp" in window2.RTCPeerConnection.prototype)) {
    Object.defineProperty(window2.RTCPeerConnection.prototype, "sctp", {
      get() {
        return typeof this._sctp === "undefined" ? null : this._sctp;
      }
    });
  }
  const sctpInDescription = function(description) {
    if (!description || !description.sdp) {
      return false;
    }
    const sections = SDPUtils.splitSections(description.sdp);
    sections.shift();
    return sections.some((mediaSection) => {
      const mLine = SDPUtils.parseMLine(mediaSection);
      return mLine && mLine.kind === "application" && mLine.protocol.indexOf("SCTP") !== -1;
    });
  };
  const getRemoteFirefoxVersion = function(description) {
    const match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
    if (match === null || match.length < 2) {
      return -1;
    }
    const version = parseInt(match[1], 10);
    return version !== version ? -1 : version;
  };
  const getCanSendMaxMessageSize = function(remoteIsFirefox) {
    let canSendMaxMessageSize = 65536;
    if (browserDetails.browser === "firefox") {
      if (browserDetails.version < 57) {
        if (remoteIsFirefox === -1) {
          canSendMaxMessageSize = 16384;
        } else {
          canSendMaxMessageSize = 2147483637;
        }
      } else if (browserDetails.version < 60) {
        canSendMaxMessageSize = browserDetails.version === 57 ? 65535 : 65536;
      } else {
        canSendMaxMessageSize = 2147483637;
      }
    }
    return canSendMaxMessageSize;
  };
  const getMaxMessageSize = function(description, remoteIsFirefox) {
    let maxMessageSize = 65536;
    if (browserDetails.browser === "firefox" && browserDetails.version === 57) {
      maxMessageSize = 65535;
    }
    const match = SDPUtils.matchPrefix(
      description.sdp,
      "a=max-message-size:"
    );
    if (match.length > 0) {
      maxMessageSize = parseInt(match[0].substring(19), 10);
    } else if (browserDetails.browser === "firefox" && remoteIsFirefox !== -1) {
      maxMessageSize = 2147483637;
    }
    return maxMessageSize;
  };
  const origSetRemoteDescription = window2.RTCPeerConnection.prototype.setRemoteDescription;
  window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
    this._sctp = null;
    if (browserDetails.browser === "chrome" && browserDetails.version >= 76) {
      const { sdpSemantics } = this.getConfiguration();
      if (sdpSemantics === "plan-b") {
        Object.defineProperty(this, "sctp", {
          get() {
            return typeof this._sctp === "undefined" ? null : this._sctp;
          },
          enumerable: true,
          configurable: true
        });
      }
    }
    if (sctpInDescription(arguments[0])) {
      const isFirefox = getRemoteFirefoxVersion(arguments[0]);
      const canSendMMS = getCanSendMaxMessageSize(isFirefox);
      const remoteMMS = getMaxMessageSize(arguments[0], isFirefox);
      let maxMessageSize;
      if (canSendMMS === 0 && remoteMMS === 0) {
        maxMessageSize = Number.POSITIVE_INFINITY;
      } else if (canSendMMS === 0 || remoteMMS === 0) {
        maxMessageSize = Math.max(canSendMMS, remoteMMS);
      } else {
        maxMessageSize = Math.min(canSendMMS, remoteMMS);
      }
      const sctp = {};
      Object.defineProperty(sctp, "maxMessageSize", {
        get() {
          return maxMessageSize;
        }
      });
      this._sctp = sctp;
    }
    return origSetRemoteDescription.apply(this, arguments);
  };
}
function shimSendThrowTypeError(window2, browserDetails) {
  if (!(window2.RTCPeerConnection && "createDataChannel" in window2.RTCPeerConnection.prototype)) {
    return;
  }
  if (browserDetails.browser === "chrome" && browserDetails.version > 149) {
    return;
  }
  if (browserDetails.browser === "firefox" && browserDetails.version > 60) {
    return;
  }
  function wrapDcSend(dc, pc) {
    const origDataChannelSend = dc.send;
    dc.send = function send() {
      const data = arguments[0];
      const length = data.length || data.size || data.byteLength;
      if (dc.readyState === "open" && pc.sctp && length > pc.sctp.maxMessageSize) {
        throw new TypeError("Message too large (can send a maximum of " + pc.sctp.maxMessageSize + " bytes)");
      }
      return origDataChannelSend.apply(dc, arguments);
    };
  }
  const origCreateDataChannel = window2.RTCPeerConnection.prototype.createDataChannel;
  window2.RTCPeerConnection.prototype.createDataChannel = function createDataChannel() {
    const dataChannel = origCreateDataChannel.apply(this, arguments);
    wrapDcSend(dataChannel, this);
    return dataChannel;
  };
  wrapPeerConnectionEvent(window2, "datachannel", (e) => {
    wrapDcSend(e.channel, e.target);
    return e;
  });
}
function shimConnectionState(window2) {
  if (!window2.RTCPeerConnection || "connectionState" in window2.RTCPeerConnection.prototype) {
    return;
  }
  const proto = window2.RTCPeerConnection.prototype;
  Object.defineProperty(proto, "connectionState", {
    get() {
      return {
        completed: "connected",
        checking: "connecting"
      }[this.iceConnectionState] || this.iceConnectionState;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(proto, "onconnectionstatechange", {
    get() {
      return this._onconnectionstatechange || null;
    },
    set(cb) {
      if (this._onconnectionstatechange) {
        this.removeEventListener(
          "connectionstatechange",
          this._onconnectionstatechange
        );
        delete this._onconnectionstatechange;
      }
      if (cb) {
        this.addEventListener(
          "connectionstatechange",
          this._onconnectionstatechange = cb
        );
      }
    },
    enumerable: true,
    configurable: true
  });
  ["setLocalDescription", "setRemoteDescription"].forEach((method) => {
    const origMethod = proto[method];
    proto[method] = function() {
      if (!this._connectionstatechangepoly) {
        this._connectionstatechangepoly = (e) => {
          const pc = e.target;
          if (pc._lastConnectionState !== pc.connectionState) {
            pc._lastConnectionState = pc.connectionState;
            const newEvent = new Event("connectionstatechange", e);
            pc.dispatchEvent(newEvent);
          }
          return e;
        };
        this.addEventListener(
          "iceconnectionstatechange",
          this._connectionstatechangepoly
        );
      }
      return origMethod.apply(this, arguments);
    };
  });
}
function removeExtmapAllowMixed(window2, browserDetails) {
  if (!window2.RTCPeerConnection) {
    return;
  }
  if (browserDetails.browser === "chrome" && browserDetails.version >= 71) {
    return;
  }
  if (browserDetails.browser === "safari" && browserDetails._safariVersion >= 13.1) {
    return;
  }
  const nativeSRD = window2.RTCPeerConnection.prototype.setRemoteDescription;
  window2.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(desc) {
    if (desc && desc.sdp && desc.sdp.indexOf("\na=extmap-allow-mixed") !== -1) {
      const sdp2 = desc.sdp.split("\n").filter((line) => {
        return line.trim() !== "a=extmap-allow-mixed";
      }).join("\n");
      if (window2.RTCSessionDescription && desc instanceof window2.RTCSessionDescription) {
        arguments[0] = new window2.RTCSessionDescription({
          type: desc.type,
          sdp: sdp2
        });
      } else {
        desc.sdp = sdp2;
      }
    }
    return nativeSRD.apply(this, arguments);
  };
}
function shimAddIceCandidateNullOrEmpty(window2, browserDetails) {
  if (!(window2.RTCPeerConnection && window2.RTCPeerConnection.prototype)) {
    return;
  }
  const nativeAddIceCandidate = window2.RTCPeerConnection.prototype.addIceCandidate;
  if (!nativeAddIceCandidate || nativeAddIceCandidate.length === 0) {
    return;
  }
  window2.RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate() {
    if (!arguments[0]) {
      if (arguments[1]) {
        arguments[1].apply(null);
      }
      return Promise.resolve();
    }
    if ((browserDetails.browser === "chrome" && browserDetails.version < 78 || browserDetails.browser === "firefox" && browserDetails.version < 68 || browserDetails.browser === "safari") && arguments[0] && arguments[0].candidate === "") {
      return Promise.resolve();
    }
    return nativeAddIceCandidate.apply(this, arguments);
  };
}
function shimParameterlessSetLocalDescription(window2, browserDetails) {
  if (!(window2.RTCPeerConnection && window2.RTCPeerConnection.prototype)) {
    return;
  }
  const nativeSetLocalDescription = window2.RTCPeerConnection.prototype.setLocalDescription;
  if (!nativeSetLocalDescription || nativeSetLocalDescription.length === 0) {
    return;
  }
  window2.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
    let desc = arguments[0] || {};
    if (typeof desc !== "object" || desc.type && desc.sdp) {
      return nativeSetLocalDescription.apply(this, arguments);
    }
    desc = { type: desc.type, sdp: desc.sdp };
    if (!desc.type) {
      switch (this.signalingState) {
        case "stable":
        case "have-local-offer":
        case "have-remote-pranswer":
          desc.type = "offer";
          break;
        default:
          desc.type = "answer";
          break;
      }
    }
    if (desc.sdp || desc.type !== "offer" && desc.type !== "answer") {
      return nativeSetLocalDescription.apply(this, [desc]);
    }
    const func = desc.type === "offer" ? this.createOffer : this.createAnswer;
    return func.apply(this).then((d) => nativeSetLocalDescription.apply(this, [d]));
  };
}
const commonShim = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  removeExtmapAllowMixed,
  shimAddIceCandidateNullOrEmpty,
  shimConnectionState,
  shimMaxMessageSize,
  shimParameterlessSetLocalDescription,
  shimRTCIceCandidate,
  shimRTCIceCandidateRelayProtocol,
  shimSendThrowTypeError
}, Symbol.toStringTag, { value: "Module" }));
function adapterFactory({ window: window2 } = {}, options = {
  shimChrome: true,
  shimFirefox: true,
  shimSafari: true
}) {
  const logging2 = log;
  const browserDetails = detectBrowser(window2);
  const adapter2 = {
    browserDetails,
    commonShim,
    extractVersion,
    disableLog,
    disableWarnings,
    // Expose sdp as a convenience. For production apps include directly.
    sdp
  };
  switch (browserDetails.browser) {
    case "chrome":
      if (!chromeShim || !shimPeerConnection$1 || !options.shimChrome) {
        logging2("Chrome shim is not included in this adapter release.");
        return adapter2;
      }
      if (browserDetails.version === null) {
        logging2("Chrome shim can not determine version, not shimming.");
        return adapter2;
      }
      logging2("adapter.js shimming chrome.");
      adapter2.browserShim = chromeShim;
      shimAddIceCandidateNullOrEmpty(window2, browserDetails);
      shimParameterlessSetLocalDescription(window2);
      shimGetUserMedia$2(window2, browserDetails);
      shimMediaStream(window2);
      shimPeerConnection$1(window2, browserDetails);
      shimOnTrack$1(window2, browserDetails);
      shimAddTrackRemoveTrack(window2, browserDetails);
      shimGetSendersWithDtmf(window2);
      shimSenderReceiverGetStats(window2, browserDetails);
      fixNegotiationNeeded(window2, browserDetails);
      shimRTCIceCandidate(window2);
      shimRTCIceCandidateRelayProtocol(window2);
      shimConnectionState(window2);
      shimMaxMessageSize(window2, browserDetails);
      shimSendThrowTypeError(window2, browserDetails);
      removeExtmapAllowMixed(window2, browserDetails);
      break;
    case "firefox":
      if (!firefoxShim || !shimPeerConnection || !options.shimFirefox) {
        logging2("Firefox shim is not included in this adapter release.");
        return adapter2;
      }
      logging2("adapter.js shimming firefox.");
      adapter2.browserShim = firefoxShim;
      shimAddIceCandidateNullOrEmpty(window2, browserDetails);
      shimParameterlessSetLocalDescription(window2);
      shimGetUserMedia$1(window2, browserDetails);
      shimPeerConnection(window2, browserDetails);
      shimGetStats(window2, browserDetails);
      shimOnTrack(window2);
      shimRemoveStream(window2);
      shimSenderGetStats(window2);
      shimReceiverGetStats(window2);
      shimRTCDataChannel(window2);
      shimAddTransceiver(window2);
      shimGetParameters(window2);
      shimCreateOffer(window2);
      shimCreateAnswer(window2);
      shimRTCIceCandidate(window2);
      shimConnectionState(window2);
      shimMaxMessageSize(window2, browserDetails);
      shimSendThrowTypeError(window2, browserDetails);
      break;
    case "safari":
      if (!safariShim || !options.shimSafari) {
        logging2("Safari shim is not included in this adapter release.");
        return adapter2;
      }
      logging2("adapter.js shimming safari.");
      adapter2.browserShim = safariShim;
      shimAddIceCandidateNullOrEmpty(window2, browserDetails);
      shimParameterlessSetLocalDescription(window2);
      shimRTCIceServerUrls(window2);
      shimCreateOfferLegacy(window2);
      shimCallbacksAPI(window2);
      shimLocalStreamsAPI(window2);
      shimRemoteStreamsAPI(window2);
      shimTrackEventTransceiver(window2);
      shimGetUserMedia(window2);
      shimAudioContext(window2);
      shimRTCIceCandidate(window2);
      shimRTCIceCandidateRelayProtocol(window2);
      shimMaxMessageSize(window2, browserDetails);
      shimSendThrowTypeError(window2, browserDetails);
      removeExtmapAllowMixed(window2, browserDetails);
      break;
    default:
      logging2("Unsupported browser!");
      break;
  }
  return adapter2;
}
const adapter = adapterFactory({ window: typeof window === "undefined" ? void 0 : window });
function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, { get: v, set: s, enumerable: true, configurable: true });
}
class $fcbcc7538a6776d5$export$f1c5f4c9cb95390b {
  constructor() {
    this.chunkedMTU = 16300;
    this._dataCount = 1;
    this.chunk = (blob) => {
      const chunks = [];
      const size = blob.byteLength;
      const total = Math.ceil(size / this.chunkedMTU);
      let index = 0;
      let start = 0;
      while (start < size) {
        const end = Math.min(size, start + this.chunkedMTU);
        const b = blob.slice(start, end);
        const chunk = {
          __peerData: this._dataCount,
          n: index,
          data: b,
          total
        };
        chunks.push(chunk);
        start = end;
        index++;
      }
      this._dataCount++;
      return chunks;
    };
  }
}
function $fcbcc7538a6776d5$export$52c89ebcdc4f53f2(bufs) {
  let size = 0;
  for (const buf of bufs) size += buf.byteLength;
  const result = new Uint8Array(size);
  let offset = 0;
  for (const buf of bufs) {
    result.set(buf, offset);
    offset += buf.byteLength;
  }
  return result;
}
const $fb63e766cfafaab9$var$webRTCAdapter = (
  //@ts-ignore
  adapter.default || adapter
);
const $fb63e766cfafaab9$export$25be9502477c137d = new class {
  isWebRTCSupported() {
    return typeof RTCPeerConnection !== "undefined";
  }
  isBrowserSupported() {
    const browser = this.getBrowser();
    const version = this.getVersion();
    const validBrowser = this.supportedBrowsers.includes(browser);
    if (!validBrowser) return false;
    if (browser === "chrome") return version >= this.minChromeVersion;
    if (browser === "firefox") return version >= this.minFirefoxVersion;
    if (browser === "safari") return !this.isIOS && version >= this.minSafariVersion;
    return false;
  }
  getBrowser() {
    return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.browser;
  }
  getVersion() {
    return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
  }
  isUnifiedPlanSupported() {
    const browser = this.getBrowser();
    const version = $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
    if (browser === "chrome" && version < this.minChromeVersion) return false;
    if (browser === "firefox" && version >= this.minFirefoxVersion) return true;
    if (!window.RTCRtpTransceiver || !("currentDirection" in RTCRtpTransceiver.prototype)) return false;
    let tempPc;
    let supported = false;
    try {
      tempPc = new RTCPeerConnection();
      tempPc.addTransceiver("audio");
      supported = true;
    } catch (e) {
    } finally {
      if (tempPc) tempPc.close();
    }
    return supported;
  }
  toString() {
    return `Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`;
  }
  constructor() {
    this.isIOS = typeof navigator !== "undefined" ? [
      "iPad",
      "iPhone",
      "iPod"
    ].includes(navigator.platform) : false;
    this.supportedBrowsers = [
      "firefox",
      "chrome",
      "safari"
    ];
    this.minFirefoxVersion = 59;
    this.minChromeVersion = 72;
    this.minSafariVersion = 605;
  }
}();
const $9a84a32bf0bf36bb$export$f35f128fd59ea256 = (id) => {
  return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(id);
};
const $0e5fd1585784c252$export$4e61f672936bec77 = () => Math.random().toString(36).slice(2);
const $4f4134156c446392$var$DEFAULT_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: [
        "turn:eu-0.turn.peerjs.com:3478",
        "turn:us-0.turn.peerjs.com:3478"
      ],
      username: "peerjs",
      credential: "peerjsp"
    }
  ],
  sdpSemantics: "unified-plan"
};
class $4f4134156c446392$export$f8f26dd395d7e1bd extends $fcbcc7538a6776d5$export$f1c5f4c9cb95390b {
  noop() {
  }
  blobToArrayBuffer(blob, cb) {
    const fr = new FileReader();
    fr.onload = function(evt) {
      if (evt.target) cb(evt.target.result);
    };
    fr.readAsArrayBuffer(blob);
    return fr;
  }
  binaryStringToArrayBuffer(binary) {
    const byteArray = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) byteArray[i] = binary.charCodeAt(i) & 255;
    return byteArray.buffer;
  }
  isSecure() {
    return location.protocol === "https:";
  }
  constructor(...args) {
    super(...args), this.CLOUD_HOST = "0.peerjs.com", this.CLOUD_PORT = 443, // Browsers that need chunking:
    this.chunkedBrowsers = {
      Chrome: 1,
      chrome: 1
    }, // Returns browser-agnostic default config
    this.defaultConfig = $4f4134156c446392$var$DEFAULT_CONFIG, this.browser = $fb63e766cfafaab9$export$25be9502477c137d.getBrowser(), this.browserVersion = $fb63e766cfafaab9$export$25be9502477c137d.getVersion(), this.pack = $0cfd7828ad59115f$export$2a703dbb0cb35339, this.unpack = $0cfd7828ad59115f$export$417857010dc9287f, /**
    * A hash of WebRTC features mapped to booleans that correspond to whether the feature is supported by the current browser.
    *
    * :::caution
    * Only the properties documented here are guaranteed to be present on `util.supports`
    * :::
    */
    this.supports = (function() {
      const supported = {
        browser: $fb63e766cfafaab9$export$25be9502477c137d.isBrowserSupported(),
        webRTC: $fb63e766cfafaab9$export$25be9502477c137d.isWebRTCSupported(),
        audioVideo: false,
        data: false,
        binaryBlob: false,
        reliable: false
      };
      if (!supported.webRTC) return supported;
      let pc;
      try {
        pc = new RTCPeerConnection($4f4134156c446392$var$DEFAULT_CONFIG);
        supported.audioVideo = true;
        let dc;
        try {
          dc = pc.createDataChannel("_PEERJSTEST", {
            ordered: true
          });
          supported.data = true;
          supported.reliable = !!dc.ordered;
          try {
            dc.binaryType = "blob";
            supported.binaryBlob = !(0, $fb63e766cfafaab9$export$25be9502477c137d).isIOS;
          } catch (e) {
          }
        } catch (e) {
        } finally {
          if (dc) dc.close();
        }
      } catch (e) {
      } finally {
        if (pc) pc.close();
      }
      return supported;
    })(), // Ensure alphanumeric ids
    this.validateId = $9a84a32bf0bf36bb$export$f35f128fd59ea256, this.randomToken = $0e5fd1585784c252$export$4e61f672936bec77;
  }
}
const $4f4134156c446392$export$7debb50ef11d5e0b = new $4f4134156c446392$export$f8f26dd395d7e1bd();
const $257947e92926277a$var$LOG_PREFIX = "PeerJS: ";
class $257947e92926277a$var$Logger {
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(logLevel) {
    this._logLevel = logLevel;
  }
  log(...args) {
    if (this._logLevel >= 3) this._print(3, ...args);
  }
  warn(...args) {
    if (this._logLevel >= 2) this._print(2, ...args);
  }
  error(...args) {
    if (this._logLevel >= 1) this._print(1, ...args);
  }
  setLogFunction(fn) {
    this._print = fn;
  }
  _print(logLevel, ...rest) {
    const copy = [
      $257947e92926277a$var$LOG_PREFIX,
      ...rest
    ];
    for (const i in copy) if (copy[i] instanceof Error) copy[i] = "(" + copy[i].name + ") " + copy[i].message;
    if (logLevel >= 3) console.log(...copy);
    else if (logLevel >= 2) console.warn("WARNING", ...copy);
    else if (logLevel >= 1) console.error("ERROR", ...copy);
  }
  constructor() {
    this._logLevel = 0;
  }
}
var $257947e92926277a$export$2e2bcd8739ae039 = new $257947e92926277a$var$Logger();
var $c4dcfd1d1ea86647$exports = {};
var $c4dcfd1d1ea86647$var$has = Object.prototype.hasOwnProperty, $c4dcfd1d1ea86647$var$prefix = "~";
function $c4dcfd1d1ea86647$var$Events() {
}
if (Object.create) {
  $c4dcfd1d1ea86647$var$Events.prototype = /* @__PURE__ */ Object.create(null);
  if (!new $c4dcfd1d1ea86647$var$Events().__proto__) $c4dcfd1d1ea86647$var$prefix = false;
}
function $c4dcfd1d1ea86647$var$EE(fn, context, once2) {
  this.fn = fn;
  this.context = context;
  this.once = once2 || false;
}
function $c4dcfd1d1ea86647$var$addListener(emitter, event, fn, context, once2) {
  if (typeof fn !== "function") throw new TypeError("The listener must be a function");
  var listener = new $c4dcfd1d1ea86647$var$EE(fn, context || emitter, once2), evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [
    emitter._events[evt],
    listener
  ];
  return emitter;
}
function $c4dcfd1d1ea86647$var$clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new $c4dcfd1d1ea86647$var$Events();
  else delete emitter._events[evt];
}
function $c4dcfd1d1ea86647$var$EventEmitter() {
  this._events = new $c4dcfd1d1ea86647$var$Events();
  this._eventsCount = 0;
}
$c4dcfd1d1ea86647$var$EventEmitter.prototype.eventNames = function eventNames() {
  var names = [], events, name;
  if (this._eventsCount === 0) return names;
  for (name in events = this._events) if ($c4dcfd1d1ea86647$var$has.call(events, name)) names.push($c4dcfd1d1ea86647$var$prefix ? name.slice(1) : name);
  if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
  return names;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.listeners = function listeners(event) {
  var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, handlers = this._events[evt];
  if (!handlers) return [];
  if (handlers.fn) return [
    handlers.fn
  ];
  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
  return ee;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, listeners2 = this._events[evt];
  if (!listeners2) return 0;
  if (listeners2.fn) return 1;
  return listeners2.length;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
  if (!this._events[evt]) return false;
  var listeners2 = this._events[evt], len = arguments.length, args, i;
  if (listeners2.fn) {
    if (listeners2.once) this.removeListener(event, listeners2.fn, void 0, true);
    switch (len) {
      case 1:
        return listeners2.fn.call(listeners2.context), true;
      case 2:
        return listeners2.fn.call(listeners2.context, a1), true;
      case 3:
        return listeners2.fn.call(listeners2.context, a1, a2), true;
      case 4:
        return listeners2.fn.call(listeners2.context, a1, a2, a3), true;
      case 5:
        return listeners2.fn.call(listeners2.context, a1, a2, a3, a4), true;
      case 6:
        return listeners2.fn.call(listeners2.context, a1, a2, a3, a4, a5), true;
    }
    for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
    listeners2.fn.apply(listeners2.context, args);
  } else {
    var length = listeners2.length, j;
    for (i = 0; i < length; i++) {
      if (listeners2[i].once) this.removeListener(event, listeners2[i].fn, void 0, true);
      switch (len) {
        case 1:
          listeners2[i].fn.call(listeners2[i].context);
          break;
        case 2:
          listeners2[i].fn.call(listeners2[i].context, a1);
          break;
        case 3:
          listeners2[i].fn.call(listeners2[i].context, a1, a2);
          break;
        case 4:
          listeners2[i].fn.call(listeners2[i].context, a1, a2, a3);
          break;
        default:
          if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
          listeners2[i].fn.apply(listeners2[i].context, args);
      }
    }
  }
  return true;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.on = function on(event, fn, context) {
  return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, false);
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.once = function once(event, fn, context) {
  return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, true);
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once2) {
  var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
  if (!this._events[evt]) return this;
  if (!fn) {
    $c4dcfd1d1ea86647$var$clearEvent(this, evt);
    return this;
  }
  var listeners2 = this._events[evt];
  if (listeners2.fn) {
    if (listeners2.fn === fn && (!once2 || listeners2.once) && (!context || listeners2.context === context)) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
  } else {
    for (var i = 0, events = [], length = listeners2.length; i < length; i++) if (listeners2[i].fn !== fn || once2 && !listeners2[i].once || context && listeners2[i].context !== context) events.push(listeners2[i]);
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else $c4dcfd1d1ea86647$var$clearEvent(this, evt);
  }
  return this;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;
  if (event) {
    evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
    if (this._events[evt]) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
  } else {
    this._events = new $c4dcfd1d1ea86647$var$Events();
    this._eventsCount = 0;
  }
  return this;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.off = $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener;
$c4dcfd1d1ea86647$var$EventEmitter.prototype.addListener = $c4dcfd1d1ea86647$var$EventEmitter.prototype.on;
$c4dcfd1d1ea86647$var$EventEmitter.prefixed = $c4dcfd1d1ea86647$var$prefix;
$c4dcfd1d1ea86647$var$EventEmitter.EventEmitter = $c4dcfd1d1ea86647$var$EventEmitter;
$c4dcfd1d1ea86647$exports = $c4dcfd1d1ea86647$var$EventEmitter;
var $78455e22dea96b8c$exports = {};
$parcel$export($78455e22dea96b8c$exports, "ConnectionType", () => $78455e22dea96b8c$export$3157d57b4135e3bc);
$parcel$export($78455e22dea96b8c$exports, "PeerErrorType", () => $78455e22dea96b8c$export$9547aaa2e39030ff);
$parcel$export($78455e22dea96b8c$exports, "BaseConnectionErrorType", () => $78455e22dea96b8c$export$7974935686149686);
$parcel$export($78455e22dea96b8c$exports, "DataConnectionErrorType", () => $78455e22dea96b8c$export$49ae800c114df41d);
$parcel$export($78455e22dea96b8c$exports, "SerializationType", () => $78455e22dea96b8c$export$89f507cf986a947);
$parcel$export($78455e22dea96b8c$exports, "SocketEventType", () => $78455e22dea96b8c$export$3b5c4a4b6354f023);
$parcel$export($78455e22dea96b8c$exports, "ServerMessageType", () => $78455e22dea96b8c$export$adb4a1754da6f10d);
var $78455e22dea96b8c$export$3157d57b4135e3bc = /* @__PURE__ */ (function(ConnectionType) {
  ConnectionType["Data"] = "data";
  ConnectionType["Media"] = "media";
  return ConnectionType;
})({});
var $78455e22dea96b8c$export$9547aaa2e39030ff = /* @__PURE__ */ (function(PeerErrorType) {
  PeerErrorType["BrowserIncompatible"] = "browser-incompatible";
  PeerErrorType["Disconnected"] = "disconnected";
  PeerErrorType["InvalidID"] = "invalid-id";
  PeerErrorType["InvalidKey"] = "invalid-key";
  PeerErrorType["Network"] = "network";
  PeerErrorType["PeerUnavailable"] = "peer-unavailable";
  PeerErrorType["SslUnavailable"] = "ssl-unavailable";
  PeerErrorType["ServerError"] = "server-error";
  PeerErrorType["SocketError"] = "socket-error";
  PeerErrorType["SocketClosed"] = "socket-closed";
  PeerErrorType["UnavailableID"] = "unavailable-id";
  PeerErrorType["WebRTC"] = "webrtc";
  return PeerErrorType;
})({});
var $78455e22dea96b8c$export$7974935686149686 = /* @__PURE__ */ (function(BaseConnectionErrorType) {
  BaseConnectionErrorType["NegotiationFailed"] = "negotiation-failed";
  BaseConnectionErrorType["ConnectionClosed"] = "connection-closed";
  return BaseConnectionErrorType;
})({});
var $78455e22dea96b8c$export$49ae800c114df41d = /* @__PURE__ */ (function(DataConnectionErrorType) {
  DataConnectionErrorType["NotOpenYet"] = "not-open-yet";
  DataConnectionErrorType["MessageToBig"] = "message-too-big";
  return DataConnectionErrorType;
})({});
var $78455e22dea96b8c$export$89f507cf986a947 = /* @__PURE__ */ (function(SerializationType) {
  SerializationType["Binary"] = "binary";
  SerializationType["BinaryUTF8"] = "binary-utf8";
  SerializationType["JSON"] = "json";
  SerializationType["None"] = "raw";
  return SerializationType;
})({});
var $78455e22dea96b8c$export$3b5c4a4b6354f023 = /* @__PURE__ */ (function(SocketEventType) {
  SocketEventType["Message"] = "message";
  SocketEventType["Disconnected"] = "disconnected";
  SocketEventType["Error"] = "error";
  SocketEventType["Close"] = "close";
  return SocketEventType;
})({});
var $78455e22dea96b8c$export$adb4a1754da6f10d = /* @__PURE__ */ (function(ServerMessageType) {
  ServerMessageType["Heartbeat"] = "HEARTBEAT";
  ServerMessageType["Candidate"] = "CANDIDATE";
  ServerMessageType["Offer"] = "OFFER";
  ServerMessageType["Answer"] = "ANSWER";
  ServerMessageType["Open"] = "OPEN";
  ServerMessageType["Error"] = "ERROR";
  ServerMessageType["IdTaken"] = "ID-TAKEN";
  ServerMessageType["InvalidKey"] = "INVALID-KEY";
  ServerMessageType["Leave"] = "LEAVE";
  ServerMessageType["Expire"] = "EXPIRE";
  return ServerMessageType;
})({});
const $520832d44ba058c8$export$83d89fbfd8236492 = "1.5.5";
class $8f5bfa60836d261d$export$4798917dbf149b79 extends $c4dcfd1d1ea86647$exports.EventEmitter {
  constructor(secure, host, port, path, key, pingInterval = 5e3) {
    super(), this.pingInterval = pingInterval, this._disconnected = true, this._messagesQueue = [];
    const wsProtocol = secure ? "wss://" : "ws://";
    this._baseUrl = wsProtocol + host + ":" + port + path + "peerjs?key=" + key;
  }
  start(id, token) {
    this._id = id;
    const wsUrl = `${this._baseUrl}&id=${id}&token=${token}`;
    if (!!this._socket || !this._disconnected) return;
    this._socket = new WebSocket(wsUrl + "&version=" + $520832d44ba058c8$export$83d89fbfd8236492);
    this._disconnected = false;
    this._socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Server message received:", data);
      } catch (e) {
        $257947e92926277a$export$2e2bcd8739ae039.log("Invalid server message", event.data);
        return;
      }
      this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Message, data);
    };
    this._socket.onclose = (event) => {
      if (this._disconnected) return;
      $257947e92926277a$export$2e2bcd8739ae039.log("Socket closed.", event);
      this._cleanup();
      this._disconnected = true;
      this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Disconnected);
    };
    this._socket.onopen = () => {
      if (this._disconnected) return;
      this._sendQueuedMessages();
      $257947e92926277a$export$2e2bcd8739ae039.log("Socket open");
      this._scheduleHeartbeat();
    };
  }
  _scheduleHeartbeat() {
    this._wsPingTimer = setTimeout(() => {
      this._sendHeartbeat();
    }, this.pingInterval);
  }
  _sendHeartbeat() {
    if (!this._wsOpen()) {
      $257947e92926277a$export$2e2bcd8739ae039.log(`Cannot send heartbeat, because socket closed`);
      return;
    }
    const message = JSON.stringify({
      type: $78455e22dea96b8c$export$adb4a1754da6f10d.Heartbeat
    });
    this._socket.send(message);
    this._scheduleHeartbeat();
  }
  /** Is the websocket currently open? */
  _wsOpen() {
    return !!this._socket && this._socket.readyState === 1;
  }
  /** Send queued messages. */
  _sendQueuedMessages() {
    const copiedQueue = [
      ...this._messagesQueue
    ];
    this._messagesQueue = [];
    for (const message of copiedQueue) this.send(message);
  }
  /** Exposed send for DC & Peer. */
  send(data) {
    if (this._disconnected) return;
    if (!this._id) {
      this._messagesQueue.push(data);
      return;
    }
    if (!data.type) {
      this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Error, "Invalid message");
      return;
    }
    if (!this._wsOpen()) return;
    const message = JSON.stringify(data);
    this._socket.send(message);
  }
  close() {
    if (this._disconnected) return;
    this._cleanup();
    this._disconnected = true;
  }
  _cleanup() {
    if (this._socket) {
      this._socket.onopen = this._socket.onmessage = this._socket.onclose = null;
      this._socket.close();
      this._socket = void 0;
    }
    clearTimeout(this._wsPingTimer);
  }
}
class $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a {
  constructor(connection) {
    this.connection = connection;
  }
  /** Returns a PeerConnection object set up correctly (for data, media). */
  startConnection(options) {
    const peerConnection = this._startPeerConnection();
    this.connection.peerConnection = peerConnection;
    if (this.connection.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media && options._stream) this._addTracksToConnection(options._stream, peerConnection);
    if (options.originator) {
      const dataConnection = this.connection;
      const config = {
        ordered: !!options.reliable
      };
      const dataChannel = peerConnection.createDataChannel(dataConnection.label, config);
      dataConnection._initializeDataChannel(dataChannel);
      this._makeOffer();
    } else this.handleSDP("OFFER", options.sdp);
  }
  /** Start a PC. */
  _startPeerConnection() {
    $257947e92926277a$export$2e2bcd8739ae039.log("Creating RTCPeerConnection.");
    const peerConnection = new RTCPeerConnection(this.connection.provider.options.config);
    this._setupListeners(peerConnection);
    return peerConnection;
  }
  /** Set up various WebRTC listeners. */
  _setupListeners(peerConnection) {
    const peerId = this.connection.peer;
    const connectionId = this.connection.connectionId;
    const connectionType = this.connection.type;
    const provider = this.connection.provider;
    $257947e92926277a$export$2e2bcd8739ae039.log("Listening for ICE candidates.");
    peerConnection.onicecandidate = (evt) => {
      if (!evt.candidate || !evt.candidate.candidate) return;
      $257947e92926277a$export$2e2bcd8739ae039.log(`Received ICE candidates for ${peerId}:`, evt.candidate);
      provider.socket.send({
        type: $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate,
        payload: {
          candidate: evt.candidate,
          type: connectionType,
          connectionId
        },
        dst: peerId
      });
    };
    peerConnection.oniceconnectionstatechange = () => {
      switch (peerConnection.iceConnectionState) {
        case "failed":
          $257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState is failed, closing connections to " + peerId);
          this.connection.emitError($78455e22dea96b8c$export$7974935686149686.NegotiationFailed, "Negotiation of connection to " + peerId + " failed.");
          this.connection.close();
          break;
        case "closed":
          $257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState is closed, closing connections to " + peerId);
          this.connection.emitError($78455e22dea96b8c$export$7974935686149686.ConnectionClosed, "Connection to " + peerId + " closed.");
          this.connection.close();
          break;
        case "disconnected":
          $257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState changed to disconnected on the connection with " + peerId);
          break;
        case "completed":
          peerConnection.onicecandidate = () => {
          };
          break;
      }
      this.connection.emit("iceStateChanged", peerConnection.iceConnectionState);
    };
    $257947e92926277a$export$2e2bcd8739ae039.log("Listening for data channel");
    peerConnection.ondatachannel = (evt) => {
      $257947e92926277a$export$2e2bcd8739ae039.log("Received data channel");
      const dataChannel = evt.channel;
      const connection = provider.getConnection(peerId, connectionId);
      connection._initializeDataChannel(dataChannel);
    };
    $257947e92926277a$export$2e2bcd8739ae039.log("Listening for remote stream");
    peerConnection.ontrack = (evt) => {
      $257947e92926277a$export$2e2bcd8739ae039.log("Received remote stream");
      const stream = evt.streams[0];
      const connection = provider.getConnection(peerId, connectionId);
      if (connection.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media) {
        const mediaConnection = connection;
        this._addStreamToMediaConnection(stream, mediaConnection);
      }
    };
  }
  cleanup() {
    $257947e92926277a$export$2e2bcd8739ae039.log("Cleaning up PeerConnection to " + this.connection.peer);
    const peerConnection = this.connection.peerConnection;
    if (!peerConnection) return;
    this.connection.peerConnection = null;
    peerConnection.onicecandidate = peerConnection.oniceconnectionstatechange = peerConnection.ondatachannel = peerConnection.ontrack = () => {
    };
    const peerConnectionNotClosed = peerConnection.signalingState !== "closed";
    let dataChannelNotClosed = false;
    const dataChannel = this.connection.dataChannel;
    if (dataChannel) dataChannelNotClosed = !!dataChannel.readyState && dataChannel.readyState !== "closed";
    if (peerConnectionNotClosed || dataChannelNotClosed) peerConnection.close();
  }
  async _makeOffer() {
    const peerConnection = this.connection.peerConnection;
    const provider = this.connection.provider;
    try {
      const offer = await peerConnection.createOffer(this.connection.options.constraints);
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Created offer.");
      if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") offer.sdp = this.connection.options.sdpTransform(offer.sdp) || offer.sdp;
      try {
        await peerConnection.setLocalDescription(offer);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Set localDescription:", offer, `for:${this.connection.peer}`);
        let payload = {
          sdp: offer,
          type: this.connection.type,
          connectionId: this.connection.connectionId,
          metadata: this.connection.metadata
        };
        if (this.connection.type === (0, $78455e22dea96b8c$export$3157d57b4135e3bc).Data) {
          const dataConnection = this.connection;
          payload = {
            ...payload,
            label: dataConnection.label,
            reliable: dataConnection.reliable,
            serialization: dataConnection.serialization
          };
        }
        provider.socket.send({
          type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Offer,
          payload,
          dst: this.connection.peer
        });
      } catch (err) {
        if (err != "OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer") {
          provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
          (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to setLocalDescription, ", err);
        }
      }
    } catch (err_1) {
      provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err_1);
      $257947e92926277a$export$2e2bcd8739ae039.log("Failed to createOffer, ", err_1);
    }
  }
  async _makeAnswer() {
    const peerConnection = this.connection.peerConnection;
    const provider = this.connection.provider;
    try {
      const answer = await peerConnection.createAnswer();
      (0, $257947e92926277a$export$2e2bcd8739ae039).log("Created answer.");
      if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") answer.sdp = this.connection.options.sdpTransform(answer.sdp) || answer.sdp;
      try {
        await peerConnection.setLocalDescription(answer);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Set localDescription:`, answer, `for:${this.connection.peer}`);
        provider.socket.send({
          type: (0, $78455e22dea96b8c$export$adb4a1754da6f10d).Answer,
          payload: {
            sdp: answer,
            type: this.connection.type,
            connectionId: this.connection.connectionId
          },
          dst: this.connection.peer
        });
      } catch (err) {
        provider.emitError((0, $78455e22dea96b8c$export$9547aaa2e39030ff).WebRTC, err);
        (0, $257947e92926277a$export$2e2bcd8739ae039).log("Failed to setLocalDescription, ", err);
      }
    } catch (err_1) {
      provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err_1);
      $257947e92926277a$export$2e2bcd8739ae039.log("Failed to create answer, ", err_1);
    }
  }
  /** Handle an SDP. */
  async handleSDP(type, sdp2) {
    sdp2 = new RTCSessionDescription(sdp2);
    const peerConnection = this.connection.peerConnection;
    const provider = this.connection.provider;
    $257947e92926277a$export$2e2bcd8739ae039.log("Setting remote description", sdp2);
    const self = this;
    try {
      await peerConnection.setRemoteDescription(sdp2);
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Set remoteDescription:${type} for:${this.connection.peer}`);
      if (type === "OFFER") await self._makeAnswer();
    } catch (err) {
      provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
      $257947e92926277a$export$2e2bcd8739ae039.log("Failed to setRemoteDescription, ", err);
    }
  }
  /** Handle a candidate. */
  async handleCandidate(ice) {
    $257947e92926277a$export$2e2bcd8739ae039.log(`handleCandidate:`, ice);
    try {
      await this.connection.peerConnection.addIceCandidate(ice);
      (0, $257947e92926277a$export$2e2bcd8739ae039).log(`Added ICE candidate for:${this.connection.peer}`);
    } catch (err) {
      this.connection.provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
      $257947e92926277a$export$2e2bcd8739ae039.log("Failed to handleCandidate, ", err);
    }
  }
  _addTracksToConnection(stream, peerConnection) {
    $257947e92926277a$export$2e2bcd8739ae039.log(`add tracks from stream ${stream.id} to peer connection`);
    if (!peerConnection.addTrack) return $257947e92926277a$export$2e2bcd8739ae039.error(`Your browser does't support RTCPeerConnection#addTrack. Ignored.`);
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
  }
  _addStreamToMediaConnection(stream, mediaConnection) {
    $257947e92926277a$export$2e2bcd8739ae039.log(`add stream ${stream.id} to media connection ${mediaConnection.connectionId}`);
    mediaConnection.addStream(stream);
  }
}
class $23779d1881157a18$export$6a678e589c8a4542 extends $c4dcfd1d1ea86647$exports.EventEmitter {
  /**
  * Emits a typed error message.
  *
  * @internal
  */
  emitError(type, err) {
    $257947e92926277a$export$2e2bcd8739ae039.error("Error:", err);
    this.emit("error", new $23779d1881157a18$export$98871882f492de82(`${type}`, err));
  }
}
class $23779d1881157a18$export$98871882f492de82 extends Error {
  /**
  * @internal
  */
  constructor(type, err) {
    if (typeof err === "string") super(err);
    else {
      super();
      Object.assign(this, err);
    }
    this.type = type;
  }
}
class $5045192fc6d387ba$export$23a2a68283c24d80 extends $23779d1881157a18$export$6a678e589c8a4542 {
  /**
  * Whether the media connection is active (e.g. your call has been answered).
  * You can check this if you want to set a maximum wait time for a one-sided call.
  */
  get open() {
    return this._open;
  }
  constructor(peer, provider, options) {
    super(), this.peer = peer, this.provider = provider, this.options = options, this._open = false;
    this.metadata = options.metadata;
  }
}
class $5c1d08c7c57da9a3$export$4a84e95a2324ac29 extends $5045192fc6d387ba$export$23a2a68283c24d80 {
  static #_ = this.ID_PREFIX = "mc_";
  /**
  * For media connections, this is always 'media'.
  */
  get type() {
    return $78455e22dea96b8c$export$3157d57b4135e3bc.Media;
  }
  get localStream() {
    return this._localStream;
  }
  get remoteStream() {
    return this._remoteStream;
  }
  constructor(peerId, provider, options) {
    super(peerId, provider, options);
    this._localStream = this.options._stream;
    this.connectionId = this.options.connectionId || $5c1d08c7c57da9a3$export$4a84e95a2324ac29.ID_PREFIX + $4f4134156c446392$export$7debb50ef11d5e0b.randomToken();
    this._negotiator = new $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a(this);
    if (this._localStream) this._negotiator.startConnection({
      _stream: this._localStream,
      originator: true
    });
  }
  /** Called by the Negotiator when the DataChannel is ready. */
  _initializeDataChannel(dc) {
    this.dataChannel = dc;
    this.dataChannel.onopen = () => {
      $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc connection success`);
      this.emit("willCloseOnRemote");
    };
    this.dataChannel.onclose = () => {
      $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc closed for:`, this.peer);
      this.close();
    };
  }
  addStream(remoteStream) {
    $257947e92926277a$export$2e2bcd8739ae039.log("Receiving stream", remoteStream);
    this._remoteStream = remoteStream;
    super.emit("stream", remoteStream);
  }
  /**
  * @internal
  */
  handleMessage(message) {
    const type = message.type;
    const payload = message.payload;
    switch (message.type) {
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Answer:
        this._negotiator.handleSDP(type, payload.sdp);
        this._open = true;
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate:
        this._negotiator.handleCandidate(payload.candidate);
        break;
      default:
        $257947e92926277a$export$2e2bcd8739ae039.warn(`Unrecognized message type:${type} from peer:${this.peer}`);
        break;
    }
  }
  /**
       * When receiving a {@apilink PeerEvents | `call`} event on a peer, you can call
       * `answer` on the media connection provided by the callback to accept the call
       * and optionally send your own media stream.
  
       *
       * @param stream A WebRTC media stream.
       * @param options
       * @returns
       */
  answer(stream, options = {}) {
    if (this._localStream) {
      $257947e92926277a$export$2e2bcd8739ae039.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");
      return;
    }
    this._localStream = stream;
    if (options && options.sdpTransform) this.options.sdpTransform = options.sdpTransform;
    this._negotiator.startConnection({
      ...this.options._payload,
      _stream: stream
    });
    const messages = this.provider._getMessages(this.connectionId);
    for (const message of messages) this.handleMessage(message);
    this._open = true;
  }
  /**
  * Exposed functionality for users.
  */
  /**
  * Closes the media connection.
  */
  close() {
    if (this._negotiator) {
      this._negotiator.cleanup();
      this._negotiator = null;
    }
    this._localStream = null;
    this._remoteStream = null;
    if (this.provider) {
      this.provider._removeConnection(this);
      this.provider = null;
    }
    if (this.options && this.options._stream) this.options._stream = null;
    if (!this.open) return;
    this._open = false;
    super.emit("close");
  }
}
class $abf266641927cd89$export$2c4e825dc9120f87 {
  constructor(_options) {
    this._options = _options;
  }
  _buildRequest(method) {
    const protocol = this._options.secure ? "https" : "http";
    const { host, port, path, key } = this._options;
    const url = new URL(`${protocol}://${host}:${port}${path}${key}/${method}`);
    url.searchParams.set("ts", `${Date.now()}${Math.random()}`);
    url.searchParams.set("version", $520832d44ba058c8$export$83d89fbfd8236492);
    return fetch(url.href, {
      referrerPolicy: this._options.referrerPolicy
    });
  }
  /** Get a unique ID from the server via XHR and initialize with it. */
  async retrieveId() {
    try {
      const response = await this._buildRequest("id");
      if (response.status !== 200) throw new Error(`Error. Status:${response.status}`);
      return response.text();
    } catch (error) {
      $257947e92926277a$export$2e2bcd8739ae039.error("Error retrieving ID", error);
      let pathError = "";
      if (this._options.path === "/" && this._options.host !== $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) pathError = " If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer.";
      throw new Error("Could not get an ID from the server." + pathError);
    }
  }
  /** @deprecated */
  async listAllPeers() {
    try {
      const response = await this._buildRequest("peers");
      if (response.status !== 200) {
        if (response.status === 401) {
          let helpfulError = "";
          if (this._options.host === (0, $4f4134156c446392$export$7debb50ef11d5e0b).CLOUD_HOST) helpfulError = "It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.";
          else helpfulError = "You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.";
          throw new Error("It doesn't look like you have permission to list peers IDs. " + helpfulError);
        }
        throw new Error(`Error. Status:${response.status}`);
      }
      return response.json();
    } catch (error) {
      $257947e92926277a$export$2e2bcd8739ae039.error("Error retrieving list peers", error);
      throw new Error("Could not get list peers from the server." + error);
    }
  }
}
class $6366c4ca161bc297$export$d365f7ad9d7df9c9 extends $5045192fc6d387ba$export$23a2a68283c24d80 {
  static #_ = this.ID_PREFIX = "dc_";
  static #_2 = this.MAX_BUFFERED_AMOUNT = 8388608;
  get type() {
    return $78455e22dea96b8c$export$3157d57b4135e3bc.Data;
  }
  constructor(peerId, provider, options) {
    super(peerId, provider, options);
    this.connectionId = this.options.connectionId || $6366c4ca161bc297$export$d365f7ad9d7df9c9.ID_PREFIX + $0e5fd1585784c252$export$4e61f672936bec77();
    this.label = this.options.label || this.connectionId;
    this.reliable = !!this.options.reliable;
    this._negotiator = new $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a(this);
    this._negotiator.startConnection(this.options._payload || {
      originator: true,
      reliable: this.reliable
    });
  }
  /** Called by the Negotiator when the DataChannel is ready. */
  _initializeDataChannel(dc) {
    this.dataChannel = dc;
    this.dataChannel.onopen = () => {
      $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc connection success`);
      this._open = true;
      this.emit("open");
    };
    this.dataChannel.onmessage = (e) => {
      $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc onmessage:`, e.data);
    };
    this.dataChannel.onclose = () => {
      $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc closed for:`, this.peer);
      this.close();
    };
  }
  /**
  * Exposed functionality for users.
  */
  /** Allows user to close connection. */
  close(options) {
    if (options?.flush) {
      this.send({
        __peerData: {
          type: "close"
        }
      });
      return;
    }
    if (this._negotiator) {
      this._negotiator.cleanup();
      this._negotiator = null;
    }
    if (this.provider) {
      this.provider._removeConnection(this);
      this.provider = null;
    }
    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.onclose = null;
      this.dataChannel = null;
    }
    if (!this.open) return;
    this._open = false;
    super.emit("close");
  }
  /** Allows user to send data. */
  send(data, chunked = false) {
    if (!this.open) {
      this.emitError($78455e22dea96b8c$export$49ae800c114df41d.NotOpenYet, "Connection is not open. You should listen for the `open` event before sending messages.");
      return;
    }
    return this._send(data, chunked);
  }
  async handleMessage(message) {
    const payload = message.payload;
    switch (message.type) {
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Answer:
        await this._negotiator.handleSDP(message.type, payload.sdp);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate:
        await this._negotiator.handleCandidate(payload.candidate);
        break;
      default:
        $257947e92926277a$export$2e2bcd8739ae039.warn("Unrecognized message type:", message.type, "from peer:", this.peer);
        break;
    }
  }
}
class $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b extends $6366c4ca161bc297$export$d365f7ad9d7df9c9 {
  get bufferSize() {
    return this._bufferSize;
  }
  _initializeDataChannel(dc) {
    super._initializeDataChannel(dc);
    this.dataChannel.binaryType = "arraybuffer";
    this.dataChannel.addEventListener("message", (e) => this._handleDataMessage(e));
  }
  _bufferedSend(msg) {
    if (this._buffering || !this._trySend(msg)) {
      this._buffer.push(msg);
      this._bufferSize = this._buffer.length;
    }
  }
  // Returns true if the send succeeds.
  _trySend(msg) {
    if (!this.open) return false;
    if (this.dataChannel.bufferedAmount > $6366c4ca161bc297$export$d365f7ad9d7df9c9.MAX_BUFFERED_AMOUNT) {
      this._buffering = true;
      setTimeout(() => {
        this._buffering = false;
        this._tryBuffer();
      }, 50);
      return false;
    }
    try {
      this.dataChannel.send(msg);
    } catch (e) {
      $257947e92926277a$export$2e2bcd8739ae039.error(`DC#:${this.connectionId} Error when sending:`, e);
      this._buffering = true;
      this.close();
      return false;
    }
    return true;
  }
  // Try to send the first message in the buffer.
  _tryBuffer() {
    if (!this.open) return;
    if (this._buffer.length === 0) return;
    const msg = this._buffer[0];
    if (this._trySend(msg)) {
      this._buffer.shift();
      this._bufferSize = this._buffer.length;
      this._tryBuffer();
    }
  }
  close(options) {
    if (options?.flush) {
      this.send({
        __peerData: {
          type: "close"
        }
      });
      return;
    }
    this._buffer = [];
    this._bufferSize = 0;
    super.close();
  }
  constructor(...args) {
    super(...args), this._buffer = [], this._bufferSize = 0, this._buffering = false;
  }
}
class $9fcfddb3ae148f88$export$f0a5a64d5bb37108 extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
  close(options) {
    super.close(options);
    this._chunkedData = {};
  }
  constructor(peerId, provider, options) {
    super(peerId, provider, options), this.chunker = new $fcbcc7538a6776d5$export$f1c5f4c9cb95390b(), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.Binary, this._chunkedData = {};
  }
  // Handles a DataChannel message.
  _handleDataMessage({ data }) {
    const deserializedData = $0cfd7828ad59115f$export$417857010dc9287f(data);
    const peerData = deserializedData["__peerData"];
    if (peerData) {
      if (peerData.type === "close") {
        this.close();
        return;
      }
      this._handleChunk(deserializedData);
      return;
    }
    this.emit("data", deserializedData);
  }
  _handleChunk(data) {
    const id = data.__peerData;
    const chunkInfo = this._chunkedData[id] || {
      data: [],
      count: 0,
      total: data.total
    };
    chunkInfo.data[data.n] = new Uint8Array(data.data);
    chunkInfo.count++;
    this._chunkedData[id] = chunkInfo;
    if (chunkInfo.total === chunkInfo.count) {
      delete this._chunkedData[id];
      const data2 = $fcbcc7538a6776d5$export$52c89ebcdc4f53f2(chunkInfo.data);
      this._handleDataMessage({
        data: data2
      });
    }
  }
  _send(data, chunked) {
    const blob = $0cfd7828ad59115f$export$2a703dbb0cb35339(data);
    if (blob instanceof Promise) return this._send_blob(blob);
    if (!chunked && blob.byteLength > this.chunker.chunkedMTU) {
      this._sendChunks(blob);
      return;
    }
    this._bufferedSend(blob);
  }
  async _send_blob(blobPromise) {
    const blob = await blobPromise;
    if (blob.byteLength > this.chunker.chunkedMTU) {
      this._sendChunks(blob);
      return;
    }
    this._bufferedSend(blob);
  }
  _sendChunks(blob) {
    const blobs = this.chunker.chunk(blob);
    $257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} Try to send ${blobs.length} chunks...`);
    for (const blob2 of blobs) this.send(blob2, true);
  }
}
class $bbaee3f15f714663$export$6f88fe47d32c9c94 extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
  _handleDataMessage({ data }) {
    super.emit("data", data);
  }
  _send(data, _chunked) {
    this._bufferedSend(data);
  }
  constructor(...args) {
    super(...args), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.None;
  }
}
class $817f931e3f9096cf$export$48880ac635f47186 extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
  // Handles a DataChannel message.
  _handleDataMessage({ data }) {
    const deserializedData = this.parse(this.decoder.decode(data));
    const peerData = deserializedData["__peerData"];
    if (peerData && peerData.type === "close") {
      this.close();
      return;
    }
    this.emit("data", deserializedData);
  }
  _send(data, _chunked) {
    const encodedData = this.encoder.encode(this.stringify(data));
    if (encodedData.byteLength >= $4f4134156c446392$export$7debb50ef11d5e0b.chunkedMTU) {
      this.emitError($78455e22dea96b8c$export$49ae800c114df41d.MessageToBig, "Message too big for JSON channel");
      return;
    }
    this._bufferedSend(encodedData);
  }
  constructor(...args) {
    super(...args), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.JSON, this.encoder = new TextEncoder(), this.decoder = new TextDecoder(), this.stringify = JSON.stringify, this.parse = JSON.parse;
  }
}
class $416260bce337df90$export$ecd1fc136c422448 extends $23779d1881157a18$export$6a678e589c8a4542 {
  static #_ = this.DEFAULT_KEY = "peerjs";
  /**
  * The brokering ID of this peer
  *
  * If no ID was specified in {@apilink Peer | the constructor},
  * this will be `undefined` until the {@apilink PeerEvents | `open`} event is emitted.
  */
  get id() {
    return this._id;
  }
  get options() {
    return this._options;
  }
  get open() {
    return this._open;
  }
  /**
  * @internal
  */
  get socket() {
    return this._socket;
  }
  /**
  * A hash of all connections associated with this peer, keyed by the remote peer's ID.
  * @deprecated
  * Return type will change from Object to Map<string,[]>
  */
  get connections() {
    const plainConnections = /* @__PURE__ */ Object.create(null);
    for (const [k, v] of this._connections) plainConnections[k] = v;
    return plainConnections;
  }
  /**
  * true if this peer and all of its connections can no longer be used.
  */
  get destroyed() {
    return this._destroyed;
  }
  /**
  * false if there is an active connection to the PeerServer.
  */
  get disconnected() {
    return this._disconnected;
  }
  constructor(id, options) {
    super(), this._serializers = {
      raw: $bbaee3f15f714663$export$6f88fe47d32c9c94,
      json: $817f931e3f9096cf$export$48880ac635f47186,
      binary: $9fcfddb3ae148f88$export$f0a5a64d5bb37108,
      "binary-utf8": $9fcfddb3ae148f88$export$f0a5a64d5bb37108,
      default: $9fcfddb3ae148f88$export$f0a5a64d5bb37108
    }, this._id = null, this._lastServerId = null, // States.
    this._destroyed = false, this._disconnected = false, this._open = false, this._connections = /* @__PURE__ */ new Map(), this._lostMessages = /* @__PURE__ */ new Map();
    let userId;
    if (id && id.constructor == Object) options = id;
    else if (id) userId = id.toString();
    options = {
      debug: 0,
      host: $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST,
      port: $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_PORT,
      path: "/",
      key: $416260bce337df90$export$ecd1fc136c422448.DEFAULT_KEY,
      token: $4f4134156c446392$export$7debb50ef11d5e0b.randomToken(),
      config: $4f4134156c446392$export$7debb50ef11d5e0b.defaultConfig,
      referrerPolicy: "strict-origin-when-cross-origin",
      serializers: {},
      ...options
    };
    this._options = options;
    this._serializers = {
      ...this._serializers,
      ...this.options.serializers
    };
    if (this._options.host === "/") this._options.host = window.location.hostname;
    if (this._options.path) {
      if (this._options.path[0] !== "/") this._options.path = "/" + this._options.path;
      if (this._options.path[this._options.path.length - 1] !== "/") this._options.path += "/";
    }
    if (this._options.secure === void 0 && this._options.host !== $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) this._options.secure = $4f4134156c446392$export$7debb50ef11d5e0b.isSecure();
    else if (this._options.host == $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) this._options.secure = true;
    if (this._options.logFunction) $257947e92926277a$export$2e2bcd8739ae039.setLogFunction(this._options.logFunction);
    $257947e92926277a$export$2e2bcd8739ae039.logLevel = this._options.debug || 0;
    this._api = new $abf266641927cd89$export$2c4e825dc9120f87(options);
    this._socket = this._createServerConnection();
    if (!$4f4134156c446392$export$7debb50ef11d5e0b.supports.audioVideo && !$4f4134156c446392$export$7debb50ef11d5e0b.supports.data) {
      this._delayedAbort($78455e22dea96b8c$export$9547aaa2e39030ff.BrowserIncompatible, "The current browser does not support WebRTC");
      return;
    }
    if (!!userId && !$4f4134156c446392$export$7debb50ef11d5e0b.validateId(userId)) {
      this._delayedAbort($78455e22dea96b8c$export$9547aaa2e39030ff.InvalidID, `ID "${userId}" is invalid`);
      return;
    }
    if (userId) this._initialize(userId);
    else this._api.retrieveId().then((id2) => this._initialize(id2)).catch((error) => this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, error));
  }
  _createServerConnection() {
    const socket = new $8f5bfa60836d261d$export$4798917dbf149b79(this._options.secure, this._options.host, this._options.port, this._options.path, this._options.key, this._options.pingInterval);
    socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Message, (data) => {
      this._handleMessage(data);
    });
    socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Error, (error) => {
      this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.SocketError, error);
    });
    socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Disconnected, () => {
      if (this.disconnected) return;
      this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Network, "Lost connection to server.");
      this.disconnect();
    });
    socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Close, () => {
      if (this.disconnected) return;
      this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.SocketClosed, "Underlying socket is already closed.");
    });
    return socket;
  }
  /** Initialize a connection with the server. */
  _initialize(id) {
    this._id = id;
    this.socket.start(id, this._options.token);
  }
  /** Handles messages from the server. */
  _handleMessage(message) {
    const type = message.type;
    const payload = message.payload;
    const peerId = message.src;
    switch (type) {
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Open:
        this._lastServerId = this.id;
        this._open = true;
        this.emit("open", this.id);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Error:
        this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, payload.msg);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.IdTaken:
        this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.UnavailableID, `ID "${this.id}" is taken`);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.InvalidKey:
        this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.InvalidKey, `API KEY "${this._options.key}" is invalid`);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Leave:
        $257947e92926277a$export$2e2bcd8739ae039.log(`Received leave message from ${peerId}`);
        this._cleanupPeer(peerId);
        this._connections.delete(peerId);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Expire:
        this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.PeerUnavailable, `Could not connect to peer ${peerId}`);
        break;
      case $78455e22dea96b8c$export$adb4a1754da6f10d.Offer: {
        const connectionId = payload.connectionId;
        let connection = this.getConnection(peerId, connectionId);
        if (connection) {
          connection.close();
          $257947e92926277a$export$2e2bcd8739ae039.warn(`Offer received for existing Connection ID:${connectionId}`);
        }
        if (payload.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media) {
          const mediaConnection = new $5c1d08c7c57da9a3$export$4a84e95a2324ac29(peerId, this, {
            connectionId,
            _payload: payload,
            metadata: payload.metadata
          });
          connection = mediaConnection;
          this._addConnection(peerId, connection);
          this.emit("call", mediaConnection);
        } else if (payload.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Data) {
          const dataConnection = new this._serializers[payload.serialization](peerId, this, {
            connectionId,
            _payload: payload,
            metadata: payload.metadata,
            label: payload.label,
            serialization: payload.serialization,
            reliable: payload.reliable
          });
          connection = dataConnection;
          this._addConnection(peerId, connection);
          this.emit("connection", dataConnection);
        } else {
          $257947e92926277a$export$2e2bcd8739ae039.warn(`Received malformed connection type:${payload.type}`);
          return;
        }
        const messages = this._getMessages(connectionId);
        for (const message2 of messages) connection.handleMessage(message2);
        break;
      }
      default: {
        if (!payload) {
          $257947e92926277a$export$2e2bcd8739ae039.warn(`You received a malformed message from ${peerId} of type ${type}`);
          return;
        }
        const connectionId = payload.connectionId;
        const connection = this.getConnection(peerId, connectionId);
        if (connection && connection.peerConnection)
          connection.handleMessage(message);
        else if (connectionId)
          this._storeMessage(connectionId, message);
        else $257947e92926277a$export$2e2bcd8739ae039.warn("You received an unrecognized message:", message);
        break;
      }
    }
  }
  /** Stores messages without a set up connection, to be claimed later. */
  _storeMessage(connectionId, message) {
    if (!this._lostMessages.has(connectionId)) this._lostMessages.set(connectionId, []);
    this._lostMessages.get(connectionId).push(message);
  }
  /**
  * Retrieve messages from lost message store
  * @internal
  */
  //TODO Change it to private
  _getMessages(connectionId) {
    const messages = this._lostMessages.get(connectionId);
    if (messages) {
      this._lostMessages.delete(connectionId);
      return messages;
    }
    return [];
  }
  /**
  * Connects to the remote peer specified by id and returns a data connection.
  * @param peer The brokering ID of the remote peer (their {@apilink Peer.id}).
  * @param options for specifying details about Peer Connection
  */
  connect(peer, options = {}) {
    options = {
      serialization: "default",
      ...options
    };
    if (this.disconnected) {
      $257947e92926277a$export$2e2bcd8739ae039.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available.");
      this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Disconnected, "Cannot connect to new Peer after disconnecting from server.");
      return;
    }
    const dataConnection = new this._serializers[options.serialization](peer, this, options);
    this._addConnection(peer, dataConnection);
    return dataConnection;
  }
  /**
  * Calls the remote peer specified by id and returns a media connection.
  * @param peer The brokering ID of the remote peer (their peer.id).
  * @param stream The caller's media stream
  * @param options Metadata associated with the connection, passed in by whoever initiated the connection.
  */
  call(peer, stream, options = {}) {
    if (this.disconnected) {
      $257947e92926277a$export$2e2bcd8739ae039.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect.");
      this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Disconnected, "Cannot connect to new Peer after disconnecting from server.");
      return;
    }
    if (!stream) {
      $257947e92926277a$export$2e2bcd8739ae039.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");
      return;
    }
    const mediaConnection = new $5c1d08c7c57da9a3$export$4a84e95a2324ac29(peer, this, {
      ...options,
      _stream: stream
    });
    this._addConnection(peer, mediaConnection);
    return mediaConnection;
  }
  /** Add a data/media connection to this peer. */
  _addConnection(peerId, connection) {
    $257947e92926277a$export$2e2bcd8739ae039.log(`add connection ${connection.type}:${connection.connectionId} to peerId:${peerId}`);
    if (!this._connections.has(peerId)) this._connections.set(peerId, []);
    this._connections.get(peerId).push(connection);
  }
  //TODO should be private
  _removeConnection(connection) {
    const connections = this._connections.get(connection.peer);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index !== -1) connections.splice(index, 1);
    }
    this._lostMessages.delete(connection.connectionId);
  }
  /** Retrieve a data/media connection for this peer. */
  getConnection(peerId, connectionId) {
    const connections = this._connections.get(peerId);
    if (!connections) return null;
    for (const connection of connections) {
      if (connection.connectionId === connectionId) return connection;
    }
    return null;
  }
  _delayedAbort(type, message) {
    setTimeout(() => {
      this._abort(type, message);
    }, 0);
  }
  /**
  * Emits an error message and destroys the Peer.
  * The Peer is not destroyed if it's in a disconnected state, in which case
  * it retains its disconnected state and its existing connections.
  */
  _abort(type, message) {
    $257947e92926277a$export$2e2bcd8739ae039.error("Aborting!");
    this.emitError(type, message);
    if (!this._lastServerId) this.destroy();
    else this.disconnect();
  }
  /**
  * Destroys the Peer: closes all active connections as well as the connection
  * to the server.
  *
  * :::caution
  * This cannot be undone; the respective peer object will no longer be able
  * to create or receive any connections, its ID will be forfeited on the server,
  * and all of its data and media connections will be closed.
  * :::
  */
  destroy() {
    if (this.destroyed) return;
    $257947e92926277a$export$2e2bcd8739ae039.log(`Destroy peer with ID:${this.id}`);
    this.disconnect();
    this._cleanup();
    this._destroyed = true;
    this.emit("close");
  }
  /** Disconnects every connection on this peer. */
  _cleanup() {
    for (const peerId of this._connections.keys()) {
      this._cleanupPeer(peerId);
      this._connections.delete(peerId);
    }
    this.socket.removeAllListeners();
  }
  /** Closes all connections to this peer. */
  _cleanupPeer(peerId) {
    const connections = this._connections.get(peerId);
    if (!connections) return;
    for (const connection of connections) connection.close();
  }
  /**
  * Disconnects the Peer's connection to the PeerServer. Does not close any
  *  active connections.
  * Warning: The peer can no longer create or accept connections after being
  *  disconnected. It also cannot reconnect to the server.
  */
  disconnect() {
    if (this.disconnected) return;
    const currentId = this.id;
    $257947e92926277a$export$2e2bcd8739ae039.log(`Disconnect peer with ID:${currentId}`);
    this._disconnected = true;
    this._open = false;
    this.socket.close();
    this._lastServerId = currentId;
    this._id = null;
    this.emit("disconnected", currentId);
  }
  /** Attempts to reconnect with the same ID.
  *
  * Only {@apilink Peer.disconnect | disconnected peers} can be reconnected.
  * Destroyed peers cannot be reconnected.
  * If the connection fails (as an example, if the peer's old ID is now taken),
  * the peer's existing connections will not close, but any associated errors events will fire.
  */
  reconnect() {
    if (this.disconnected && !this.destroyed) {
      $257947e92926277a$export$2e2bcd8739ae039.log(`Attempting reconnection to server with ID ${this._lastServerId}`);
      this._disconnected = false;
      this._initialize(this._lastServerId);
    } else if (this.destroyed) throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");
    else if (!this.disconnected && !this.open)
      $257947e92926277a$export$2e2bcd8739ae039.error("In a hurry? We're still trying to make the initial connection!");
    else throw new Error(`Peer ${this.id} cannot reconnect because it is not disconnected from the server!`);
  }
  /**
  * Get a list of available peer IDs. If you're running your own server, you'll
  * want to set allow_discovery: true in the PeerServer options. If you're using
  * the cloud server, email team@peerjs.com to get the functionality enabled for
  * your key.
  */
  listAllPeers(cb = (_) => {
  }) {
    this._api.listAllPeers().then((peers) => cb(peers)).catch((error) => this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, error));
  }
}
var $dd0187d7f28e386f$export$2e2bcd8739ae039 = $416260bce337df90$export$ecd1fc136c422448;
const SEND_RATE = 1 / 60;
class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.myId = null;
    this.remotePeers = {};
    this.username = "";
    this.isHost = false;
    this.connected = false;
    this.onStatus = null;
    this.onSeedReceived = null;
    this.terrainSeed = null;
    this._sendTimer = 0;
  }
  // ── Init as host ──────────────────────────────────────────────────────────
  host(username, onMyId) {
    this.username = username;
    this.isHost = true;
    this._onMyId = onMyId || null;
    this._createPeer(null);
  }
  join(hostId, username, onMyId) {
    this.username = username;
    this.isHost = false;
    this._onMyId = onMyId || null;
    this._createPeer(hostId);
  }
  _createPeer(connectToId) {
    this._status("Connecting to signaling server…");
    try {
      this.peer = new $dd0187d7f28e386f$export$2e2bcd8739ae039(void 0, { debug: 1 });
    } catch (e) {
      this._status(`PeerJS init failed: ${e.message || e}`);
      return;
    }
    this.peer.on("open", (id) => {
      this.myId = id;
      if (this._onMyId) this._onMyId(id);
      if (connectToId) {
        this._status(`Got ID ${id} — connecting to host ${connectToId}…`);
        this._connectTo(connectToId);
      } else {
        this._status(`Hosting! Share this ID: ${id}`);
      }
    });
    this.peer.on("connection", (conn) => {
      this._setupConn(conn);
      this._status(`Player connected!`);
      conn.on("open", () => {
        if (this.terrainSeed !== null) {
          try {
            conn.send({ type: "seed", seed: this.terrainSeed });
          } catch (_) {
          }
        }
      });
    });
    this.peer.on("error", (err) => {
      this._status(`Error: ${err.message || err.type}`);
    });
  }
  _connectTo(peerId) {
    const conn = this.peer.connect(peerId, { reliable: false, serialization: "json" });
    this._setupConn(conn);
  }
  _setupConn(conn) {
    const peerId = conn.peer;
    conn.on("open", () => {
      this.connected = true;
      if (!this.remotePeers[peerId]) {
        this.remotePeers[peerId] = { state: null, username: "?", color: "#ffffff", lastSeen: 0, conn };
      } else {
        this.remotePeers[peerId].conn = conn;
      }
      this._status("Connected!");
    });
    conn.on("data", (data) => {
      if (!data || !data.type) return;
      if (data.type === "seed") {
        if (!this.isHost && this.onSeedReceived) this.onSeedReceived(data.seed);
        return;
      }
      if (!this.remotePeers[peerId]) {
        this.remotePeers[peerId] = { state: null, username: "?", lastSeen: 0, conn };
      }
      const remote = this.remotePeers[peerId];
      remote.lastSeen = Date.now();
      if (data.type === "state") {
        remote.state = data.bike;
        remote.username = data.username || "?";
        remote.chassisName = data.chassisName || "Bike_Chassis_1";
        if (remote.state) remote.state.chassisName = remote.chassisName;
        if (this.isHost) {
          for (const [otherId, other] of Object.entries(this.remotePeers)) {
            if (otherId !== peerId && other.conn && other.conn.open) {
              try {
                other.conn.send({ ...data, type: "relayed", fromPeer: peerId });
              } catch (_) {
              }
            }
          }
        }
      } else if (data.type === "relayed") {
        const fromId = data.fromPeer;
        if (!this.remotePeers[fromId]) {
          this.remotePeers[fromId] = { state: null, username: "?", chassisName: "Bike_Chassis_1", lastSeen: 0, conn: null };
        }
        const r2 = this.remotePeers[fromId];
        r2.state = data.bike;
        r2.username = data.username || "?";
        r2.chassisName = data.chassisName || "Bike_Chassis_1";
        if (r2.state) r2.state.chassisName = r2.chassisName;
        r2.lastSeen = Date.now();
      }
    });
    conn.on("close", () => {
      this.connected = Object.values(this.remotePeers).some((p) => p.conn && p.conn.open);
      delete this.remotePeers[peerId];
      this._status("Peer disconnected");
    });
    conn.on("error", (err) => {
      this._status(`Conn error: ${err}`);
    });
  }
  // ── Send local bike state ─────────────────────────────────────────────────
  sendState(bike, dt) {
    this._sendTimer -= dt;
    if (this._sendTimer > 0) return;
    this._sendTimer = SEND_RATE;
    if (!this.connected) return;
    const msg = {
      type: "state",
      username: this.username,
      chassisName: this.chassisName || "Bike_Chassis_1",
      bike: {
        x: bike.x,
        y: bike.y,
        vx: bike.vx,
        vy: bike.vy,
        angle: bike.angle,
        angularVel: bike.angularVel,
        fSuspLen: bike.fSuspLen,
        rSuspLen: bike.rSuspLen,
        fWheelSpin: bike.fWheelSpin,
        rWheelSpin: bike.rWheelSpin,
        crashed: bike.crashed,
        wheeling: bike.wheeling,
        stoppie: bike.stoppie,
        riderLean: bike.riderLean,
        facingRight: bike.facingRight,
        wheelBase: bike.wheelBase,
        wheelRad: bike.wheelRad
      }
    };
    for (const remote of Object.values(this.remotePeers)) {
      if (remote.conn && remote.conn.open) {
        try {
          remote.conn.send(msg);
        } catch (_) {
        }
      }
    }
  }
  // ── Get list of remote bike states for rendering, with smoothing + extrapolation
  getRemoteBikes() {
    const now = Date.now();
    const out = [];
    for (const p of Object.values(this.remotePeers)) {
      if (!p.state || now - p.lastSeen >= 3e3) continue;
      const s = p.state;
      const dt = Math.min(0.25, (now - p.lastSeen) / 1e3);
      const angle = (s.angle || 0) + (s.angularVel || 0) * dt;
      const target = {
        ...s,
        x: s.x + (s.vx || 0) * dt,
        y: s.y + (s.vy || 0) * dt,
        angle
      };
      if (!p.display) {
        p.display = { ...target };
      } else {
        const lerpDt = Math.max(0, (now - (p._lastRenderTime || now)) / 1e3);
        const k = 1 - Math.exp(-12 * lerpDt);
        p.display.x += (target.x - p.display.x) * k;
        p.display.y += (target.y - p.display.y) * k;
        let da = target.angle - p.display.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        p.display.angle += da * (1 - Math.exp(-10 * lerpDt));
        for (const key of ["fSuspLen", "rSuspLen", "fWheelSpin", "rWheelSpin", "riderLean"]) {
          if (typeof target[key] === "number") {
            p.display[key] = (p.display[key] || 0) + (target[key] - (p.display[key] || 0)) * k;
          }
        }
        p.display.crashed = target.crashed;
        p.display.wheeling = target.wheeling;
        p.display.stoppie = target.stoppie;
        p.display.facingRight = target.facingRight;
        p.display.wheelBase = target.wheelBase;
        p.display.wheelRad = target.wheelRad;
        p.display.chassisName = target.chassisName;
      }
      p._lastRenderTime = now;
      out.push({ ...p.display, username: p.username });
    }
    return out;
  }
  destroy() {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {
      }
    }
    this.peer = null;
    this.conn = null;
    this.remotePeers = {};
    this.connected = false;
  }
  _status(msg) {
    console.log("[MP]", msg);
    if (this.onStatus) this.onStatus(msg);
  }
}
const PX_PER_M = 30;
const CHASSIS_SPRITES$1 = [
  "Bike_Chassis_1",
  "Bike_Chassis_2",
  "Bike_Chassis_3",
  "Bike_Chassis_4",
  "Bike_Chassis_5",
  "Bike_Chassis_6",
  "Bike_Chassis_7",
  "Bike_Chassis_8"
];
const GameCanvas = function GameCanvas2({ mapName, mpConfig, inputRef, chassisIdx, username }) {
  const canvasRef = reactExports.useRef(null);
  const gameRef = reactExports.useRef(null);
  const animRef = reactExports.useRef(null);
  const isMobileRef = reactExports.useRef(
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
  const initGame = reactExports.useCallback((canvas) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    const input = new InputManager();
    input.init();
    const camera = new Camera(canvas.width, canvas.height);
    const terrain = new Terrain(mapName || "enduro");
    const spawnY = terrain.getHeightAt(300) - 2.5 * PX_PER_M;
    const bike = new Bike(300, spawnY);
    const particles = new ParticleSystem();
    const props = new PropsManager(terrain);
    const chassisName = CHASSIS_SPRITES$1[(chassisIdx || 0) % CHASSIS_SPRITES$1.length];
    const renderer = new Renderer(ctx, camera, chassisName);
    const editor = new TrackEditor(terrain);
    camera.x = bike.x;
    camera.y = bike.y;
    if (inputRef) inputRef.current = input;
    let mp = null;
    if (mpConfig && mpConfig.mode !== "solo") {
      mp = new MultiplayerManager();
      mp.onStatus = mpConfig.onStatus || (() => {
      });
      mp.chassisName = CHASSIS_SPRITES$1[(chassisIdx || 0) % CHASSIS_SPRITES$1.length];
      if (mpConfig.mode === "host") {
        mp.terrainSeed = terrain.seed;
        mp.host(mpConfig.username, mpConfig.onMyId);
      } else if (mpConfig.mode === "join") {
        mp.onSeedReceived = (seed) => {
          terrain.seed = seed;
          terrain.chunks.clear();
          terrain.obstacles = [];
          terrain.ramps = [];
          terrain.scenery = [];
          terrain.ruts = [];
          terrain._ensureChunks(0, 6);
          const sy = terrain.getHeightAt(300) - 2.5 * PX_PER_M;
          bike.reset(300, sy);
        };
        mp.join(mpConfig.joinId, mpConfig.username, mpConfig.onMyId);
      }
    }
    const game = {
      input,
      camera,
      terrain,
      bike,
      particles,
      props,
      renderer,
      editor,
      mp,
      ctx,
      canvas,
      lastTime: performance.now(),
      fpsFrames: 0,
      fpsAccum: 0,
      fps: 60,
      running: true,
      bikeColor: "#ffffff",
      username: username || "Rider"
    };
    gameRef.current = game;
    return game;
  }, [mapName, chassisIdx, username, mpConfig]);
  const loop = reactExports.useCallback((game) => {
    if (!game.running) return;
    const now = performance.now();
    const dt = Math.min((now - game.lastTime) / 1e3, 0.05);
    game.lastTime = now;
    game.fpsFrames++;
    game.fpsAccum += dt;
    if (game.fpsAccum >= 1) {
      game.fps = Math.round(game.fpsFrames / game.fpsAccum);
      game.fpsFrames = 0;
      game.fpsAccum = 0;
    }
    game.terrain.update(game.bike.x);
    game.bike.update(dt, game.input, game.terrain, game.particles, game.camera);
    game.props.update(dt, game.bike);
    game.props.checkRamp(game.bike);
    game.particles.update(dt);
    game.camera.follow(game.bike, dt);
    if (game.mp) game.mp.sendState(game.bike, dt);
    const { canvas, renderer, bike, terrain, props: p, particles: ps, camera } = game;
    const w = canvas.width, h = canvas.height;
    renderer.clear(w, h);
    renderer.drawSky(w, h);
    renderer.drawParallaxBG(w, h);
    renderer.drawTerrain(terrain);
    renderer.drawProps(p);
    renderer.drawBike(bike, game.bikeColor, game.username);
    ps.draw(game.ctx, camera);
    if (game.mp) {
      for (const rb of game.mp.getRemoteBikes()) {
        renderer.drawBike(rb, "#ffffff", rb.username || "?");
      }
    }
    renderer.drawHUD(bike, w, h, game.fps, false, isMobileRef.current);
    animRef.current = requestAnimationFrame(() => loop(game));
  }, []);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = initGame(canvas);
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      game.camera.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", onResize);
    animRef.current = requestAnimationFrame(() => loop(game));
    return () => {
      game.running = false;
      game.input.destroy();
      if (game.mp) game.mp.destroy();
      window.removeEventListener("resize", onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initGame, loop]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "canvas",
    {
      ref: canvasRef,
      className: "block w-full h-full",
      style: { cursor: "none", touchAction: "none" }
    }
  );
};
function ControlsOverlay() {
  const [visible, setVisible] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6e3);
    const handleKey = () => setVisible(false);
    window.addEventListener("keydown", handleKey, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: visible && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-black/60 backdrop-blur-md rounded-xl px-8 py-5 border border-white/10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-8 items-start", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 justify-center mb-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "W" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/30 text-xs self-center", children: "/" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "↑" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[11px] font-body tracking-wide", children: "THROTTLE" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 justify-center mb-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "S" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/30 text-xs self-center", children: "/" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "↓" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[11px] font-body tracking-wide", children: "BRAKE" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 justify-center mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "A" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[11px] font-body tracking-wide", children: "WHEELIE" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 justify-center mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "D" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[11px] font-body tracking-wide", children: "STOPPIE" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 justify-center mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { label: "R" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[11px] font-body tracking-wide", children: "RESPAWN" })
    ] })
  ] }) }) }) });
}
function Key({ label, wide }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center justify-center ${wide ? "px-3" : "w-8"} h-8 
      bg-white/10 border border-white/20 rounded-md text-white/80 text-xs font-heading font-semibold
      shadow-[0_2px_0_rgba(255,255,255,0.05)]`, children: label });
}
function MobileControls({ inputRef, crashed }) {
  const joystickRef = reactExports.useRef(null);
  const joystickTouch = reactExports.useRef(null);
  const joystickPos = reactExports.useRef({ x: 0, y: 0 });
  const setKey = reactExports.useCallback((code, down) => {
    const input = inputRef?.current;
    if (!input) return;
    if (down && !input.keys[code]) input.justPressed[code] = true;
    input.keys[code] = down;
  }, [inputRef]);
  const clearMovement = reactExports.useCallback(() => {
    ["ArrowUp", "KeyW", "ArrowDown", "KeyS", "ArrowLeft", "KeyA", "ArrowRight", "KeyD"].forEach((k) => setKey(k, false));
  }, [setKey]);
  const applyJoystick = reactExports.useCallback((dx, dy) => {
    const DEAD = 0.18;
    setKey("ArrowLeft", dx < -DEAD);
    setKey("KeyA", dx < -DEAD);
    setKey("ArrowRight", dx > DEAD);
    setKey("KeyD", dx > DEAD);
    setKey("ArrowUp", dy < -DEAD);
    setKey("KeyW", dy < -DEAD);
    setKey("ArrowDown", dy > DEAD);
    setKey("KeyS", dy > DEAD);
  }, [setKey]);
  const onJoystickStart = reactExports.useCallback((e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joystickTouch.current = { id: t.identifier, startX: t.clientX, startY: t.clientY };
  }, []);
  const onJoystickMove = reactExports.useCallback((e) => {
    e.preventDefault();
    if (!joystickTouch.current) return;
    const t = [...e.touches].find((t2) => t2.identifier === joystickTouch.current.id);
    if (!t) return;
    const RADIUS = 55;
    let dx = (t.clientX - joystickTouch.current.startX) / RADIUS;
    let dy = (t.clientY - joystickTouch.current.startY) / RADIUS;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    joystickPos.current = { x: dx, y: dy };
    applyJoystick(dx, dy);
    const knob = joystickRef.current?.querySelector(".joystick-knob");
    if (knob) {
      knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
    }
  }, [applyJoystick]);
  const onJoystickEnd = reactExports.useCallback((e) => {
    e.preventDefault();
    if (!joystickTouch.current) return;
    const stillActive = [...e.touches].some((t) => t.identifier === joystickTouch.current.id);
    if (!stillActive) {
      joystickTouch.current = null;
      joystickPos.current = { x: 0, y: 0 };
      clearMovement();
      const knob = joystickRef.current?.querySelector(".joystick-knob");
      if (knob) knob.style.transform = "translate(0,0)";
    }
  }, [clearMovement]);
  const handleRespawn = reactExports.useCallback((e) => {
    e.preventDefault();
    setKey("KeyR", true);
    setTimeout(() => setKey("KeyR", false), 80);
  }, [setKey]);
  const handleWheelieTap = reactExports.useCallback((e) => {
    e.preventDefault();
    const input = inputRef?.current;
    if (input) input.wheelieModeActive = !input.wheelieModeActive;
  }, [inputRef]);
  reactExports.useEffect(() => {
    const el = joystickRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onJoystickStart, { passive: false });
    el.addEventListener("touchmove", onJoystickMove, { passive: false });
    el.addEventListener("touchend", onJoystickEnd, { passive: false });
    el.addEventListener("touchcancel", onJoystickEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onJoystickStart);
      el.removeEventListener("touchmove", onJoystickMove);
      el.removeEventListener("touchend", onJoystickEnd);
      el.removeEventListener("touchcancel", onJoystickEnd);
    };
  }, [onJoystickStart, onJoystickMove, onJoystickEnd]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "absolute inset-0 pointer-events-none z-20",
      style: { touchAction: "none" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: joystickRef,
            className: "pointer-events-auto absolute",
            style: {
              bottom: "env(safe-area-inset-bottom, 24px)",
              left: "env(safe-area-inset-left, 24px)",
              marginBottom: 24,
              marginLeft: 24,
              width: 120,
              height: 120,
              touchAction: "none"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "2px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(4px)"
              } }),
              [
                { label: "▲", top: "4px", left: "50%", transform: "translateX(-50%)" },
                { label: "▼", bottom: "4px", left: "50%", transform: "translateX(-50%)" },
                { label: "◀", left: "4px", top: "50%", transform: "translateY(-50%)" },
                { label: "▶", right: "4px", top: "50%", transform: "translateY(-50%)" }
              ].map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
                position: "absolute",
                ...a,
                fontSize: 10,
                color: "rgba(255,255,255,0.25)",
                lineHeight: 1,
                pointerEvents: "none"
              }, children: a.label }, a.label)),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "joystick-knob", style: {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 44,
                height: 44,
                marginTop: -22,
                marginLeft: -22,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35), rgba(255,255,255,0.1))",
                border: "2px solid rgba(255,255,255,0.3)",
                transition: "transform 0.05s ease",
                pointerEvents: "none"
              } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
                position: "absolute",
                top: "-20px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                whiteSpace: "nowrap",
                fontFamily: "Rajdhani, sans-serif",
                letterSpacing: "0.08em"
              }, children: "GAS / LEAN" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "pointer-events-auto absolute flex flex-col gap-3 items-end",
            style: {
              bottom: "env(safe-area-inset-bottom, 24px)",
              right: "env(safe-area-inset-right, 24px)",
              marginBottom: 24,
              marginRight: 24,
              touchAction: "none"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ActionBtn,
                {
                  label: "WHEEL",
                  sublabel: "IE",
                  color: "rgba(255,160,50,0.85)",
                  bg: "rgba(200,100,20,0.18)",
                  border: "rgba(255,160,50,0.35)",
                  onTouchStart: handleWheelieTap,
                  onTouchEnd: () => {
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ActionBtn,
                {
                  label: "R",
                  sublabel: "SPAWN",
                  color: "rgba(255,210,60,0.9)",
                  bg: "rgba(220,160,20,0.18)",
                  border: "rgba(255,210,60,0.35)",
                  onTouchStart: handleRespawn,
                  onTouchEnd: () => {
                  },
                  onTouchCancel: () => {
                  },
                  pulse: crashed
                }
              )
            ]
          }
        )
      ]
    }
  );
}
function ActionBtn({ label, sublabel, color, bg, border, onTouchStart, onTouchEnd, onTouchCancel, pulse }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      style: {
        width: 68,
        height: 68,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        boxShadow: pulse ? `0 0 18px ${color}` : "none",
        transition: "box-shadow 0.4s ease",
        userSelect: "none",
        WebkitUserSelect: "none"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color, fontSize: 18, fontWeight: 700, fontFamily: '"Barlow Condensed", sans-serif', lineHeight: 1 }, children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: color.replace("0.9", "0.5").replace("0.85", "0.5"), fontSize: 9, fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.08em", marginTop: 2 }, children: sublabel })
      ]
    }
  );
}
function useIsMobile() {
  const [isMobile, setIsMobile] = reactExports.useState(
    () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
  reactExports.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
const CHASSIS_SPRITES = [
  "Bike_Chassis_1",
  "Bike_Chassis_2",
  "Bike_Chassis_3",
  "Bike_Chassis_4",
  "Bike_Chassis_5",
  "Bike_Chassis_6",
  "Bike_Chassis_7",
  "Bike_Chassis_8"
];
function Game() {
  const [screen, setScreen] = reactExports.useState("lobby");
  const [mapName, setMapName] = reactExports.useState("enduro");
  const isMobile = useIsMobile();
  const inputRef = reactExports.useRef(null);
  const [username, setUsername] = reactExports.useState(() => (typeof window !== "undefined" ? localStorage.getItem("db_username") : "") || "");
  const [chassisIdx, setChassisIdx] = reactExports.useState(() => parseInt((typeof window !== "undefined" ? localStorage.getItem("db_chassis") : "0") || "0"));
  const [mpMode, setMpMode] = reactExports.useState("solo");
  const [joinId, setJoinId] = reactExports.useState("");
  const [mpStatus, setMpStatus] = reactExports.useState("");
  const [myPeerId, setMyPeerId] = reactExports.useState("");
  reactExports.useEffect(() => {
    localStorage.setItem("db_username", username);
  }, [username]);
  reactExports.useEffect(() => {
    localStorage.setItem("db_chassis", String(chassisIdx));
  }, [chassisIdx]);
  const handlePlay = () => {
    if (!username.trim()) {
      alert("Enter a username first!");
      return;
    }
    if (mpMode === "join" && !joinId.trim()) {
      alert("Paste the host Peer ID to join!");
      return;
    }
    setScreen("playing");
  };
  const mpConfig = reactExports.useMemo(() => ({
    mode: mpMode,
    joinId: joinId.trim(),
    username: username.trim() || "Rider",
    onStatus: setMpStatus,
    onMyId: setMyPeerId
  }), [joinId, mpMode, username]);
  if (screen === "playing") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-black overflow-hidden select-none", style: { touchAction: "none" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        GameCanvas,
        {
          mapName,
          mpConfig,
          inputRef,
          chassisIdx,
          username: username.trim() || "Rider"
        }
      ),
      !isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx(ControlsOverlay, {}),
      isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileControls, { inputRef }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-3 right-3 z-30 flex gap-2 items-start", children: [
        mpMode !== "solo" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-black/70 border border-white/20 rounded px-3 py-1 text-xs font-mono text-green-400 max-w-[260px]", children: mpMode === "host" && myPeerId ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-white/40 text-[10px] mb-0.5", children: "YOUR PEER ID (share this)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-white font-bold break-all select-text", children: myPeerId })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: mpStatus || "Starting multiplayer…" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setScreen("lobby"),
            className: "px-3 py-1 rounded font-bold text-xs tracking-widest border-2 bg-amber-500 border-amber-300 text-black hover:bg-amber-400",
            style: { minHeight: 36, touchAction: "none" },
            children: "MENU"
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black overflow-hidden flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 overflow-y-auto max-h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-white font-bold text-3xl tracking-widest", children: "DIRTBIKE" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-white/60 text-xs tracking-widest uppercase mb-2 block", children: "Username" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: username,
          onChange: (e) => setUsername(e.target.value),
          placeholder: "Enter username…",
          maxLength: 16,
          className: "w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-amber-400"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-white/60 text-xs tracking-widest uppercase mb-2 block", children: "Bike Skin" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto pb-2", children: CHASSIS_SPRITES.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setChassisIdx(i),
          className: "flex-shrink-0 w-20 h-14 rounded-lg border-2 bg-white/5 overflow-hidden flex items-center justify-center transition-all active:scale-95",
          style: { borderColor: chassisIdx === i ? "#F59E0B" : "rgba(255,255,255,0.15)" },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: `/sprites/${s}.png`,
              alt: `skin ${i + 1}`,
              className: "max-w-full max-h-full object-contain",
              style: { imageRendering: "pixelated" }
            }
          )
        },
        i
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-white/60 text-xs tracking-widest uppercase mb-2 block", children: "Map" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: [["enduro", "Enduro"], ["road", "Road"]].map(([m, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setMapName(m),
          className: "flex-1 py-3 rounded-lg border-2 text-white font-bold text-sm tracking-wide transition-all active:scale-95",
          style: {
            borderColor: mapName === m ? "#F59E0B" : "rgba(255,255,255,0.2)",
            background: mapName === m ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)"
          },
          children: label
        },
        m
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-white/60 text-xs tracking-widest uppercase mb-2 block", children: "Multiplayer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 mb-3", children: [["solo", "Solo"], ["host", "Host"], ["join", "Join"]].map(([m, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setMpMode(m);
            setMpStatus("");
          },
          className: "flex-1 py-3 rounded-lg border-2 text-white font-bold text-xs tracking-wide transition-all active:scale-95",
          style: {
            borderColor: mpMode === m ? "#4ADE80" : "rgba(255,255,255,0.2)",
            background: mpMode === m ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)"
          },
          children: label
        },
        m
      )) }),
      mpMode === "host" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/50 text-xs", children: "Host a session — your Peer ID appears in-game. Share it with friends." }),
      mpMode === "join" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-white/60 text-xs mb-1 block", children: "Host's Peer ID" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: joinId,
            onChange: (e) => setJoinId(e.target.value),
            placeholder: "Paste host ID here…",
            className: "w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-green-400"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/40 text-xs mt-1", children: "Host shares their ID after clicking RIDE" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: handlePlay,
        className: "w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xl tracking-widest transition-all active:scale-95",
        children: "RIDE"
      }
    )
  ] }) });
}
function Index() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Game, {});
}
export {
  Index as component
};
