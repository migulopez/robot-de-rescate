# Plataforma de robótica educativa · Robot de rescate

Repositorio de actividades educativas de robótica. Cada actividad es un juego o
simulación interactiva que se ejecuta directamente en el navegador (HTML5, CSS3 y
JavaScript), sin instalación ni dependencias externas.

## 🎮 Actividades disponibles

| # | Actividad | Descripción | Enlace |
| --- | --- | --- | --- |
| 49 | **Robot de rescate simulado** | Conduce un robot móvil con sensor ultrasónico HC-SR04 desde una vista cenital, rescata a un gatito junto al árbol y llévalo hasta la veterinaria. Incluye choques con daño al robot y taller de reparación. | [`games/49-robot-de-rescate/`](games/49-robot-de-rescate/index.html) |

La raíz [`index.html`](index.html) **abre directamente el juego** (sin portada).

## 🚀 Cómo ejecutar

**Opción 1 — abrir directamente:** abre `index.html` en cualquier navegador moderno.

**Opción 2 — servidor local:**

```bash
python3 -m http.server 8080
# Abre http://localhost:8080/
```

## 📚 Documentación de la actividad 49

Consulta el README del juego para conocer los controles, las mecánicas (sensor
ultrasónico simulado, colisiones, estabilidad del transporte del gatito), la
estructura de módulos y las pruebas automáticas:

➡️ [`games/49-robot-de-rescate/README.md`](games/49-robot-de-rescate/README.md)

## 🗂️ Estructura del repositorio

```
.
├── index.html                     # Redirige directamente al juego
├── games/
│   └── 49-robot-de-rescate/       # Videojuego (HTML + CSS + JS + Canvas 2D)
│       ├── index.html
│       ├── css/game.css
│       ├── js/                    # Módulos: config, level, physics, game, sprites, world, render, ui, main
│       ├── assets/img/            # Imágenes de referencia (robot real y gatito)
│       ├── tests/run-tests.js     # Pruebas de mecánicas
│       └── README.md
└── README.md
```

## ✅ Pruebas

```bash
cd games/49-robot-de-rescate
node tests/run-tests.js
```

## 🧩 Añadir nuevas actividades

1. Crea una carpeta `games/NN-nombre-del-juego/` con su `index.html`, `css/` y `js/`.
2. Añade una tarjeta en el catálogo `index.html` apuntando a esa carpeta.
3. Documenta el juego en su propio `README.md`.

Las actividades son independientes entre sí: agregar una nueva no modifica el
funcionamiento de las anteriores.
