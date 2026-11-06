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
    let msgSignature = '';

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

      // Estabilidad
      const chargePct = Math.round(stab.charge * 100);
      el.stabilityBar.style.width = chargePct + '%';
      el.stabilityBar.className = 'bar-fill ' + (
        stab.charge >= RDR.CONFIG.STABILITY.critAt ? 'danger' :
        stab.charge >= RDR.CONFIG.STABILITY.warnAt ? 'warn' : 'ok');
      el.stabilityText.textContent = game.cat.state === 'carried'
        ? (stab.charge >= 0.72 ? '¡PELIGRO! El gatito se va a caer'
          : stab.charge >= 0.35 ? '¡Cuidado! Reduce la velocidad' : 'Transporte estable')
        : 'Sin gatito a bordo';
      el.stabilityPanel.classList.toggle('warning', game.cat.state === 'carried' && stab.charge >= 0.35);
      el.stabilityPanel.classList.toggle('critical', game.cat.state === 'carried' && stab.charge >= 0.72);

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

      // Lista de mensajes
      const sig = game.messages.map(function (m) { return m.text + m.life.toFixed(1); }).join('|');
      if (sig !== msgSignature) {
        msgSignature = sig;
        el.messages.innerHTML = '';
        game.messages.forEach(function (m) {
          const div = doc.createElement('div');
          div.className = 'msg ' + m.tone;
          div.textContent = m.text;
          el.messages.appendChild(div);
        });
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
            '<div class="stat"><span>Veces que se cayó el gatito</span><strong>' + game.stats.drops + '</strong></div>';
          el.overlayActions.innerHTML = '';
          const b = doc.createElement('button');
          b.className = 'btn primary';
          b.textContent = 'Jugar de nuevo';
          b.onclick = function () { game.reset(); hideOverlay(); };
          el.overlayActions.appendChild(b);
          const b2 = doc.createElement('button');
          b2.className = 'btn';
          b2.textContent = 'Salir del juego';
          b2.onclick = function () { root.location.href = '../../index.html'; };
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
          const hp = root.document.getElementById('help-panel');
          if (hp) hp.classList.toggle('open');
          return;
        }
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
      el.pauseBtn.addEventListener('click', togglePause);
      el.resetBtn.addEventListener('click', function () { game.reset(); hideOverlay(); });
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

    function togglePause() {
      if (game.finished) return;
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

    bindInput();
    return { update, togglePause, hideOverlay };
  }

  RDR.createUI = createUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
