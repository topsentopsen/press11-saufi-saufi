/* Elon-Sprüche für Tobi: allgemeine und ortsbezogene Pools, deterministisches Intervall ohne rng. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var ALLGEMEIN = [
    'Elon sagt: Pause ist Zeitverschwendung.',
    'Elon hat das gemacht: eine Rakete gelandet. Ich schaff die Treppe.',
    'Elon macht hier erst mal einen Tunnel.',
    'Elon würde jetzt twittern.',
    'Elon fragt: Warum zu Fuß, wenn man fliegen kann?',
    'Elon: Iteriere schneller. Also noch ein Pils.',
    'Elon plant den Mars. Ich plane die nächste Runde.',
    'Elon sagt: Schlaf ist für Leute ohne Deadline.'
  ];

  var KONTEXT = {
    tribuene: [
      'Elon: Zuschauen ist auch Produktivität.',
      'Elon würde die Piste elektrifizieren.',
      'Elon: Vier Räder? Lieber neun.'
    ],
    s21: [
      'Elon und die Boring Company: hier wäre schon fertig.',
      'Elon bohrt Tunnel, Stuttgart bohrt Ausreden.',
      'Elon: S21 in sechs Monaten. Versprochen.'
    ],
    kneipe: [
      'Elon bestellt im Brauhaus nur Wasser. Fast.',
      'Elon: Die Jukebox braucht Streaming.',
      'Elon tippt: Kneipe to the moon.'
    ]
  };

  function intervall(n) {
    return 40 + (((n | 0) * 7) % 21);
  }

  function naechster(state, kontext) {
    state = state || { n: 0, idx: {} };
    if (!state.idx) state.idx = {};
    var pool = (kontext && KONTEXT[kontext]) ? KONTEXT[kontext] : ALLGEMEIN;
    var key = kontext && KONTEXT[kontext] ? kontext : 'allgemein';
    var i = state.idx[key] | 0;
    var text = pool[i % pool.length];
    state.idx[key] = i + 1;
    state.n = (state.n | 0) + 1;
    return text;
  }

  if (Saufi.Hinweise && Saufi.Hinweise.FIGUR) {
    Saufi.Hinweise.FIGUR.tobi = ALLGEMEIN.concat(KONTEXT.tribuene, KONTEXT.s21, KONTEXT.kneipe);
  }

  Saufi.Elon = { ALLGEMEIN: ALLGEMEIN, KONTEXT: KONTEXT, intervall: intervall, naechster: naechster };
})(globalThis);
