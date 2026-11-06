/* =========================================================
 * 49. Robot de rescate simulado
 * physics.js — Colisiones, integración de movimiento y sensor
 * ultrasonico simulado (HC-SR04).
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});

  /* ---------- Utilidades geométricas ---------- */

  function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function circleCircleOverlap(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by, rr = ar + br;
    return dx * dx + dy * dy < rr * rr;
  }

  /** ¿Colisiona un círculo con algún obstáculo sólido? */
  function collidesAny(x, y, r, obstacles) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.w !== undefined) {
        if (circleRectOverlap(x, y, r, o.x, o.y, o.w, o.h)) return o;
      } else {
        if (circleCircleOverlap(x, y, r, o.x, o.y, o.r)) return o;
      }
    }
    return null;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /* ---------- Intersección rayo / obstáculo ---------- */

  /** Distancia desde (ox,oy) en dirección unitaria (dx,dy) hasta un círculo. */
  function rayCircle(ox, oy, dx, dy, cx, cy, r) {
    const ex = cx - ox, ey = cy - oy;
    const proj = ex * dx + ey * dy;           // proyección sobre el rayo
    const perp2 = ex * ex + ey * ey - proj * proj;
    if (perp2 > r * r) return Infinity;       // el rayo pasa de largo
    const half = Math.sqrt(r * r - perp2);
    const t1 = proj - half, t2 = proj + half;
    if (t1 >= 0) return t1;
    if (t2 >= 0) return 0;                    // el origen ya está dentro
    return Infinity;
  }

  /** Distancia desde (ox,oy) hasta un rectángulo alineado a los ejes (slab method). */
  function rayRect(ox, oy, dx, dy, rx, ry, rw, rh) {
    const invx = dx !== 0 ? 1 / dx : 1e9;
    const invy = dy !== 0 ? 1 / dy : 1e9;
    let t1 = (rx - ox) * invx, t2 = (rx + rw - ox) * invx;
    let t3 = (ry - oy) * invy, t4 = (ry + rh - oy) * invy;
    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    if (tmax < 0 || tmin > tmax) return Infinity;
    return tmin >= 0 ? tmin : 0;
  }

  function rayObstacle(ox, oy, dx, dy, o) {
    if (o.w !== undefined) return rayRect(ox, oy, dx, dy, o.x, o.y, o.w, o.h);
    return rayCircle(ox, oy, dx, dy, o.x, o.y, o.r);
  }

  /**
   * Lectura del sensor ultrasónico.
   * Lanza un abanico de rayos dentro del cono frontal y devuelve la distancia
   * del obstáculo más cercano (en centímetros) junto con su posición.
   *
   * @param {{x:number,y:number,angle:number}} robot
   * @param {Array} obstacles
   * @param {object} cfg  RDR.CONFIG.SENSOR
   * @param {{x:number,y:number}} [extra] obstáculo opcional (p. ej. el gatito)
   */
  function readUltrasonic(robot, obstacles, cfg, extra) {
    const pxPerCm = RDR.CONFIG.UNITS.pxPerCm;
    const maxPx = cfg.maxRangeCm * pxPerCm;
    const originX = robot.x + Math.cos(robot.angle) * (RDR.CONFIG.ROBOT.bodyLength * 0.46);
    const originY = robot.y + Math.sin(robot.angle) * (RDR.CONFIG.ROBOT.bodyLength * 0.46);

    const rays = 7;
    let best = Infinity, bestAngle = robot.angle, hit = null;

    for (let i = 0; i < rays; i++) {
      const t = rays === 1 ? 0 : i / (rays - 1);          // 0..1
      const a = robot.angle - cfg.halfAngle + t * (cfg.halfAngle * 2);
      const dx = Math.cos(a), dy = Math.sin(a);
      let dist = Infinity;

      for (let k = 0; k < obstacles.length; k++) {
        const d = rayObstacle(originX, originY, dx, dy, obstacles[k]);
        if (d < dist) { dist = d; }
      }
      if (extra) {
        const d = rayCircle(originX, originY, dx, dy, extra.x, extra.y, extra.r || 18);
        if (d < dist) dist = d;
      }

      if (dist < best && dist <= maxPx) { best = dist; bestAngle = a; hit = best; }
    }

    const cm = best === Infinity ? cfg.maxRangeCm : Math.max(cfg.minRangeCm, best / pxPerCm);
    const blocked = best <= maxPx;
    return {
      cm: blocked ? cm : cfg.maxRangeCm,
      rawCm: cm,
      detected: blocked,
      angle: bestAngle,
      originX, originY,
      distancePx: best === Infinity ? maxPx : best,
      level: !blocked || cm > cfg.thresholds.clear ? 'clear'
        : cm > cfg.thresholds.near ? 'near' : 'danger',
    };
  }

  /* ---------- Integración del robot ---------- */

  /**
   * Aplica el movimiento del robot con colisiones reales.
   * Usa separación por ejes para permitir "deslizar" sobre los obstáculos.
   * @returns {object} estado de la colisión
   */
  function moveRobot(robot, dt, obstacles, r) {
    const dist = robot.speed * dt;
    let blocked = false;
    let hitObstacle = null;

    if (dist !== 0) {
      const dx = Math.cos(robot.angle) * dist;
      const dy = Math.sin(robot.angle) * dist;
      // Subdividimos para no atravesar objetos con velocidades altas.
      const steps = Math.max(1, Math.ceil(Math.abs(dist) / (r * 0.45)));
      const sx = dx / steps, sy = dy / steps;

      for (let s = 0; s < steps; s++) {
        // Eje X
        if (sx !== 0) {
          const nx = clamp(robot.x + sx, r, RDR.LEVEL.width - r);
          const o = collidesAny(nx, robot.y, r, obstacles);
          if (!o) robot.x = nx; else { blocked = true; hitObstacle = o; }
        }
        // Eje Y
        if (sy !== 0) {
          const ny = clamp(robot.y + sy, r, RDR.LEVEL.height - r);
          const o = collidesAny(robot.x, ny, r, obstacles);
          if (!o) robot.y = ny; else { blocked = true; hitObstacle = o; }
        }
      }
      robot.x = clamp(robot.x, r, RDR.LEVEL.width - r);
      robot.y = clamp(robot.y, r, RDR.LEVEL.height - r);
    }

    return { blocked, obstacle: hitObstacle };
  }

  RDR.physics = {
    collidesAny, circleCircleOverlap, circleRectOverlap,
    rayCircle, rayRect, rayObstacle, readUltrasonic, moveRobot,
    clamp, normAngle,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
