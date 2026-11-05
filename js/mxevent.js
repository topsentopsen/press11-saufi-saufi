/* Motocross-Finale 18:30: Hinweise, Anwesenheit an der Tribuene, Belohnung/Strafe. Kein rng, kein DOM. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var ZEIT = 18 * 60 + 30;
  var HINWEISE = [
    { min: 18 * 60, text: 'Motocross-Finale um 18:30. Sei an der Tribüne!' },
    { min: 18 * 60 + 20, text: 'Noch 10 Minuten bis zum Motocross-Finale!' }
  ];
  var FENSTER = 6;
  var BEREICH = { x0: 27 * 16, y0: 31 * 16, x1: 39 * 16, y1: 45 * 16 };
  var BELOHNUNG = { punkte: 120, team: 1 };
  var STRAFE = { punkte: -30 };

  function erstelle() { return { h: [false, false], status: 'offen' }; }

  function imBereich(ort, x, y) {
    return ort === 'stadt' && x >= BEREICH.x0 && x < BEREICH.x1 && y >= BEREICH.y0 && y < BEREICH.y1;
  }

  function sichtbar(minute) { return minute >= 18 * 60 && minute < ZEIT; }
  function rest(minute) { return ZEIT - minute; }

  function tick(st, minute, ort, x, y) {
    var ev = [], i;
    if (!st || st.status !== 'offen') return ev;
    for (i = 0; i < HINWEISE.length; i++) {
      if (st.h[i]) continue;
      var t = HINWEISE[i].min;
      if (minute >= t && minute < t + 10) {
        st.h[i] = true;
        ev.push({ typ: 'hinweis', i: i });
      } else if (minute >= t + 10) {
        st.h[i] = true;
      }
    }
    if (minute >= ZEIT + FENSTER) {
      st.status = 'uebersprungen';
      ev.push({ typ: 'uebersprungen' });
      return ev;
    }
    if (minute >= ZEIT && minute < ZEIT + FENSTER) {
      if (imBereich(ort, x, y)) {
        st.status = 'dabei';
        ev.push({ typ: 'dabei' });
      } else {
        st.status = 'verpasst';
        ev.push({ typ: 'verpasst' });
      }
    }
    return ev;
  }

  Saufi.MxEvent = {
    ZEIT: ZEIT, HINWEISE: HINWEISE, FENSTER: FENSTER, BEREICH: BEREICH,
    BELOHNUNG: BELOHNUNG, STRAFE: STRAFE,
    erstelle: erstelle, imBereich: imBereich, tick: tick, sichtbar: sichtbar, rest: rest
  };
})(globalThis);
