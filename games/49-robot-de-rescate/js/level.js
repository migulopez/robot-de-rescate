/* =========================================================
 * 49. Robot de rescate simulado
 * level.js — Definición del escenario (vista cenital)
 * Cada obstáculo tiene colisión real.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});

  /**
   * Tipos de obstáculo:
   *  - círculos:  { type, x, y, r }
   *  - rectángulos: { type, x, y, w, h }  (x,y = esquina superior izquierda)
   * Todos los obstáculos sólidos participan en colisiones y en el sensor ultrasónico.
   */
  const OBSTACLES = [
    // --- Zona del árbol y el gatito ---
    { type: 'tree',    x: 330, y: 1190, r: 62, main: true },
    { type: 'bush',    x: 250, y: 1080, r: 40 },
    { type: 'rock',    x: 560, y: 1290, r: 34 },
    { type: 'bench',   x: 270, y: 800,  w: 56,  h: 168 },
    { type: 'planter', x: 640, y: 1230, r: 30 },

    // --- Parque central ---
    { type: 'rock',    x: 700, y: 980,  r: 34 },
    { type: 'bench',   x: 600, y: 760,  w: 160, h: 52 },
    { type: 'tree',    x: 820, y: 1150, r: 56 },
    { type: 'crate',   x: 980, y: 1000, w: 66,  h: 66 },
    { type: 'planter', x: 1150, y: 890, r: 32 },
    { type: 'barrier', x: 1230, y: 640, w: 220, h: 30 },
    { type: 'bench',   x: 940, y: 560,  w: 160, h: 52 },
    { type: 'rock',    x: 520, y: 640,  r: 30 },
    { type: 'planter', x: 720, y: 470,  r: 34 },
    { type: 'barrier', x: 1150, y: 1030, w: 30, h: 190 },
    { type: 'crate',   x: 1300, y: 1180, w: 72, h: 72 },
    { type: 'tree',    x: 1420, y: 980,  r: 54 },
    { type: 'rock',    x: 1560, y: 730,  r: 40 },
    { type: 'tree',    x: 1620, y: 1110, r: 56 },
    { type: 'barrier', x: 1490, y: 470,  w: 30, h: 210 },
    { type: 'crate',   x: 1780, y: 610,  w: 62, h: 62 },
    { type: 'planter', x: 1740, y: 900,  r: 34 },
    { type: 'tree',    x: 1050, y: 260,  r: 54 },
    { type: 'rock',    x: 880, y: 340,  r: 36 },
    { type: 'tree',    x: 500, y: 330,  r: 56 },
    { type: 'bush',    x: 260, y: 480,  r: 42 },
    { type: 'bush',    x: 1860, y: 1180, r: 44 },
    { type: 'crate',   x: 900, y: 1290, w: 64, h: 64 },

    // --- Edificio de la veterinaria (sólido) ---
    { type: 'vet',     x: 1535, y: 205, w: 250, h: 175 },
  ];

  // Decoración sin colisión
  const DECOR = {
    // camino de tierra sugerido (polilínea gruesa)
    road: [
      { x: 430, y: 1210 }, { x: 640, y: 1090 }, { x: 850, y: 900 },
      { x: 1000, y: 760 }, { x: 1180, y: 560 }, { x: 1390, y: 470 },
      { x: 1560, y: 420 }, { x: 1660, y: 350 },
    ],
    roadWidth: 96,
    flowers: [
      { x: 200, y: 1320 }, { x: 300, y: 1400 }, { x: 760, y: 1320 },
      { x: 1080, y: 1420 }, { x: 1400, y: 1330 }, { x: 1720, y: 1280 },
      { x: 1900, y: 200 }, { x: 380, y: 200 }, { x: 760, y: 140 },
      { x: 1240, y: 140 }, { x: 1600, y: 150 }, { x: 950, y: 700 },
      { x: 1330, y: 800 }, { x: 620, y: 900 },
    ],
    grassPatches: [
      { x: 300, y: 600, rx: 160, ry: 90 },
      { x: 1200, y: 1300, rx: 220, ry: 100 },
      { x: 1700, y: 200, rx: 180, ry: 110 },
      { x: 850, y: 180, rx: 200, ry: 90 },
      { x: 1500, y: 620, rx: 150, ry: 220 },
    ],
    benchesDecor: [],
  };

  const LEVEL = {
    width: RDR.CONFIG.WORLD.width,
    height: RDR.CONFIG.WORLD.height,
    obstacles: OBSTACLES,
    decor: DECOR,
    tree: { x: 330, y: 1190 },
    robotStart: { x: 470, y: 1080, angle: -Math.PI / 2 },
    catStart: { x: 405, y: 1272 },
    vet: { x: 1660, y: 292, w: 250, h: 175 },
    delivery: { x: 1660, y: 470, r: RDR.CONFIG.DELIVERY.radius },
  };

  RDR.LEVEL = LEVEL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
