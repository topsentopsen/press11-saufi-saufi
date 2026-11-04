/* Challenges: Dicke Tuete (naechster Effekt doppelt, danach schwammiger Pegel) und Scooter-Boost in der Diskothek.
   Beides ist reine Spielmechanik (fiktives Spiel-Item). Zeiten in Echtzeit-Sekunden (Zaehler t pro Objekt). */
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
    // Faktor fuer den naechsten Effekt (Essen, Wasser, Getraenk, Boost). Verbraucht den Doppel-Effekt und startet das Gegengewicht.
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
    // Tanzen im Takt fuellt die Leiste (nur wenn der Boost nicht laeuft)
    tanz: function (b, aufBeat) { if (Boost.aktiv(b)) return b.leiste; b.leiste = Math.min(1, b.leiste + (aufBeat ? BEAT_GEWINN : OFFBEAT_GEWINN)); return b.leiste; },
    bereit: function (b) { return b.leiste >= 1 && b.t >= b.coolBis && !Boost.aktiv(b); },
    cooldownRest: function (b) { return Math.max(0, b.coolBis - b.t); },
    // Zuenden: nur bei voller Leiste und ohne Cooldown. faktor 2 = Joint-Verstaerkung (doppelte Dauer)
    zuende: function (b, faktor) {
      if (!Boost.bereit(b)) return false;
      var dauer = BOOST_SEK * (faktor || 1);
      b.aktivBis = b.t + dauer; b.coolBis = b.t + BOOST_COOLDOWN; b.leiste = 0; return true;
    },
    // Wirkung fuer die ganze Truppe: Verluste halbiert, Bewegung +30 %
    verlustFaktor: function (b) { return Boost.aktiv(b) ? 0.5 : 1; },
    bewegung: function (b) { return Boost.aktiv(b) ? BOOST_BEWEGUNG : 1; }
  };

  Saufi.Ereignisse = { Joint: Joint, Boost: Boost, SCHWAMMIG_SEK: SCHWAMMIG_SEK };
})(globalThis);
