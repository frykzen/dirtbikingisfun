// Infinite procedural terrain — generates chunks dynamically as bike moves
const PX_PER_M = 30;

const SEG_W    = 12;   // finer segments for smoother hills
const CHUNK_W  = 1200; // px per chunk (100 segments)
const LOOKAHEAD = 3;   // chunks ahead to keep generated
const LOOKBEHIND = 2;  // chunks behind to keep (for backtracking)

// Deterministic "hash" noise — so same chunk always looks the same
function noise(x, seed) {
  let h = (x * 127.1 + seed * 311.7) | 0;
  h = ((h ^ (h >> 16)) * 0x45d9f3b) | 0;
  h = ((h ^ (h >> 16)) * 0x45d9f3b) | 0;
  h = (h ^ (h >> 16)) | 0;
  return (h & 0xffff) / 0xffff;  // 0..1
}

// Smooth interpolated noise
function smoothNoise(x, seed, scale) {
  const ix = Math.floor(x / scale);
  const fx = (x / scale) - ix;
  const t  = fx * fx * (3 - 2 * fx);  // smoothstep
  const a  = noise(ix,     seed) * 2 - 1;
  const b  = noise(ix + 1, seed) * 2 - 1;
  return a + (b - a) * t;
}

// Multi-octave noise height at world x
function terrainHeight(x, seed) {
  const BASE_Y = 420;
  let h = 0;
  // Octave 1: broad sweeping hills
  h += smoothNoise(x, seed,        800) * 70;
  // Octave 2: medium bumps
  h += smoothNoise(x, seed + 100,  300) * 28;
  // Octave 3: small bumps and whoops
  h += smoothNoise(x, seed + 200,  100) * 10;
  // Octave 4: micro roughness
  h += smoothNoise(x, seed + 300,   35) * 3.5;

  // Clamp gently with soft limits
  const y = BASE_Y + h;
  if (y < 160) return 160 + (y - 160) * 0.3;
  if (y > 580) return 580 + (y - 580) * 0.3;
  return y;
}

function surfaceType(x, seed) {
  const v = noise(Math.floor(x / 200), seed + 999);
  if (v < 0.45) return 'dirt';
  if (v < 0.60) return 'mud';
  if (v < 0.75) return 'rock';
  return 'sand';
}

// Road map: gentle rolling asphalt with slight undulation
function roadHeight(x) {
  const BASE_Y = 440;
  let h = 0;
  h += Math.sin(x * 0.0008) * 18;   // very long gentle roll
  h += Math.sin(x * 0.003 + 1) * 6; // small bumps
  h += Math.sin(x * 0.015) * 2;     // micro roughness
  const y = BASE_Y + h;
  return Math.max(300, Math.min(560, y));
}

export default class Terrain {
  constructor(mapName = 'enduro') {
    this.mapName   = mapName;
    this.seed      = Math.random() * 9999 | 0;
    this.chunks    = new Map();   // chunkIndex → { segs, surfaceTypes }
    this.ruts      = [];
    this.obstacles = [];
    this.ramps     = [];
    this.scenery   = [];

    // Pre-generate starting chunks
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

    // Prune very distant chunks to save memory
    for (const key of this.chunks.keys()) {
      if (key < lo - 2 || key > hi + 2) this.chunks.delete(key);
    }
  }

  _generateChunk(ci) {
    const startX = ci * CHUNK_W;
    const endX   = startX + CHUNK_W;
    const segs   = [];
    const types  = [];

    // Flat start zone
    const flatEnd = 700;

    for (let x = startX; x < endX; x += SEG_W) {
      let y, surfT;
      if (this.mapName === 'road') {
        y = roadHeight(x);
        surfT = 'road';
      } else if (x < flatEnd) {
        const blend = Math.max(0, Math.min(1, (x - 300) / 400));
        y = 420 * (1 - blend) + terrainHeight(x, this.seed) * blend;
        surfT = 'dirt';
      } else {
        y = terrainHeight(x, this.seed);
        surfT = surfaceType(x, this.seed);
      }
      segs.push({ x, y: Math.round(y * 4) / 4 });
      types.push(surfT);
    }

    this.chunks.set(ci, { segs, types });

    // Obstacles disabled
    // if (ci >= 1) this._generateObstaclesForChunk(ci, startX, endX);

    // Ramps disabled
    // if (ci >= 1) this._generateRampsForChunk(ci, startX, endX);

    // Generate scenery
    this._generateSceneryForChunk(ci, startX, endX);
  }

  _generateRampsForChunk(ci, startX, endX) {
    const rng = (n) => noise(ci * 53 + n, this.seed + 777);
    // ~40% chance of a ramp per chunk, max 1 per chunk (was 1-2)
    if (rng(99) > 0.4) return;
    const x = startX + 400 + rng(0) * 500;
    if (x >= endX - 200) return;
    const w     = (2.0 + rng(1) * 1.5) * PX_PER_M;
    const h     = (0.6 + rng(2) * 0.9) * PX_PER_M;
    const slope = this.getSlopeAngle(x);
    const y0    = this.getHeightAt(x);
    const ytip  = this.getHeightAt(x + w);
    this.ramps.push({
      x,
      y: y0,
      tipX: x + w,
      tipY: ytip - h,
      width: w,
      height: h,
      terrainSlope: slope,
      chunk: ci,
    });
  }

  _generateSceneryForChunk(ci, startX, endX) {
    const rng = (n) => noise(ci * 71 + n, this.seed + 1234);
    let x = startX + rng(0) * 120;
    let idx = 0;
    while (x < endX) {
      const r = rng(idx + 10);
      const gndY = this.getHeightAt(x);
      if (this.mapName === 'road') {
        // Road scenery: lamp posts, road signs, guardrails
        if (r < 0.40) {
          this.scenery.push({ type: 'lamppost', x, y: gndY, h: 70 + rng(idx+20)*10, chunk: ci });
        } else if (r < 0.65) {
          this.scenery.push({ type: 'roadsign', x, y: gndY, h: 45 + rng(idx+21)*15, chunk: ci });
        } else if (r < 0.80) {
          this.scenery.push({ type: 'pine', x, y: gndY, h: 50 + rng(idx+22)*40, chunk: ci });
        }
        x += 200 + rng(idx + 30) * 400; // wider spacing on road
      } else {
        if (r < 0.30) {
          const h = 60 + rng(idx + 20) * 80;
          this.scenery.push({ type: 'pine', x, y: gndY, h, chunk: ci });
        } else if (r < 0.50) {
          const h = 40 + rng(idx + 21) * 50;
          this.scenery.push({ type: 'deadtree', x, y: gndY, h, chunk: ci });
        } else if (r < 0.62) {
          const sz = 12 + rng(idx + 22) * 20;
          this.scenery.push({ type: 'rock', x, y: gndY, sz, chunk: ci });
        } else if (r < 0.70) {
          const h = 25 + rng(idx + 23) * 30;
          this.scenery.push({ type: 'cactus', x, y: gndY, h, chunk: ci });
        } else if (r < 0.82) {
          // Cluster of flowers
          for (let fi = 0; fi < 4; fi++) {
            const fx = x + (rng(idx + 40 + fi) - 0.5) * 60;
            const fgndY = this.getHeightAt(fx);
            const sz = 5 + rng(idx + 50 + fi) * 7;
            this.scenery.push({ type: 'flower', x: fx, y: fgndY, sz, chunk: ci });
          }
        } else if (r < 0.90) {
          // Extra pine cluster
          const h2 = 50 + rng(idx + 25) * 60;
          this.scenery.push({ type: 'pine', x: x + 40, y: this.getHeightAt(x + 40), h: h2 * 0.8, chunk: ci });
        }
        x += 80 + rng(idx + 30) * 200;
      }
      idx++;
    }
  }

  _generateObstaclesForChunk(ci, startX, endX) {
    // Use deterministic placement based on chunk index
    const rng = (n) => noise(ci * 37 + n, this.seed + 500);
    const types = ['log', 'rockBoulder', 'mudHole', 'bump', 'doubleJump'];

    let x = startX + 200 + rng(0) * 400;
    let placed = 0;
    while (x < endX - 150 && placed < 4) {
      const spacing = 350 + rng(placed + 10) * 600;
      const gndY    = this.getHeightAt(x);
      const ti      = Math.floor(rng(placed + 20) * types.length);
      const type    = types[ti];

      if (type === 'log') {
        this.obstacles.push({ type: 'log', x, y: gndY - 10, radius: 10, color: '#5C3A18', chunk: ci });
      } else if (type === 'rockBoulder') {
        const sz = 18 + rng(placed + 30) * 22;
        this.obstacles.push({ type: 'rockBoulder', x, y: gndY - sz * 0.5, size: sz, color: '#6A6560', chunk: ci });
      } else if (type === 'mudHole') {
        this.obstacles.push({ type: 'mudHole', x, y: gndY, width: 80 + rng(placed + 40) * 80, depth: 14 + rng(placed + 50) * 10, color: '#3A2E1E', chunk: ci });
      } else if (type === 'bump') {
        this.obstacles.push({ type: 'bump', x: x - 40, y: gndY, height: 20 + rng(placed + 60) * 20, width: 40, chunk: ci });
        this.obstacles.push({ type: 'bump', x: x + 30, y: gndY - 5, height: 18 + rng(placed + 70) * 18, width: 35, chunk: ci });
      } else if (type === 'doubleJump') {
        this.obstacles.push({ type: 'doubleJump', x, y: gndY, totalWidth: 200, peakHeight: 40 + rng(placed + 80) * 30, chunk: ci });
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
    // If chunk not loaded, generate it immediately
    if (!this.chunks.has(ci)) this._generateChunk(ci);

    const chunk = this.chunks.get(ci);
    const segs  = chunk.segs;

    // Binary search within chunk
    const relX = x - ci * CHUNK_W;
    let lo = 0, hi = segs.length - 2;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if      (x < segs[mid].x)       hi = mid - 1;
      else if (x >= segs[mid + 1]?.x) lo = mid + 1;
      else {
        const s = segs[mid], n = segs[mid + 1];
        if (!n) return s.y;
        const t = (x - s.x) / (n.x - s.x);
        return s.y + (n.y - s.y) * t;
      }
    }

    // Fallback: cross-chunk interpolation
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
    const dx = SEG_W;
    const y1 = this.getHeightAt(x - dx);
    const y2 = this.getHeightAt(x + dx);
    return Math.atan2(y2 - y1, dx * 2);
  }

  getNormalAt(x) {
    const a = this.getSlopeAngle(x);
    return { x: -Math.sin(a), y: Math.cos(a) };
  }

  getSurfaceAt(x) {
    if (x < 700) return 'dirt';
    if (this.mapName === 'road') return 'road';
    return surfaceType(x, this.seed);
  }

  getFriction(t) {
    return { dirt: 0.82, mud: 0.44, rock: 0.92, sand: 0.52 }[t] || 0.80;
  }

  getSpeedMult(t) {
    return { dirt: 1.0, mud: 0.65, rock: 0.88, sand: 0.72 }[t] || 1.0;
  }

  addRut(x, y, depth) {
    this.ruts.push({ x, y, depth, w: 7 + Math.random() * 5 });
    if (this.ruts.length > 400) this.ruts.shift();
  }

  // Called every frame with current bike X position
  update(bikeX) {
    this._ensureChunks(bikeX);
    // Prune old obstacles for cleaned-up chunks
    const minX = (this._chunkIndex(bikeX) - LOOKBEHIND - 2) * CHUNK_W;
    const maxX = (this._chunkIndex(bikeX) + LOOKAHEAD + 3) * CHUNK_W;
    this.obstacles = this.obstacles.filter(o => o.x > minX && o.x < maxX);
    this.ramps     = this.ramps.filter(r => r.x > minX && r.x < maxX);
    this.scenery   = this.scenery.filter(s => s.x > minX && s.x < maxX);
    this.ruts      = this.ruts.filter(r => Math.abs(r.x - bikeX) < 3000);
  }

  // ── Legacy compat (used by renderer) ──────────────────────────────────────
  _segIndex(x) {
    const segs = this.segments;
    let lo = 0, hi = segs.length - 2;
    if (!segs.length) return -1;
    if (x < segs[0].x || x > segs[hi + 1].x) return -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (x < segs[mid].x) hi = mid - 1;
      else if (x >= segs[mid + 1]?.x) lo = mid + 1;
      else return mid;
    }
    return lo;
  }
}
