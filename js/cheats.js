/* Alkoholfrei-Tausch (heimlich statt Bier) mit Entdeckungschance. Wasser steckt in Getraenke/Pegel. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var BASIS = 0.25, PROBST = 0.15, SPAET_PRO_TAUSCH = 0.10, SPAET_AB = 26 * 60, MAX_PRO_RUNDE = 3, MAX_CHANCE = 0.95, PROBST_STAND = 25;

  function erstelle() { return { rundeTricks: 0, gesamt: 0, erwischt: 0 }; }
  function neueRunde(c) { c.rundeTricks = 0; }
  // 25 % Basis, Probst +15 %, in den letzten 2 Spielstunden (ab 02:00) +10 % je bisherigem Tausch
  function chance(c, minute, probstDa) {
    var p = BASIS + (probstDa ? PROBST : 0) + (minute >= SPAET_AB ? SPAET_PRO_TAUSCH * c.gesamt : 0);
    return Math.min(MAX_CHANCE, p);
  }
  // Rueckgabe: { erlaubt, erwischt, chance }. Mehr als 3 pro Runde: Barkeeper wird misstrauisch (erlaubt: false).
  function tausche(c, rng, minute, probstDa) {
    if (c.rundeTricks >= MAX_PRO_RUNDE) return { erlaubt: false, erwischt: false, chance: 0 };
    var p = chance(c, minute, probstDa), erwischt = rng.next() < p;
    c.rundeTricks += 1; c.gesamt += 1; if (erwischt) c.erwischt += 1;
    return { erlaubt: true, erwischt: erwischt, chance: p };
  }

  Saufi.Cheats = { BASIS: BASIS, PROBST: PROBST, PROBST_STAND: PROBST_STAND, MAX_PRO_RUNDE: MAX_PRO_RUNDE, erstelle: erstelle, neueRunde: neueRunde, chance: chance, tausche: tausche };
})(globalThis);
