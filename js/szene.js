/* Aussen-Szenerie als Vektorgrafik: Himmel nach Tageszeit, Kessel-Panorama, Boden-Kacheln, Gebaeude, Baeume, Laternen, Brunnen, Strassenbahn.
   Stuttgart ist fiktiv (keine Marken): Kessellage, Weinberghaenge, Staeffele, Funkturm in der Ferne, Halbhoehenhaeuser. Alles in logischen Koordinaten. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var G = Saufi.Gfx, P = G.P, hash = G.hash, r = G.r, rr = G.rr, box = G.box, kreis = G.kreis, ellipse = G.ellipse, poly = G.poly, linie = G.linie, vlauf = G.vlauf, text = G.text, textInBox = G.textInBox;
  var K = 16;

  function klemme(v) { return Math.max(0, Math.min(1, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------- Himmel ----------
  // Stuetzstellen: Stunde (8 = 08:00 ... 28 = Sonntag 04:00), Farbe oben, Farbe am Horizont
  var HIMMEL = [
    [8, '#8fc4ee', '#fde8c8'],      // Morgen
    [12, '#4aa3e8', '#bfe4fa'],     // Mittag
    [16, '#5ea8e6', '#f6e7c4'],     // Nachmittag
    [19, '#6a8fd0', '#ffcf9a'],     // Abend
    [20.5, '#5a4a9a', '#ff8f6a'],   // Sonnenuntergang
    [22.5, '#1c2252', '#4c4a8c'],   // Nacht
    [26, '#0a0e28', '#1c2250'],     // tiefe Nacht
    [28, '#3a3a86', '#ffa07a']      // Daemmerung vor Sonnenaufgang
  ];
  function himmelFarben(h) {
    h = Math.max(HIMMEL[0][0], Math.min(HIMMEL[HIMMEL.length - 1][0], h));
    for (var i = 0; i < HIMMEL.length - 1; i++) {
      var a = HIMMEL[i], b = HIMMEL[i + 1];
      if (h <= b[0]) { var t = (h - a[0]) / (b[0] - a[0]); return { oben: G.mischeHex(a[1], b[1], t), unten: G.mischeHex(a[2], b[2], t) }; }
    }
    return { oben: HIMMEL[HIMMEL.length - 1][1], unten: HIMMEL[HIMMEL.length - 1][2] };
  }
  // 0 = Tag, 1 = Nacht
  function nachtGrad(h) { return h >= 27.4 ? 0.65 : klemme((h - 18.8) / 3.4); }
  function sterneAlpha(h) { return klemme((h - 20.4) / 2.2) * (h > 27.5 ? 0.5 : 1); }
  // Sonne und Mond als Bogen ueber dem Himmel (u 0..1). Rueckgabe in 0..1 relativ zur Flaeche
  // Daemmerung ~28: eigener Bogen am Horizont (Tagesbogen endet sonst bei u>1.02 → null)
  function sonnenPos(h) {
    if (h >= 27.2) {
      var ud = (h - 27.2) / 1.6;
      if (ud > 1.05) return null;
      return { x: lerp(0.06, 0.22, klemme(ud)), y: 0.82 - Math.sin(Math.PI * Math.min(1, ud * 0.4)) * 0.18, daemmer: true };
    }
    var u = (h - 6) / 14.8;
    return u < -0.02 || u > 1.02 ? null : { x: lerp(0.08, 0.92, u), y: 0.78 - Math.sin(Math.PI * klemme(u)) * 0.62 };
  }
  function mondPos(h) { var u = (h - 19.5) / 10.5; return u < -0.02 || u > 1.02 ? null : { x: lerp(0.1, 0.9, u), y: 0.8 - Math.sin(Math.PI * klemme(u)) * 0.6 }; }
  // Echte Sichel als Zwei-Boegen-Pfad (keine himmelfarbene Scheibe → kein Schwarz / keine Sterne durch den Mond)
  function mondSichel(c, mx, my, mr) {
    var ox = mx + mr * 0.38, oy = my - mr * 0.12, or = mr * 0.88;
    c.beginPath();
    c.arc(mx, my, mr, -0.65 * Math.PI, 0.65 * Math.PI, false);
    c.arc(ox, oy, or, 0.55 * Math.PI, -0.55 * Math.PI, true);
    c.closePath();
    c.fillStyle = '#f4f1de'; c.fill();
  }

  function himmelZeichnen(c, x, y, w, h, stunde, t, opt) {
    opt = opt || {};
    var f = himmelFarben(stunde); vlauf(c, x, y, w, h, f.oben, f.unten);
    var sa = sterneAlpha(stunde);
    if (sa > 0.02) {
      for (var i = 0; i < 46; i++) {
        var hx = hash(i, 3), sx = x + (hx % 1000) / 1000 * w, sy = y + ((hx >> 10) % 700) / 1000 * h, tw = 0.6 + 0.4 * Math.sin((t || 0) * 2 + i);
        c.globalAlpha = sa * tw * (i % 3 === 0 ? 1 : 0.65); kreis(c, sx, sy, i % 5 === 0 ? 0.9 : 0.55, '#fffbe8');
      }
      c.globalAlpha = 1;
    }
    var sp = opt.ohneSonne ? null : sonnenPos(stunde);
    if (sp) {
      var nah = sp.daemmer ? 0.85 : klemme(1 - Math.abs(sp.y - 0.78) / 0.3), sxp = x + sp.x * w, syp = y + sp.y * h;
      var rad = Math.max(3, (sp.daemmer ? w : h) * (sp.daemmer ? 0.07 : 0.07));
      var col = sp.daemmer ? '#ffe08a' : G.mischeHex('#fff2a8', '#ff9a50', nah * 0.9);
      G.glanz(c, sxp, syp, rad * 4, 'rgba(255,230,160,0.55)', 'rgba(255,230,160,0)');
      kreis(c, sxp, syp, rad, col);
      if (sp.daemmer) { kreis(c, sxp - rad * 0.25, syp - rad * 0.25, rad * 0.35, '#fff6c8'); }
    }
    // Mond nur nachts, nicht in der Sieges-Daemmerung (Sonne uebernimmt ab ~27.2)
    var mp = mondPos(stunde);
    if (mp && stunde > 19.5 && stunde < 27.2) {
      var mx = x + mp.x * w, my = y + mp.y * h, mr = Math.max(3, h * 0.06), ma = klemme((stunde - 19.5) / 2);
      c.globalAlpha = ma; G.glanz(c, mx, my, mr * 3.5, 'rgba(220,230,255,0.4)', 'rgba(220,230,255,0)');
      mondSichel(c, mx, my, mr);
      c.globalAlpha = 1;
    }
  }

  // Funkturm-artiger Turm (fiktiv): Betonschaft, Kanzel, Antenne. x = Fusspunkt-Mitte, y = Fuss, hoehe in Pixeln
  function turm(c, x, y, hoehe, farbe, licht) {
    var k = hoehe / 40;
    poly(c, [[x - 1.6 * k, y], [x + 1.6 * k, y], [x + 0.8 * k, y - hoehe * 0.72], [x - 0.8 * k, y - hoehe * 0.72]], farbe);
    ellipse(c, x, y - hoehe * 0.74, 4.2 * k, 2.2 * k, farbe); ellipse(c, x, y - hoehe * 0.8, 3.4 * k, 1.8 * k, farbe);
    poly(c, [[x - 1.6 * k, y - hoehe * 0.8], [x + 1.6 * k, y - hoehe * 0.8], [x + 0.5 * k, y - hoehe * 0.88], [x - 0.5 * k, y - hoehe * 0.88]], farbe);
    linie(c, x, y - hoehe * 0.86, x, y - hoehe, farbe, 0.8 * k);
    if (licht) { c.globalAlpha = licht; kreis(c, x, y - hoehe, 1.1 * k, '#ff5a5a'); c.globalAlpha = 1; }
  }

  // Haeuschen fuer Panorama und Hangkulisse. lit = Fensterlicht 0..1
  function haeuschen(c, x, y, w, h, wand, dach, lit, treppe) {
    poly(c, [[x - 1.5, y], [x + w / 2, y - h * 0.5], [x + w + 1.5, y]], dach, null);
    r(c, x, y, w, h, wand);
    r(c, x, y, w, 1, 'rgba(0,0,0,0.12)');
    var n = Math.max(1, Math.floor(w / 6));
    for (var i = 0; i < n; i++) {
      var fx = x + (i + 0.5) * (w / n) - 1.2, an = lit > 0.1;
      r(c, fx, y + h * 0.35, 2.4, h * 0.4, an ? G.mischeHex('#8aa4c4', '#ffd77a', lit) : '#8aa4c4');
    }
    if (treppe) r(c, x - 1, y + h, w + 2, 1.5, 'rgba(60,40,70,0.25)');
  }

  // Kessel-Panorama fuer Start- und Endbildschirm.
  // opt: { turmMaxY, sterneMaxY, ohneSonne }
  function kesselSzene(c, W, H, stunde, t, opt) {
    opt = opt || {};
    var n = nachtGrad(stunde), tag = 1 - n;
    var himmelH = opt.sterneMaxY != null ? opt.sterneMaxY : H * 0.72;
    // Rand +2 px: keine Ebene endet vor W (weißer Strich vermeiden)
    var x0e = -2, We = W + 4;
    himmelZeichnen(c, x0e, 0, We, Math.max(H * 0.55, himmelH), stunde, t, { ohneSonne: !!opt.ohneSonne });
    var m = function (a, b) { return G.mischeHex(a, b, n); };
    function huegel(y0, amp, ph, farbe, rebenFarbe) {
      c.beginPath(); c.moveTo(x0e, H);
      for (var x = x0e; x <= W + 2; x += 6) c.lineTo(x, y0 + Math.sin((x + ph) / 46) * amp + Math.sin((x + ph) / 19) * amp * 0.35);
      c.lineTo(W + 2, H); c.closePath(); c.fillStyle = farbe; c.fill();
      if (rebenFarbe) {
        c.strokeStyle = rebenFarbe; c.lineWidth = 0.7;
        for (var k2 = 1; k2 < 5; k2++) {
          c.beginPath();
          for (var x2 = x0e; x2 <= W + 2; x2 += 6) { var yy = y0 + k2 * 4 + Math.sin((x2 + ph) / 46) * amp + Math.sin((x2 + ph) / 19) * amp * 0.35; if (x2 === x0e) c.moveTo(x2, yy); else c.lineTo(x2, yy); }
          c.stroke();
        }
      }
    }
    huegel(H * 0.52, 7, 0, m('#a9c8d8', '#27315a'), null);
    var turmFuss = H * 0.5, turmH = H * 0.3, turmX = W * 0.88;
    if (opt.turmMaxY != null) {
      c.save(); c.beginPath(); c.rect(0, 0, W, opt.turmMaxY); c.clip();
      turm(c, turmX, turmFuss, turmH, m('#9aa8be', '#1b2342'), n * 0.9);
      c.restore();
    } else turm(c, turmX, turmFuss, turmH, m('#9aa8be', '#1b2342'), n * 0.9);
    huegel(H * 0.58, 8, 90, m('#8cc27a', '#233a46'), m('#79b068', '#1d3340'));
    huegel(H * 0.67, 6, 40, m('#6fae6a', '#1b2d3a'), null);
    // Haeuser ~30 % groesser
    var by = H * 0.76, fenLit = stunde >= 19 || stunde >= 27 ? Math.max(n, 0.55) : n;
    for (var i = 0; i < 18; i++) {
      var hx = 8 + i * (W - 16) / 18, hh = Math.round((7 + (hash(i, 9) % 10)) * 1.3), hw = Math.round((8 + (hash(i, 4) % 5)) * 1.3);
      haeuschen(c, hx, by - hh + 6, hw, hh, m(i % 2 ? '#f0dcc4' : '#e8cdb0', '#1b2036'), m(i % 3 ? '#d2694f' : '#b9553f', '#22223c'), fenLit, false);
    }
    // Vordergrund ab by: Weg, Wiese, Buesche/Baeume, Zaun/Reben (keine einfarbige Flaeche > 25 % H)
    var vgH = H - by;
    vlauf(c, x0e, by, We, vgH * 0.22, m('#a8d68f', '#16222f'), m('#8fba74', '#142018'));
    // Weg-Fortsetzung vom Kessel
    var wegY = by + vgH * 0.18, wegH = Math.max(6, vgH * 0.14);
    vlauf(c, W * 0.28, wegY, W * 0.44, wegH, m('#dcb98e', '#3a3020'), m('#c79f74', '#2a2218'));
    r(c, W * 0.28, wegY, W * 0.44, 1.2, m('#e8ccaa', '#4a4030'));
    r(c, W * 0.28, wegY + wegH - 1, W * 0.44, 1, 'rgba(100,70,40,0.35)');
    // Wiesenstreifen mit zwei Gruentoenen
    vlauf(c, x0e, by + vgH * 0.32, We, vgH * 0.28, m('#96c67e', '#1a2a22'), m('#7fb678', '#101a18'));
    r(c, x0e, by + vgH * 0.55, We, vgH * 0.12, m('#6fae6a', '#15241c'));
    // Buesche/Baeume Silhouetten (deterministisch)
    for (var b = 0; b < 14; b++) {
      var bh = hash(b, 21), bx = 6 + (bh % 1000) / 1000 * (W - 20);
      var by2 = by + vgH * (0.38 + ((bh >> 8) % 40) / 200), br = 3 + (bh % 4);
      var g1 = m('#4f9058', '#0e1812'), g2 = m('#2f6a3f', '#0a120e');
      ellipse(c, bx, by2, br * 1.4, br * 0.9, b % 2 ? g1 : g2);
      if (b % 3 === 0) { r(c, bx - 0.6, by2, 1.2, br * 1.2, m('#6a4a30', '#1a1208')); ellipse(c, bx, by2 - br * 0.6, br * 1.1, br * 1.3, g1); }
    }
    // Zaun / Reben-Linie
    var zaunY = by + vgH * 0.72;
    c.strokeStyle = m('#6a4a30', '#2a1a10'); c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0e, zaunY);
    for (var zx = x0e; zx <= W + 2; zx += 10) c.lineTo(zx, zaunY + Math.sin(zx / 18) * 1.5);
    c.stroke();
    for (var z2 = 0; z2 < W; z2 += 14) {
      linie(c, z2, zaunY - 4, z2, zaunY + 3, m('#7a5a38', '#2a1a10'), 0.9);
      linie(c, z2, zaunY - 2, z2 + 14, zaunY - 2, m('#5a8a4a', '#1a2a18'), 0.7);
    }
    vlauf(c, x0e, zaunY + 4, We, H - (zaunY + 4), m('#7fb678', '#121c16'), m('#5a8a4a', '#0c1410'));
    c.globalAlpha = 0.45; r(c, x0e, by + 4, We, 2.5, m('#7fd3ec', '#243a60')); c.globalAlpha = 1;
    var gr = c.createLinearGradient(0, H * 0.45, 0, H * 0.78); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,240,225,' + (0.25 * tag + 0.06) + ')');
    c.fillStyle = gr; c.fillRect(x0e, H * 0.45, We, H * 0.33);
  }

  // Kleines Himmelsfenster fuer das HUD: Sonne, Mond, Sterne in einem Kreis
  function himmelIcon(c, cx, cy, rad, stunde, t) {
    c.save(); c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.clip();
    himmelZeichnen(c, cx - rad, cy - rad, rad * 2, rad * 2, stunde, t);
    var bergFarbe = G.mischeHex('#4f9058', '#1a2438', nachtGrad(stunde));
    c.beginPath(); c.moveTo(cx - rad, cy + rad * 0.45); c.quadraticCurveTo(cx - rad * 0.2, cy + rad * 0.05, cx + rad * 0.3, cy + rad * 0.4);
    c.quadraticCurveTo(cx + rad * 0.7, cy + rad * 0.2, cx + rad, cy + rad * 0.5); c.lineTo(cx + rad, cy + rad); c.lineTo(cx - rad, cy + rad); c.closePath(); c.fillStyle = bergFarbe; c.fill();
    c.restore();
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.lineWidth = 1; c.strokeStyle = P.kontur; c.stroke();
  }

  // ---------- Sonne und Schatten ----------
  // Schatten tagsueber: Richtung und Staerke nach Uhrzeit (kein Schatten nachts)
  function schattenFuer(S) {
    var h = S.uhr.minute / 60, sonne = S.licht ? S.licht.sonne : 1;
    var dx = Math.max(-1.2, Math.min(1.2, (h - 13.5) / 4.5)), tief = 0.55 + Math.abs(dx) * 0.5;
    var a = 0.27 * klemme(sonne * 1.15) * klemme((19.6 - h) / 1.4) * klemme((h - 7.5) / 0.7);
    return { dx: dx, lang: tief, a: Math.max(0, a) };
  }

  // ---------- Boden-Kacheln ----------
  function nbT(karte, x, y, t) { return [karte.tile(x - 1, y) === t, karte.tile(x + 1, y) === t, karte.tile(x, y - 1) === t, karte.tile(x, y + 1) === t]; }
  var GRUND = {}; GRUND[0] = 1; GRUND[1] = 1; GRUND[2] = 1; GRUND[3] = 1; GRUND[16] = 1; GRUND[17] = 1; GRUND[36] = 1; GRUND[37] = 1;
  function grundTyp(karte, x, y) {
    var T = Saufi.Karte.T, ns = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    for (var i = 0; i < ns.length; i++) { var t = karte.tile(x + ns[i][0], y + ns[i][1]); if (GRUND[t]) return t; }
    return T.GRAS;
  }

  function gras(c, sx, sy, hs) {
    var hell = (hs % 3) !== 1;
    vlauf(c, sx, sy, K, K, hell ? '#a9d790' : '#96c67e', hell ? '#9fcf86' : '#8fba74');
    for (var i = 0; i < 5; i++) {
      var hh = hash(hs, i + 11), px = sx + 1 + (hh % 14), py = sy + 3 + ((hh >> 4) % 11);
      linie(c, px, py, px + ((hh >> 8) % 3) * 0.3 - 0.2, py - 2.2 - (hh % 2), i % 2 ? P.gras2 : P.gras3, 0.55);
    }
    if (hs % 5 === 0) ellipse(c, sx + 3 + hs % 9, sy + 4 + (hs >> 3) % 8, 3.2, 1.5, 'rgba(120,180,110,0.35)');
  }
  function weg(c, sx, sy, hs) {
    r(c, sx, sy, K, K, P.weg); r(c, sx, sy, K, K, 'rgba(255,255,255,0.05)');
    r(c, sx, sy, K, 0.7, 'rgba(255,248,230,0.35)'); r(c, sx, sy + K - 0.7, K, 0.7, 'rgba(160,120,80,0.18)');
    for (var i = 0; i < 5; i++) {
      var hh = hash(hs, i + 3), px = sx + 2 + hh % 12, py = sy + 2 + (hh >> 5) % 12;
      ellipse(c, px, py, 0.9 + (hh % 3) * 0.3, 0.6, i % 2 ? P.weg2 : '#e9ccaa');
      if (i < 3) r(c, sx + 3 + (hh % 10), sy + 4 + ((hh >> 3) % 8), 2.2, 0.35, 'rgba(140,100,70,0.28)');
    }
  }
  function pflaster(c, sx, sy, hs) {
    r(c, sx, sy, K, K, '#d9c19a');
    for (var j = 0; j < 2; j++) for (var i = 0; i < 2; i++) {
      var off = j ? 4 : 0, hh = hash(hs, i + j * 3), bx = sx + i * 8 - off + (i === 0 && j ? 0 : 0);
      rr(c, sx + ((i * 8 + off) % 16) + 0.5, sy + j * 8 + 0.5, 7, 7, hh % 3 ? '#ecd9b4' : '#e3cda6', 1.6);
      if (off && i === 0) rr(c, sx + 12.5, sy + j * 8 + 0.5, 3.5, 7, '#e8d3ae', 1.2);
    }
  }
  function strasse(c, karte, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T, u = karte.tile(x, y + 1) === T.STRASSE, o = karte.tile(x, y - 1) === T.STRASSE;
    r(c, sx, sy, K, K, P.strasse);
    for (var i = 0; i < 3; i++) { var hh = hash(hs, i + 5); r(c, sx + hh % 13, sy + (hh >> 4) % 14, 2 + hh % 3, 0.6, 'rgba(90,80,120,0.18)'); }
    if (o !== u) {
      var oberKante = u;        // true: obere Strassenreihe (Bordstein oben)
      // Bordstein
      r(c, sx, oberKante ? sy : sy + K - 2.5, K, 2.5, '#d6cfe0'); r(c, sx, oberKante ? sy + 2.5 : sy + K - 2.7, K, 0.4, 'rgba(70,50,100,0.25)');
    }
    if (u && !o) {                  // obere Strassenreihe: gestrichelte Mittellinie unten
      if (x % 2 === 0) r(c, sx + 2, sy + K - 0.6, 12, 1.2, '#fff8ee');
    }
    if (!u && o) {                  // untere Reihe: Gleise
      for (var s = 0; s < 3; s++) r(c, sx + 1 + s * 5.5, sy + 4, 2.2, 8, '#8a7c6a');
      r(c, sx, sy + 5.2, K, 1.1, '#e8e4ee'); r(c, sx, sy + 9.7, K, 1.1, '#e8e4ee');
      r(c, sx, sy + 6.3, K, 0.5, 'rgba(60,50,80,0.4)'); r(c, sx, sy + 10.8, K, 0.5, 'rgba(60,50,80,0.4)');
    }
  }
  function wasser(c, sx, sy, hs) {
    vlauf(c, sx, sy, K, K, '#86d9ef', '#5bb8d8');
    r(c, sx, sy, K, 1.6, 'rgba(255,255,255,0.18)');
    r(c, sx, sy, K, 1, 'rgba(232,251,255,0.55)');                              // Schaumsaum
    if (hs % 2) ellipse(c, sx + 5 + hs % 6, sy + 8, 3, 0.7, 'rgba(255,255,255,0.45)');
  }
  function bruecke(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T;
    // Spiegelung unter der Bruecke (dunkler Streifen im Wasser)
    r(c, sx, sy + K - 3, K, 2.5, 'rgba(40,70,90,0.35)');
    r(c, sx, sy, K, K, '#b4794f');
    for (var i = 0; i < 5; i++) { r(c, sx, sy + i * 3.2, K, 0.5, 'rgba(70,40,30,0.5)'); r(c, sx, sy + i * 3.2 + 0.5, K, 0.7, 'rgba(255,230,200,0.18)'); }
    if (karte.tile(x - 1, y) !== T.BRUECKE) { r(c, sx, sy, 2.2, K, '#7a4a3a'); r(c, sx + 0.4, sy, 0.8, K, '#a8705a'); }
    if (karte.tile(x + 1, y) !== T.BRUECKE) { r(c, sx + K - 2.2, sy, 2.2, K, '#7a4a3a'); r(c, sx + K - 1.6, sy, 0.8, K, '#a8705a'); }
  }
  function mauer(c, sx, sy, hs) {
    vlauf(c, sx, sy, K, K, '#d8cde2', '#bdafcd');
    var reihen = [[0, 3], [3, 5], [8, 4], [12, 4]];
    reihen.forEach(function (re, j) {
      var offs = (hash(hs, j) % 5);
      for (var i = -1; i < 3; i++) {
        var bx = sx + offs + i * 6 + (j % 2) * 3;
        rr(c, bx + 0.3, sy + re[0] + 0.3, 5.4, re[1] - 0.6, (i + j) % 2 ? '#cdbfda' : '#d9cee4', 1.2);
      }
    });
    r(c, sx, sy, K, 1.4, 'rgba(255,255,255,0.35)'); r(c, sx, sy + K - 1, K, 1, 'rgba(70,50,100,0.25)');
  }
  function reben(c, sx, sy, hs) {
    vlauf(c, sx, sy, K, K, '#86c47e', '#75b46f');
    for (var j = 0; j < 2; j++) {
      var ry = sy + 2.5 + j * 8;
      rr(c, sx - 1, ry, K + 2, 4.2, j ? '#5d9c5c' : '#68a763', 2);
      for (var i = 0; i < 4; i++) kreis(c, sx + 1.5 + i * 4.2, ry + 1.8, 2.1, i % 2 ? '#6fae6a' : '#5a9a5e');
      r(c, sx, ry + 4.2, K, 0.6, 'rgba(60,90,60,0.35)');
      if ((hs + j) % 3 === 0) { kreis(c, sx + 3 + (hs % 8), ry + 4.6, 1, '#8a5ac8'); kreis(c, sx + 4 + (hs % 8), ry + 5.4, 0.9, '#7a4ab8'); }
    }
    r(c, sx + 2.5, sy, 0.8, 6.5, '#8a5a3a'); r(c, sx + 11.5, sy + 8, 0.8, 6.5, '#8a5a3a');
  }
  function staeffele(c, sx, sy) {
    pflaster(c, sx, sy, 3);
    for (var i = 0; i < 4; i++) {
      r(c, sx + 1, sy + i * 4, 14, 2.2, '#f6ead0'); r(c, sx + 1, sy + i * 4 + 2.2, 14, 1.4, '#b49c78'); r(c, sx + 1, sy + i * 4 + 3.6, 14, 0.5, 'rgba(60,40,60,0.3)');
    }
    r(c, sx, sy, 1.2, K, '#8a7c9c'); r(c, sx + K - 1.2, sy, 1.2, K, '#8a7c9c');   // Gelaender
  }
  function erde(c, sx, sy, hs) {
    var hell = (hs % 3) !== 2;
    vlauf(c, sx, sy, K, K, hell ? '#c4a078' : '#b89268', hell ? '#a88858' : '#987848');
    for (var i = 0; i < 6; i++) {
      var hh = hash(hs, i + 40), px = sx + 1 + hh % 14, py = sy + 1 + (hh >> 4) % 14;
      ellipse(c, px, py, 1.1 + (hh % 2) * 0.4, 0.85, 'rgba(90,60,40,0.24)');
    }
    if (hs % 4 === 0) {
      r(c, sx + 2, sy + K - 3, 10, 1.4, 'rgba(70,50,35,0.32)'); r(c, sx + 5, sy + K - 5, 8, 1.1, 'rgba(70,50,35,0.26)');
    }
  }
  function huegel(c, sx, sy, hs) {
    erde(c, sx, sy, hs);
    poly(c, [[sx, sy + K], [sx, sy + 1.5], [sx + K, sy + K - 3.5], [sx + K, sy + K]], 'rgba(255,248,235,0.14)');
    poly(c, [[sx, sy + K], [sx + K - 1, sy + 5], [sx + K, sy + K]], 'rgba(35,28,22,0.32)');
    linie(c, sx + 0.5, sy + 2.5, sx + K - 1, sy + K - 4.5, 'rgba(85,65,45,0.5)', 0.85);
    if (hs % 2 === 0) ellipse(c, sx + 5, sy + 6, 2.8, 1.3, 'rgba(105,80,55,0.28)');
  }
  function tribueeneBoden(c, sx, sy, hs) {
    pflaster(c, sx, sy, hs);
    for (var i = 0; i < 3; i++) {
      var by = sy + 2.5 + i * 4.2;
      r(c, sx + 1, by, K - 2, 2.6, hash(hs, i) % 2 ? '#9a7656' : '#8a6a4a');
      r(c, sx + 1, by + 2.4, K - 2, 0.45, 'rgba(50,35,25,0.38)');
    }
  }
  function absperrung(c, sx, sy, hs) {
    pflaster(c, sx, sy, hs);
    [sx + 2.5, sx + K - 5].forEach(function (px) {
      rr(c, px, sy + 1.5, 2.4, K - 2.5, '#9a9a9a', 0.5, '#5a5a5a', 0.55);
      kreis(c, px + 1.2, sy + 2.2, 0.9, '#b8b8b8', '#666', 0.4);
    });
    for (var s = 0; s < 4; s++) {
      var ty = sy + 4.5 + s * 2.2, col = s % 2 ? '#f0d020' : '#2a2a2a';
      linie(c, sx + 1, ty, sx + K - 1, ty, col, 1.1);
    }
    linie(c, sx + 1, sy + 4, sx + K - 1, sy + K - 2, 'rgba(240,208,32,0.35)', 0.6);
  }
  function stadtNachbar(karte, x, y) {
    var T = Saufi.Karte.T, ns = [[-1, 0], [1, 0], [0, -1], [0, 1]], i, t;
    for (i = 0; i < ns.length; i++) {
      t = karte.tile(x + ns[i][0], y + ns[i][1]);
      if (t === T.GEHWEG || t === T.ASPHALT || t === T.HAUS) return true;
    }
    return false;
  }
  function gehweg(c, karte, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T;
    r(c, sx, sy, K, K, '#c9c4cf');
    rr(c, sx + 0.6, sy + 0.6, 7, 7, (hs % 2) ? '#d4d0da' : '#c4bfcb', 0.6);
    rr(c, sx + 8.6, sy + 0.6, 7, 7, (hs % 3) ? '#d0ccd6' : '#c2bdc8', 0.6);
    rr(c, sx + 0.6, sy + 8.6, 7, 7, (hs % 5) ? '#cec9d4' : '#bfbac6', 0.6);
    rr(c, sx + 8.6, sy + 8.6, 7, 7, (hs % 4) ? '#d2ced8' : '#c6c1cc', 0.6);
    r(c, sx + 7.6, sy, 0.8, K, '#a9a3b3');
    r(c, sx, sy + 7.6, K, 0.8, '#a9a3b3');
    if (karte.tile(x - 1, y) === T.ASPHALT || karte.tile(x - 1, y) === T.STRASSE) r(c, sx, sy, 1.5, K, '#e2dde8');
    if (karte.tile(x + 1, y) === T.ASPHALT || karte.tile(x + 1, y) === T.STRASSE) r(c, sx + K - 1.5, sy, 1.5, K, '#e2dde8');
    if (karte.tile(x, y - 1) === T.ASPHALT || karte.tile(x, y - 1) === T.STRASSE) r(c, sx, sy, K, 1.5, '#e2dde8');
    if (karte.tile(x, y + 1) === T.ASPHALT || karte.tile(x, y + 1) === T.STRASSE) r(c, sx, sy + K - 1.5, K, 1.5, '#e2dde8');
    if (hs % 5 === 0) ellipse(c, sx + 3 + (hs % 7), sy + 4 + ((hs >> 3) % 6), 1.3, 0.7, 'rgba(180,90,120,0.55)');
    if (hs % 8 === 3) linie(c, sx + 9, sy + 11, sx + 12, sy + 12.2, '#d8d0c0', 0.7);
  }
  function asphalt(c, sx, sy, hs) {
    var i, hh;
    r(c, sx, sy, K, K, (hs % 3 === 1) ? '#615c70' : '#6a6578');
    for (i = 0; i < 7; i++) {
      hh = hash(hs, i + 21);
      r(c, sx + (hh % 14), sy + ((hh >> 4) % 14), 1.1, 0.7, 'rgba(255,255,255,0.07)');
    }
    if (hs % 11 === 0) {
      kreis(c, sx + 8, sy + 8, 3.1, '#4e4a58', '#2c2834', 0.7);
      kreis(c, sx + 8, sy + 8, 1.2, '#3a3644');
    }
    if (hs % 7 === 0) kreis(c, sx + 3 + (hs % 8), sy + 12, 1.15, '#e8c46a', '#8a7040', 0.4);
  }
  function hausKachel(c, karte, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T;
    if (karte.tile(x, y + 1) === T.HAUS) {
      var dh = hash(x >> 2, y >> 2), schiefer = (dh % 2) === 0, i;
      r(c, sx, sy, K, K, schiefer ? '#5a5468' : '#a85a48');
      linie(c, sx + 1, sy + 3, sx + K - 1, sy + 3, schiefer ? '#c9c4d2' : '#f0d2c4', 1.1);
      for (i = 0; i < 4; i++) linie(c, sx, sy + 5 + i * 2.6, sx + K, sy + 5 + i * 2.6, 'rgba(30,20,30,0.22)', 0.6);
      return;
    }
    var putze = ['#e8dccb', '#d9c7b0', '#c9d0dc'];
    r(c, sx, sy, K, K, putze[hs % 3]);
    r(c, sx, sy + K - 2.6, K, 2.6, '#6a5a4a');
    rr(c, sx + 1.2, sy + 3, 4, 5, '#9ec4dc', 0.4, '#5a5048', 0.45);
    rr(c, sx + 10.2, sy + 3, 4, 5, '#9ec4dc', 0.4, '#5a5048', 0.45);
    r(c, sx + 3, sy + 3, 0.4, 5, 'rgba(40,30,40,0.35)');
    r(c, sx + 12, sy + 3, 0.4, 5, 'rgba(40,30,40,0.35)');
    if (hs % 5 === 0) {
      rr(c, sx + 6, sy + K - 8.2, 4, 5.6, '#4a3428', 0.5, '#2a1c16', 0.5);
      kreis(c, sx + 9.2, sy + K - 5.4, 0.35, '#e8c46a');
    }
  }
  function stadtDeko(c, karte) {
    var T = Saufi.Karte.T, x, y, t, hs, sx, sy, tags = ['P11', 'S21?', 'KESSEL'];
    for (y = 0; y < karte.h; y++) for (x = 0; x < karte.w; x++) {
      t = karte.tile(x, y);
      if (t !== T.GEHWEG && t !== T.ASPHALT && t !== T.HAUS) continue;
      hs = hash(x, y); sx = x * K; sy = y * K;
      if (t !== T.HAUS && hs % 17 === 0) ellipse(c, sx + 8, sy + 10, 4.2, 1.5, 'rgba(90,110,130,0.38)');
      if (t !== T.HAUS && hs % 13 === 2) kreis(c, sx + 4 + (hs % 7), sy + 12, 1, '#e8c46a');
      if (t !== T.HAUS && hs % 19 === 4) linie(c, sx + 6, sy + 7, sx + 9, sy + 8, '#d8d0c0', 0.6);
      if (t === T.HAUS && karte.tile(x, y + 1) !== T.HAUS && hs % 9 === 0) {
        textInBox(c, tags[hs % 3], sx + 0.5, sy + 8.5, 15, 6, 4.5, { col: '#6a3a58', ausr: 'center', min: 4, maxZeilen: 1 });
      }
    }
  }
  function bodenKachel(c, karte, typ, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T;
    if (typ === T.GEHWEG) gehweg(c, karte, x, y, sx, sy, hs);
    else if (typ === T.ASPHALT) asphalt(c, sx, sy, hs);
    else if (typ === T.WEG && karte.urban && stadtNachbar(karte, x, y)) gehweg(c, karte, x, y, sx, sy, hs);
    else if (typ === T.WEG) weg(c, sx, sy, hs);
    else if (typ === T.PFLASTER) pflaster(c, sx, sy, hs);
    else if (typ === T.STRASSE) strasse(c, karte, x, y, sx, sy, hs);
    else gras(c, sx, sy, hs);
  }

  function zeichneAussenKachel(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, t = karte.tile(x, y), hs = hash(x, y);
    if (t === T.GRAS || t === T.WEG || t === T.PFLASTER || t === T.STRASSE || t === T.GEHWEG || t === T.ASPHALT) bodenKachel(c, karte, t, x, y, sx, sy, hs);
    else if (t === T.HAUS) hausKachel(c, karte, x, y, sx, sy, hs);
    else if (t === T.WASSER) wasser(c, sx, sy, hs);
    else if (t === T.BRUECKE) { wasser(c, sx, sy, hs); bruecke(c, karte, x, y, sx, sy); }
    else if (t === T.MAUER) mauer(c, sx, sy, hs);
    else if (t === T.REBEN) reben(c, sx, sy, hs);
    else if (t === T.STAEFFELE) staeffele(c, sx, sy);
    else if (t === T.ERDE) erde(c, sx, sy, hs);
    else if (t === T.HUEGEL) huegel(c, sx, sy, hs);
    else if (t === T.TRIBUENE) tribueeneBoden(c, sx, sy, hs);
    else if (t === T.ABSPERR) absperrung(c, sx, sy, hs);
    else if (t === T.BAUZAUN) bauzaun(c, sx, sy, hs);
    else if (t === T.BAUGRUBE) baugrube(c, sx, sy, hs);
    else bodenKachel(c, karte, t === T.BRUNNEN || t === T.BANK ? T.PFLASTER : (t === T.LATERNE || t === T.BAUM || t === T.BUSCH ? grundTyp(karte, x, y) : T.GRAS), x, y, sx, sy, hs);
  }
  function bauzaun(c, sx, sy, hs) {
    gras(c, sx, sy, hs);
    // Fuss
    r(c, sx + 1, sy + K - 3, K - 2, 2.2, '#6a6a72');
    // Gitterpaneele orange-weiss
    for (var i = 0; i < 3; i++) {
      var px = sx + 1 + i * 5, col = i % 2 ? '#f4a020' : '#f4f4f0';
      rr(c, px, sy + 2, 4.5, K - 5.5, col, 0.6, '#5a5a60', 0.5);
      for (var g = 0; g < 3; g++) {
        linie(c, px + 0.6, sy + 3.5 + g * 3.2, px + 3.9, sy + 3.5 + g * 3.2, 'rgba(40,40,50,0.35)', 0.6);
        linie(c, px + 1.2 + g, sy + 2.5, px + 1.2 + g, sy + K - 4, 'rgba(40,40,50,0.3)', 0.5);
      }
    }
  }
  function baugrube(c, sx, sy, hs) {
    vlauf(c, sx, sy, K, K, '#8a8a90', '#6e6e78');
    // Betonplatten
    r(c, sx + 1, sy + 1, 6, 5, '#9a9aa2'); r(c, sx + 8, sy + 7, 6, 5, '#94949c');
    // Pfuetzen
    ellipse(c, sx + 5 + (hs % 3), sy + 10, 3.2, 1.4, 'rgba(70,110,150,0.45)');
    // Bewehrung
    for (var i = 0; i < 3; i++) {
      linie(c, sx + 2 + i * 4, sy + 3, sx + 3 + i * 4, sy + 13, '#c07040', 0.9);
      linie(c, sx + 1, sy + 4 + i * 3.5, sx + K - 1, sy + 5 + i * 3.5, '#b86838', 0.7);
    }
  }

  // Hang: Licht von oben, Dunst, Halbhoehenhaeuser und Funkturm auf dem Kamm (nur Optik auf den gesperrten Reben-Kacheln)
  var KULISSEN = [[10.2, 1.2, 2.6, 0], [13.6, 0.5, 2.1, 1], [23.2, 1.0, 3.0, 2], [27.0, 1.6, 2.2, 3], [16.2, 2.2, 2.0, 4]];
  function hangKulisse(c, karte) {
    // Hangschattierung: oben leicht heller und dunstig
    var gr = c.createLinearGradient(0, 0, 0, 5 * K); gr.addColorStop(0, 'rgba(235,245,255,0.38)'); gr.addColorStop(1, 'rgba(235,245,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, karte.pxW, 5 * K);
    turm(c, 20.4 * K, 2.3 * K, 2.3 * K, 'rgba(120,132,160,0.85)', 0);
    KULISSEN.forEach(function (k) {
      var x = k[0] * K, y = k[1] * K, w = k[2] * K, h = 17 + (k[3] % 2) * 5;
      rr(c, x - 3, y + h - 1, w + 6, 8, '#cabfda', 1.5, 'rgba(110,95,140,0.6)', 0.5);    // Stuetzmauer
      for (var i = 0; i < 4; i++) r(c, x - 2 + i * (w + 4) / 4, y + h + 1, 0.5, 5, 'rgba(110,95,140,0.35)');
      ellipse(c, x + w / 2, y + h + 7.5, w * 0.6, 2, 'rgba(60,70,50,0.25)');
      var wand = k[3] % 2 ? '#fff0da' : '#f7e3c6', dach = k[3] % 3 ? '#e07a58' : '#c8604a';
      haeuschen(c, x, y + 4, w, h - 4, wand, dach, 0, false);
      r(c, x + w * 0.45, y + h - 7, 4, 7, '#8a5a3a');                        // Tuer
      r(c, x + w - 8, y - 6, 2.2, 5, '#9a8aa8');                              // Schornstein
      rr(c, x + 2, y + h - 4, w - 4, 2, '#e8a0b0', 1);                        // Blumenkasten
    });
  }
  // Tupfer im Gras (Blumen) — Cluster statt gleichmaessiger Streuung
  function blumen(c, karte) {
    karte.deco.forEach(function (d) {
      linie(c, d.x, d.y + 1, d.x, d.y + 3, '#5f9e64', 0.5);
      for (var i = 0; i < 5; i++) { var a = i * 1.2566; kreis(c, d.x + Math.cos(a) * 0.9, d.y + Math.sin(a) * 0.9, 0.7, d.farbe); }
      kreis(c, d.x, d.y, 0.55, '#ffcf40');
      // kleiner Nachbar-Tupfer (Cluster)
      if ((hash(d.x | 0, d.y | 0) % 3) === 0) {
        var ox = 3 + (hash(d.x | 0, 2) % 4), oy = 1 + (hash(d.y | 0, 3) % 3);
        kreis(c, d.x + ox, d.y + oy, 0.7, d.farbe); kreis(c, d.x + ox, d.y + oy, 0.4, '#ffcf40');
      }
    });
  }

  // ---------- Gebaeude ----------
  // Plan in Weltpixeln: Fenster (leuchten nachts), Neon, Tuer
  function bauplan(b) {
    var x0 = b.x * K, y0 = b.y * K, w = b.w * K, h = b.h * K, tx = b.tuer.x * K, ty = b.tuer.y * K;
    var plan = { x0: x0, y0: y0, w: w, h: h, tuer: { x: tx, y: ty, w: K, h: K }, fenster: [], neon: [], schild: { x: x0 + w / 2, y: y0 + 21 }, schildHaupt: null, schildNeben: null, npcZone: null };
    var i;
    if (b.id === 'hotel') {
      for (i = 0; i < 4; i++) { plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 28, w: 12, h: 13 }); plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 50, w: 12, h: 13 }); }
      // Zwischen Fensterreihen auf dem Gesims (volle Breite, 1 Zeile ≥ 5,5 px) — Quelle fuer Zeichnung
      // ≥ 7 CSS-px im Hoch nicht erreichbar ohne Fenster-Overlap → Text „Kehrwoche“
      plan.schildNeben = { x: x0 + (w - 56) / 2, y: y0 + 42.3, w: 56, h: 6.4, text: 'Kehrwoche' };
      plan.schildHaupt = { x: x0 + w / 2, y: y0 + 14, w: Math.min(w - 8, 112), h: 14, text: 'JAZ' };
    } else if (b.id === 'restaurant') {
      for (i = 0; i < 3; i++) plan.fenster.push({ x: x0 + 8 + i * 34 + (i > 0 ? 10 : 0), y: y0 + 30, w: 14, h: 14 });
      plan.fenster.push({ x: x0 + 8, y: y0 + 54, w: 14, h: 14 }); plan.fenster.push({ x: x0 + w - 24, y: y0 + 54, w: 14, h: 14 });
      plan.schildHaupt = { x: x0 + w / 2, y: y0 + 14, w: Math.min(w - 8, 108), h: 14, text: 'GASTHAUS MAULTÄSCHLE' };
    } else if (b.id === 'kneipe') {
      plan.fenster.push({ x: x0 + 8, y: y0 + 28, w: 22, h: 18 }); plan.fenster.push({ x: x0 + w - 30, y: y0 + 28, w: 22, h: 18 });
      plan.neon.push({ x: x0 + w / 2 - 18, y: y0 + 16, w: 36, h: 4, farbe: P.neonGelb });
      // Feinstaub auf Markisen-Band (oben); NPC-Schlange vor der Tuer (unter Markise) — kein Overlap
      plan.schildNeben = { x: x0 + w / 2 - 30, y: y0 + 38, w: 60, h: 10, text: 'Feinstaub drin' };
      plan.schildHaupt = { x: x0 + w / 2, y: y0 + 8, w: Math.min(w - 8, 108), h: 14, text: 'SOPHIES BRAUHAUS' };
      plan.npcZone = { x: tx - 24, y: Math.max(ty + 2, plan.schildNeben.y + plan.schildNeben.h + 2), w: K + 48, h: K + 14 };
    } else if (b.id === 'disko') {
      plan.neon.push({ x: x0 + 8, y: y0 + 18, w: w - 16, h: 3, farbe: P.neonPink });
      plan.neon.push({ x: x0 + 8, y: y0 + 24, w: w - 16, h: 2, farbe: P.neonCyan });
      plan.neon.push({ x: x0 + 10, y: y0 + h - 2, w: w - 20, h: 2, farbe: P.neonLila });
      plan.fenster.push({ x: x0 + 12, y: y0 + 34, w: 10, h: 18 }); plan.fenster.push({ x: x0 + w - 22, y: y0 + 34, w: 10, h: 18 });
      plan.schildHaupt = { x: x0 + w / 2, y: y0 - 1, w: w - 12, h: 12, text: 'UNTERGRUND 07' };
    }
    // Alias: Tests/Nacht lesen schild; Werte so, dass Tag = Nacht (Oberkante)
    if (plan.schildHaupt) plan.schild = { x: plan.schildHaupt.x, y: plan.schildHaupt.y };
    return plan;
  }

  function fensterV(c, f, glas, laden, kasten) {
    rr(c, f.x - 1.2, f.y - 1.2, f.w + 2.4, f.h + 2.4, '#fff8ee', 1.6, P.konturStein, 0.7);
    vlauf(c, f.x, f.y, f.w, f.h, glas || '#b8e2f8', glas ? glas : '#8ccaec');
    c.beginPath(); c.moveTo(f.x + 1, f.y + f.h - 1); c.lineTo(f.x + f.w * 0.55, f.y + 1); c.lineTo(f.x + f.w * 0.8, f.y + 1); c.lineTo(f.x + 2.5, f.y + f.h - 1); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
    r(c, f.x + f.w / 2 - 0.35, f.y, 0.7, f.h, '#fff8ee'); r(c, f.x, f.y + f.h * 0.45, f.w, 0.7, '#fff8ee');
    if (laden) { rr(c, f.x - 4.2, f.y - 1, 3.2, f.h + 2, laden, 0.8, 'rgba(60,50,80,0.5)', 0.4); rr(c, f.x + f.w + 1, f.y - 1, 3.2, f.h + 2, laden, 0.8, 'rgba(60,50,80,0.5)', 0.4); }
    if (kasten) {
      rr(c, f.x - 1.5, f.y + f.h + 1, f.w + 3, 3.2, '#8a5a3a', 0.8);
      for (var i = 0; i < 4; i++) kreis(c, f.x + 0.5 + i * (f.w - 1) / 3, f.y + f.h + 0.9, 1.3, i % 2 ? '#ff7aa0' : '#ffd36e');
      kreis(c, f.x + f.w / 2, f.y + f.h + 0.6, 1.1, '#5f9e64');
    }
  }
  function dachziegel(c, x, y, w, h, farbe, farbe2, schraeg) {
    var rows = Math.floor(h / 4);
    for (var j = 0; j < rows; j++) {
      var yy = y + j * 4, inset = schraeg ? (rows - j) * 0 : 0;
      r(c, x + inset, yy + 3, w - inset * 2, 1, farbe2);
      for (var i = 0; i < w / 6; i++) { var xx = x + (j % 2 ? 3 : 0) + i * 6; if (xx + 0.5 < x + w) r(c, xx, yy, 0.5, 3, 'rgba(0,0,0,0.12)'); }
    }
  }
  function schild(c, cx, y, w, h, hinten, vorn, s, size) {
    rr(c, cx - w / 2, y, w, h, hinten, 2.5, 'rgba(30,20,40,0.7)', 0.7);
    // Weicher Innenschatten am Schildrand
    c.globalAlpha = 0.18; rr(c, cx - w / 2 + 0.6, y + 0.5, w - 1.2, 1.4, '#ffffff', 1.2); c.globalAlpha = 1;
    textInBox(c, s, cx - w / 2 + 2, y + 1, w - 4, h - 2, size || 9, { col: vorn, ausr: 'center', min: 6 });
  }
  function schildGeb(c, cx, y, w, h, hinten, vorn, s, size, rand) { rr(c, cx - w / 2 - 1, y - 1, w + 2, h + 2, rand, 3); schild(c, cx, y, w, h, hinten, vorn, s, size); }

  function hotelFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 14, w, h - 14, '#fff8ea', '#ebd2b4');
    // Weiche Seitenverschattung
    var sg = c.createLinearGradient(x0, 0, x0 + 10, 0); sg.addColorStop(0, 'rgba(120,90,70,0.22)'); sg.addColorStop(1, 'rgba(120,90,70,0)');
    c.fillStyle = sg; c.fillRect(x0, y0 + 14, 10, h - 14);
    var sg2 = c.createLinearGradient(x0 + w, 0, x0 + w - 10, 0); sg2.addColorStop(0, 'rgba(120,90,70,0.18)'); sg2.addColorStop(1, 'rgba(120,90,70,0)');
    c.fillStyle = sg2; c.fillRect(x0 + w - 10, y0 + 14, 10, h - 14);
    r(c, x0, y0 + 43, w, 2, '#e5cfaa'); r(c, x0, y0 + 43, w, 0.6, 'rgba(255,255,255,0.7)');          // Gesims
    // Dach (Walmdach) mit Gauben + weicher Dachschatten
    c.globalAlpha = 0.2; ellipse(c, x0 + w / 2, y0 + 18, w * 0.48, 3.2, 'rgba(60,40,80,0.5)'); c.globalAlpha = 1;
    poly(c, [[x0 - 5, y0 + 17], [x0 + 10, y0 - 9], [x0 + w - 10, y0 - 9], [x0 + w + 5, y0 + 17]], P.dach, P.konturDach, 0.9);
    dachziegel(c, x0 - 1, y0 - 8, w + 2, 22, P.dach, P.dach2, false);
    poly(c, [[x0 - 5, y0 + 17], [x0 + w + 5, y0 + 17], [x0 + w + 5, y0 + 15], [x0 - 5, y0 + 15]], P.dach2);
    [x0 + 24, x0 + w - 40].forEach(function (gx) {
      poly(c, [[gx - 1, y0 + 6], [gx + 8, y0 - 6], [gx + 17, y0 + 6]], '#e87a5c', P.konturDach, 0.7);
      fensterV(c, { x: gx + 3, y: y0 + 0, w: 10, h: 8 }, '#9fd4f0');
    });
    r(c, x0 + w - 36, y0 - 18, 5, 13, '#b9553f'); r(c, x0 + w - 37, y0 - 19, 7, 2, '#8a3a2e');         // Schornstein
    // Fahne
    r(c, x0 + w - 18, y0 - 20, 1, 12, '#8a7c9c'); poly(c, [[x0 + w - 17, y0 - 20], [x0 + w - 6, y0 - 17], [x0 + w - 17, y0 - 13]], '#ff6f91');
    // Fenster mit Laeden und Balkonkaesten
    p.fenster.forEach(function (f, k) { fensterV(c, f, null, '#8fc8a8', k % 2 === 1); });
    // Eingangsvordach
    var d = p.tuer;
    rr(c, d.x - 8, d.y - 10, d.w + 16, 7, '#2e3f7a', 2, 'rgba(20,20,60,0.8)', 0.7);
    for (i = 0; i < 6; i++) r(c, d.x - 8 + i * 4.0 + 1, d.y - 10, 2, 7, 'rgba(255,255,255,0.18)');
    for (i = 0; i < 9; i++) kreis(c, d.x - 6 + i * 3.5, d.y - 3, 1.6, '#2e3f7a');
    var shH = p.schildHaupt; schildGeb(c, shH.x, shH.y, shH.w, shH.h, '#2e3f7a', '#ffe9a8', shH.text, 11, '#d9b86a');
    r(c, x0 - 1, y0 + 17, w + 2, 1, 'rgba(60,40,80,0.35)');                       // Dachrinne
    // Gesims-Band: Koordinaten aus plan.schildNeben (eine Quelle)
    var hotelSchild = p.schildNeben;
    if (hotelSchild) {
      rr(c, hotelSchild.x, hotelSchild.y, hotelSchild.w, hotelSchild.h, '#fff8ee', 2, 'rgba(30,20,40,0.7)', 0.6);
      textInBox(c, hotelSchild.text, hotelSchild.x + 1, hotelSchild.y + 0.3, hotelSchild.w - 2, hotelSchild.h - 0.6, 5.5, { col: '#6a3f2a', ausr: 'center', min: 5.5, maxZeilen: 1 });
    }
  }
  function restaurantFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 14, w, h - 14, '#faf0d4', '#e6cba4');
    var sg = c.createLinearGradient(x0, 0, x0 + 8, 0); sg.addColorStop(0, 'rgba(100,70,40,0.18)'); sg.addColorStop(1, 'rgba(100,70,40,0)');
    c.fillStyle = sg; c.fillRect(x0, y0 + 14, 8, h - 14);
    c.globalAlpha = 0.18; ellipse(c, x0 + w / 2, y0 + 18, w * 0.46, 2.8, 'rgba(60,40,80,0.45)'); c.globalAlpha = 1;
    // Fachwerk
    var holz = '#7a4a34';
    for (i = 0; i < 4; i++) r(c, x0 + 3 + i * 34, y0 + 16, 3, h - 16, holz);
    r(c, x0, y0 + 26, w, 2.4, holz); r(c, x0, y0 + 46, w, 2.6, holz); r(c, x0, y0 + h - 3, w, 3, '#5a3a2a');
    for (i = 0; i < 3; i++) { linie(c, x0 + 6 + i * 34, y0 + 28, x0 + 37 + i * 34, y0 + 46, holz, 1.4); }
    // Dach
    poly(c, [[x0 - 5, y0 + 17], [x0 + 6, y0 - 9], [x0 + w - 6, y0 - 9], [x0 + w + 5, y0 + 17]], P.dach2, '#8a3a2e', 0.9);
    dachziegel(c, x0 - 1, y0 - 8, w + 2, 22, P.dach2, '#b9553f', false);
    r(c, x0 - 5, y0 + 15, w + 10, 2.4, '#7a2a24');
    r(c, x0 - 1, y0 + 17, w + 2, 1, 'rgba(60,40,80,0.35)');                       // Dachrinne
    r(c, x0 + 14, y0 - 17, 6, 12, '#b9553f'); r(c, x0 + 13, y0 - 18, 8, 2, '#8a3a2e');
    p.fenster.forEach(function (f, k) { fensterV(c, f, null, k % 2 ? '#e0504a' : '#fff8ee', f.y > 50 || k === 1); });
    // Haengeschild, Tonnen, Laterne
    r(c, x0 + w - 14, y0 + 33, 12, 1.4, '#3a2a30'); rr(c, x0 + w - 9, y0 + 34.5, 8, 6, '#ffd36e', 1.4, '#7a4a34', 0.6); kreis(c, x0 + w - 5, y0 + 37.5, 1.8, '#c8864a');
    var d = p.tuer;
    [d.x - 14, d.x + d.w + 3].forEach(function (bx, i2) { ellipse(c, bx + 5, d.y + 15, 6, 2, 'rgba(60,40,50,0.25)'); rr(c, bx, d.y + 5, 10, 10, '#b97a4a', 3, '#6a3f2a', 0.7); r(c, bx + 0.5, d.y + 8, 9, 0.8, '#6a3f2a'); r(c, bx + 0.5, d.y + 12, 9, 0.8, '#6a3f2a'); if (i2) kreis(c, bx + 5, d.y + 4.6, 3, '#6fae6a'); });
    var shR = p.schildHaupt; schildGeb(c, shR.x, shR.y, shR.w, shR.h, '#6a3f2a', '#ffe9a8', shR.text, 11, '#d9b86a');
    schild(c, x0 + w - 28, y0 + 50, 40, 10, '#ffd36e', '#6a3f2a', 'Spätzle!', 7);
  }
  function kneipeFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i, j;
    vlauf(c, x0, y0 + 10, w, h - 10, '#d07858', '#b45a42');
    for (j = 0; j < 8; j++) {
      r(c, x0, y0 + 12 + j * 6.5, w, 0.6, 'rgba(90,40,30,0.35)');
      for (i = 0; i < w / 10; i++) r(c, x0 + (j % 2 ? 5 : 0) + i * 10, y0 + 12 + j * 6.5, 0.6, 6.5, 'rgba(90,40,30,0.28)');
    }
    r(c, x0, y0 + 10, w, 2, 'rgba(255,255,255,0.18)');
    var sg = c.createLinearGradient(x0 + w, 0, x0 + w - 10, 0); sg.addColorStop(0, 'rgba(60,30,40,0.2)'); sg.addColorStop(1, 'rgba(60,30,40,0)');
    c.fillStyle = sg; c.fillRect(x0 + w - 10, y0 + 10, 10, h - 10);
    rr(c, x0 - 3, y0 - 8, w + 6, 20, '#5c4a6e', 3, P.kontur, 0.9);       // Flachdach-Blende
    r(c, x0 - 3, y0 - 8, w + 6, 3, '#7a6690');
    dachziegel(c, x0 - 1, y0 - 6, w + 2, 14, '#5c4a6e', '#4a3a5e', false);
    for (i = 0; i < 6; i++) r(c, x0 + 6 + i * 18, y0 - 4, 10, 1, 'rgba(255,255,255,0.14)');
    p.fenster.forEach(function (f) {
      rr(c, f.x - 1.4, f.y - 1.4, f.w + 2.8, f.h + 2.8, '#5a3a2a', 4, '#3a2a30', 0.7);
      vlauf(c, f.x, f.y, f.w, f.h, '#ffd89a', '#d89a56');
      r(c, f.x + f.w / 2 - 0.4, f.y, 0.8, f.h, '#5a3a2a');
      ellipse(c, f.x + f.w * 0.3, f.y + f.h - 4, 3, 2.6, 'rgba(255,255,255,0.7)'); rr(c, f.x + f.w * 0.62, f.y + f.h - 7, 4, 6, '#ffc233', 1);
    });
    // gestreifte Markise
    var d = p.tuer, my = y0 + 47;
    for (i = 0; i < 8; i++) {
      var ax = x0 + 4 + i * 13;
      poly(c, [[ax, my - 4], [ax + 13, my - 4], [ax + 14, my + 3], [ax - 1, my + 3]], i % 2 ? '#fff8ee' : '#3f9a5e');
      c.beginPath(); c.arc(ax + 6.5, my + 3, 7, 0, Math.PI); c.fillStyle = i % 2 ? '#fff8ee' : '#3f9a5e'; c.fill();
    }
    r(c, x0 + 3, my - 5, w - 6, 1.6, '#2f6a3f');
    // Bierkrug-Emblem (Kreis mit Krug und Hopfen)
    var sx = x0 + w - 12, sy = y0 + 34;
    r(c, sx - 7, sy - 8, 7, 1.2, '#3a2a30'); kreis(c, sx, sy, 6, '#f4f1ee', '#3a2a30', 0.8);
    rr(c, sx - 2.1, sy - 0.8, 4.2, 5.2, '#c8864a', 1.1, '#3a2a30', 0.45);
    r(c, sx - 1.8, sy - 0.8, 3.6, 1.1, '#fff8ee');
    poly(c, [[sx + 2.1, sy + 0.2], [sx + 4.2, sy + 0.6], [sx + 4.1, sy + 3.2], [sx + 2.1, sy + 2.8]], '#b87840', '#3a2a30', 0.45);
    poly(c, [[sx - 1.2, sy - 3.8], [sx, sy - 5.2], [sx + 1.2, sy - 3.8], [sx + 0.4, sy - 2.2], [sx - 0.4, sy - 2.2]], '#6fae6a');
    linie(c, sx - 0.3, sy - 4.6, sx + 0.3, sy - 2.5, '#5a9a5e', 0.55);
    // Kreidetafel
    rr(c, d.x + d.w + 4, d.y + 3, 9, 12, '#3a3a40', 1, '#8a5a3a', 0.9); linie(c, d.x + d.w + 6, d.y + 7, d.x + d.w + 11, d.y + 7, '#fff8ee', 0.5); linie(c, d.x + d.w + 6, d.y + 10, d.x + d.w + 10, d.y + 10, '#fff8ee', 0.5);
    var shK = p.schildHaupt; schildGeb(c, shK.x, shK.y, shK.w, shK.h, '#2f6a3f', '#ffe9a8', shK.text, 11, '#d9b86a');
    // Bandstreifen: Koordinaten aus plan.schildNeben
    var kneipeSchild = p.schildNeben;
    if (kneipeSchild) schild(c, kneipeSchild.x + kneipeSchild.w / 2, kneipeSchild.y, kneipeSchild.w, kneipeSchild.h, '#2a2a30', '#fff8ee', kneipeSchild.text, 7);
  }
  function diskoFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 10, w, h - 10, '#40346a', '#2e2450');
    for (i = 0; i < 6; i++) r(c, x0 + 3, y0 + 14 + i * 8, w - 6, 0.5, 'rgba(255,255,255,0.08)');
    rr(c, x0 - 3, y0 - 8, w + 6, 20, '#2a2342', 3, P.kontur, 0.9);
    r(c, x0 - 3, y0 - 8, w + 6, 2.5, '#4a3d72');
    dachziegel(c, x0 - 1, y0 - 6, w + 2, 14, '#2a2342', '#1a1530', false);
    // Lautsprecher-Tuerme
    [x0 + 3, x0 + w - 16].forEach(function (lx) {
      rr(c, lx, y0 + 28, 13, 24, '#1a1530', 2, '#0e0a1e', 0.6);
      kreis(c, lx + 6.5, y0 + 35, 4, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx + 6.5, y0 + 35, 1.6, '#5a4a8a');
      kreis(c, lx + 6.5, y0 + 46, 3, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx + 6.5, y0 + 46, 1.2, '#5a4a8a');
    });
    p.fenster.forEach(function (f) { fensterV(c, f, '#5a4a8a', null, false); });
    // Neon (dunkel, leuchtet in der Lichtstufe)
    p.neon.forEach(function (n) { c.globalAlpha = 0.45; rr(c, n.x, n.y, n.w, n.h, n.farbe, 1); c.globalAlpha = 1; });
    var shD = p.schildHaupt; textInBox(c, shD.text, shD.x - shD.w / 2, shD.y, shD.w, shD.h, 10, { col: P.neonCyan, ausr: 'center', kontur: 'rgba(20,10,50,0.85)', min: 7 });
    // Absperrung vor der Tuer
    var d = p.tuer;
    [d.x - 6, d.x + d.w + 6].forEach(function (px) { r(c, px - 0.6, d.y + 10, 1.2, 7, '#d8b050'); kreis(c, px, d.y + 9.6, 1.4, '#ffd75e'); });
    c.beginPath(); c.moveTo(d.x - 6, d.y + 11); c.quadraticCurveTo(d.x + d.w / 2, d.y + 17, d.x + d.w + 6, d.y + 11); c.strokeStyle = '#b02a4a'; c.lineWidth = 1.2; c.stroke();
  }

  function tuerBild(c, p, id) {
    var d = p.tuer, dunkel = id === 'disko';
    rr(c, d.x + 1, d.y + 1, d.w - 2, d.h - 1, dunkel ? '#14102a' : '#7a4a30', 3, P.kontur, 0.9);
    c.save(); c.beginPath(); c.rect(d.x + 1, d.y + 1, d.w - 2, d.h - 1); c.clip();
    if (dunkel) { for (var i = 0; i < 3; i++) linie(c, d.x + 3, d.y + 6 + i * 3.4, d.x + d.w / 2, d.y + 3 + i * 3.4, P.neonPink, 0.8), linie(c, d.x + d.w / 2, d.y + 3 + i * 3.4, d.x + d.w - 3, d.y + 6 + i * 3.4, P.neonPink, 0.8); }
    else { rr(c, d.x + 3, d.y + 3, d.w - 6, d.h - 7, '#c98b5e', 2); rr(c, d.x + 4.5, d.y + 5, 3, 4, '#a56c48', 0.8); rr(c, d.x + 8.5, d.y + 5, 3, 4, '#a56c48', 0.8); kreis(c, d.x + d.w - 5, d.y + 10, 0.9, P.gold); }
    c.restore();
    r(c, d.x - 1, d.y + d.h - 0.5, d.w + 2, 1.5, '#8a7c9c');     // Schwelle
  }

  function gebaeudeBild(c, b) {
    var p = bauplan(b);
    c.save(); c.translate(-p.x0, -p.y0);
    // Sockel
    r(c, p.x0 - 1, p.y0 + p.h - 3, p.w + 2, 3, '#9a8aa8');
    if (b.id === 'hotel') hotelFassade(c, p);
    else if (b.id === 'restaurant') restaurantFassade(c, p);
    else if (b.id === 'kneipe') kneipeFassade(c, p);
    else diskoFassade(c, p);
    tuerBild(c, p, b.id);
    c.restore();
  }

  // ---------- Props ----------
  function baumBild(c, hs) {
    var v = hs % 3;
    ellipse(c, 0.4, -0.4, 6.2, 2.0, 'rgba(40,50,30,0.28)');
    G.poly(c, [[-1.8, 0], [1.8, 0], [1.1, -9], [-1.1, -9]], '#8a5a3a'); r(c, -0.6, -9, 1.2, 8, 'rgba(255,220,180,0.25)');
    var d = v === 2 ? ['#4f9a6a', '#5fae78', '#7cc890'] : (v ? ['#5f9e64', '#78b874', '#a4d890'] : ['#5aa05a', '#74b86a', '#a6dc8e']);
    kreis(c, -4.3, -13, 5, d[0]); kreis(c, 4.3, -13, 5, d[0]); kreis(c, 0, -17.5, 6.6, d[0]); kreis(c, 0, -12, 6.8, d[1]);
    kreis(c, -2.2, -17.5, 4, d[1]); kreis(c, 2.6, -14.6, 3.6, d[1]);
    kreis(c, -3.2, -18.8, 2.4, d[2]); kreis(c, 1.0, -19.8, 2.0, d[2]);             // Licht oben links
    if (v === 1) { [[-4, -13], [3, -10], [2, -17], [-1, -9]].forEach(function (q) { kreis(c, q[0], q[1], 0.9, '#e0504a'); }); }
  }
  function buschBild(c, hs) {
    ellipse(c, 0.3, -0.3, 7.5, 2.2, 'rgba(40,50,30,0.28)');
    kreis(c, -3.2, -4.5, 4.2, '#5f9e64'); kreis(c, 3.2, -4.5, 4.2, '#5f9e64'); kreis(c, 0, -6.4, 4.8, '#6fae6a'); kreis(c, -1.4, -7.4, 2.4, '#9ad88c');
    kreis(c, -2.5, -3.2, 0.7, '#8a2a4a'); kreis(c, 1.8, -5.2, 0.65, '#a03050'); kreis(c, 0.2, -4.0, 0.55, '#c04060');
    if (hs % 2) { kreis(c, -3, -4, 0.9, '#ff8fb4'); kreis(c, 2.5, -6, 0.9, '#ffe066'); kreis(c, 0.5, -3.4, 0.9, '#fff'); }
  }
  function laterneBild(c) {
    ellipse(c, 0, -0.5, 3.4, 1.2, 'rgba(60,40,40,0.25)');
    rr(c, -2, -2.5, 4, 2.5, '#4a3560', 1); r(c, -0.7, -14, 1.4, 12, '#4a3560'); r(c, -0.4, -14, 0.5, 12, '#7a6690');
    rr(c, -3, -17.5, 6, 4, '#4a3560', 1); poly(c, [[-3.5, -17.5], [3.5, -17.5], [0, -20.5]], '#4a3560');
    rr(c, -2, -17.2, 4, 3.2, '#fff4c8', 1.2); kreis(c, 0, -15.6, 0.9, '#fffbe8');
  }
  function bankBild(c) {
    ellipse(c, 0, -0.5, 7, 1.6, 'rgba(60,40,40,0.2)');
    r(c, -6, -5, 1.2, 5, '#4a3560'); r(c, 4.8, -5, 1.2, 5, '#4a3560');
    rr(c, -7, -6.6, 14, 2.6, '#c98b5e', 0.8, '#7a4a3a', 0.5); rr(c, -7, -11.2, 14, 3.2, '#b87a50', 1, '#7a4a3a', 0.5); r(c, -6.5, -10.4, 13, 0.5, 'rgba(255,230,200,0.5)');
    r(c, -6, -9, 1, 3, '#4a3560'); r(c, 5, -9, 1, 3, '#4a3560');
  }
  function kastenBild(c) {
    ellipse(c, 0, -0.4, 5.5, 1.3, 'rgba(60,40,40,0.22)');
    rr(c, -5.5, -7.2, 11, 6.4, '#8a5a32', 1.2, '#4a3020', 0.7);
    r(c, -5, -6.4, 10, 1.1, '#a07040');
    rr(c, -3.6, -5.2, 7.2, 2.6, '#d8c070', 0.6, '#6a4a20', 0.5);
    r(c, -2.8, -4.6, 5.6, 0.7, '#fff8ee');
    for (var i = 0; i < 4; i++) {
      var bx = -4.2 + i * 2.2;
      rr(c, bx, -10.4, 1.6, 3.4, '#2f6a3f', 0.5, '#1a4028', 0.4);
      kreis(c, bx + 0.8, -10.6, 0.7, '#1a4028');
    }
  }
  function brunnenBild(c) {
    ellipse(c, 0, -1, 17, 5, 'rgba(60,40,60,0.22)');
    rr(c, -15, -13, 30, 14, '#d8cfe2', 5, '#8a7c9c', 0.8);
    ellipse(c, 0, -10, 13.5, 4.6, '#8a7c9c'); ellipse(c, 0, -9.6, 12.4, 4, '#7fd3ec'); ellipse(c, 0, -9.8, 9, 2.4, 'rgba(255,255,255,0.35)');
    rr(c, -2.6, -22, 5.2, 14, '#ece4f0', 2, '#8a7c9c', 0.7);
    ellipse(c, 0, -19, 7, 2.2, '#d8cfe2', '#8a7c9c', 0.6); ellipse(c, 0, -19.4, 5.5, 1.4, '#7fd3ec');
    kreis(c, 0, -25, 2.6, '#ece4f0', '#8a7c9c', 0.6);
  }
  function brunnenWasser(c, x, y, t) {
    // x,y = Fusspunkt der Anlage. Strahl und Ringe bewegt
    c.strokeStyle = 'rgba(210,245,255,0.85)'; c.lineWidth = 0.9; c.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(x, y - 25 + Math.sin(t * 6) * 0.4);
      c.quadraticCurveTo(x + i * 5, y - 31 + Math.sin(t * 5 + i) * 1.2, x + i * 9, y - 17); c.stroke();
    }
    for (var k = 0; k < 3; k++) {
      var ph = (t * 0.8 + k / 3) % 1; c.globalAlpha = 1 - ph;
      c.beginPath(); c.save(); c.translate(x, y - 9.5); c.scale(1, 0.34); c.arc(0, 0, 3 + ph * 9, 0, Math.PI * 2); c.restore(); c.strokeStyle = '#e8fbff'; c.lineWidth = 0.7; c.stroke();
    }
    c.globalAlpha = 1;
  }

  // Strassenbahn (fiktiv), faehrt auf dem Gleis der unteren Hauptstrassen-Reihe
  function strassenbahn(c, x, y, t) {
    var l = 64, h = 17;
    ellipse(c, x + l / 2, y, l / 2 + 2, 2.4, 'rgba(50,40,70,0.28)');
    rr(c, x, y - h, l, h - 1.5, '#f2f0f6', 4, '#6a5c82', 0.9);
    r(c, x + 1, y - 7, l - 2, 3.4, '#e0504a'); r(c, x + 1, y - 7, l - 2, 0.7, 'rgba(255,255,255,0.4)');
    for (var i = 0; i < 6; i++) rr(c, x + 5 + i * 9.6, y - 14.4, 7, 5.4, '#8ccaec', 1.2, '#6a5c82', 0.5);
    r(c, x + l / 2 - 1.2, y - h + 1, 2.4, h - 4, 'rgba(100,90,130,0.5)');
    rr(c, x + l / 2 - 8, y - h - 3.4, 16, 3, '#6a5c82', 1); linie(c, x + l / 2 - 5, y - h - 2.2, x + l / 2 - 10, y - h - 4.5, '#6a5c82', 0.7);
    kreis(c, x + 2.5, y - 4.5, 1.1, '#ffe9a8'); kreis(c, x + l - 2.5, y - 4.5, 1.1, '#e0504a');
    for (var w = 0; w < 4; w++) kreis(c, x + 8 + w * 16, y - 0.8, 1.7, '#4a3560');
  }

  // Sprites: Props einmal je Skala in eine eigene Leinwand rendern
  function sprite(R, key, w, h, ox, oy, fn) {
    var sk = R.spSk, k = key + '@' + sk, s = R.spr[k];
    if (!s) {
      var cv = R.neueLeinwand ? R.neueLeinwand(Math.ceil(w * sk), Math.ceil(h * sk)) : null, hc = cv ? cv.getContext('2d') : null;
      if (hc) { hc.setTransform(sk, 0, 0, sk, 0, 0); if ('imageSmoothingEnabled' in hc) hc.imageSmoothingEnabled = true; hc.translate(ox, oy); fn(hc); s = { cv: cv }; } else s = {};
      R.spr[k] = s;
    }
    return s;
  }
  function zeichneSprite(R, c, key, w, h, ox, oy, x, y, fn) {
    var s = sprite(R, key, w, h, ox, oy, fn);
    if (s.cv) c.drawImage(s.cv, x - ox, y - oy, w, h);
    else { c.save(); c.translate(x, y); fn(c); c.restore(); }
  }

  Saufi.Szene = {
    K: K, HIMMEL: HIMMEL, himmelFarben: himmelFarben, nachtGrad: nachtGrad, sterneAlpha: sterneAlpha, himmelZeichnen: himmelZeichnen, himmelIcon: himmelIcon, kesselSzene: kesselSzene,
    sonnenPos: sonnenPos, mondPos: mondPos, mondSichel: mondSichel,
    schattenFuer: schattenFuer, bauplan: bauplan, gebaeudeBild: gebaeudeBild, zeichneAussenKachel: zeichneAussenKachel, hangKulisse: hangKulisse, blumen: blumen, stadtDeko: stadtDeko,
    baumBild: baumBild, buschBild: buschBild, laterneBild: laterneBild, bankBild: bankBild, kastenBild: kastenBild, brunnenBild: brunnenBild, brunnenWasser: brunnenWasser, strassenbahn: strassenbahn,
    sprite: sprite, zeichneSprite: zeichneSprite, turm: turm, haeuschen: haeuschen
  };
})(globalThis);
