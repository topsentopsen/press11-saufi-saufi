/* Getraenke mit fiktiven Pegelwerten (Promille-artig, nur Spielwerte, kein Massstab fuers echte Leben). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var LISTE = {
    pils: { id: 'pils', label: 'Kessel-Pils', pegel: 0.30, stand: 0, preis: 0, alk: true },
    radler: { id: 'radler', label: 'Stäffele-Radler', pegel: 0.20, stand: 0, preis: 0, alk: true },
    kurzer: { id: 'kurzer', label: 'Kurzer (Schwabentropfen)', pegel: 0.50, stand: 0, preis: 0, alk: true },
    wasser: { id: 'wasser', label: 'Leitungswasser (ehrlich)', pegel: -0.05, stand: 5, preis: 0, alk: false },
    alkoholfrei: { id: 'alkoholfrei', label: 'Alkoholfrei (Tarn-Bier)', pegel: 0.00, stand: 0, preis: 0, alk: false, heimlich: true }
  };

  // Was die jeweilige Theke / Station anbietet. Wasser kostet in der Disko Punkte.
  var MENUE = {
    spender: ['wasser'],
    tresen_restaurant: ['radler', 'wasser', 'alkoholfrei'],
    tresen_kneipe: ['pils', 'radler', 'kurzer', 'wasser', 'alkoholfrei'],
    bar_disko: ['pils', 'kurzer', 'wasser', 'alkoholfrei']
  };
  var PREIS_PUNKTE = { bar_disko: { wasser: 10 } };

  // Positive Werte wachsen mit der Trinkfestigkeit-Faktor (groesser = vertraegt weniger), Wasser wirkt immer gleich.
  function pegelDelta(id, trink) {
    var d = LISTE[id] ? LISTE[id].pegel : 0;
    return d > 0 ? d * (trink > 0 ? trink : 1) : d;
  }

  Saufi.Getraenke = { LISTE: LISTE, MENUE: MENUE, PREIS_PUNKTE: PREIS_PUNKTE, pegelDelta: pegelDelta };
})(globalThis);
