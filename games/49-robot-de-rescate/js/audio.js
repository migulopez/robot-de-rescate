/* =========================================================
 * 49. Robot de rescate simulado
 * audio.js — Sonido 100 % sintetizado con WebAudio (sin archivos)
 *
 *  - Música de fondo estilo 8 bits (secuenciador de 16 pasos)
 *  - Miau al recoger al gatito / maullido al caerse
 *  - Ladrido del perro
 *  - Motor eléctrico continuo que sigue la velocidad del robot
 *  - Efectos: choque, reparación, entrega, aviso del sensor
 *
 *  Se genera todo con osciladores y ruido filtrado, así que el juego
 *  no pesa más y funciona igual en GitHub Pages. El contexto de audio
 *  sólo puede crearse tras un gesto del usuario (clic o tecla), por eso
 *  `unlock()` se llama desde el primer evento de entrada.
 * ========================================================= */
(function (root) {
  'use strict';
  const RDR = root.RDR = root.RDR || {};

  const STORAGE_KEY = 'rdr49-sound';

  /** Nota MIDI -> frecuencia (Hz) */
  function hz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function createAudio(options) {
    const opts = options || {};
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    const supported = !!AudioCtx;

    const state = {
      ctx: null,
      master: null,
      musicGain: null,
      sfxGain: null,
      engineGain: null,
      engineOsc: null,
      engineSub: null,
      engineFilter: null,
      noiseBuffer: null,
      enabled: true,
      musicOn: true,
      unlocked: false,
      /** volumen reductor cuando el usuario silencia */
      volume: 1,
      // sequenciador
      seq: { step: 0, nextTime: 0, tempo: 112, running: false },
      engine: { target: 0, current: 0 },
      _lastBark: -99,
    };

    /* ---------- preferencias guardadas ---------- */
    try {
      const saved = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (saved === '0') state.enabled = false;
      if (saved === '1') state.enabled = true;
    } catch (e) { /* almacenamiento no disponible */ }

    /* ---------- creación perezosa del contexto ---------- */
    function ensure() {
      if (!supported || state.ctx) return state.ctx;
      try {
        state.ctx = new AudioCtx();
      } catch (e) {
        return null;
      }
      const ctx = state.ctx;

      state.master = ctx.createGain();
      state.master.gain.value = state.enabled ? 1 : 0;
      state.master.connect(ctx.destination);

      state.musicGain = ctx.createGain();
      state.musicGain.gain.value = 0.16;        // música de fondo discreta
      state.musicGain.connect(state.master);

      state.sfxGain = ctx.createGain();
      state.sfxGain.gain.value = 0.55;
      state.sfxGain.connect(state.master);

      // Motor: oscilador + sub + filtro paso bajo
      state.engineGain = ctx.createGain();
      state.engineGain.gain.value = 0;
      state.engineFilter = ctx.createBiquadFilter();
      state.engineFilter.type = 'lowpass';
      state.engineFilter.frequency.value = 420;
      state.engineFilter.Q.value = 3;

      state.engineOsc = ctx.createOscillator();
      state.engineOsc.type = 'sawtooth';
      state.engineOsc.frequency.value = 58;

      state.engineSub = ctx.createOscillator();
      state.engineSub.type = 'triangle';
      state.engineSub.frequency.value = 116;

      state.engineOsc.connect(state.engineFilter);
      state.engineSub.connect(state.engineFilter);
      state.engineFilter.connect(state.engineGain);
      state.engineGain.connect(state.master);
      state.engineOsc.start();
      state.engineSub.start();

      // Buffer de ruido blanco reutilizable
      const len = Math.floor(ctx.sampleRate * 1.2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      state.noiseBuffer = buf;

      return ctx;
    }

    /** Se llama en el primer gesto del usuario. */
    function unlock() {
      const ctx = ensure();
      if (!ctx) return false;
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      state.unlocked = true;
      startMusic();
      return true;
    }

    /* ---------- utilidades de síntesis ---------- */
    function now() { return state.ctx ? state.ctx.currentTime : 0; }

    function envGain(t0, attack, hold, release, peak) {
      const ctx = state.ctx;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
      g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
      return g;
    }

    function tone(freq, t0, dur, type, peak, dest) {
      const ctx = state.ctx;
      if (!ctx) return null;
      const o = ctx.createOscillator();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      const g = envGain(t0, Math.min(0.02, dur * 0.2), dur * 0.45, dur * 0.5, peak == null ? 0.3 : peak);
      o.connect(g);
      g.connect(dest || state.sfxGain);
      o.start(t0);
      o.stop(t0 + dur + 0.06);
      return o;
    }

    function noiseBurst(t0, dur, freq, q, peak, dest) {
      const ctx = state.ctx;
      if (!ctx || !state.noiseBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = state.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq || 800;
      bp.Q.value = q || 1.2;
      const g = envGain(t0, 0.006, dur * 0.35, dur * 0.6, peak == null ? 0.25 : peak);
      src.connect(bp); bp.connect(g); g.connect(dest || state.sfxGain);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    }

    /** Glide con vibrato: base del "miau". */
    function meow(t0, from, to, dur, vibratoHz, vibratoDepth, peak, dest) {
      const ctx = state.ctx;
      if (!ctx) return;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(from, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + dur);

      const vib = ctx.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = vibratoHz || 18;
      const vibGain = ctx.createGain();
      vibGain.gain.value = vibratoDepth || 26;
      vib.connect(vibGain);
      vibGain.connect(o.frequency);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, t0);
      bp.frequency.exponentialRampToValueAtTime(700, t0 + dur);
      bp.Q.value = 4;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak || 0.4, t0 + dur * 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o.connect(bp); bp.connect(g); g.connect(dest || state.sfxGain);
      o.start(t0); vib.start(t0);
      o.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
    }

    /* ---------- sonidos concretos ---------- */
    const sfx = {
      /** Miau alegre al subir al robot. */
      meowPickup: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        meow(t, 720, 430, 0.34, 20, 30, 0.42);
        meow(t + 0.30, 640, 520, 0.16, 16, 20, 0.22);
      },

      /** Maullido triste + golpe al caer. */
      meowFall: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        meow(t, 900, 250, 0.55, 12, 40, 0.45);
        noiseBurst(t + 0.38, 0.16, 260, 1.1, 0.2);
        tone(70, t + 0.38, 0.14, 'sine', 0.22);
      },

      /** Ladrido: dos ráfagas con cuerpo grave. */
      bark: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        if (t - state._lastBark < 0.45) return;     // no solapar ladridos
        state._lastBark = t;
        for (let i = 0; i < 2; i++) {
          const t0 = t + i * 0.17;
          noiseBurst(t0, 0.11, 520, 1.6, 0.3);
          const o = tone(150, t0, 0.11, 'square', 0.22);
          if (o) o.frequency.exponentialRampToValueAtTime(92, t0 + 0.1);
        }
      },

      /** Choque metálico seco. */
      crash: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        noiseBurst(t, 0.22, 900, 0.8, 0.34);
        tone(110, t, 0.18, 'square', 0.3);
        tone(58, t + 0.02, 0.26, 'sine', 0.26);
      },

      /** Aviso del sensor (pitido corto). */
      beep: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        tone(1480, now(), 0.09, 'square', 0.16);
      },

      /** Reparación: arpegio ascendente. */
      repair: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        [0, 4, 7, 12].forEach(function (semi, i) {
          tone(hz(72 + semi), t + i * 0.09, 0.16, 'triangle', 0.24);
        });
      },

      /** Misión cumplida: pequeño jingle. */
      victory: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        const t = now();
        [72, 76, 79, 84, 88].forEach(function (m, i) {
          tone(hz(m), t + i * 0.13, 0.3, 'square', 0.24);
          tone(hz(m - 12), t + i * 0.13, 0.3, 'triangle', 0.18);
        });
      },

      /** Bip de interfaz (pausa, reinicio…). */
      ui: function () {
        const ctx = ensure(); if (!ctx || !state.enabled) return;
        tone(880, now(), 0.06, 'square', 0.12);
      },
    };

    /* ---------- música 8 bits ---------- */
    // Melodía coral en La menor (16 pasos por compás), onda cuadrada.
    const MELODY = [
      69, 72, 76, 72, 69, 72, 76, 79,
      67, 71, 74, 71, 67, 71, 74, 77,
    ];
    const BASS = [45, 45, 52, 52, 43, 43, 50, 50];
    const STEP_DUR = 60 / 112 / 2;   // corcheas a 112 BPM

    function scheduleMusic() {
      const ctx = state.ctx;
      if (!ctx || !state.seq.running) return;
      const lookahead = 0.12;
      while (state.seq.nextTime < ctx.currentTime + lookahead) {
        const t = state.seq.nextTime;
        const s = state.seq.step % 16;
        const m = MELODY[s];
        // melodía
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = hz(m);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP_DUR * 1.5);
        o.connect(g); g.connect(state.musicGain);
        o.start(t); o.stop(t + STEP_DUR * 2);

        // bajo cada negra
        if (s % 2 === 0) {
          const b = ctx.createOscillator();
          b.type = 'triangle';
          b.frequency.value = hz(BASS[(s / 2) % BASS.length]);
          const bg = ctx.createGain();
          bg.gain.setValueAtTime(0.0001, t);
          bg.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
          bg.gain.exponentialRampToValueAtTime(0.0001, t + STEP_DUR * 1.7);
          b.connect(bg); bg.connect(state.musicGain);
          b.start(t); b.stop(t + STEP_DUR * 2);
        }
        state.seq.step++;
        state.seq.nextTime += STEP_DUR;
      }
    }

    function startMusic() {
      const ctx = ensure();
      if (!ctx || !state.musicOn) return;
      if (state.seq.running) return;
      state.seq.running = true;
      state.seq.nextTime = ctx.currentTime + 0.1;
      if (!state._musicTimer) {
        // el planificador corre con temporizador propio: la música no depende
        // de la tasa de fotogramas del juego
        state._musicTimer = setInterval(scheduleMusic, 40);
      }
      scheduleMusic();
    }

    function stopMusic() {
      state.seq.running = false;
      if (state._musicTimer) { clearInterval(state._musicTimer); state._musicTimer = null; }
    }

    /* ---------- motor eléctrico ---------- */
    /**
     * Actualiza el zumbido del motor según la velocidad real del robot.
     * @param {number} speed px/s (con signo)
     * @param {boolean} fast modo rápido
     */
    function updateEngine(speed, fast) {
      if (!state.ctx || !state.enabled) return;
      const abs = Math.abs(speed || 0);
      // de 0 (parado, casi inaudible) a 1 (a tope)
      const norm = Math.min(1, abs / 330);
      const target = norm <= 0.02 ? 0 : 0.055 + norm * 0.11;
      const t = state.ctx.currentTime;
      const g = state.engineGain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(target, t, 0.08);

      // frecuencia: el motor "sube de vueltas" con la velocidad
      const base = 52 + norm * 96 + (fast ? 14 : 0);
      state.engineOsc.frequency.setTargetAtTime(base, t, 0.1);
      state.engineSub.frequency.setTargetAtTime(base * 2.01, t, 0.1);
      state.engineFilter.frequency.setTargetAtTime(380 + norm * 900, t, 0.1);
    }

    /* ---------- ajustes ---------- */
    function setEnabled(on) {
      state.enabled = !!on;
      try {
        if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, state.enabled ? '1' : '0');
      } catch (e) { /* ignora */ }
      const ctx = ensure();
      if (ctx) {
        const t = ctx.currentTime;
        state.master.gain.cancelScheduledValues(t);
        state.master.gain.setTargetAtTime(state.enabled ? 1 : 0, t, 0.05);
      }
      if (state.enabled) {
        unlock();
        startMusic();
      } else {
        stopMusic();
      }
      return state.enabled;
    }

    function toggle() { return setEnabled(!state.enabled); }

    /** Engancha el audio a los eventos que ya emite el juego. */
    function attach(game) {
      if (!game || !game.emit) return;
      const original = game.emit;
      game.emit = function (type, payload) {
        original.call(game, type, payload);
        if (!state.enabled) return;
        switch (type) {
          case 'cat-pickup': sfx.meowPickup(); break;
          case 'cat-fall': sfx.meowFall(); break;
          case 'dog-bark': sfx.bark(); break;
          case 'dog-bite': sfx.bark(); sfx.crash(); break;
          case 'impact': sfx.crash(); break;
          case 'repaired': sfx.repair(); break;
          case 'deliver': sfx.victory(); break;
          case 'sensor-alert': sfx.beep(); break;
          default: break;
        }
      };
    }

    return {
      supported: supported,
      state: state,
      get enabled() { return state.enabled; },
      unlock: unlock,
      setEnabled: setEnabled,
      toggle: toggle,
      attach: attach,
      updateEngine: updateEngine,
      startMusic: startMusic,
      stopMusic: stopMusic,
      sfx: sfx,
      /** planificador manual (pruebas / navegadores sin setInterval raro) */
      tick: scheduleMusic,
    };
  }

  RDR.createAudio = createAudio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
