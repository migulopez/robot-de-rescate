/* =========================================================
 * 49. Robot de rescate simulado
 * dog.js — Perro guardián: patrulla, detecta y persigue al robot
 *
 * Estados:
 *   idle     → descansa junto a su caseta
 *   patrol   → pasea por puntos alrededor de la caseta
 *   alert    → ha detectado al robot y se gira hacia él (ladra)
 *   chase    → persigue al robot
 *   search   → ha perdido el rastro, busca unos segundos
 *   return   → vuelve a su caseta
 *   bite     → muerde (daña el robot y asusta al gatito)
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});
  const P = RDR.physics;

  function createDog(cfg, level) {
    const home = level.dogHouse || { x: level.width / 2, y: level.height / 2 };
    const dog = {
      x: home.x + 150,
      y: home.y + 190,
      angle: Math.PI / 2,
      state: 'patrol',
      speed: 0,
      walkPhase: 0,
      barkTimer: 0,
      lostTimer: 0,
      biteTimer: 0,
      alertTimer: 0,
      seen: false,
      distanceToRobot: Infinity,
      target: { x: home.x, y: home.y },
      patrol: [],
      patrolIndex: 0,
      patrolTimer: 2,
      home,
      /** nivel de "calma" tras morder: no persigue durante un instante */
      cooldown: 0,
    };

    /* Puntos de patrulla alrededor de la caseta */
    function buildPatrol() {
      const R = cfg.leashPatrolRadius;
      dog.patrol = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.35;
        for (let k = 0; k < 8; k++) {
          const ang = a + k * 0.18;
          const px = home.x + Math.cos(ang) * R * (0.55 + (i % 3) * 0.22);
          const py = home.y + Math.sin(ang) * R * (0.55 + (i % 3) * 0.22);
          if (!P.collidesAny(px, py, cfg.radius + 8, level.obstacles)) {
            dog.patrol.push({ x: px, y: py });
            break;
          }
        }
      }
      if (!dog.patrol.length) dog.patrol.push({ x: home.x, y: home.y + R });
    }
    buildPatrol();
    dog.target = dog.patrol[0] || { x: home.x, y: home.y };
    dog.x = dog.target.x;
    dog.y = dog.target.y;

    /* ---------- Detección ---------- */

    /**
     * ¿El perro ve/detecta al robot?
     * Combina distancia, campo de visión y "olfato" a corta distancia.
     */
    dog.sensesRobot = function (robot) {
      const dx = robot.x - dog.x;
      const dy = robot.y - dog.y;
      const dist = Math.hypot(dx, dy);
      dog.distanceToRobot = dist;
      if (dist > cfg.loseRangePx) return false;
      if (dist < cfg.detectRangePx * 0.32) return true;  // muy cerca: lo detecta siempre

      const ang = Math.atan2(dy, dx);
      const diff = Math.abs(P.normAngle(ang - dog.angle));
      const inCone = diff < cfg.detectHalfAngle;

      // El robot hace ruido: si corre, el perro lo oye desde más lejos
      const noisy = Math.abs(robot.speed) > RDR.CONFIG.ROBOT.speedNormal * 1.05;
      const range = cfg.detectRangePx * (noisy ? 1.25 : 1);
      if (dist > range) return false;

      if (inCone) return true;
      // Fuera del cono sólo lo detecta si está muy cerca (olfato/oído)
      return dist < cfg.detectRangePx * 0.45;
    };

    /* ---------- Movimiento con colisiones ---------- */

    function moveTowards(x, y, speed, dt) {
      const dx = x - dog.x;
      const dy = y - dog.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return dist;
      const target = Math.atan2(dy, dx);
      // Giro suave hacia el objetivo
      const diff = P.normAngle(target - dog.angle);
      const maxTurn = 4.6 * dt;
      dog.angle = P.normAngle(dog.angle + Math.max(-maxTurn, Math.min(maxTurn, diff)));

      const step = Math.min(speed * dt, dist);
      const nx = dog.x + Math.cos(dog.angle) * step;
      const ny = dog.y + Math.sin(dog.angle) * step;
      // Colisiones: intenta deslizarse por los ejes
      let moved = false;
      if (!P.collidesAny(nx, dog.y, cfg.radius, RDR.LEVEL.obstacles)) {
        dog.x = nx; moved = true;
      }
      if (!P.collidesAny(dog.x, ny, cfg.radius, RDR.LEVEL.obstacles)) {
        dog.y = ny; moved = true;
      }
      if (!moved) {
        // Atascado: gira un poco para buscar hueco
        dog.angle = P.normAngle(dog.angle + 1.6 * dt);
      }
      dog.x = P.clamp(dog.x, cfg.radius + 20, RDR.LEVEL.width - cfg.radius - 20);
      dog.y = P.clamp(dog.y, cfg.radius + 20, RDR.LEVEL.height - cfg.radius - 20);
      dog.walkPhase += step / 22;
      return dist;
    }

    /* ---------- Actualización ---------- */

    dog.update = function (dt, robot, game) {
      dog.barkTimer = Math.max(0, dog.barkTimer - dt);
      dog.biteTimer = Math.max(0, dog.biteTimer - dt);
      dog.cooldown = Math.max(0, dog.cooldown - dt);

      const sees = dog.sensesRobot(robot) && dog.cooldown <= 0;
      dog.seen = sees;

      if (sees && dog.state !== 'chase' && dog.state !== 'alert') {
        dog.state = 'alert';
        dog.alertTimer = 0.42;
        if (dog.barkTimer <= 0) {
          dog.barkTimer = cfg.barkCooldown;
          game.emit('dog-bark', { x: dog.x, y: dog.y });
          game.say('🐕 ¡Guau guau! El perro te ha detectado', 'danger', 4.2);
        }
      }

      switch (dog.state) {
        case 'alert': {
          dog.alertTimer -= dt;
          // se gira hacia el robot
          const a = Math.atan2(robot.y - dog.y, robot.x - dog.x);
          const diff = P.normAngle(a - dog.angle);
          dog.angle = P.normAngle(dog.angle + Math.max(-6 * dt, Math.min(6 * dt, diff)));
          if (dog.alertTimer <= 0) dog.state = 'chase';
          break;
        }
        case 'chase': {
          if (sees) {
            dog.lostTimer = 0;
            moveTowards(robot.x, robot.y, cfg.speedChase, dt);
            if (dog.barkTimer <= 0 && dog.distanceToRobot < 420) {
              dog.barkTimer = cfg.barkCooldown;
              game.emit('dog-bark', { x: dog.x, y: dog.y });
            }
            // ¿lo atrapa?
            const d = Math.hypot(robot.x - dog.x, robot.y - dog.y);
            if (d < cfg.radius + RDR.CONFIG.ROBOT.radius + cfg.catchRadius &&
                dog.biteTimer <= 0) {
              dog.biteTimer = cfg.biteCooldown;
              dog.state = 'bite';
              dog.alertTimer = 0.35;
              game.emit('dog-bite', { x: dog.x, y: dog.y });
              game.onDogBite();
            }
          } else {
            dog.lostTimer += dt;
            if (dog.lostTimer > cfg.loseTime) {
              dog.state = 'search';
              dog.alertTimer = 2.6;
              game.say('El perro te ha perdido de vista…', 'ok', 2.6);
            }
          }
          break;
        }
        case 'bite': {
          dog.alertTimer -= dt;
          if (dog.alertTimer <= 0) {
            dog.state = 'chase';
            dog.cooldown = 0.5;
          }
          break;
        }
        case 'search': {
          dog.alertTimer -= dt;
          // gira buscando
          dog.angle = P.normAngle(dog.angle + 1.9 * dt);
          if (dog.alertTimer <= 0) dog.state = 'return';
          break;
        }
        case 'return': {
          const d = moveTowards(dog.home.x + 40, dog.home.y + 120, cfg.speedPatrol * 1.15, dt);
          if (d < 40) {
            dog.state = 'patrol';
            dog.patrolIndex = 0;
          }
          break;
        }
        case 'patrol':
        default: {
          dog.state = 'patrol';
          const t = dog.target;
          const d = moveTowards(t.x, t.y, cfg.speedPatrol, dt);
          if (d < 26) {
            dog.patrolIndex = (dog.patrolIndex + 1) % Math.max(1, dog.patrol.length);
            dog.target = dog.patrol[dog.patrolIndex] || dog.home;
          }
          break;
        }
      }
    };

    dog.isChasing = function () {
      return dog.state === 'chase' || dog.state === 'alert' || dog.state === 'bite';
    };

    /** ¿Está el robot dentro del alcance de detección? (para el HUD) */
    dog.dangerLevel = function () {
      if (dog.state === 'chase' || dog.state === 'bite') return 'chase';
      if (dog.state === 'alert' || dog.state === 'search') return 'alert';
      if (dog.distanceToRobot < RDR.CONFIG.DOG.detectRangePx) return 'near';
      return 'safe';
    };

    dog.reset = function () {
      dog.state = 'patrol';
      dog.patrolIndex = 0;
      dog.target = dog.patrol[0] || dog.home;
      dog.x = dog.target.x;
      dog.y = dog.target.y;
      dog.angle = Math.PI / 2;
      dog.barkTimer = 0;
      dog.biteTimer = 0;
      dog.lostTimer = 0;
      dog.cooldown = 0;
      dog.seen = false;
      dog.walkPhase = 0;
    };

    return dog;
  }

  RDR.createDog = createDog;
})(typeof globalThis !== 'undefined' ? globalThis : this);
