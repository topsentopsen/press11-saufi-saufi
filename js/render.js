/* Zeichnen: Kacheln, Gebaeude, Figuren, Licht (Toenung + leuchtende Fenster/Neon), HUD, Menues, Bildschirme.
   Alles per Code, keine fremden Grafiken. Pixel-Handheld-Look wie Finca: Palette mit Kontur, Licht als Toenung pro Uhrzeit. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var BASE_W = 320, BASE_H = 176, PORT_H = 400, K = 16;
  var W = BASE_W, H = BASE_H;
  var SCHRIFT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

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
    uiFlaeche: '#fff8ee', uiFlaeche2: '#fbe9d4', uiTinte: '#4a3560', uiTinteWeich: '#8a74a8',
    herzVoll: '#ff5f8a', herzLicht: '#ffc2d3', herzLeer: '#f3e3ec', gold: '#ffd75e', haut: '#f2c9a0', laterne: '#ffd77a',
    bier: '#ffc233', bierRot: '#e0504a', bierOrange: '#ff8f2e'
  };

  // ---------- Grundfunktionen ----------
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return h ^ (h >>> 16); }
  function r(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function rr(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x + 1, y, w - 2, h); c.fillRect(x, y + 1, w, h - 2); }
  function box(c, x, y, w, h, col, kontur) { rr(c, x, y, w, h, kontur || P.kontur); rr(c, x + 1, y + 1, w - 2, h - 2, col); }
  function pille(c, x, y, w, h, col) {
    c.fillStyle = P.kontur; c.fillRect(x + 2, y, w - 4, h); c.fillRect(x + 1, y + 1, w - 2, h - 2); c.fillRect(x, y + 2, w, h - 4);
    c.fillStyle = col; c.fillRect(x + 2, y + 1, w - 4, h - 2); c.fillRect(x + 1, y + 2, w - 2, h - 4);
  }
  function kreis(c, cx, cy, rad, col) {
    c.fillStyle = col;
    for (var dy = -rad; dy <= rad; dy++) { var w = Math.floor(Math.sqrt(rad * rad - dy * dy) + 0.3); c.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
  }
  function ellipse(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    for (var dy = -ry; dy <= ry; dy++) { var w = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); c.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
  }
  function herz(c, x, y, col) { r(c, x, y, 2, 2, col); r(c, x + 3, y, 2, 2, col); r(c, x, y + 1, 5, 2, col); r(c, x + 1, y + 3, 3, 1, col); r(c, x + 2, y + 4, 1, 1, col); }
  function rgb(l) { return 'rgb(' + l.r + ',' + l.g + ',' + l.b + ')'; }
  function mix(a, b, t) { return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) }; }

  // Text mit heller Kontur (lesbar auf jedem Hintergrund)
  function text(c, s, x, y, col, size, ausr, kontur) {
    c.font = 'bold ' + (size || 8) + 'px ' + SCHRIFT; c.textAlign = ausr || 'left'; c.textBaseline = 'middle';
    if (kontur) { c.fillStyle = kontur; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { c.fillText(s, x + d[0], y + d[1]); }); }
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

  function erstelle(canvas, doc) {
    var ctx = canvas.getContext('2d');
    if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;
    doc = doc || canvas.ownerDocument || null;
    var neueLeinwand = (doc && typeof doc.createElement === 'function') ? function (w, h) {
      try { var cv = doc.createElement('canvas'); if (!cv || !cv.getContext) return null; cv.width = w; cv.height = h; return cv; } catch (e) { return null; }
    } : null;
    return { canvas: canvas, ctx: ctx, neueLeinwand: neueLeinwand, hg: {}, props: {}, treffer: [], W: W, H: H, hochkant: false };
  }
  function setzeBildschirm(R, hoch) {
    R.hochkant = !!hoch; W = BASE_W; H = hoch ? PORT_H : BASE_H; R.W = W; R.H = H;
    if (R.canvas) { R.canvas.width = W; R.canvas.height = H; if ('imageSmoothingEnabled' in R.ctx) R.ctx.imageSmoothingEnabled = false; }
    return { w: W, h: H };
  }

  // ---------- Gebaeude: Plan (Fenster, Neon, Tuer) und Zeichnung ----------
  // Rueckgabe in Weltpixeln. fenster: leuchten nachts, neon: leuchtet pulsierend.
  function bauplan(b) {
    var x0 = b.x * K, y0 = b.y * K, w = b.w * K, h = b.h * K, tx = b.tuer.x * K, ty = b.tuer.y * K;
    var plan = { x0: x0, y0: y0, w: w, h: h, tuer: { x: tx, y: ty, w: K, h: K }, fenster: [], neon: [], schild: { x: x0 + w / 2, y: y0 + 21 } };
    var i;
    if (b.id === 'hotel') {
      for (i = 0; i < 4; i++) { plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 26, w: 12, h: 12 }); plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 50, w: 12, h: 12 }); }
      plan.schild = { x: x0 + w / 2, y: y0 + 21 };
    } else if (b.id === 'restaurant') {
      for (i = 0; i < 3; i++) plan.fenster.push({ x: x0 + 8 + i * 34 + (i > 0 ? 10 : 0), y: y0 + 30, w: 14, h: 14 });
      plan.fenster.push({ x: x0 + 8 + 2 * 34 + 10 + 16, y: y0 + 30, w: 0, h: 0 });
      plan.fenster.pop();
      plan.fenster.push({ x: x0 + 8, y: y0 + 54, w: 14, h: 14 }); plan.fenster.push({ x: x0 + w - 24, y: y0 + 54, w: 14, h: 14 });
    } else if (b.id === 'kneipe') {
      plan.fenster.push({ x: x0 + 8, y: y0 + 30, w: 22, h: 18 }); plan.fenster.push({ x: x0 + w - 30, y: y0 + 30, w: 22, h: 18 });
      plan.neon.push({ x: x0 + w / 2 - 18, y: y0 + 16, w: 36, h: 4, farbe: P.neonGelb });
    } else if (b.id === 'disko') {
      plan.neon.push({ x: x0 + 8, y: y0 + 18, w: w - 16, h: 3, farbe: P.neonPink });
      plan.neon.push({ x: x0 + 8, y: y0 + 24, w: w - 16, h: 2, farbe: P.neonCyan });
      plan.neon.push({ x: x0 + 10, y: y0 + h - 2, w: w - 20, h: 2, farbe: P.neonLila });
      plan.fenster.push({ x: x0 + 12, y: y0 + 34, w: 10, h: 18 }); plan.fenster.push({ x: x0 + w - 22, y: y0 + 34, w: 10, h: 18 });
    }
    return plan;
  }
  function fensterBild(c, f, farbe) { box(c, f.x, f.y, f.w, f.h, farbe || P.fenster, P.konturStein); r(c, f.x + Math.floor(f.w / 2), f.y + 1, 1, f.h - 2, P.konturStein); r(c, f.x + 1, f.y + 1, 2, 2, '#e8f7ff'); }

  function zeichneGebaeude(c, b, sx, sy) {
    var p = bauplan(b), w = p.w, h = p.h, x = sx, y = sy, i, t = b.id;
    c.save(); c.translate(x - p.x0, y - p.y0);
    var x0 = p.x0, y0 = p.y0;
    ellipse(c, x0 + w / 2 + 6, y0 + h + 1, w / 2 + 4, 3, 'rgba(74,52,120,0.22)');
    if (t === 'hotel') {
      box(c, x0, y0 + 14, w, h - 14, P.putz, P.konturStein);
      for (i = 0; i < 6; i++) r(c, x0 + 2, y0 + 20 + i * 10, w - 4, 1, P.putz2);
      box(c, x0 - 3, y0 - 8, w + 6, 24, P.dach, P.konturDach);
      for (i = 0; i < 5; i++) r(c, x0 - 1, y0 - 4 + i * 4, w + 2, 1, P.dach2);
      r(c, x0 - 3, y0 + 14, w + 6, 2, P.dach2);
      p.fenster.forEach(function (f) { fensterBild(c, f); r(c, f.x - 1, f.y + f.h, f.w + 2, 2, P.holz2); });   // Balkonbrett
      r(c, x0 + w - 20, y0 - 16, 1, 10, P.konturStein); r(c, x0 + w - 19, y0 - 16, 8, 5, '#ff6f91');       // Fahne
      box(c, x0 + w / 2 - 36, y0 + 16, 72, 10, '#2e3f7a'); text(c, 'HOTEL KESSELBLICK', x0 + w / 2, y0 + 21, '#ffe9a8', 6, 'center');
    } else if (t === 'restaurant') {
      box(c, x0, y0 + 14, w, h - 14, '#f2dfbd', P.konturHolz);
      for (i = 0; i < 4; i++) r(c, x0 + 4 + i * 34, y0 + 16, 3, h - 18, P.holz2);                          // Fachwerk
      r(c, x0 + 2, y0 + 44, w - 4, 3, P.holz2); r(c, x0 + 2, y0 + 26, w - 4, 2, P.holz2);
      box(c, x0 - 3, y0 - 8, w + 6, 24, P.dach2, P.konturDach);
      for (i = 0; i < 5; i++) r(c, x0 - 1, y0 - 4 + i * 4, w + 2, 1, '#b9553f');
      p.fenster.forEach(function (f) { fensterBild(c, f); });
      box(c, x0 + w / 2 - 38, y0 + 16, 76, 10, '#6a3f2a'); text(c, 'GASTHAUS MAULTÄSCHLE', x0 + w / 2, y0 + 21, '#ffe9a8', 6, 'center');
    } else if (t === 'kneipe') {
      box(c, x0, y0 + 10, w, h - 10, P.ziegel, P.konturDach);
      for (i = 0; i < 5; i++) { r(c, x0 + 2, y0 + 16 + i * 8, w - 4, 1, P.ziegel2); }
      box(c, x0 - 2, y0 - 6, w + 4, 18, '#5c4a6e', P.kontur);
      p.fenster.forEach(function (f) { fensterBild(c, f); });
      for (i = 0; i < 7; i++) r(c, x0 + 6 + i * 14, y0 + 48, 14, 8, i % 2 ? '#fff8ee' : '#4fa86a');          // Markise
      box(c, x0 + w / 2 - 38, y0 + 12, 76, 10, '#2f6a3f'); text(c, 'ZUM DURSTIGEN DACHS', x0 + w / 2, y0 + 17, '#ffe9a8', 6, 'center');
      kreis(c, x0 + w - 6, y0 + 4, 3, P.gold);
    } else {
      box(c, x0, y0 + 10, w, h - 10, '#3a2e5c', P.kontur);
      for (i = 0; i < 6; i++) r(c, x0 + 3, y0 + 14 + i * 8, w - 6, 1, '#4a3d72');
      box(c, x0 - 2, y0 - 6, w + 4, 18, '#2a2342', P.kontur);
      p.fenster.forEach(function (f) { fensterBild(c, f, '#5a4a8a'); });
      p.neon.forEach(function (n) { r(c, n.x, n.y, n.w, n.h, n.farbe); });
      text(c, 'UNTERGRUND 07', x0 + w / 2, y0 + 4, P.neonCyan, 7, 'center');
    }
    // Tuer (unten in der Mitte)
    var d = p.tuer;
    box(c, d.x, d.y + 1, d.w, d.h - 1, t === 'disko' ? '#14102a' : P.holz2, P.kontur);
    r(c, d.x + 3, d.y + 5, d.w - 6, d.h - 6, t === 'disko' ? '#241c40' : P.holz);
    if (t === 'disko') for (i = 0; i < 3; i++) r(c, d.x + 3, d.y + 8 + i * 3, d.w - 6, 1, P.neonPink); else r(c, d.x + d.w - 5, d.y + 9, 2, 2, P.gold);
    c.restore();
  }

  // ---------- Kacheln ----------
  function bodenFarben(id) {
    if (id === 'kneipe') return [P.kneipeBoden, P.kneipeBoden2];
    if (id === 'restaurant') return [P.fliese1, P.fliese2];
    if (id === 'disko') return [P.disko, P.disko2];
    return [P.boden, P.boden2];
  }
  var GRUND = {}; GRUND[0] = 1; GRUND[1] = 1; GRUND[2] = 1; GRUND[3] = 1;
  function grundTyp(karte, x, y) {
    var T = Saufi.Karte.T, ns = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    for (var i = 0; i < ns.length; i++) { var t = karte.tile(x + ns[i][0], y + ns[i][1]); if (GRUND[t]) return t; }
    return T.GRAS;
  }
  function nb(karte, x, y, t) { return [karte.tile(x - 1, y) === t, karte.tile(x + 1, y) === t, karte.tile(x, y - 1) === t, karte.tile(x, y + 1) === t]; }

  function bodenKachel(c, typ, sx, sy, hs) {
    var T = Saufi.Karte.T;
    if (typ === T.WEG) { r(c, sx, sy, K, K, P.weg); if (hs % 3 === 0) r(c, sx + (hs % 11) + 2, sy + ((hs >> 4) % 10) + 3, 2, 1, P.weg2); }
    else if (typ === T.PFLASTER || typ === T.STAEFFELE) {
      r(c, sx, sy, K, K, P.pflaster); r(c, sx, sy + 7, K, 1, P.pflaster2); r(c, sx, sy + 15, K, 1, P.pflaster2); r(c, sx + ((hs >> 3) % 2 ? 4 : 10), sy, 1, 7, P.pflaster2); r(c, sx + ((hs >> 5) % 2 ? 11 : 5), sy + 8, 1, 7, P.pflaster2);
    } else if (typ === T.STRASSE) { r(c, sx, sy, K, K, P.strasse); if (hs % 4 === 0) r(c, sx + (hs % 9) + 3, sy + ((hs >> 3) % 9) + 3, 3, 1, P.strasse2); }
    else { r(c, sx, sy, K, K, P.gras); if (hs % 3 === 0) r(c, sx + (hs % 11) + 2, sy + ((hs >> 4) % 10) + 3, 1, 2, P.gras2); if (hs % 7 === 0) r(c, sx + (hs % 9) + 3, sy + ((hs >> 2) % 9) + 4, 2, 1, P.gras3); }
  }

  function zeichneKachel(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, t = karte.tile(x, y), hs = hash(x, y), i;
    if (!karte.innen) {
      if (t === T.GRAS || t === T.WEG || t === T.PFLASTER || t === T.STRASSE) {
        bodenKachel(c, t, sx, sy, hs);
        if (t === T.STRASSE) { var u = karte.tile(x, y + 1) === T.STRASSE, o = karte.tile(x, y - 1) === T.STRASSE; if (o !== u && (x % 2 === 0)) r(c, sx + 2, u ? sy + 15 : sy, 12, 1, '#fff8ee'); }
      }
      else if (t === T.WASSER || t === T.BRUECKE) {
        r(c, sx, sy, K, K, P.wasser); r(c, sx, sy, K, 2, P.wasser3); if (hs % 2) r(c, sx + 3, sy + 8, 6, 1, P.wasser2);
        if (t === T.BRUECKE) {
          r(c, sx, sy, K, K, P.holz); for (i = 0; i < 4; i++) r(c, sx, sy + i * 4 + 3, K, 1, P.holz2);
          if (karte.tile(x - 1, y) !== T.BRUECKE) r(c, sx, sy, 2, K, P.konturHolz); if (karte.tile(x + 1, y) !== T.BRUECKE) r(c, sx + 14, sy, 2, K, P.konturHolz);
        }
      }
      else if (t === T.MAUER) {
        r(c, sx, sy, K, K, P.mauer); r(c, sx, sy, K, 3, '#e6dcef'); r(c, sx, sy + 8, K, 1, P.mauer2);
        r(c, sx, sy + 15, K, 1, P.konturStein); r(c, sx + 5 + (hs % 3) * 3, sy + 3, 1, 5, P.mauer2); r(c, sx + 10 - (hs % 3) * 2, sy + 9, 1, 6, P.mauer2);
      }
      else if (t === T.REBEN) {
        r(c, sx, sy, K, K, P.hang); r(c, sx, sy + 2, K, 3, P.reben); r(c, sx, sy + 10, K, 3, P.reben); r(c, sx, sy + 4, K, 1, P.reben2); r(c, sx, sy + 12, K, 1, P.reben2);
        r(c, sx + 3, sy, 1, 6, P.holz2); r(c, sx + 11, sy + 8, 1, 6, P.holz2);
        if (hs % 3 === 0) { r(c, sx + 6, sy + 5, 2, 2, '#8a5ac8'); r(c, sx + 13, sy + 13, 2, 2, '#8a5ac8'); }
      }
      else if (t === T.STAEFFELE) { bodenKachel(c, T.PFLASTER, sx, sy, hs); for (i = 0; i < 4; i++) { r(c, sx + 1, sy + i * 4, 14, 1, P.konturStein); r(c, sx + 1, sy + i * 4 + 1, 14, 1, '#f6ead0'); } }
      else bodenKachel(c, t === T.BRUNNEN || t === T.BANK ? T.PFLASTER : (t === T.LATERNE || t === T.BAUM || t === T.BUSCH ? grundTyp(karte, x, y) : T.GRAS), sx, sy, hs);
      return;
    }
    // ---------- Innenraeume ----------
    var fb = bodenFarben(karte.id), fl = (x + y) % 2 === 0;
    var bodenTypen = [T.BODEN, T.TANZ, T.TEPPICH, T.TERRASSE, T.AUSGANG];
    var unterBoden = bodenTypen.indexOf(t) < 0 && t !== T.WAND;
    r(c, sx, sy, K, K, fb[0]);
    if (karte.id === 'restaurant' || karte.id === 'disko') { if (fl) r(c, sx, sy, K, K, fb[1]); }
    else { r(c, sx, sy + 7, K, 1, fb[1]); r(c, sx, sy + 15, K, 1, fb[1]); r(c, sx + ((x * 7 + y * 3) % 2 ? 5 : 11), sy, 1, 7, fb[1]); r(c, sx + ((x * 5 + y) % 2 ? 4 : 9), sy + 8, 1, 7, fb[1]); }
    if (t === T.WAND) { wandKachel(c, karte, x, y, sx, sy); return; }
    if (t === T.TEPPICH) { r(c, sx, sy, K, K, '#b8566a'); r(c, sx + 1, sy + 1, K - 2, K - 2, '#c96d7d'); r(c, sx + 3, sy + 3, K - 6, K - 6, '#d98a96'); }
    else if (t === T.TERRASSE) { r(c, sx, sy, K, K, '#d8b98c'); for (i = 0; i < 4; i++) r(c, sx, sy + i * 4, K, 1, '#bd9a6c'); r(c, sx + 7, sy + 5, 2, 2, '#ffe8a0'); }
    else if (t === T.TANZ) { r(c, sx, sy, K, K, fl ? '#3a3060' : '#2c2450'); r(c, sx, sy, K, 1, '#4d4280'); }
    else if (t === T.AUSGANG) { r(c, sx, sy, K, K, '#6a4a3a'); r(c, sx + 2, sy + 2, K - 4, K - 2, P.holz); r(c, sx + 2, sy + 2, K - 4, 2, P.holz2); if ((karte.ausgangX === x)) r(c, sx + 12, sy + 8, 2, 2, P.gold); else r(c, sx + 2, sy + 8, 2, 2, P.gold); text(c, 'EXIT', sx + 8, sy + 8, '#fff8ee', 5, 'center'); }
    else if (t === T.TRESEN) {
      var vert = karte.tile(x, y - 1) === T.TRESEN || karte.tile(x, y + 1) === T.TRESEN;
      r(c, sx, sy + 2, K, K - 2, '#7a4a3a'); r(c, sx, sy + 2, K, 5, '#e0b890'); r(c, sx, sy + 2, K, 1, '#f4d8b4'); r(c, sx, sy + 15, K, 1, P.kontur);
      if (karte.id === 'disko' && vert) { r(c, sx, sy, K, K, '#4a3d72'); r(c, sx + 2, sy, 12, K, '#e0b890'); r(c, sx + 2, sy, 12, 1, '#f4d8b4'); r(c, sx + 13, sy, 1, K, '#8a6a4a'); }
      if (hs % 3 === 0 && !vert) { r(c, sx + 4, sy - 1, 3, 5, '#fff3b0'); r(c, sx + 4, sy - 1, 3, 1, '#ffffff'); }
      if (hs % 3 === 1 && !vert) { r(c, sx + 9, sy, 3, 4, '#d8f0ff'); }
    }
    else if (t === T.TISCH) {
      var n = nb(karte, x, y, T.TISCH);
      r(c, sx, sy + 3, K, K - 4, '#ede0c8'); r(c, sx, sy + 3, K, 1, '#fffaf0'); r(c, sx, sy + 14, K, 2, '#a56c48');
      if (!n[0]) r(c, sx, sy + 3, 1, K - 4, P.konturHolz); if (!n[1]) r(c, sx + 15, sy + 3, 1, K - 4, P.konturHolz);
      if (!n[2]) r(c, sx, sy + 3, K, 1, P.konturHolz);
      r(c, sx + 6, sy + 6, 3, 4, '#fff3b0'); r(c, sx + 6, sy + 6, 3, 1, '#ffffff');
    }
    else if (t === T.SOFA) { r(c, sx, sy + 1, K, K - 2, '#9580dc'); r(c, sx, sy + 1, K, 5, '#b9a3f5'); r(c, sx + 1, sy + 11, K - 2, 3, '#7a66c4'); rr(c, sx + 2, sy + 3, 5, 6, '#ffc0d4'); r(c, sx, sy + 15, K, 1, P.kontur); }
    else if (t === T.BUFFET) { r(c, sx, sy + 4, K, 12, '#fffdf8'); r(c, sx, sy + 4, K, 1, '#ffffff'); r(c, sx, sy + 15, K, 1, P.konturStein); rr(c, sx + 2, sy + 5, 5, 4, '#e8b878'); rr(c, sx + 9, sy + 5, 5, 4, '#ff9a8a'); r(c, sx + 5, sy + 10, 6, 2, '#ffd36e'); }
    else if (t === T.SPENDER) { box(c, sx + 3, sy + 3, 10, 13, '#dff4ff', P.konturStein); kreis(c, sx + 8, sy + 3, 4, '#8fd4f0'); r(c, sx + 7, sy + 9, 2, 2, '#4fb0d6'); }
    else if (t === T.DJ) { r(c, sx, sy + 3, K, 13, '#2a2342'); r(c, sx, sy + 3, K, 2, '#4a3d72'); kreis(c, sx + 8, sy + 10, 4, '#14102a'); kreis(c, sx + 8, sy + 10, 1, P.neonPink); }
    else if (t === T.JUKEBOX) { box(c, sx + 1, sy, 14, 16, '#e0504a', P.kontur); rr(c, sx + 3, sy + 2, 10, 6, '#ffe84f'); r(c, sx + 4, sy + 10, 8, 2, '#fff8ee'); r(c, sx + 4, sy + 13, 8, 1, '#4fe6ff'); }
    else if (t === T.PFLANZE) { rr(c, sx + 4, sy + 9, 8, 7, '#ef9470'); kreis(c, sx + 8, sy + 6, 5, P.blatt2); kreis(c, sx + 6, sy + 5, 3, P.blatt); r(c, sx + 9, sy + 3, 2, 2, P.blatt3); }
    else if (t === T.KUECHE) { r(c, sx, sy + 2, K, 14, '#dfe3ef'); r(c, sx, sy + 2, K, 2, '#fff'); kreis(c, sx + 5, sy + 8, 3, '#9aa3bb'); kreis(c, sx + 12, sy + 8, 3, '#9aa3bb'); r(c, sx, sy + 15, K, 1, P.konturStein); }
    else if (t === T.KICKER) { box(c, sx + 1, sy + 4, 14, 10, '#4fa86a'); r(c, sx + 3, sy + 8, 10, 1, '#fff'); r(c, sx + 5, sy + 2, 1, 14, '#c9c3d6'); r(c, sx + 10, sy + 2, 1, 14, '#c9c3d6'); }
  }
  function wandKachel(c, karte, x, y, sx, sy) {
    var farben = { hotel: ['#f3e1c8', '#cda77c'], restaurant: ['#e9d3a8', '#a56c48'], kneipe: ['#7a4a3a', '#4a2f27'], disko: ['#2a2342', '#14102a'] }[karte.id] || ['#e0c8a0', '#a08060'];
    var oben = y === 0, unten = y === karte.h - 1, seite = x === 0 || x === karte.w - 1;
    r(c, sx, sy, K, K, farben[0]);
    if (oben) { r(c, sx, sy + 14, K, 2, farben[1]); if (x % 4 === 2 && x > 0 && x < karte.w - 1) { box(c, sx + 2, sy + 3, 12, 10, P.fenster, P.konturStein); r(c, sx + 8, sy + 4, 1, 8, P.konturStein); } }
    else if (y === 1) { r(c, sx, sy, K, 9, farben[0]); r(c, sx, sy + 9, K, 7, farben[1]); r(c, sx, sy + 9, K, 1, 'rgba(255,255,255,0.35)'); if (x % 4 === 2 && karte.id === 'kneipe') { r(c, sx + 4, sy + 2, 8, 5, '#fff8ee'); kreis(c, sx + 8, sy + 4, 2, P.bierRot); } }
    else { r(c, sx, sy, K, K, farben[1]); if (unten) r(c, sx, sy, K, 3, farben[0]); }
    if (seite || unten) { r(c, sx, sy, K, K, farben[1]); if (unten) r(c, sx, sy, K, 3, farben[0]); }
  }

  // ---------- Hintergrund-Cache und Props ----------
  function hintergrund(R, karte) {
    var h = R.hg[karte.id];
    if (h) return h;
    if (!R.neueLeinwand) return null;
    var cv = R.neueLeinwand(karte.pxW, karte.pxH), hc = cv ? cv.getContext('2d') : null;
    if (!hc) return null;
    for (var y = 0; y < karte.h; y++) for (var x = 0; x < karte.w; x++) zeichneKachel(hc, karte, x, y, x * K, y * K);
    if (!karte.innen) karte.deco.forEach(function (d) { r(hc, d.x - 1, d.y, 3, 1, d.farbe); r(hc, d.x, d.y - 1, 1, 3, d.farbe); r(hc, d.x, d.y, 1, 1, '#ffcf40'); });
    h = { canvas: cv }; R.hg[karte.id] = h; return h;
  }

  function zeichneBaum(c, sx, sy, hs) {
    ellipse(c, sx + 8, sy + 15, 8, 3, P.schatten);
    r(c, sx + 6, sy + 8, 4, 8, P.stamm); r(c, sx + 6, sy + 8, 1, 8, P.konturHolz);
    var gr = hs % 2 ? P.blatt : P.blatt2;
    kreis(c, sx + 8, sy + 3, 8, P.konturGruen); kreis(c, sx + 8, sy + 3, 7, gr); kreis(c, sx + 5, sy + 1, 3, P.blatt3); r(c, sx + 10, sy + 5, 3, 2, P.blatt2);
  }
  function zeichneBusch(c, sx, sy) { ellipse(c, sx + 8, sy + 14, 7, 3, P.schatten); kreis(c, sx + 8, sy + 10, 6, P.konturGruen); kreis(c, sx + 8, sy + 10, 5, P.blatt); kreis(c, sx + 6, sy + 8, 2, P.blatt3); }
  function zeichneLaterne(c, sx, sy) { r(c, sx + 7, sy + 4, 2, 12, P.kontur); box(c, sx + 5, sy, 6, 5, '#fff8d0'); r(c, sx + 5, sy - 1, 6, 1, P.kontur); r(c, sx + 5, sy + 14, 6, 2, P.kontur); }
  function zeichneBank(c, sx, sy) { r(c, sx + 1, sy + 7, 14, 4, P.holz); r(c, sx + 1, sy + 7, 14, 1, '#e0a878'); r(c, sx + 1, sy + 3, 14, 3, P.holz2); r(c, sx + 2, sy + 11, 2, 4, P.kontur); r(c, sx + 12, sy + 11, 2, 4, P.kontur); }
  function zeichneBrunnen(c, sx, sy, t) {
    ellipse(c, sx + 16, sy + 28, 16, 4, P.schatten);
    box(c, sx + 1, sy + 14, 30, 16, P.stein2, P.konturStein); rr(c, sx + 3, sy + 16, 26, 8, P.wasser);
    r(c, sx + 5 + Math.floor((t * 6) % 6), sy + 19, 4, 1, P.wasser2);
    r(c, sx + 14, sy + 4, 4, 14, P.stein); r(c, sx + 14, sy + 4, 4, 1, P.konturStein); kreis(c, sx + 16, sy + 3, 3, P.wasser2);
  }

  function propsFuer(R, karte) {
    var p = R.props[karte.id];
    if (p) return p;
    var T = Saufi.Karte.T, list = [];
    if (!karte.innen) {
      karte.gebaeude.forEach(function (b) { list.push({ y: (b.y + b.h) * K, x: b.x * K, w: b.w * K, art: 'geb', b: b }); });
      for (var y = 0; y < karte.h; y++) for (var x = 0; x < karte.w; x++) {
        var t = karte.tile(x, y);
        if (t === T.BAUM) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'baum', hs: hash(x, y) });
        else if (t === T.BUSCH) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'busch' });
        else if (t === T.LATERNE) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'laterne', lx: x, ly: y });
        else if (t === T.BANK) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'bank' });
        else if (t === T.BRUNNEN && karte.tile(x - 1, y) !== T.BRUNNEN && karte.tile(x, y - 1) !== T.BRUNNEN) list.push({ y: (y + 2) * K, x: x * K, w: 32, art: 'brunnen' });
      }
    }
    list.sort(function (a, b) { return a.y - b.y; });
    p = R.props[karte.id] = list; return p;
  }

  // ---------- Figuren ----------
  function figur(c, ch, x, y, o) {
    x = Math.round(x); y = Math.round(y);
    var dir = o.dir || 'unten', fr = o.schritt || 0, extra = ch.extra;
    ellipse(c, x, y - 1, 6, 2, P.schatten);
    if (o.liegt) {                                          // umgefallen: liegt quer
      rr(c, x - 8, y - 6, 16, 6, P.kontur); rr(c, x - 7, y - 5, 10, 4, ch.shirt); rr(c, x + 2, y - 5, 4, 4, ch.hose);
      rr(c, x - 12, y - 8, 7, 7, P.kontur); rr(c, x - 11, y - 7, 5, 5, P.haut); r(c, x - 11, y - 7, 5, 2, ch.haar);
      r(c, x - 10, y - 5, 1, 1, P.kontur); r(c, x - 8, y - 5, 1, 1, P.kontur);
      text(c, 'zZz', x - 4, y - 14 + Math.round(Math.sin(o.t * 3) * 1), '#ffffff', 6, 'center', P.kontur);
      return;
    }
    var hoppel = o.tanzt ? -Math.abs(Math.round(Math.sin(o.t * 12) * 2)) : 0;
    y += hoppel;
    var l1 = fr === 1 ? 1 : 0, l2 = fr === 3 ? 1 : 0;
    r(c, x - 3, y - 4 + l1, 2, 4 - l1, ch.hose); r(c, x + 1, y - 4 + l2, 2, 4 - l2, ch.hose);
    r(c, x - 4, y - 1 + l1, 3, 1, P.kontur); r(c, x, y - 1 + l2, 3, 1, P.kontur);
    if (extra === 'schuhe') { r(c, x - 4, y - 1 + l1, 3, 1, '#ff4fa0'); r(c, x, y - 1 + l2, 3, 1, '#4fe6ff'); }
    box(c, x - 4, y - 11, 8, 8, ch.shirt);
    if (extra === 'weste') r(c, x - 3, y - 10, 6, 6, '#7a7a88'); if (extra === 'tracht') { r(c, x - 3, y - 10, 6, 6, '#1f4a2a'); r(c, x - 1, y - 9, 2, 1, '#d8c070'); }
    if (extra === 'latz') { r(c, x - 3, y - 7, 6, 4, '#f08a2a'); r(c, x - 3, y - 10, 1, 3, '#f08a2a'); r(c, x + 2, y - 10, 1, 3, '#f08a2a'); }
    var arm = (fr === 1 || fr === 3) ? 1 : 0;
    r(c, x - 5, y - 10 + arm, 1, 5, ch.shirt); r(c, x + 4, y - 10 + (arm ? 0 : 0), 1, 5, ch.shirt);
    if (o.glas) { r(c, x + 4, y - 9, 3, 4, '#fff3b0'); r(c, x + 4, y - 9, 3, 1, '#ffffff'); }
    var hy = y - 18;
    box(c, x - 4, hy, 8, 8, P.haut);
    if (extra === 'rosa') { r(c, x - 5, hy - 1, 10, 4, ch.haar); r(c, x - 5, hy, 2, 8, ch.haar); r(c, x + 3, hy, 2, 8, ch.haar); }
    else if (extra === 'gel') { r(c, x - 4, hy, 8, 3, ch.haar); r(c, x - 2, hy - 2, 2, 2, ch.haar); r(c, x + 1, hy - 2, 2, 2, ch.haar); }
    else r(c, x - 4, hy, 8, 3, ch.haar);
    if (dir !== 'oben') {
      var ex = dir === 'links' ? -2 : (dir === 'rechts' ? 1 : -2);
      r(c, x + ex, hy + 4, 1, 2, P.kontur); if (dir === 'unten') r(c, x + 1, hy + 4, 1, 2, P.kontur);
      if (o.schwips) r(c, x - 3, hy + 6, 6, 1, '#ff9fb0');                               // rote Backen
    } else r(c, x - 4, hy, 8, 6, ch.haar);
    if (extra === 'muetze') { r(c, x - 5, hy - 2, 10, 4, '#e0504a'); r(c, x - 5, hy + 1, 10, 1, '#8a2a28'); if (dir === 'links') r(c, x - 7, hy + 1, 3, 1, '#8a2a28'); else r(c, x + 4, hy + 1, 3, 1, '#8a2a28'); }
    if (extra === 'brille' && dir !== 'oben') { r(c, x - 4, hy + 3, 3, 3, '#ffffff'); r(c, x + 1, hy + 3, 3, 3, '#ffffff'); r(c, x - 4, hy + 3, 8, 1, P.kontur); r(c, x - 3, hy + 4, 1, 1, P.kontur); r(c, x + 2, hy + 4, 1, 1, P.kontur); }
    if (extra === 'schnurrbart' && dir !== 'oben') r(c, x - 3, hy + 6, 6, 1, '#5a3a28');
    if (extra === 'cap') { r(c, x - 5, hy - 2, 10, 4, '#1a1a22'); r(c, dir === 'links' ? x - 8 : x + 3, hy + 1, 5, 1, '#1a1a22'); }
    if (extra === 'hut') { r(c, x - 6, hy, 12, 1, '#1a1a22'); r(c, x - 4, hy - 4, 8, 4, '#1a1a22'); r(c, x - 4, hy - 1, 8, 1, '#c9c3d6'); }
    if (extra === 'tracht') { r(c, x - 4, hy - 1, 8, 2, '#2f6a3f'); r(c, x + 2, hy - 4, 1, 3, '#d8c070'); }
  }

  function blase(c, x, y, s, rand) {
    var w = breite(c, s, 6) + 6, bx = Math.round(x - w / 2), by = Math.round(y - 10);
    if (bx < 2) bx = 2; if (bx + w > W - 2) bx = W - 2 - w;
    pille(c, bx, by, w, 10, '#fff8ee'); text(c, s, bx + w / 2, by + 5, P.uiTinte, 6, 'center');
  }

  // ---------- Welt zeichnen ----------
  function zeichneWelt(R, S) {
    var c = R.ctx, karte = S.karte, cam = S.kamera, T = Saufi.Karte.T;
    var cx = Math.round(cam.x), cy = Math.round(cam.y), licht = S.licht, i;
    r(c, 0, 0, W, H, '#2a2236');
    var hg = hintergrund(R, karte);
    if (hg) {
      var sx = Math.max(0, cx), sy = Math.max(0, cy), dx = sx - cx, dy = sy - cy;
      var bw = Math.min(karte.pxW - sx, W - dx), bh = Math.min(karte.pxH - sy, H - dy);
      if (bw > 0 && bh > 0) c.drawImage(hg.canvas, sx, sy, bw, bh, dx, dy, bw, bh);
    } else {
      for (var y = Math.max(0, Math.floor(cy / K)); y <= Math.min(karte.h - 1, Math.floor((cy + H) / K)); y++)
        for (var x = Math.max(0, Math.floor(cx / K)); x <= Math.min(karte.w - 1, Math.floor((cx + W) / K)); x++) zeichneKachel(c, karte, x, y, x * K - cx, y * K - cy);
    }
    var t = S.t;
    // bewegtes Wasser, Tanzflaeche, Fenster innen
    if (!karte.innen) {
      for (var wy = Math.max(0, Math.floor(cy / K)); wy <= Math.min(karte.h - 1, Math.floor((cy + H) / K)); wy++)
        for (var wx = Math.max(0, Math.floor(cx / K)); wx <= Math.min(karte.w - 1, Math.floor((cx + W) / K)); wx++) {
          if (karte.tile(wx, wy) !== T.WASSER) continue;
          var o = Math.floor((t * 6 + wx * 3 + wy * 5) % 16);
          r(c, wx * K - cx + o, wy * K - cy + 5, 5, 1, P.wasser2); r(c, wx * K - cx + ((o + 8) % 16), wy * K - cy + 11, 4, 1, P.wasser3);
        }
    } else if (karte.id === 'disko') zeichneTanz(R, S, cx, cy);
    else zeichneInnenFenster(R, S, cx, cy);

    // Sortierte Dinge: Props, Orte-Objekte, Figuren
    var dinge = [];
    propsFuer(R, karte).forEach(function (p) { if (p.x - cx < W + 40 && p.x - cx > -140 && p.y - cy > -20 && p.y - cy < H + 120) dinge.push(p); });
    if (karte.id === 'hotel' && S.joint && !S.joint.gefunden) dinge.push({ y: 8 * K + 12, art: 'joint', x: 14 * K, ky: 8 * K });
    S.npcs.forEach(function (n) { if (n.aktiv && n.karteId === karte.id) dinge.push({ y: n.y, art: 'npc', n: n }); });
    if (S.zustand !== 'start') dinge.push({ y: S.spieler.y + 0.1, art: 'spieler' });
    if (karte.id === 'disko') dinge.push({ y: 10 * K + 8, art: 'tuersteher', x: 6 * K + 8, ky: 10 * K + 8 });
    dinge.sort(function (a, b) { return a.y - b.y; });
    dinge.forEach(function (d) {
      var px = d.x - cx, py = (d.art === 'geb' ? d.b.y * K : (d.art === 'baum' || d.art === 'busch' || d.art === 'bank' || d.art === 'laterne' ? d.y - K : (d.art === 'brunnen' ? d.y - 32 : 0))) - cy;
      if (d.art === 'geb') zeichneGebaeude(c, d.b, px, py);
      else if (d.art === 'baum') zeichneBaum(c, px, py, d.hs);
      else if (d.art === 'busch') zeichneBusch(c, px, py);
      else if (d.art === 'laterne') zeichneLaterne(c, px, py);
      else if (d.art === 'bank') zeichneBank(c, px, py);
      else if (d.art === 'brunnen') zeichneBrunnen(c, px, py, t);
      else if (d.art === 'joint') zeichneJoint(c, d.x - cx + 8, d.ky - cy + 8, t);
      else if (d.art === 'tuersteher') figur(c, { shirt: '#14102a', hose: '#14102a', haar: '#14102a', extra: 'hut' }, d.x - cx, d.ky - cy, { dir: 'unten', t: t });
      else if (d.art === 'npc') {
        var n = d.n; figur(c, n.char, n.x - cx, n.y - cy, { dir: n.dir, schritt: n.schritt, liegt: n.liegt, t: t, schwips: n.fig.pegel > 1.5, tanzt: S.tanzNpc && !n.liegt, glas: S.prost > 0 && !n.liegt });
        if (n.blase && !n.liegt) blase(c, n.x - cx, n.y - cy - 20, n.char.name + ': ' + n.blase.text);
        else if (n.liegt) { text(c, 'Q = wecken', n.x - cx, n.y - cy - 12, '#ffffff', 6, 'center', P.kontur); }
      }
      else if (d.art === 'spieler') {
        var sp = S.spieler, ch = S.char;
        figur(c, ch, sp.x - cx, sp.y - cy, { dir: sp.dir, schritt: sp.schritt, liegt: sp.liegt, t: t, schwips: S.fig.pegel > 1.5, tanzt: sp.tanzt > 0, glas: S.prost > 0 });
        if (!sp.liegt) { c.fillStyle = '#ffd75e'; c.fillRect(Math.round(sp.x - cx) - 1, Math.round(sp.y - cy) - 26, 3, 1); c.fillRect(Math.round(sp.x - cx), Math.round(sp.y - cy) - 25, 1, 1); }
      }
    });
    // Effekte (Prost-Funken, Sterne)
    (S.effekte || []).forEach(function (e) {
      var a = Math.max(0, e.rest / e.dauer);
      c.globalAlpha = a; r(c, Math.round(e.x - cx + e.vx * (e.dauer - e.rest)), Math.round(e.y - cy + e.vy * (e.dauer - e.rest)), 2, 2, e.farbe); c.globalAlpha = 1;
    });

    // Toenung: Tageslicht (draussen) oder Raumlicht (innen)
    var tint = tintFuer(S);
    c.globalCompositeOperation = 'multiply'; r(c, 0, 0, W, H, rgb(tint)); c.globalCompositeOperation = 'source-over';
    zeichneLichter(R, S, cx, cy, tint);
  }

  function tintFuer(S) {
    var l = S.licht, ort = S.ort;
    if (ort === 'stadt') return { r: l.r, g: l.g, b: l.b };
    if (ort === 'disko') return mix({ r: 70, g: 62, b: 120 }, { r: 110, g: 90, b: 160 }, S.boostAktiv ? 1 : 0.0);
    return mix({ r: l.r, g: l.g, b: l.b }, { r: 255, g: 238, b: 208 }, 0.55 + 0.25 * l.glut);
  }

  function zeichneJoint(c, x, y, t) {
    ellipse(c, x, y + 4, 4, 2, P.schatten);
    r(c, x - 4, y - 1 + Math.round(Math.sin(t * 3)), 8, 3, '#fff8ee'); r(c, x - 4, y + Math.round(Math.sin(t * 3)), 2, 1, '#ff8f2e');
    r(c, x + 3, y - 4 + Math.round(Math.sin(t * 3)), 1, 2, '#c9c3d6'); r(c, x + 4, y - 7 + Math.round(Math.sin(t * 3)), 2, 2, '#c9c3d6');
  }

  var TANZ_FARBEN = [P.neonPink, P.neonCyan, P.neonGelb, P.neonLila];
  function zeichneTanz(R, S, cx, cy) {
    var c = R.ctx, karte = S.karte, T = Saufi.Karte.T, beat = Math.floor(S.t / Saufi.Ton.BEAT), ph = (S.t / Saufi.Ton.BEAT) % 1, boost = S.boostAktiv;
    for (var y = 4; y < 8; y++) for (var x = 4; x < 14; x++) {
      if (karte.tile(x, y) !== T.TANZ) continue;
      var f = TANZ_FARBEN[(x + y + beat + (boost ? beat : 0)) % 4];
      c.globalAlpha = (0.30 + (1 - ph) * 0.35) * (boost ? 1.3 : 1); r(c, x * K - cx + 1, y * K - cy + 1, K - 2, K - 2, f); c.globalAlpha = 1;
    }
  }
  function zeichneInnenFenster(R, S, cx, cy) {
    var c = R.ctx, karte = S.karte, l = S.licht, nacht = Math.min(0.85, l.glut * 0.9);
    for (var x = 2; x < karte.w - 1; x += 4) {
      c.globalAlpha = nacht; r(c, x * K - cx + 3, 3 - cy, 10, 8, '#1c1838'); c.globalAlpha = 1;
      if (l.glut > 0.6) { r(c, x * K - cx + 5, 5 - cy, 1, 1, '#ffffff'); r(c, x * K - cx + 10, 7 - cy, 1, 1, '#ffffff'); }
    }
  }

  // Leuchtende Fenster, Laternen, Neon und Disko-Strahler nach der Toenung
  function zeichneLichter(R, S, cx, cy, tint) {
    var c = R.ctx, karte = S.karte, l = S.licht, t = S.t, T = Saufi.Karte.T, i;
    var wob = S.doppelt ? 1 : 0;
    c.globalCompositeOperation = 'lighter';
    if (!karte.innen) {
      var glut = l.glut, lampen = l.lampen;
      karte.gebaeude.forEach(function (b) {
        var plan = bauplan(b), offen = Saufi.Uhr.offen(b.id, S.uhr.minute);
        if (glut > 0.02) plan.fenster.forEach(function (f) {
          if (!offen && b.id !== 'hotel') return;
          var gg = glut * glut;                                          // in der Daemmerung noch nicht weissglueh
          c.globalAlpha = 0.5 * gg; r(c, f.x - cx - 2, f.y - cy - 2, f.w + 4, f.h + 4, '#ff9f3a');
          c.globalAlpha = 0.85 * gg; r(c, f.x - cx, f.y - cy, f.w, f.h, P.fensterNacht);
          c.globalAlpha = 0.15 * gg; r(c, f.x - cx + 2, f.y - cy + 2, Math.max(0, f.w - 4), Math.max(0, f.h - 4), P.fensterKern);
        });
        var an = offen || b.id === 'hotel';
        if (an) plan.neon.forEach(function (n) {
          var p = 0.65 + 0.35 * Math.sin(t * 5 + n.x * 0.1), a = Math.max(l.glut, b.id === 'disko' ? 0.35 : 0) * p;
          c.globalAlpha = a * 0.5; r(c, n.x - cx - 3, n.y - cy - 3, n.w + 6, n.h + 6, n.farbe); c.globalAlpha = Math.min(1, a * 1.3); r(c, n.x - cx, n.y - cy, n.w, n.h, n.farbe);
        });
        // Tuer-Lichtinsel bei Nacht
        if (glut > 0.05 && an) {
          var d = plan.tuer, grd = c.createRadialGradient(d.x - cx + 8, d.y - cy + 14, 2, d.x - cx + 8, d.y - cy + 14, 34);
          grd.addColorStop(0, 'rgba(255,190,110,0.55)'); grd.addColorStop(1, 'rgba(255,190,110,0)');
          c.globalAlpha = glut; c.fillStyle = grd; c.fillRect(d.x - cx - 30, d.y - cy - 20, 76, 70);
        }
      });
      if (lampen > 0.02) {
        propsFuer(R, karte).forEach(function (p) {
          if (p.art !== 'laterne') return;
          var lx = p.x - cx + 8, ly = p.lyPix = p.ly * K - cy + 4;
          if (lx < -50 || lx > W + 50 || ly < -50 || ly > H + 50) return;
          var gr = c.createRadialGradient(lx, ly, 1, lx, ly, 38);
          gr.addColorStop(0, 'rgba(255,214,130,0.75)'); gr.addColorStop(0.5, 'rgba(255,190,100,0.28)'); gr.addColorStop(1, 'rgba(255,190,100,0)');
          c.globalAlpha = lampen; c.fillStyle = gr; c.fillRect(lx - 40, ly - 40, 80, 80);
        });
      }
      // schwache Gebaeudekanten, damit man nachts navigieren kann
      if (glut > 0.4) {
        c.globalAlpha = 0.16 * glut;
        karte.gebaeude.forEach(function (b) { var pl = bauplan(b); c.fillStyle = '#8f8fff'; c.fillRect(pl.x0 - cx, pl.y0 - cy + 14, pl.w, 1); c.fillRect(pl.x0 - cx, pl.y0 + pl.h - cy, pl.w, 1); c.fillRect(pl.x0 - cx, pl.y0 - cy + 14, 1, pl.h - 14); c.fillRect(pl.x0 + pl.w - 1 - cx, pl.y0 - cy + 14, 1, pl.h - 14); });
      }
    } else {
      // Raum-Lampen: warme Lichtinseln. Disko: Strahler und Boost-Show
      if (karte.id === 'disko') {
        var ph = (t / Saufi.Ton.BEAT) % 1, boost = S.boostAktiv;
        for (i = 0; i < 4; i++) {                                    // Strahler vom DJ-Pult, schwenken im Takt
          var bx = (7.6 + i * 0.9) * K - cx, by = 3 * K - cy, sw = Math.sin(t * 1.6 + i * 1.7) * 38;
          c.globalAlpha = (0.13 + (1 - ph) * 0.13) * (boost ? 1.7 : 1); c.fillStyle = TANZ_FARBEN[(i + Math.floor(t)) % 4];
          c.beginPath(); c.moveTo(bx - 2, by); c.lineTo(bx + 2, by); c.lineTo(bx + sw + 26, by + 92); c.lineTo(bx + sw - 26, by + 92); c.closePath(); c.fill();
        }
        c.globalAlpha = 0.85; r(c, 7 * K - cx + 2, 2 * K - cy + 5, 4 * K - 4, 2, TANZ_FARBEN[Math.floor(t * 4) % 4]);
      } else {
        for (i = 0; i < karte.w; i += 5) {
          var lx2 = i * K - cx + 10, ly2 = 3 * K - cy;
          var gr3 = c.createRadialGradient(lx2, ly2, 2, lx2, ly2, 50);
          gr3.addColorStop(0, 'rgba(255,214,130,0.35)'); gr3.addColorStop(1, 'rgba(255,214,130,0)');
          c.globalAlpha = 0.7 + 0.3 * l.glut; c.fillStyle = gr3; c.fillRect(lx2 - 52, ly2 - 52, 104, 104);
        }
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // ---------- HUD ----------
  function krug(c, x, y, pegel) {
    var f = Math.max(0, Math.min(1, pegel / 4)), col = pegel < 1.5 ? P.bier : (pegel < 3 ? P.bierOrange : P.bierRot);
    box(c, x, y, 11, 13, '#e8f7ff'); var hh = Math.round(9 * f); r(c, x + 1, y + 11 - hh, 9, hh, col); if (hh > 1) r(c, x + 1, y + 11 - hh, 9, 1, '#fff8ee');
    r(c, x + 11, y + 3, 3, 6, P.kontur); r(c, x + 12, y + 4, 1, 4, P.uiFlaeche);
  }
  function hud(R, S) {
    var c = R.ctx, fig = S.fig, uhr = S.uhr, i;
    // links oben: Pegel, Standfestigkeit, Teamstimmung
    pille(c, 2, 2, 78, 54, 'rgba(255,248,238,0.92)');
    krug(c, 6, 5, fig.pegel);
    var pt = S.joint && Saufi.Ereignisse.Joint.schwammig(S.joint) ? '~' + Saufi.Pegel.anzeige(fig.pegel + Math.sin(S.t * 5) * 0.4) : Saufi.Pegel.anzeige(fig.pegel);
    text(c, pt + ' ‰', 26, 12, fig.pegel >= 3 ? P.bierRot : P.uiTinte, 10);
    var herzen = Math.ceil(fig.stand / 20);
    for (i = 0; i < 5; i++) { var voll = fig.stand >= (i + 1) * 20 - 0.01; herz(c, 6 + i * 9, 22, voll ? P.herzVoll : (i < herzen ? P.herzLicht : P.herzLeer)); }
    text(c, 'Team', 6, 35, P.uiTinteWeich, 6);
    for (i = 0; i < 5; i++) { r(c, 26 + i * 9, 32, 7, 6, P.kontur); r(c, 27 + i * 9, 33, 5, 4, i < S.runden.team ? '#5ec8b8' : P.herzLeer); }
    // Flaschen, Joint
    r(c, 6, 43, 3, 7, '#8fd4f0'); r(c, 6, 43, 3, 2, '#4fb0d6'); text(c, 'x' + S.flaschen, 12, 47, P.uiTinte, 7);
    if (S.joint && (S.joint.hat || S.joint.doppelt)) text(c, S.joint.doppelt ? 'x2!' : 'R: Tüte', 30, 47, '#ff8f2e', 7);
    // Mitte oben: Uhr
    var cxm = Math.round(W / 2) - 4;
    pille(c, cxm - 30, 2, 60, 24, 'rgba(255,248,238,0.92)');
    text(c, Saufi.Uhr.text(uhr), cxm, 11, P.uiTinte, 12, 'center');
    text(c, Saufi.Uhr.tag(uhr).slice(0, 2) + ' · ' + Saufi.Uhr.phase(uhr), cxm, 21, P.uiTinteWeich, 6, 'center');
    text(c, '★ ' + S.punkte.punkte, cxm, 33, P.uiTinte, 8, 'center', 'rgba(255,248,238,0.9)');
    // Runde
    var nr = Saufi.Runden.naechste(S.runden);
    if (nr && (nr.status === 'warnung' || nr.status === 'aktiv')) {
      var aktiv = nr.status === 'aktiv', rest = aktiv ? nr.zeit + Saufi.Runden.FRIST_MIN - uhr.minute : nr.zeit - uhr.minute;
      var rw = 150, rx = Math.round(W / 2) - 4 - rw / 2, ry = 40, blink = aktiv && Math.floor(S.t * 3) % 2 === 0;
      pille(c, rx, ry, rw, 18, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8');
      text(c, (aktiv ? 'RUNDE! ' : 'Runde ' + Saufi.Uhr.zeitText(nr.zeit) + ': ') + Saufi.Karte.NAMEN[nr.ort], rx + rw / 2, ry + 6, P.uiTinte, 7, 'center');
      var frac = Math.max(0, Math.min(1, rest / (aktiv ? Saufi.Runden.FRIST_MIN : Saufi.Runden.VORLAUF_MIN)));
      r(c, rx + 8, ry + 12, rw - 16, 3, P.kontur); r(c, rx + 9, ry + 13, Math.round((rw - 18) * frac), 1, aktiv ? '#e0504a' : '#f0b030');
    }
    // Scooter-Leiste (nur in der Disko)
    if (S.ort === 'disko') {
      var bw = 110, bx = Math.round(W / 2) - bw / 2 - 4, by = H - 36, b = S.boost, f = b.leiste, pulse = f >= 1 && Math.floor(S.t * 4) % 2 === 0;
      pille(c, bx - 4, by - 4, bw + 8, 16, 'rgba(42,35,66,0.9)');
      r(c, bx, by, bw, 8, P.kontur); r(c, bx + 1, by + 1, Math.round((bw - 2) * f), 6, pulse ? '#ffffff' : P.neonPink);
      text(c, S.boostAktiv ? 'HYPER HYPER!' : (f >= 1 ? 'R: HYPER-BOOST!' : 'SCOOTER · E tanzen'), bx + bw / 2, by + 4, S.boostAktiv ? P.neonGelb : '#ffffff', 6, 'center');
    }
    // Navigationspfeil
    if (S.pfeil) pfeil(R, S.pfeil.x, S.pfeil.y);
    // Banner
    var h = Saufi.Hinweise.aktuell(S.hinweise);
    if (h) {
      var a = Math.min(1, h.rest * 3);
      c.globalAlpha = a;
      if (h.art === 'gross') { var y0 = Math.round(H * 0.42) + (Math.floor(S.t * 8) % 2); text(c, h.text, Math.round(W / 2), y0, '#ffe84f', 16, 'center', P.kontur); }
      else {
        var zl = umbruch(c, h.text, W - 70, 8), hh2 = zl.length * 10 + 6, wy = H - 28 - hh2 - (S.ort === 'disko' ? 14 : 0), mw = 0, mx = Math.round(W / 2);
        zl.forEach(function (z) { mw = Math.max(mw, breite(c, z, 8)); });
        var bw2 = Math.min(W - 60, Math.round(mw) + 18);
        pille(c, mx - Math.round(bw2 / 2), wy, bw2, hh2, h.art === 'schlecht' ? '#ffd1da' : (h.art === 'gut' ? '#d8f5dc' : P.uiFlaeche));
        zl.forEach(function (z, k) { text(c, z, mx, wy + 8 + k * 10, P.uiTinte, 8, 'center'); });
      }
      c.globalAlpha = 1;
    }
    // Hilfe unten
    if (S.hilfe) {
      var hw = breite(c, S.hilfe, 8) + 14;
      pille(c, Math.round(W / 2 - hw / 2) - 4, H - 20, hw, 14, 'rgba(255,248,238,0.95)'); text(c, S.hilfe, Math.round(W / 2) - 4, H - 13, P.uiTinte, 8, 'center');
    }
  }
  function pfeil(R, wx, wy) {
    var c = R.ctx, cx = W / 2, cy = H / 2, dx = wx - cx, dy = wy - cy;
    var inside = wx > 10 && wx < W - 10 && wy > 40 && wy < H - 24;
    if (inside) { var bob = Math.round(Math.sin(Date.now() / 160) * 2); c.fillStyle = P.kontur; c.beginPath(); c.moveTo(wx - 6, wy - 22 + bob); c.lineTo(wx + 6, wy - 22 + bob); c.lineTo(wx, wy - 12 + bob); c.closePath(); c.fill(); c.fillStyle = '#ffd75e'; c.beginPath(); c.moveTo(wx - 4, wy - 21 + bob); c.lineTo(wx + 4, wy - 21 + bob); c.lineTo(wx, wy - 14 + bob); c.closePath(); c.fill(); return; }
    var ang = Math.atan2(dy, dx), rad = Math.min(cx - 14, (cy - 28) / Math.max(0.2, Math.abs(Math.sin(ang))) , (cx - 14) / Math.max(0.2, Math.abs(Math.cos(ang))));
    var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    py = Math.max(46, Math.min(H - 26, py)); px = Math.max(12, Math.min(W - 12, px));
    c.save(); c.translate(px, py); c.rotate(ang);
    c.fillStyle = P.kontur; c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -7); c.lineTo(-5, 7); c.closePath(); c.fill();
    c.fillStyle = '#ffd75e'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-3, -4); c.lineTo(-3, 4); c.closePath(); c.fill(); c.restore();
    text(c, 'HIER SOLLST DU HIN', Math.round(W / 2), 66, P.uiTinte, 6, 'center', 'rgba(255,248,238,0.85)');
  }

  // ---------- Menues und Bildschirme ----------
  function zeichneListe(R, titel, kopf, eintraege, index, o) {
    var c = R.ctx, bw = o && o.breite || 226, rowH = o && o.zeile || (R.hochkant ? 22 : 15), kopfH = kopf.length * 9;
    var bh = 22 + kopfH + eintraege.length * rowH + 8, bx = Math.round((W - bw) / 2), by = Math.round(Math.max(4, (H - bh) / 2));
    c.fillStyle = 'rgba(42,34,54,0.55)'; c.fillRect(0, 0, W, H);
    pille(c, bx, by, bw, bh, P.uiFlaeche);
    text(c, titel, bx + bw / 2, by + 10, P.uiTinte, 10, 'center');
    kopf.forEach(function (z, i) { text(c, z, bx + bw / 2, by + 22 + i * 9, P.uiTinteWeich, 7, 'center'); });
    R.treffer = [];
    eintraege.forEach(function (e, i) {
      var ey = by + 20 + kopfH + i * rowH, sel = i === index, aktiv = e.aktiv !== false;
      pille(c, bx + 8, ey, bw - 16, rowH - 2, sel ? '#ffe9a8' : P.uiFlaeche2);
      text(c, e.label, bx + 14, ey + (rowH - 2) / 2, aktiv ? P.uiTinte : '#b3a5c2', 8);
      if (e.rechts) text(c, e.rechts, bx + bw - 14, ey + (rowH - 2) / 2, P.uiTinteWeich, 7, 'right');
      R.treffer.push({ x: bx + 8, y: ey, w: bw - 16, h: rowH - 2, i: i });
    });
  }

  function himmel(c, oben, unten) {
    var gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, oben); gr.addColorStop(1, unten); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  }
  function huegel(c, y, farbe, versatz, amp) {
    c.fillStyle = farbe;
    for (var x = 0; x < W; x += 2) { var h = y + Math.sin((x + versatz) / 38) * amp + Math.sin((x + versatz) / 17) * amp * 0.4; c.fillRect(x, Math.round(h), 2, H); }
  }
  function kesselSzene(c, hell, t) {
    himmel(c, hell ? '#9fd4f0' : '#2a2a5a', hell ? '#fff0c8' : '#6a5a9a');
    huegel(c, H * 0.55, hell ? '#8cc27a' : '#2f4a52', 0, 8); huegel(c, H * 0.66, hell ? '#6fae6a' : '#223a44', 90, 6);
    for (var i = 0; i < 18; i++) { var bx = 30 + i * 15, bh = 8 + (i * 7) % 18; r(c, bx, Math.round(H * 0.74) - bh, 9, bh + 20, hell ? '#e0c8b0' : '#1a2036'); if (!hell && i % 2) r(c, bx + 3, Math.round(H * 0.74) - bh + 4, 2, 2, '#ffd77a'); }
    r(c, 0, Math.round(H * 0.74) + 8, W, H, hell ? '#a8d68f' : '#162030');
  }

  function startBild(R, S) {
    var c = R.ctx, t = S.t; kesselSzene(c, false, t);
    var grd = c.createRadialGradient(W / 2, 30, 4, W / 2, 30, 120); grd.addColorStop(0, 'rgba(255,79,160,0.35)'); grd.addColorStop(1, 'rgba(255,79,160,0)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    var tw = R.hochkant ? 0 : 0;
    text(c, 'Press11 - Saufi Saufi', W / 2, 18, P.neonCyan, 16, 'center', P.kontur);
    text(c, 'Stuttgart, Samstag 08:00 bis Sonntag 04:00', W / 2, 33, '#ffe9a8', 8, 'center', P.kontur);
    var zeilen = Saufi.Hinweise.HINWEIS_START, by = R.hochkant ? 60 : 44, bh = zeilen.length * 10 + 10;
    pille(c, 20, by, W - 40, bh, 'rgba(255,248,238,0.95)');
    zeilen.forEach(function (z, i) { text(c, z, W / 2, by + 9 + i * 10, i === 0 ? P.bierRot : P.uiTinte, i === 0 ? 8 : 7, 'center'); });
    var ey = by + bh + 8;
    R.treffer = [];
    var eintraege = [{ label: 'Ich bin 18+. Los geht\'s! (E / Tippen)' }, { label: 'Scooter-Playlist (P)' }];
    eintraege.forEach(function (e, i) {
      var sel = i === S.startIndex, ry = ey + i * 17, blink = sel && Math.floor(t * 2) % 2 === 0;
      pille(c, 50, ry, W - 100, 15, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2);
      text(c, e.label, W / 2, ry + 7.5, P.uiTinte, 8, 'center');
      R.treffer.push({ x: 50, y: ry, w: W - 100, h: 15, i: i });
    });
    text(c, S.best ? 'Bestwert: ' + S.best + ' Punkte' : 'Privates Spiel · nicht zum Teilen', W / 2, H - 6, '#ffe9a8', 6, 'center', P.kontur);
  }

  function endeBild(R, S) {
    var c = R.ctx, e = S.ende, sieg = e.sieg, t = S.t;
    kesselSzene(c, sieg, t);
    if (sieg) { kreis(c, W / 2, Math.round(H * 0.5) - Math.round(Math.min(1, e.t / 6) * 6), 12, '#ffe58a'); kreis(c, W / 2, Math.round(H * 0.5) - Math.round(Math.min(1, e.t / 6) * 6), 8, '#fff6c8'); }
    pille(c, 24, 8, W - 48, H - 16, 'rgba(255,248,238,0.93)');
    text(c, sieg ? 'Du stehst noch, Saufi.' : 'Press F to pay respects.', W / 2, 24, sieg ? '#2f8a4a' : P.bierRot, 13, 'center');
    text(c, sieg ? 'Sonntag, 04:00. Sonnenaufgang überm Kessel.' : e.grund, W / 2, 39, P.uiTinteWeich, 7, 'center');
    var w = e.wertung, y = 55;
    text(c, (w.medaille ? w.medaille + ': ' : '') + w.titel, W / 2, y, P.uiTinte, 11, 'center');
    text(c, 'Punkte: ' + S.punkte.punkte + (e.neuerBestwert ? '  (neuer Bestwert!)' : (S.best ? '  (Bestwert ' + S.best + ')' : '')), W / 2, y + 15, P.uiTinte, 8, 'center');
    text(c, 'Runden mitgetrunken: ' + S.runden.geschafft + ' von ' + S.runden.runden.length + ' · Team ' + S.runden.team + '/5', W / 2, y + 26, P.uiTinteWeich, 7, 'center');
    text(c, Saufi.Hinweise.DANKE, W / 2, y + 40, P.uiTinte, 8, 'center');
    R.treffer = [];
    var blink = Math.floor(t * 2) % 2 === 0;
    pille(c, 60, H - 40, W - 120, 15, blink ? '#fff3b0' : '#ffe9a8'); text(c, 'E / Tippen: Neustart', W / 2, H - 32.5, P.uiTinte, 8, 'center');
    R.treffer.push({ x: 60, y: H - 40, w: W - 120, h: 15, i: 0 });
  }

  function pressFBild(R, S) {
    var c = R.ctx, p = S.pressF, hat = p.zweitesLeben;
    c.fillStyle = 'rgba(10,6,20,0.72)'; c.fillRect(0, 0, W, H);
    text(c, 'F', W / 2, H * 0.30, '#ffffff', 46 + Math.round(Math.sin(S.t * 14) * 2), 'center', P.kontur);
    text(c, hat ? 'Press F! Steh wieder auf!' : 'Press F to pay respects', W / 2, H * 0.52, '#ffe84f', 11, 'center', P.kontur);
    if (hat) {
      text(c, 'Drück F (oder tipp) ' + p.noetig + ' Mal in 3 Sekunden: ' + p.n + '/' + p.noetig, W / 2, H * 0.62, '#ffffff', 8, 'center', P.kontur);
      r(c, W / 2 - 60, H * 0.70, 120, 7, P.kontur); r(c, W / 2 - 59, H * 0.70 + 1, Math.round(118 * Math.max(0, p.rest / 3)), 5, '#ff5f8a');
    } else {
      text(c, 'Kein zweites Leben mehr. Drück F.', W / 2, H * 0.62, '#ffffff', 8, 'center', P.kontur);
    }
  }

  function textFeld(R, titel, absaetze, fussEintraege, index) {
    var c = R.ctx, bw = W - 40, zl = [];
    absaetze.forEach(function (a) { umbruch(c, a, bw - 24, 7).forEach(function (z) { zl.push(z); }); zl.push(''); });
    var bh = 22 + zl.length * 9 + fussEintraege.length * 17 + 6, bx = 20, by = Math.round(Math.max(3, (H - bh) / 2));
    c.fillStyle = 'rgba(42,34,54,0.6)'; c.fillRect(0, 0, W, H); pille(c, bx, by, bw, bh, P.uiFlaeche);
    text(c, titel, W / 2, by + 10, P.uiTinte, 10, 'center');
    zl.forEach(function (z, i) { text(c, z, bx + 12, by + 22 + i * 9, P.uiTinte, 7); });
    R.treffer = [];
    fussEintraege.forEach(function (e, i) {
      var ey = by + 22 + zl.length * 9 + i * 17, sel = i === index;
      pille(c, bx + 40, ey, bw - 80, 15, sel ? '#ffe9a8' : P.uiFlaeche2); text(c, e.label, W / 2, ey + 7.5, P.uiTinte, 8, 'center'); R.treffer.push({ x: bx + 40, y: ey, w: bw - 80, h: 15, i: i });
    });
  }

  // Playlist-Bild: Titelliste in zwei Spalten, Status, Knoepfe
  function playlistBild(R, S) {
    var c = R.ctx, o = S.overlay, Mu = Saufi.Musik, z = S.musikInfo, rowH = R.hochkant ? 22 : 14;
    var bw = W - 24, bx = 12, tl = Mu.TITEL, zeilen = Math.ceil(tl.length / 2);
    var bh = 24 + zeilen * 9 + 4 + 3 * 9 + o.eintraege.length * rowH + 8, by = Math.round(Math.max(3, (H - bh) / 2));
    c.fillStyle = 'rgba(42,34,54,0.6)'; c.fillRect(0, 0, W, H); pille(c, bx, by, bw, bh, P.uiFlaeche);
    text(c, 'Scooter-Playlist', W / 2, by + 10, P.uiTinte, 10, 'center');
    tl.forEach(function (t2, i) { text(c, (i + 1) + '. ' + t2, bx + 10 + (i >= zeilen ? (bw - 20) / 2 : 0), by + 22 + (i % zeilen) * 9, P.uiTinte, 7); });
    var sy = by + 22 + zeilen * 9 + 4;
    var qn = { mp3: 'Eigene MP3 (music/)', youtube: 'YouTube-Einbettung', webaudio: 'Eigener Spiel-Beat' }[z.quelle] || z.quelle;
    text(c, 'Quelle: ' + qn + (z.spielt ? ' (läuft: ' + ({ mp3: 'MP3', youtube: 'YouTube', webaudio: 'Beat' }[z.aktiv]) + ')' : ''), W / 2, sy + 4, P.uiTinteWeich, 7, 'center');
    var hint = z.hinweis || (z.youtubeVerfuegbar ? 'YouTube: ' + Mu.VIDEOS.length + ' Videos (' + Mu.VIDEOS.map(function (v) { return v.titel.replace(/^Scooter - /, '').replace(/ \(Official Video( HQ)?\)/, ''); }).join(', ') + ')' : 'YouTube nur über http://localhost, nicht file://');
    umbruch(c, hint, bw - 20, 6).slice(0, 2).forEach(function (zz, i) { text(c, zz, W / 2, sy + 13 + i * 8, P.uiTinteWeich, 6, 'center'); });
    R.treffer = [];
    o.eintraege.forEach(function (e, i) {
      var ey = sy + 3 * 9 + i * rowH - 2, sel = i === o.index;
      pille(c, bx + 8, ey, bw - 16, rowH - 2, sel ? '#ffe9a8' : P.uiFlaeche2); text(c, e.label, bx + 14, ey + (rowH - 2) / 2, P.uiTinte, 8); if (e.rechts) text(c, e.rechts, bx + bw - 14, ey + (rowH - 2) / 2, P.uiTinteWeich, 7, 'right');
      R.treffer.push({ x: bx + 8, y: ey, w: bw - 16, h: rowH - 2, i: i });
    });
  }

  function uebergangBild(R, S) {
    if (S.uebergang) { var u = S.uebergang, a = u.t < u.dauer / 2 ? u.t / (u.dauer / 2) : 1 - (u.t - u.dauer / 2) / (u.dauer / 2); R.ctx.globalAlpha = Math.max(0, Math.min(1, a)); r(R.ctx, 0, 0, W, H, '#14102a'); R.ctx.globalAlpha = 1; }
  }

  // ---------- Ganzes Bild ----------
  function zeichne(R, S) {
    var c = R.ctx;
    R.treffer = [];
    if (S.zustand === 'start') { startBild(R, S); if (S.overlay && S.overlay.art === 'info') textFeld(R, 'Hinweis 18+', [Saufi.Hinweise.HINWEIS_VOLL], [{ label: 'Zurück' }], 0); if (S.overlay && S.overlay.art === 'playlist') playlistBild(R, S); return; }
    var wackel = !S.ruhig && S.fig.pegel >= 1.5, amp = Math.min(2, (S.fig.pegel - 1) * 0.8);
    S.doppelt = wackel;
    c.save();
    if (wackel) c.translate(Math.round(Math.sin(S.t * 2.1) * amp), Math.round(Math.cos(S.t * 1.7) * amp));
    zeichneWelt(R, S);
    if (wackel) {                                   // doppeltes Neon-Glimmern
      c.globalAlpha = 0.25 + Math.min(0.2, (S.fig.pegel - 1.5) * 0.1); c.globalCompositeOperation = 'lighter';
      c.drawImage(R.canvas, 3, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    c.restore();
    if (S.zustand === 'ende') { endeBild(R, S); return; }
    hud(R, S);
    if (S.zustand === 'umgefallen') pressFBild(R, S);
    if (S.overlay) {
      if (S.overlay.art === 'playlist') playlistBild(R, S);
      else if (S.overlay.art === 'info') textFeld(R, 'Hinweis 18+', [Saufi.Hinweise.HINWEIS_VOLL], [{ label: 'Zurück' }], 0);
      else zeichneListe(R, S.overlay.titel, S.overlay.kopf || [], S.overlay.eintraege, S.overlay.index, S.overlay.opt);
    }
    uebergangBild(R, S);
  }

  Saufi.Render = { P: P, K: K, erstelle: erstelle, setzeBildschirm: setzeBildschirm, zeichne: zeichne, bauplan: bauplan, figur: figur, W: BASE_W, H: BASE_H, BASE_W: BASE_W, BASE_H: BASE_H, PORT_H: PORT_H };
})(globalThis);
