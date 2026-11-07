/* =========================================================
 * 49. Robot de rescate simulado
 * main.js — Arranque y bucle principal con paso fijo
 * La simulación es independiente de la tasa de fotogramas.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = root.RDR;

  function start() {
    const canvas = root.document.getElementById('game-canvas');
    if (!canvas) { console.error('No se encontró el canvas del juego'); return; }

    const game = RDR.createGame(RDR.CONFIG);
    const renderer = RDR.createRenderer(canvas, game);
    const ui = RDR.createUI(game, renderer);

    /* ---------------- Sonido ---------------- */
    const audio = RDR.createAudio ? RDR.createAudio() : null;
    if (audio) {
      audio.attach(game);      // miau, ladrido, choque, reparación, entrega
      const soundBtn = root.document.getElementById('btn-sound');
      const paintSound = function () {
        if (!soundBtn) return;
        soundBtn.textContent = audio.enabled ? '🔊' : '🔇';
        soundBtn.classList.toggle('off', !audio.enabled);
        soundBtn.setAttribute('aria-pressed', audio.enabled ? 'true' : 'false');
        soundBtn.title = audio.enabled
          ? 'Silenciar el sonido (M)'
          : 'Activar el sonido (M)';
      };
      paintSound();
      if (soundBtn) {
        soundBtn.addEventListener('click', function () {
          audio.toggle();
          paintSound();
          // al reactivar, el primer clic sirve también de gesto para el audio
          if (audio.enabled) { audio.unlock(); audio.sfx.ui(); }
        });
      }
      root.addEventListener('keydown', function (e) {
        if (e.key === 'm' || e.key === 'M') {
          audio.toggle(); paintSound();
          if (audio.enabled) audio.unlock();
        }
      });

      // El navegador exige un gesto del usuario: la música arranca al primer
      // clic o tecla, no al cargar la página.
      const unlockOnce = function () {
        if (audio.enabled) audio.unlock();
        root.removeEventListener('pointerdown', unlockOnce);
        root.removeEventListener('keydown', unlockOnce);
        if (soundBtn) soundBtn.classList.remove('pulse');
      };
      root.addEventListener('pointerdown', unlockOnce, { once: true });
      root.addEventListener('keydown', unlockOnce, { once: true });
      if (audio.enabled && soundBtn) soundBtn.classList.add('pulse');
    }

    // Ajustes del panel de ayuda
    const helpPanel = root.document.getElementById('help-panel');
    const helpClose = root.document.getElementById('btn-help-close');
    if (helpClose) helpClose.addEventListener('click', function () { helpPanel.classList.remove('open'); });

    /* ---------------- Ajuste automático del HUD ----------------
     * Si en una ventana baja los paneles no caben sobre la banda de
     * controles, se ocultan las filas secundarias (nunca los controles).
     */
    function fitHud() {
      const doc = root.document;
      if (!doc.body) return;
      doc.body.classList.remove('hud-tight', 'hud-tighter');
      const cols = [doc.querySelector('.hud-left'), doc.querySelector('.hud-right')];
      let tight = false, tighter = false;
      cols.forEach(function (el) {
        if (!el) return;
        if (el.scrollHeight > el.clientHeight + 2) tight = true;
      });
      if (tight) doc.body.classList.add('hud-tight');
      // segunda pasada: ¿sigue sin caber?
      cols.forEach(function (el) {
        if (el && el.scrollHeight > el.clientHeight + 2) tighter = true;
      });
      if (tighter) doc.body.classList.add('hud-tighter');
      return { tight: tight, tighter: tighter };
    }
    fitHud();
    let resizeTimer = null;
    root.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitHud, 120);
    });
    root.addEventListener('orientationchange', fitHud);

    // Render inicial
    renderer.render(0);

    let last = performance.now();
    let accumulator = 0;
    const step = RDR.CONFIG.SIM.fixedStep;

    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > RDR.CONFIG.SIM.maxFrameTime) dt = RDR.CONFIG.SIM.maxFrameTime;
      if (!isFinite(dt) || dt < 0) dt = 0;

      // Simulación con paso fijo
      accumulator += dt;
      let guard = 0;
      while (accumulator >= step && guard < 600) {
        game.step(step);
        accumulator -= step;
        guard++;
      }

      renderer.render(dt);
      ui.update(dt);
      // El zumbido del motor sigue la velocidad real del robot
      if (audio) audio.updateEngine(game.robot.speed, game.robot.fast);
      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);

    // Comprobación de versión: si falta el perro, el navegador tiene JS viejo
    if (!game.dog) {
      const el = root.document.getElementById('build-tag');
      if (el) {
        el.textContent = '⚠ Versión antigua en caché · pulsa Ctrl+Shift+R';
        el.style.color = '#ff8f8f';
      }
    }

    // Expone para depuración y pruebas
    root.__RDR_GAME__ = game;
    root.__RDR_RENDERER__ = renderer;
    root.__RDR_UI__ = ui;
    root.__RDR_AUDIO__ = audio;
    root.__RDR_FIT_HUD__ = fitHud;
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
