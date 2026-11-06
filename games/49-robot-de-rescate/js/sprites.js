/* =========================================================
 * 49. Robot de rescate simulado
 * sprites.js — Dibujo 2D procedimental (vista cenital)
 * Gato pixel-art basado en la imagen de referencia entregada.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});

  /* ---------------------------------------------------------
   * GATITO — rejilla pixel-art (24 x 29)
   * Tomada de la imagen de referencia del gatito.
   * ------------------------------------------------------- */
  const CAT_PALETTE = {
    '.': null,
    W: '#fffdf7', w: '#e2d8cb',
    T: '#e6b27a', t: '#c68a52',
    B: '#784826', P: '#f8bac9',
    K: '#261e18',
  };
  const CAT_GRID = [
    '........................',
    '........................',
    '.......B........B.......',
    '......BPB......BPB......',
    '.....BBPPB....BPPBB.....',
    '....BBPPPttttttPPPBB....',
    '....BBttttttttttttBB....',
    '.....tttttttttttttt.....',
    '....TTtttttttttttttT....',
    '...TTTTTWWWWWWWWTTTTT...',
    '...TTTTWWWWWWWWWWTTTT...',
    '...TTTWWWWWWWWWWWWTTT...',
    '...TTWWWWWWWWWWWWWWTT...',
    '...TTWWWKKWWWWWKKWWTT...',
    '...TTWWWKKWWWWWKKWWTT...',
    '....TWWWWWWWWWWWWWWT....',
    '.....TWPWWWBBWWWPWT.....',
    '.......WWWwWWwWWW.......',
    '........WWWWWWWW...tt...',
    '.......WWWWWWWWWW..tt...',
    '......WWWWWWWWWWWW.tt...',
    '......TTWWWWWWWWTT.tt...',
    '.....TTTTWWWWWWTTTTt....',
    '.....TTTTWWWWWWTTTTt....',
    '.....TTTTWWWWWWTTTTt....',
    '......TTWWWWWWWWTTtt....',
    '........WWWWWWWW........',
    '.........WWWWWW.........',
    '........................',
  ];

  function drawCat(ctx, x, y, opts) {
    const o = opts || {};
    const scale = o.scale || 1.75;
    const wobble = o.wobble || 0;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const t = o.time || 0;
    const bob = Math.sin(t * 3.2) * (o.bobAmp || 1.1);
    const gridW = 24 * scale;
    const gridH = 29 * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y + bob);
    if (wobble) {
      ctx.rotate(Math.sin(t * (7 + wobble * 12)) * wobble * 0.34);
      ctx.translate(Math.sin(t * 11) * wobble * 3, Math.cos(t * 9) * wobble * 2);
    }

    // sombra
    ctx.save();
    ctx.globalAlpha = alpha * 0.24;
    ctx.fillStyle = '#10331a';
    ctx.beginPath();
    ctx.ellipse(0, gridH * 0.44, gridW * 0.38, gridH * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (o.blink) {
      // ojos cerrados: se pintan dos líneas sobre la rejilla
      ctx.save();
    }

    const ox = -gridW / 2, oy = -gridH / 2;
    for (let gy = 0; gy < CAT_GRID.length; gy++) {
      const row = CAT_GRID[gy];
      for (let gx = 0; gx < row.length; gx++) {
        const col = CAT_PALETTE[row[gx]];
        if (!col) continue;
        // Parpadeo: convierte la fila de ojos en línea oscura
        if (o.blink && (gy === 13 || gy === 14) && (row[gx] === 'K')) {
          if (gy === 14) continue;
        }
        ctx.fillStyle = col;
        ctx.fillRect(ox + gx * scale, oy + gy * scale, scale + 0.6, scale + 0.6);
      }
    }
    if (o.blink) ctx.restore();

    ctx.restore();
  }

  /* ---------------------------------------------------------
   * Ayudas de dibujo
   * ------------------------------------------------------- */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function shadowEllipse(ctx, x, y, rx, ry, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.28 : alpha;
    ctx.fillStyle = '#0d2b16';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------------------------------------------------
   * ÁRBOL (vista superior)
   * ------------------------------------------------------- */
  function drawTree(ctx, x, y, r, main, seed) {
    shadowEllipse(ctx, x + r * 0.12, y + r * 0.2, r * 1.05, r * 0.92, 0.3);

    // copa: varias capas de manchas
    const blobs = [
      [-0.30, -0.05, 0.62, '#2f7a3a'], [0.28, 0.10, 0.58, '#2c7136'],
      [0.02, -0.34, 0.56, '#358a41'], [-0.05, 0.34, 0.52, '#2a6c33'],
      [0.00, 0.00, 0.72, '#3b9247'],
    ];
    blobs.forEach(function (b, i) {
      ctx.fillStyle = b[3];
      ctx.beginPath();
      ctx.arc(x + b[0] * r, y + b[1] * r, b[2] * r, 0, Math.PI * 2);
      ctx.fill();
    });

    // luces
    ctx.fillStyle = 'rgba(140, 214, 120, 0.55)';
    for (let i = 0; i < 26; i++) {
      const a = (i * 2.399 + (seed || 0));
      const d = (0.18 + ((i * 37) % 60) / 100) * r * 0.9;
      const px = x + Math.cos(a) * d - r * 0.08;
      const py = y + Math.sin(a) * d - r * 0.1;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.10, r * 0.07, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(20, 74, 34, 0.35)';
    for (let i = 0; i < 14; i++) {
      const a = (i * 1.7 + 0.6);
      const d = (0.3 + ((i * 23) % 55) / 100) * r;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.09, r * 0.06, a, 0, Math.PI * 2);
      ctx.fill();
    }

    // tronco visible en el centro
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(48, 30, 16, 0.6)';
    ctx.lineWidth = r * 0.035;
    ctx.stroke();
    ctx.fillStyle = 'rgba(160, 120, 80, 0.5)';
    ctx.beginPath();
    ctx.arc(x - r * 0.04, y - r * 0.05, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    if (main) {
      // aro indicador del punto inicial
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255, 244, 200, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------
   * ROCA
   * ------------------------------------------------------- */
  function drawRock(ctx, x, y, r) {
    shadowEllipse(ctx, x + r * 0.14, y + r * 0.24, r * 1.0, r * 0.8, 0.3);
    const pts = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.82 + 0.2 * Math.sin(i * 2.7));
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.92]);
    }
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#b9bfc6');
    g.addColorStop(0.55, '#8d959e');
    g.addColorStop(1, '#5f6871');
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 60, 68, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // facetas
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.34, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 68, 76, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.28, r * 0.3, r * 0.18, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------------------------------------------------------
   * BANCA
   * ------------------------------------------------------- */
  function drawBench(ctx, x, y, w, h) {
    shadowEllipse(ctx, x + w / 2 + 6, y + h / 2 + 8, w * 0.55, h * 0.45, 0.28);
    const horizontal = w > h;
    // patas
    ctx.fillStyle = '#3a3f45';
    if (horizontal) {
      roundRect(ctx, x + 8, y + h * 0.18, 10, h * 0.64, 4); ctx.fill();
      roundRect(ctx, x + w - 18, y + h * 0.18, 10, h * 0.64, 4); ctx.fill();
    } else {
      roundRect(ctx, x + w * 0.18, y + 8, w * 0.64, 10, 4); ctx.fill();
      roundRect(ctx, x + w * 0.18, y + h - 18, w * 0.64, 10, 4); ctx.fill();
    }
    // tablones
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#c98b4d');
    grad.addColorStop(1, '#a06a34');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 55, 24, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // ranuras
    ctx.strokeStyle = 'rgba(96, 60, 26, 0.45)';
    ctx.lineWidth = 1.6;
    if (horizontal) {
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + 6, y + (h / 3) * i); ctx.lineTo(x + w - 6, y + (h / 3) * i); ctx.stroke();
      }
    } else {
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + (w / 3) * i, y + 6); ctx.lineTo(x + (w / 3) * i, y + h - 6); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255, 235, 200, 0.25)';
    roundRect(ctx, x + 4, y + 4, w - 8, h * 0.3, 8);
    ctx.fill();
  }

  /* ---------------------------------------------------------
   * CAJA / CRATE
   * ------------------------------------------------------- */
  function drawCrate(ctx, x, y, w, h) {
    shadowEllipse(ctx, x + w / 2 + 7, y + h / 2 + 9, w * 0.58, h * 0.46, 0.3);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#c58f52');
    g.addColorStop(1, '#96662f');
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = '#6f4519';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(122, 78, 33, 0.85)';
    ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + w - 6, y + h - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - 6, y + 6); ctx.lineTo(x + 6, y + h - 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 230, 190, 0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    // cinta
    ctx.fillStyle = 'rgba(240, 200, 120, 0.9)';
    ctx.fillRect(x, y + h / 2 - 4, w, 8);
  }

  /* ---------------------------------------------------------
   * MACETA / PLANTER
   * ------------------------------------------------------- */
  function drawPlanter(ctx, x, y, r) {
    shadowEllipse(ctx, x + r * 0.15, y + r * 0.25, r * 1.05, r * 0.85, 0.3);
    ctx.fillStyle = '#b7653f';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a4526'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#4b2c1c';
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2); ctx.fill();
    // flores
    const colors = ['#f06d8c', '#f9d64c', '#f5f0e6', '#d96ff0'];
    for (let i = 0; i < 9; i++) {
      const a = i * 1.9, d = r * (0.15 + ((i * 31) % 55) / 100);
      ctx.fillStyle = '#357c3c';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 2.2 + 0.5, d = r * (0.2 + ((i * 41) % 50) / 100);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------------------------------------------------------
   * ARBUSTO
   * ------------------------------------------------------- */
  function drawBush(ctx, x, y, r) {
    shadowEllipse(ctx, x + r * 0.1, y + r * 0.2, r * 1.0, r * 0.8, 0.24);
    const pts = [[-0.42, -0.1], [0.4, -0.16], [0.02, -0.42], [0.0, 0.3], [-0.2, -0.02]];
    pts.forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? '#2e7d3b' : '#3c9448';
      ctx.beginPath();
      ctx.arc(x + p[0] * r, y + p[1] * r, r * (0.6 - i * 0.03), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(150, 220, 130, 0.5)';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.1;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.32, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------------------------------------------------------
   * BARRERA
   * ------------------------------------------------------- */
  function drawBarrier(ctx, x, y, w, h) {
    shadowEllipse(ctx, x + w / 2 + 6, y + h / 2 + 8, w * 0.55, h * 0.5, 0.28);
    ctx.fillStyle = '#2f3238';
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 8); ctx.fill();
    const horizontal = w > h;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 6);
    ctx.clip();
    const stripe = 22;
    const len = horizontal ? w : h;
    for (let i = -2; i < len / stripe + 2; i++) {
      ctx.fillStyle = i % 2 ? '#f4f1ea' : '#e3433f';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(horizontal ? 0 : 0);
      if (horizontal) ctx.fillRect(i * stripe, 0, stripe, h);
      else ctx.fillRect(0, i * stripe, w, stripe);
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 6); ctx.stroke();
    // luces reflectoras
    ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
    if (horizontal) {
      ctx.beginPath(); ctx.arc(x + 10, y + h / 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w - 10, y + h / 2, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x + w / 2, y + 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h - 10, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------------------------------------------------------
   * VETERINARIA (vista superior con fachada)
   * ------------------------------------------------------- */
  function drawVet(ctx, v, t) {
    const x = v.x - v.w / 2, y = v.y - v.h / 2, w = v.w, h = v.h;

    shadowEllipse(ctx, v.x + 12, v.y + 18, w * 0.56, h * 0.5, 0.28);

    // techo
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#f2f6fb');
    g.addColorStop(1, '#cfd9e6');
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#9aa9bd';
    ctx.lineWidth = 3;
    ctx.stroke();

    // paneles del techo
    ctx.strokeStyle = 'rgba(150, 168, 190, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + (h / 4) * i);
      ctx.lineTo(x + w - 10, y + (h / 4) * i);
      ctx.stroke();
    }

    // claraboya / equipo en el techo
    ctx.fillStyle = '#a9c8e8';
    roundRect(ctx, x + w * 0.5 - 34, y + 16, 68, 40, 8); ctx.fill();
    ctx.strokeStyle = '#7d9dbe'; ctx.lineWidth = 2; ctx.stroke();

    // cruz veterinaria
    ctx.save();
    ctx.translate(x + 34, y + 34);
    ctx.fillStyle = '#e04a4a';
    roundRect(ctx, -6, -18, 12, 36, 3); ctx.fill();
    roundRect(ctx, -18, -6, 36, 12, 3); ctx.fill();
    ctx.restore();

    // toldo / fachada inferior
    const fy = y + h - 34;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x - 6, fy, w + 12, 44, 8);
    ctx.fillStyle = '#2fa36b';
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#2fa36b';
      if (i % 2 === 0) {
        ctx.fillStyle = '#2fa36b';
        ctx.fillRect(x - 6 + i * ((w + 12) / 12), fy, (w + 12) / 12, 44);
      } else {
        ctx.fillStyle = '#f7fbf8';
        ctx.fillRect(x - 6 + i * ((w + 12) / 12), fy, (w + 12) / 12, 44);
      }
    }
    ctx.restore();

    // letrero
    const signW = w * 0.92, signH = 48;
    const sx = v.x - signW / 2, sy = y + h - signH - 6;
    ctx.save();
    roundRect(ctx, sx, sy, signW, signH, 10);
    const sg = ctx.createLinearGradient(sx, sy, sx, sy + signH);
    sg.addColorStop(0, '#1d3d68');
    sg.addColorStop(1, '#122a4a');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '800 26px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glow = 0.55 + Math.sin(t * 2.4) * 0.25;
    ctx.shadowColor = 'rgba(120, 220, 255, ' + glow + ')';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText('VETERINARIA', v.x, sy + signH / 2 + 1);
    // huella
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8fd9ff';
    ctx.beginPath();
    ctx.ellipse(sx + 18, sy + signH / 2, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = -1.9 + i * 0.42;
      ctx.beginPath();
      ctx.ellipse(sx + 18 + Math.cos(a) * 10, sy + signH / 2 + Math.sin(a) * 9, 3, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // puerta
    ctx.fillStyle = '#7f8fa4';
    roundRect(ctx, v.x - 26, fy + 10, 52, 30, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, v.x - 20, fy + 14, 40, 8, 3);
    ctx.fill();
  }

  /* ---------------------------------------------------------
   * ZONA DE ENTREGA
   * ------------------------------------------------------- */
  function drawDeliveryZone(ctx, d, t, active) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    ctx.save();
    ctx.translate(d.x, d.y);
    const r = d.r;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = active
      ? 'rgba(96, 230, 160, ' + (0.14 + pulse * 0.14) + ')'
      : 'rgba(120, 210, 255, ' + (0.10 + pulse * 0.08) + ')';
    ctx.fill();

    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = -t * 26;
    ctx.lineWidth = 4;
    ctx.strokeStyle = active ? '#7df0b6' : '#8ed7ff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    // flecha hacia la puerta
    ctx.fillStyle = active ? 'rgba(125,240,182,0.95)' : 'rgba(180,235,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.42);
    ctx.lineTo(-14, r * 0.02);
    ctx.lineTo(-5, r * 0.02);
    ctx.lineTo(-5, r * 0.34);
    ctx.lineTo(5, r * 0.34);
    ctx.lineTo(5, r * 0.02);
    ctx.lineTo(14, r * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.font = '700 15px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('ZONA DE ENTREGA', 0, r * 0.78);
    ctx.restore();
  }

  /* ---------------------------------------------------------
   * ROBOT (vista cenital, basado en el modelo real entregado)
   * ------------------------------------------------------- */
  function drawRobot(ctx, robot, opts) {
    const o = opts || {};
    const L = RDR.CONFIG.ROBOT.bodyLength;
    const W = RDR.CONFIG.ROBOT.bodyWidth;
    const t = o.time || 0;
    const impact = robot.impact || 0;
    const shake = impact > 0 ? Math.sin(t * 90) * impact * 12 : 0;

    ctx.save();
    ctx.translate(robot.x + shake, robot.y + Math.cos(t * 70) * impact * 5);
    ctx.rotate(robot.angle);

    // sombra
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#0b2413';
    ctx.beginPath();
    ctx.ellipse(4, 7, L * 0.56, W * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ---- ruedas ---- */
    const wheelW = 20, wheelH = 46, wheelX = -L * 0.06, wheelY = W * 0.5 - 2;
    [-1, 1].forEach(function (side) {
      ctx.save();
      ctx.translate(wheelX, side * wheelY);
      // cuerpo de la rueda
      const grad = ctx.createLinearGradient(0, -wheelH / 2, 0, wheelH / 2);
      grad.addColorStop(0, '#2b3f63');
      grad.addColorStop(0.5, '#16233a');
      grad.addColorStop(1, '#0d1522');
      ctx.fillStyle = grad;
      roundRect(ctx, -wheelW / 2, -wheelH / 2, wheelW, wheelH, 7);
      ctx.fill();
      ctx.strokeStyle = '#0a111c';
      ctx.lineWidth = 2;
      ctx.stroke();
      // dibujo de la banda (gira con wheelSpin)
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, -wheelW / 2 + 2, -wheelH / 2 + 2, wheelW - 4, wheelH - 4, 5);
      ctx.clip();
      ctx.fillStyle = 'rgba(126, 158, 200, 0.55)';
      for (let i = 0; i < 5; i++) {
        const yy = -wheelH / 2 + ((i * 12 + (robot.wheelSpin * 12) % 12 + 12) % (wheelH));
        ctx.fillRect(-wheelW / 2, yy, wheelW, 4);
      }
      ctx.restore();
      // llanta interior + aro rojo característico del modelo real
      ctx.fillStyle = 'rgba(70, 92, 120, 0.55)';
      roundRect(ctx, -wheelW / 2 + 5, -wheelH / 2 + 5, wheelW - 10, wheelH - 10, 4);
      ctx.fill();
      ctx.strokeStyle = '#d9443e';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-wheelW / 2 + 3.5, -wheelH / 2 + 9);
      ctx.lineTo(-wheelW / 2 + 3.5, wheelH / 2 - 9);
      ctx.moveTo(wheelW / 2 - 3.5, -wheelH / 2 + 9);
      ctx.lineTo(wheelW / 2 - 3.5, wheelH / 2 - 9);
      ctx.stroke();
      ctx.restore();
    });

    /* ---- chasis ---- */
    const cg = ctx.createLinearGradient(-L / 2, 0, L / 2, 0);
    cg.addColorStop(0, '#2c2f34');
    cg.addColorStop(0.5, '#3f444b');
    cg.addColorStop(1, '#24272b');
    ctx.fillStyle = cg;
    roundRect(ctx, -L / 2 + 4, -W / 2 + 4, L - 8, W - 8, 9);
    ctx.fill();
    ctx.strokeStyle = '#14161a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // nervios / celdas del chasis impreso en 3D
    ctx.strokeStyle = 'rgba(18, 20, 24, 0.75)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-L / 2 + 10 + (L - 20) * (i / 3), -W / 2 + 9);
      ctx.lineTo(-L / 2 + 10 + (L - 20) * (i / 3), W / 2 - 9);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120, 132, 148, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-L / 2 + 10, -W / 2 + 9);
    ctx.lineTo(L / 2 - 10, -W / 2 + 9);
    ctx.stroke();

    // placa metálica
    const plateW = L * 0.42, plateH = W * 0.62;
    const pg = ctx.createLinearGradient(0, -plateH / 2, 0, plateH / 2);
    pg.addColorStop(0, '#e6ebf1');
    pg.addColorStop(0.45, '#b9c3cf');
    pg.addColorStop(0.5, '#8d99a8');
    pg.addColorStop(1, '#aeb9c6');
    ctx.fillStyle = pg;
    roundRect(ctx, -L * 0.08, -plateH / 2, plateW, plateH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 80, 92, 0.8)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // tornillos de la placa
    ctx.fillStyle = '#5b6570';
    [[-L * 0.05, -plateH * 0.36], [-L * 0.05, plateH * 0.36],
     [L * 0.27, -plateH * 0.36], [L * 0.27, plateH * 0.36]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // plataforma de transporte del gatito (disco con tornillos)
    const platR = W * 0.31;
    const plg = ctx.createRadialGradient(-platR * 0.3, -platR * 0.3, 2, 0, 0, platR);
    plg.addColorStop(0, '#f2f5f9');
    plg.addColorStop(0.6, '#b7c1cd');
    plg.addColorStop(1, '#79848f');
    ctx.fillStyle = plg;
    ctx.beginPath();
    ctx.arc(-L * 0.02, 0, platR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 68, 78, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6a7480';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(-L * 0.02 + Math.cos(a) * platR * 0.72, Math.sin(a) * platR * 0.72, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // centro de la plataforma
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-L * 0.02, 0, platR * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // rueda loca (castor) trasera
    ctx.fillStyle = '#20242a';
    ctx.beginPath();
    ctx.arc(-L / 2 + 12, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d97a4';
    ctx.beginPath();
    ctx.arc(-L / 2 + 12, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // LEDs de estado
    const ledColor = o.carrying ? '#ffd166' : (robot.blocked ? '#ff4d4d' : '#4ef08a');
    ctx.fillStyle = ledColor;
    ctx.shadowColor = ledColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-L * 0.30, -W * 0.30, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // cables
    ctx.strokeStyle = 'rgba(30, 34, 40, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-L * 0.30, W * 0.12);
    ctx.quadraticCurveTo(-L * 0.14, W * 0.28, 0, W * 0.2);
    ctx.stroke();

    // defensa frontal de goma
    ctx.fillStyle = '#14171b';
    roundRect(ctx, L / 2 - 12, -W * 0.42, 9, W * 0.84, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, L / 2 - 11, -W * 0.38, 3, W * 0.76, 2);
    ctx.fill();

    /* ---- Sensor ultrasónico HC-SR04 ---- */
    const sx = L / 2 - 6;
    // PCB azul
    ctx.fillStyle = '#1b5fbf';
    roundRect(ctx, sx - 13, -19, 17, 38, 3);
    ctx.fill();
    ctx.strokeStyle = '#0d3f85';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // pines de conexión (VCC / Trig / Echo / GND)
    ctx.fillStyle = '#d9b64a';
    for (let i = 0; i < 4; i++) ctx.fillRect(sx - 15, -15 + i * 10, 4, 3.6);
    // transductores
    [-11.5, 11.5].forEach(function (dy) {
      // carcasa metálica del transductor
      const shell = ctx.createRadialGradient(sx - 2, dy - 2, 1.5, sx - 2, dy, 7.9);
      shell.addColorStop(0, '#eef3f8');
      shell.addColorStop(0.45, '#b3bdc8');
      shell.addColorStop(1, '#77818c');
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.arc(sx - 2.5, dy, 7.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a545e';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // rejilla interna
      ctx.fillStyle = '#3a424a';
      ctx.beginPath();
      ctx.arc(sx - 2.5, dy, 4.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d7883';
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(sx - 2.5 + Math.cos(a) * 2.9, dy + Math.sin(a) * 2.9, 1.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#20262c';
      ctx.beginPath();
      ctx.arc(sx - 2.5, dy, 1.7, 0, Math.PI * 2);
      ctx.fill();
    });
    // cristal oscilador
    ctx.fillStyle = '#d7e0e8';
    ctx.fillRect(sx - 18, -4, 5, 8);
    ctx.strokeStyle = '#7a858f'; ctx.lineWidth = 1; ctx.strokeRect(sx - 18, -4, 5, 8);

    ctx.restore();
  }

  /* ---------------------------------------------------------
   * CONO / HAZ DEL SENSOR ULTRASÓNICO
   * ------------------------------------------------------- */
  function drawSensorCone(ctx, robot, sensor, cfg) {
    const pxPerCm = RDR.CONFIG.UNITS.pxPerCm;
    const maxPx = cfg.maxRangeCm * pxPerCm;
    // El cono siempre es visible: se dibuja hasta el obstáculo, pero con un
    // alcance mínimo equivalente al umbral de "camino despejado" para que el
    // estudiante vea el campo de detección completo del sensor.
    const minVisible = cfg.thresholds.clear * pxPerCm * 1.7;
    const reach = sensor.detected
      ? Math.min(maxPx, Math.max(sensor.distancePx + 26, minVisible))
      : maxPx;
    const ox = robot.x + Math.cos(robot.angle) * (RDR.CONFIG.ROBOT.bodyLength * 0.46);
    const oy = robot.y + Math.sin(robot.angle) * (RDR.CONFIG.ROBOT.bodyLength * 0.46);
    const a0 = robot.angle - cfg.halfAngle;
    const a1 = robot.angle + cfg.halfAngle;
    const colors = {
      clear:  ['rgba(90, 240, 160, 0.30)', 'rgba(90, 240, 160, 0.015)', '#6ef7a8'],
      near:   ['rgba(255, 205, 80, 0.34)', 'rgba(255, 205, 80, 0.02)', '#ffcd50'],
      danger: ['rgba(255, 80, 80, 0.42)', 'rgba(255, 80, 80, 0.03)', '#ff6b6b'],
    };
    const c = colors[sensor.level] || colors.clear;

    ctx.save();

    // --- Relleno del cono de detección ---
    const g = ctx.createRadialGradient(ox, oy, 10, ox, oy, reach);
    g.addColorStop(0, c[0]);
    g.addColorStop(1, c[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, reach, a0, a1);
    ctx.closePath();
    ctx.fill();

    // --- Arcos de referencia 20 cm / 50 cm ---
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = c[2];
    [cfg.thresholds.near, cfg.thresholds.clear].forEach(function (cm) {
      ctx.beginPath();
      ctx.arc(ox, oy, cm * pxPerCm, a0, a1);
      ctx.stroke();
    });
    ctx.restore();

    // --- Contorno del haz ---
    ctx.strokeStyle = c[2];
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a0) * reach, oy + Math.sin(a0) * reach);
    ctx.arc(ox, oy, reach, a0, a1);
    ctx.closePath();
    ctx.stroke();

    // --- Arco del eco medido ---
    if (sensor.detected) {
      const d = Math.min(sensor.distancePx, maxPx);
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ox, oy, d, a0, a1);
      ctx.stroke();

      const hx = ox + Math.cos(sensor.angle) * d;
      const hy = oy + Math.sin(sensor.angle) * d;
      ctx.fillStyle = c[2];
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(hx, hy, 13, 0, Math.PI * 2);
      ctx.fill();

      // --- Lectura numérica junto al haz ---
      const label = Math.round(sensor.cm) + ' cm';
      ctx.globalAlpha = 1;
      ctx.font = '800 14px "Trebuchet MS", system-ui, sans-serif';
      const tw = ctx.measureText(label).width + 18;
      const midA = robot.angle;
      // La etiqueta se coloca desplazada lateralmente para no tapar el robot
      const labelDist = Math.max(52, Math.min(d * 0.55, maxPx * 0.6));
      const sideA = midA + Math.PI / 2;
      const lx = ox + Math.cos(midA) * labelDist + Math.cos(sideA) * 30;
      const ly = oy + Math.sin(midA) * labelDist + Math.sin(sideA) * 30;
      ctx.fillStyle = 'rgba(8, 18, 24, 0.86)';
      roundRect(ctx, lx - tw / 2, ly - 12, tw, 24, 12);
      ctx.fill();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = c[2];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------
   * ETIQUETA FLOTANTE (dibujada en el mundo)
   * ------------------------------------------------------- */
  function drawWorldLabel(ctx, x, y, text, color, font) {
    ctx.save();
    ctx.font = font || '700 15px "Trebuchet MS", system-ui, sans-serif';
    const w = ctx.measureText(text).width + 22;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(9, 18, 26, 0.82)';
    roundRect(ctx, x - w / 2, y - 13, w, 26, 13);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  RDR.sprites = {
    drawCat, drawTree, drawRock, drawBench, drawCrate, drawPlanter, drawBush,
    drawBarrier, drawVet, drawDeliveryZone, drawRobot, drawSensorCone,
    drawWorldLabel, roundRect, shadowEllipse,
    CAT_GRID, CAT_PALETTE,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
