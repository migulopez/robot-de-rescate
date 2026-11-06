/* =========================================================
 * 49. Robot de rescate simulado
 * render.js — Dibujo de la escena y del HUD técnico
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});
  const S = RDR.sprites;

  function createRenderer(canvas, game) {
    const ctx = canvas.getContext('2d');
    const level = game.level;
    const terrain = RDR.world.createTerrain(level);
    const camera = RDR.world.createCamera(level);
    const particles = RDR.world.createParticles();
    const spawnBurst = RDR.world.spawnBurst;

    let viewW = 1280, viewH = 780;
    let dpr = 1;
    let elapsed = 0;
    let catBlink = 0, catBlinkTimer = 2.4;
    let lastSensorDanger = false;
    let deliveryFx = 0;
    let dustTimer = 0;
    let sparkTimer = 0;
    const g_deliveryLabel = true;
    const floaters = [];   // textos flotantes del mundo

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(root.devicePixelRatio || 1, 2);
      viewW = Math.max(320, rect.width);
      viewH = Math.max(320, rect.height);
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      // zoom: ajusta para que se vea una porción cómoda del mundo
      const cfg = RDR.CONFIG.CAMERA;
      const zoomH = viewH / cfg.viewHeight;
      const zoomW = viewW / cfg.minViewWidth;
      camera.zoom = Math.max(0.42, Math.min(1.25, Math.max(zoomH, zoomW)));
    }

    /* ---------- efectos derivados del estado ---------- */
    function handleEvents() {
      const events = game.events;
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.type === 'impact') {
          const o = e.payload.obstacle;
          const px = o ? (o.w !== undefined ? o.x + o.w / 2 : o.x) : game.robot.x;
          const py = o ? (o.w !== undefined ? o.y + o.h / 2 : o.y) : game.robot.y;
          const a = Math.atan2(py - game.robot.y, px - game.robot.x);
          spawnBurst(particles, game.robot.x + Math.cos(a) * 34, game.robot.y + Math.sin(a) * 34,
            '#ffd166', 14, { angle: a, spread: 1.6, speed: 190, life: 0.5, size: 4 });
          camera.shake = 9;
          floaters.push({
            x: game.robot.x, y: game.robot.y - 46,
            text: '−' + Math.round(100 - game.stability.maxCap * 100) + ' % estab.',
            color: '#ff8080', life: 1.4, max: 1.4,
          });
        } else if (e.type === 'cat-pickup') {
          spawnBurst(particles, game.cat.x, game.cat.y, '#ffd1e0', 22,
            { speed: 140, life: 0.9, size: 4.5, gravity: -60 });
          floaters.push({ x: game.cat.x, y: game.cat.y - 40, text: '¡Rescatado!', color: '#8ef7b6', life: 1.4, max: 1.4 });
        } else if (e.type === 'cat-fall') {
          spawnBurst(particles, game.cat.x, game.cat.y, '#ffb3b3', 26,
            { speed: 160, life: 1.0, size: 5, gravity: 120 });
          floaters.push({ x: game.robot.x, y: game.robot.y - 40, text: '¡Se cayó!', color: '#ff8080', life: 1.6, max: 1.6 });
          camera.shake = 14;
        } else if (e.type === 'cat-respawn') {
          spawnBurst(particles, game.cat.x, game.cat.y, '#c8f7d4', 16,
            { speed: 90, life: 0.8, size: 4 });
        } else if (e.type === 'deliver') {
          deliveryFx = 1;
          spawnBurst(particles, level.delivery.x, level.delivery.y, '#ffe066', 60,
            { speed: 260, life: 1.6, size: 5 });
          spawnBurst(particles, level.delivery.x, level.delivery.y, '#7df0b6', 40,
            { speed: 180, life: 1.4, size: 4 });
        } else if (e.type === 'sensor-alert') {
          camera.shake = Math.max(camera.shake, 4);
        } else if (e.type === 'dog-bark') {
          floaters.push({ x: game.dog.x - 46, y: game.dog.y - 84, text: '¡GUAU!',
            color: '#ffcd50', life: 1.2, max: 1.2 });
          spawnBurst(particles, game.dog.x, game.dog.y - 20, '#ffd9a0', 8,
            { speed: 90, life: 0.6, size: 3 });
        } else if (e.type === 'dog-bite') {
          spawnBurst(particles, game.robot.x, game.robot.y, '#ff5a5a', 26,
            { speed: 200, life: 0.7, size: 4.5 });
          floaters.push({ x: game.robot.x + 66, y: game.robot.y - 74, text: '¡MORDISCO!',
            color: '#ff7b7b', life: 1.6, max: 1.6 });
          camera.shake = 14;
        } else if (e.type === 'repaired') {
          spawnBurst(particles, game.robot.x, game.robot.y, '#8ef7b6', 34,
            { speed: 160, life: 1.1, size: 4.5, gravity: -40 });
          floaters.push({ x: game.robot.x, y: game.robot.y - 50, text: '✔ 100 %',
            color: '#8ef7b6', life: 1.6, max: 1.6 });
        }
      }
      events.length = 0;
    }

    /* ---------- capa de la escena ---------- */
    function drawWorld() {
      ctx.save();
      camera.apply(ctx, viewW, viewH);
      RDR.world.drawScene(ctx, game, { time: elapsed, terrain });

      // punto inicial (árbol principal) resaltado
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2);
      if (game.cat.state === 'waiting') {
        ctx.save();
        ctx.globalAlpha = 0.35 + pulse * 0.35;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 10]);
        ctx.lineDashOffset = -elapsed * 30;
        ctx.beginPath();
        ctx.arc(game.cat.x, game.cat.y, 46 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // --- sombra + gatito (debajo del robot si va a bordo no: encima) ---
      const cat = game.cat;
      const blink = catBlink > 0;
      if (cat.state === 'waiting' || cat.state === 'returning' || cat.state === 'falling') {
        const landing = cat.state === 'falling' ? 1 + cat.fallProgress * 0.25 : 1;
        S.drawCat(ctx, cat.x, cat.y, { scale: 1.75 * landing, time: elapsed, blink });
        if (game.interactAvailable) {
          drawInteractPrompt(cat.x, cat.y, elapsed);
        }
      }

      // --- perro guardián: campo de detección debajo, cuerpo encima ---
      const dog = game.dog;
      if (dog) {
        S.drawDogSenses(ctx, dog, RDR.CONFIG.DOG, elapsed);
      }

      // --- robot ---
      S.drawRobot(ctx, game.robot, { time: elapsed, carrying: game.cat.state === 'carried' });

      // --- perro (cuerpo) ---
      if (dog) {
        S.drawDog(ctx, dog, RDR.CONFIG.DOG, elapsed);
        const st = game.dogStatusText();
        if (st.level === 'chase' || st.level === 'alert') {
          const side = Math.cos(elapsed * 0.7) > 0 ? 1 : -1;
          S.drawWorldLabel(ctx, dog.x + side * 92, dog.y - 46, st.label,
            st.level === 'chase' ? '#ff6b6b' : '#ffcd50',
            '800 13px "Trebuchet MS", system-ui, sans-serif');
        }
      }

      // --- cono del sensor ---
      S.drawSensorCone(ctx, game.robot, game.sensor, RDR.CONFIG.SENSOR);

      // --- gatito a bordo (encima de la plataforma) ---
      if (cat.state === 'carried') {
        const cfg = RDR.CONFIG;
        const riding = cfg.CAT.carriedScale;
        const bs = game.robot.x * 0.7;
        S.drawCat(ctx, game.robot.x + Math.cos(game.robot.angle) * 2,
          game.robot.y + Math.sin(game.robot.angle) * 2 - 30,
          { scale: 1.75 * riding, time: elapsed + 0.7, wobble: game.stability.charge, blink });
        // aura de seguridad
        ctx.save();
        const danger = Math.max(game.stability.charge,
          game.stability.maxCap < 0.999 ? 0.45 : 0);
        ctx.globalAlpha = 0.25 + danger * 0.5;
        ctx.strokeStyle = danger > 0.7 ? '#ff6b6b' : danger > 0.35 ? '#ffd166' : '#8ef7b6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(game.robot.x, game.robot.y - 26, 30 + Math.sin(elapsed * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // --- gatito entregado (delante de la puerta de la veterinaria) ---
      if (cat.state === 'delivered') {
        const tt = Math.min(1, (cat.deliveryT || 0));
        const ease = 1 - Math.pow(1 - tt, 3);
        const cx = level.delivery.x + 54;
        const cy = level.delivery.y + 6;
        S.drawCat(ctx, cx, cy, {
          scale: 1.75, time: elapsed, blink: true, alpha: Math.min(1, tt * 2),
        });
        // corazones de alegría
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(elapsed * 4);
        for (let i = 0; i < 3; i++) {
          const ph = (elapsed * 0.6 + i * 0.33) % 1;
          const hx = cx + Math.sin(ph * 6.2 + i * 2) * 26;
          const hy = cy - 34 - ph * 52;
          ctx.fillStyle = 'rgba(255, 120, 160, ' + (1 - ph) + ')';
          ctx.beginPath();
          ctx.arc(hx - 3.6, hy, 3.4, 0, Math.PI * 2);
          ctx.arc(hx + 3.6, hy, 3.4, 0, Math.PI * 2);
          ctx.moveTo(hx - 7, hy + 1);
          ctx.lineTo(hx, hy + 9);
          ctx.lineTo(hx + 7, hy + 1);
          ctx.fill();
        }
        ctx.restore();
        if (g_deliveryLabel) {
          S.drawWorldLabel(ctx, cx, cy + 44, '¡A salvo!', '#8ef7b6',
            '800 16px "Trebuchet MS", system-ui, sans-serif');
        }
      }

      // --- partículas y textos flotantes ---
      RDR.world.drawParticles(ctx, particles);
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life -= 1 / 60;
        f.y -= 34 / 60;
        if (f.life <= 0) { floaters.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.life / f.max * 1.6);
        ctx.font = '800 22px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(6, 16, 22, 0.8)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      // etiqueta del taller cuando hace falta reparar
      if (!game.workshop.inZone &&
          (game.health.value < 95 || game.stability.maxCap < 0.95)) {
        const W2 = game.level.workshop;
        S.drawWorldLabel(ctx, W2.x, W2.y + 128, 'TALLER · ¡Repara aquí!', '#ffd166',
          '800 15px "Trebuchet MS", system-ui, sans-serif');
      }

      // Etiqueta de estado sobre el robot
      if (game.state !== 'delivered') {
        const label = game.cat.state === 'carried'
          ? (game.stability.warning ? '¡TRANSPORTE INESTABLE!' : 'Transportando')
          : (game.interactAvailable || game.time > 9 ? '' : 'Buscando gatito');
        if (label) {
          const color = game.stability.warning ? '#ff8080' : '#d8f3ff';
          S.drawWorldLabel(ctx, game.robot.x, game.robot.y - 108, label, color,
            '700 15px "Trebuchet MS", system-ui, sans-serif');
        }
      }

      ctx.restore();
    }

    function drawInteractPrompt(x, y, t) {
      ctx.save();
      ctx.translate(x, y - 104 + Math.sin(t * 4) * 3);
      const label = 'Presiona  E  para rescatar al gatito';
      ctx.font = '700 19px "Trebuchet MS", system-ui, sans-serif';
      const w = ctx.measureText(label).width + 30;
      const g = ctx.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, 'rgba(14, 32, 44, 0.95)');
      g.addColorStop(1, 'rgba(8, 20, 30, 0.95)');
      ctx.fillStyle = g;
      S.roundRect(ctx, -w / 2, -22, w, 44, 12);
      ctx.fill();
      ctx.strokeStyle = '#8ef7b6';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // tecla E
      ctx.fillStyle = '#8ef7b6';
      S.roundRect(ctx, -w / 2 + 8, -13, 26, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#08281a';
      ctx.font = '800 17px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', -w / 2 + 21, 0);
      ctx.fillStyle = '#eafcff';
      ctx.font = '700 17px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Presiona    para rescatar al gatito', -w / 2 + 42, 1);
      ctx.restore();
    }

    /* ---------- marco de render ---------- */
    function render(dt) {
      elapsed += dt;
      resizeIfNeeded();
      handleEvents();

      // animaciones
      catBlinkTimer -= dt;
      if (catBlinkTimer <= 0) { catBlink = 0.14; catBlinkTimer = 2.5 + Math.random() * 3.5; }
      if (catBlink > 0) catBlink -= dt;
      deliveryFx = Math.max(0, deliveryFx - dt * 0.5);

      // chispas de reparación en el taller
      if (game.workshop.inZone && game.health.repairing) {
        sparkTimer -= dt;
        if (sparkTimer <= 0) {
          sparkTimer = 0.06;
          const W2 = game.level.workshop;
          const a = Math.random() * Math.PI * 2;
          const d = 26 + Math.random() * 34;
          spawnBurst(particles, W2.x + Math.cos(a) * d, W2.y + Math.sin(a) * d,
            Math.random() > 0.5 ? '#ffd166' : '#8ef7b6', 1,
            { speed: 90, life: 0.5, size: 3, gravity: 60 });
        }
      }

      // polvo de las ruedas al circular
      dustTimer -= dt;
      if (dustTimer <= 0 && Math.abs(game.robot.speed) > 70) {
        dustTimer = game.robot.fast ? 0.035 : 0.07;
        const back = game.robot.angle + Math.PI;
        const off = RDR.CONFIG.ROBOT.bodyWidth * 0.5 - 6;
        [-1, 1].forEach(function (side) {
          const px = game.robot.x + Math.cos(back) * 26 + Math.cos(game.robot.angle + Math.PI / 2) * side * off;
          const py = game.robot.y + Math.sin(back) * 26 + Math.sin(game.robot.angle + Math.PI / 2) * side * off;
          spawnBurst(particles, px, py, 'rgba(210, 226, 190, 0.55)', 1,
            { speed: 30, life: 0.45, size: 3.4, gravity: 0 });
        });
      }

      // cámara sigue al robot con un pequeño adelanto
      const look = RDR.CONFIG.CAMERA.lookAhead * 220;
      camera.follow(game.robot, dt, viewW, viewH,
        Math.cos(game.robot.angle) * look, Math.sin(game.robot.angle) * look);

      RDR.world.updateParticles(particles, dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewW, viewH);
      drawWorld();

      // viñeta
      const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.35,
        viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(3, 12, 8, 0.42)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, viewW, viewH);

      // flash de alerta
      if (game.sensor.level === 'danger') {
        const pulse = (0.10 + 0.08 * Math.sin(elapsed * 12)) * (lastSensorDanger ? 1 : 0.6);
        const rg = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.3,
          viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7);
        rg.addColorStop(0, 'rgba(255,0,0,0)');
        rg.addColorStop(1, 'rgba(255,40,40,' + pulse + ')');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, viewW, viewH);
      }
      lastSensorDanger = game.sensor.level === 'danger';
    }

    let lastW = 0, lastH = 0;
    function resizeIfNeeded() {
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(rect.width - lastW) > 0.5 || Math.abs(rect.height - lastH) > 0.5) {
        lastW = rect.width; lastH = rect.height;
        resize();
      }
    }

    resize();
    return { render, resize, camera, particles, get view() { return { w: viewW, h: viewH }; } };
  }

  RDR.createRenderer = createRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
