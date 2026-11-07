# 49. Robot de rescate simulado

> **Jugar online:** https://migulopez.github.io/robot-de-rescate/
> (se publica automáticamente con GitHub Pages desde `main`). 🤖🐱

> **Entrada directa:** `http://localhost:8080/` abre el juego automáticamente.
> No hay menú ni portada intermedia.

Videojuego educativo en **HTML5, CSS3 y JavaScript** (Canvas 2D puro, sin dependencias)
donde controlas un robot móvil de rescate con **sensor ultrasónico HC-SR04** desde una
**vista cenital (top-down)**.

La misión: llegar hasta un gatito que está junto al árbol, recogerlo con **E** y
transportarlo con cuidado hasta la **veterinaria**, sin chocar con los obstáculos y
sin correr demasiado tiempo con el gatito a bordo.

> **Juego 100 % interactivo.** No es una animación: el robot responde a los controles,
> el sensor mide según la distancia *y la orientación*, las colisiones son reales y el
> gatito se cae si abusas de la velocidad alta.

---

## 🎮 Cómo jugar

Abre `index.html` (raíz del repositorio) y entrarás **directamente al juego**, o
abre `games/49-robot-de-rescate/index.html`.

| Tecla | Acción |
| --- | --- |
| `W` / `↑` | Avanzar |
| `S` / `↓` | Retroceder |
| `A` / `←` | Girar a la izquierda |
| `D` / `→` | Girar a la derecha |
| `ESPACIO` | Frenar |
| `E` | Recoger / soltar al gatito |
| `SHIFT` o `F` | Cambiar entre velocidad **normal** y **rápida** |
| `P` / `ESC` | Pausa |
| `R` | Reiniciar |
| `H` | Abrir/cerrar la ayuda |

También hay **controles táctiles** en pantalla (D-pad + botones FRENO / VEL / E) para
móviles y tablets.

### Objetivo paso a paso

1. Conduce hasta el **árbol** (zona indicada con una circunferencia punteada).
2. Al acercarte al gatito aparece el aviso **«Presiona E para rescatar al gatito»**.
3. Pulsa **E**: el gatito sube a la plataforma de transporte del robot. Si llegas y no
   pulsas E, a los 0,9 s **el gatito salta solo** al robot (nunca se queda ahí sin subir).
4. Ve hacia la **VETERINARIA** evitando árboles, rocas, bancas, cajas, macetas y barreras.
5. Entra en la **zona de entrega**. Si llevas al gatito, la misión se completa.

Si llegas a la veterinaria **sin** el gatito, la misión **no** se completa.

---

## 🔬 Mecánicas implementadas

### 1. Robot móvil con tracción diferencial simulada

- Chasis rectangular impreso en 3D, **dos ruedas motrices** con aros rojos y **rueda
  loca** de apoyo, inspirado en el prototipo físico del repositorio.
- Animación de giro de las ruedas proporcional al desplazamiento real.
- Dos velocidades: **normal** (150 px/s ≈ 60 cm/s) y **rápida** (330 px/s ≈ 132 cm/s),
  con aceleración y frenado progresivos.
- El giro es menos eficaz a alta velocidad (como un robot de ruedas real).

### 2. Sensor ultrasónico HC-SR04 simulado

- Dos **transductores circulares** en la parte frontal del robot, siempre orientados
  hacia donde apunta el robot.
- **Cono de detección** de ±18° dibujado delante del robot, con arcos de referencia
  a 20 cm y 50 cm y **lectura numérica en centímetros**.
- El sensor lanza 7 rayos dentro del cono y toma el obstáculo **más cercano**; sólo
  detecta lo que está **delante**, nunca detrás.
- Muestreo cada 60 ms (como el hardware real) e indicadores:

| Distancia | Estado | Aviso |
| --- | --- | --- |
| más de 50 cm | `clear` | Camino despejado |
| 20 – 50 cm | `near` | «Obstáculo detectado a N cm» |
| menos de 20 cm | `danger` | «¡ALERTA! Obstáculo a corta distancia» + flash rojo |

- 1 cm simulado = 2.5 px del mundo (`CONFIG.UNITS.pxPerCm`).

### 3. Colisiones reales

- Círculos (árboles, rocas, macetas, arbustos) y rectángulos (bancas, cajas, barreras,
  edificio de la veterinaria).
- Movimiento con substeps y separación por ejes: el robot se **bloquea** al chocar y
  puede deslizarse, pero **nunca atraviesa** un objeto sólido.
- Cada choque produce sacudida de cámara, partículas de impacto, mensaje de aviso y
  pérdida de velocidad. **El juego no se reinicia** por chocar.

### 4. Sistema de estabilidad del transporte (mecánica clave)

- Mientras llevas al gatito, si superas la velocidad normal se llena un
  **indicador de inestabilidad** (a velocidad normal **no** sube).
- Al 35 % aparece la advertencia **«¡Cuidado! Estás transportando al gatito demasiado
  rápido»** y el gatito empieza a **tambalearse** sobre el robot.
- Al 72 % el aviso pasa a **crítico** (parpadeo rojo).
- Al llenarse la barra (**≈ 2,5 s** de velocidad rápida continua por defecto, o menos si
  el techo de estabilidad está reducido por choques) **el gatito se cae**:
  - **salta en el aire** (hasta ~46 px de altura, con sombra que se separa),
  - aterriza y **sale corriendo ~380 px** lejos del robot, con polvo y zancada,
  - luego **vuelve corriendo** al árbol (se le ve recorrer el camino, nada de aparecer
    de golpe) y recupera el estado de espera,
  - el robot vuelve al estado de búsqueda para reintentar.
- Si **bajas la velocidad**, el indicador desciende y el transporte continúa.

**Tiempo de tolerancia configurable:** por defecto **2,5 s** (antes 4 s: era demasiado
permisivo y el gatito nunca se caía), ajustable en vivo con el control deslizante del
panel de estabilidad (1 – 8 s) o por URL:

```
index.html?tolerancia=6
```

o editando `CONFIG.STABILITY.toleranceSeconds` en `js/config.js`.

### 5. Choques, salud del robot y taller de reparación

- **Cualquier contacto** con un obstáculo resta salud (antes sólo se registraba por
  encima de 30 px/s y los toques suaves no hacían daño).
- **Cada choque quita un 30 % de salud y un 30 % de estabilidad máxima**: tras 1 choque
  quedas al 70 %, tras 2 al 40 % y a partir de 3 se queda en el mínimo del 30 %.
- Cada choque también **reduce la estabilidad máxima** del transporte. Con **3 choques**
  la estabilidad máxima queda en **30 %** y **nunca baja del 30 %** por muchos choques
  que se den.
- Empujar el mismo obstáculo no resta salud en cada fotograma: sólo cuenta el **inicio**
  del contacto (con un pequeño enfriamiento).
- La barra de estabilidad muestra un **tope blanco** con el porcentaje máximo actual.
  La caída se dispara cuando la barra **llega a ese techo**, así que con el robot dañado
  el gatito se cae muchísimo antes (y **siempre** se cae: el techo ya no bloquea la caída).
- Un choque mientras transportas al gatito también lo **desestabiliza** en el acto.
- El **TALLER** (a un tercio del recorrido, ~770 px del inicio) tiene una zona amarilla: entra en
  ella y el robot se repara automáticamente subiendo salud y estabilidad máxima hasta
  el **100 %** en pocos segundos, con chispas y contador de progreso.
- Cuando hace falta reparar, el HUD avisa («¡Ve al TALLER a reparar!») y el taller
  muestra una etiqueta flotante sobre el mapa.

### 6. Entrega en la veterinaria

- Edificio con cruz, toldo, fachada y letrero **«VETERINARIA»** que brilla.
- **Zona de entrega** animada (anillo punteado giratorio + flecha).
- Al entrar con el gatito: el gatito baja, aparecen corazones y confeti, y se muestra
  la pantalla **«¡MISIÓN CUMPLIDA!»** con tiempo total, obstáculos evitados, choques y
  número de caídas.

### 7. Escenario ampliado

- Mapa de **4200 × 3200 px** (antes 2800 × 2100) con **237 obstáculos**: árboles, rocas,
  arbustos, macetas, bancas, cajas y barreras distribuidas por todo el parque.
- **Ruta larga y serpenteante** (más de 3500 px en línea recta y ~5000 px de recorrido
  real) desde el árbol hasta la veterinaria, con ramales de tierra hacia el **taller**,
  el **pozo/fuente** central y la zona del perro.
- El generador de obstáculos deja siempre un **pasillo libre** sobre la ruta y verifica
  con BFS que el gatito, el taller y la veterinaria son alcanzables desde el inicio.

### 8. El perro guardián 🐕

- Vive en una **caseta** cerca del inicio (~940 px, junto al ramal del camino) y
  **patrulla** en círculos a su alrededor. Se ve nada más empezar.
- **Detecta al robot** combinando distancia, cono de visión (±112°) y oído: si el robot
  corre, lo oye desde más lejos (el cono se dibuja en el suelo).
- Al detectarlo se **alerta** (signo «!», ladrido y aviso en pantalla) y comienza la
  **persecución**. Si te alcanza, te **muerde**: −16 % de salud (una vez cada 2,2 s) y,
  si llevas al gatito, se asusta y la inestabilidad sube de golpe.
- Es **más lento que el robot en modo rápido**: la estrategia es huir y **romper la línea
  de visión** detrás de árboles o edificios. Si te alejas, te pierde y **vuelve a su caseta**.
- La **zona del taller es refugio**: el perro no entra y no puede morderte allí.
- El HUD muestra su estado (**TRANQUILO / CERCA / TE DETECTÓ / ¡PERSIGUIENDO!**) y el
  panel técnico su estado interno.

### 9. Sonido (sintetizado, sin archivos)

Todo el audio se genera con **WebAudio** (`js/audio.js`): el juego no descarga ni un
solo MP3 y sigue funcionando sin conexión.

| Sonido | Cuándo |
| --- | --- |
| **Música 8 bits de fondo** | siempre; secuenciador de 16 pasos a 112 BPM con melodía de onda cuadrada y bajo de triángulo |
| **Miau** | al recoger al gatito (dos maullidos alegres) |
| **Maullido + golpe** | cuando el gatito se cae |
| **Ladrido** | cuando el perro te detecta o te muerde |
| **Motor eléctrico** | continuo, con la frecuencia y el volumen siguiendo la velocidad del robot |
| Choque, reparación, entrega, aviso del sensor | efectos puntuales |

- Los navegadores exigen un gesto para reproducir audio, así que la música arranca al
  primer clic o tecla (el icono 🔊 de la cabecera late hasta entonces).
- Botón **🔊/🔇** en la cabecera o tecla **M** para silenciar; la preferencia se guarda
  en el navegador.
- La música es discreta (volumen bajo) para no tapar los avisos ni el motor.

### 10. Orientación: minimapa y flechas guía

- **Minimapa** en la esquina inferior derecha con la ruta, la veterinaria, el taller, la
  caseta del perro, el gatito, el perro (rojo si te persigue) y el robot con su rumbo.
- **Flechas guía** en el borde de la pantalla cuando el taller (si el robot está dañado)
  o el perro están fuera de vista, con la distancia de referencia.
- **HUD sin solapes**: los controles táctiles ocupan una banda reservada abajo
  (`--controls-band`) y el HUD limita su altura a la zona libre, con scroll fino y reglas
  específicas para ventanas bajas (≤ 820 px, ≤ 700 px). Un ajuste automático en
  `main.js` oculta filas secundarias si aun así no cupieran.
- Pie de página con la **versión del build** y los assets cargados con `?v=`, para que
  el navegador nunca muestre una versión antigua en caché (si detecta JS viejo, avisa
  con «pulsa Ctrl+Shift+R»).

### 11. Mensajes (pop-ups)

- Los avisos se crean **una sola vez** y no se reconstruyen en cada fotograma, así que su
  animación no parpadea.
- Los **pop-ups de choque** aparecen en grande (rojo, con sacudida) y duran **4,5–5 s**:
  muestran la salud restante y la estabilidad máxima actual.
- Un aviso repetido **se refresca** en vez de duplicarse.

---

## 🖥️ Interfaz

- Nombre del juego, objetivo actual y cronómetro.
- Indicador de velocidad con barra y etiqueta NORMAL / RÁPIDO.
- Lectura grande del sensor ultrasónico con barra de rango y estado.
- Indicador de estabilidad del transporte con **tope máximo** dinámico y control de tolerancia.
- **Salud del robot** con avisos de daño y estado del taller (disponible / necesario / reparando).
- **Estado del perro guardián** (tranquilo / cerca / te detectó / persiguiendo).
- Estado del gatito (pendiente / a bordo / se cayó / entregado).
- **Panel técnico en tiempo real**: distancia medida, velocidad, estado del motor,
  estado del transporte, detección de obstáculos, ruedas, estado del gatito,
  **salud**, **estabilidad máxima**, **estado del taller**, choques y obstáculos evitados.
- Lista de controles que se iluminan al pulsar las teclas.
- Botones de **Pausa**, **Reiniciar** y **Ayuda** (con imágenes del prototipo real y
  del gatito de referencia).

---

## 📁 Estructura

```
games/49-robot-de-rescate/
├── index.html              # Página del juego (HUD, controles, ayuda)
├── css/
│   └── game.css            # Estilos de la interfaz y controles táctiles
├── js/
│   ├── config.js           # Parámetros centrales (velocidades, sensor, tolerancia)
│   ├── level.js            # Escenario: obstáculos, rutas, árbol, veterinaria, taller, caseta
│   ├── dog.js              # Perro guardián: patrulla, detección y persecución
│   ├── physics.js          # Colisiones, raycasting del sensor y movimiento
│   ├── game.js             # Estado, reglas y simulación con paso fijo
│   ├── sprites.js          # Dibujo 2D procedimental (robot, gatito, objetos)
│   ├── audio.js            # Sonido sintetizado: música 8 bits, miau, ladrido, motor
│   ├── world.js            # Terreno pre-renderizado, cámara y partículas
│   ├── render.js           # Composición de la escena y efectos
│   ├── ui.js               # HUD, panel técnico, teclado y controles táctiles
│   └── main.js             # Arranque y bucle principal
├── assets/img/
│   ├── robot-real.jpg      # Fotografía del prototipo real
│   └── gatito-referencia.png
├── tests/
│   └── run-tests.js        # 61 pruebas automáticas de las mecánicas
└── README.md
```

Los módulos se cargan como scripts independientes que comparten el espacio de nombres
`RDR`, de forma que cada archivo puede modificarse por separado.

---

## ⏱️ Simulación independiente de los FPS

El bucle principal acumula el tiempo real y ejecuta la simulación en **pasos fijos de
1/120 s** (`CONFIG.SIM.fixedStep`), independientes de la tasa de fotogramas. El
movimiento, las colisiones, la lectura ultrasónica y la estabilidad del gatito se
actualizan todos con ese mismo sistema de tiempo consistente.

---

## ✅ Pruebas automáticas

```bash
cd games/49-robot-de-rescate
node tests/run-tests.js
```

Cubren navegación, frenado, colisiones con árboles/bancas, límites del mundo,
detección del sensor (delante/detrás, umbrales de 20/50 cm), rescate del gatito,
caída por exceso de velocidad, recuperación del indicador, retorno del gatito al
árbol, tolerancia configurable, condición de victoria, choques/taller y
alcanzabilidad del escenario.

Resultado actual: **61 pruebas superadas, 0 fallidas**.

Incluyen, además de lo anterior: penalización de salud y de estabilidad máxima por
choque, daño en roces suaves, que empujar no reste salud por frame, mínimo del 30 % tras
3+ choques, que la carga nunca supere el techo, reparación completa en el taller,
alcanzabilidad del taller, tamaño del mapa, redirección portada→juego, pop-ups estables y
duraderos, y el comportamiento del perro (patrulla, detección, no-detección a distancia,
persecución y mordisco, huida y retorno, refugio del taller y susto al gatito).

---

## 🚀 Ejecución

El juego usa scripts clásicos (no módulos ES), por lo que puede abrirse directamente
con doble clic en el archivo `index.html`. Para servirlo por HTTP:

```bash
# desde la raíz del repositorio
python3 -m http.server 8080
# luego abre http://localhost:8080/
```

---

## 🎨 Recursos gráficos

Todos los sprites del escenario (árboles, rocas, bancas, cajas, macetas, barreras,
robot y veterinaria) se **dibujan proceduralmente** en Canvas 2D, por lo que el juego
no requiere descargar imágenes y funciona sin conexión. El gatito se dibuja desde una
rejilla pixel-art de 24 × 29 basada en la imagen de referencia entregada, y el robot
reproduce la vista superior del prototipo físico (imagen de referencia incluida en
`assets/img/`).

---

## 🔧 Ideas para ampliar

- Añadir más gatitos u obstáculos móviles.
- Más animales (gatos callejeros, palomas) con comportamientos propios.
- Convertir el mapa en un laberinto generado aleatoriamente.
- Registrar los tiempos en `localStorage` para crear un ranking.
- Añadir un modo multijugador por turnos con el mismo escenario.
