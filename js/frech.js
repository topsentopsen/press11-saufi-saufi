/* v15: Running Gag (Raphi ist noch kein richtiges Press11-Mitglied) und freche Zufallsblasen. Eigener Zaehler, kein rng. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var RAPHI = [
    'Raphi, streng dich an, dann klappts mit Press11.',
    'Raphi, noch Anwärter. Mehr Einsatz!',
    'Press11? Raphi, noch ein paar Runden.',
    'Raphi, ohne Fleiß kein Press11-Ausweis.',
    'Noch ein Pils, Raphi, dann reden wir.',
    'Raphi, Aufnahmeprüfung läuft. Gib Gas!',
    'Fast Press11, Raphi. Fast.',
    'Raphael, Käppi allein reicht nicht.'
  ];
  var FRECH = [
    'Probst, du Arschloch!',
    'Wer hat schon wieder mein Pils getrunken?',
    'Schwinki, du Lauch, lauf schneller!',
    'Stöckle, du Schwabenpfeife!',
    'Himmelsbach, halt die Klappe und trink.',
    'Schwickendorf, gib eine Runde aus!',
    'Bundschuh, deine Schuhe sind hässlich.',
    'Siebold, du Schnarchnase!',
    'Tobias, du alter Sack!',
    'Ritzi, du Knallkopf!'
  ];

  function intervall(n) { return 18 + (((n | 0) * 5) % 13); }

  // Liefert {text, art} abwechselnd: gerade n Raphi-Gag, ungerade frech
  function naechster(state) {
    state.n = (state.n | 0) + 1;
    if (state.n % 2 === 1) { var i = state.r | 0; state.r = i + 1; return { art: 'raphi', text: RAPHI[i % RAPHI.length] }; }
    var j = ((state.f | 0) * 3) % FRECH.length; state.f = (state.f | 0) + 1;
    return { art: 'frech', text: FRECH[j] };
  }

  // Sprecher waehlen: aktiver NPC am Ort, nicht liegend, ohne Blase; Raphi-Gag nie von Raphael, Probst beleidigt sich nicht selbst
  function sprecher(npcs, ort, eintrag, k) {
    if (npcs.filter(function (n) { return n.blase; }).length >= 2) return null;   // Zwei-Blasen-Limit wie NPCs.sprechen
    var kand = npcs.filter(function (n) {
      if (!n.aktiv || n.liegt || n.karteId !== ort || n.blase) return false;
      if (eintrag.art === 'raphi' && n.id === 'raphael') return false;
      if (eintrag.art === 'frech' && n.char && n.char.name && eintrag.text.indexOf(n.char.name) === 0) return false;
      return true;
    });
    if (!kand.length) return null;
    return kand[(k | 0) % kand.length];
  }

  function vorschau(state) { var c = { n: state.n, r: state.r, f: state.f }; return naechster(c); }

  Saufi.Frech = { vorschau: vorschau, RAPHI: RAPHI, FRECH: FRECH, intervall: intervall, naechster: naechster, sprecher: sprecher };
})(globalThis);
