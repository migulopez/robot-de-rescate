/* =========================================================
 * 49. Robot de rescate simulado
 * ui.js — HUD, panel técnico, controles táctiles y pantallas
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});

  const $ = function (sel, ctx) { return (ctx || root.document).querySelector(sel); };
  const $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || root.document).querySelectorAll(sel)); };

  function createUI(game, renderer) {
    const doc = root.document;
    const el = {
      objective: $('#objective-text'),
      speed: $('#speed-value'),
      speedBar: $('#speed-bar'),
      speedMode: $('#speed-mode'),
      sensorValue: $('#sensor-value'),
      sensorState: $('#sensor-state'),
      sensorDot: $('#sensor-dot'),
      sensorRange: $('#sensor-range'),
      catStatus: $('#cat-status'),
      catChip: $('#cat-chip'),
      stabilityBar: $('#stability-bar'),
      stabilityText: $('#stability-text'),
      stabilityPanel: $('#stability-panel'),
      stabilityCap: $('#stability-cap'),
      stabilityCapText: $('#stability-cap-text'),
      healthPanel: $('#health-panel'),
      dogPanel: $('#dog-panel'),
      dogTag: $('#dog-tag'),
      dogText: $('#dog-text'),
      techDog: $('#tech-dog'),
      healthBar: $('#health-bar'),
      healthTag: $('#health-tag'),
      healthText: $('#health-text'),
      workshopRow: $('#workshop-row'),
      workshopText: $('#workshop-text'),
      techHealth: $('#tech-health'),
      techCap: $('#tech-cap'),
      techWorkshop: $('#tech-workshop'),
      toleranceValue: $('#tolerance-value'),
      timer: $('#timer-value'),
      techDistance: $('#tech-distance'),
      techSpeed: $('#tech-speed'),
      techMotor: $('#tech-motor'),
      techTransport: $('#tech-transport'),
      techObstacle: $('#tech-obstacle'),
      techCat: $('#tech-cat'),
      techWheels: $('#tech-wheels'),
      techCollisions: $('#tech-collisions'),
      techAvoided: $('#tech-avoided'),
      messages: $('#messages'),
      banner: $('#banner'),
      overlay: $('#overlay'),
      overlayTitle: $('#overlay-title'),
      overlayBody: $('#overlay-body'),
      overlayStats: $('#overlay-stats'),
      overlayActions: $('#overlay-actions'),
      intro: $('#intro-screen'),
      startBtn: $('#btn-start'),
      pauseBtn: $('#btn-pause'),
      resetBtn: $('#btn-reset'),
      speedBtn: $('#btn-speed'),
      actionBtn: $('#btn-action'),
      toleranceRange: $('#tolerance-range'),
      keys: $$('.key'),
    };

    /* ---------------- Formato ---------------- */
    function fmtTime(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const cs = Math.floor((s * 100) % 100);
      return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec +
        '.' + (cs < 10 ? '0' : '') + cs;
    }
    function cmToPx(cm) { return cm + ' cm'; }

    /* ---------------- Actualización del HUD ---------------- */
    const msgNodes = {};

    function update(dt) {
      const robot = game.robot;
      const sensor = game.sensor;
      const stab = game.stability;

      // Objetivo
      el.objective.textContent = game.objectiveText();

      // Velocidad
      const speedCmS = (Math.abs(robot.speed) / RDR.CONFIG.UNITS.pxPerCm).toFixed(0);
      el.speed.textContent = speedCmS + ' cm/s';
      const maxSpeed = RDR.CONFIG.ROBOT.speedFast;
      const pct = Math.min(100, (Math.abs(robot.speed) / maxSpeed) * 100);
      el.speedBar.style.width = pct + '%';
      el.speedBar.className = 'bar-fill ' + (robot.fast ? 'fast' : 'normal');
      el.speedMode.textContent = robot.fast ? 'RÁPIDO' : 'NORMAL';
      el.speedMode.className = 'mode-tag ' + (robot.fast ? 'fast' : 'normal');
      el.speedBtn.classList.toggle('active', robot.fast);

      // Sensor
      const cm = Math.round(sensor.cm);
      el.sensorValue.textContent = cm;
      el.sensorValue.className = 'sensor-number ' + sensor.level;
      el.sensorRange.style.width = Math.max(2, (cm / RDR.CONFIG.SENSOR.maxRangeCm) * 100) + '%';
      el.sensorRange.className = 'sensor-range-fill ' + sensor.level;
      el.sensorDot.className = 'dot ' + sensor.level;
      const states = {
        clear: 'Camino despejado',
        near: 'Obstáculo cercano',
        danger: '¡OBSTÁCULO MUY PRÓXIMO!',
      };
      el.sensorState.textContent = states[sensor.level];
      el.sensorState.className = 'sensor-state ' + sensor.level;

      // Gatito
      el.catStatus.textContent = game.catStatusText();
      el.catChip.className = 'cat-chip ' + (
        game.cat.state === 'delivered' ? 'delivered' :
        game.cat.state === 'carried' ? 'carried' :
        game.cat.state === 'falling' || game.cat.state === 'returning' ? 'danger' : 'waiting');

      // Estabilidad (con techo dinámico por choques)
      const chargePct = Math.round(stab.charge * 100);
      const capPct = Math.round(stab.maxCap * 100);
      el.stabilityBar.style.width = chargePct + '%';
      el.stabilityBar.className = 'bar-fill ' + (
        stab.charge >= RDR.CONFIG.STABILITY.critAt ? 'danger' :
        stab.charge >= RDR.CONFIG.STABILITY.warnAt ? 'warn' :
        capPct < 100 ? 'capped' : 'ok');
      el.stabilityCap.style.left = capPct + '%';
      el.stabilityCapText.textContent = capPct + ' %';
      el.stabilityCapText.style.color = capPct >= 90 ? '#9fe8ff'
        : capPct >= 60 ? '#ffd166' : '#ff9f9f';
      el.stabilityText.textContent = game.cat.state === 'carried'
        ? (stab.charge >= 0.65 ? '¡PELIGRO! El gatito se va a caer'
          : stab.charge >= 0.3 ? '¡Cuidado! Reduce la velocidad' : 'Transporte estable')
        : (capPct < 100 ? 'Estabilidad reducida: ve al TALLER' : 'Sin gatito a bordo');
      el.stabilityPanel.classList.toggle('warning',
        game.cat.state === 'carried' && stab.charge >= 0.3);
      el.stabilityPanel.classList.toggle('critical',
        game.cat.state === 'carried' && stab.charge >= 0.65);

      // Salud del robot y taller
      const hp = game.health.value;
      const hpPct = Math.round(hp);
      el.healthBar.style.width = hpPct + '%';
      el.healthBar.className = 'bar-fill ' + (hpPct > 60 ? 'ok' : hpPct > 25 ? 'warn' : 'danger');
      el.healthTag.textContent = hpPct > 60 ? 'OK' : hpPct > 25 ? 'DAÑADO' : 'CRÍTICO';
      el.healthTag.className = 'health-tag ' + (hpPct > 60 ? 'ok' : hpPct > 25 ? 'mid' : 'low');
      el.healthText.textContent = hpPct + ' % · ' + (
        game.health.repairing ? 'reparando…'
          : hpPct >= 100 ? 'sin daños'
          : hpPct > 25 ? 'revisa el TALLER' : '¡ve al TALLER ya!');
      el.healthPanel.classList.toggle('mid', hpPct <= 60 && hpPct > 25);
      el.healthPanel.classList.toggle('low', hpPct <= 25);

      // Perro guardián
      if (el.dogPanel) {
        const dst = game.dogStatusText();
        el.dogTag.textContent = dst.level === 'chase' ? '¡PERSIGUIENDO!'
          : dst.level === 'alert' ? 'TE DETECTÓ'
          : dst.level === 'near' ? 'CERCA' : 'TRANQUILO';
        el.dogTag.className = 'dog-tag ' + dst.level;
        el.dogPanel.className = 'panel dog-panel' + (
          dst.level === 'chase' ? ' chase' : dst.level === 'alert' ? ' alert' : '');
        el.dogText.textContent = dst.label + (
          game.dog ? ' · a ' + Math.round(game.dog.distanceToRobot) + ' px' : '');
        if (el.techDog) el.techDog.textContent = game.dog ? game.dog.state : '—';
      }

      const needsRepair = hpPct < 100 || capPct < 100;
      el.workshopRow.classList.toggle('active', game.health.repairing);
      el.workshopRow.classList.toggle('needed', needsRepair && !game.workshop.inZone);
      el.workshopText.textContent = game.health.repairing
        ? 'Reparando… ' + Math.max(0, 100 - hpPct) + ' % restante'
        : game.workshop.inZone
          ? (needsRepair ? 'Entra en la zona para reparar' : 'Robot al 100 %')
          : needsRepair ? '¡Ve al TALLER a reparar!' : 'Taller disponible';

      // Tiempo
      el.timer.textContent = fmtTime(game.time);

      // Panel técnico
      el.techDistance.textContent = cm + ' cm' + (sensor.detected ? '' : ' (libre)');
      el.techSpeed.textContent = speedCmS + ' cm/s';
      el.techMotor.textContent = robot.motor;
      el.techTransport.textContent = game.cat.state === 'carried'
        ? (stab.charge > 0.5 ? 'inestable' : 'estable') : 'inactivo';
      el.techObstacle.textContent = sensor.level === 'clear' ? 'ninguno'
        : sensor.level === 'near' ? 'cercano' : 'crítico';
      el.techCat.textContent = game.cat.state;
      el.techWheels.textContent = robot.speed > 1 ? 'avanzando'
        : robot.speed < -1 ? 'retrocediendo' : 'detenidas';
      el.techHealth.textContent = Math.round(game.health.value) + ' %';
      el.techCap.textContent = Math.round(game.stability.maxCap * 100) + ' %';
      el.techWorkshop.textContent = game.health.repairing ? 'reparando'
        : game.workshop.inZone ? 'en zona' : 'fuera';
      el.techCollisions.textContent = game.stats.collisions;
      el.techAvoided.textContent = game.stats.obstaclesAvoided;

      // Controles resaltados
      el.keys.forEach(function (k) {
        const a = k.dataset.key;
        const active =
          (a === 'forward' && game.input.forward) ||
          (a === 'back' && game.input.back) ||
          (a === 'left' && game.input.left) ||
          (a === 'right' && game.input.right) ||
          (a === 'brake' && game.input.brake);
        k.classList.toggle('pressed', !!active);
      });

      // Lista de mensajes: se crean una sola vez (por id) y sólo se eliminan al
      // caducar, para que la animación de entrada no se reinicie cada frame.
      const alive = {};
      game.messages.forEach(function (m) {
        alive[m.id] = true;
        let node = msgNodes[m.id];
        if (!node) {
          node = doc.createElement('div');
          node.className = 'msg ' + m.tone + (m.tone === 'danger' ? ' msg-big' : '');
          node.textContent = m.text;
          msgNodes[m.id] = node;
          el.messages.appendChild(node);
        }
        node.style.setProperty('--msg-life', m.maxLife + 's');
        node.style.opacity = Math.max(0, Math.min(1, m.life / 0.45));
      });
      Object.keys(msgNodes).forEach(function (id) {
        if (!alive[id]) {
          const node = msgNodes[id];
          if (node && node.parentNode) node.parentNode.removeChild(node);
          delete msgNodes[id];
        }
      });
      while (el.messages.children.length > 3) {
        el.messages.removeChild(el.messages.firstChild);
      }

      // Pausa
      el.pauseBtn.textContent = game.paused ? '▶ Reanudar' : '⏸ Pausa';
      el.pauseBtn.classList.toggle('active', game.paused);

      // Banner grande de objetivo / alerta
      updateBanner();

      // Pantalla final
      updateOverlay();
    }

    function updateBanner() {
      const carrying = game.cat.state === 'carried';
      const near = game.robot.fast && carrying && game.stability.charge > 0.5;
      if (near) {
        el.banner.textContent = '¡Cuidado! Estás transportando al gatito demasiado rápido';
        el.banner.className = 'banner show danger';
      } else if (game.stability.charge >= 1 && game.state === 'dropped') {
        el.banner.textContent = '¡El gatito se soltó! Regresa al árbol';
        el.banner.className = 'banner show danger';
      } else if (game.dog && (game.dog.state === 'chase' || game.dog.state === 'bite')) {
        el.banner.textContent = '🐕 ¡El perro te persigue! Corre y escóndete';
        el.banner.className = 'banner show danger';
      } else if (game.health.value <= 25) {
        el.banner.textContent = '¡Robot dañado! Llévalo al TALLER';
        el.banner.className = 'banner show danger';
      } else if (game.stability.maxCap < 0.6) {
        el.banner.textContent = 'Estabilidad máx. ' + Math.round(game.stability.maxCap * 100) +
          ' % · repara en el TALLER';
        el.banner.className = 'banner show warn';
      } else if (game.sensor.level === 'danger') {
        el.banner.textContent = '¡ALERTA! Obstáculo a ' + Math.round(game.sensor.cm) + ' cm';
        el.banner.className = 'banner show warn';
      } else {
        el.banner.className = 'banner';
      }
    }

    function updateOverlay() {
      if (game.state === 'delivered') {
        if (!el.overlay.classList.contains('win')) {
          el.overlay.classList.remove('paused');
          el.overlay.classList.add('show', 'win');
          el.overlayTitle.textContent = '¡MISIÓN CUMPLIDA!';
          el.overlayBody.textContent =
            'Has rescatado al gatito y lo has llevado sano y salvo a la veterinaria.';
          el.overlayStats.innerHTML =
            '<div class="stat"><span>Tiempo total</span><strong>' + fmtTime(game.time) + '</strong></div>' +
            '<div class="stat"><span>Obstáculos evitados</span><strong>' + game.stats.obstaclesAvoided + '</strong></div>' +
            '<div class="stat"><span>Choques</span><strong>' + game.stats.collisions + '</strong></div>' +
            '<div class="stat"><span>Reparaciones en taller</span><strong>' + game.workshop.repairs + '</strong></div>' +
            '<div class="stat"><span>Mordiscos del perro</span><strong>' + (game.stats.dogBites || 0) + '</strong></div>' +
            '<div class="stat"><span>Estabilidad final</span><strong>' + Math.round(game.stability.maxCap * 100) + ' %</strong></div>' +
            '<div class="stat"><span>Veces que se cayó el gatito</span><strong>' + game.stats.drops + '</strong></div>';
          el.overlayActions.innerHTML = '';
          const b = doc.createElement('button');
          b.className = 'btn primary';
          b.textContent = 'Jugar de nuevo';
          b.onclick = function () { game.reset(); hideOverlay(); };
          el.overlayActions.appendChild(b);
          const b2 = doc.createElement('button');
          b2.className = 'btn';
          b2.textContent = 'Ver el mapa';
          b2.onclick = function () { hideOverlay(); };
          el.overlayActions.appendChild(b2);
        }
      } else if (el.overlay.classList.contains('win')) {
        hideOverlay();
      }
    }

    function hideOverlay() {
      el.overlay.classList.remove('show', 'win', 'start');
    }

    /* ---------------- Controles ---------------- */
    const keyMap = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      Space: 'brake',
    };

    function bindInput() {
      doc.addEventListener('keydown', function (e) {
        if (e.repeat) return;
        if (introOpen) {
          // Empieza la misión con cualquier tecla; Enter/Espacio con el botón
          if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' ||
              e.code === 'Escape' || keyMap[e.code]) {
            e.preventDefault();
            hideIntro();
            const a0 = keyMap[e.code];
            if (a0) game.setKey(a0, true);      // si pulsó W, ya arranca andando
            return;
          }
        }
        const a = keyMap[e.code];
        if (a) {
          e.preventDefault();
          game.setKey(a, true);
          return;
        }
        if (e.code === 'KeyE') { e.preventDefault(); game.interact(); return; }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyF') {
          e.preventDefault(); game.toggleSpeed(); return;
        }
        if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
        if (e.code === 'KeyR') { e.preventDefault(); game.reset(); hideOverlay(); return; }
        if (e.code === 'KeyH') {
          e.preventDefault();
          showIntro();               // H recuerda la misión y los peligros
          return;
        }
        if (e.code === 'Enter' && !introOpen) return;
      });
      doc.addEventListener('keyup', function (e) {
        const a = keyMap[e.code];
        if (a) { e.preventDefault(); game.setKey(a, false); }
      });
      root.addEventListener('blur', function () {
        game.input.forward = game.input.back = false;
        game.input.left = game.input.right = false;
        game.input.brake = false;
      });

      // Botones táctiles
      $$('[data-hold]').forEach(function (btn) {
        const a = btn.dataset.hold;
        const on = function (ev) { ev.preventDefault(); game.setKey(a, true); btn.classList.add('active'); };
        const off = function (ev) { if (ev) ev.preventDefault(); game.setKey(a, false); btn.classList.remove('active'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointerleave', off);
        btn.addEventListener('pointercancel', off);
      });

      el.actionBtn.addEventListener('click', function () { game.interact(); });
      el.speedBtn.addEventListener('click', function () { game.toggleSpeed(); });
      if (el.startBtn) el.startBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        hideIntro();
      });
      if (el.intro) el.intro.addEventListener('pointerdown', function (ev) {
        // clic fuera de la tarjeta también empieza
        if (ev.target === el.intro) hideIntro();
      });
      el.pauseBtn.addEventListener('click', togglePause);
      el.resetBtn.addEventListener('click', function () { game.reset(); hideOverlay(); hideIntro(); });
      $('#btn-help') && $('#btn-help').addEventListener('click', function () {
        $('#help-panel').classList.toggle('open');
      });

      // Tolerancia de velocidad configurable
      if (el.toleranceRange) {
        el.toleranceRange.value = RDR.CONFIG.STABILITY.toleranceSeconds;
        const apply = function () {
          const v = parseFloat(el.toleranceRange.value);
          RDR.CONFIG.STABILITY.toleranceSeconds = v;
          game.stability.tolerance = v;
          el.toleranceValue.textContent = v.toFixed(1) + ' s';
        };
        el.toleranceRange.addEventListener('input', apply);
        apply();
      }
    }

    /* ---------------- Ventana de bienvenida ---------------- */
    // El juego empieza en pausa detrás de la ventana: nada se mueve (ni el
    // cronómetro, ni la salud, ni el perro) hasta que el jugador la cierra.
    let introOpen = false;

    function showIntro() {
      if (!el.intro) return;
      introOpen = true;
      game.paused = true;
      game.input.forward = game.input.back = false;
      game.input.left = game.input.right = false;
      game.input.brake = false;
      el.intro.classList.add('show');
      if (el.startBtn && el.startBtn.focus) el.startBtn.focus({ preventScroll: true });
    }

    function hideIntro() {
      if (!el.intro) return;
      introOpen = false;
      el.intro.classList.remove('show');
      // sólo se reanuda si la pausa venía de la ventana de inicio
      if (!el.overlay.classList.contains('show')) game.paused = false;
    }

    /** ¿Está abierta la ventana de bienvenida? (para teclas y botones) */
    function isIntroOpen() { return introOpen; }

    function togglePause() {
      if (game.finished) return;
      if (introOpen) { hideIntro(); return; }   // la pausa cierra/abre la ventana
      game.paused = !game.paused;
      if (game.paused) {
        el.overlay.classList.add('show');
        el.overlay.classList.add('paused');
        el.overlayTitle.textContent = 'PAUSA';
        el.overlayBody.textContent = 'La simulación está detenida. Pulsa P, ESC o el botón para continuar.';
        el.overlayStats.innerHTML = '';
        el.overlayActions.innerHTML = '';
        const b = doc.createElement('button');
        b.className = 'btn primary';
        b.textContent = 'Continuar';
        b.onclick = function () { togglePause(); };
        el.overlayActions.appendChild(b);
      } else if (!el.overlay.classList.contains('win')) {
        hideOverlay();
      }
    }

    // La ventana está visible desde el primer fotograma y el juego en pausa
    showIntro();

    bindInput();
    return {
      update, togglePause, hideOverlay,
      showIntro, hideIntro, isIntroOpen,
      get introVisible() { return introOpen; },
    };
  }

  RDR.createUI = createUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
