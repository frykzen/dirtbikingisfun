const PX_PER_M = 30;
const SEG_W = 12;

const ALL_CHASSIS = [
  'Bike_Chassis_1','Bike_Chassis_2','Bike_Chassis_3','Bike_Chassis_4',
  'Bike_Chassis_5','Bike_Chassis_6','Bike_Chassis_7','Bike_Chassis_8',
];

export default class Renderer {
  constructor(ctx, camera, chassisName = 'Bike_Chassis_1') {
    this.ctx    = ctx;
    this.camera = camera;
    this.chassisName = chassisName;
    this._sprites = {};
    this._loadSprites();
    this._pixelSize = 3;
    this.ctx.imageSmoothingEnabled = false;
  }

  _loadSprites() {
    const names = [...ALL_CHASSIS, 'Bike_Chain_Back','Bike_Suspension_Front_2','Wheel_Type_1'];
    names.forEach(name => {
      const img = new Image();
      img.src = `/sprites/${name}.png`;
      img.onload = () => { this._sprites[name] = img; };
    });
  }

  clear(w, h) {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, w, h);
  }

  // ── PIXELATED SKY with bright daylight ─────────────────────────────────────
  drawSky(w, h, tod) {
    const ctx = this.ctx;
    // Bright daytime sky — big pixel blocks for sky gradient
    const px = 32; // pixel block size for sky
    const cols = Math.ceil(w / px);
    const rows = Math.ceil(h * 0.7 / px);

    // Sky palette — bright blues
    const skyTop = '#5BA8E8';
    const skyMid = '#7EC8F0';
    const skyBot = '#A8DCFA';

    for (let row = 0; row < rows; row++) {
      const t = row / rows;
      const r = Math.round(0x5B + (0xA8 - 0x5B) * t);
      const g = Math.round(0xA8 + (0xDC - 0xA8) * t);
      const b = Math.round(0xE8 + (0xFA - 0xE8) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, row * px, w, px);
    }

    // Sun — big bright pixel square (no circles = pixel art)
    const sunX = Math.floor(w * 0.72 / px) * px;
    const sunY = Math.floor(h * 0.06 / px) * px;
    const sunS = px * 3;
    // Sun glow — blocky rings
    ctx.fillStyle = 'rgba(255,250,180,0.35)';
    ctx.fillRect(sunX - sunS, sunY - sunS, sunS * 3, sunS * 3);
    ctx.fillStyle = 'rgba(255,245,150,0.55)';
    ctx.fillRect(sunX - px, sunY - px, sunS, sunS);
    ctx.fillStyle = '#FFEE44';
    ctx.fillRect(sunX, sunY, sunS - px, sunS - px);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sunX + 4, sunY + 4, px, px);

    // Sun rays — pixel dashes radiating out
    ctx.fillStyle = 'rgba(255,240,120,0.45)';
    const rayLen = px * 4;
    const rayW   = 4;
    // Cardinal rays
    ctx.fillRect(sunX + px * 0.5,  sunY - rayLen, rayW, rayLen);
    ctx.fillRect(sunX + px * 0.5,  sunY + sunS,   rayW, rayLen);
    ctx.fillRect(sunX - rayLen,     sunY + px * 0.5, rayLen, rayW);
    ctx.fillRect(sunX + sunS,       sunY + px * 0.5, rayLen, rayW);
    // Diagonal rays
    ctx.save();
    ctx.translate(sunX + px, sunY + px);
    for (let a = 45; a < 360; a += 90) {
      ctx.save();
      ctx.rotate(a * Math.PI / 180);
      ctx.fillRect(-rayW/2, -rayLen * 1.2, rayW, rayLen * 0.8);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── PARALLAX BACKGROUND ─────────────────────────────────────────────────────
  drawParallaxBG(w, h) {
    // Far pixel mountains
    this._drawPixelMountains(w, h, 0.06, h * 0.38, '#6A8AAA', '#7A9ABB', 120, 60);
    // Mid pixel hills
    this._drawPixelMountains(w, h, 0.18, h * 0.50, '#4A7840', '#5A8A50', 70, 35);
    // Pixel clouds
    this._drawPixelClouds(w, h, 0.025);
    // Near pixel treeline — placed ON the mid-hill silhouette so they don't float
    this._drawPixelTreeLine(w, h, 0.18, h * 0.50, 70, 35);
  }

  _drawPixelClouds(w, h, parallax) {
    const ctx = this.ctx;
    const cx  = this.camera.x * parallax;
    const cloudData = [
      { ox: 0,    oy: h * 0.08, w: 96,  hh: 32 },
      { ox: 900,  oy: h * 0.05, w: 128, hh: 40 },
      { ox: 1800, oy: h * 0.10, w: 80,  hh: 28 },
      { ox: 2900, oy: h * 0.06, w: 112, hh: 36 },
      { ox: 4000, oy: h * 0.09, w: 96,  hh: 30 },
      { ox: 5200, oy: h * 0.04, w: 140, hh: 44 },
    ];
    const px = 8; // cloud pixel size
    for (const c of cloudData) {
      const tileW = 5800;
      const baseX = ((c.ox - cx) % tileW + tileW) % tileW;
      const sx = baseX * (w / tileW);
      // Draw blocky pixel cloud
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx,            c.oy,         c.w,      c.hh);
      ctx.fillRect(sx + px,       c.oy - px,    c.w - px * 2, px);
      ctx.fillRect(sx + px * 2,   c.oy - px*2,  c.w - px * 4, px);
      ctx.fillStyle = '#E8F4FF';
      ctx.fillRect(sx + px,       c.oy + px,    c.w - px * 2, px * 2);
      ctx.fillStyle = 'rgba(200,220,240,0.6)';
      ctx.fillRect(sx - px,       c.oy + px,    px, c.hh - px);
      ctx.fillRect(sx + c.w,      c.oy + px,    px, c.hh - px);
    }
  }

  _drawPixelMountains(w, h, parallax, baseY, col1, col2, amp1, amp2) {
    const ctx = this.ctx;
    const cx  = this.camera.x * parallax;
    const px  = 8; // mountain pixel step

    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    // Step in px increments for pixel art look
    for (let sx = 0; sx <= w + px; sx += px) {
      const wx = sx + cx;  // pure screen position + parallax offset
      const hy = amp1 * Math.sin(wx * 0.006) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 0.003 + 1.5);
      // Snap to px grid for pixel art
      const snappedY = Math.round((baseY - hy) / px) * px;
      ctx.lineTo(Math.round(sx / px) * px, snappedY);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Highlight top edges
    ctx.fillStyle = col2;
    for (let sx = 0; sx <= w + px; sx += px) {
      const wx = sx + cx;
      const hy = amp1 * Math.sin(wx * 0.006) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 0.003 + 1.5);
      const snappedY = Math.round((baseY - hy) / px) * px;
      ctx.fillRect(Math.round(sx / px) * px, snappedY, px, px * 2);
    }
  }

  _drawPixelTreeLine(w, h, parallax, baseY, amp1 = 70, amp2 = 35) {
    const ctx = this.ctx;
    const cx  = this.camera.x * parallax;
    const px  = 8;

    // Sample the same silhouette as the mid-mountain layer so trees ride on the hills
    const hillY = (sx) => {
      const wx = sx + cx;
      const hy = amp1 * Math.sin(wx * 0.006) + amp2 * Math.sin(wx * 0.013) + amp1 * 0.3 * Math.sin(wx * 0.003 + 1.5);
      return Math.round((baseY - hy) / px) * px;
    };

    const treeSpacing = px * 6;
    for (let sx = -treeSpacing * 2; sx <= w + treeSpacing * 2; sx += treeSpacing) {
      const wx   = sx + cx;
      const slot = Math.floor(wx / treeSpacing);
      const n    = Math.abs(Math.sin(slot * 127.1 + 1.7));
      // Skip ~25% of slots so the ridgeline isn't a solid wall
      if (Math.abs(Math.sin(slot * 53.7)) < 0.25) continue;
      const th   = Math.round((24 + n * 32) / px) * px;
      const tx   = Math.round(sx / px) * px;
      const ty   = hillY(sx) + px; // sit on the hill silhouette (slight overlap)

      const dark  = '#1A4020';
      const mid   = '#2A5830';
      const light = '#3A7040';

      // Trunk
      ctx.fillStyle = '#3A2010';
      ctx.fillRect(tx - px/2, ty - px*2, px, px*2);

      // Tapered pixel-pine: triangular silhouette, narrow at top → wide at bottom
      const tiers = 5;
      for (let i = 0; i < tiers; i++) {
        const ty0 = ty - th + Math.round((i * th) / tiers);
        const layerH = Math.ceil(th / tiers);
        const halfW = (i + 1) * px;
        ctx.fillStyle = i === 0 ? light : (i % 2 === 0 ? mid : dark);
        ctx.fillRect(tx - halfW, ty0, halfW * 2, layerH);
        // Top highlight pixel
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

    // Pixel art surface colors — brighter, more saturated
    const surfCol  = { dirt:'#8B6040', mud:'#5A4830', rock:'#8A8078', sand:'#C8B870', road:'#6A6A7A' };
    const subCol   = { dirt:'#5A3820', mud:'#3A2A18', rock:'#585450', sand:'#9A8840', road:'#3A3A48' };
    const topCol   = { dirt:'#6A8A40', mud:'#4A5A28', rock:'#9A9488', sand:'#D8C888', road:'#82828E' };
    // Grass/surface top tint
    const grassCol = { dirt:'#5A9A30', mud:'#3A5A20', rock:'#909888', sand:'#C8B870', road:'#7A7A8A' };

    const segs = terrain.segments;

    // Ground fill — snapped to pixel grid
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i], n = segs[i+1];
      if (n.x < L || s.x > R) continue;
      const surf = terrain.surfaceTypes[i] || 'dirt';

      // Subsurface
      ctx.fillStyle = subCol[surf] || '#3A2E1A';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(n.x, n.y);
      ctx.lineTo(n.x, n.y + 500); ctx.lineTo(s.x, s.y + 500);
      ctx.fill();

      // Surface layer (~20px)
      ctx.fillStyle = surfCol[surf] || '#8B6040';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(n.x, n.y);
      ctx.lineTo(n.x, n.y + 20); ctx.lineTo(s.x, s.y + 20);
      ctx.fill();

      // Grass top layer (bright green strip)
      if (surf === 'dirt') {
        ctx.fillStyle = '#4AA830';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 4); ctx.lineTo(n.x, n.y - 4);
        ctx.lineTo(n.x, n.y + 4); ctx.lineTo(s.x, s.y + 4);
        ctx.fill();
        // Pixel art grass tufts
        if (Math.floor(s.x / SEG_W) % 3 === 0) {
          ctx.fillStyle = '#5AC838';
          ctx.fillRect(s.x,          s.y - 7, 2, 4);
          ctx.fillRect(s.x + SEG_W/3, s.y - 9, 2, 6);
          ctx.fillRect(s.x + SEG_W*0.7, s.y - 6, 2, 3);
        }
      }

      // Pixel surface detail per type
      if (surf === 'rock') {
        // Crack lines
        ctx.fillStyle = 'rgba(60,55,50,0.5)';
        if (Math.floor(s.x / SEG_W) % 4 === 0) {
          ctx.fillRect(s.x, s.y + 2, 4, 2);
          ctx.fillRect(s.x + 6, s.y + 5, 3, 2);
        }
        ctx.fillStyle = 'rgba(160,155,148,0.4)';
        ctx.fillRect(s.x, s.y - 2, SEG_W, 2);
      }
      if (surf === 'sand') {
        ctx.fillStyle = '#E8D880';
        ctx.fillRect(s.x, s.y - 3, SEG_W, 3);
        if (Math.floor(s.x / SEG_W) % 5 === 0) {
          ctx.fillStyle = '#F0E890';
          ctx.fillRect(s.x + 2, s.y - 1, 3, 2);
        }
      }
      if (surf === 'road') {
        ctx.fillStyle = '#787888';
        ctx.fillRect(s.x, s.y - 2, SEG_W, 2);
        // Dashes
        if (Math.floor(s.x / 80) % 2 === 0) {
          ctx.fillStyle = '#F8E848';
          ctx.fillRect(s.x, s.y - 4, SEG_W, 3);
        }
        // Shoulder
        ctx.fillStyle = '#D8D8E0';
        ctx.fillRect(s.x, s.y, SEG_W, 2);
      }
    }

    // Pixel shadow/shader on terrain — dark pixel row at surface transition
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i], n = segs[i+1];
      if (n.x < L || s.x > R) continue;
      // Shadow pixel row just below top
      ctx.fillRect(s.x, s.y + 4, SEG_W, 3);
    }

    // Ruts
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

      if (ob.type === 'log') {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const r = ob.radius;
        // Pixel log — rectangular blocks
        ctx.fillStyle = '#7A4E28';
        ctx.fillRect(-r * 3, -r, r * 6, r * 2);
        // Bark pixel lines
        ctx.fillStyle = '#4A2A0A';
        for (let k = -2; k <= 2; k++) {
          ctx.fillRect(k * r * 0.9, -r, 2, r * 2);
        }
        // End cap
        ctx.fillStyle = '#9A6838';
        ctx.fillRect(-r * 3 - r * 0.5, -r * 0.8, r * 0.5, r * 1.6);
        // Top highlight
        ctx.fillStyle = '#9A6838';
        ctx.fillRect(-r * 3, -r, r * 6, r * 0.4);
        ctx.restore();

      } else if (ob.type === 'rockBoulder') {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const s = ob.size;
        const px = Math.max(4, Math.round(s / 6));
        // Pixel rock — grid of rectangles
        ctx.fillStyle = '#6A6560';
        ctx.fillRect(-s * 0.7, -s * 0.9, s * 1.4, s * 0.9);
        // Pixel highlight top
        ctx.fillStyle = '#8A8480';
        ctx.fillRect(-s * 0.5, -s * 0.9, s * 0.8, px);
        ctx.fillRect(-s * 0.6, -s * 0.8, px, px);
        // Shadow side
        ctx.fillStyle = '#4A4540';
        ctx.fillRect(s * 0.4, -s * 0.7, s * 0.3, s * 0.7);
        ctx.restore();

      } else if (ob.type === 'mudHole') {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const hw = ob.width / 2, d = ob.depth;
        ctx.fillStyle = '#3A2A18';
        ctx.fillRect(-hw, 0, hw * 2, d);
        // Pixel mud sheen
        ctx.fillStyle = 'rgba(80,60,30,0.6)';
        ctx.fillRect(-hw * 0.7, d * 0.4, hw * 1.4, d * 0.3);
        ctx.fillStyle = 'rgba(120,100,60,0.3)';
        ctx.fillRect(-hw * 0.3, d * 0.5, hw * 0.6, d * 0.15);
        ctx.restore();

      } else if (ob.type === 'bump') {
        ctx.save();
        ctx.translate(ob.x, ob.y);
        const hw = ob.width / 2, bh = ob.height;
        // Pixel bump — stepped shape
        const steps = 6;
        ctx.fillStyle = '#6A5030';
        for (let si = 0; si < steps; si++) {
          const t0 = si / steps, t1 = (si + 1) / steps;
          const x0 = -hw + t0 * hw;
          const x1 = -hw + t1 * hw;
          const y0 = -bh * Math.sin(t0 * Math.PI);
          const y1 = -bh * Math.sin(t1 * Math.PI);
          ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y0 - y1) + 8);
        }
        // Right side mirror
        for (let si = 0; si < steps; si++) {
          const t0 = si / steps, t1 = (si + 1) / steps;
          const x0 = hw * t0;
          const x1 = hw * t1;
          const y0 = -bh * Math.sin((1 - t0) * Math.PI);
          const y1 = -bh * Math.sin((1 - t1) * Math.PI);
          ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y0 - y1) + 8);
        }
        // Top highlight
        ctx.fillStyle = '#8A7050';
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
      // Always use fresh terrain height — prevents floating on hills
      const freshY = terrain ? terrain.getHeightAt(s.x) : s.y;
      ctx.translate(s.x, freshY);
      // Tilt scenery to match terrain slope so trees don't clip into hills
      if (terrain && (s.type === 'pine' || s.type === 'deadtree' || s.type === 'cactus' || s.type === 'lamppost' || s.type === 'roadsign')) {
        const slope = terrain.getSlopeAngle(s.x);
        // Clamp tilt so trees aren't horizontal on steep cliffs
        ctx.rotate(Math.max(-0.45, Math.min(0.45, slope * 0.7)));
      }


      if (s.type === 'pine') {
        const h = s.h;
        const u = Math.max(2, Math.round(h / 22));
        // Trunk — taller, visible base
        ctx.fillStyle = '#5A3818';
        ctx.fillRect(-u, 0, u * 2, -Math.round(h * 0.18));
        ctx.fillStyle = '#3A2008';
        ctx.fillRect(-u, -Math.round(h * 0.16), u, Math.round(h * 0.16));

        // Tapered conifer silhouette — stacked tiers that widen toward base
        const greens = ['#1E6010', '#2A8018', '#3AA020', '#4ABC28'];
        const foliageH = h * 0.85;
        const tiers = 6;
        for (let i = 0; i < tiers; i++) {
          const t01 = i / tiers;             // 0 at top
          const tNext = (i + 1) / tiers;
          // Width grows toward bottom but stays pixel-snapped
          const halfW = Math.max(u, Math.round((u * 1.2 + t01 * u * 4)));
          const yTop = -Math.round(foliageH * (1 - t01)) - Math.round(h * 0.16);
          const yBot = -Math.round(foliageH * (1 - tNext)) - Math.round(h * 0.16);
          const tierH = Math.max(u, yBot - yTop);
          const col = greens[Math.min(greens.length - 1, Math.floor(t01 * greens.length))];
          ctx.fillStyle = col;
          ctx.fillRect(-halfW, yTop, halfW * 2, tierH);
          // Step/shadow on left under each tier ledge
          if (i < tiers - 1) {
            const nextHalfW = Math.max(u, Math.round((u * 1.2 + tNext * u * 4)));
            ctx.fillStyle = greens[Math.max(0, Math.floor(t01 * greens.length) - 1)];
            ctx.fillRect(-nextHalfW, yBot - u, u, u);
            ctx.fillRect(nextHalfW - u, yBot - u, u, u);
          }
          // Highlight slash on top-right
          ctx.fillStyle = greens[Math.min(greens.length - 1, Math.floor(t01 * greens.length) + 1)];
          ctx.fillRect(-halfW + u, yTop, halfW - u, u);
        }
        // Pointed tip
        ctx.fillStyle = greens[0];
        ctx.fillRect(-u, -Math.round(foliageH) - Math.round(h * 0.16) - u, u * 2, u);
        // Snow cap
        ctx.fillStyle = '#E8F4FF';
        ctx.fillRect(-u, -Math.round(foliageH) - Math.round(h * 0.16) - u, u * 2, Math.max(1, Math.round(u * 0.5)));

      } else if (s.type === 'deadtree') {
        const h = s.h;
        const tw = Math.max(3, Math.round(h * 0.07));
        ctx.fillStyle = '#3A2818';
        ctx.fillRect(-tw, -h, tw * 2, h);
        // Highlight
        ctx.fillStyle = '#5A4030';
        ctx.fillRect(-tw, -h, tw * 0.5, h * 0.7);
        // Pixel branches
        const bw = Math.max(2, Math.round(h * 0.04));
        ctx.fillStyle = '#3A2818';
        ctx.fillRect(-h*0.30, -h*0.82, h*0.30, bw);
        ctx.fillRect(0,        -h*0.80, h*0.24, bw);
        ctx.fillRect(-h*0.15, -h*0.95, h*0.15, bw);
        ctx.fillRect(0,        -h*0.96, h*0.13, bw);
        // Brighter branch tops
        ctx.fillStyle = '#5A4030';
        ctx.fillRect(-h*0.30, -h*0.82, h*0.10, bw * 0.5);

      } else if (s.type === 'lamppost') {
        const h = s.h;
        const pw = 5;
        // Pixel pole — dark metal
        ctx.fillStyle = '#505060';
        ctx.fillRect(-pw/2, -h, pw, h);
        ctx.fillStyle = '#707080';
        ctx.fillRect(-pw/2, -h, 2, h);
        // Arm
        ctx.fillStyle = '#505060';
        ctx.fillRect(-pw/2, -h, pw + 20, pw);
        // Lamp box — bright yellow
        ctx.fillStyle = '#404050';
        ctx.fillRect(18, -h - 12, 16, 12);
        ctx.fillStyle = '#FFEE44';
        ctx.fillRect(20, -h - 10, 12, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(21, -h - 9, 5, 5);
        // Glow — pixel square
        ctx.fillStyle = 'rgba(255,240,100,0.25)';
        ctx.fillRect(12, -h - 16, 28, 20);

      } else if (s.type === 'roadsign') {
        const h = s.h;
        ctx.fillStyle = '#606070';
        ctx.fillRect(-3, -h, 6, h);
        ctx.fillStyle = '#808090';
        ctx.fillRect(-3, -h, 2, h * 0.8);
        // Sign — bright pixel art
        ctx.fillStyle = '#E83020';
        ctx.fillRect(-16, -h - 22, 32, 22);
        // White border (1 pixel)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-14, -h - 20, 28, 18);
        ctx.fillStyle = '#E83020';
        ctx.fillRect(-10, -h - 18, 20, 14);
        // STOP letters (simple pixels)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-8, -h - 16, 4, 2); // S
        ctx.fillRect(-8, -h - 14, 4, 2);
        ctx.fillRect(-8, -h - 12, 4, 2);
        ctx.fillRect(-2, -h - 16, 4, 10); // T
        ctx.fillRect(-4, -h - 16, 8, 2);

      } else if (s.type === 'rock') {
        const sz = s.sz;
        const px = Math.max(3, Math.round(sz / 5));
        // Pixel rock — blocky
        ctx.fillStyle = '#6A6560';
        ctx.fillRect(-sz * 0.75, -sz, sz * 1.5, sz);
        ctx.fillStyle = '#888480';
        ctx.fillRect(-sz * 0.5, -sz, sz, px);  // top highlight row
        ctx.fillRect(-sz * 0.75, -sz, px, sz);  // left highlight
        ctx.fillStyle = '#4A4540';
        ctx.fillRect(sz * 0.35, -sz * 0.7, sz * 0.4, sz * 0.7);  // shadow
        // Pixel specular dot
        ctx.fillStyle = '#B0ACA8';
        ctx.fillRect(-sz * 0.4, -sz * 0.85, px, px);

      } else if (s.type === 'cactus') {
        const h = s.h;
        const tw = Math.max(4, Math.round(h * 0.12));
        // Main stem — pixel blocks
        ctx.fillStyle = '#2A7028';
        ctx.fillRect(-tw, -h, tw * 2, h);
        ctx.fillStyle = '#3A9038';
        ctx.fillRect(-tw, -h, tw * 0.5, h); // highlight
        // Left arm — pixel L shape
        ctx.fillStyle = '#2A7028';
        ctx.fillRect(-h * 0.5, -h * 0.65, h * 0.45, tw);
        ctx.fillRect(-h * 0.5, -h * 0.9, tw, h * 0.28);
        // Right arm
        ctx.fillRect(tw, -h * 0.5, h * 0.38, tw);
        ctx.fillRect(h * 0.38, -h * 0.68, tw, h * 0.2);
        // Pixel spines
        ctx.fillStyle = '#E8D880';
        for (let i = 0; i < 4; i++) {
          const sy = -h * 0.2 * (i + 1);
          ctx.fillRect(-tw - 4, sy, 4, 2);
          ctx.fillRect(tw,      sy, 4, 2);
        }

      } else if (s.type === 'flower') {
        // Extra: pixel flowers
        const sz = s.sz || 8;
        const colors = ['#FF4488', '#FF8800', '#FFEE00', '#FF2266'];
        const col = colors[Math.floor(Math.abs(s.x * 0.07) % colors.length)];
        // Stem
        ctx.fillStyle = '#3A8018';
        ctx.fillRect(-1, 0, 2, -sz);
        // Petals (pixel cross)
        ctx.fillStyle = col;
        ctx.fillRect(-sz * 0.6, -sz * 1.2, sz * 1.2, sz * 0.4); // H
        ctx.fillRect(-sz * 0.2, -sz * 1.6, sz * 0.4, sz * 1.2); // V
        // Center
        ctx.fillStyle = '#FFEE44';
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

      // Pixel ramp — stepped blocks
      const steps = 8;
      for (let si = 0; si < steps; si++) {
        const t0 = si / steps, t1 = (si + 1) / steps;
        const x0 = bx + (tx - bx) * t0;
        const x1 = bx + (tx - bx) * t1;
        const y0 = by + (ty - by) * t0;
        const y1 = by + (ty - by) * t1;
        const shade = Math.round(180 - si * 15);
        ctx.fillStyle = `rgb(${Math.round(shade*0.55)},${Math.round(shade*0.42)},${Math.round(shade*0.22)})`;
        ctx.fillRect(x0, y0, x1 - x0 + 1, by - y0 + 4);
      }
      // Top surface highlight
      ctx.fillStyle = '#C8A870';
      ctx.beginPath();
      ctx.moveTo(bx, by - 2); ctx.lineTo(tx, ty - 2);
      ctx.lineTo(tx, ty + 2); ctx.lineTo(bx, by + 2);
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

      if (p.type === 'ramp') {
        // Pixel stepped ramp
        const steps = 5;
        for (let si = 0; si < steps; si++) {
          const t = si / steps;
          const px2 = -p.width/2 + t * p.width;
          const py2 = -p.height * t;
          ctx.fillStyle = si % 2 === 0 ? '#9A8060' : '#7A6040';
          ctx.fillRect(px2, py2, p.width / steps + 1, p.height * (1 - t) + 4);
        }
        ctx.fillStyle = '#C8A870';
        ctx.fillRect(-p.width/2, 0, p.width, 3);
      } else if (p.type === 'barrel') {
        const r = p.radius;
        const px2 = Math.round(r);
        // Pixel barrel
        ctx.fillStyle = '#C8601A';
        ctx.fillRect(-px2, -px2, px2 * 2, px2 * 2);
        ctx.fillStyle = '#884010';
        ctx.fillRect(-px2, -px2, 3, px2 * 2);
        ctx.fillRect(px2 - 3, -px2, 3, px2 * 2);
        ctx.fillStyle = '#888';
        ctx.fillRect(-px2, -px2 * 0.7, px2 * 2, 3);
        ctx.fillRect(-px2,  px2 * 0.4,  px2 * 2, 3);
        // Top highlight
        ctx.fillStyle = '#E08030';
        ctx.fillRect(-px2 + 3, -px2, px2 * 2 - 6, 3);
      } else if (p.type === 'crate') {
        ctx.fillStyle = '#C8A060';
        ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
        ctx.fillStyle = '#A88040';
        ctx.fillRect(-p.width/2, -p.height/2, 3, p.height);
        ctx.fillRect(p.width/2-3, -p.height/2, 3, p.height);
        ctx.fillRect(-p.width/2, -p.height/2, p.width, 3);
        ctx.fillRect(-p.width/2, p.height/2-3, p.width, 3);
        ctx.fillStyle = '#E8C880';
        ctx.fillRect(-p.width/2+3, -p.height/2+3, 5, 5);
        ctx.fillRect(p.width/2-8, p.height/2-8, 5, 5);
      } else if (p.type === 'tire') {
        const r = Math.round(p.radius);
        ctx.fillStyle = '#282828';
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.fillStyle = '#181818';
        ctx.fillRect(-Math.round(r*0.55), -Math.round(r*0.55), Math.round(r*1.1), Math.round(r*1.1));
        // Pixel spokes
        ctx.fillStyle = '#444';
        ctx.fillRect(-r, -2, r * 2, 4);
        ctx.fillRect(-2, -r, 4, r * 2);
      }
      ctx.restore();
    }
    cam.restore(ctx);
  }

  // ── BIKE ──────────────────────────────────────────────────────────────────
  drawBike(bike, bikeColor = '#E8640A', username = null) {
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

    const hb  = bike.wheelBase !== undefined ? bike.wheelBase / 2 : 18.75;
    const wr  = bike.wheelRad  !== undefined ? bike.wheelRad  : 6.9;
    const fSL = bike.fSuspLen  !== undefined ? bike.fSuspLen  : wr;
    const rSL = bike.rSuspLen  !== undefined ? bike.rSuspLen  : wr;

    const sChain   = this._sprites['Bike_Chain_Back'];
    const sChassis = this._sprites[bike.chassisName || this.chassisName];
    const sFork    = this._sprites['Bike_Suspension_Front_2'];
    const sWheel   = this._sprites['Wheel_Type_1'];

    const sc  = (hb * 2) / 65;
    const cw  = 77 * sc;
    const ch  = 36 * sc;
    const chassisLeft = -hb - 6 * sc;
    const chassisTop  = -18 * sc;

    this._drawSpriteWheel(ctx, sWheel, -hb, rSL, wr, bike.rWheelSpin);

    // Rear swingarm
    {
      const pivotX = -hb * 0.3;
      const pivotY = -wr * 0.3;
      const axleX  = -hb;
      const axleY  = rSL;
      const legLen = Math.sqrt((axleX - pivotX) ** 2 + (axleY - pivotY) ** 2);
      const legAng = Math.atan2(axleY - pivotY, axleX - pivotX);
      const legW   = Math.max(4, wr * 0.22);

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(legAng);
      ctx.fillStyle = '#9098a8';
      ctx.fillRect(0, -legW * 0.38, legLen, legW * 0.76);
      ctx.fillStyle = 'rgba(220,230,240,0.35)';
      ctx.fillRect(2, -legW * 0.28, legLen - 4, legW * 0.22);
      ctx.fillStyle = '#707888';
      ctx.fillRect(legLen - legW * 0.52, -legW * 0.52, legW * 1.04, legW * 1.04);
      ctx.fillStyle = '#707888';
      ctx.fillRect(-legW * 0.45, -legW * 0.45, legW * 0.9, legW * 0.9);

      ctx.restore();
    }

    if (sChain && sChain.complete) {
      const fromX = -hb * 0.3;
      const fromY = wr * 0.1;
      const toX   = -hb;
      const toY   = rSL;
      const cLen  = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      const cAng  = Math.atan2(toY - fromY, toX - fromX);
      const cH    = Math.max(4, wr * 0.18);
      ctx.save();
      ctx.translate(fromX, fromY);
      ctx.rotate(cAng);
      ctx.drawImage(sChain, 0, -cH * 0.5, cLen, cH);
      ctx.restore();
    }

    // Front wheel drawn BEFORE fork so fork renders on top (wheel behind suspension)
    this._drawSpriteWheel(ctx, sWheel, hb, fSL, wr, bike.fWheelSpin);

    // Draw chassis FIRST so rear/bottom is behind fork
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, chassisLeft, chassisTop, cw, ch);
    }

    // Front fork — clipped to only show below fender (chassisTop + ch covers the fender area)
    {
      const forkTopX = chassisLeft + 58 * sc;
      const forkTopY = chassisTop  + 4 * sc;
      const forkBotX = hb;
      const forkBotY = fSL;
      const fullLen  = Math.sqrt((forkBotX - forkTopX) ** 2 + (forkBotY - forkTopY) ** 2);
      const legAng   = Math.atan2(forkBotY - forkTopY, forkBotX - forkTopX);
      const legW     = Math.max(5, wr * 0.38);

      // Clip: only render fork below the fender bottom (chassisTop + ch * 0.72)
      const fenderBottom = chassisTop + ch * 0.43;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-hb * 3, fenderBottom, hb * 6, fSL + wr * 2);
      ctx.clip();

      if (sFork && sFork.complete) {
        ctx.save();
        ctx.translate(forkTopX, forkTopY);
        ctx.rotate(legAng - Math.PI / 2);
        ctx.scale(-1, 1);  // flip so fork faces correct direction
        ctx.drawImage(sFork, -legW / 2, 0, legW, fullLen);
        ctx.restore();
      } else {
        ctx.strokeStyle = '#8090A0';
        ctx.lineWidth = Math.max(3, legW * 0.5);
        ctx.beginPath();
        ctx.moveTo(forkTopX, forkTopY);
        ctx.lineTo(forkBotX, forkBotY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Chassis drawn again on top to cover fork where it meets the headstock/fender
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, chassisLeft, chassisTop, cw, ch);
    }

    this._drawRagdollRider(ctx, bike);

    ctx.restore();

    // Draw username label above bike (in world space, before cam.restore)
    if (username) {
      const sc2 = (hb * 2) / 65;
      ctx.save();
      ctx.translate(bike.x, bike.y - wr * 3 - 14 * sc2);
      const labelW = username.length * 7 + 14;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
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

      // Motion-blur smoothing: draw ghost copies at ±offsets with low alpha
      // so spokes blend smoothly instead of strobing at high spin rates
      const BLUR_STEPS = 4;
      const BLUR_SPREAD = Math.PI / 6; // 30° spread

      ctx.rotate(snapSpin);
      for (let i = BLUR_STEPS; i >= 1; i--) {
        const off = (i / BLUR_STEPS) * BLUR_SPREAD;
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
      // Primary frame at full opacity
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite, -r, -r, d, d);
    } else {
      // Fallback: circles instead of rects for cleaner look
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#D8DCE0';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00C8D4';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E8640A';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  _drawRagdollRider(ctx, bike) {
    const lean = bike.riderLean || 0;
    const hb   = bike.wheelBase / 2;
    const wr   = bike.wheelRad;

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    const hipX = -hb * 0.10 + lean * 7;
    const hipY = -wr * 0.82;

    const torsoAngle = lean * 0.3 - 0.15;
    const torsoLen   = 11;  // shorter torso (was 16)
    const shoulderX  = hipX + Math.sin(torsoAngle) * torsoLen;
    const shoulderY  = hipY - Math.cos(torsoAngle) * torsoLen;

    const headRadius = 4;  // smaller head (was ~5)
    const headX = shoulderX + Math.sin(torsoAngle) * (headRadius + 1);
    const headY = shoulderY - Math.cos(torsoAngle) * (headRadius + 1);

    const barX = hb * 0.42;
    const barY = hipY - 4;

    // Leg: thigh only (hip -> knee), knee shifted slightly back
    const kneeFX = hipX + hb * 0.08;
    const kneeFY = hipY + 11;

    const C = '#f0f0f0';
    const LW_THICK = 3.5;
    const LW_THIN  = 2.5;

    // Thigh: hip -> knee
    ctx.strokeStyle = C; ctx.lineWidth = LW_THICK;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY + 2);
    ctx.lineTo(kneeFX, kneeFY);
    ctx.stroke();

    // Knee joint dot
    ctx.fillStyle = C;
    ctx.beginPath();
    ctx.arc(kneeFX, kneeFY, LW_THICK * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.strokeStyle = C; ctx.lineWidth = LW_THICK;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();

    // Arm
    ctx.lineWidth = LW_THIN;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.bezierCurveTo(shoulderX + 5, shoulderY + 2, barX - 4, barY + 2, barX, barY);
    ctx.stroke();

    // Helmet — square head
    ctx.fillStyle = C;
    ctx.fillRect(headX - headRadius, headY - headRadius, headRadius * 2, headRadius * 2);

  }

  _drawRider(ctx, bike) {
    const lean = bike.riderLean;
    const hb   = bike.wheelBase / 2;
    const rSL  = bike.rSuspLen;

    const isWheeling = bike.wheeling;
    const isStoppie  = bike.stoppie;
    const leanBase = isWheeling ? -0.18 : 0;

    const hipX       = -2 + lean * 18 + leanBase * 14;
    const hipY       = -19;
    const torsoAngle = lean * 0.4 + leanBase * 0.22;
    const shoulderX  = hipX + Math.sin(torsoAngle) * 19;
    const shoulderY  = hipY - Math.cos(torsoAngle) * 19;
    const headX      = shoulderX + Math.sin(torsoAngle) * 8;
    const headY      = shoulderY - Math.cos(torsoAngle) * 8;
    const handX      = hb * 0.5;
    const handY      = -29;
    const footRX     = -hb + 12;
    const footFX     = hb * 0.18;
    const footY      = rSL - 2;

    const pxl = (x,y,w,h,c) => { ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h); };
    const kneeRX = hipX - 5;
    const kneeRY = hipY + 12;
    const kneeFX2 = hipX + 10;
    const kneeFY2 = hipY + 12;
    pxl(hipX-7,  hipY,     7, 6, '#2a2a38');
    pxl(kneeRX-2,kneeRY-1, 7, 5, '#2a2a38');
    pxl(kneeRX-1,kneeRY-2, 5, 3, '#D8DCE0');
    pxl(footRX-2,footY-8,  6, 8, '#2a2a38');
    pxl(hipX,    hipY,     7, 6, '#32324a');
    pxl(kneeFX2-1,kneeFY2-1,7,5,'#32324a');
    pxl(kneeFX2, kneeFY2-2, 5, 3,'#D8DCE0');
    pxl(footFX-2,footY-8,  6, 8, '#32324a');

    ctx.fillStyle = '#111';
    ctx.fillRect(footRX - 10, footY - 4, 16, 8);
    ctx.fillRect(footRX - 14, footY,    6, 4);
    ctx.fillRect(footFX - 10, footY - 4, 14, 8);
    ctx.fillRect(footFX - 14, footY,    6, 4);
    ctx.fillStyle = '#D8DCE0';
    ctx.fillRect(footRX - 8, footY - 2, 10, 2);
    ctx.fillRect(footFX - 8, footY - 2,  9, 2);
    ctx.fillStyle = '#D8DCE0';
    ctx.fillRect(footRX - 8, footY + 1, 10, 1);

    const px = (x,y,w,h,c) => { ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h); };
    px(hipX-4,    hipY,       9, 4,  '#E8EEF4');
    px(hipX-4,    hipY-4,     9, 4,  '#E8640A');
    px(hipX-3,    hipY-8,     8, 4,  '#E8EEF4');
    px(shoulderX-4, shoulderY, 8, 4, '#E8EEF4');

    const midAX = Math.round((shoulderX + handX) / 2);
    const midAY = Math.round((shoulderY + handY) / 2) + 3;
    px(shoulderX+1, shoulderY+1, 5, 4, '#E8EEF4');
    px(midAX-1,     midAY,       5, 4, '#E8640A');
    px(handX-3,     handY,       5, 4, '#E8EEF4');
    px(handX,       handY-1,     4, 3, '#111111');

    px(headX-5, headY-8, 10, 10, '#E8EEF4');
    px(headX-6, headY-5,  2,  5, '#E8EEF4');
    px(headX+4, headY-5,  2,  5, '#E8EEF4');
    px(headX-5, headY-8, 10,  3, '#E8640A');
    px(headX+4, headY-7,  6,  2, '#D8DCE0');
    px(headX-4, headY-2,  1,  5, '#E8640A');
    px(headX+4, headY-2,  1,  5, '#E8640A');
    px(headX-3, headY-2, 8,   1, '#E8640A');
    px(headX-3, headY+2, 8,   1, '#E8640A');
  }

  _drawRagdoll(ragdoll) {
    const ctx = this.ctx;
    const cam = this.camera;
    cam.applyTransform(ctx);
    for (const p of ragdoll.parts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle || 0);
      if (p.name === 'head') {
        ctx.fillStyle = '#E8EEF4';
        // Circle head
        ctx.beginPath();
        ctx.arc(0, 0, p.r || 5, 0, Math.PI * 2);
        ctx.fill();
        // Visor stripe
        ctx.fillStyle = 'rgba(0,200,220,0.7)';
        ctx.fillRect(-(p.r || 5) + 1, 0, (p.r || 5) * 2 - 2, 3);
      } else if (p.name === 'torso') {
        ctx.fillStyle = '#E8640A';
        ctx.beginPath();
        ctx.roundRect(-p.w/2, -p.h/2, p.w, p.h, 2);
        ctx.fill();
      } else if (p.name.startsWith('arm')) {
        ctx.fillStyle = '#E8EEF4';
        ctx.beginPath();
        ctx.roundRect(-p.w/2, -p.h/2, p.w, p.h, p.w/2);
        ctx.fill();
      } else if (p.name.startsWith('leg')) {
        ctx.fillStyle = '#2a2a38';
        ctx.beginPath();
        ctx.roundRect(-p.w/2, -p.h/2, p.w, p.h, p.w/2);
        ctx.fill();
      }
      ctx.restore();
    }
    cam.restore(ctx);
  }

  _drawCrashedBikeFrame(bike, bikeColor = '#E8640A') {
    const ctx = this.ctx;
    const cam = this.camera;
    cam.applyTransform(ctx);
    ctx.save();
    ctx.translate(bike.x, bike.y);
    ctx.rotate(bike.angle + Math.sin(bike.crashTimer * 2) * 0.05);
    ctx.globalAlpha = 0.65;
    const wr  = bike.wheelRad;
    const hb  = bike.wheelBase / 2;
    const sc  = (hb * 2) / 56;
    const sChassis = this._sprites[bike.chassisName || this.chassisName];
    const sWheel   = this._sprites['Wheel_Type_1'];
    this._drawSpriteWheel(ctx, sWheel, -hb, wr, wr, 0.4);
    this._drawSpriteWheel(ctx, sWheel,  hb, wr, wr, 0.4);
    if (sChassis && sChassis.complete) {
      ctx.drawImage(sChassis, -hb - 10 * sc, -20 * sc, 77 * sc, 36 * sc);
    } else {
      ctx.fillStyle = '#E8EEF4'; ctx.fillRect(-35, -8, 70, 14);
      ctx.fillStyle = '#E8640A'; ctx.fillRect(-18, -7, 32, 12);
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

    drawPart(p.legL,  '#3A3A50');
    drawPart(p.legR,  '#3A3A50');
    drawPart(p.torso, '#CC4400');
    drawPart(p.armL,  '#DDCCBB');
    drawPart(p.armR,  '#DDCCBB');
    // Head as square (pixel art)
    ctx.save();
    ctx.translate(p.head.x, p.head.y);
    ctx.fillStyle = '#DDCCBB';
    ctx.fillRect(-p.head.r, -p.head.r, p.head.r * 2, p.head.r * 2);
    ctx.restore();

    if (dummy.hit && dummy.hitTimer > 3) {
      ctx.font = '600 11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('ride further →', p.torso.x, p.torso.y - 30);
      ctx.textAlign = 'left';
    }

    cam.restore(ctx);
  }

  // ── HUD — pixel art style ──────────────────────────────────────────────────
  drawHUD(bike, w, h, fps, _unused, isMobile = false) {
    const ctx = this.ctx;

    const kmh      = Math.abs(bike.vx / PX_PER_M * 3.6);
    const speedStr = kmh.toFixed(0);

    // Pixel art HUD background block
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(16, h - 68, 180, 56);
    ctx.fillStyle = 'rgba(80,200,80,0.2)';
    ctx.fillRect(16, h - 68, 180, 4); // top accent

    ctx.font      = '700 36px monospace';
    ctx.fillStyle = '#AAFFAA';
    ctx.textAlign = 'left';
    ctx.fillText(speedStr, 24, h - 38);
    ctx.font      = '500 11px monospace';
    ctx.fillStyle = 'rgba(180,255,180,0.6)';
    ctx.fillText('KM/H', 24, h - 24);

    // RPM bar — pixel blocks
    const rpmF  = (bike.rpm - 1500) / (12500 - 1500);
    const barW  = 130;
    const barX  = 24, barY = h - 20;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(barX, barY, barW, 6);
    const barColor = rpmF > 0.85 ? '#FF4444' : rpmF > 0.65 ? '#FF9900' : '#44FF88';
    // Draw RPM bar as pixel blocks
    const barFill = barW * Math.max(0, Math.min(1, rpmF));
    const bpx = 5; // pixel block size
    for (let bx2 = 0; bx2 < barFill; bx2 += bpx + 1) {
      ctx.fillStyle = barColor;
      ctx.fillRect(barX + bx2, barY, bpx, 6);
    }

    ctx.font      = '700 16px monospace';
    ctx.fillStyle = '#AAFFAA';
    ctx.textAlign = 'left';
    ctx.fillText(`G${bike.gear}`, barX + barW + 8, barY + 6);

    // Trick indicators
    if (bike.wheeling) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(w/2 - 70, h - 45, 140, 28);
      ctx.fillStyle = '#44FF44';
      ctx.font      = '700 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WHEELIE', w / 2, h - 24);
    }

    if (bike.stoppie) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(w/2 - 70, h - 45, 140, 28);
      ctx.fillStyle = '#44CCFF';
      ctx.font      = '700 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STOPPIE', w / 2, h - 24);
    }

    if (bike.airTime > 0.4) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(w/2 - 80, 30, 160, 28);
      ctx.font      = '700 18px monospace';
      ctx.fillStyle = '#FFEE44';
      ctx.textAlign = 'center';
      ctx.fillText(`AIR  ${bike.airTime.toFixed(1)}s`, w / 2, 49);
    }

    if (bike.crashed) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,60,60,0.95)';
      ctx.font      = '700 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED', w / 2, h / 2 - 12);
      ctx.font      = '500 14px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(isMobile ? 'Tap  R  to respawn' : 'Press  R  to respawn', w / 2, h / 2 + 14);
    }

    ctx.font      = '500 11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'right';
    ctx.fillText(`${fps} FPS`, w - 12, h - 10);
    ctx.textAlign = 'left';
  }

  _lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
    const ar=(ah>>16)&0xff, ag=(ah>>8)&0xff, ab=ah&0xff;
    const br=(bh>>16)&0xff, bg=(bh>>8)&0xff, bb=bh&0xff;
    const rr=Math.round(ar+(br-ar)*t), rg=Math.round(ag+(bg-ag)*t), rb=Math.round(ab+(bb-ab)*t);
    return `#${((rr<<16)|(rg<<8)|rb).toString(16).padStart(6,'0')}`;
  }
}
