export default class ParticleSystem {
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
        color: config.color || '#8B7355',
        gravity: config.gravity !== undefined ? config.gravity : 300,
        friction: config.friction || 0.98,
        type: config.type || 'dust',
        alpha: 1,
      });
    }
  }

  emitDirt(x, y, speed, direction, surface = 'dirt') {
    const intensity = Math.min(Math.abs(speed) / 200, 1);
    const colors = {
      dirt: '#6B5B3E',
      rock: '#8A8078',
      sand: '#D8C880',
      road: '#7A7A82',
    };
    this.emit(x, y, Math.ceil(intensity * 4), {
      angle: direction + Math.PI * 0.5,
      spread: 0.8,
      speed: 50 + intensity * 150,
      life: 0.4 + intensity * 0.4,
      size: 2 + intensity * 4,
      color: colors[surface] || '#6B5B3E',
      gravity: 400,
      type: surface === 'road' ? 'smoke' : 'dirt',
    });
  }


  emitMud(x, y, speed) {
    this.emit(x, y, 3, {
      angle: -Math.PI * 0.5,
      spread: 1.2,
      speed: 30 + Math.abs(speed) * 0.3,
      life: 0.6,
      size: 3 + Math.random() * 4,
      color: '#4A3C2A',
      gravity: 500,
      type: 'mud',
    });
  }

  emitDust(x, y, intensity) {
    this.emit(x, y, Math.ceil(intensity * 2), {
      angle: -Math.PI * 0.5,
      spread: Math.PI * 0.8,
      speed: 20 + intensity * 40,
      life: 0.8 + intensity * 0.6,
      size: 8 + intensity * 15,
      color: '#9E8E6E',
      gravity: -20,
      friction: 0.95,
      type: 'smoke',
    });
  }

  emitExhaust(x, y) {
    this.emit(x, y, 1, {
      angle: Math.PI,
      spread: 0.4,
      speed: 15 + Math.random() * 20,
      life: 0.3 + Math.random() * 0.3,
      size: 3 + Math.random() * 3,
      color: '#555555',
      gravity: -40,
      friction: 0.94,
      type: 'smoke',
    });
  }

  emitSpark(x, y, count) {
    this.emit(x, y, count, {
      angle: -Math.PI * 0.5,
      spread: Math.PI,
      speed: 200 + Math.random() * 200,
      life: 0.2 + Math.random() * 0.3,
      size: 1.5,
      color: '#FFB347',
      gravity: 300,
      type: 'spark',
    });
  }

  emitCrash(x, y) {
    this.emit(x, y, 20, {
      angle: -Math.PI * 0.5,
      spread: Math.PI * 2,
      speed: 100 + Math.random() * 200,
      life: 0.5 + Math.random() * 0.5,
      size: 3 + Math.random() * 5,
      color: '#8B7355',
      gravity: 400,
      type: 'dirt',
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
      
      if (screen.x < -50 || screen.x > camera.width + 50 ||
          screen.y < -50 || screen.y > camera.height + 50) continue;

      ctx.globalAlpha = p.alpha * (p.type === 'smoke' ? 0.3 : 0.8);

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);
      } else if (p.type === 'smoke') {
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