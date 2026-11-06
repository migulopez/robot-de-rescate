/* =========================================================
 * 49. Robot de rescate simulado
 * game.js — Estado, reglas y simulación (independiente del dibujo)
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = (root.RDR = root.RDR || {});
  const P = RDR.physics;

  const STATE = {
    SEARCHING: 'searching',      // buscando al gatito
    CARRYING: 'carrying',        // llevando al gatito
    DELIVERED: 'delivered',      // misión cumplida
    DROPPED: 'dropped',          // el gatito se cayó (reinicio del rescate)
  };

  function createGame(config) {
    const CFG = config || RDR.CONFIG;
    const LEVEL = RDR.LEVEL;

    const game = {
      config: CFG,
      level: LEVEL,
      state: STATE.SEARCHING,
      paused: false,
      finished: false,
      time: 0,                    // tiempo de partida (s)
      robot: {
        x: LEVEL.robotStart.x,
        y: LEVEL.robotStart.y,
        angle: LEVEL.robotStart.angle,
        speed: 0,                 // px/s (negativo = reversa)
        targetSpeed: 0,
        fast: false,
        wheelSpin: 0,             // para animar las ruedas
        impact: 0,                // temporizador de animación de golpe
        blocked: false,
        motor: 'detenido',
      },
      cat: {
        x: LEVEL.catStart.x,
        y: LEVEL.catStart.y,
        state: 'waiting',         // waiting | carried | falling | returning | delivered
        fallProgress: 0,
        wobble: 0,
        respawnTimer: 0,
        onRobot: false,
      },
      stability: {
        tolerance: CFG.STABILITY.toleranceSeconds,
        /** 0 = estable, 1 = el gatito se cae */
        charge: 0,
        warning: false,
        critical: false,
        /**
         * Techo dinámico: cada choque lo reduce (mín. ~30 %).
         * La estabilidad sólo puede subir hasta este valor.
         */
        maxCap: 1,
      },
      /** Salud / integridad del robot (0-100). Se recupera en el taller. */
      health: {
        value: CFG.HEALTH.max,
        max: CFG.HEALTH.max,
        repairing: false,
        repairProgress: 0,
      },
      /** Estado del taller (zona de reparación) */
      workshop: {
        available: true,
        inZone: false,
        repairs: 0,
      },
      sensor: {
        cm: CFG.SENSOR.maxRangeCm,
        detected: false,
        level: 'clear',
        distancePx: 0,
        angle: 0,
        originX: 0,
        originY: 0,
        timer: 0,
      },
      stats: {
        obstaclesAvoided: 0,
        collisions: 0,
        nearMisses: 0,
        fastTimeCarrying: 0,
        drops: 0,
        maxSpeed: 0,
      },
      messages: [],
      events: [],                 // eventos para efectos visuales/sonido
      input: { forward: false, back: false, left: false, right: false, brake: false },
      dog: null,
      interactAvailable: false,
      nearTreeCat: false,
      lastSensorLevel: 'clear',
    };

    /* ---------------- Perro guardián ---------------- */
    if (RDR.createDog) {
      game.dog = RDR.createDog(CFG.DOG, LEVEL);
    }

    /** El perro ha mordido al robot. */
    game.onDogBite = function () {
      const H = CFG.HEALTH;
      game.stats.dogBites = (game.stats.dogBites || 0) + 1;
      game.health.value = Math.max(0, game.health.value - H.collisionPenalty * 0.55);
      game.stability.maxCap = Math.max(H.floorAfterHits / 100,
        game.stability.maxCap - (H.collisionPenalty / 100) * 0.5);

      if (game.cat.state === 'carried') {
        // El susto hace que el gatito se tambalee mucho
        game.stability.charge = Math.min(1, game.stability.charge + 0.42);
        if (game.stability.charge >= 1) {
          game.startCatFall('dog');
        } else {
          game.say('🐕 ¡El perro te muerde! El gatito se asusta', 'danger', 4.5);
        }
      } else {
        game.say('🐕 ¡El perro te ha mordido! −' +
          Math.round(H.collisionPenalty * 0.55) + ' % de salud', 'danger', 4.5);
      }
      if (game.health.value <= 0) {
        game.say('💥 Robot destruido por el perro · ve al TALLER', 'danger', 5);
      }
      game.emit('dog-hit', { x: game.robot.x, y: game.robot.y });
    };

    /** ¿Hay algún peligro que impida reparar en el taller? */
    game.workshopBlockedByDog = function () {
      const d = game.dog;
      if (!d) return false;
      if (!d.isChasing()) return false;
      const W = LEVEL.workshop;
      return Math.hypot(d.x - W.x, d.y - W.y) < 260;
    };

    /* ---------------- Mensajes / eventos ---------------- */

    game.emit = function (type, payload) {
      game.events.push({ type, payload: payload || {}, t: game.time });
    };

    let msgId = 0;
    game.say = function (text, tone, duration) {
      // Si el mismo aviso ya está en pantalla, se refresca en lugar de duplicarse
      for (let i = 0; i < game.messages.length; i++) {
        const m = game.messages[i];
        if (m.text === text) {
          m.life = duration || 2.6;
          m.maxLife = m.life;
          return m;
        }
      }
      const msg = {
        id: ++msgId,
        text: text, tone: tone || 'info',
        life: duration || 2.6, maxLife: duration || 2.6,
      };
      game.messages.push(msg);
      if (game.messages.length > 3) game.messages.shift();
      return msg;
    };

    /* ---------------- Entrada ---------------- */

    game.setKey = function (action, pressed) {
      if (!(action in game.input)) return;
      game.input[action] = pressed;
    };

    game.toggleSpeed = function () {
      game.robot.fast = !game.robot.fast;
      game.emit('speed-toggle', { fast: game.robot.fast });
      game.say(game.robot.fast ? 'Modo RÁPIDO activado' : 'Modo NORMAL activado',
        game.robot.fast ? 'warn' : 'ok', 1.6);
    };

    /** Tecla / botón de interacción (E) */
    game.interact = function () {
      if (game.finished || game.paused) return;
      if (game.state === STATE.SEARCHING && game.interactAvailable) {
        game.pickUpCat();
      } else if (game.state === STATE.CARRYING) {
        // Soltar voluntariamente solo es útil fuera de la veterinaria
        game.dropCatManually();
      }
    };

    /* ---------------- Mecánica del gatito ---------------- */

    game.pickUpCat = function () {
      if (game.cat.state !== 'waiting') return;
      game.cat.state = 'carried';
      game.cat.onRobot = true;
      game.state = STATE.CARRYING;
      game.stability.charge = 0;
      game.stability.warning = false;
      game.stability.critical = false;
      game.emit('cat-pickup', {});
      game.say('¡Gatito rescatado! Llévalo a la VETERINARIA', 'ok', 3.2);
    };

    game.startCatFall = function (reason) {
      if (game.cat.state !== 'carried') return;
      game.cat.state = 'falling';
      game.cat.onRobot = false;
      game.cat.fallProgress = 0;
      game.cat.fallX = game.robot.x;
      game.cat.fallY = game.robot.y;
      game.stats.drops++;
      game.state = STATE.DROPPED;
      game.stability.charge = 1;
      game.emit('cat-fall', { reason });
      game.say('¡El gatito se cayó! Vuelve junto al árbol', 'danger', 3.4);
      // Encuentra un punto libre cerca del robot para dejarlo en el suelo
      let spot = { x: game.robot.x, y: game.robot.y };
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const d = 46 + i * 1.5;
        const cx = game.robot.x + Math.cos(a) * d;
        const cy = game.robot.y + Math.sin(a) * d;
        if (cx > 40 && cy > 40 && cx < LEVEL.width - 40 && cy < LEVEL.height - 40 &&
            !P.collidesAny(cx, cy, 26, LEVEL.obstacles)) { spot = { x: cx, y: cy }; break; }
      }
      game.cat.landX = spot.x;
      game.cat.landY = spot.y;
    };

    game.dropCatManually = function () {
      if (game.cat.state !== 'carried') return;
      // Si el robot está en la zona de entrega, se entrega; si no, se suelta.
      const d = Math.hypot(game.robot.x - LEVEL.delivery.x, game.robot.y - LEVEL.delivery.y);
      if (d < LEVEL.delivery.r) { game.deliverCat(); return; }
      game.cat.state = 'waiting';
      game.cat.onRobot = false;
      game.cat.x = game.robot.x + Math.cos(game.robot.angle) * -60;
      game.cat.y = game.robot.y + Math.sin(game.robot.angle) * -60;
      game.state = STATE.SEARCHING;
      game.say('Gatito en el suelo. Acércate y pulsa E para recogerlo', 'warn', 2.8);
      game.emit('cat-drop', {});
    };

    game.deliverCat = function () {
      if (game.state === STATE.DELIVERED) return;
      game.cat.state = 'delivered';
      game.cat.onRobot = false;
      game.state = STATE.DELIVERED;
      game.finished = true;
      game.stability.charge = 0;
      game.emit('deliver', { time: game.time, stats: game.stats });
      game.say('¡MISIÓN CUMPLIDA!', 'ok', 6);
    };

    /* ---------------- Choques y salud del robot ---------------- */

    /**
     * Registra un choque:
     *  - resta salud al robot,
     *  - reduce el techo de estabilidad (máx. 100 %, y tras más de 3 choques ~30 %),
     *  - si el robot lleva al gatito, el golpe también lo desestabiliza.
     */
    game.registerCollision = function (obstacle, impactSpeed) {
      const H = CFG.HEALTH;
      game.stats.collisions++;
      // El daño depende del golpe: un roce cuesta menos que un impacto a tope
      const ratio = P.clamp((impactSpeed || CFG.ROBOT.speedNormal) / CFG.ROBOT.speedNormal, 0.35, 1.3);
      const damage = H.collisionPenalty * ratio;
      game.health.value = Math.max(0, game.health.value - damage);

      // Techo de estabilidad: baja con cada choque hasta un mínimo del 30 %.
      const floor = H.floorAfterHits / 100;
      const before = game.stability.maxCap;
      const drop = (H.collisionPenalty / 100) * ratio * (before > 0.6 ? 1 : 0.45);
      game.stability.maxCap = Math.max(floor, before - drop);

      if (game.cat.state === 'carried') {
        // El golpe hace que el gatito se tambalee
        game.stability.charge = Math.min(1,
          game.stability.charge + 0.18 + (game.robot.fast ? 0.1 : 0));
      }
      game.stability.charge = Math.min(game.stability.charge, game.stability.maxCap);

      game.emit('impact', {
        x: game.robot.x, y: game.robot.y, obstacle: obstacle,
        health: game.health.value, maxCap: game.stability.maxCap,
      });

      const hp = Math.round(game.health.value);
      const cap = Math.round(game.stability.maxCap * 100);
      if (game.health.value <= 0) {
        game.say('💥 ¡Robot destruido! Salud 0 % · ve al TALLER', 'danger', 5);
      } else if (game.stats.collisions >= H.floorAfterHits + 1) {
        game.say('💥 ¡Choque! Salud ' + hp + ' % · estabilidad máx. ' + cap +
          ' % · ¡repara en el TALLER!', 'danger', 5);
      } else {
        game.say('💥 ¡Choque! Salud ' + hp + ' % · estabilidad máx. ' + cap + ' %',
          'danger', 4.5);
      }

      // La entrega se cancela si el golpe tira al gatito
      if (game.stability.charge >= 1 && game.cat.state === 'carried') {
        game.startCatFall('crash');
      }
    };

    /* ---------------- Taller de reparación ---------------- */

    game.updateWorkshop = function (dt) {
      const W = LEVEL.workshop;
      const d = Math.hypot(game.robot.x - W.x, game.robot.y - W.y);
      const inZone = d < (W.reachRadius || 110);
      game.workshop.inZone = inZone;

      const needsRepair = game.health.value < CFG.HEALTH.max - 0.01 ||
        game.stability.maxCap < 0.999;

      const blocked = game.workshopBlockedByDog && game.workshopBlockedByDog();
      game.workshop.blocked = !!blocked;
      if (inZone && needsRepair && !blocked) {
        game.health.repairing = true;
        const rate = CFG.HEALTH.repairPerSecond * (CFG.HEALTH.repairCostFactor || 1);
        game.health.value = Math.min(CFG.HEALTH.max, game.health.value + rate * dt);
        // La estabilidad máxima también se restaura
        game.stability.maxCap = Math.min(1, game.stability.maxCap + (rate / 100) * 1.6 * dt);
        game.health.repairProgress = 1 - game.health.value / CFG.HEALTH.max;

        if (game.health.value >= CFG.HEALTH.max - 0.01 &&
            game.stability.maxCap >= 0.999) {
          game.health.value = CFG.HEALTH.max;
          game.stability.maxCap = 1;
          game.workshop.repairs++;
          game.health.repairing = false;
          game.health.repairProgress = 0;
          game.emit('repaired', {});
          game.say('✔ Robot reparado al 100 %. ¡A rescatar!', 'ok', 3);
        }
      } else {
        game.health.repairing = false;
        if (blocked && !game._workshopBlockedHint) {
          game._workshopBlockedHint = true;
          game.say('¡El perro no te deja reparar! Aléjalo o escóndete', 'danger', 3.6);
        }
        if (!blocked) game._workshopBlockedHint = false;
        if (inZone && !needsRepair && !game._workshopHinted) {
          game._workshopHinted = true;
          game.say('Robot en perfecto estado (100 %)', 'ok', 2.2);
        }
      }
      if (!inZone) game._workshopHinted = false;
    };

    /** ¿Se puede reparar ahora mismo? (para el HUD) */
    game.canRepair = function () {
      return game.workshop.inZone &&
        (game.health.value < CFG.HEALTH.max - 0.01 || game.stability.maxCap < 0.999);
    };

    /* ---------------- Reinicio ---------------- */

    game.reset = function (keepConfig) {
      game.state = STATE.SEARCHING;
      game.paused = false;
      game.finished = false;
      game.time = 0;
      game.input.forward = game.input.back = false;
      game.input.left = game.input.right = false;
      game.input.brake = false;
      game._hadNearThreat = false;
      game._collisionCooldown = 0;
      game.robot.x = LEVEL.robotStart.x;
      game.robot.y = LEVEL.robotStart.y;
      game.robot.angle = LEVEL.robotStart.angle;
      game.robot.speed = 0;
      game.robot.targetSpeed = 0;
      game.robot.fast = false;
      game.robot.wheelSpin = 0;
      game.robot.impact = 0;
      game.cat.x = LEVEL.catStart.x;
      game.cat.y = LEVEL.catStart.y;
      game.cat.state = 'waiting';
      game.cat.onRobot = false;
      game.cat.wobble = 0;
      game.cat.fallProgress = 0;
      game.cat.respawnTimer = 0;
      game.cat.deliveryT = 0;
      game.stability.charge = 0;
      game.stability.warning = false;
      game.stability.critical = false;
      game.stability.maxCap = 1;
      game.health.value = CFG.HEALTH.max;
      game.health.repairing = false;
      game.health.repairProgress = 0;
      game.workshop.available = true;
      game.workshop.inZone = false;
      game.workshop.repairs = 0;
      game._workshopHinted = false;
      game.sensor.cm = CFG.SENSOR.maxRangeCm;
      game.sensor.detected = false;
      game.sensor.level = 'clear';
      game.stats = {
        obstaclesAvoided: 0, collisions: 0, nearMisses: 0,
        fastTimeCarrying: 0, drops: 0, maxSpeed: 0, repairs: 0, dogBites: 0,
      };
      if (game.dog) game.dog.reset();
      game._wasBlocked = false;
      game._workshopBlockedHint = false;
      game.messages.length = 0;
      game.events.length = 0;
      game.lastSensorLevel = 'clear';
      game.say('¡Rescate iniciado! Encuentra al gatito junto al árbol', 'info', 3);
    };

    /* ---------------- Simulación ---------------- */

    game.updateSensor = function () {
      const extra = (game.cat.state === 'waiting')
        ? { x: game.cat.x, y: game.cat.y, r: 14 } : null;
      const r = P.readUltrasonic(game.robot, LEVEL.obstacles, CFG.SENSOR, extra);
      game.sensor.cm = r.cm;
      game.sensor.detected = r.detected;
      game.sensor.level = r.level;
      game.sensor.distancePx = r.distancePx;
      game.sensor.angle = r.angle;
      game.sensor.originX = r.originX;
      game.sensor.originY = r.originY;

      // Advertencias por cambio de nivel
      if (r.level !== game.lastSensorLevel) {
        if (r.level === 'near') {
          game.say('Obstáculo detectado a ' + Math.round(r.cm) + ' cm', 'warn', 2.2);
        } else if (r.level === 'danger') {
          game.say('¡ALERTA! Obstáculo a corta distancia (' + Math.round(r.cm) + ' cm)', 'danger', 2.4);
          game.emit('sensor-alert', {});
        }
        game.lastSensorLevel = r.level;
      }
      return r;
    };

    /**
     * Un paso de simulación con dt fijo.
     * @param {number} dt segundos
     */
    game.step = function (dt) {
      if (game.paused || game.finished) {
        // Aun finalizado, deja que el gatito termine su animación de entrega.
        game.updateEffects(dt);
        return;
      }
      game.time += dt;
      const robot = game.robot;
      const C = CFG.ROBOT;
      const input = game.input;

      /* --- 1. Velocidad objetivo --- */
      const baseSpeed = robot.fast ? C.speedFast : C.speedNormal;
      let target = 0;
      if (input.forward) target = baseSpeed;
      else if (input.back) target = -baseSpeed * C.reverseFactor;
      if (input.brake) target = 0;

      robot.targetSpeed = target;
      const rate = (Math.abs(target) < Math.abs(robot.speed) || input.brake)
        ? C.brakeDecel : C.accel;
      if (robot.speed < target) robot.speed = Math.min(target, robot.speed + rate * dt);
      else if (robot.speed > target) robot.speed = Math.max(target, robot.speed - rate * dt);
      if (Math.abs(robot.speed) < 1.5 && target === 0) robot.speed = 0;

      /* --- 2. Giro (solo tiene efecto real si se está moviendo lento o quieto) --- */
      const turnDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      if (turnDir !== 0) {
        const turnRate = Math.abs(robot.speed) > 40 ? C.turnSpeedMoving : C.turnSpeed;
        // A velocidad alta el robot gira menos (como un robot real con ruedas diferenciales)
        const speedPenalty = 1 / (1 + Math.abs(robot.speed) / (C.speedFast * 1.4));
        const delta = turnDir * turnRate * speedPenalty * dt;
        // Intenta girar; si el giro mete el chasis en un obstáculo, se bloquea
        const probeDist = Math.abs(robot.speed) * dt + 26;
        const px = robot.x + Math.cos(robot.angle + delta) * probeDist * 0.6;
        const py = robot.y + Math.sin(robot.angle + delta) * probeDist * 0.6;
        if (!P.collidesAny(px, py, C.radius * 0.92, LEVEL.obstacles)) {
          robot.angle = P.normAngle(robot.angle + delta);
        } else {
          robot.blocked = true;
        }
      }

      /* --- 3. Desplazamiento con colisiones --- */
      const before = { x: robot.x, y: robot.y };
      const res = P.moveRobot(robot, dt, LEVEL.obstacles, C.radius);
      const moved = Math.hypot(robot.x - before.x, robot.y - before.y);
      robot.wheelSpin += (moved / 26) * (robot.speed >= 0 ? 1 : -1);
      robot.blocked = res.blocked;

      // Un choque cuenta a CUALQUIER velocidad por encima de un mínimo:
      // antes sólo se registraba por encima de 30 px/s y los toques suaves
      // contra un obstáculo no restaban salud.
      // Sólo se contabiliza el INICIO del contacto: mientras el robot sigue
      // empujando el mismo obstáculo no se vuelve a restar salud.
      game._collisionCooldown = Math.max(0, (game._collisionCooldown || 0) - dt);
      const contactStart = res.blocked && !game._wasBlocked;
      if (contactStart && Math.abs(robot.speed) > 4 && game._collisionCooldown <= 0) {
        game.registerCollision(res.obstacle, Math.abs(robot.speed));
        game._collisionCooldown = CFG.HEALTH.collisionCooldown;
        robot.impact = CFG.ROBOT.impactRecover * 2;
        robot.speed *= 0.12;                  // el robot queda bloqueado
      } else if (res.blocked) {
        robot.speed *= 0.35;
      }
      game._wasBlocked = res.blocked;
      if (robot.impact > 0) robot.impact = Math.max(0, robot.impact - dt);

      // Estado del motor (para el panel técnico)
      if (input.brake) robot.motor = 'frenando';
      else if (Math.abs(robot.speed) < 2) robot.motor = 'detenido';
      else robot.motor = robot.speed > 0 ? (robot.fast ? 'adelante (rápido)' : 'adelante') : 'reversa';

      game.stats.maxSpeed = Math.max(game.stats.maxSpeed, Math.abs(robot.speed));

      /* --- 4. Sensor ultrasónico (muestreado, como el hardware real) --- */
      game.sensor.timer -= dt;
      if (game.sensor.timer <= 0) {
        game.sensor.timer = CFG.SENSOR.updateInterval;
        game.updateSensor();
      }

      /* --- 5. Gatito: interacción y seguimiento --- */
      const cat = game.cat;
      const distToCat = Math.hypot(robot.x - cat.x, robot.y - cat.y);

      if (cat.state === 'waiting') {
        game.interactAvailable = distToCat < CFG.CAT.interactRadiusPx &&
          game.state === STATE.SEARCHING;
      } else {
        game.interactAvailable = false;
      }

      if (cat.state === 'carried') {
        // El gatito viaja sobre la plataforma de transporte
        cat.x = robot.x + Math.cos(robot.angle) * 4;
        cat.y = robot.y + Math.sin(robot.angle) * 4;
        cat.wobble = game.stability.charge;
      }

      if (cat.state === 'falling') {
        cat.fallProgress = Math.min(1, cat.fallProgress + dt * 1.9);
        const t = cat.fallProgress;
        cat.x = cat.fallX + (cat.landX - cat.fallX) * t;
        cat.y = cat.fallY + (cat.landY - cat.fallY) * t;
        if (cat.fallProgress >= 1) {
          cat.state = 'returning';
          cat.respawnTimer = 0;
          game.say('El gatito vuelve junto al árbol...', 'warn', 2);
        }
      }

      if (cat.state === 'returning') {
        cat.respawnTimer += dt;
        if (cat.respawnTimer > CFG.CAT.respawnDelay) {
          cat.state = 'waiting';
          cat.x = LEVEL.catStart.x;
          cat.y = LEVEL.catStart.y;
          cat.wobble = 0;
          game.state = STATE.SEARCHING;
          game.stability.charge = 0;
          game.emit('cat-respawn', {});
        }
      }

      /* --- 6. Estabilidad del transporte --- */
      const S = CFG.STABILITY;
      const carrying = cat.state === 'carried';
      if (carrying) {
        // Cuanto más rápido va, mucho más rápido se vuelve inestable.
        // A velocidad normal no carga; a velocidad rápida se llena justo en
        // el tiempo de tolerancia configurado (el jugador ve el aviso antes).
        const ratio = Math.abs(robot.speed) / Math.max(1, CFG.ROBOT.speedNormal);
        const fastRatio = CFG.ROBOT.speedFast / CFG.ROBOT.speedNormal;
        const tooFast = ratio > 1.02;
        if (tooFast) {
          game.stats.fastTimeCarrying += dt;
          // 0 en velocidad normal, 1 a velocidad rápida
          const severity = P.clamp((ratio - 1.02) / (fastRatio - 1.02), 0, 1);
          // Curva: a tope llena en ~tolerance, a medio camino tarda más
          const rate = 0.42 + 0.58 * Math.pow(severity, 0.75);
          const base = dt / Math.max(0.35, game.stability.tolerance);
          game.stability.charge += base * rate;
          game.stability.charge = Math.min(1, game.stability.charge);
          if (!game.stability.warning && game.stability.charge >= S.warnAt) {
            game.stability.warning = true;
            game.say('¡Cuidado! Estás transportando al gatito demasiado rápido', 'danger', 3.4);
            game.emit('stability-warn', {});
          }
          if (!game.stability.critical && game.stability.charge >= S.critAt) {
            game.stability.critical = true;
            game.emit('stability-critical', {});
          }
          if (game.stability.charge >= 1) {
            game.stability.charge = 1;
            game.startCatFall('speed');
          }
        } else {
          // Al bajar la velocidad el indicador disminuye poco a poco
          game.stability.charge = Math.max(0,
            game.stability.charge - dt * S.recoverRate);
          if (game.stability.charge < S.warnAt) {
            game.stability.warning = false;
            game.stability.critical = false;
          }
        }
        // El techo por choques nunca se supera
        if (game.stability.charge > game.stability.maxCap) {
          game.stability.charge = game.stability.maxCap;
        }

        // Entrega en la veterinaria
        const d = Math.hypot(robot.x - LEVEL.delivery.x, robot.y - LEVEL.delivery.y);
        if (d < LEVEL.delivery.r) {
          game.deliverCat();
        }
      }

      /* --- 6b. Perro guardián --- */
      if (game.dog) {
        game.dog.update(dt, robot, game);
        // El perro no puede entrar en la zona del taller: es lugar seguro
        if (game.dog.isChasing() && game.workshop.inZone) {
          game.dog.state = 'return';
          game.dog.cooldown = 1.2;
        }
      }

      /* --- 6c. Taller de reparación --- */
      game.updateWorkshop(dt);

      /* --- 7. Estadísticas de obstáculos evitados --- */
      // Cuenta un "obstáculo evitado" cuando el sensor pasó de cerca/peligro a despejado
      if (game.sensor.level === 'clear' && game._hadNearThreat) {
        game.stats.obstaclesAvoided++;
        game._hadNearThreat = false;
      game._collisionCooldown = 0;
      }
      if (game.sensor.level !== 'clear') game._hadNearThreat = true;

      game.updateEffects(dt);
    };

    /** Animación de los mensajes y del sistema de partículas. */
    game.updateEffects = function (dt) {
      for (let i = game.messages.length - 1; i >= 0; i--) {
        game.messages[i].life -= dt;
        if (game.messages[i].life <= 0) game.messages.splice(i, 1);
      }
      if (game.state === STATE.DELIVERED) {
        game.cat.deliveryT = Math.min(1, (game.cat.deliveryT || 0) + dt * 2.2);
      }
    };

    /* ---------------- Consultas de estado ---------------- */

    game.objectiveText = function () {
      switch (game.state) {
        case STATE.SEARCHING:
          return game.cat.state === 'returning'
            ? 'Espera a que el gatito vuelva al árbol'
            : 'Llega hasta el gatito y pulsa E';
        case STATE.CARRYING:
          if (game.health.value < CFG.HEALTH.max * 0.5) {
            return 'Robot dañado · repara en el TALLER o sigue con cuidado';
          }
          return 'Lleva al gatito a la VETERINARIA (velocidad moderada)';
        case STATE.DELIVERED:
          return '¡Misión cumplida! Gatito entregado';
        case STATE.DROPPED:
          return 'Recupera al gatito junto al árbol';
        default:
          return '';
      }
    };

    game.dogStatusText = function () {
      const d = game.dog;
      if (!d) return { label: 'Sin perro', level: 'safe' };
      const lvl = d.dangerLevel();
      if (lvl === 'chase') return { label: '¡Te está persiguiendo!', level: 'chase' };
      if (lvl === 'alert') return { label: 'Te ha detectado', level: 'alert' };
      if (lvl === 'near') return { label: 'Cerca de ti', level: 'near' };
      return { label: 'Tranquilo', level: 'safe' };
    };

    game.catStatusText = function () {
      if (game.cat.state === 'carried') return 'A bordo del robot';
      if (game.cat.state === 'delivered') return 'Entregado';
      if (game.cat.state === 'falling' || game.cat.state === 'returning') return 'Se cayó';
      return 'Pendiente de rescate';
    };

    game.reset();
    return game;
  }

  RDR.STATE = STATE;
  RDR.createGame = createGame;
})(typeof globalThis !== 'undefined' ? globalThis : this);
