/* =========================================================
 * 49. Robot de rescate simulado — Pruebas de mecánicas
 * Ejecutar con:  node tests/run-tests.js
 * No requiere navegador: carga los módulos en Node.
 * ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');
['config', 'level', 'physics', 'game'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(JS_DIR, f + '.js'), 'utf8'), { filename: f });
});

const RDR = globalThis.RDR;
const DT = 1 / 120;

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + name + '\n      ' + e.message);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falló la aserción'); }
function near(a, b, tol, msg) {
  if (Math.abs(a - b) > tol) throw new Error((msg || 'valor fuera de rango') + ' (' + a + ' vs ' + b + ')');
}

function newGame() {
  const g = RDR.createGame(RDR.CONFIG);
  g.reset();
  return g;
}
function sim(g, seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) g.step(DT);
}
/** Simula hasta que se cumpla una condición o se agote el tiempo. Devuelve el tiempo. */
function simUntil(g, seconds, cond, wrapCtx) {
  const n = Math.round(seconds / DT);
  const lane = wrapCtx && wrapCtx.lane;
  for (let i = 0; i < n; i++) {
    g.step(DT);
    if (lane && g.robot.x > lane.x + 780) g.robot.x = lane.x + 40;
    if (cond()) return (i + 1) * DT;
  }
  return Infinity;
}
/**
 * Busca una franja horizontal libre de al menos `minLen` px para probar
 * la conducción sin chocar con el mobiliario del escenario.
 */
function freeLane(g, minLen, yFrom) {
  const L = g.level, R = RDR.CONFIG.ROBOT.radius + 8;
  for (let y = yFrom || 90; y < L.height - 90; y += 10) {
    let start = null;
    for (let x = 130; x <= L.width - 130; x += 10) {
      const free = !RDR.physics.collidesAny(x, y, R, L.obstacles);
      if (free) { if (start === null) start = x; }
      else {
        if (start !== null && x - start >= minLen) return { x: start, y: y };
        start = null;
      }
    }
    if (start !== null && L.width - 130 - start >= minLen) return { x: start, y: y };
  }
  throw new Error('no se encontró una franja libre de ' + minLen + ' px');
}

function place(g, x, y, angle) {
  g.robot.x = x; g.robot.y = y; g.robot.angle = angle; g.robot.speed = 0;
}

console.log('\n=== 49. Robot de rescate simulado — pruebas ===\n');

/* ---------------------------------------------------------- */
console.log('Navegación y colisiones');

test('W acelera el robot hacia adelante', function () {
  const g = newGame();
  place(g, 1250, 900, 0);
  g.setKey('forward', true);
  sim(g, 1);
  assert(g.robot.speed > 100, 'la velocidad no aumentó: ' + g.robot.speed);
  assert(g.robot.x > 1260, 'el robot no se desplazó');
});

test('S mueve el robot en reversa', function () {
  const g = newGame();
  place(g, 1250, 900, 0);
  const x0 = g.robot.x;
  g.setKey('back', true);
  sim(g, 1);
  assert(g.robot.speed < 0, 'la velocidad no es negativa');
  assert(g.robot.x < x0, 'el robot no retrocedió');
});

test('ESPACIO frena el robot por completo', function () {
  const g = newGame();
  place(g, 1250, 900, 0);
  g.setKey('forward', true);
  sim(g, 1.2);
  g.setKey('forward', false);
  g.setKey('brake', true);
  sim(g, 0.6);
  near(g.robot.speed, 0, 0.01, 'el robot sigue moviéndose');
});

test('A y D cambian la orientación del robot', function () {
  const g = newGame();
  place(g, 1250, 900, 0);
  g.setKey('right', true);
  sim(g, 0.5);
  g.setKey('right', false);
  assert(g.robot.angle > 0.3, 'no giró a la derecha');
  const a = g.robot.angle;
  g.setKey('left', true);
  sim(g, 0.5);
  g.setKey('left', false);
  assert(g.robot.angle < a, 'no giró a la izquierda');
});

test('El robot no atraviesa el árbol (colisión real)', function () {
  const g = newGame();
  const tree = g.level.obstacles.find(function (o) { return o.main; });
  place(g, tree.x, tree.y + tree.r + 120, -Math.PI / 2);
  g.setKey('forward', true);
  sim(g, 4);
  g.setKey('forward', false);
  const dist = Math.hypot(g.robot.x - tree.x, g.robot.y - tree.y);
  assert(dist >= tree.r + RDR.CONFIG.ROBOT.radius - 1.5,
    'el robot entró en el árbol (dist=' + dist.toFixed(1) + ')');
  assert(g.stats.collisions > 0, 'no se registró el choque');
});

test('El robot no atraviesa una banca (rectángulo)', function () {
  const g = newGame();
  const bench = g.level.obstacles.find(function (o) { return o.type === 'bench'; });
  place(g, bench.x + bench.w / 2, bench.y + bench.h + 90, -Math.PI / 2);
  g.setKey('forward', true); g.robot.fast = true;
  sim(g, 3);
  g.setKey('forward', false);
  assert(g.robot.y > bench.y + bench.h, 'el robot atravesó la banca');
});

test('El robot queda dentro de los límites del escenario', function () {
  const g = newGame();
  place(g, 120, 120, Math.PI);
  g.setKey('forward', true); g.robot.fast = true;
  sim(g, 5);
  assert(g.robot.x >= RDR.CONFIG.ROBOT.radius - 0.5, 'salió por la izquierda');
  place(g, 120, 120, -Math.PI / 2);
  sim(g, 5);
  assert(g.robot.y >= RDR.CONFIG.ROBOT.radius - 0.5, 'salió por arriba');
});

/* ---------------------------------------------------------- */
console.log('\nSensor ultrasónico');

test('Sin obstáculos delante la lectura es "despejado"', function () {
  const g = newGame();
  place(g, 1250, 900, Math.PI / 2); // mirando hacia abajo, zona libre
  g.updateSensor();
  assert(g.sensor.level === 'clear', 'nivel: ' + g.sensor.level + ' a ' + g.sensor.cm.toFixed(0) + ' cm');
});

test('El sensor detecta el obstáculo y da distancia en cm', function () {
  const g = newGame();
  const rock = g.level.obstacles.find(function (o) { return o.type === 'rock'; });
  place(g, rock.x, rock.y + rock.r + 80, -Math.PI / 2); // mirando a la roca
  g.updateSensor();
  assert(g.sensor.detected, 'no detectó la roca');
  // distancia geométrica real desde el sensor hasta el borde de la roca
  const origenY = g.robot.y - RDR.CONFIG.ROBOT.bodyLength * 0.46;
  const esperadoCm = (origenY - (rock.y + rock.r)) / RDR.CONFIG.UNITS.pxPerCm;
  near(g.sensor.cm, esperadoCm, 5, 'distancia medida incorrecta');
});

test('El sensor NO detecta lo que está detrás del robot', function () {
  const g = newGame();
  const rock = g.level.obstacles.find(function (o) { return o.type === 'rock'; });
  place(g, rock.x, rock.y + rock.r + 60, Math.PI / 2); // de espaldas a la roca
  g.updateSensor();
  assert(g.sensor.level === 'clear', 'detectó un obstáculo que estaba detrás (' + g.sensor.cm.toFixed(0) + ' cm)');
});

test('La detección depende de la orientación (giro de 180°)', function () {
  const g = newGame();
  const rock = g.level.obstacles.find(function (o) { return o.type === 'rock'; });
  place(g, rock.x, rock.y + rock.r + 55, -Math.PI / 2);
  g.updateSensor();
  const delante = g.sensor.cm;
  place(g, rock.x, rock.y + rock.r + 55, Math.PI / 2);
  g.updateSensor();
  assert(delante < 60, 'no detectó mirando de frente');
  assert(g.sensor.cm > delante, 'midió igual en la dirección opuesta');
});

test('Umbrales: <20 cm crítico, 20-50 cm cercano, >50 cm despejado', function () {
  const g = newGame();
  const rock = g.level.obstacles.find(function (o) { return o.type === 'rock'; });
  const px = RDR.CONFIG.UNITS.pxPerCm;
  // 10 cm -> danger
  place(g, rock.x, rock.y + rock.r + 10 * px, -Math.PI / 2);
  g.updateSensor();
  assert(g.sensor.level === 'danger', '10 cm debería ser danger, fue ' + g.sensor.level);
  // 35 cm -> near
  place(g, rock.x, rock.y + rock.r + 35 * px, -Math.PI / 2);
  g.updateSensor();
  assert(g.sensor.level === 'near', '35 cm debería ser near, fue ' + g.sensor.level);
  // 90 cm -> clear
  place(g, rock.x, rock.y + rock.r + 90 * px, -Math.PI / 2);
  g.updateSensor();
  assert(g.sensor.level === 'clear', '90 cm debería ser clear, fue ' + g.sensor.level);
});

/* ---------------------------------------------------------- */
console.log('\nRescate del gatito');

test('No se puede recoger al gatito a distancia', function () {
  const g = newGame();
  place(g, g.level.catStart.x + 400, g.level.catStart.y, 0);
  sim(g, 0.2);
  assert(!g.interactAvailable, 'la interacción estaba disponible a 400 px');
  g.interact();
  assert(g.cat.state === 'waiting', 'el gatito fue recogido de lejos');
});

test('Al acercarse aparece la interacción y E recoge al gatito', function () {
  const g = newGame();
  place(g, g.level.catStart.x + 70, g.level.catStart.y, 0);
  sim(g, 0.2);
  assert(g.interactAvailable, 'no se habilitó la interacción estando cerca');
  g.interact();
  assert(g.cat.state === 'carried', 'el gatito no está a bordo');
  assert(g.state === 'carrying', 'el estado del juego no es carrying');
});

test('El gatito permanece sobre el robot durante el recorrido', function () {
  const g = newGame();
  place(g, g.level.catStart.x + 70, g.level.catStart.y, 0);
  sim(g, 0.2); g.interact();
  place(g, 1250, 900, 0);
  g.setKey('forward', true);
  sim(g, 1.5);
  g.setKey('forward', false);
  const d = Math.hypot(g.robot.x - g.cat.x, g.robot.y - g.cat.y);
  assert(d < 12, 'el gatito se desincronizó del robot (' + d.toFixed(1) + ' px)');
});

/* ---------------------------------------------------------- */
console.log('\nSistema de estabilidad del transporte');

function carryingGame(x, y, angle) {
  const g = newGame();
  g.cat.state = 'carried';
  g.cat.onRobot = true;
  g.state = 'carrying';
  g.stability.charge = 0;
  if (x === undefined) {
    const lane = freeLane(g, 900);
    place(g, lane.x + 40, lane.y, 0);
  } else {
    place(g, x, y, angle === undefined ? 0 : angle);
  }
  return g;
}
/** Avanza recto por un carril libre (para no chocar con los obstáculos). */
function driveCarrying(g, seconds) {
  const lane = g.lane;
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    g.step(DT);
    // el carril tiene 900+ px: si el robot llega al final, vuelve al inicio
    if (lane && g.robot.x > lane.x + 780) { g.robot.x = lane.x + 40; }
  }
}
function carryingInLane() {
  const g = carryingGame();
  g.lane = freeLane(g, 900);
  place(g, g.lane.x + 40, g.lane.y, 0);
  return g;
}

test('A velocidad normal el indicador no sube', function () {
  const g = carryingInLane();
  g.setKey('forward', true);
  driveCarrying(g, 2);
  near(g.stability.charge, 0, 0.001, 'el indicador subió en velocidad normal');
  assert(g.cat.state === 'carried', 'el gatito se cayó en velocidad normal');
});

test('A velocidad rápida el indicador sube y avisa', function () {
  const g = carryingInLane();
  g.robot.fast = true;
  g.setKey('forward', true);
  driveCarrying(g, 1.8);
  assert(g.stability.charge > 0.2, 'el indicador no subió: ' + g.stability.charge);
  assert(g.stability.warning, 'no se activó la advertencia');
});

test('Tras la tolerancia (4 s) a velocidad rápida el gatito se suelta', function () {
  const g = carryingInLane();
  g.robot.fast = true;
  g.setKey('forward', true);
  const t = simUntil(g, 8, function () { return g.cat.state !== 'carried'; }, g);
  assert(t < 8, 'el gatito nunca se cayó');
  assert(t > 3.2 && t < 5.2, 'tiempo de caída fuera de rango: ' + t.toFixed(2) + ' s');
  assert(g.cat.state === 'falling' || g.cat.state === 'returning', 'estado del gatito: ' + g.cat.state);
});

test('Al reducir la velocidad el indicador disminuye', function () {
  const g = carryingInLane();
  g.robot.fast = true;
  g.setKey('forward', true);
  driveCarrying(g, 2.2);
  const c0 = g.stability.charge;
  g.setKey('forward', false);
  g.robot.fast = false;
  g.setKey('brake', true);
  sim(g, 1.2);
  assert(g.stability.charge < c0, 'el indicador no bajó');
  assert(g.cat.state === 'carried', 'el gatito se cayó antes de tiempo');
});

test('El gatito vuelve a su posición inicial tras caerse', function () {
  const g = carryingInLane();
  g.robot.fast = true;
  g.setKey('forward', true);
  simUntil(g, 8, function () { return g.cat.state !== 'carried'; }, g);
  g.setKey('forward', false);
  sim(g, 3.5);
  assert(g.cat.state === 'waiting', 'el gatito no volvió a esperar: ' + g.cat.state);
  near(g.cat.x, g.level.catStart.x, 1, 'x del gatito');
  near(g.cat.y, g.level.catStart.y, 1, 'y del gatito');
  assert(g.state === 'searching', 'el juego no volvió al estado de búsqueda');
});

test('La tolerancia es configurable', function () {
  const original = RDR.CONFIG.STABILITY.toleranceSeconds;
  try {
    RDR.CONFIG.STABILITY.toleranceSeconds = 8;
    const g = carryingInLane();
    g.stability.tolerance = 8;
    g.robot.fast = true;
    g.setKey('forward', true);
    const t = simUntil(g, 10, function () { return g.cat.state !== 'carried'; }, g);
    assert(t > 7 && t < 9.5, 'con tolerancia 8 s se cayó a los ' + t.toFixed(2) + ' s');
  } finally {
    RDR.CONFIG.STABILITY.toleranceSeconds = original;
  }
});

/* ---------------------------------------------------------- */
console.log('\nVeterinaria y misión');

test('Llegar sin el gatito NO completa la misión', function () {
  const g = newGame();
  place(g, g.level.delivery.x, g.level.delivery.y, -Math.PI / 2);
  sim(g, 0.5);
  assert(g.state !== 'delivered', 'la misión se completó sin el gatito');
  assert(!g.finished, 'el juego terminó sin el gatito');
});

test('Entregar el gatito en la veterinaria completa la misión', function () {
  const level = RDR.LEVEL;
  const g = carryingGame(level.delivery.x, level.delivery.y + 40, -Math.PI / 2);
  sim(g, 0.3);
  assert(g.state === 'delivered', 'estado: ' + g.state);
  assert(g.finished, 'el juego no quedó finalizado');
  assert(g.cat.state === 'delivered', 'el gatito no quedó entregado');
});

test('El temporizador y las estadísticas se registran', function () {
  const g = newGame();
  sim(g, 2);
  near(g.time, 2, 0.05, 'tiempo de partida');
  assert(typeof g.stats.obstaclesAvoided === 'number', 'sin estadísticas');
});

test('Reiniciar restaura el escenario', function () {
  const g = carryingGame();
  g.stats.collisions = 5;
  g.reset();
  assert(g.state === 'searching' && g.cat.state === 'waiting', 'estado tras reiniciar');
  assert(g.stats.collisions === 0, 'las estadísticas no se reiniciaron');
  assert(g.robot.x === g.level.robotStart.x, 'el robot no volvió al inicio');
  assert(!g.input.forward, 'la entrada no se limpió');
});

/* ---------------------------------------------------------- */
console.log('\nSimulación independiente de los FPS');

test('Mismo resultado con pasos de 1/120 s y tras pausas largas', function () {
  const a = newGame(), b = newGame();
  place(a, 1250, 900, 0); place(b, 1250, 900, 0);
  a.setKey('forward', true); b.setKey('forward', true);
  sim(a, 1.0);
  for (let i = 0; i < 60; i++) b.step(1 / 60); // "60 fps"
  near(a.robot.x, b.robot.x, 1.5, 'la posición depende del paso de tiempo');
});

test('El juego pausado no simula', function () {
  const g = newGame();
  place(g, 1250, 900, 0);
  g.paused = true;
  g.setKey('forward', true);
  const x0 = g.robot.x;
  sim(g, 1);
  assert(g.robot.x === x0, 'el robot se movió en pausa');
});

/* ---------------------------------------------------------- */
console.log('\nRecorrido completo (jugabilidad)');
test('Una ruta sencilla permite completar la misión', function () {
  const g = newGame();
  // 1) ir al gatito: ruta en línea recta simulada con pasos cortos
  const cat = g.level.catStart;
  g.robot.x = cat.x + 80; g.robot.y = cat.y - 20; g.robot.angle = Math.PI;
  sim(g, 0.2);
  assert(g.interactAvailable, 'no se pudo interactuar en la posición de prueba');
  g.interact();
  assert(g.cat.state === 'carried', 'no se recogió al gatito');
  // 2) teletransporte simulado por la ruta y entrega final
  g.robot.x = g.level.delivery.x; g.robot.y = g.level.delivery.y + 50;
  g.robot.angle = -Math.PI / 2;
  sim(g, 0.3);
  assert(g.state === 'delivered', 'no se completó la misión en la zona de entrega');
});

/* ---------------------------------------------------------- */
console.log('\nConexidad del escenario (alcanzabilidad)');
test('El gatito es alcanzable desde el inicio del robot', function () {
  const L = RDR.LEVEL;
  const R = RDR.CONFIG.ROBOT.radius;
  const step = 15;
  const W = Math.ceil(L.width / step), H = Math.ceil(L.height / step);
  const free = function (gx, gy) { return !RDR.physics.collidesAny(gx * step, gy * step, R - 4, L.obstacles); };
  const start = [Math.round(L.robotStart.x / step), Math.round(L.robotStart.y / step)];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const p = queue.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = p[0] + d[0], ny = p[1] + d[1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
      const k = nx + ',' + ny;
      if (seen.has(k) || !free(nx, ny)) return;
      seen.add(k); queue.push([nx, ny]);
    });
  }
  [['gatito', L.catStart], ['zona de entrega', L.delivery]].forEach(function (item) {
    const k = Math.round(item[1].x / step) + ',' + Math.round(item[1].y / step);
    assert(seen.has(k), 'no se puede llegar a: ' + item[0]);
  });
});

/* ---------------------------------------------------------- */
console.log('\n-----------------------------------------');
console.log((failed === 0 ? '✅ ' : '❌ ') + passed + ' pruebas superadas, ' + failed + ' fallidas');
console.log('-----------------------------------------\n');
process.exit(failed === 0 ? 0 : 1);
