/* Punkte und Wertung. Punkte gibt es fuers Durchhalten, nicht fuer Menge. Bestwert ueber speicher.js. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var SILBER = 1000, GOLD = 1500;

  function erstelle() { return { punkte: 0, log: [] }; }
  function add(p, n, grund) {
    p.punkte = Math.max(0, p.punkte + n);
    p.log.push({ n: n, grund: grund || '' }); if (p.log.length > 40) p.log.shift();
    return p.punkte;
  }
  // Wertung nur bei Sieg: Bronze / Silber / Gold. Bei Niederlage keine Medaille.
  function wertung(punkte, sieg) {
    if (!sieg) return { medaille: '', titel: 'Umgefallen' };
    if (punkte >= GOLD) return { medaille: 'Gold', titel: 'Kesselkönig/-königin' };
    if (punkte >= SILBER) return { medaille: 'Silber', titel: 'Eiserner Saufi' };
    return { medaille: 'Bronze', titel: 'Standhaft' };
  }

  Saufi.Punkte = { SILBER: SILBER, GOLD: GOLD, erstelle: erstelle, add: add, wertung: wertung };
})(globalThis);
