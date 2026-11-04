/* Zeichnen: Welt (gecachter Vektor-Hintergrund, Props, Figuren, Licht), HUD, Menues und Bildschirme.
   Spiellogik und Eingabe rechnen in logischen Koordinaten (320x176, Hochkant 320x400). Der Canvas hat CSS-Groesse * devicePixelRatio
   Pixel; jedes Bild beginnt mit ctx.setTransform(skala,...). Alles per Code, keine fremden Grafiken (Details: gfx.js, szene.js, innen.js). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var G = Saufi.Gfx, Sz = Saufi.Szene, In = Saufi.Innen;
  var P = G.P, hash = G.hash, r = G.r, rr = G.rr, box = G.box, kreis = G.kreis, ellipse = G.ellipse, poly = G.poly, linie = G.linie, vlauf = G.vlauf, herz = G.herz;
  var text = G.text, breite = G.breite, umbruch = G.umbruch, kuerze = G.kuerze, panel = G.panel, rgb = G.rgb, mix = G.mix;
  var BASE_W = 320, BASE_H = 176, PORT_H = 400, K = 16;
  var MAX_BREITE = 4096, MAX_BG_SKALA = 6;
  var W = BASE_W, H = BASE_H;
  var SH = { dx: 0, lang: 0.6, a: 0 };           // Schatten der aktuellen Uhrzeit

  // ---------- Aufloesung ----------
  function erstelle(canvas, doc) {
    var ctx = canvas.getContext('2d');
    doc = doc || canvas.ownerDocument || null;
    var neueLeinwand = (doc && typeof doc.createElement === 'function') ? function (w, h) {
      try { var cv = doc.createElement('canvas'); if (!cv || !cv.getContext) return null; cv.width = w; cv.height = h; return cv; } catch (e) { return null; }
    } : null;
    var R = { canvas: canvas, ctx: ctx, neueLeinwand: neueLeinwand, hg: {}, spr: {}, props: {}, treffer: [], panel: null, W: W, H: H, hochkant: false, sk: 1, spSk: 1, cssW: 0, cssH: 0, dpr: 1 };
    glaettung(R);
    return R;
  }
  function glaettung(R) {
    var c = R.ctx;
    if ('imageSmoothingEnabled' in c) c.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in c) c.imageSmoothingQuality = 'high';
  }
  // Backing-Store = CSS-Groesse * devicePixelRatio (hoechstens MAX_BREITE breit). Rueckgabe: Skala (Geraete-Pixel je logischem Pixel)
  function setzeAufloesung(R, cssW, cssH, dpr) {
    dpr = dpr > 0 ? dpr : 1;
    var bw = Math.round((cssW > 0 ? cssW : W) * dpr);
    bw = Math.max(W, Math.min(MAX_BREITE, bw));
    var sk = bw / W, bh = Math.max(1, Math.round(H * sk));
    R.cssW = cssW; R.cssH = cssH; R.dpr = dpr;
    if (R.canvas) { if (R.canvas.width !== bw) R.canvas.width = bw; if (R.canvas.height !== bh) R.canvas.height = bh; glaettung(R); }
    R.sk = sk;
    // Hintergrund und Sprites: gleiche (hohe) Skala, in Halbschritten, nur bei Wechsel neu bauen
    var bg = Math.min(MAX_BG_SKALA, Math.max(1, Math.ceil(sk * 2) / 2));
    if (bg !== R.spSk) { R.spSk = bg; R.hg = {}; R.spr = {}; }
    return sk;
  }
  function setzeBildschirm(R, hoch) {
    R.hochkant = !!hoch; W = BASE_W; H = hoch ? PORT_H : BASE_H; R.W = W; R.H = H;
    setzeAufloesung(R, R.cssW, R.cssH, R.dpr);
    return { w: W, h: H };
  }

  // ---------- Gebaeude, Props ----------
  function bauplan(b) { return Sz.bauplan(b); }
  function zeichneGebaeude(R, c, b, px, py) {
    var key = 'geb_' + b.id, p = bauplan(b);
    var s = Sz.sprite(R, key, p.w + 24, p.h + 44, 12, 32, function (hc) { Sz.gebaeudeBild(hc, b); });
    // Schatten (tagsueber) neben dem Haus
    if (SH.a > 0.01) {
      var yb = py + p.h;
      c.fillStyle = 'rgba(50,30,90,' + SH.a + ')';
      c.beginPath(); c.moveTo(px, yb); c.lineTo(px + p.w, yb); c.lineTo(px + p.w + SH.dx * 30, yb + 5); c.lineTo(px + SH.dx * 30, yb + 5); c.closePath(); c.fill();
    }
    if (s.cv) c.drawImage(s.cv, px - 12, py - 32, p.w + 24, p.h + 44);
    else { c.save(); c.translate(px, py); Sz.gebaeudeBild(c, b); c.restore(); }
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
        else if (t === T.BUSCH) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'busch', hs: hash(x, y) });
        else if (t === T.LATERNE) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'laterne', lx: x, ly: y });
        else if (t === T.BANK) list.push({ y: (y + 1) * K, x: x * K, w: K, art: 'bank' });
        else if (t === T.BRUNNEN && karte.tile(x - 1, y) !== T.BRUNNEN && karte.tile(x, y - 1) !== T.BRUNNEN) list.push({ y: (y + 2) * K, x: x * K, w: 32, art: 'brunnen' });
      }
    }
    list.sort(function (a, b) { return a.y - b.y; });
    p = R.props[karte.id] = list; return p;
  }

  // ---------- Hintergrund-Cache ----------
  function hintergrund(R, karte) {
    var h = R.hg[karte.id];
    if (h) return h;
    if (!R.neueLeinwand) return null;
    var sk = R.spSk, cv = R.neueLeinwand(Math.ceil(karte.pxW * sk), Math.ceil(karte.pxH * sk)), hc = cv ? cv.getContext('2d') : null;
    if (!hc) return null;
    hc.setTransform(sk, 0, 0, sk, 0, 0);
    if ('imageSmoothingEnabled' in hc) hc.imageSmoothingEnabled = true;
    for (var y = 0; y < karte.h; y++) for (var x = 0; x < karte.w; x++) {
      if (karte.innen) In.zeichneInnenKachel(hc, karte, x, y, x * K, y * K); else Sz.zeichneAussenKachel(hc, karte, x, y, x * K, y * K);
    }
    if (karte.innen) In.wandDeko(hc, karte); else { Sz.hangKulisse(hc, karte); Sz.blumen(hc, karte); }
    h = { canvas: cv, sk: sk }; R.hg[karte.id] = h; return h;
  }

  // ---------- Figuren ----------
  var DUNKEL = {};
  function dunkler(col, k) { var key = col + k; return DUNKEL[key] || (DUNKEL[key] = G.mischeHex(col, '#000000', k)); }
  function heller(col, k) { var key = col + 'h' + k; return DUNKEL[key] || (DUNKEL[key] = G.mischeHex(col, '#ffffff', k)); }
  var KONT = 'rgba(74,53,96,0.85)';

  function haare(c, ch, hx, hy, dir, extra) {
    var col = ch.haar, dk = dunkler(col, 0.25);
    // Grundkappe
    c.beginPath(); c.arc(hx, hy, 4.9, Math.PI * (dir === 'oben' ? 0 : 1.04), Math.PI * (dir === 'oben' ? 2 : 1.96), dir === 'oben' ? false : false);
    if (dir === 'oben') { kreis(c, hx, hy, 4.9, col, KONT, 0.7); kreis(c, hx, hy + 0.5, 3.4, dk); }
    else {
      c.closePath(); c.fillStyle = col; c.fill();
      var fx = dir === 'links' ? -1.6 : (dir === 'rechts' ? 1.6 : 0);
      poly(c, [[hx - 4.6 + (dir === 'rechts' ? -0.4 : 0), hy - 0.6], [hx + 4.6 + (dir === 'links' ? 0.4 : 0), hy - 0.6], [hx + 3 + fx, hy + 1.2], [hx - 3 + fx, hy + 1.2]], col);
      if (dir === 'links') poly(c, [[hx + 1.5, hy - 1], [hx + 4.6, hy - 1], [hx + 4.8, hy + 3.4], [hx + 3, hy + 2]], col);
      if (dir === 'rechts') poly(c, [[hx - 1.5, hy - 1], [hx - 4.6, hy - 1], [hx - 4.8, hy + 3.4], [hx - 3, hy + 2]], col);
    }
    if (extra === 'gel') {
      for (var i = -1; i <= 1; i++) poly(c, [[hx + i * 2.4 - 1.4, hy - 3.8], [hx + i * 2.4 + 0.4, hy - 7.4 + Math.abs(i)], [hx + i * 2.4 + 1.8, hy - 3.8]], col);
    }
    if (extra === 'rosa') {
      var sw = dir === 'oben' ? 5.4 : 5.2;
      rr(c, hx - sw, hy - 1.4, 2.8, 9.4, col, 1.4); rr(c, hx + sw - 2.8, hy - 1.4, 2.8, 9.4, col, 1.4);
      if (dir === 'oben') rr(c, hx - sw, hy - 2, sw * 2, 11, col, 3);
      kreis(c, hx + 4.2, hy - 3, 1.2, '#ffffff');
    }
  }
  function mund(c, hx, hy, schwips, tanzt) {
    if (tanzt) { c.beginPath(); c.arc(hx, hy + 2.2, 1.4, 0, Math.PI); c.fillStyle = '#7a2a3a'; c.fill(); return; }
    c.beginPath(); c.arc(hx, hy + 2, 1.2, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = '#7a3a4a'; c.lineWidth = 0.6; c.stroke();
    if (schwips) { kreis(c, hx - 3, hy + 1.6, 1.1, 'rgba(255,120,150,0.55)'); kreis(c, hx + 3, hy + 1.6, 1.1, 'rgba(255,120,150,0.55)'); }
  }

  function figur(c, ch, x, y, o) {
    o = o || {};
    var dir = o.dir || 'unten', fr = o.schritt || 0, extra = ch.extra, t = o.t || 0;
    var seite = dir === 'links' || dir === 'rechts', sg = dir === 'links' ? -1 : 1;
    ellipse(c, x + SH.dx * 3.4, y - 0.2, 6 + Math.abs(SH.dx) * 3, 2.2, 'rgba(50,30,80,' + (0.2 + SH.a * 0.5).toFixed(3) + ')');
    if (o.liegt) {                                              // umgefallen: liegt quer
      rr(c, x - 4, y - 6.6, 15, 6.4, ch.hose, 2.6, KONT, 0.7);
      rr(c, x - 8.6, y - 8.6, 12.4, 8, ch.shirt, 3, KONT, 0.7);
      kreis(c, x - 10.6, y - 5.6, 4.4, P.haut, KONT, 0.7);
      c.beginPath(); c.arc(x - 10.6, y - 5.6, 4.6, Math.PI * 0.95, Math.PI * 1.9); c.fillStyle = ch.haar; c.fill();
      linie(c, x - 12, y - 5.6, x - 10.6, y - 5.3, KONT, 0.6); linie(c, x - 9.8, y - 5.6, x - 8.6, y - 5.3, KONT, 0.6);
      rr(c, x + 9, y - 4.6, 3.4, 2.6, KONT, 1.2);
      text(c, 'zZz', x - 4, y - 14 + Math.sin(t * 3), '#ffffff', 8, 'center', P.kontur);
      return;
    }
    var swing = [0, 1.7, 0, -1.7][fr] || 0, hop = o.tanzt ? -Math.abs(Math.sin(t * 12)) * 2.2 : 0, wipp = o.tanzt ? Math.sin(t * 12) * 1.2 : 0;
    var bob = ((fr === 1 || fr === 3) ? -0.5 : 0) + hop + Math.sin(t * 2 + x) * 0.12;
    var hose = ch.hose, shirt = ch.shirt, by = y + hop;
    // Beine
    var beinFarbe = extra === 'latz' ? ch.shirt : hose, schuh = extra === 'schuhe' ? ['#ff4fa0', '#4fe6ff'] : ['#3a2a3e', '#3a2a3e'];
    var l1 = seite ? swing : 0, l2 = seite ? -swing : 0, up1 = seite ? 0 : Math.max(0, swing) * 0.8, up2 = seite ? 0 : Math.max(0, -swing) * 0.8;
    if (seite) { rr(c, x - 1.9 + l2 * 0.9, by - 8.2, 3.8, 8.4, dunkler(beinFarbe, 0.18), 1.5); rr(c, x - 2.4 + l2 * 0.9, by - 1.6, 5.4 * sg > 0 ? 5.4 : 5.4, 2.2, schuh[1], 1.1, KONT, 0.5); }
    rr(c, x - 3.8 + (seite ? l1 * 0.9 : 0), by - 8.4 - 0 + up1, 3.5, 8.6 - up1, beinFarbe, 1.5, KONT, 0.5);
    if (!seite) rr(c, x + 0.3, by - 8.4 + up2, 3.5, 8.6 - up2, beinFarbe, 1.5, KONT, 0.5);
    if (!seite) { rr(c, x - 4.3, by - 1.8 + up1, 4.4, 2.3, schuh[0], 1.1, KONT, 0.5); rr(c, x - 0.1, by - 1.8 + up2, 4.4, 2.3, schuh[1], 1.1, KONT, 0.5); }
    else { rr(c, x - 2.4 + l1 * 0.9 + (sg > 0 ? 0.5 : -0.5), by - 1.8, 5.4, 2.3, schuh[0], 1.1, KONT, 0.5); }
    // Arme hinten (Seitenansicht)
    var ay = by - 14.8 + bob, armSw = o.tanzt ? -3.6 : swing * 0.5;
    if (seite) rr(c, x - 1.2 - swing * 0.6, ay, 2.6, 6.2, dunkler(shirt, 0.18), 1.2);
    // Torso
    var tw = seite ? 6.8 : 9, tx = x - tw / 2;
    rr(c, tx + wipp * 0.15, by - 16.6 + bob, tw, 9.4, shirt, 3.2, KONT, 0.7);
    vlauf(c, tx + 1, by - 15.8 + bob, tw - 2, 3, heller(shirt, 0.28), shirt);
    if (extra === 'weste' && !seite) { rr(c, tx + 1.2, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); rr(c, tx + tw - 4, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); }
    else if (extra === 'weste') rr(c, tx + 0.8, by - 15.4 + bob, tw - 1.6, 8, '#7a7a88', 1.2);
    if (extra === 'tracht') { rr(c, tx + 1, by - 15.6 + bob, tw - 2, 8.2, '#1f4a2a', 1.6); for (var k = 0; k < 3; k++) kreis(c, x + (seite ? 0 : 0), by - 14 + bob + k * 2.4, 0.5, '#d8c070'); }
    if (extra === 'latz') { rr(c, tx + 1, by - 12.4 + bob, tw - 2, 5.4, '#f08a2a', 1.4); r(c, tx + 1.2, by - 16 + bob, 1.2, 4, '#f08a2a'); r(c, tx + tw - 2.4, by - 16 + bob, 1.2, 4, '#f08a2a'); kreis(c, x, by - 10.6 + bob, 0.7, '#ffd75e'); }
    if (extra === 'hut') { poly(c, [[x - 1.2, by - 16 + bob], [x + 1.2, by - 16 + bob], [x + 0.8, by - 9 + bob], [x - 0.8, by - 9 + bob]], '#1a1a22'); }
    // Arm vorn
    if (!seite) {
      rr(c, tx - 2.2, ay + armSw * 0.4 - (o.tanzt ? 3 : 0), 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.5);
      rr(c, tx + tw - 0.4, ay - armSw * 0.4 - (o.tanzt ? 3 : 0), 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.5);
      kreis(c, tx - 0.9, ay + 6 + armSw * 0.4 - (o.tanzt ? 6 : 0), 1.3, P.haut); kreis(c, tx + tw + 0.9, ay + 6 - armSw * 0.4 - (o.tanzt ? 6 : 0), 1.3, P.haut);
      if (o.glas) { rr(c, tx + tw + 0.2, ay + 1.4 - armSw * 0.4, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5); r(c, tx + tw + 0.4, ay + 1.4 - armSw * 0.4, 3.2, 1.2, '#fff8ee'); }
    } else {
      rr(c, x - 1.2 + swing * 0.6, ay, 2.6, 6.2, shirt, 1.3, KONT, 0.5); kreis(c, x + swing * 0.6 + 0.1, ay + 6.2, 1.3, P.haut);
      if (o.glas) { rr(c, x + sg * 1.4 + swing * 0.6 - 1.4, ay + 2, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5); }
    }
    // Kopf
    var hx = x + wipp * 0.3 + (seite ? sg * 0.5 : 0), hy = by - 21.4 + bob;
    r(c, hx - 1.2, hy + 3.4, 2.4, 2, dunkler(P.haut, 0.1));
    kreis(c, hx, hy, 4.7, P.haut, KONT, 0.7);
    if (dir === 'oben') haare(c, ch, hx, hy, 'oben', extra);
    else {
      haare(c, ch, hx, hy, dir, extra);
      if (seite) { kreis(c, hx + sg * 2.4, hy + 0.6, 0.75, '#3a2a40'); kreis(c, hx + sg * 4.8, hy + 1.2, 0.8, dunkler(P.haut, 0.08)); mund(c, hx + sg * 1.6, hy + 0.2, o.schwips, false); }
      else { kreis(c, hx - 1.8, hy + 0.7, 0.8, '#3a2a40'); kreis(c, hx + 1.8, hy + 0.7, 0.8, '#3a2a40'); mund(c, hx, hy + 0.4, o.schwips, o.tanzt); }
    }
    // Eigenheiten
    if (extra === 'muetze') {
      c.beginPath(); c.arc(hx, hy - 0.6, 5.1, Math.PI, 0); c.closePath(); c.fillStyle = '#e0504a'; c.fill(); c.lineWidth = 0.6; c.strokeStyle = '#8a2a28'; c.stroke();
      rr(c, hx - 5.4, hy - 1.2, 10.8, 1.6, '#c03a38', 0.8);
      if (dir === 'unten') rr(c, hx - 3, hy - 0.4, 6, 1.4, '#8a2a28', 0.7); else if (dir !== 'oben') rr(c, hx + sg * 3, hy - 0.6, 4.2 * sg, 1.5, '#8a2a28', 0.7);
      kreis(c, hx, hy - 5.5, 1, '#fff8ee');
    }
    if (extra === 'brille' && dir !== 'oben') {
      c.lineWidth = 0.6; c.strokeStyle = '#2a2a38';
      if (seite) { kreis(c, hx + sg * 2.4, hy + 0.6, 1.6, 'rgba(255,255,255,0.65)', '#2a2a38', 0.6); linie(c, hx + sg * 0.8, hy + 0.5, hx - sg * 3.5, hy + 0.2, '#2a2a38', 0.5); }
      else { kreis(c, hx - 1.9, hy + 0.7, 1.7, 'rgba(255,255,255,0.65)', '#2a2a38', 0.6); kreis(c, hx + 1.9, hy + 0.7, 1.7, 'rgba(255,255,255,0.65)', '#2a2a38', 0.6); linie(c, hx - 0.3, hy + 0.7, hx + 0.3, hy + 0.7, '#2a2a38', 0.5); kreis(c, hx - 1.9, hy + 0.7, 0.55, '#3a2a40'); kreis(c, hx + 1.9, hy + 0.7, 0.55, '#3a2a40'); }
    }
    if (extra === 'schnurrbart' && dir !== 'oben') {
      if (seite) rr(c, hx + sg * 1.4 - 1.4, hy + 1.9, 3.8, 1.2, '#5a3a28', 0.6); else { rr(c, hx - 3, hy + 1.8, 3, 1.3, '#5a3a28', 0.6); rr(c, hx, hy + 1.8, 3, 1.3, '#5a3a28', 0.6); }
    }
    if (extra === 'cap') {
      c.beginPath(); c.arc(hx, hy - 0.6, 5.1, Math.PI, 0); c.closePath(); c.fillStyle = '#1a1a22'; c.fill();
      if (dir === 'unten') rr(c, hx - 4.4, hy - 1, 8.8, 1.8, '#0e0e14', 0.8); else if (dir !== 'oben') rr(c, hx + sg * 3.4 - (sg < 0 ? 4.4 : 0), hy - 0.8, 4.4, 1.6, '#0e0e14', 0.8);
      r(c, hx - 1.6, hy - 3.6, 3.2, 0.9, '#fff8ee');
    }
    if (extra === 'hut') {
      rr(c, hx - 7, hy - 1.8, 14, 1.8, '#1a1a22', 0.9); rr(c, hx - 4.2, hy - 6.8, 8.4, 5.4, '#1a1a22', 1.8); r(c, hx - 4.2, hy - 3.4, 8.4, 1, '#c9c3d6');
    }
    if (extra === 'tracht') {
      rr(c, hx - 6, hy - 1.8, 12, 1.6, '#2f6a3f', 0.8); rr(c, hx - 4, hy - 6.4, 8, 5, '#2f6a3f', 2);
      linie(c, hx + 2.6, hy - 5, hx + 5, hy - 9, '#d8c070', 0.9); linie(c, hx + 2.6, hy - 5, hx + 4, hy - 9.4, '#e8d890', 0.5);
    }
    if (extra === 'schuhe' && o.tanzt) kreis(c, hx, hy - 8, 0.8, '#ffd75e');
  }

  function blase(c, x, y, s) {
    var w = Math.min(W - 8, breite(c, s, 11) + 14), bx = Math.round(x - w / 2), by = Math.round(y - 18);
    if (bx < 2) bx = 2; if (bx + w > W - 2) bx = W - 2 - w;
    panel(c, bx, by, w, 16, P.uiFlaeche, 5);
    poly(c, [[x - 2, by + 15.2], [x + 2, by + 15.2], [x, by + 18.6]], P.uiFlaeche);
    text(c, s, bx + w / 2, by + 8.2, P.uiTinte, 11, 'center');
  }

  function zeichneJoint(c, x, y, t) {
    var w = Math.sin(t * 3);
    ellipse(c, x, y + 4, 4.4, 1.6, 'rgba(50,30,80,0.25)');
    c.save(); c.translate(x, y + w); c.rotate(-0.25);
    rr(c, -4.6, -1.3, 9.2, 2.8, '#fff8ee', 1.4, '#8a7c9c', 0.5); rr(c, -4.8, -1.2, 2, 2.6, '#ff8f2e', 1); c.restore();
    c.globalAlpha = 0.5; kreis(c, x + 4, y - 4 + w, 1.2, '#c9c3d6'); kreis(c, x + 5.2, y - 7 + w, 1.6, '#c9c3d6'); c.globalAlpha = 1;
  }

  // ---------- Welt zeichnen ----------
  function zeichneWelt(R, S) {
    var c = R.ctx, karte = S.karte, cam = S.kamera, T = Saufi.Karte.T, sk = R.sk;
    var cx = Math.round(cam.x * sk) / sk, cy = Math.round(cam.y * sk) / sk, licht = S.licht, i;
    SH = karte.innen ? { dx: 0, lang: 0.6, a: 0 } : Sz.schattenFuer(S);
    r(c, 0, 0, W, H, '#1b1530');
    var hg = hintergrund(R, karte);
    if (hg) {
      var sx = Math.max(0, cx), sy = Math.max(0, cy), dx = sx - cx, dy = sy - cy;
      var bw = Math.min(karte.pxW - sx, W - dx), bh = Math.min(karte.pxH - sy, H - dy), bk = hg.sk;
      if (bw > 0 && bh > 0) c.drawImage(hg.canvas, Math.round(sx * bk), Math.round(sy * bk), Math.round(bw * bk), Math.round(bh * bk), dx, dy, bw, bh);
    } else {
      for (var y = Math.max(0, Math.floor(cy / K)); y <= Math.min(karte.h - 1, Math.floor((cy + H) / K)); y++)
        for (var x = Math.max(0, Math.floor(cx / K)); x <= Math.min(karte.w - 1, Math.floor((cx + W) / K)); x++) {
          if (karte.innen) In.zeichneInnenKachel(c, karte, x, y, x * K - cx, y * K - cy); else Sz.zeichneAussenKachel(c, karte, x, y, x * K - cx, y * K - cy);
        }
    }
    var t = S.t;
    if (!karte.innen) {                                           // bewegtes Wasser
      c.lineCap = 'round'; c.lineWidth = 0.7;
      for (var wy = Math.max(0, Math.floor(cy / K)); wy <= Math.min(karte.h - 1, Math.floor((cy + H) / K)); wy++)
        for (var wx = Math.max(0, Math.floor(cx / K)); wx <= Math.min(karte.w - 1, Math.floor((cx + W) / K)); wx++) {
          if (karte.tile(wx, wy) !== T.WASSER) continue;
          var o = (t * 5 + wx * 3 + wy * 5) % 16, px0 = wx * K - cx, py0 = wy * K - cy;
          c.strokeStyle = 'rgba(232,251,255,0.8)'; c.beginPath(); c.moveTo(px0 + o, py0 + 5); c.quadraticCurveTo(px0 + o + 2.5, py0 + 3.8, px0 + o + 5, py0 + 5); c.stroke();
          c.strokeStyle = 'rgba(79,176,214,0.7)'; c.beginPath(); c.moveTo(px0 + (o + 8) % 16, py0 + 11); c.quadraticCurveTo(px0 + (o + 8) % 16 + 2, py0 + 9.8, px0 + (o + 8) % 16 + 4, py0 + 11); c.stroke();
        }
    } else if (karte.id === 'disko') {
      In.tanzFlaeche(c, S, cx, cy, Math.floor(S.t / Saufi.Ton.BEAT), (S.t / Saufi.Ton.BEAT) % 1, S.boostAktiv);
    } else In.innenFensterNacht(c, karte, Math.min(0.85, licht.glut * 0.9), cx, cy);

    // Sortierte Dinge: Props, Orte-Objekte, Figuren
    var dinge = [];
    propsFuer(R, karte).forEach(function (p) { if (p.x - cx < W + 40 && p.x - cx > -140 && p.y - cy > -20 && p.y - cy < H + 120) dinge.push(p); });
    if (!karte.innen) dinge.push({ y: 15 * K + 4, x: 0, art: 'tram' });
    if (karte.id === 'hotel' && S.joint && !S.joint.gefunden) dinge.push({ y: 8 * K + 12, art: 'joint', x: 14 * K, ky: 8 * K });
    S.npcs.forEach(function (n) { if (n.aktiv && n.karteId === karte.id) dinge.push({ y: n.y, art: 'npc', n: n }); });
    if (S.zustand !== 'start') dinge.push({ y: S.spieler.y + 0.1, art: 'spieler' });
    if (karte.id === 'disko') dinge.push({ y: 10 * K + 8, art: 'tuersteher', x: 6 * K + 8, ky: 10 * K + 8 });
    dinge.sort(function (a, b) { return a.y - b.y; });
    dinge.forEach(function (d) {
      var px = d.x - cx, fy = d.y - cy;                           // d.y = Fusslinie
      if (d.art === 'geb') zeichneGebaeude(R, c, d.b, px, d.b.y * K - cy);
      else if (d.art === 'baum') { ellipse(c, px + 8 + SH.dx * 7, fy - 1, 7 + Math.abs(SH.dx) * 3, 2.6, 'rgba(50,30,80,' + (0.2 + SH.a * 0.6) + ')'); Sz.zeichneSprite(R, c, 'baum' + (d.hs % 3), 36, 38, 18, 32, px + 8, fy - 1, function (hc) { Sz.baumBild(hc, d.hs % 3); }); }
      else if (d.art === 'busch') Sz.zeichneSprite(R, c, 'busch' + (d.hs % 2), 24, 16, 12, 14, px + 8, fy - 1, function (hc) { Sz.buschBild(hc, d.hs % 2); });
      else if (d.art === 'laterne') { if (SH.a > 0.02) ellipse(c, px + 8 + SH.dx * 6, fy - 1, 5, 1.2, 'rgba(50,30,80,' + SH.a + ')'); Sz.zeichneSprite(R, c, 'laterne', 14, 28, 7, 26, px + 8, fy - 0.5, function (hc) { Sz.laterneBild(hc); }); }
      else if (d.art === 'bank') Sz.zeichneSprite(R, c, 'bank', 22, 18, 11, 16, px + 8, fy - 1, function (hc) { Sz.bankBild(hc); });
      else if (d.art === 'brunnen') { Sz.zeichneSprite(R, c, 'brunnen', 40, 42, 20, 36, px + 16, fy - 3, function (hc) { Sz.brunnenBild(hc); }); Sz.brunnenWasser(c, px + 16, fy - 3, t); }
      else if (d.art === 'tram') { var tx = ((t * 14) % (karte.pxW + 160)) - 90 - cx; if (tx > -80 && tx < W + 10) Sz.strassenbahn(c, tx, 253 - cy, t); }
      else if (d.art === 'joint') zeichneJoint(c, d.x - cx + 8, d.ky - cy + 8, t);
      else if (d.art === 'tuersteher') figur(c, { shirt: '#14102a', hose: '#14102a', haar: '#14102a', extra: 'hut' }, d.x - cx, d.ky - cy, { dir: 'unten', t: t });
      else if (d.art === 'npc') {
        var n = d.n; figur(c, n.char, n.x - cx, n.y - cy, { dir: n.dir, schritt: n.schritt, liegt: n.liegt, t: t, schwips: n.fig.pegel > 1.5, tanzt: S.tanzBeat && !n.liegt, glas: S.prost > 0 && !n.liegt });
        if (n.blase && !n.liegt) blase(c, n.x - cx, n.y - cy - 25, n.char.name + ': ' + n.blase.text);
        else if (n.liegt) text(c, 'Q = wecken', n.x - cx, n.y - cy - 16, '#ffffff', 8, 'center', P.kontur);
      }
      else if (d.art === 'spieler') {
        var sp = S.spieler, ch = S.char;
        figur(c, ch, sp.x - cx, sp.y - cy, { dir: sp.dir, schritt: sp.schritt, liegt: sp.liegt, t: t, schwips: S.fig.pegel > 1.5, tanzt: sp.tanzt > 0, glas: S.prost > 0 });
        if (!sp.liegt) {                                            // goldener Pfeil ueber dem Kopf
          var mx = sp.x - cx, my = sp.y - cy - 31 + Math.sin(t * 5) * 1.2;
          poly(c, [[mx - 3.2, my], [mx + 3.2, my], [mx, my + 4]], P.gold, P.kontur, 0.7);
        }
      }
    });
    // Effekte (Prost-Funken, Sterne)
    (S.effekte || []).forEach(function (e) {
      var a = Math.max(0, e.rest / e.dauer), age = e.dauer - e.rest;
      c.globalAlpha = Math.min(1, a); kreis(c, e.x - cx + e.vx * age, e.y - cy + e.vy * age, 1.2, e.farbe); c.globalAlpha = 1;
    });

    // Toenung: Tageslicht (draussen) oder Raumlicht (innen)
    var tint = tintFuer(S);
    c.globalCompositeOperation = 'multiply'; r(c, 0, 0, W, H, rgb(tint)); c.globalCompositeOperation = 'source-over';
    zeichneLichter(R, S, cx, cy, tint);
    var nacht = karte.innen ? 0 : Sz.nachtGrad(S.uhr.minute / 60);
    if (nacht > 0.05) {                                           // Vignette in der Nacht
      var vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.66); vg.addColorStop(0, 'rgba(10,8,40,0)'); vg.addColorStop(1, 'rgba(10,8,40,' + (0.38 * nacht).toFixed(3) + ')');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
  }

  function tintFuer(S) {
    var l = S.licht, ort = S.ort;
    if (ort === 'stadt') return { r: l.r, g: l.g, b: l.b };
    if (ort === 'disko') return mix({ r: 70, g: 62, b: 120 }, { r: 110, g: 90, b: 160 }, S.boostAktiv ? 1 : 0.0);
    return mix({ r: l.r, g: l.g, b: l.b }, { r: 255, g: 238, b: 208 }, 0.55 + 0.25 * l.glut);
  }

  // Leuchtende Fenster, Laternenkegel, Neon und Disko-Show nach der Toenung
  function zeichneLichter(R, S, cx, cy, tint) {
    var c = R.ctx, karte = S.karte, l = S.licht, t = S.t;
    c.globalCompositeOperation = 'lighter';
    if (!karte.innen) {
      var glut = l.glut, lampen = l.lampen;
      karte.gebaeude.forEach(function (b) {
        var plan = bauplan(b), offen = Saufi.Uhr.offen(b.id, S.uhr.minute);
        if (glut > 0.02) plan.fenster.forEach(function (f) {
          if (!offen && b.id !== 'hotel') return;
          var gg = glut * glut, fx = f.x - cx, fy = f.y - cy;
          c.globalAlpha = 0.55 * gg; G.glanz(c, fx + f.w / 2, plan.y0 + plan.h - cy + 5, 26, 'rgba(255,170,70,0.6)', 'rgba(255,170,70,0)');
          c.globalAlpha = 0.5 * gg; rr(c, fx - 2.5, fy - 2.5, f.w + 5, f.h + 5, 'rgba(255,159,58,0.7)', 3);
          c.globalAlpha = 0.9 * gg; rr(c, fx, fy, f.w, f.h, P.fensterNacht, 1.4);
          c.globalAlpha = 0.25 * gg; rr(c, fx + 2, fy + 2, Math.max(0, f.w - 4), Math.max(0, f.h - 4), P.fensterKern, 1);
        });
        var an = offen || b.id === 'hotel';
        if (an) plan.neon.forEach(function (n) {
          var p = 0.65 + 0.35 * Math.sin(t * 5 + n.x * 0.1), a = Math.max(l.glut, b.id === 'disko' ? 0.35 : 0) * p;
          c.globalAlpha = Math.min(1, a * 0.6); G.glanz(c, n.x + n.w / 2 - cx, n.y + n.h / 2 - cy, Math.max(n.w * 0.5, 12), n.farbe, 'rgba(0,0,0,0)');
          c.globalAlpha = Math.min(1, a * 0.6); rr(c, n.x - cx - 2, n.y - cy - 2, n.w + 4, n.h + 4, n.farbe, 2.5);
          c.globalAlpha = Math.min(1, a * 1.3); rr(c, n.x - cx, n.y - cy, n.w, n.h, n.farbe, 1);
        });
        if (glut > 0.05 && an) {                                   // Tuer-Lichtinsel
          var d = plan.tuer, grd = c.createRadialGradient(d.x - cx + 8, d.y - cy + 14, 2, d.x - cx + 8, d.y - cy + 14, 34);
          grd.addColorStop(0, 'rgba(255,190,110,0.55)'); grd.addColorStop(1, 'rgba(255,190,110,0)');
          c.globalAlpha = glut; c.fillStyle = grd; c.fillRect(d.x - cx - 30, d.y - cy - 20, 76, 70);
        }
      });
      if (lampen > 0.02) {
        propsFuer(R, karte).forEach(function (p) {
          if (p.art !== 'laterne') return;
          var lx = p.x - cx + 8, kopf = p.ly * K - cy - 1, boden = p.ly * K - cy + 14;
          if (lx < -50 || lx > W + 50 || boden < -50 || boden > H + 60) return;
          var cone = c.createLinearGradient(0, kopf, 0, boden + 6); cone.addColorStop(0, 'rgba(255,225,150,0.5)'); cone.addColorStop(1, 'rgba(255,200,110,0.1)');
          c.globalAlpha = lampen; c.fillStyle = cone;
          c.beginPath(); c.moveTo(lx - 1.6, kopf); c.lineTo(lx + 1.6, kopf); c.lineTo(lx + 17, boden + 6); c.lineTo(lx - 17, boden + 6); c.closePath(); c.fill();
          G.glanz(c, lx, boden + 1, 40, 'rgba(255,214,130,0.62)', 'rgba(255,190,100,0)');
          G.glanz(c, lx, kopf + 2, 9, 'rgba(255,240,190,0.95)', 'rgba(255,220,140,0)');
        });
      }
      if (glut > 0.4) {                                            // schwache Gebaeudekanten, damit man nachts navigieren kann
        c.globalAlpha = 0.16 * glut;
        karte.gebaeude.forEach(function (b) { var pl = bauplan(b); c.fillStyle = '#8f8fff'; c.fillRect(pl.x0 - cx, pl.y0 - cy + 14, pl.w, 1); c.fillRect(pl.x0 - cx, pl.y0 + pl.h - cy, pl.w, 1); c.fillRect(pl.x0 - cx, pl.y0 - cy + 14, 1, pl.h - 14); c.fillRect(pl.x0 + pl.w - 1 - cx, pl.y0 - cy + 14, 1, pl.h - 14); });
      }
    } else if (karte.id === 'disko') In.diskoLichter(c, S, cx, cy);
    else In.raumLichter(c, S, cx, cy);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // ---------- HUD ----------
  function krug(c, x, y, pegel) {
    var f = Math.max(0, Math.min(1, pegel / 4)), col = pegel < 1.5 ? P.bier : (pegel < 3 ? P.bierOrange : P.bierRot);
    rr(c, x + 11, y + 4, 4.4, 8, 'rgba(0,0,0,0)', 2.2, P.kontur, 1);
    rr(c, x, y, 12, 16, '#eaf8ff', 2.6, P.kontur, 0.9);
    var hh = 12.4 * f;
    if (hh > 0.5) { vlauf(c, x + 1.2, y + 14.4 - hh, 9.6, hh, heller(col, 0.25), col); r(c, x + 1.2, y + 14.4 - hh, 9.6, Math.min(1.4, hh), '#fff8ee'); }
    r(c, x + 2, y + 2, 1.2, 10, 'rgba(255,255,255,0.7)');
  }
  function hud(R, S) {
    var c = R.ctx, fig = S.fig, uhr = S.uhr, i;
    // links oben: Pegel, Standfestigkeit, Teamstimmung
    panel(c, 3, 3, 96, 62, 'rgba(255,248,238,0.94)', 6);
    krug(c, 8, 7, fig.pegel);
    var pt = S.joint && Saufi.Ereignisse.Joint.schwammig(S.joint) ? '~' + Saufi.Pegel.anzeige(fig.pegel + Math.sin(S.t * 5) * 0.4) : Saufi.Pegel.anzeige(fig.pegel);
    text(c, pt + ' ‰', 30, 15, fig.pegel >= 3 ? P.bierRot : P.uiTinte, 12);
    var herzen = Math.ceil(fig.stand / 20);
    for (i = 0; i < 5; i++) { var voll = fig.stand >= (i + 1) * 20 - 0.01; herz(c, 8 + i * 11, 28, voll ? P.herzVoll : (i < herzen ? P.herzLicht : P.herzLeer)); }
    text(c, 'Team', 8, 43, P.uiTinteWeich, 8);
    for (i = 0; i < 5; i++) rr(c, 36 + i * 11, 39.4, 9, 7.6, i < S.runden.team ? '#5ec8b8' : P.herzLeer, 2.4, P.kontur, 0.7);
    r(c, 8, 52.4, 3.6, 8.4, '#8fd4f0'); rr(c, 7.4, 51.4, 4.8, 3, '#4fb0d6', 1.2); text(c, 'x' + S.flaschen, 15, 56.6, P.uiTinte, 9);
    if (S.joint && (S.joint.hat || S.joint.doppelt)) text(c, S.joint.doppelt ? 'x2!' : 'R: Tüte', 38, 56.6, '#d9701a', 8.5);
    // Mitte oben: Uhr mit Himmelsfenster
    var pw = 108, px = Math.round(W / 2 - pw / 2) + 2;
    panel(c, px, 3, pw, 30, 'rgba(255,248,238,0.94)', 7);
    Sz.himmelIcon(c, px + 17, 18, 11.5, uhr.minute / 60, S.t);
    text(c, Saufi.Uhr.text(uhr), px + 66, 12.4, P.uiTinte, 13, 'center');
    text(c, Saufi.Uhr.tag(uhr).slice(0, 2) + ' · ' + Saufi.Uhr.phase(uhr), px + 66, 25, P.uiTinteWeich, 8, 'center');
    text(c, '★ ' + S.punkte.punkte, px + pw / 2, 41, P.uiTinte, 10, 'center', 'rgba(255,248,238,0.95)');
    // Runde
    var nr = Saufi.Runden.naechste(S.runden);
    if (nr && (nr.status === 'warnung' || nr.status === 'aktiv')) {
      var aktiv = nr.status === 'aktiv', rest = aktiv ? nr.zeit + Saufi.Runden.FRIST_MIN - uhr.minute : nr.zeit - uhr.minute;
      var rw = 196, rx = Math.round(W / 2 - rw / 2) + 2, ry = 50, blink = aktiv && Math.floor(S.t * 3) % 2 === 0;
      panel(c, rx, ry, rw, 22, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8', 6);
      text(c, (aktiv ? 'RUNDE! ' : 'Runde ' + Saufi.Uhr.zeitText(nr.zeit) + ': ') + Saufi.Karte.NAMEN[nr.ort], rx + rw / 2, ry + 7.4, P.uiTinte, 8.5, 'center');
      var frac = Math.max(0, Math.min(1, rest / (aktiv ? Saufi.Runden.FRIST_MIN : Saufi.Runden.VORLAUF_MIN)));
      rr(c, rx + 10, ry + 14, rw - 20, 4.4, 'rgba(74,53,96,0.25)', 2.2); if (frac > 0.01) rr(c, rx + 10, ry + 14, (rw - 20) * frac, 4.4, aktiv ? '#e0504a' : '#f0b030', 2.2);
    }
    // Scooter-Leiste (nur in der Disko)
    if (S.ort === 'disko') {
      var bw = 150, bx = Math.round(W / 2 - bw / 2) + 2, by = H - 40, b = S.boost, f = b.leiste, pulse = f >= 1 && Math.floor(S.t * 4) % 2 === 0;
      panel(c, bx - 6, by - 5, bw + 12, 21, 'rgba(42,35,66,0.92)', 7);
      rr(c, bx, by, bw, 11, 'rgba(255,255,255,0.12)', 5.5, P.kontur, 0.7); if (f > 0.02) rr(c, bx + 0.8, by + 0.8, (bw - 1.6) * f, 9.4, pulse ? '#ffffff' : P.neonPink, 4.7);
      text(c, S.boostAktiv ? 'HYPER HYPER!' : (f >= 1 ? 'R: HYPER-BOOST!' : 'SCOOTER · E tanzen'), bx + bw / 2, by + 5.8, S.boostAktiv ? P.neonGelb : '#ffffff', 8, 'center', 'rgba(30,10,60,0.9)');
    }
    // Navigationspfeil
    if (S.pfeil) pfeil(R, S.pfeil.x, S.pfeil.y);
    // Banner
    var h = Saufi.Hinweise.aktuell(S.hinweise);
    if (h) {
      var a = Math.min(1, h.rest * 3);
      c.globalAlpha = a;
      if (h.art === 'gross') { var y0 = Math.round(H * 0.42) + (Math.floor(S.t * 8) % 2); text(c, h.text, Math.round(W / 2), y0, '#ffe84f', 18, 'center', P.kontur); }
      else {
        var zl = umbruch(c, h.text, W - 80, 9), hh2 = zl.length * 11.4 + 8, wy = H - 30 - hh2 - (S.ort === 'disko' ? 20 : 0), mw = 0, mx = Math.round(W / 2);
        zl.forEach(function (z) { mw = Math.max(mw, breite(c, z, 9)); });
        var bw2 = Math.min(W - 40, Math.round(mw) + 24);
        panel(c, mx - Math.round(bw2 / 2), wy, bw2, hh2, h.art === 'schlecht' ? '#ffd1da' : (h.art === 'gut' ? '#d8f5dc' : P.uiFlaeche), 7);
        zl.forEach(function (z, k) { text(c, z, mx, wy + 8 + k * 11.4, P.uiTinte, 9, 'center'); });
      }
      c.globalAlpha = 1;
    }
    // Hilfe unten
    if (S.hilfe) {
      var hw = breite(c, S.hilfe, 9) + 20;
      panel(c, Math.round(W / 2 - hw / 2), H - 22, hw, 17, 'rgba(255,248,238,0.96)', 7); text(c, S.hilfe, Math.round(W / 2), H - 13.4, P.uiTinte, 9, 'center');
    }
  }
  function pfeil(R, wx, wy) {
    var c = R.ctx, cx = W / 2, cy = H / 2, dx = wx - cx, dy = wy - cy;
    var inside = wx > 10 && wx < W - 10 && wy > 50 && wy < H - 24;
    if (inside) { var bob = Math.sin(Date.now() / 160) * 2; poly(c, [[wx - 6, wy - 22 + bob], [wx + 6, wy - 22 + bob], [wx, wy - 11 + bob]], '#ffd75e', P.kontur, 1); return; }
    var ang = Math.atan2(dy, dx), rad = Math.min(cx - 14, (cy - 28) / Math.max(0.2, Math.abs(Math.sin(ang))), (cx - 14) / Math.max(0.2, Math.abs(Math.cos(ang))));
    var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    py = Math.max(56, Math.min(H - 26, py)); px = Math.max(12, Math.min(W - 12, px));
    c.save(); c.translate(px, py); c.rotate(ang);
    poly(c, [[9, 0], [-5, -7], [-3, 0], [-5, 7]], '#ffd75e', P.kontur, 1); c.restore();
    text(c, 'HIER SOLLST DU HIN', Math.round(W / 2), 80, P.uiTinte, 8, 'center', 'rgba(255,248,238,0.9)');
  }

  // ---------- Menues und Bildschirme ----------
  function abdunkeln(c, a) { c.fillStyle = 'rgba(42,34,54,' + a + ')'; c.fillRect(0, 0, W, H); }
  function knopfZeile(c, x, y, w, h, sel, label, aktiv, rechts, blink) {
    rr(c, x, y, w, h, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, Math.min(6, h / 2.4), sel ? P.kontur : 'rgba(74,53,96,0.25)', sel ? 0.9 : 0.6);
    text(c, label, x + 7, y + h / 2 + 0.3, aktiv === false ? '#b3a5c2' : P.uiTinte, 11);
    if (rechts) text(c, rechts, x + w - 7, y + h / 2 + 0.3, P.uiTinteWeich, 11, 'right');
  }
  function schliessX(R, bx, by, bw) {
    var c = R.ctx, x = bx + bw - 16, y = by + 4;
    rr(c, x, y, 12, 12, '#ffd1da', 3, P.kontur, 0.7);
    text(c, '×', x + 6, y + 6.2, P.bierRot, 12, 'center');
    R.treffer.push({ x: x, y: y, w: 12, h: 12, i: 'x' });
  }
  function zeichneListe(R, titel, kopf, eintraege, index, o) {
    var c = R.ctx, bw = o && o.breite || 240, kopfH = kopf.length * 12;
    var rowH = o && o.zeile || (R.hochkant ? 26 : 18);
    var frei = H - 12 - 32 - kopfH;
    rowH = Math.max(14, Math.min(rowH, Math.floor(frei / Math.max(1, eintraege.length))));
    var bh = 32 + kopfH + eintraege.length * rowH + 6, bx = Math.round((W - bw) / 2), by = Math.round(Math.max(4, (H - bh) / 2));
    abdunkeln(c, 0.55);
    panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    text(c, titel, bx + bw / 2, by + 13, P.uiTinte, 12, 'center');
    schliessX(R, bx, by, bw);
    kopf.forEach(function (z, i) { text(c, z, bx + bw / 2, by + 27 + i * 12, P.uiTinteWeich, 11, 'center'); });
    eintraege.forEach(function (e, i) {
      var ey = by + 28 + kopfH + i * rowH;
      knopfZeile(c, bx + 9, ey, bw - 18, rowH - 2, i === index, e.label, e.aktiv, e.rechts);
      R.treffer.push({ x: bx + 9, y: ey, w: bw - 18, h: rowH - 2, i: i });
    });
  }

  function startBild(R, S) {
    var c = R.ctx, t = S.t;
    Sz.kesselSzene(c, W, H, 8 + (t * 0.35) % 20, t);                    // Tageslauf im Hintergrund
    var grd = c.createRadialGradient(W / 2, 28, 4, W / 2, 28, 130); grd.addColorStop(0, 'rgba(255,79,160,0.3)'); grd.addColorStop(1, 'rgba(255,79,160,0)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    var zeilen = Saufi.Hinweise.HINWEIS_START, lz = 10.6, bh = zeilen.length * lz + 10, gesamt = 46 + bh + 8 + 2 * 20 + 14;
    var y0 = Math.max(4, Math.round((H - gesamt) / 2));
    text(c, 'Press11 - Saufi Saufi', W / 2, y0 + 10, '#fff8ee', 18, 'center', P.kontur);
    text(c, 'Stuttgart, Samstag 08:00 bis Sonntag 04:00', W / 2, y0 + 27, '#fff3c8', 9, 'center', P.kontur);
    var by = y0 + 38;
    panel(c, 16, by, W - 32, bh, 'rgba(255,248,238,0.96)', 8);
    zeilen.forEach(function (z, i) { text(c, z, W / 2, by + 9 + i * lz, i === 0 ? P.bierRot : P.uiTinte, 8, 'center'); });
    var ey = by + bh + 8;
    R.treffer = [];
    var eintraege = [{ label: 'Ich bin 18+. Los geht\'s! (E / Tippen)' }, { label: 'Scooter-Playlist (P)' }];
    eintraege.forEach(function (e, i) {
      var sel = i === S.startIndex, ry = ey + i * 20, blink = sel && Math.floor(t * 2) % 2 === 0;
      rr(c, 40, ry, W - 80, 17, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, 7, sel ? P.kontur : 'rgba(74,53,96,0.3)', 0.9);
      text(c, e.label, W / 2, ry + 8.8, P.uiTinte, 9, 'center');
      R.treffer.push({ x: 40, y: ry, w: W - 80, h: 17, i: i });
    });
    text(c, S.best ? 'Bestwert: ' + S.best + ' Punkte' : 'Ab 18 · Fiktives Spaß-Spiel', W / 2, ey + 2 * 20 + 6, '#fff3c8', 8, 'center', P.kontur);
  }

  function endeBild(R, S) {
    var c = R.ctx, e = S.ende, sieg = e.sieg, t = S.t;
    Sz.kesselSzene(c, W, H, sieg ? 28 : 26, t);
    if (sieg) { var sy = Math.round(H * 0.5) - Math.min(1, e.t / 6) * 8; G.glanz(c, W / 2, sy, 40, 'rgba(255,230,160,0.7)', 'rgba(255,230,160,0)'); kreis(c, W / 2, sy, 11, '#ffe58a'); kreis(c, W / 2, sy, 7.4, '#fff6c8'); }
    var w = e.wertung, ph = H - 16;
    panel(c, 20, 8, W - 40, ph, 'rgba(255,248,238,0.95)', 10);
    var kopf = w.kopf || (sieg ? 'Du stehst noch, Saufi.' : 'Press F to pay respects.');
    text(c, kopf, W / 2, 26, sieg ? '#2f8a4a' : P.bierRot, kopf.length > 28 ? 12 : 14, 'center');
    umbruch(c, sieg ? 'Sonntag, 04:00. Sonnenaufgang überm Kessel. MS-Marathon geschafft.' : e.grund, W - 70, 11).slice(0, 3).forEach(function (z, i) { text(c, z, W / 2, 42 + i * 12, P.uiTinteWeich, 11, 'center'); });
    var y = 66;
    text(c, (w.medaille ? w.medaille + ': ' : '') + w.titel, W / 2, y, P.uiTinte, 12, 'center');
    text(c, 'Punkte: ' + S.punkte.punkte + (e.neuerBestwert ? '  (neuer Bestwert!)' : (S.best ? '  (Bestwert ' + S.best + ')' : '')), W / 2, y + 16, P.uiTinte, 9, 'center');
    text(c, 'Runden mitgetrunken: ' + S.runden.geschafft + ' von ' + S.runden.runden.length + ' · Team ' + S.runden.team + '/5', W / 2, y + 28, P.uiTinteWeich, 8, 'center');
    text(c, Saufi.Hinweise.DANKE, W / 2, y + 42, P.uiTinte, 9, 'center');
    R.treffer = [];
    var blink = Math.floor(t * 2) % 2 === 0, by = Math.min(H - 42, y + 54);
    rr(c, 56, by, W - 112, 18, blink ? '#fff3b0' : '#ffe9a8', 7, P.kontur, 0.9); text(c, 'E / Tippen: Neustart', W / 2, by + 9.2, P.uiTinte, 9, 'center');
    R.treffer.push({ x: 56, y: by, w: W - 112, h: 18, i: 0 });
  }

  function pressFBild(R, S) {
    var c = R.ctx, p = S.pressF, hat = p.zweitesLeben;
    c.fillStyle = 'rgba(10,6,20,0.72)'; c.fillRect(0, 0, W, H);
    text(c, 'F', W / 2, H * 0.30, '#ffffff', 50 + Math.sin(S.t * 14) * 2, 'center', P.kontur);
    text(c, hat ? 'Press F! Steh wieder auf!' : 'Press F to pay respects', W / 2, H * 0.54, '#ffe84f', 13, 'center', P.kontur);
    if (hat) {
      text(c, 'Drück F (oder tipp) ' + p.noetig + ' Mal in 3 Sekunden: ' + p.n + '/' + p.noetig, W / 2, H * 0.65, '#ffffff', 8.5, 'center', P.kontur);
      rr(c, W / 2 - 60, H * 0.73, 120, 8, 'rgba(255,255,255,0.18)', 4, '#ffffff', 0.7); if (p.rest > 0) rr(c, W / 2 - 59, H * 0.73 + 1, 118 * Math.max(0.02, Math.min(1, p.rest / 3)), 6, '#ff5f8a', 3);
    } else {
      text(c, 'Kein zweites Leben mehr. Drück F.', W / 2, H * 0.65, '#ffffff', 9, 'center', P.kontur);
    }
  }

  function textFeld(R, titel, absaetze, fussEintraege, index) {
    var c = R.ctx, bw = W - 28, zl = [], lz = 12;
    absaetze.forEach(function (a) { umbruch(c, a, bw - 26, 11).forEach(function (z) { zl.push(z); }); zl.push(''); });
    var fh = fussEintraege.length * 20, bh = 34 + zl.length * lz + fh + 4, bx = 14;
    if (bh > H - 6) { lz = (H - 6 - 36 - fh) / Math.max(1, zl.length); bh = H - 6; }
    var by = Math.round(Math.max(3, (H - bh) / 2));
    abdunkeln(c, 0.6); panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    text(c, titel, W / 2, by + 13, P.uiTinte, 12, 'center');
    schliessX(R, bx, by, bw);
    zl.forEach(function (z, i) { text(c, z, bx + 13, by + 28 + i * lz, P.uiTinte, 11); });
    fussEintraege.forEach(function (e, i) {
      var ey = by + 28 + zl.length * lz + i * 20, sel = i === index;
      knopfZeile(c, bx + 50, ey, bw - 100, 17, sel, e.label, true); R.treffer.push({ x: bx + 50, y: ey, w: bw - 100, h: 17, i: i });
    });
  }

  // Playlist-Bild: Titelliste in zwei Spalten, Status, Knoepfe, X zum Schliessen.
  // Panel muss immer in W×H passen (by >= 2, by + bh <= H - 2); Querformat kompakt (Schrift 9–10, Titel kürzen).
  function playlistBild(R, S) {
    var c = R.ctx, o = S.overlay, Mu = Saufi.Musik, z = S.musikInfo || {};
    var bw = W - 20, bx = 10, tl = Mu.TITEL, zeilen = Math.ceil(tl.length / 2), nBtn = o.eintraege.length;
    var maxBh = H - 4, hoch = R.hochkant;
    var kopfH = hoch ? 26 : 20, songSz = hoch ? 11 : 9, lz = hoch ? 12 : 10;
    var metaSz = hoch ? 11 : 9, metaLz = hoch ? 12 : 10, rowH = hoch ? 24 : 14;
    var qn = { mp3: 'Eigene MP3 (music/)', youtube: 'YouTube-Einbettung', webaudio: 'Eigener Spiel-Beat' }[z.quelle] || z.quelle;
    var quelleText = 'Quelle: ' + qn + (z.spielt ? ' (läuft: ' + ({ mp3: 'MP3', youtube: 'YouTube', webaudio: 'Beat' }[z.aktiv]) + ')' : '');
    var hint = z.hinweis || (z.youtubeVerfuegbar
      ? 'YouTube: ' + Mu.VIDEOS.length + ' Videos (' + Mu.VIDEOS.map(function (v) { return v.titel.replace(/^Scooter - /, '').replace(/ \(Official Video( HQ)?\)/, ''); }).join(', ') + ')'
      : 'YouTube nur über http://localhost, nicht file://');
    function bhVon(kH, lz2, mLz, rH) { return kH + zeilen * lz2 + 4 + 2 * mLz + 4 + nBtn * rH + 4; }
    var bh = bhVon(kopfH, lz, metaLz, rowH);
    while (bh > maxBh && rowH > 12) { rowH--; bh = bhVon(kopfH, lz, metaLz, rowH); }
    while (bh > maxBh && lz > 9) { lz--; bh = bhVon(kopfH, lz, metaLz, rowH); }
    while (bh > maxBh && metaLz > 9) { metaLz--; bh = bhVon(kopfH, lz, metaLz, rowH); }
    while (bh > maxBh && kopfH > 18) { kopfH--; bh = bhVon(kopfH, lz, metaLz, rowH); }
    if (bh > maxBh) {
      var rest = maxBh - (kopfH + zeilen * lz + 4 + 2 * metaLz + 4 + 4);
      rowH = Math.max(12, Math.floor(rest / Math.max(1, nBtn)));
      bh = Math.min(maxBh, bhVon(kopfH, lz, metaLz, rowH));
    }
    var by = Math.round(Math.max(2, (H - bh) / 2));
    if (by + bh > H - 2) by = Math.max(2, H - 2 - bh);
    abdunkeln(c, 0.6); panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    text(c, 'Scooter-Playlist', W / 2, by + kopfH * 0.55, P.uiTinte, hoch ? 12 : 11, 'center');
    schliessX(R, bx, by, bw);
    var colW = (bw - 20) / 2;
    tl.forEach(function (t2, i) {
      var label = kuerze(c, (i + 1) + '. ' + t2, colW - 4, songSz);
      text(c, label, bx + 10 + (i >= zeilen ? colW : 0), by + kopfH + (i % zeilen) * lz + lz * 0.35, P.uiTinte, songSz);
    });
    var sy = by + kopfH + zeilen * lz + 2;
    text(c, kuerze(c, quelleText, bw - 16, metaSz), W / 2, sy + metaLz * 0.45, P.uiTinteWeich, metaSz, 'center');
    text(c, kuerze(c, hint, bw - 16, metaSz), W / 2, sy + metaLz + metaLz * 0.45, P.uiTinteWeich, metaSz, 'center');
    var ey0 = sy + 2 * metaLz + 2;
    o.eintraege.forEach(function (e, i) {
      var ey = ey0 + i * rowH;
      knopfZeile(c, bx + 8, ey, bw - 16, rowH - 2, i === o.index, e.label, true, e.rechts);
      R.treffer.push({ x: bx + 8, y: ey, w: bw - 16, h: rowH - 2, i: i });
    });
  }

  function uebergangBild(R, S) {
    if (S.uebergang) { var u = S.uebergang, a = u.t < u.dauer / 2 ? u.t / (u.dauer / 2) : 1 - (u.t - u.dauer / 2) / (u.dauer / 2); R.ctx.globalAlpha = Math.max(0, Math.min(1, a)); r(R.ctx, 0, 0, W, H, '#14102a'); R.ctx.globalAlpha = 1; }
  }

  // ---------- Ganzes Bild ----------
  function zeichne(R, S) {
    var c = R.ctx, sk = R.sk;
    c.setTransform(sk, 0, 0, sk, 0, 0);
    glaettung(R);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    R.treffer = []; R.panel = null;
    if (S.zustand === 'start') { startBild(R, S); if (S.overlay && S.overlay.art === 'info') textFeld(R, 'Hinweis 18+', [Saufi.Hinweise.HINWEIS_VOLL], [{ label: 'Zurück' }], 0); if (S.overlay && S.overlay.art === 'playlist') playlistBild(R, S); return; }
    var wackel = !S.ruhig && S.fig.pegel >= 1.5, amp = Math.min(2, (S.fig.pegel - 1) * 0.8);
    S.doppelt = wackel;
    c.save();
    if (wackel) c.translate(Math.sin(S.t * 2.1) * amp, Math.cos(S.t * 1.7) * amp);
    zeichneWelt(R, S);
    if (wackel) {                                   // doppeltes Neon-Glimmern
      c.globalAlpha = 0.25 + Math.min(0.2, (S.fig.pegel - 1.5) * 0.1); c.globalCompositeOperation = 'lighter';
      c.drawImage(R.canvas, 0, 0, R.canvas.width, R.canvas.height, 3, 0, W, H); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    c.restore();
    if (S.zustand === 'ende') { endeBild(R, S); return; }
    hud(R, S);
    if (S.zustand === 'umgefallen') pressFBild(R, S);
    if (S.overlay) {
      if (S.overlay.art === 'playlist') playlistBild(R, S);
      else if (S.overlay.art === 'info') textFeld(R, 'Hinweis 18+', [Saufi.Hinweise.HINWEIS_VOLL], [{ label: 'Zurück' }], 0);
      else if (S.overlay.art === 'minispiel') {
        var mg = S.overlay, kopf = [mg.hinweis || '', mg.feedback || '', (mg.score != null ? 'Treffer: ' + mg.score + (mg.ziel ? '/' + mg.ziel : '') : '')];
        if (mg.balken != null) kopf.push('Balken: ' + Math.round(Math.min(1, mg.balken) * 100) + '%');
        zeichneListe(R, mg.titel, kopf.filter(Boolean), mg.eintraege, mg.index || 0, mg.opt);
      } else zeichneListe(R, S.overlay.titel, S.overlay.kopf || [], S.overlay.eintraege, S.overlay.index, S.overlay.opt);
    }
    uebergangBild(R, S);
  }

  Saufi.Render = {
    P: P, K: K, erstelle: erstelle, setzeBildschirm: setzeBildschirm, setzeAufloesung: setzeAufloesung, zeichne: zeichne, bauplan: bauplan, figur: figur,
    W: BASE_W, H: BASE_H, BASE_W: BASE_W, BASE_H: BASE_H, PORT_H: PORT_H, MAX_BREITE: MAX_BREITE, MAX_BG_SKALA: MAX_BG_SKALA
  };
})(globalThis);
