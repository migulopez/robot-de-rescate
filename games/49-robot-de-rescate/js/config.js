/* =========================================================
 * 49. Robot de rescate simulado
 * config.js — Parámetros centrales del juego
 * Todos los valores son ajustables desde aquí.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});

  const CONFIG = {
    // ----- Dimensiones del mundo (px de simulación) -----
    WORLD: { width: 2800, height: 2100 },

    // ----- Escala física simulada -----
    // 1 cm real equivale a 2.5 px en el mundo.
    UNITS: { pxPerCm: 2.5 },

    // ----- Robot -----
    ROBOT: {
      radius: 30,              // radio de colisión (px)
      bodyLength: 74,          // largo visual (px)
      bodyWidth: 62,           // ancho visual (px)
      speedNormal: 150,        // px/s -> 60 cm/s
      speedFast: 330,          // px/s -> 132 cm/s
      accel: 620,              // px/s^2
      brakeDecel: 1100,        // px/s^2 (freno ESPACIO)
      reverseFactor: 0.55,     // reversa más lenta
      turnSpeed: 2.7,          // rad/s girando en el lugar
      turnSpeedMoving: 2.2,    // rad/s girando en movimiento
      impactRecover: 0.18,     // s de "sacudida" tras un impacto
    },

    // ----- Sensor ultrasónico HC-SR04 simulado -----
    SENSOR: {
      maxRangeCm: 200,         // alcance máximo del sensor
      minRangeCm: 2,
      halfAngle: Math.PI / 10, // ±18° de campo de detección
      rayStepPx: 3,            // precisión del barrido
      updateInterval: 0.06,    // s entre lecturas (como un HC-SR04 real)
      thresholds: {            // en centímetros
        clear: 50,             // > 50 cm  -> despejado
        near: 20,              // 20-50 cm -> cercano
      },
    },

    // ----- Sistema de estabilidad del transporte -----
    STABILITY: {
      // Tiempo (segundos) que se tolera la velocidad rápida con el gatito arriba.
      // CONFIGURABLE: se puede cambiar en vivo desde el panel o con ?tolerancia=
      toleranceSeconds: 2.5,
      minTolerance: 1,
      maxTolerance: 8,
      recoverRate: 0.34,       // fracción que baja por segundo al ir despacio
      warnAt: 0.3,
      critAt: 0.65,
      curveExponent: 1.6,      // reservado para ajustes finos de la curva
      // La inestabilidad acumulada se reinicia al bajar de este valor
      resetBelow: 0.04,
    },

    // ----- Salud del robot (choques) -----
    HEALTH: {
      max: 100,
      // Coste en % de estabilidad del transporte por cada choque
      collisionPenalty: 32,
      // Cada cuántos choques (a partir de 0) se aplica la penalización completa
      // >3 choques => la estabilidad máxima baja a ~30 %
      floorAfterHits: 30,
      repairPerSecond: 28,     // % que repara el taller por segundo
      repairCostFactor: 1,     // multiplicador del tiempo de reparación
    },

    // ----- Gatito -----
    CAT: {
      interactRadiusPx: 110,   // distancia para poder rescatarlo
      respawnDelay: 1.9,       // s antes de volver al árbol tras caerse
      carriedScale: 0.86,
    },

    // ----- Entrega / veterinaria -----
    DELIVERY: { radius: 92 },

    // ----- Taller de reparación -----
    WORKSHOP: {
      x: 0, y: 0,              // se define en level.js
      radius: 96,
      reachRadius: 112,        // radio para poder reparar
    },

    // ----- Cámara -----
    CAMERA: {
      viewHeight: 980,         // px de mundo visibles en vertical (aprox.)
      minViewWidth: 1240,
      smoothing: 6.5,
      lookAhead: 0.18,
    },

    // ----- Simulación -----
    SIM: { fixedStep: 1 / 120, maxFrameTime: 0.1 },
  };

  // Permite ajustar la tolerancia por URL: ?tolerancia=6
  try {
    const params = new URLSearchParams(root.location ? root.location.search : '');
    const tol = parseFloat(params.get('tolerancia'));
    if (isFinite(tol)) {
      CONFIG.STABILITY.toleranceSeconds = Math.min(
        CONFIG.STABILITY.maxTolerance,
        Math.max(CONFIG.STABILITY.minTolerance, tol)
      );
    }
    // Nivel de dificultad opcional: ?dificil=1 reduce la tolerancia
    if (params.get('dificil') === '1') {
      CONFIG.STABILITY.toleranceSeconds = 1.5;
      CONFIG.HEALTH.collisionPenalty = 40;
    }
  } catch (e) { /* entorno sin location (tests) */ }

  RDR.CONFIG = CONFIG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
