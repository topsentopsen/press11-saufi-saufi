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
  // Wertung: bei Sieg Bronze/Silber/Gold; bei Niederlage eigener Titel je nach Grund (Team vs. Umfallen).
  function wertung(punkte, sieg, art) {
    if (!sieg) {
      if (art === 'team') return { medaille: '', titel: 'Abgehängt', kopf: 'Die Truppe hat dich abgehängt' };
      return { medaille: '', titel: 'Umgefallen', kopf: 'Press F to pay respects.' };
    }
    if (punkte >= GOLD) return { medaille: 'Gold', titel: 'Kesselkönig/-königin', kopf: 'Du stehst noch, Saufi.' };
    if (punkte >= SILBER) return { medaille: 'Silber', titel: 'Eiserner Saufi', kopf: 'Du stehst noch, Saufi.' };
    return { medaille: 'Bronze', titel: 'Standhaft', kopf: 'Du stehst noch, Saufi.' };
  }

  Saufi.Punkte = { SILBER: SILBER, GOLD: GOLD, erstelle: erstelle, add: add, wertung: wertung };
})(globalThis);
