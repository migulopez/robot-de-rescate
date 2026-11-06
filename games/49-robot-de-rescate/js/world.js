/* =========================================================
 * 49. Robot de rescate simulado
 * world.js — Fondo del escenario, cámara, partículas y efectos
 * Vista 100% cenital.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});
  const S = RDR.sprites;

  /* ---------------- Terreno pre-renderizado ---------------- */

  function createTerrain(level) {
    const canvas = (root.document ? document.createElement('canvas') : null);
    if (!canvas) return null;
    canvas.width = level.width;
    canvas.height = level.height;
    const ctx = canvas.getContext('2d');

    // base de césped
    const g = ctx.createLinearGradient(0, 0, level.width, level.height);
    g.addColorStop(0, '#6fbf63');
    g.addColorStop(0.5, '#63b658');
    g.addColorStop(1, '#58a94e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, level.width, level.height);

    // manchas de césped
    level.decor.grassPatches.forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? 'rgba(126, 205, 110, 0.5)' : 'rgba(94, 175, 84, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, i * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // textura de hierba
    ctx.save();
    ctx.globalAlpha = 0.22;
    let seed = 1337;
    const rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * level.width;
      const y = rnd() * level.height;
      ctx.strokeStyle = rnd() > 0.5 ? '#8fd47c' : '#4e9a45';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 5, y - 4 - rnd() * 4);
      ctx.stroke();
    }
    ctx.restore();

    // camino de tierra
    const road = level.decor.road;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(74, 100, 72, 0.45)';
    ctx.lineWidth = level.decor.roadWidth + 12;
    ctx.beginPath();
    road.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke();

    const rg = ctx.createLinearGradient(0, 0, level.width, level.height);
    rg.addColorStop(0, '#d8c39a');
    rg.addColorStop(0.5, '#cdb489');
    rg.addColorStop(1, '#c2a87d');
    ctx.strokeStyle = rg;
    ctx.lineWidth = level.decor.roadWidth;
    ctx.beginPath();
    road.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke();

    // granos del camino
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * level.width;
      const y = rnd() * level.height;
      ctx.fillStyle = rnd() > 0.5 ? '#b39a70' : '#e5d3ad';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();

    // flores decorativas
    level.decor.flowers.forEach(function (f, i) {
      const cols = ['#f7d64b', '#f78fb3', '#f7f7f7', '#c58cf2'];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = cols[(i + k) % cols.length];
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(k * 1.7) * 7, f.y + Math.sin(k * 1.7) * 7, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f9e79f';
      ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, Math.PI * 2); ctx.fill();
    });

    // valla perimetral
    drawFence(ctx, level);

    return canvas;
  }

  function drawFence(ctx, level) {
    const m = 16;
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 92, 58, 0.85)';
    ctx.lineWidth = 8;
    ctx.setLineDash([34, 14]);
    ctx.strokeRect(m, m, level.width - m * 2, level.height - m * 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(90, 68, 42, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(m + 8, m + 8, level.width - (m + 8) * 2, level.height - (m + 8) * 2);
    ctx.restore();
  }

  /* ---------------- Partículas ---------------- */

  function createParticles() {
    return { list: [] };
  }

  function spawnBurst(ps, x, y, color, count, opt) {
    const o = opt || {};
    for (let i = 0; i < count; i++) {
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread || 1.4)
        : Math.random() * Math.PI * 2;
      const sp = (o.speed || 120) * (0.4 + Math.random() * 0.9);
      ps.list.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: (o.life || 0.7) * (0.7 + Math.random() * 0.6),
        maxLife: o.life || 0.7,
        size: (o.size || 4) * (0.6 + Math.random() * 0.9),
        color,
        gravity: o.gravity || 0,
      });
    }
  }

  function updateParticles(ps, dt) {
    for (let i = ps.list.length - 1; i >= 0; i--) {
      const p = ps.list[i];
      p.life -= dt;
      if (p.life <= 0) { ps.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
  }

  function drawParticles(ctx, ps) {
    ctx.save();
    ps.list.forEach(function (p) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /* ---------------- Cámara ---------------- */

  function createCamera(level) {
    return {
      x: level.width / 2,
      y: level.height / 2,
      shake: 0,
      zoom: 1,
      apply(ctx, viewW, viewH) {
        ctx.translate(viewW / 2, viewH / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x + (Math.random() - 0.5) * this.shake,
                      -this.y + (Math.random() - 0.5) * this.shake);
      },
      follow(target, dt, viewW, viewH, lookX, lookY) {
        const cfg = RDR.CONFIG.CAMERA;
        const k = 1 - Math.exp(-cfg.smoothing * dt);
        const desiredX = target.x + (lookX || 0);
        const desiredY = target.y + (lookY || 0);
        this.x += (desiredX - this.x) * k;
        this.y += (desiredY - this.y) * k;
        const halfW = viewW / (2 * this.zoom);
        const halfH = viewH / (2 * this.zoom);
        const minX = Math.min(halfW, level.width / 2);
        const minY = Math.min(halfH, level.height / 2);
        this.x = Math.max(minX, Math.min(level.width - minX, this.x));
        this.y = Math.max(minY, Math.min(level.height - minY, this.y));
        this.shake = Math.max(0, this.shake - dt * 60);
      },
    };
  }

  /* ---------------- Dibujo del mundo ---------------- */

  function drawScene(ctx, game, opts) {
    const level = game.level;
    const t = opts.time;
    const terrain = opts.terrain;

    if (terrain) ctx.drawImage(terrain, 0, 0, level.width, level.height);

    // zona de entrega (debajo del edificio)
    S.drawDeliveryZone(ctx, level.delivery, t, game.state === 'carrying');

    // obstáculos
    level.obstacles.forEach(function (o, i) {
      switch (o.type) {
        case 'tree': S.drawTree(ctx, o.x, o.y, o.r, o.main, i); break;
        case 'rock': S.drawRock(ctx, o.x, o.y, o.r); break;
        case 'bench': S.drawBench(ctx, o.x, o.y, o.w, o.h); break;
        case 'crate': S.drawCrate(ctx, o.x, o.y, o.w, o.h); break;
        case 'planter': S.drawPlanter(ctx, o.x, o.y, o.r); break;
        case 'bush': S.drawBush(ctx, o.x, o.y, o.r); break;
        case 'well': S.drawWell(ctx, o.x, o.y, o.r, t); break;
        case 'doghouse': S.drawDogHouse(ctx, o, t); break;
        case 'barrier': S.drawBarrier(ctx, o.x, o.y, o.w, o.h); break;
        case 'vet': S.drawVet(ctx, level.vet, t); break;
        case 'workshop':
          S.drawWorkshop(ctx, o, level.workshop, t, game.health);
          break;
        default: break;
      }
    });
  }

  RDR.world = {
    createTerrain, createCamera, createParticles, spawnBurst,
    updateParticles, drawParticles, drawScene,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
