/* Aussen-Szenerie als Vektorgrafik: Himmel nach Tageszeit, Kessel-Panorama, Boden-Kacheln, Gebaeude, Baeume, Laternen, Brunnen, Strassenbahn.
   Stuttgart ist fiktiv (keine Marken): Kessellage, Weinberghaenge, Staeffele, Funkturm in der Ferne, Halbhoehenhaeuser. Alles in logischen Koordinaten. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var G = Saufi.Gfx, P = G.P, hash = G.hash, r = G.r, rr = G.rr, box = G.box, kreis = G.kreis, ellipse = G.ellipse, poly = G.poly, linie = G.linie, vlauf = G.vlauf, text = G.text;
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
  function sonnenPos(h) { var u = (h - 6) / 14.8; return u < -0.02 || u > 1.02 ? null : { x: lerp(0.08, 0.92, u), y: 0.78 - Math.sin(Math.PI * klemme(u)) * 0.62 }; }
  function mondPos(h) { var u = (h - 19.5) / 10.5; return u < -0.02 || u > 1.02 ? null : { x: lerp(0.1, 0.9, u), y: 0.8 - Math.sin(Math.PI * klemme(u)) * 0.6 }; }

  function himmelZeichnen(c, x, y, w, h, stunde, t) {
    var f = himmelFarben(stunde); vlauf(c, x, y, w, h, f.oben, f.unten);
    var sa = sterneAlpha(stunde);
    if (sa > 0.02) {
      for (var i = 0; i < 46; i++) {
        var hx = hash(i, 3), sx = x + (hx % 1000) / 1000 * w, sy = y + ((hx >> 10) % 700) / 1000 * h, tw = 0.6 + 0.4 * Math.sin((t || 0) * 2 + i);
        c.globalAlpha = sa * tw * (i % 3 === 0 ? 1 : 0.65); kreis(c, sx, sy, i % 5 === 0 ? 0.9 : 0.55, '#fffbe8');
      }
      c.globalAlpha = 1;
    }
    var sp = sonnenPos(stunde);
    if (sp) {
      var nah = klemme(1 - Math.abs(sp.y - 0.78) / 0.3), sxp = x + sp.x * w, syp = y + sp.y * h, rad = Math.max(3, h * 0.07);
      var col = G.mischeHex('#fff2a8', '#ff9a50', nah * 0.9);
      G.glanz(c, sxp, syp, rad * 4, 'rgba(255,230,160,0.55)', 'rgba(255,230,160,0)');
      kreis(c, sxp, syp, rad, col);
    }
    var mp = mondPos(stunde);
    if (mp && stunde > 19.5) {
      var mx = x + mp.x * w, my = y + mp.y * h, mr = Math.max(3, h * 0.06), ma = klemme((stunde - 19.5) / 2);
      c.globalAlpha = ma; G.glanz(c, mx, my, mr * 3.5, 'rgba(220,230,255,0.4)', 'rgba(220,230,255,0)');
      kreis(c, mx, my, mr, '#f4f1de'); kreis(c, mx + mr * 0.35, my - mr * 0.15, mr * 0.9, G.mischeHex(f.oben, f.unten, 0.3));
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

  // Kessel-Panorama fuer Start- und Endbildschirm
  function kesselSzene(c, W, H, stunde, t) {
    var n = nachtGrad(stunde), tag = 1 - n;
    himmelZeichnen(c, 0, 0, W, H * 0.72, stunde, t);
    var m = function (a, b) { return G.mischeHex(a, b, n); };
    // ferne Hoehen mit Dunst
    function huegel(y0, amp, ph, farbe, rebenFarbe) {
      c.beginPath(); c.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) c.lineTo(x, y0 + Math.sin((x + ph) / 46) * amp + Math.sin((x + ph) / 19) * amp * 0.35);
      c.lineTo(W, H); c.closePath(); c.fillStyle = farbe; c.fill();
      if (rebenFarbe) {
        c.strokeStyle = rebenFarbe; c.lineWidth = 0.7;
        for (var k2 = 1; k2 < 5; k2++) {
          c.beginPath();
          for (var x2 = 0; x2 <= W; x2 += 6) { var yy = y0 + k2 * 4 + Math.sin((x2 + ph) / 46) * amp + Math.sin((x2 + ph) / 19) * amp * 0.35; if (x2 === 0) c.moveTo(x2, yy); else c.lineTo(x2, yy); }
          c.stroke();
        }
      }
    }
    huegel(H * 0.52, 7, 0, m('#a9c8d8', '#27315a'), null);
    turm(c, W * 0.8, H * 0.5, H * 0.3, m('#9aa8be', '#1b2342'), n * 0.9);
    huegel(H * 0.58, 8, 90, m('#8cc27a', '#233a46'), m('#79b068', '#1d3340'));
    huegel(H * 0.67, 6, 40, m('#6fae6a', '#1b2d3a'), null);
    // Haeuser im Kessel
    var by = H * 0.76;
    for (var i = 0; i < 20; i++) {
      var hx = 10 + i * (W - 20) / 20, hh = 7 + (hash(i, 9) % 10), hw = 8 + (hash(i, 4) % 5);
      haeuschen(c, hx, by - hh + 6, hw, hh, m(i % 2 ? '#f0dcc4' : '#e8cdb0', '#1b2036'), m(i % 3 ? '#d2694f' : '#b9553f', '#22223c'), n);
    }
    // Fluss und Vordergrund
    vlauf(c, 0, by + 6, W, H - by - 6, m('#a8d68f', '#16222f'), m('#7fb678', '#101a26'));
    c.globalAlpha = 0.55; r(c, 0, by + 10, W, 3, m('#7fd3ec', '#243a60')); c.globalAlpha = 1;
    // Dunst unten
    var gr = c.createLinearGradient(0, H * 0.45, 0, H * 0.78); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,240,225,' + (0.25 * tag + 0.06) + ')');
    c.fillStyle = gr; c.fillRect(0, H * 0.45, W, H * 0.33);
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
  var GRUND = {}; GRUND[0] = 1; GRUND[1] = 1; GRUND[2] = 1; GRUND[3] = 1;
  function grundTyp(karte, x, y) {
    var T = Saufi.Karte.T, ns = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    for (var i = 0; i < ns.length; i++) { var t = karte.tile(x + ns[i][0], y + ns[i][1]); if (GRUND[t]) return t; }
    return T.GRAS;
  }

  function gras(c, sx, sy, hs) {
    vlauf(c, sx, sy, K, K, hs % 2 ? '#a9d790' : '#a4d38b', hs % 2 ? '#9fcf86' : '#a8d68f');
    for (var i = 0; i < 4; i++) {
      var hh = hash(hs, i + 11), px = sx + 1 + (hh % 14), py = sy + 2 + ((hh >> 4) % 12);
      linie(c, px, py, px + 0.6, py - 2, i % 2 ? P.gras2 : P.gras3, 0.55);
    }
    if (hs % 5 === 0) ellipse(c, sx + 3 + hs % 9, sy + 4 + (hs >> 3) % 8, 3.2, 1.5, 'rgba(120,180,110,0.35)');
  }
  function weg(c, sx, sy, hs) {
    r(c, sx, sy, K, K, P.weg); r(c, sx, sy, K, K, 'rgba(255,255,255,0.05)');
    for (var i = 0; i < 4; i++) { var hh = hash(hs, i + 3); ellipse(c, sx + 2 + hh % 12, sy + 2 + (hh >> 5) % 12, 0.9 + (hh % 3) * 0.3, 0.6, i % 2 ? P.weg2 : '#e9ccaa'); }
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
    vlauf(c, sx, sy, K, K, '#86d9ef', '#6cc7e4');
    r(c, sx, sy, K, 1.6, 'rgba(255,255,255,0.18)');
    if (hs % 2) ellipse(c, sx + 5 + hs % 6, sy + 8, 3, 0.7, 'rgba(255,255,255,0.45)');
  }
  function bruecke(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T;
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
  function bodenKachel(c, karte, typ, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T;
    if (typ === T.WEG) weg(c, sx, sy, hs);
    else if (typ === T.PFLASTER) pflaster(c, sx, sy, hs);
    else if (typ === T.STRASSE) strasse(c, karte, x, y, sx, sy, hs);
    else gras(c, sx, sy, hs);
  }

  function zeichneAussenKachel(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, t = karte.tile(x, y), hs = hash(x, y);
    if (t === T.GRAS || t === T.WEG || t === T.PFLASTER || t === T.STRASSE) bodenKachel(c, karte, t, x, y, sx, sy, hs);
    else if (t === T.WASSER) wasser(c, sx, sy, hs);
    else if (t === T.BRUECKE) { wasser(c, sx, sy, hs); bruecke(c, karte, x, y, sx, sy); }
    else if (t === T.MAUER) mauer(c, sx, sy, hs);
    else if (t === T.REBEN) reben(c, sx, sy, hs);
    else if (t === T.STAEFFELE) staeffele(c, sx, sy);
    else bodenKachel(c, karte, t === T.BRUNNEN || t === T.BANK ? T.PFLASTER : (t === T.LATERNE || t === T.BAUM || t === T.BUSCH ? grundTyp(karte, x, y) : T.GRAS), x, y, sx, sy, hs);
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
  // Tupfer im Gras (Blumen) und Gras-Details auf dem Hintergrund
  function blumen(c, karte) {
    karte.deco.forEach(function (d) {
      linie(c, d.x, d.y + 1, d.x, d.y + 3, '#5f9e64', 0.5);
      for (var i = 0; i < 5; i++) { var a = i * 1.2566; kreis(c, d.x + Math.cos(a) * 0.9, d.y + Math.sin(a) * 0.9, 0.7, d.farbe); }
      kreis(c, d.x, d.y, 0.55, '#ffcf40');
    });
  }

  // ---------- Gebaeude ----------
  // Plan in Weltpixeln: Fenster (leuchten nachts), Neon, Tuer
  function bauplan(b) {
    var x0 = b.x * K, y0 = b.y * K, w = b.w * K, h = b.h * K, tx = b.tuer.x * K, ty = b.tuer.y * K;
    var plan = { x0: x0, y0: y0, w: w, h: h, tuer: { x: tx, y: ty, w: K, h: K }, fenster: [], neon: [], schild: { x: x0 + w / 2, y: y0 + 21 } };
    var i;
    if (b.id === 'hotel') {
      for (i = 0; i < 4; i++) { plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 28, w: 12, h: 13 }); plan.fenster.push({ x: x0 + 10 + i * 28 + (i > 1 ? 16 : 0), y: y0 + 50, w: 12, h: 13 }); }
    } else if (b.id === 'restaurant') {
      for (i = 0; i < 3; i++) plan.fenster.push({ x: x0 + 8 + i * 34 + (i > 0 ? 10 : 0), y: y0 + 30, w: 14, h: 14 });
      plan.fenster.push({ x: x0 + 8, y: y0 + 54, w: 14, h: 14 }); plan.fenster.push({ x: x0 + w - 24, y: y0 + 54, w: 14, h: 14 });
    } else if (b.id === 'kneipe') {
      plan.fenster.push({ x: x0 + 8, y: y0 + 28, w: 22, h: 18 }); plan.fenster.push({ x: x0 + w - 30, y: y0 + 28, w: 22, h: 18 });
      plan.neon.push({ x: x0 + w / 2 - 18, y: y0 + 16, w: 36, h: 4, farbe: P.neonGelb });
    } else if (b.id === 'disko') {
      plan.neon.push({ x: x0 + 8, y: y0 + 18, w: w - 16, h: 3, farbe: P.neonPink });
      plan.neon.push({ x: x0 + 8, y: y0 + 24, w: w - 16, h: 2, farbe: P.neonCyan });
      plan.neon.push({ x: x0 + 10, y: y0 + h - 2, w: w - 20, h: 2, farbe: P.neonLila });
      plan.fenster.push({ x: x0 + 12, y: y0 + 34, w: 10, h: 18 }); plan.fenster.push({ x: x0 + w - 22, y: y0 + 34, w: 10, h: 18 });
    }
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
    text(c, s, cx, y + h / 2 + 0.2, vorn, size || 6.2, 'center');
  }
  function schildGeb(c, cx, y, w, h, hinten, vorn, s, size, rand) { rr(c, cx - w / 2 - 1, y - 1, w + 2, h + 2, rand, 3); schild(c, cx, y, w, h, hinten, vorn, s, size); }

  function hotelFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 14, w, h - 14, '#fff6e6', '#f0dcc0');
    r(c, x0, y0 + 14, 3, h - 14, 'rgba(180,150,120,0.35)'); r(c, x0 + w - 3, y0 + 14, 3, h - 14, 'rgba(180,150,120,0.35)');
    r(c, x0, y0 + 43, w, 2, '#e5cfaa'); r(c, x0, y0 + 43, w, 0.6, 'rgba(255,255,255,0.7)');          // Gesims
    // Dach (Walmdach) mit Gauben
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
    schildGeb(c, x0 + w / 2, y0 + 14, 92, 14, '#2e3f7a', '#ffe9a8', 'HOTEL KESSELBLICK', 11, '#d9b86a');
    schild(c, x0 + 22, y0 + 48, 36, 10, '#fff8ee', '#6a3f2a', 'Kehrwoche ok', 11);
  }
  function restaurantFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 14, w, h - 14, '#f8e8c8', '#ead2a8');
    // Fachwerk
    var holz = '#7a4a34';
    for (i = 0; i < 4; i++) r(c, x0 + 3 + i * 34, y0 + 16, 3, h - 16, holz);
    r(c, x0, y0 + 26, w, 2.4, holz); r(c, x0, y0 + 46, w, 2.6, holz); r(c, x0, y0 + h - 3, w, 3, '#5a3a2a');
    for (i = 0; i < 3; i++) { linie(c, x0 + 6 + i * 34, y0 + 28, x0 + 37 + i * 34, y0 + 46, holz, 1.4); }
    // Dach
    poly(c, [[x0 - 5, y0 + 17], [x0 + 6, y0 - 9], [x0 + w - 6, y0 - 9], [x0 + w + 5, y0 + 17]], P.dach2, '#8a3a2e', 0.9);
    dachziegel(c, x0 - 1, y0 - 8, w + 2, 22, P.dach2, '#b9553f', false);
    r(c, x0 - 5, y0 + 15, w + 10, 2.4, '#7a2a24');
    r(c, x0 + 14, y0 - 17, 6, 12, '#b9553f'); r(c, x0 + 13, y0 - 18, 8, 2, '#8a3a2e');
    p.fenster.forEach(function (f, k) { fensterV(c, f, null, k % 2 ? '#e0504a' : '#fff8ee', f.y > 50 || k === 1); });
    // Haengeschild, Tonnen, Laterne
    r(c, x0 + w - 14, y0 + 33, 12, 1.4, '#3a2a30'); rr(c, x0 + w - 9, y0 + 34.5, 8, 6, '#ffd36e', 1.4, '#7a4a34', 0.6); kreis(c, x0 + w - 5, y0 + 37.5, 1.8, '#c8864a');
    var d = p.tuer;
    [d.x - 14, d.x + d.w + 3].forEach(function (bx, i2) { ellipse(c, bx + 5, d.y + 15, 6, 2, 'rgba(60,40,50,0.25)'); rr(c, bx, d.y + 5, 10, 10, '#b97a4a', 3, '#6a3f2a', 0.7); r(c, bx + 0.5, d.y + 8, 9, 0.8, '#6a3f2a'); r(c, bx + 0.5, d.y + 12, 9, 0.8, '#6a3f2a'); if (i2) kreis(c, bx + 5, d.y + 4.6, 3, '#6fae6a'); });
    schildGeb(c, x0 + w / 2, y0 + 14, 96, 14, '#6a3f2a', '#ffe9a8', 'GASTHAUS MAULTÄSCHLE', 11, '#d9b86a');
    schild(c, x0 + w - 28, y0 + 50, 40, 10, '#ffd36e', '#6a3f2a', 'Spätzle!', 11);
  }
  function kneipeFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i, j;
    r(c, x0, y0 + 10, w, h - 10, '#c4694e');
    for (j = 0; j < 8; j++) {
      r(c, x0, y0 + 12 + j * 6.5, w, 0.6, 'rgba(90,40,30,0.4)');
      for (i = 0; i < w / 10; i++) r(c, x0 + (j % 2 ? 5 : 0) + i * 10, y0 + 12 + j * 6.5, 0.6, 6.5, 'rgba(90,40,30,0.3)');
    }
    r(c, x0, y0 + 10, w, 2, 'rgba(255,255,255,0.15)');
    rr(c, x0 - 3, y0 - 8, w + 6, 20, '#5c4a6e', 3, P.kontur, 0.9);       // Flachdach-Blende
    r(c, x0 - 3, y0 - 8, w + 6, 3, '#7a6690');
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
    // Dachs-Schild (Kreis mit Streifen)
    var sx = x0 + w - 12, sy = y0 + 34;
    r(c, sx - 7, sy - 8, 7, 1.2, '#3a2a30'); kreis(c, sx, sy, 6, '#f4f1ee', '#3a2a30', 0.8);
    ellipse(c, sx, sy + 0.8, 4, 3.4, '#8a8a96'); poly(c, [[sx - 0.8, sy - 4], [sx + 0.8, sy - 4], [sx + 1.4, sy + 4], [sx - 1.4, sy + 4]], '#f4f1ee');
    kreis(c, sx - 2, sy - 1, 0.6, '#222'); kreis(c, sx + 2, sy - 1, 0.6, '#222'); kreis(c, sx, sy + 2.6, 0.9, '#222');
    // Kreidetafel
    rr(c, d.x + d.w + 4, d.y + 3, 9, 12, '#3a3a40', 1, '#8a5a3a', 0.9); linie(c, d.x + d.w + 6, d.y + 7, d.x + d.w + 11, d.y + 7, '#fff8ee', 0.5); linie(c, d.x + d.w + 6, d.y + 10, d.x + d.w + 10, d.y + 10, '#fff8ee', 0.5);
    schildGeb(c, x0 + w / 2, y0 + 8, 96, 14, '#2f6a3f', '#ffe9a8', 'ZUM DURSTIGEN DACHS', 11, '#d9b86a');
    schild(c, x0 + 18, y0 + 52, 44, 10, '#3a3a40', '#fff8ee', 'Feinstaub drin', 11);
  }
  function diskoFassade(c, p) {
    var x0 = p.x0, y0 = p.y0, w = p.w, h = p.h, i;
    vlauf(c, x0, y0 + 10, w, h - 10, '#40346a', '#2e2450');
    for (i = 0; i < 6; i++) r(c, x0 + 3, y0 + 14 + i * 8, w - 6, 0.5, 'rgba(255,255,255,0.08)');
    rr(c, x0 - 3, y0 - 8, w + 6, 20, '#2a2342', 3, P.kontur, 0.9);
    r(c, x0 - 3, y0 - 8, w + 6, 2.5, '#4a3d72');
    // Lautsprecher-Tuerme
    [x0 + 3, x0 + w - 16].forEach(function (lx) {
      rr(c, lx, y0 + 28, 13, 24, '#1a1530', 2, '#0e0a1e', 0.6);
      kreis(c, lx + 6.5, y0 + 35, 4, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx + 6.5, y0 + 35, 1.6, '#5a4a8a');
      kreis(c, lx + 6.5, y0 + 46, 3, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx + 6.5, y0 + 46, 1.2, '#5a4a8a');
    });
    p.fenster.forEach(function (f) { fensterV(c, f, '#5a4a8a', null, false); });
    // Neon (dunkel, leuchtet in der Lichtstufe)
    p.neon.forEach(function (n) { c.globalAlpha = 0.45; rr(c, n.x, n.y, n.w, n.h, n.farbe, 1); c.globalAlpha = 1; });
    text(c, 'UNTERGRUND 07', x0 + w / 2, y0 + 3, P.neonCyan, 11, 'center', 'rgba(20,10,50,0.85)');
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
    ellipse(c, 0, -1, 5, 1.6, 'rgba(60,40,40,0.18)');
    G.poly(c, [[-1.8, 0], [1.8, 0], [1.1, -9], [-1.1, -9]], '#8a5a3a'); r(c, -0.6, -9, 1.2, 8, 'rgba(255,220,180,0.25)');
    var d = v === 2 ? ['#4f9a6a', '#5fae78', '#7cc890'] : (v ? ['#5f9e64', '#78b874', '#a4d890'] : ['#5aa05a', '#74b86a', '#a6dc8e']);
    kreis(c, -4.3, -13, 5, d[0]); kreis(c, 4.3, -13, 5, d[0]); kreis(c, 0, -17.5, 6.6, d[0]); kreis(c, 0, -12, 6.8, d[1]);
    kreis(c, -2.2, -17.5, 4, d[1]); kreis(c, 2.6, -14.6, 3.6, d[1]); kreis(c, -3, -18.6, 2.2, d[2]); kreis(c, 1.4, -19.6, 1.6, d[2]);
    if (v === 1) { [[-4, -13], [3, -10], [2, -17], [-1, -9]].forEach(function (q) { kreis(c, q[0], q[1], 0.9, '#e0504a'); }); }
    ellipse(c, 0, -7, 7, 2.2, 'rgba(40,70,50,0.28)');
  }
  function buschBild(c, hs) {
    ellipse(c, 0, -1, 7, 2, 'rgba(60,40,40,0.18)');
    kreis(c, -3.2, -4.5, 4.2, '#5f9e64'); kreis(c, 3.2, -4.5, 4.2, '#5f9e64'); kreis(c, 0, -6.4, 4.8, '#6fae6a'); kreis(c, -1.4, -7.4, 2.4, '#9ad88c');
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
    schattenFuer: schattenFuer, bauplan: bauplan, gebaeudeBild: gebaeudeBild, zeichneAussenKachel: zeichneAussenKachel, hangKulisse: hangKulisse, blumen: blumen,
    baumBild: baumBild, buschBild: buschBild, laterneBild: laterneBild, bankBild: bankBild, brunnenBild: brunnenBild, brunnenWasser: brunnenWasser, strassenbahn: strassenbahn,
    sprite: sprite, zeichneSprite: zeichneSprite, turm: turm, haeuschen: haeuschen
  };
})(globalThis);
