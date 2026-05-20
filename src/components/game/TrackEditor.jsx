// Track Editor – place, rotate, delete objects onto the terrain
// Saved to localStorage key "mx_track_layout"

const STORAGE_KEY = 'mx_track_layout';

export const OBJECT_TYPES = {
  ramp_sm:    { label: 'Small Ramp',    w: 80,  h: 30,  color: '#7A6B52', icon: '/' },
  ramp_md:    { label: 'Medium Ramp',   w: 120, h: 55,  color: '#7A6B52', icon: '//' },
  ramp_lg:    { label: 'Big Ramp',      w: 180, h: 90,  color: '#6B5C43', icon: '///' },
  tabletop:   { label: 'Tabletop',      w: 220, h: 60,  color: '#5C4A30', icon: '⬛' },
  doublejump: { label: 'Double Jump',   w: 250, h: 70,  color: '#4A3A25', icon: 'ΛΛ' },
  log:        { label: 'Log',           w: 60,  h: 20,  color: '#5C3A18', icon: '━' },
  rock:       { label: 'Boulder',       w: 40,  h: 36,  color: '#6A6560', icon: '◆' },
  barrel:     { label: 'Barrel',        w: 36,  h: 36,  color: '#9B4A15', icon: '⬤' },
  crate:      { label: 'Crate',         w: 32,  h: 32,  color: '#A0855C', icon: '▪' },
  tirestack:  { label: 'Tire Stack',    w: 24,  h: 60,  color: '#222',    icon: '⬛' },
  whoops:     { label: 'Whoops (5)',     w: 200, h: 22,  color: '#4A3A25', icon: '∿∿∿' },
};

export default class TrackEditor {
  constructor(terrain) {
    this.terrain  = terrain;
    this.active   = false;
    this.items    = [];         // placed items
    this.selected = null;       // item being moved
    this.hoverId  = -1;
    this.curType  = 'ramp_md';
    this.cursorX  = 0;
    this.cursorY  = 0;
    this.snapAngle = 0;         // rotation for next placement (degrees)
    this.load();
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); } catch {}
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.items = JSON.parse(raw);
    } catch { this.items = []; }
  }

  clear() { this.items = []; this.save(); }

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
    // Hover detection
    this.hoverId = -1;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this._hitTest(this.items[i], worldX, worldY)) {
        this.hoverId = i; break;
      }
    }
    return false;
  }

  onMouseDown(worldX, worldY) {
    // Check if clicking existing item → pick it up
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this._hitTest(this.items[i], worldX, worldY)) {
        this.selected = this.items[i];
        return true;
      }
    }
    // Place new item
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
    const def  = OBJECT_TYPES[this.curType];
    const gndY = this.terrain.getHeightAt(worldX);
    const item = {
      id:    Date.now() + Math.random(),
      type:  this.curType,
      x:     worldX,
      y:     gndY,
      angle: this.snapAngle * Math.PI / 180,
      w:     def.w,
      h:     def.h,
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

    // Ghost preview at cursor when not dragging
    if (!this.selected) {
      const def   = OBJECT_TYPES[this.curType];
      const ghostY = this.terrain.getHeightAt(this.cursorX);
      ctx.globalAlpha = 0.45;
      this._drawItem(ctx, {
        type: this.curType, x: this.cursorX, y: ghostY,
        angle: this.snapAngle * Math.PI / 180,
        w: def.w, h: def.h,
      }, false, false);
      ctx.globalAlpha = 1;
    }
  }

  _drawItem(ctx, item, hovered, selected) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle || 0);

    if (hovered || selected) {
      ctx.shadowColor  = selected ? '#FFD700' : '#FFFFFF';
      ctx.shadowBlur   = 10;
    }

    const t = item.type;
    const w = item.w, h = item.h;

    if (t === 'ramp_sm' || t === 'ramp_md' || t === 'ramp_lg') {
      ctx.fillStyle = '#7A6B52';
      ctx.beginPath(); ctx.moveTo(-w/2, 0); ctx.lineTo(w/2, 0); ctx.lineTo(w/2, -h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5A4B32'; ctx.lineWidth = 1.5;
      for (let k=1;k<5;k++){ const t2=k/5,px=-w/2+t2*w; ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,-h*t2); ctx.stroke(); }
      ctx.fillStyle='#5A4B32'; ctx.fillRect(w/2-5,-h,5,h);

    } else if (t === 'tabletop') {
      ctx.fillStyle = '#5C4A30';
      ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(-w/3,-h); ctx.lineTo(w/3,-h); ctx.lineTo(w/2,0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#4A3820'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#6B5840'; ctx.fillRect(-w/3+2,-h-2,w*0.66-4,4);

    } else if (t === 'doublejump') {
      ctx.fillStyle='#4A3A25';
      ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(-w*0.05,-h); ctx.lineTo(w*0.05,-h); ctx.lineTo(w/2,0); ctx.closePath(); ctx.fill();
      // Valley in middle
      ctx.fillStyle='#362A1A';
      ctx.beginPath(); ctx.moveTo(-w*0.05,-h); ctx.lineTo(0,-h*0.3); ctx.lineTo(w*0.05,-h); ctx.closePath(); ctx.fill();

    } else if (t === 'log') {
      ctx.fillStyle='#5C3A18';
      ctx.beginPath(); ctx.rect(-w/2,-h/2,w,h); ctx.fill();
      ctx.strokeStyle='#3A2208'; ctx.lineWidth=1;
      for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(k*10,-h/2); ctx.lineTo(k*10+3,h/2); ctx.stroke(); }
      ctx.fillStyle='#7A5030'; ctx.beginPath(); ctx.ellipse(-w/2,0,h*0.4,h/2,0,0,Math.PI*2); ctx.fill();

    } else if (t === 'rock') {
      ctx.fillStyle='#6A6560';
      ctx.beginPath();
      ctx.moveTo(-w*0.5,h*0.3); ctx.lineTo(-w*0.6,-h*0.1); ctx.lineTo(-w*0.3,-h*0.5);
      ctx.lineTo(w*0.2,-h*0.55); ctx.lineTo(w*0.6,-h*0.1); ctx.lineTo(w*0.5,h*0.35);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#888480';
      ctx.beginPath(); ctx.moveTo(-w*0.2,-h*0.5); ctx.lineTo(w*0.2,-h*0.55); ctx.lineTo(w*0.35,-h*0.2); ctx.lineTo(-w*0.1,-h*0.15); ctx.closePath(); ctx.fill();

    } else if (t === 'barrel') {
      ctx.fillStyle='#9B4A15'; ctx.beginPath(); ctx.arc(0,0,w/2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#5A2D0C'; ctx.lineWidth=2.5; ctx.stroke();
      ctx.strokeStyle='#777'; ctx.lineWidth=1.5;
      [0.85,0.55].forEach(f=>{ctx.beginPath();ctx.arc(0,0,w/2*f,0,Math.PI*2);ctx.stroke();});

    } else if (t === 'crate') {
      ctx.fillStyle='#A0855C'; ctx.fillRect(-w/2,-h/2,w,h);
      ctx.strokeStyle='#7A6540'; ctx.lineWidth=2; ctx.strokeRect(-w/2,-h/2,w,h);
      ctx.lineWidth=1; ctx.beginPath();
      ctx.moveTo(-w/2,-h/2); ctx.lineTo(w/2,h/2); ctx.moveTo(w/2,-h/2); ctx.lineTo(-w/2,h/2); ctx.stroke();

    } else if (t === 'tirestack') {
      const tr=12; const count=Math.round(h/(tr*2));
      for(let k=0;k<count;k++){
        ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(0,-k*tr*2,tr,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#181818'; ctx.beginPath(); ctx.arc(0,-k*tr*2,tr*0.58,0,Math.PI*2); ctx.fill();
      }

    } else if (t === 'whoops') {
      // 5 consecutive bumps
      const bumpW=w/5, bumpH=h;
      ctx.fillStyle='#4A3A25';
      for(let k=0;k<5;k++){
        const bx=-w/2+k*bumpW+bumpW/2;
        ctx.beginPath();
        ctx.moveTo(bx-bumpW/2,0);
        ctx.bezierCurveTo(bx-bumpW*0.3,-bumpH,bx+bumpW*0.3,-bumpH,bx+bumpW/2,0);
        ctx.closePath(); ctx.fill();
      }
    }

    // Selection/hover outline
    if (hovered || selected) {
      ctx.strokeStyle = selected ? '#FFD700' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-w/2 - 4, -h - 4, w + 8, h + 8);
      ctx.setLineDash([]);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── UI overlay (screen-space) ─────────────────────────────────────────────
  drawUI(ctx, w, h) {
    // Top bar
    ctx.fillStyle = 'rgba(10,8,5,0.85)';
    ctx.fillRect(0, 0, w, 52);
    ctx.strokeStyle = 'rgba(180,130,50,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 52); ctx.lineTo(w, 52); ctx.stroke();

    ctx.font = '700 15px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#D4A020';
    ctx.textAlign = 'left';
    ctx.fillText('TRACK EDITOR', 16, 22);

    ctx.font = '500 11px "Rajdhani", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('CLICK = place   DRAG = move   DEL = delete hovered   Q/E = rotate   ESC = exit', 16, 40);

    // Rotation indicator
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 12px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`ROT ${Math.round(this.snapAngle)}°`, w - 16, 22);
    ctx.fillText('E save / load', w - 16, 38);

    ctx.textAlign = 'left';
  }
}