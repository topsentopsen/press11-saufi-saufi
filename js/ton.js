/* Ton per WebAudio, alles im Code: eigener Hardstyle (150 BPM, 4/4, Fis-Moll) als Fallback-Musik plus Effekte.
   Keine Audiodateien, keine fremden Melodien. Startet erst nach der ersten Taste/Beruehrung.
   Die Musikquellen-Logik (MP3 / YouTube / dieser Beat) steckt in musik.js.
   v18 Musik-Ueberarbeitung (Claude Opus): Distortion-Kick, Sidechain, Super-Saw, Riser/Drop,
   stueckweise BPM-Kurve, Filter-Cutoff im Nachtverlauf, weicher Mute-Fade. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var BPM = 150, BEAT = 60 / BPM, ROOT = 30;                 // F#1 = MIDI 30
  var MOLL = [0, 2, 3, 5, 7, 8, 10];                         // natuerliches Moll
  var PROG = [0, 0, 5, 3];                                   // Halbtoene ueber der Grundnote pro Takt: Fis, Fis, H, A
  // eigene Lead-Figuren (Stufen der Moll-Skala, -1 = Pause), 16 Schritte; 0-3 Call, 4-7 Response/Stotter
  var LEAD = [
    [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, 2, -1, 5, 4, 2, -1],
    [4, -1, 4, 5, 4, -1, 2, -1, 0, -1, 2, 4, 2, -1, 0, -1],
    [7, -1, 5, -1, 4, -1, 2, -1, 4, 5, 4, -1, 2, -1, 0, -1],
    [0, 2, 4, 7, 4, 2, 0, -1, 2, 4, 5, 4, 2, 0, -1, -1],
    [7, -1, -1, 7, 4, -1, 2, -1, 0, -1, 4, -1, 7, 5, 4, -1],
    [4, 4, -1, 4, 5, -1, 7, -1, 4, -1, 2, -1, 0, 2, 4, -1],
    [0, -1, 7, -1, 4, 4, -1, 2, 0, -1, 2, 4, 5, -1, 7, -1],
    [2, -1, 4, 4, -1, 5, 4, -1, 7, -1, 5, 4, 2, 0, -1, -1]
  ];

  function skalaNote(stufe) { return ROOT + 24 + Math.floor(stufe / 7) * 12 + MOLL[((stufe % 7) + 7) % 7]; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Intensitaet nach Spielminute: 480 (08:00) → 1680 (04:00). Schichten 0 Bass … 4 Lead.
  // BPM stueckweise: 08–18 → 96…110, 18–23 → 110…140, 23–01 → 140…150, danach 150.
  function intensitaet(minute) {
    var m = Math.max(480, Math.min(1680, +minute || 480));
    var u = (m - 480) / (1680 - 480);
    var bpm;
    if (m <= 1080) bpm = 96 + (m - 480) / (1080 - 480) * (110 - 96);
    else if (m <= 1380) bpm = 110 + (m - 1080) / (1380 - 1080) * (140 - 110);
    else if (m <= 1500) bpm = 140 + (m - 1380) / (1500 - 1380) * (150 - 140);
    else bpm = 150;
    var gain = Math.min(0.6, 0.25 + u * (0.55 - 0.25));
    var schichten = Math.min(4, 1 + Math.floor(u * 4 + 1e-9));   // Lead (4) ab 23:00
    var cutoff = m >= 1380 ? 20000 : 900 + (m - 480) / (1380 - 480) * (20000 - 900);
    return { bpm: bpm, gain: gain, schichten: schichten, cutoff: cutoff };
  }

  // Noten eines Taktes (16 Schritte). ebene 0 = morgens (Bass + Hat leise), 1 = Kick dazu, 2 = Clap/Hat dazu, 3 = Lead.
  // Intensitaet.schichten 1..4 werden auf ebene 0..3 abgebildet; schichten-Semantik: 0 Bass, 1 Hat, 2 Kick, 3 Clap, 4 Lead.
  // Alle 16 Takte: Riser-Takt (takt % 16 === 15) ab Ebene 2 – Kick bleibt gesetzt (Test 16).
  function noten(takt, ebene) {
    var out = [], prog = PROG[((takt % 4) + 4) % 4], lead = LEAD[((takt % 8) + 8) % 8];
    var riserTakt = ebene >= 2 && (((takt % 16) + 16) % 16) === 15;
    for (var s = 0; s < 16; s++) {
      var kick = ebene >= 1 && s % 4 === 0;
      var step = { kick: kick, hat: (s % 4 === 2) || (ebene >= 2 && s % 2 === 1), clap: ebene >= 2 && (s === 4 || s === 12), bass: null, lead: null, riser: false };
      if (riserTakt) {
        step.riser = true;
        // Snare-Roll: Clap dichter; Kick-Flag bleibt true (Lautstaerke spaeter gedrosselt)
        if (ebene >= 2 && s % 2 === 0) step.clap = true;
        if (ebene >= 3 && s % 2 === 1) step.clap = true;
      }
      if (!kick && s % 4 !== 0) step.bass = ROOT + prog + (s % 8 === 6 ? 12 : 0);
      if (ebene === 0 && s % 4 === 0) step.bass = ROOT + prog;
      if (ebene >= 3 && lead[s] >= 0) step.lead = skalaNote(lead[s]) + prog;
      out.push(step);
    }
    return out;
  }

  var HINWEIS_TIPPEN = 'Tippen für Ton';
  var HINWEIS_STUMMSCHALTER = 'Kein Ton? Stummschalter am iPhone prüfen';

  // Stummer 1-Sample-Puffer: iOS entsperrt WebAudio erst nach Abspielen in einer Nutzergeste.
  function stummerPuffer(ctx) {
    if (!ctx || !ctx.createBuffer || !ctx.createBufferSource) return null;
    try {
      var buf = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      return src;
    } catch (e) { return null; }
  }
  function spieleStumm(ctx) {
    var src = stummerPuffer(ctx);
    if (!src) return false;
    try { src.start(0); return true; } catch (e) { return false; }
  }
  function zustandGesperrt(state) {
    return state === 'suspended' || state === 'interrupted';
  }

  function erstelle(win) {
    var Ctor = win && (win.AudioContext || win.webkitAudioContext);
    var t = { ctx: null, gestartet: false, entsperrt: false, stummHinweisGezeigt: false, stumm: false, musikAn: false, ebene: 0, bpm: BPM, tief: false, boost: false, verfuegbar: !!Ctor,
      step: 0, takt: 0, naechste: 0, timer: null, beatStart: 0, bestaetigt: false };
    var master, musikBus, padBus, musikFilter, filter, rausch, kickShaper, kickGain;

    function makeShaperCurve(amount) {
      var n = 256, curve = new Float32Array(n), k = amount | 0 || 4;
      for (var i = 0; i < n; i++) {
        var x = (i * 2) / n - 1;
        curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }

    function init() {
      if (t.ctx || !Ctor) return !!t.ctx;
      try { t.ctx = new Ctor(); } catch (e) { t.ctx = null; return false; }
      var c = t.ctx;
      master = c.createGain(); master.gain.value = t.stumm ? 0 : 0.7;
      var komp = c.createDynamicsCompressor(); master.connect(komp); komp.connect(c.destination);
      filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000; filter.connect(master);
      musikFilter = c.createBiquadFilter(); musikFilter.type = 'lowpass'; musikFilter.frequency.value = t.intCutoff != null ? t.intCutoff : 20000; musikFilter.connect(filter);
      musikBus = c.createGain(); musikBus.gain.value = t.musikAus ? 0 : 0.55; musikBus.connect(musikFilter);
      padBus = c.createGain(); padBus.gain.value = 1; padBus.connect(musikBus);
      kickGain = c.createGain(); kickGain.gain.value = 1;
      // WaveShaper optional: Fake-AudioContext in Tests kennt createWaveShaper oft nicht
      if (typeof c.createWaveShaper === 'function') {
        kickShaper = c.createWaveShaper(); kickShaper.curve = makeShaperCurve(4);
        try { kickShaper.oversample = '2x'; } catch (e0) { /* egal */ }
        kickGain.connect(kickShaper); kickShaper.connect(musikBus);
      } else {
        kickShaper = null; kickGain.connect(musikBus);
      }
      var len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      rausch = buf;
      return true;
    }
    function now() { return t.ctx ? t.ctx.currentTime : 0; }

    // Nach visibilitychange / Unterbrechung: naechste Geste soll wieder resume + stummen Puffer spielen
    t.markiereUnterbrochen = function () {
      if (!t.ctx) return;
      if (zustandGesperrt(t.ctx.state)) t.entsperrt = false;
      else if (t.gestartet && t.ctx.state === 'running') t.entsperrt = true; // v05: spaetes resume()
    };
    t.hinweis = function () {
      if (!t.verfuegbar) return '';
      if (!t.entsperrt) return HINWEIS_TIPPEN;
      if (!t.stummHinweisGezeigt) return HINWEIS_STUMMSCHALTER;
      return '';
    };
    // Nur aus touchend / pointerup / click aufrufen (iOS: nicht nur pointerdown/keydown)
    t.entsperre = function () {
      if (!init()) return false;
      var c = t.ctx;
      if (zustandGesperrt(c.state)) {
        try {
          var pr = c.resume();
          // v05: resume() ist asynchron, Flag erst nach Erfolg setzen und Listener informieren
          if (pr && typeof pr.then === 'function') pr.then(function () {
            t.entsperrt = !zustandGesperrt(c.state);
            if (t.entsperrt) t.bestaetige();
            if (t.beiEntsperrt) t.beiEntsperrt();
          }, function () {});
        } catch (e) { /* egal */ }
      }
      spieleStumm(c);
      t.gestartet = true;
      t.entsperrt = !zustandGesperrt(c.state);
      if (t.entsperrt) t.bestaetige();
      if (!t.timer && win && win.setInterval) t.timer = win.setInterval(tick, 50);
      return t.entsperrt;
    };
    // Kurzer Dur-Zweiklang nach erstem erfolgreichen Entsperren (einmal pro Sitzung; auch bei stumm)
    t.bestaetige = function () {
      if (t.bestaetigt || !t.ctx || t.ctx.state !== 'running') return false;
      t.bestaetigt = true;
      try {
        if (!master) return true;
        var z = now() + 0.01, dauer = 0.09;
        function ton(freq, vol) {
          var o = t.ctx.createOscillator(), gn = t.ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(freq, z);
          gn.gain.setValueAtTime(Math.min(0.15, vol), z); gn.gain.exponentialRampToValueAtTime(0.0001, z + dauer);
          o.connect(gn); gn.connect(master); o.start(z); o.stop(z + dauer + 0.02);
        }
        ton(523.25, 0.12); ton(659.25, 0.1); // C5 + E5
        return true;
      } catch (e) { return false; }
    };

    function osz(typ, freq, start, dauer, vol, ziel, bis) {
      var c = t.ctx, o = c.createOscillator(), gn = c.createGain();
      o.type = typ; o.frequency.setValueAtTime(freq, start);
      if (bis) o.frequency.exponentialRampToValueAtTime(Math.max(1, bis), start + dauer);
      gn.gain.setValueAtTime(vol, start); gn.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
      o.connect(gn); gn.connect(ziel || musikBus); o.start(start); o.stop(start + dauer + 0.02);
      return gn;
    }
    function knall(start, dauer, vol, filt, ziel) {
      var c = t.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = rausch; f.type = 'highpass'; f.frequency.value = filt; gn.gain.setValueAtTime(vol, start); gn.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
      s.connect(f); f.connect(gn); gn.connect(ziel || musikBus); s.start(start, Math.random() * 0.5); s.stop(start + dauer + 0.02);
    }
    // Super-Saw: 5 verstimmte Saegezaehne + Tiefpass-Huellkurve (keine fremde Melodie)
    function supersaw(midi, zeit, dauer, vol) {
      var c = t.ctx, base = mtof(midi), cents = [-14, -7, 0, 7, 14];
      var f = c.createBiquadFilter(), gn = c.createGain();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(6000, zeit);
      f.frequency.exponentialRampToValueAtTime(1800, zeit + dauer);
      gn.gain.setValueAtTime(0.0001, zeit);
      gn.gain.linearRampToValueAtTime(vol, zeit + 0.005);
      gn.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
      f.connect(gn); gn.connect(padBus);
      for (var i = 0; i < cents.length; i++) {
        var o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(base * Math.pow(2, cents[i] / 1200), zeit);
        o.connect(f); o.start(zeit); o.stop(zeit + dauer + 0.02);
      }
    }
    function planeRiser(zeit, dauer) {
      var c = t.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = rausch; f.type = 'highpass';
      f.frequency.setValueAtTime(400, zeit);
      f.frequency.exponentialRampToValueAtTime(8000, zeit + dauer);
      gn.gain.setValueAtTime(0.02, zeit);
      gn.gain.linearRampToValueAtTime(0.18, zeit + dauer * 0.9);
      gn.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
      s.connect(f); f.connect(gn); gn.connect(musikBus);
      s.start(zeit); s.stop(zeit + dauer + 0.02);
    }
    function duckPad(zeit, len) {
      if (!padBus) return;
      try {
        padBus.gain.cancelScheduledValues(zeit);
        padBus.gain.setValueAtTime(0.25, zeit);
        padBus.gain.linearRampToValueAtTime(1, zeit + Math.max(0.05, len * 1.5));
      } catch (e) { /* egal */ }
    }

    function planeSchritt(zeit) {
      var n = noten(t.takt, t.boost ? 3 : t.ebene)[t.step], len = 60 / (t.boost ? 172 : (t.bpm || BPM)) / 4;
      var kickVol = n.riser ? 0.35 : 1.0;
      if (n.kick) {
        // Hardstyle-Kick: Sinus mit Absenkung durch WaveShaper, plus kurzer Klick
        osz('sine', 150, zeit, 0.22, kickVol, kickGain || musikBus, 42);
        osz('triangle', 90, zeit, 0.08, 0.5 * kickVol, kickGain || musikBus, 40);
        knall(zeit, 0.003, 0.35 * kickVol, 3000, musikBus);
        duckPad(zeit, len);
      }
      if (n.bass) osz('sawtooth', mtof(n.bass), zeit, len * 1.6, 0.22, padBus || musikBus);
      if (n.hat) knall(zeit, 0.05, t.ebene === 0 ? 0.05 : 0.09, 7000);
      if (n.clap) knall(zeit, n.riser ? 0.06 : 0.12, n.riser ? 0.14 : 0.2, 1500);
      if (n.lead) supersaw(n.lead, zeit, len * 0.9, 0.1);
      if (n.riser && t.step === 0) planeRiser(zeit, len * 16);
      if (t.step === 0 && t.takt % 4 === 0) t.beatStart = zeit;
      t.step += 1; if (t.step >= 16) { t.step = 0; t.takt += 1; }
      t.naechste += len;
    }
    function tick() {
      if (!t.ctx || !t.musikAn || t.ctx.state !== 'running') return;
      var c = t.ctx;
      if (t.naechste < c.currentTime) t.naechste = c.currentTime + 0.05;
      while (t.naechste < c.currentTime + 0.25) planeSchritt(t.naechste);
    }

    t.start = function () {                           // Alias: Entsperren bei Nutzergeste (touchend/pointerup/click)
      return t.entsperre();
    };
    t.setzeMusik = function (an) {
      var warAn = t.musikAn;
      t.musikAn = !!an;
      if (an && t.ctx) {
        // Beim Wiedereinschalten auf naechste Takt-1 quantisieren
        if (!warAn) { t.step = 0; }
        t.naechste = Math.max(t.naechste, now());
      }
    };
    t.setzeEbene = function (e) { t.ebene = Math.max(0, Math.min(3, e | 0)); };
    t.setzeIntensitaet = function (i) {
      if (!i) return;
      t.bpm = i.bpm || BPM;
      t.schichten = i.schichten | 0;
      // schichten 1..4 → alte ebene 0..3 (Disko/Boost bleibt separat bei Ebene 3)
      var s = Math.max(0, Math.min(4, t.schichten));
      t.ebene = s <= 0 ? 0 : Math.min(3, s - 1);
      var g = Math.min(0.6, i.gain != null ? i.gain : 0.55); t.intGain = g;   // auch bei Musik aus merken, fuer Wiedereinschalten
      if (musikBus && !t.musikAus) {
        try { musikBus.gain.setTargetAtTime(g, now(), 0.2); } catch (e2) { musikBus.gain.value = g; }
      }
      if (i.cutoff != null) {
        t.intCutoff = i.cutoff;
        if (musikFilter && !t.tief) {
          try { musikFilter.frequency.setTargetAtTime(Math.max(200, i.cutoff), now(), 0.3); }
          catch (e3) { musikFilter.frequency.value = Math.max(200, i.cutoff); }
        }
      }
    };
    t.setzeTief = function (an) { t.tief = !!an; if (filter) filter.frequency.setTargetAtTime(an ? 650 : 20000, now(), 0.15); };
    t.setzeBoost = function (an) { t.boost = !!an; };
    // BPM, den der Synth gerade spielt: Boost fest 172, sonst die Intensitaets-Kurve (96–150).
    t.spielBpm = function () { return t.boost ? 172 : (t.bpm > 0 ? t.bpm : BPM); };
    t.beatDauer = function () { return 60 / t.spielBpm(); };
    // Weicher Fade (~0,3 s) statt hartem Cut
    t.setzeMusikAus = function (aus) {
      t.musikAus = !!aus;
      if (musikBus) {
        try { musikBus.gain.setTargetAtTime(aus ? 0 : (t.intGain != null ? t.intGain : 0.55), now(), 0.1); }
        catch (e) { musikBus.gain.value = aus ? 0 : (t.intGain != null ? t.intGain : 0.55); }
      }
    };
    t.setzeStumm = function (s) { t.stumm = !!s; if (master) master.gain.setTargetAtTime(s ? 0 : 0.7, now(), 0.03); };
    // Ist gerade ein Beat? Fenster folgt dem BPM, den die Engine spielt (nicht fest 150).
    t.aufBeat = function (zeit) {
      var beat = t.beatDauer();
      var ph = ((zeit % beat) + beat) % beat / beat;
      return ph < 0.2 || ph > 0.85;
    };

    function fx(fn) { return function () { if (!t.gestartet || !t.ctx || t.stumm) return; try { fn(now() + 0.01); } catch (e) { /* kein Ton ist besser als ein Absturz */ } }; }
    t.prost = fx(function (z) { osz('sine', 2400, z, 0.35, 0.18, master); osz('sine', 3300, z + 0.02, 0.3, 0.12, master); knall(z, 0.05, 0.12, 4000, master); });
    t.schluck = fx(function (z) { osz('sine', 220, z, 0.12, 0.25, master, 120); osz('sine', 180, z + 0.14, 0.1, 0.2, master, 100); });
    t.umfall = fx(function (z) { osz('sawtooth', 300, z, 0.7, 0.25, master, 40); });
    t.glocke = fx(function (z) { osz('triangle', 880, z, 0.8, 0.25, master); osz('triangle', 1320, z, 0.6, 0.15, master); });
    t.tuer = fx(function (z) { knall(z, 0.12, 0.25, 300, master); osz('sine', 120, z, 0.1, 0.2, master, 70); });
    t.pling = fx(function (z) { osz('square', 988, z, 0.08, 0.08, master); osz('square', 1318, z + 0.07, 0.1, 0.08, master); });
    t.boostFx = fx(function (z) { for (var i = 0; i < 8; i++) osz('sawtooth', 300 + i * 150, z + i * 0.05, 0.4, 0.08, master); });
    t.fanfare = fx(function (z) { [60, 64, 67, 72, 76].forEach(function (m, i) { osz('square', mtof(m), z + i * 0.12, 0.35, 0.1, master); }); });
    t.verloren = fx(function (z) { [64, 62, 60, 55].forEach(function (m, i) { osz('triangle', mtof(m), z + i * 0.28, 0.5, 0.18, master); }); });
    return t;
  }

  Saufi.Ton = {
    BPM: BPM, BEAT: BEAT, noten: noten, skalaNote: skalaNote, mtof: mtof, erstelle: erstelle, intensitaet: intensitaet,
    HINWEIS_TIPPEN: HINWEIS_TIPPEN, HINWEIS_STUMMSCHALTER: HINWEIS_STUMMSCHALTER,
    stummerPuffer: stummerPuffer, spieleStumm: spieleStumm, zustandGesperrt: zustandGesperrt
  };
})(globalThis);
