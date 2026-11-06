/* Kamera: folgt einer Position weich (lerp) und bleibt in den Kartengrenzen. Aus Finca uebernommen.
   Innenraum: etwas weiter raus als draussen, ganzer Raum plus INNEN_RAND sichtbar (Nutzer-Zoom als Faktor obendrauf).
   Zoomfahrt beim Betreten (rein: von nah raus) und Verlassen (raus: von weit rein). Werte: DESIGNER-NOTES.md */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var INNEN_RAND = 16;                                   // 1 Kachel Luft um den Raum, damit die Waende lesbar bleiben
  var INNEN_RELATIV = 0.9;                               // innen 10 % weiter raus als draussen
  var INNEN_MIN_ZOOM = 0.4;                              // Raum ist klein, darf unter MIN_WELT_ZOOM (0.5) der Stadt
  var FAHRT = { rein: { von: 1.25, dauer: 0.7 }, raus: { von: 0.8, dauer: 0.55 } };

  function erstelle(viewW, viewH, weltW, weltH) {
    return { x: 0, y: 0, viewW: viewW, viewH: viewH, weltW: weltW, weltH: weltH, weich: 6 };
  }
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  // raumHalten (innen): passt der Raum in eine Achse, folgt die Kamera dem Spieler nur so weit, dass der Raum ganz im Bild bleibt.
  function achse(t, welt, view, halten) {
    if (welt > view) return clamp(t, 0, welt - view);
    return halten ? clamp(t, welt - view, 0) : (welt - view) / 2;
  }
  function ziel(k, px, py) {
    var tx = px - k.viewW / 2;
    // daumenFrei > 0 schiebt den Spieler nach oben, damit die Overlay-Leiste ihn nicht verdeckt. 0 = wie bisher mittig.
    var frei = k.daumenFrei > 0 ? Math.min(0.2, k.daumenFrei) : 0;
    var ty = py - k.viewH * (0.5 - frei);
    return { x: achse(tx, k.weltW, k.viewW, k.raumHalten), y: achse(ty, k.weltH, k.viewH, k.raumHalten) };
  }
  function sofort(k, px, py) { var z = ziel(k, px, py); k.x = z.x; k.y = z.y; }
  function update(k, px, py, dt) {
    var z = ziel(k, px, py), a = 1 - Math.exp(-k.weich * dt);
    k.x += (z.x - k.x) * a; k.y += (z.y - k.y) * a;
    if (Math.abs(z.x - k.x) < 0.05) k.x = z.x;
    if (Math.abs(z.y - k.y) < 0.05) k.y = z.y;
  }
  // Innen-Zoom: weiter raus als draussen (INNEN_RELATIV) und hoechstens so nah, dass Raum + Rand ganz passen ("contain").
  // aussenBasis = Aussen-Zoom ohne Nutzerfaktor; userZoom multipliziert obendrauf; nie unter INNEN_MIN_ZOOM.
  function innenZoom(viewW, viewH, pxW, pxH, aussenBasis, userZoom) {
    var fit = Math.min(viewW / Math.max(1, pxW + 2 * INNEN_RAND), viewH / Math.max(1, pxH + 2 * INNEN_RAND));
    var basis = aussenBasis > 0 ? Math.min(fit, aussenBasis * INNEN_RELATIV) : fit;
    return Math.max(INNEN_MIN_ZOOM, basis * (userZoom > 0 ? userZoom : 1));
  }
  function easeOutCubic(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function starteFahrt(art) { var f = FAHRT[art]; return f ? { art: art, t: 0, dauer: f.dauer, von: f.von } : null; }
  // Faktor auf den Ziel-Zoom: von → 1, abbremsend
  function fahrtFaktor(f) {
    if (!f || !(f.dauer > 0)) return 1;
    return f.von + (1 - f.von) * easeOutCubic(f.t / f.dauer);
  }
  function fahrtUpdate(f, dt) {
    if (!f) return null;
    f.t += dt > 0 ? dt : 0;
    return f.t >= f.dauer ? null : f;
  }

  Saufi.Kamera = {
    erstelle: erstelle, ziel: ziel, sofort: sofort, update: update,
    INNEN_RAND: INNEN_RAND, INNEN_RELATIV: INNEN_RELATIV, INNEN_MIN_ZOOM: INNEN_MIN_ZOOM, FAHRT: FAHRT, innenZoom: innenZoom, easeOutCubic: easeOutCubic,
    starteFahrt: starteFahrt, fahrtFaktor: fahrtFaktor, fahrtUpdate: fahrtUpdate
  };
})(globalThis);
