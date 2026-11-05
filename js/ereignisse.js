/* Challenges: Dicke Tuete, Scooter-Boost, Saufpannen und Mitspieler-Interaktionen (Pegel-eskaliert). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  // ---------- Joint ("Dicke Tuete") ----------
  var SCHWAMMIG_SEK = 30, SCHWAMMIG_BEWEGUNG = 0.9;
  var Joint = {
    erstelle: function () { return { hat: false, gefunden: false, doppelt: false, schwammigBis: 0, t: 0 }; },
    update: function (j, dt) { j.t += dt; },
    nimm: function (j) { if (j.gefunden) return false; j.gefunden = true; j.hat = true; return true; },
    benutze: function (j) { if (!j.hat || j.doppelt) return false; j.hat = false; j.doppelt = true; return true; },
    verstaerke: function (j) {
      if (!j.doppelt) return 1;
      j.doppelt = false; j.schwammigBis = j.t + SCHWAMMIG_SEK; return 2;
    },
    schwammig: function (j) { return j.t < j.schwammigBis; },
    bewegung: function (j) { return j.t < j.schwammigBis ? SCHWAMMIG_BEWEGUNG : 1; }
  };

  // ---------- Scooter-Boost ----------
  var BOOST_SEK = 10, BOOST_COOLDOWN = 90, BOOST_BEWEGUNG = 1.3, BEAT_GEWINN = 0.12, OFFBEAT_GEWINN = 0.04;
  var Boost = {
    BOOST_SEK: BOOST_SEK, BOOST_COOLDOWN: BOOST_COOLDOWN,
    erstelle: function () { return { leiste: 0, aktivBis: 0, coolBis: 0, t: 0 }; },
    update: function (b, dt) { b.t += dt; },
    aktiv: function (b) { return b.t < b.aktivBis; },
    tanz: function (b, aufBeat) { if (Boost.aktiv(b)) return b.leiste; b.leiste = Math.min(1, b.leiste + (aufBeat ? BEAT_GEWINN : OFFBEAT_GEWINN)); return b.leiste; },
    bereit: function (b) { return b.leiste >= 1 && b.t >= b.coolBis && !Boost.aktiv(b); },
    cooldownRest: function (b) { return Math.max(0, b.coolBis - b.t); },
    zuende: function (b, faktor) {
      if (!Boost.bereit(b)) return false;
      var dauer = BOOST_SEK * (faktor || 1);
      b.aktivBis = b.t + dauer; b.coolBis = b.t + BOOST_COOLDOWN; b.leiste = 0; return true;
    },
    verlustFaktor: function (b) { return Boost.aktiv(b) ? 0.5 : 1; },
    bewegung: function (b) { return Boost.aktiv(b) ? BOOST_BEWEGUNG : 1; }
  };

  // ---------- Saufpannen / Mitspieler-Interaktionen (mind. 20, Stufen nach Pegel) ----------
  // stufe 0 = nuechtern..leicht, 1 = angeheitert, 2 = voll, 3 = absturz
  var PANNEN = [
    // Stufe 0
    { id: 'freund_wecken_hint', stufe: 0, art: 'interaktion', text: 'Jemand gähnt verdächtig. Q bereit halten.', loesung: 'wasser', effekt: { hinweis: true } },
    { id: 'handy_gesucht', stufe: 0, art: 'interaktion', text: 'Handy vom Kumpel piept unter dem Tisch. E: zurückbringen.', loesung: 'aktion', effekt: { punkte: 40, team: 0 } },
    { id: 'doener_teilen', stufe: 0, art: 'interaktion', text: 'Döner-Hälften-Diplomatie: E teilt, Team freut sich.', loesung: 'aktion', effekt: { punkte: 30, team: 1, stand: 2 } },
    { id: 'schuh_suchen', stufe: 0, art: 'panne', text: 'Ein Schuh fehlt – klassisch. E: Suchaktion.', loesung: 'aktion', effekt: { punkte: 25 } },
    { id: 'freund_stuetzen', stufe: 0, art: 'interaktion', text: 'Kumpel schwankt. E: stützen (Stand + klein).', loesung: 'aktion', effekt: { stand: 5, punkte: 35, team: 1 } },
    // Stufe 1
    { id: 'bierdeckel_haar', stufe: 1, art: 'panne', text: 'Bierdeckel im Haar. E: entfernen, Stil retten.', loesung: 'aktion', effekt: { punkte: 20 } },
    { id: 'falsche_jacke', stufe: 1, art: 'panne', text: 'Falsche Jacke angezogen (karriert statt Neon). E: tauschen.', loesung: 'aktion', effekt: { punkte: 30 } },
    { id: 'klo_holen', stufe: 1, art: 'interaktion', text: 'Kumpel hängt am Klo-Flur. E: abholen.', loesung: 'aktion', effekt: { punkte: 50, team: 1 } },
    { id: 'kebab_hemd', stufe: 1, art: 'panne', text: 'Kebab auf dem Hemd. E: abtupfen (Würde ±0).', loesung: 'aktion', effekt: { punkte: 15, stand: 2 } },
    { id: 'brezel_taube', stufe: 1, art: 'panne', text: 'Taube klaut die Brezel. E: Würde bewahren.', loesung: 'aktion', effekt: { punkte: 10 } },
    // Stufe 2
    { id: 'hose_verloren', stufe: 2, art: 'panne', text: 'Hose? War eben noch da. E: improvisieren.', loesung: 'aktion', effekt: { punkte: 45, stand: -3 } },
    { id: 'schuh_weg', stufe: 2, art: 'panne', text: 'Beide Schuhe weg. Barfuß-Chic. E: Suche 2.0.', loesung: 'aktion', effekt: { punkte: 40, stand: -2 } },
    { id: 'dixi_nickerchen', stufe: 2, art: 'panne', text: 'Gerücht: jemand nickt im Dixi. E: klopfen.', loesung: 'aktion', effekt: { punkte: 55, team: 1 } },
    { id: 'jacke_verdreht', stufe: 2, art: 'panne', text: 'Jacke falschrum, Reißverschluss philosophisch. E: drehen.', loesung: 'aktion', effekt: { punkte: 25 } },
    { id: 'glas_verwechselt', stufe: 2, art: 'panne', text: 'Falsches Glas – war Wasser? War Pils? E: klären.', loesung: 'aktion', effekt: { pegel: 0.05, punkte: 20 } },
    // Stufe 3
    { id: 'hose_galerie', stufe: 3, art: 'panne', text: 'Hose als Fahne missverstanden. E: Crisis Mode.', loesung: 'aktion', effekt: { punkte: 60, stand: -5, team: -0 } },
    { id: 'freund_tragen', stufe: 3, art: 'interaktion', text: 'Kumpel will getragen werden. E: Schulter anbieten.', loesung: 'aktion', effekt: { punkte: 70, team: 1, stand: -4 } },
    { id: 'disco_spiegel', stufe: 3, art: 'panne', text: 'Du begrüßt dein Spiegelbild. E: Abbruch der Verhandlung.', loesung: 'aktion', effekt: { punkte: 35 } },
    { id: 'kebab_krone', stufe: 3, art: 'panne', text: 'Kebab als Krone. Königlich. E: absetzen.', loesung: 'aktion', effekt: { punkte: 40, stand: -2 } },
    { id: 'lallen_chor', stufe: 3, art: 'panne', text: 'Spontaner Lall-Chor. E: Dirigent sein.', loesung: 'aktion', effekt: { punkte: 50, team: 1 } },
    { id: 'feinstaub_ausrede', stufe: 3, art: 'panne', text: '„Feinstaubalarm, deswegen lalle ich.“ E: nicken.', loesung: 'aktion', effekt: { punkte: 15 } },
    { id: 'vergleich', stufe: 2, art: 'panne', text: 'Jemand vergleicht den Abend mit letztem Jahr. E: lachen.', loesung: 'aktion', effekt: { punkte: 33, team: 1 } }
  ];

  function stufeVonPegel(pegel) {
    if (pegel >= 3.0) return 3;
    if (pegel >= 2.0) return 2;
    if (pegel >= 1.0) return 1;
    return 0;
  }

  function panneFuerPegel(pegel) {
    var st = stufeVonPegel(pegel);
    return PANNEN.filter(function (p) { return p.stufe <= st; });
  }

  function panneNurStufe(stufe) {
    return PANNEN.filter(function (p) { return p.stufe === stufe; });
  }

  function erstellePannen() {
    return { t: 0, coolBis: 0, aktiv: null, gesehen: {} };
  }

  function updatePannen(p, dt) { p.t += dt; if (p.aktiv) { p.aktiv.rest -= dt; if (p.aktiv.rest <= 0) p.aktiv = null; } }

  // Zufaellige Panne vorschlagen, wenn Cooldown vorbei und Pegel-Stufe passt. Hoehere Stufen nur bei hoeherem Pegel.
  function wuerflePanne(p, rng, pegel) {
    if (p.aktiv || p.t < p.coolBis) return null;
    var pool = panneFuerPegel(pegel);
    if (!pool.length) return null;
    // Bevorzuge ungesehene und hoehere Stufen leicht
    var st = stufeVonPegel(pegel);
    var gewichtet = pool.slice();
    if (rng.next() < 0.55) {
      var hoch = pool.filter(function (x) { return x.stufe === st; });
      if (hoch.length) gewichtet = hoch;
    }
    var wahl = rng.pick(gewichtet);
    p.aktiv = { id: wahl.id, def: wahl, rest: 12 };
    p.gesehen[wahl.id] = true;
    p.coolBis = p.t + 45 + rng.next() * 40;
    return p.aktiv;
  }

  function loesePanne(p, via) {
    if (!p.aktiv) return null;
    var def = p.aktiv.def;
    if (via !== def.loesung && !(def.loesung === 'wasser' && via === 'wasser')) return null;
    var out = { def: def, effekt: def.effekt || {} };
    p.aktiv = null;
    return out;
  }

  // v26: Probst ohne Hose durch die Hecke, Himmelsbach filmt. Eigener Zaehler, kein S.rng.
  // Nur Nacht und Tiefe Nacht (Uhr.phase). Tagsueber startet das Ereignis nicht.
  var HECKE_DAUER = 8, HECKE_X = 2 * 16 + 8, HECKE_Y = 33 * 16 + 14;
  var Hecke = {
    DAUER: HECKE_DAUER,
    TEXT: 'Für die Gruppe, Probst.',
    erstelle: function (seed) {
      return { seed: seed >>> 0, n: 0, start: -1, aktivBis: -1, naechste: 0 };
    },
    nacht: function (phase) { return phase === 'Nacht' || phase === 'Tiefe Nacht'; },
    tick: function (h, ctx) {
      if (!h || !ctx) return false;
      var sek = ctx.spielSek || 0;
      if (sek < h.aktivBis) return false;
      if (sek < h.naechste) return false;
      if (!Hecke.nacht(ctx.phase)) { h.naechste = sek + 10; return false; }
      var bucket = Math.floor((ctx.minute || 0) / 20);
      var roll = ((h.seed * 17 + (h.n + 1) * 29 + bucket * 11) >>> 0) % 100;
      h.naechste = sek + 16;
      if (roll >= 48) return false;
      h.n += 1;
      h.start = sek;
      h.aktivBis = sek + HECKE_DAUER;
      h.naechste = h.aktivBis + 24;
      return true;
    },
    aktiv: function (h, spielSek) {
      return !!(h && spielSek >= h.start && spielSek < h.aktivBis);
    },
    pose: function (h, spielSek) {
      var u = Hecke.aktiv(h, spielSek) ? (spielSek - h.start) / HECKE_DAUER : 0;
      if (u < 0) u = 0;
      if (u > 1) u = 1;
      return {
        heckeX: HECKE_X, heckeY: HECKE_Y,
        probst: { x: HECKE_X - 14 + u * 28, y: HECKE_Y, quetsch: Math.sin(Math.PI * u), dir: 'rechts', u: u },
        film: { x: HECKE_X - 30, y: HECKE_Y + 1, dir: 'rechts' },
        text: Hecke.TEXT
      };
    }
  };

  Saufi.Ereignisse = {
    Joint: Joint, Boost: Boost, SCHWAMMIG_SEK: SCHWAMMIG_SEK,
    PANNEN: PANNEN, stufeVonPegel: stufeVonPegel, panneFuerPegel: panneFuerPegel, panneNurStufe: panneNurStufe,
    erstellePannen: erstellePannen, updatePannen: updatePannen, wuerflePanne: wuerflePanne, loesePanne: loesePanne,
    Hecke: Hecke
  };
})(globalThis);
