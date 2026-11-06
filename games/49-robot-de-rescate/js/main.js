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

    // Ajustes del panel de ayuda
    const helpPanel = root.document.getElementById('help-panel');
    const helpClose = root.document.getElementById('btn-help-close');
    if (helpClose) helpClose.addEventListener('click', function () { helpPanel.classList.remove('open'); });

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
      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);

    // Expone para depuración y pruebas
    root.__RDR_GAME__ = game;
    root.__RDR_RENDERER__ = renderer;
    root.__RDR_UI__ = ui;
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
