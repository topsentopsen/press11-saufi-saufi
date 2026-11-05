/* Visuelle Partikel (Schaum, Funken-Sterne, Staub). Kein S.rng — nur Hash/Sinus, damit Seeds unveraendert bleiben. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var hash = function (x, y) {
    if (Saufi.Gfx && Saufi.Gfx.hash) return Saufi.Gfx.hash(x, y);
    var h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0;
  };
  var MAX = 60, MAX_STAUB = 10;

  function trim(S) {
    if (S.effekte.length > MAX) S.effekte.splice(0, S.effekte.length - MAX);
  }
  function anzahlArt(S, art) {
    var n = 0; for (var i = 0; i < S.effekte.length; i++) if (S.effekte[i].art === art) n++; return n;
  }

  // Klassische Funken + Sterne (Startwerte weiter per rng, wie v08 — Spielablauf identisch)
  function funken(S, x, y, farbe, n) {
    for (var i = 0; i < n; i++) {
      S.effekte.push({
        art: 'funke', stern: i % 2 === 0, x: x, y: y,
        vx: (S.rng.next() - 0.5) * 50, vy: -S.rng.next() * 40 - 10,
        rest: 0.7, dauer: 0.7, farbe: farbe || '#ffe84f', r: 1.0
      });
    }
    trim(S);
  }

  // Schaum/Blaeschen beim Prost — deterministisch aus (S.t, i), kein rng
  function schaum(S, x, y, n) {
    n = n == null ? 6 : n;
    var t0 = Math.floor((S.t || 0) * 1000);
    for (var i = 0; i < n; i++) {
      var h = hash(t0 + i * 17, i * 31 + 7);
      var ang = ((h % 1000) / 1000) * Math.PI - Math.PI / 2;
      var spd = 8 + (h % 7);
      S.effekte.push({
        art: 'schaum', x: x + ((h >> 4) % 7) - 3, y: y,
        vx: Math.cos(ang) * spd * 0.35, vy: -spd,
        rest: 0.55 + ((h >> 8) % 20) / 100, dauer: 0.7,
        farbe: i % 2 ? '#fff8ee' : '#ffe9a8', r: 0.6 + ((h >> 2) % 7) / 10
      });
    }
    trim(S);
  }

  function staub(S, x, y, nacht) {
    if (anzahlArt(S, 'staub') >= MAX_STAUB) return;
    var h = hash(Math.floor(x * 10), Math.floor(y * 10) + Math.floor((S.t || 0) * 8));
    S.effekte.push({
      art: 'staub', x: x + ((h % 5) - 2), y: y,
      vx: ((h >> 3) % 5) - 2, vy: -2 - (h % 3),
      rest: 0.35, dauer: 0.35,
      farbe: nacht ? 'rgba(120,110,140,0.18)' : 'rgba(180,160,120,0.25)',
      r: 1.0 + (h % 3) * 0.15, alpha0: nacht ? 0.18 : 0.25
    });
    trim(S);
  }

  // Beim Laufen: Staub wenn schritt 1 oder 3 (einmal pro Phasenwechsel)
  function staubSchritt(S, figObj, weltX, weltY, nacht) {
    if (!figObj || !figObj.laeuft || figObj.liegt) { figObj && (figObj._staubFr = -1); return; }
    var fr = figObj.schritt | 0;
    if (fr !== 1 && fr !== 3) return;
    if (figObj._staubFr === fr) return;
    figObj._staubFr = fr;
    staub(S, weltX, weltY, nacht);
  }

  Saufi.Partikel = {
    MAX: MAX, MAX_STAUB: MAX_STAUB, funken: funken, schaum: schaum, staub: staub, staubSchritt: staubSchritt
  };
})(globalThis);
