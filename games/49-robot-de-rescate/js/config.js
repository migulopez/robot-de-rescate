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
    WORLD: { width: 2000, height: 1500 },

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
      toleranceSeconds: 4,
      minTolerance: 1.5,
      maxTolerance: 10,
      recoverRate: 0.5,        // fracción que baja por segundo al ir despacio
      warnAt: 0.35,
      critAt: 0.72,
    },

    // ----- Gatito -----
    CAT: {
      interactRadiusPx: 100,   // distancia para poder rescatarlo
      respawnDelay: 1.9,       // s antes de volver al árbol tras caerse
      carriedScale: 0.86,
    },

    // ----- Entrega / veterinaria -----
    DELIVERY: { radius: 88 },

    // ----- Cámara -----
    CAMERA: {
      viewHeight: 940,         // px de mundo visibles en vertical (aprox.)
      minViewWidth: 1180,
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
  } catch (e) { /* entorno sin location (tests) */ }

  RDR.CONFIG = CONFIG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
