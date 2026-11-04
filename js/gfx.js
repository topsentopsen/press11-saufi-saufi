/* Zeichen-Grundlagen: Palette, Vektor-Helfer (Pfade, Verlaeufe, runde Formen), Text mit duenner Kontur und Schatten.
   Alles in logischen Koordinaten; die Skalierung auf Geraete-Pixel macht ctx.setTransform in render.js. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var SCHRIFT = 'ui-rounded, system-ui, "SF Pro Rounded", "Segoe UI", "Trebuchet MS", sans-serif';

  var P = {
    kontur: '#4a3560', konturTief: '#3a2a4e', konturGruen: '#3f6b4a', konturHolz: '#7a4a3a', konturStein: '#8a7c9c', konturDach: '#9a4a4a',
    gras: '#a8d68f', gras2: '#8cc27a', gras3: '#c4e6a4', weg: '#dcb98e', weg2: '#c79f74',
    pflaster: '#e8d3ae', pflaster2: '#d6bb90', strasse: '#b4abc4', strasse2: '#9d94b2', wasser: '#7fd3ec', wasser2: '#e8fbff', wasser3: '#4fb0d6',
    mauer: '#cfc2da', mauer2: '#b3a5c2', reben: '#6fae6a', reben2: '#4f9058', hang: '#7dbb78',
    putz: '#fff3e2', putz2: '#ecd6b8', dach: '#f08a6a', dach2: '#d2694f', fenster: '#9fd4f0', fensterNacht: '#ffd77a', fensterKern: '#fff1c2',
    holz: '#c98b5e', holz2: '#a56c48', blatt: '#84c27a', blatt2: '#5f9e64', blatt3: '#b6e39a', stamm: '#9a6a4a',
    stein: '#ece4f0', stein2: '#cfc2da', schatten: 'rgba(74,52,120,0.26)', box: '#fff8ee',
    boden: '#eab48c', boden2: '#d39470', kneipeBoden: '#a8754f', kneipeBoden2: '#8f5f3f', fliese1: '#f7efe2', fliese2: '#cfe3ee',
    disko: '#2a2342', disko2: '#383056', ziegel: '#c4694e', ziegel2: '#a85840', neonPink: '#ff4fa0', neonCyan: '#4fe6ff', neonGelb: '#ffe84f', neonLila: '#a86bff',
    uiFlaeche: '#fff8ee', uiFlaeche2: '#fbe9d4', uiTinte: '#4a3560', uiTinteWeich: '#7d6899',
    herzVoll: '#ff5f8a', herzLicht: '#ffc2d3', herzLeer: '#f3e3ec', gold: '#ffd75e', haut: '#f2c9a0', laterne: '#ffd77a',
    bier: '#ffc233', bierRot: '#e0504a', bierOrange: '#ff8f2e'
  };

  function hash(x, y) { var h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return h ^ (h >>> 16); }
  function rgb(l) { return 'rgb(' + l.r + ',' + l.g + ',' + l.b + ')'; }
  function mix(a, b, t) { return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) }; }
  function hex(s) { var n = parseInt(s.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function mischeHex(a, b, t) { return rgb(mix(hex(a), hex(b), t)); }

  // Rechteck (ohne Rundung)
  function r(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  // Pfad eines abgerundeten Rechtecks
  function rundPfad(c, x, y, w, h, rad) {
    rad = Math.max(0, Math.min(rad, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + rad, y); c.lineTo(x + w - rad, y); c.quadraticCurveTo(x + w, y, x + w, y + rad);
    c.lineTo(x + w, y + h - rad); c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h); c.lineTo(x + rad, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rad); c.lineTo(x, y + rad); c.quadraticCurveTo(x, y, x + rad, y); c.closePath();
  }
  // gefuelltes Rund-Rechteck, optional mit Kontur
  function rr(c, x, y, w, h, col, rad, kontur, lw) {
    rundPfad(c, x, y, w, h, rad === undefined ? 2 : rad); c.fillStyle = col; c.fill();
    if (kontur) { c.lineWidth = lw || 0.8; c.strokeStyle = kontur; c.lineJoin = 'round'; c.stroke(); }
  }
  function box(c, x, y, w, h, col, kontur, rad) { rr(c, x, y, w, h, col, rad === undefined ? 1.5 : rad, kontur || P.kontur, 0.9); }
  function kreis(c, cx, cy, rad, col, kontur, lw) {
    c.beginPath(); c.arc(cx, cy, Math.max(0.01, rad), 0, Math.PI * 2); c.fillStyle = col; c.fill();
    if (kontur) { c.lineWidth = lw || 0.8; c.strokeStyle = kontur; c.stroke(); }
  }
  function ellipse(c, cx, cy, rx, ry, col, kontur, lw) {
    c.save(); c.translate(cx, cy); c.scale(Math.max(0.01, rx), Math.max(0.01, ry));
    c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.restore();
    c.fillStyle = col; c.fill();
    if (kontur) { c.lineWidth = lw || 0.8; c.strokeStyle = kontur; c.stroke(); }
  }
  function poly(c, pts, col, kontur, lw) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fillStyle = col; c.fill();
    if (kontur) { c.lineWidth = lw || 0.8; c.strokeStyle = kontur; c.lineJoin = 'round'; c.stroke(); }
  }
  function linie(c, x1, y1, x2, y2, col, lw) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 1; c.lineCap = 'round'; c.stroke();
  }
  function vlauf(c, x, y, w, h, oben, unten) {
    var gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, oben); gr.addColorStop(1, unten); c.fillStyle = gr; c.fillRect(x, y, w, h);
  }
  function glanz(c, x, y, rad, innen, aussen) {
    var gr = c.createRadialGradient(x, y, 0.5, x, y, rad); gr.addColorStop(0, innen); gr.addColorStop(1, aussen);
    c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  function herz(c, x, y, col) {
    c.beginPath(); c.moveTo(x + 3, y + 5.2); c.bezierCurveTo(x - 2.4, y + 1.6, x + 0.2, y - 1.8, x + 3, y + 0.9);
    c.bezierCurveTo(x + 5.8, y - 1.8, x + 8.4, y + 1.6, x + 3, y + 5.2); c.closePath(); c.fillStyle = col; c.fill();
  }

  // ---------- Text ----------
  // Duenne runde Kontur (nur wenn angegeben) plus leichter Schatten statt dicker Pixelkontur
  function text(c, s, x, y, col, size, ausr, kontur) {
    size = size || 8;
    c.font = 'bold ' + size + 'px ' + SCHRIFT; c.textAlign = ausr || 'left'; c.textBaseline = 'middle';
    if (kontur) {
      c.lineJoin = 'round'; c.lineWidth = Math.max(0.9, size * 0.14); c.strokeStyle = kontur; c.strokeText(s, x, y + 0.4);
    }
    c.fillStyle = col || P.uiTinte; c.fillText(s, x, y);
  }
  function breite(c, s, size) { c.font = 'bold ' + (size || 8) + 'px ' + SCHRIFT; var m = c.measureText(s); return m && m.width ? m.width : s.length * (size || 8) * 0.55; }
  function umbruch(c, s, maxB, size) {
    var worte = String(s).split(' '), zeilen = [], z = '';
    worte.forEach(function (w) {
      var t = z ? z + ' ' + w : w;
      if (z && breite(c, t, size) > maxB) { zeilen.push(z); z = w; } else z = t;
    });
    if (z) zeilen.push(z);
    return zeilen;
  }

  // Panel mit weichem Schatten, abgerundeten Ecken und feiner Kontur
  function panel(c, x, y, w, h, col, rad) {
    rad = rad === undefined ? 5 : rad;
    rundPfad(c, x + 0.5, y + 1.6, w, h, rad); c.fillStyle = 'rgba(30,20,50,0.28)'; c.fill();
    rundPfad(c, x, y, w, h, rad); c.fillStyle = col; c.fill();
    c.lineWidth = 0.9; c.strokeStyle = P.kontur; c.lineJoin = 'round'; c.stroke();
  }

  Saufi.Gfx = {
    SCHRIFT: SCHRIFT, P: P, hash: hash, rgb: rgb, mix: mix, hex: hex, mischeHex: mischeHex, r: r, rundPfad: rundPfad, rr: rr, box: box, kreis: kreis, ellipse: ellipse,
    poly: poly, linie: linie, vlauf: vlauf, glanz: glanz, herz: herz, text: text, breite: breite, umbruch: umbruch, panel: panel
  };
})(globalThis);
