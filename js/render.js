/* Zeichnen: Welt (gecachter Vektor-Hintergrund, Props, Figuren, Licht), HUD, Menues und Bildschirme.
   Spiellogik und Eingabe rechnen in logischen Koordinaten (320x176, Hochkant 320x400). Der Canvas hat CSS-Groesse * min(devicePixelRatio, MAX_DPR)
   Pixel; jedes Bild beginnt mit ctx.setTransform(skala,...). Alles per Code, keine fremden Grafiken (Details: gfx.js, szene.js, innen.js). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var G = Saufi.Gfx, Sz = Saufi.Szene, In = Saufi.Innen;
  var P = G.P, hash = G.hash, r = G.r, rr = G.rr, box = G.box, kreis = G.kreis, ellipse = G.ellipse, poly = G.poly, linie = G.linie, vlauf = G.vlauf, herz = G.herz;
  var text = G.text, breite = G.breite, umbruch = G.umbruch, kuerze = G.kuerze, textInBox = G.textInBox, panel = G.panel, rgb = G.rgb, mix = G.mix;
  var BASE_W = 320, BASE_H = 176, PORT_H = 400, PORT_H_MIN = 280, PORT_H_MAX = 720, K = 16;
  // Kamera rausgezoomt; Querformat staerker (niedrigeres VH). HUD bleibt in Bildschirmkoordinaten (W×H)
  // UI_RESERVE_HOCH: Dunkelfeld unten ohne Touch; UI_RESERVE_HOCH_TOUCH schmaler (DOM-Leiste darunter); STADT_PX_H = 40×60
  var WELT_FLAECHE_HOCH = 2.1, WELT_FLAECHE_QUER = 4.0, MIN_WELT_ZOOM = 0.5, UI_RESERVE_HOCH = 80, UI_RESERVE_HOCH_TOUCH = 48, STADT_PX_H = 960;
  var WELT_FLAECHE = WELT_FLAECHE_QUER, WELT_ZOOM = 1 / Math.sqrt(WELT_FLAECHE);
  var MAX_BREITE = 4096, MAX_BG_SKALA = 6, MAX_DPR = 2;
  // Laternenkegel-Radius (Weltpixel); v06 war 44 → v08 kleiner/weicher
  var LATERNE_RADIUS = 22;
  var SCHILD_NACHT_ALPHA = 0.35;
  var W = BASE_W, H = BASE_H, VW = BASE_W / WELT_ZOOM, VH = BASE_H / WELT_ZOOM;
  var SH = { dx: 0, lang: 0.6, a: 0 };           // Schatten der aktuellen Uhrzeit
  function weltView() { return { w: VW, h: VH, zoom: WELT_ZOOM, flaeche: WELT_FLAECHE }; }
  // Logische Hochformat-Hoehe aus Viewport-Seitenverhaeltnis (W fest 320)
  function berechnePortH(availW, availH) {
    availW = Math.max(1, availW || 1); availH = Math.max(1, availH || 1);
    return Math.max(PORT_H_MIN, Math.min(PORT_H_MAX, Math.round(BASE_W * availH / availW)));
  }

  // ---------- Aufloesung ----------
  function erstelle(canvas, doc) {
    var ctx = canvas.getContext('2d');
    doc = doc || canvas.ownerDocument || null;
    var neueLeinwand = (doc && typeof doc.createElement === 'function') ? function (w, h) {
      try { var cv = doc.createElement('canvas'); if (!cv || !cv.getContext) return null; cv.width = w; cv.height = h; return cv; } catch (e) { return null; }
    } : null;
    var R = { canvas: canvas, ctx: ctx, neueLeinwand: neueLeinwand, hg: {}, spr: {}, props: {}, treffer: [], panel: null, W: W, H: H, VW: VW, VH: VH, weltZoom: WELT_ZOOM, weltH: H, stadtPxH: STADT_PX_H, hochkant: false, touch: false, sk: 1, spSk: 1, cssW: 0, cssH: 0, dpr: 1 };
    glaettung(R);
    return R;
  }
  function glaettung(R) {
    var c = R.ctx;
    if ('imageSmoothingEnabled' in c) c.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in c) c.imageSmoothingQuality = 'high';
  }
  // devicePixelRatio auf MAX_DPR begrenzen (Hoch-Touch max 2; nie 3)
  function begrenzDpr(dpr, hochTouch) {
    dpr = dpr > 0 ? dpr : 1;
    var max = hochTouch ? Math.min(2, MAX_DPR) : MAX_DPR;
    return Math.min(max, dpr);
  }
  // Backing-Store = CSS-Groesse * begrenztes DPR (hoechstens MAX_BREITE breit). Rueckgabe: Skala (Geraete-Pixel je logischem Pixel)
  function setzeAufloesung(R, cssW, cssH, dpr) {
    dpr = begrenzDpr(dpr, R.hochkant && R.touch);
    var bw = Math.round((cssW > 0 ? cssW : W) * dpr);
    bw = Math.max(W, Math.min(MAX_BREITE, bw));
    var sk = bw / W, bh = Math.max(1, Math.round(H * sk));
    var altCssW = R.cssW, altCssH = R.cssH, altDpr = R.dpr, altSk = R.sk;
    R.cssW = cssW; R.cssH = cssH; R.dpr = dpr;
    if (R.canvas) { if (R.canvas.width !== bw) R.canvas.width = bw; if (R.canvas.height !== bh) R.canvas.height = bh; glaettung(R); }
    R.sk = sk;
    // Hintergrund und Sprites: gleiche Skala, in Halbschritten, nur bei Wechsel neu bauen
    var bg = Math.min(MAX_BG_SKALA, Math.max(1, Math.ceil(sk * 2) / 2));
    if (bg !== R.spSk) { R.spSk = bg; R.hg = {}; R.spr = {}; R.cacheInvalidierungen = (R.cacheInvalidierungen || 0) + 1; }
    else if (altCssW === cssW && altCssH === cssH && altDpr === dpr && altSk === sk) { /* unveraendert: kein Cache-Reset */ }
    return sk;
  }
  function setzeBildschirm(R, hoch, opt) {
    R.hochkant = !!hoch; W = BASE_W;
    if (hoch) {
      var wunsch = opt && opt.h != null ? opt.h : PORT_H;
      H = Math.max(PORT_H_MIN, Math.min(PORT_H_MAX, Math.round(wunsch)));
    } else H = BASE_H;
    var altZoom = R.weltZoom, altFlaeche = R.weltFlaeche;
    WELT_FLAECHE = hoch ? WELT_FLAECHE_HOCH : WELT_FLAECHE_QUER;
    WELT_ZOOM = Math.max(MIN_WELT_ZOOM, 1 / Math.sqrt(WELT_FLAECHE));
    R.W = W; R.H = H; R.weltFlaeche = WELT_FLAECHE;
    VW = W / WELT_ZOOM;
    var stadtPxH = (opt && opt.stadtPxH != null) ? opt.stadtPxH : (R.stadtPxH != null ? R.stadtPxH : STADT_PX_H);
    R.stadtPxH = stadtPxH;
    // Hoch: Welt fuellt fast H, unten nur UI_RESERVE (Touch: schmaler); VH an Stadtkartenhoehe kappen
    if (hoch) {
      var touchModus = (opt && opt.touch != null) ? !!opt.touch : !!R.touch;
      var reserve = touchModus ? UI_RESERVE_HOCH_TOUCH : UI_RESERVE_HOCH;
      var weltHZiel = Math.max(1, H - reserve);
      VH = Math.min(weltHZiel / WELT_ZOOM, stadtPxH);
      R.weltH = Math.round(VH * WELT_ZOOM);
      // Touch: Reserve darf nicht durch Stadtkappe groesser als UI_RESERVE_HOCH_TOUCH werden
      if (touchModus && H - R.weltH > reserve) {
        R.weltH = H - reserve;
        VH = R.weltH / WELT_ZOOM;
      }
    } else {
      VH = H / WELT_ZOOM;
      R.weltH = H;
    }
    R.VW = VW; R.VH = VH; R.weltZoom = WELT_ZOOM;
    // Zoom-/Flaechenwechsel: Sprite-/HG-Caches neu (nicht bei jedem resize ohne Aenderung)
    if (altZoom !== WELT_ZOOM || altFlaeche !== WELT_FLAECHE) { R.hg = {}; R.spr = {}; R.cacheInvalidierungen = (R.cacheInvalidierungen || 0) + 1; }
    setzeAufloesung(R, R.cssW, R.cssH, R.dpr);
    return { w: W, h: H, vw: VW, vh: VH };
  }
  function kameraView(R) { return { w: (R && R.VW) || VW, h: (R && R.VH) || VH }; }

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
    // Weicher Bodenschatten (Richtung nach Sonne)
    ellipse(c, x + SH.dx * 3.8, y - 0.15, 6.4 + Math.abs(SH.dx) * 3.2, 2.4, 'rgba(50,30,80,' + (0.18 + SH.a * 0.55).toFixed(3) + ')');
    if (o.liegt) {                                              // umgefallen: liegt quer
      rr(c, x - 4, y - 6.6, 15, 6.4, ch.hose, 2.6, KONT, 0.85);
      rr(c, x - 8.6, y - 8.6, 12.4, 8, ch.shirt, 3, KONT, 0.85);
      kreis(c, x - 10.6, y - 5.6, 4.4, P.haut, KONT, 0.85);
      c.beginPath(); c.arc(x - 10.6, y - 5.6, 4.6, Math.PI * 0.95, Math.PI * 1.9); c.fillStyle = ch.haar; c.fill();
      linie(c, x - 12, y - 5.6, x - 10.6, y - 5.3, KONT, 0.6); linie(c, x - 9.8, y - 5.6, x - 8.6, y - 5.3, KONT, 0.6);
      rr(c, x + 9, y - 4.6, 3.4, 2.6, KONT, 1.2);
      textInBox(c, 'zZz', x - 12, y - 20 + Math.sin(t * 3), 16, 10, 8, { col: '#ffffff', ausr: 'center', kontur: P.kontur, min: 7 });
      return;
    }
    // Laufzyklus: staerkerer Bein-/Armschwung und leichtes Wippen
    var swing = [0, 2.4, 0, -2.4][fr] || 0, hop = o.tanzt ? -Math.abs(Math.sin(t * 12)) * 2.2 : 0, wipp = o.tanzt ? Math.sin(t * 12) * 1.2 : 0;
    var bob = ((fr === 1 || fr === 3) ? -0.85 : 0) + hop + Math.sin(t * 2 + x) * 0.12;
    var hose = ch.hose, shirt = ch.shirt, by = y + hop;
    // Beine
    var beinFarbe = extra === 'latz' ? ch.shirt : hose, schuh = extra === 'schuhe' ? ['#ff4fa0', '#4fe6ff'] : ['#3a2a3e', '#3a2a3e'];
    var l1 = seite ? swing : 0, l2 = seite ? -swing : 0, up1 = seite ? 0 : Math.max(0, swing) * 0.85, up2 = seite ? 0 : Math.max(0, -swing) * 0.85;
    if (seite) { rr(c, x - 1.9 + l2 * 1.05, by - 8.2, 3.8, 8.4, dunkler(beinFarbe, 0.18), 1.5, KONT, 0.55); rr(c, x - 2.4 + l2 * 1.05, by - 1.6, 5.4, 2.2, schuh[1], 1.1, KONT, 0.55); }
    rr(c, x - 3.8 + (seite ? l1 * 1.05 : 0), by - 8.4 + up1, 3.5, 8.6 - up1, beinFarbe, 1.5, KONT, 0.65);
    if (!seite) rr(c, x + 0.3, by - 8.4 + up2, 3.5, 8.6 - up2, beinFarbe, 1.5, KONT, 0.65);
    if (!seite) { rr(c, x - 4.3, by - 1.8 + up1, 4.4, 2.3, schuh[0], 1.1, KONT, 0.55); rr(c, x - 0.1, by - 1.8 + up2, 4.4, 2.3, schuh[1], 1.1, KONT, 0.55); }
    else { rr(c, x - 2.4 + l1 * 1.05 + (sg > 0 ? 0.5 : -0.5), by - 1.8, 5.4, 2.3, schuh[0], 1.1, KONT, 0.55); }
    // Arme hinten (Seitenansicht)
    var ay = by - 14.8 + bob, armSw = o.tanzt ? -3.6 : swing * 0.65;
    if (seite) rr(c, x - 1.2 - swing * 0.7, ay, 2.6, 6.2, dunkler(shirt, 0.18), 1.2, KONT, 0.5);
    // Torso
    var tw = seite ? 6.8 : 9, tx = x - tw / 2;
    rr(c, tx + wipp * 0.15, by - 16.6 + bob, tw, 9.4, shirt, 3.2, KONT, 0.85);
    vlauf(c, tx + 1, by - 15.8 + bob, tw - 2, 3.4, heller(shirt, 0.32), shirt);
    if (extra === 'weste' && !seite) { rr(c, tx + 1.2, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); rr(c, tx + tw - 4, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); }
    else if (extra === 'weste') rr(c, tx + 0.8, by - 15.4 + bob, tw - 1.6, 8, '#7a7a88', 1.2);
    if (extra === 'tracht') { rr(c, tx + 1, by - 15.6 + bob, tw - 2, 8.2, '#1f4a2a', 1.6); for (var k = 0; k < 3; k++) kreis(c, x + (seite ? 0 : 0), by - 14 + bob + k * 2.4, 0.5, '#d8c070'); }
    if (extra === 'latz') { rr(c, tx + 1, by - 12.4 + bob, tw - 2, 5.4, '#f08a2a', 1.4); r(c, tx + 1.2, by - 16 + bob, 1.2, 4, '#f08a2a'); r(c, tx + tw - 2.4, by - 16 + bob, 1.2, 4, '#f08a2a'); kreis(c, x, by - 10.6 + bob, 0.7, '#ffd75e'); }
    if (extra === 'hut') { poly(c, [[x - 1.2, by - 16 + bob], [x + 1.2, by - 16 + bob], [x + 0.8, by - 9 + bob], [x - 0.8, by - 9 + bob]], '#1a1a22'); }
    // Arm vorn
    if (!seite) {
      rr(c, tx - 2.2, ay + armSw * 0.45 - (o.tanzt ? 3 : 0), 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.65);
      rr(c, tx + tw - 0.4, ay - armSw * 0.45 - (o.tanzt ? 3 : 0), 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.65);
      kreis(c, tx - 0.9, ay + 6 + armSw * 0.45 - (o.tanzt ? 6 : 0), 1.3, P.haut, KONT, 0.45); kreis(c, tx + tw + 0.9, ay + 6 - armSw * 0.45 - (o.tanzt ? 6 : 0), 1.3, P.haut, KONT, 0.45);
      if (o.glas) { rr(c, tx + tw + 0.2, ay + 1.4 - armSw * 0.45, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5); r(c, tx + tw + 0.4, ay + 1.4 - armSw * 0.45, 3.2, 1.2, '#fff8ee'); }
    } else {
      rr(c, x - 1.2 + swing * 0.7, ay, 2.6, 6.2, shirt, 1.3, KONT, 0.65); kreis(c, x + swing * 0.7 + 0.1, ay + 6.2, 1.3, P.haut, KONT, 0.45);
      if (o.glas) { rr(c, x + sg * 1.4 + swing * 0.7 - 1.4, ay + 2, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5); }
    }
    // Kopf
    var hx = x + wipp * 0.3 + (seite ? sg * 0.5 : 0), hy = by - 21.4 + bob;
    r(c, hx - 1.2, hy + 3.4, 2.4, 2, dunkler(P.haut, 0.1));
    kreis(c, hx, hy, 4.7, P.haut, KONT, 0.85);
    kreis(c, hx - 1.4, hy - 1.2, 1.6, 'rgba(255,255,255,0.22)');
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

  function blase(c, x, y, s, vermeide) {
    var pad = 8, maxW = Math.min(VW - 10, 150), ziel = 8;
    var mess = textInBox(c, s, 0, 0, maxW - pad, 48, ziel, { ausr: 'center', mess: true });
    var tw = Math.max(28, Math.min(maxW - pad, mess.w));
    var lay = textInBox(c, s, 0, 0, tw, 48, ziel, { ausr: 'center', mess: true });
    var bw = Math.round(Math.min(maxW, lay.w + pad)), bh = Math.round(Math.max(14, lay.h + 5));
    var bx = Math.round(x - bw / 2), by = Math.round(y - bh - 4);
    if (bx < 2) bx = 2; if (bx + bw > VW - 2) bx = VW - 2 - bw;
    // NPC-Blase nicht ueber Kneipenschild: nach oben oder seitlich schieben
    if (vermeide) {
      function cut(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
      var rect = { x: bx, y: by, w: bw, h: bh };
      if (cut(rect, vermeide)) {
        by = Math.round(vermeide.y - bh - 6);
        rect = { x: bx, y: by, w: bw, h: bh };
        if (cut(rect, vermeide)) {
          bx = Math.round(vermeide.x + vermeide.w + 4);
          if (bx + bw > VW - 2) bx = Math.round(vermeide.x - bw - 4);
          by = Math.round(y - bh - 4);
        }
      }
    }
    panel(c, bx, by, bw, bh, P.uiFlaeche, 5);
    poly(c, [[x - 2.2, by + bh - 0.8], [x + 2.2, by + bh - 0.8], [x, by + bh + 3.4]], P.uiFlaeche);
    textInBox(c, s, bx + 3, by + 1, bw - 6, bh - 2, ziel, { col: P.uiTinte, ausr: 'center' });
  }

  function zeichneJoint(c, x, y, t) {
    var w = Math.sin(t * 3);
    ellipse(c, x, y + 4, 4.4, 1.6, 'rgba(50,30,80,0.25)');
    c.save(); c.translate(x, y + w); c.rotate(-0.25);
    rr(c, -4.6, -1.3, 9.2, 2.8, '#fff8ee', 1.4, '#8a7c9c', 0.5); rr(c, -4.8, -1.2, 2, 2.6, '#ff8f2e', 1); c.restore();
    c.globalAlpha = 0.5; kreis(c, x + 4, y - 4 + w, 1.2, '#c9c3d6'); kreis(c, x + 5.2, y - 7 + w, 1.6, '#c9c3d6'); c.globalAlpha = 1;
  }

  // ---------- Welt zeichnen (in Kamerakoordinaten VW×VH; wird mit WELT_ZOOM auf W×H skaliert) ----------
  function zeichneWelt(R, S) {
    var c = R.ctx, karte = S.karte, cam = S.kamera, T = Saufi.Karte.T, sk = R.sk;
    var viewW = cam.viewW || VW, viewH = cam.viewH || VH;
    var cx = Math.round(cam.x * sk) / sk, cy = Math.round(cam.y * sk) / sk, licht = S.licht, i;
    SH = karte.innen ? { dx: 0, lang: 0.6, a: 0 } : Sz.schattenFuer(S);
    r(c, 0, 0, viewW, viewH, '#1b1530');
    var hg = hintergrund(R, karte);
    if (hg) {
      var sx = Math.max(0, cx), sy = Math.max(0, cy), dx = sx - cx, dy = sy - cy;
      var bw = Math.min(karte.pxW - sx, viewW - dx), bh = Math.min(karte.pxH - sy, viewH - dy), bk = hg.sk;
      if (bw > 0 && bh > 0) c.drawImage(hg.canvas, Math.round(sx * bk), Math.round(sy * bk), Math.round(bw * bk), Math.round(bh * bk), dx, dy, bw, bh);
    } else {
      for (var y = Math.max(0, Math.floor(cy / K)); y <= Math.min(karte.h - 1, Math.floor((cy + viewH) / K)); y++)
        for (var x = Math.max(0, Math.floor(cx / K)); x <= Math.min(karte.w - 1, Math.floor((cx + viewW) / K)); x++) {
          if (karte.innen) In.zeichneInnenKachel(c, karte, x, y, x * K - cx, y * K - cy); else Sz.zeichneAussenKachel(c, karte, x, y, x * K - cx, y * K - cy);
        }
    }
    var t = S.t;
    if (!karte.innen) {                                           // bewegtes Wasser
      c.lineCap = 'round'; c.lineWidth = 0.7;
      for (var wy = Math.max(0, Math.floor(cy / K)); wy <= Math.min(karte.h - 1, Math.floor((cy + viewH) / K)); wy++)
        for (var wx = Math.max(0, Math.floor(cx / K)); wx <= Math.min(karte.w - 1, Math.floor((cx + viewW) / K)); wx++) {
          if (karte.tile(wx, wy) !== T.WASSER) continue;
          var o = (t * 5 + wx * 3 + wy * 5) % 16, px0 = wx * K - cx, py0 = wy * K - cy;
          c.strokeStyle = 'rgba(232,251,255,0.8)'; c.beginPath(); c.moveTo(px0 + o, py0 + 5); c.quadraticCurveTo(px0 + o + 2.5, py0 + 3.8, px0 + o + 5, py0 + 5); c.stroke();
          c.strokeStyle = 'rgba(79,176,214,0.7)'; c.beginPath(); c.moveTo(px0 + (o + 8) % 16, py0 + 11); c.quadraticCurveTo(px0 + (o + 8) % 16 + 2, py0 + 9.8, px0 + (o + 8) % 16 + 4, py0 + 11); c.stroke();
        }
    } else if (karte.id === 'disko') {
      In.tanzFlaeche(c, S, cx, cy, Math.floor(S.t / Saufi.Ton.BEAT), (S.t / Saufi.Ton.BEAT) % 1, S.boostAktiv);
    } else In.innenFensterNacht(c, karte, Math.min(0.85, licht.glut * 0.9), cx, cy);

    // Sortierte Dinge: Props, Orte-Objekte, Figuren (Y-Sortierung verhindert Ueberlappungsfehler)
    var dinge = [];
    propsFuer(R, karte).forEach(function (p) { if (p.x - cx < viewW + 40 && p.x - cx > -140 && p.y - cy > -20 && p.y - cy < viewH + 120) dinge.push(p); });
    if (!karte.innen) dinge.push({ y: 15 * K + 4, x: 0, art: 'tram' });
    if (karte.id === 'hotel' && S.joint && !S.joint.gefunden) dinge.push({ y: 8 * K + 12, art: 'joint', x: 14 * K, ky: 8 * K });
    S.npcs.forEach(function (n) { if (n.aktiv && n.karteId === karte.id) dinge.push({ y: n.y, art: 'npc', n: n }); });
    if (S.zustand !== 'start') dinge.push({ y: S.spieler.y + 0.1, art: 'spieler' });
    if (karte.id === 'disko') dinge.push({ y: 10 * K + 8, art: 'tuersteher', x: 6 * K + 8, ky: 10 * K + 8 });
    dinge.sort(function (a, b) { return a.y - b.y || (a.art === 'spieler' ? 1 : 0) - (b.art === 'spieler' ? 1 : 0); });
    // Schild-Rechtecke in Bildschirmkoordinaten (fuer → HIER-Label)
    var zZoom = R.aktuellerWeltZoom != null ? R.aktuellerWeltZoom : WELT_ZOOM;
    R._schildRects = [];
    if (!karte.innen) karte.gebaeude.forEach(function (b) {
      var pl = bauplan(b), sw = Math.min(pl.w - 8, 112);
      R._schildRects.push({
        x: (pl.schild.x - sw / 2 - cx) * zZoom, y: (pl.schild.y - 7 - cy) * zZoom, w: sw * zZoom, h: 14 * zZoom
      });
      if (pl.schildNeben) {
        var sn = pl.schildNeben;
        R._schildRects.push({ x: (sn.x - cx) * zZoom, y: (sn.y - cy) * zZoom, w: sn.w * zZoom, h: sn.h * zZoom });
      }
    });
    dinge.forEach(function (d) {
      var px = d.x - cx, fy = d.y - cy;                           // d.y = Fusslinie
      if (d.art === 'geb') zeichneGebaeude(R, c, d.b, px, d.b.y * K - cy);
      else if (d.art === 'baum') { ellipse(c, px + 8 + SH.dx * 7, fy - 1, 7 + Math.abs(SH.dx) * 3, 2.6, 'rgba(50,30,80,' + (0.2 + SH.a * 0.6) + ')'); Sz.zeichneSprite(R, c, 'baum' + (d.hs % 3), 36, 38, 18, 32, px + 8, fy - 1, function (hc) { Sz.baumBild(hc, d.hs % 3); }); }
      else if (d.art === 'busch') Sz.zeichneSprite(R, c, 'busch' + (d.hs % 2), 24, 16, 12, 14, px + 8, fy - 1, function (hc) { Sz.buschBild(hc, d.hs % 2); });
      else if (d.art === 'laterne') { if (SH.a > 0.02) ellipse(c, px + 8 + SH.dx * 6, fy - 1, 5, 1.2, 'rgba(50,30,80,' + SH.a + ')'); Sz.zeichneSprite(R, c, 'laterne', 14, 28, 7, 26, px + 8, fy - 0.5, function (hc) { Sz.laterneBild(hc); }); }
      else if (d.art === 'bank') Sz.zeichneSprite(R, c, 'bank', 22, 18, 11, 16, px + 8, fy - 1, function (hc) { Sz.bankBild(hc); });
      else if (d.art === 'brunnen') { Sz.zeichneSprite(R, c, 'brunnen', 40, 42, 20, 36, px + 16, fy - 3, function (hc) { Sz.brunnenBild(hc); }); Sz.brunnenWasser(c, px + 16, fy - 3, t); }
      else if (d.art === 'tram') { var tx = ((t * 14) % (karte.pxW + 160)) - 90 - cx; if (tx > -80 && tx < viewW + 10) Sz.strassenbahn(c, tx, 253 - cy, t); }
      else if (d.art === 'joint') zeichneJoint(c, d.x - cx + 8, d.ky - cy + 8, t);
      else if (d.art === 'tuersteher') figur(c, { shirt: '#14102a', hose: '#14102a', haar: '#14102a', extra: 'hut' }, d.x - cx, d.ky - cy, { dir: 'unten', t: t });
      else if (d.art === 'npc') {
        var n = d.n; figur(c, n.char, n.x - cx, n.y - cy, { dir: n.dir, schritt: n.schritt, liegt: n.liegt, t: t, schwips: n.fig.pegel > 1.5, tanzt: S.tanzBeat && !n.liegt, glas: S.prost > 0 && !n.liegt });
        if (n.blase && !n.liegt) {
          var vermeide = null;
          if (!karte.innen) karte.gebaeude.forEach(function (b) {
            if (b.id !== 'kneipe') return;
            var pl = bauplan(b); if (!pl.schildNeben) return;
            var sn = pl.schildNeben;
            vermeide = { x: sn.x - cx, y: sn.y - cy, w: sn.w, h: sn.h };
            var hs = pl.schild; if (hs) {
              var hw = Math.min(pl.w - 8, 108), hh = 14;
              var main = { x: hs.x - hw / 2 - cx, y: hs.y - 13 - cy, w: hw, h: hh };
              if (!vermeide || n.y - cy - 25 < sn.y - cy + sn.h) vermeide = main;
            }
          });
          blase(c, n.x - cx, n.y - cy - 25, n.char.name + ': ' + n.blase.text, vermeide);
        }
        else if (n.liegt) textInBox(c, 'Q = wecken', n.x - cx - 28, n.y - cy - 22, 56, 12, 8, { col: '#ffffff', ausr: 'center', kontur: P.kontur, min: 7 });
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

    // Toenung: Tageslicht (draussen) oder Raumlicht (innen) — weicher Verlauf
    var tint = tintFuer(S);
    c.globalCompositeOperation = 'multiply'; r(c, 0, 0, viewW, viewH, rgb(tint)); c.globalCompositeOperation = 'source-over';
    zeichneLichter(R, S, cx, cy, tint);
    var nacht = karte.innen ? 0 : Sz.nachtGrad(S.uhr.minute / 60);
    if (nacht > 0.05) {                                           // weiche Vignette in der Nacht
      var vg = c.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.28, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72);
      vg.addColorStop(0, 'rgba(10,8,40,0)'); vg.addColorStop(0.55, 'rgba(10,8,40,' + (0.12 * nacht).toFixed(3) + ')');
      vg.addColorStop(1, 'rgba(10,8,40,' + (0.42 * nacht).toFixed(3) + ')');
      c.fillStyle = vg; c.fillRect(0, 0, viewW, viewH);
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
      var gebRects = karte.gebaeude.map(function (b) { var pl = bauplan(b); return { x: pl.x0, y: pl.y0, w: pl.w, h: pl.h }; });
      karte.gebaeude.forEach(function (b) {
        var plan = bauplan(b), offen = Saufi.Uhr.offen(b.id, S.uhr.minute);
        if (glut > 0.02) plan.fenster.forEach(function (f) {
          if (!offen && b.id !== 'hotel') return;
          var gg = glut * glut, fx = f.x - cx, fy = f.y - cy;
          var halo = Math.min(K * 1.2, Math.max(f.w, f.h) * 1.0);
          c.globalAlpha = Math.min(0.35, 0.32 * gg); G.glanz(c, fx + f.w / 2, fy + f.h / 2, halo, 'rgba(255,180,80,0.4)', 'rgba(255,180,80,0)');
          // Warmer Verlauf; Alpha ≤ 0.75; kein Reinweiss
          c.globalAlpha = Math.min(0.75, 0.7 * gg);
          vlauf(c, fx, fy, f.w, f.h, '#ffd77a', '#ffb85a');
          c.globalAlpha = Math.min(0.7, 0.55 * gg);
          r(c, fx, fy, f.w, 0.7, 'rgba(40,30,50,0.55)'); r(c, fx, fy + f.h - 0.7, f.w, 0.7, 'rgba(40,30,50,0.55)');
          r(c, fx, fy, 0.7, f.h, 'rgba(40,30,50,0.55)'); r(c, fx + f.w - 0.7, fy, 0.7, f.h, 'rgba(40,30,50,0.55)');
          r(c, fx + f.w / 2 - 0.35, fy, 0.7, f.h, 'rgba(40,30,50,0.4)'); r(c, fx, fy + f.h * 0.45, f.w, 0.7, 'rgba(40,30,50,0.4)');
        });
        var an = offen || b.id === 'hotel';
        if (an) plan.neon.forEach(function (n) {
          var p = 0.65 + 0.35 * Math.sin(t * 5 + n.x * 0.1), a = Math.max(l.glut, b.id === 'disko' ? 0.35 : 0) * p;
          var neonR = Math.max(n.w * 0.4, Math.min(n.w * 0.8, 10));
          c.globalAlpha = Math.min(0.7, a * 0.5); G.glanz(c, n.x + n.w / 2 - cx, n.y + n.h / 2 - cy, neonR, n.farbe, 'rgba(0,0,0,0)');
          c.globalAlpha = Math.min(0.7, a * 0.5); rr(c, n.x - cx - 2, n.y - cy - 2, n.w + 4, n.h + 4, n.farbe, 2.5);
          c.globalAlpha = Math.min(0.85, a * 1.0); rr(c, n.x - cx, n.y - cy, n.w, n.h, n.farbe, 1);
        });
        if (glut > 0.05 && an) {                                   // Tuer-Lichtinsel (Disko kleiner/weicher)
          var d = plan.tuer, maxR = b.id === 'disko' ? 24 : 28;
          var grd = c.createRadialGradient(d.x - cx + 8, d.y - cy + 14, 2, d.x - cx + 8, d.y - cy + 14, maxR);
          var kernA = b.id === 'disko' ? 0.35 : 0.45;
          grd.addColorStop(0, 'rgba(255,190,110,' + kernA + ')'); grd.addColorStop(1, 'rgba(255,190,110,0)');
          c.globalAlpha = Math.min(glut, b.id === 'disko' ? 0.35 : glut); c.fillStyle = grd;
          c.fillRect(d.x - cx - maxR, d.y - cy - maxR * 0.6, maxR * 2, maxR * 1.6);
        }
        // Nachtschilder aufhellen
        if (glut > 0.15) {
          c.globalAlpha = SCHILD_NACHT_ALPHA * glut;
          var sx = plan.schild.x - cx, sy = plan.schild.y - cy;
          var sw = Math.min(plan.w - 8, b.id === 'disko' ? plan.w - 12 : 112), sh = 14;
          c.fillStyle = '#ffe9a8';
          c.fillRect(sx - sw / 2, sy - 7, sw, sh);
          if (plan.schildNeben) {
            var sn = plan.schildNeben;
            c.fillRect(sn.x - cx, sn.y - cy, sn.w, sn.h);
          }
        }
      });
      if (lampen > 0.02) {
        propsFuer(R, karte).forEach(function (p) {
          if (p.art !== 'laterne') return;
          var lx = p.x - cx + 8, kopf = p.ly * K - cy - 1, boden = p.ly * K - cy + 14;
          if (lx < -50 || lx > VW + 50 || boden < -50 || boden > VH + 60) return;
          var wx = p.x + 8, wy = p.ly * K + 14;
          // Boden-Glanz clippen: nicht auf Gebaeudefassaden
          var nahGeb = gebRects.some(function (g) {
            var dx = Math.max(g.x - wx, 0, wx - (g.x + g.w)), dy = Math.max(g.y - wy, 0, wy - (g.y + g.h));
            return Math.hypot(dx, dy) < 40;
          });
          c.globalAlpha = lampen;
          if (nahGeb) {
            c.save();
            c.beginPath(); c.rect(-cx, -cy, karte.pxW, karte.pxH);
            gebRects.forEach(function (g) {
              // Loch aus Fassade: evenodd — Glanz nur ausserhalb
              c.rect(g.x - cx, g.y - cy, g.w, g.h);
            });
            try { c.clip('evenodd'); } catch (e) { c.clip(); }
            G.glanz(c, lx, boden + 1, LATERNE_RADIUS, 'rgba(255,214,130,0.26)', 'rgba(255,190,100,0)');
            c.restore();
          } else {
            G.glanz(c, lx, boden + 1, LATERNE_RADIUS, 'rgba(255,214,130,0.26)', 'rgba(255,190,100,0)');
          }
          G.glanz(c, lx, kopf + 2, 5, 'rgba(255,240,190,0.5)', 'rgba(255,220,140,0)');
        });
      }
      if (glut > 0.4) {
        c.globalAlpha = 0.08 * glut;
        karte.gebaeude.forEach(function (b) {
          var pl = bauplan(b);
          c.fillStyle = 'rgba(10,8,30,0.5)';
          c.fillRect(pl.x0 - cx, pl.y0 - cy + 14, 2, pl.h - 14);
          c.fillRect(pl.x0 + pl.w - 2 - cx, pl.y0 - cy + 14, 2, pl.h - 14);
        });
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
    // Querformat: kompaktes Status-Panel; Hoch+Touch: ~15 % kleiner als v06-Hoch
    var kompakt = !R.hochkant, sk = kompakt ? 0.72 : (R.touch ? (54 / 62) * 0.85 : 54 / 62);
    var lpW = Math.round(96 * sk), lpH = Math.round(62 * sk), lx = 3, ly = 3;
    panel(c, lx, ly, lpW, lpH, 'rgba(255,248,238,0.94)', kompakt ? 4 : 5);
    c.save(); c.translate(lx, ly); c.scale(sk, sk);
    krug(c, 8, 7, fig.pegel);
    var pt = S.joint && Saufi.Ereignisse.Joint.schwammig(S.joint) ? '~' + Saufi.Pegel.anzeige(fig.pegel + Math.sin(S.t * 5) * 0.4) : Saufi.Pegel.anzeige(fig.pegel);
    textInBox(c, pt + ' ‰', 28, 7, 66, 16, 9, { col: fig.pegel >= 3 ? P.bierRot : P.uiTinte, ausr: 'left' });
    var herzen = Math.ceil(fig.stand / 20);
    for (i = 0; i < 5; i++) { var voll = fig.stand >= (i + 1) * 20 - 0.01; herz(c, 8 + i * 11, 28, voll ? P.herzVoll : (i < herzen ? P.herzLicht : P.herzLeer)); }
    textInBox(c, 'Team', 6, 38, 28, 12, 7, { col: P.uiTinteWeich });
    for (i = 0; i < 5; i++) rr(c, 36 + i * 11, 39.4, 9, 7.6, i < S.runden.team ? '#5ec8b8' : P.herzLeer, 2.4, P.kontur, 0.7);
    r(c, 8, 52.4, 3.6, 8.4, '#8fd4f0'); rr(c, 7.4, 51.4, 4.8, 3, '#4fb0d6', 1.2);
    textInBox(c, 'x' + S.flaschen, 14, 50, 22, 12, 7, { col: P.uiTinte });
    if (S.joint && (S.joint.hat || S.joint.doppelt)) textInBox(c, S.joint.doppelt ? 'x2!' : 'R: Tüte', 36, 50, 56, 12, 7, { col: '#d9701a' });
    c.restore();
    R.hudLinks = { x: lx, y: ly, w: lpW, h: lpH };
    // Uhr: HTML-Knoepfe oben rechts (4×44 CSS-px) — bei Touch oft kein Platz daneben → Uhr darunter
    var pw = kompakt ? 88 : 96, ph = kompakt ? 24 : 26;
    var sCss = (R.cssW > 0 && W > 0) ? (R.cssW / W) : 1;
    var btnBand = R.touch ? Math.ceil((4 * 44 + 8) / Math.max(0.5, sCss)) : 40;
    var freiL = lx + lpW + 4, freiR = W - btnBand - 2;
    var py = 3, px;
    if (R.touch && freiR - freiL < pw + 4) {
      py = Math.ceil(44 / Math.max(0.5, sCss)) + 2;
      // Unter den Oben-Knoepfen: nicht mit linkem Panel kollidieren
      py = Math.max(py, ly + lpH + 2);
      pw = kompakt ? 88 : 96;
      px = Math.round((W - pw) / 2);
      px = Math.max(lx + 2, Math.min(px, W - btnBand - pw - 2));
    } else {
      px = Math.round((freiL + freiR - pw) / 2);
      px = Math.max(freiL, Math.min(px, Math.max(freiL, freiR - pw)));
    }
    panel(c, px, py, pw, ph, 'rgba(255,248,238,0.94)', kompakt ? 5 : 6);
    Sz.himmelIcon(c, px + (kompakt ? 13 : 14), py + (kompakt ? 11 : 13), kompakt ? 9 : 10, uhr.minute / 60, S.t);
    textInBox(c, Saufi.Uhr.text(uhr), px + (kompakt ? 26 : 28), py + 1, pw - (kompakt ? 30 : 32), kompakt ? 11 : 12, kompakt ? 9 : 10, { col: P.uiTinte, ausr: 'center' });
    textInBox(c, Saufi.Uhr.tag(uhr).slice(0, 2) + ' · ' + Saufi.Uhr.phase(uhr), px + (kompakt ? 26 : 28), py + (kompakt ? 12 : 13), pw - (kompakt ? 30 : 32), kompakt ? 10 : 11, 7, { col: P.uiTinteWeich, ausr: 'center' });
    textInBox(c, '★ ' + S.punkte.punkte, px, py + ph, pw, 10, kompakt ? 7 : 8, { col: P.uiTinte, ausr: 'center', kontur: 'rgba(255,248,238,0.95)' });
    R.hudUhr = { x: px, y: py, w: pw, h: ph, btnBand: btnBand };
    // Runde: unter Uhr/Punkte, ohne Overlap; nicht ueber Ziel-Gebaeudeschild
    var nr = Saufi.Runden.naechste(S.runden), ry = 0, rundenH = 0;
    if (nr && (nr.status === 'warnung' || nr.status === 'aktiv')) {
      var aktiv = nr.status === 'aktiv', rest = aktiv ? nr.zeit + Saufi.Runden.FRIST_MIN - uhr.minute : nr.zeit - uhr.minute;
      var rw = Math.min(kompakt ? Math.min(170, Math.round(W * 0.45)) : 196, W - 24);
      rundenH = kompakt ? 16 : 20;
      // ≥ 4 px unter Uhr-Stern-Zeile
      ry = Math.max(kompakt ? 36 : 48, py + ph + 14);
      var rx;
      if (kompakt) {
        // Quer: immer unter Uhr-Stern-Zeile (kein Overlap mit Uhr/HUD); schmal ≤ 45 %
        rx = Math.round(W / 2 - rw / 2) + 2;
        rx = Math.max(lx + lpW + 4, Math.min(rx, W - btnBand - rw - 2));
        ry = Math.max(36, py + ph + 14);
      } else {
        rx = Math.round(W / 2 - rw / 2) + 2;
      }
      // Hoch: Banner nicht ueber Ziel-Gebaeudeschild (Welt→Bildschirm)
      if (R.hochkant && S.karte && !S.karte.innen && nr.ort) {
        var zielB = null;
        (S.karte.gebaeude || []).forEach(function (b) { if (b.id === nr.ort) zielB = b; });
        if (zielB) {
          var zp = bauplan(zielB), cam = S.kamera, zZoom = R.aktuellerWeltZoom != null ? R.aktuellerWeltZoom : WELT_ZOOM;
          var schildScr = {
            x: (zp.schild.x - (cam ? cam.x : 0)) * zZoom - Math.min(zp.w - 8, 112) / 2 * zZoom,
            y: (zp.schild.y - 7 - (cam ? cam.y : 0)) * zZoom,
            w: Math.min(zp.w - 8, 112) * zZoom, h: 14 * zZoom
          };
          function cutR(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
          var ban = { x: rx, y: ry, w: rw, h: rundenH };
          if (cutR(ban, schildScr)) {
            // Banner kleiner halten, unter Uhr belassen — Schild bleibt sichtbar
            rundenH = 14; ry = py + ph + 14;
            ban = { x: rx, y: ry, w: rw, h: rundenH };
            if (cutR(ban, schildScr)) { rw = Math.min(rw, Math.round(W * 0.5)); rx = Math.round(W / 2 - rw / 2); }
          }
        }
      }
      function hudOverlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
      var uhrBox = { x: px, y: py, w: pw, h: ph + 10 };
      var banTry = { x: rx, y: ry, w: rw, h: rundenH };
      if (hudOverlap(banTry, uhrBox)) {
        ry = py + ph + 14;
        banTry.y = ry;
        if (hudOverlap(banTry, uhrBox)) { ry = py + ph + 18; rundenH = Math.min(rundenH, 16); }
      }
      // Tests messen Uhr nur mit Hoehe ph (ohne Stern-Zeile): Banner klar darunter
      ry = Math.max(ry, py + ph + 14);
      var blink = aktiv && Math.floor(S.t * 3) % 2 === 0;
      panel(c, rx, ry, rw, rundenH, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8', 6);
      textInBox(c, (aktiv ? 'RUNDE! ' : 'Runde ' + Saufi.Uhr.zeitText(nr.zeit) + ': ') + Saufi.Karte.NAMEN[nr.ort], rx + 6, ry + 1, rw - 12, Math.max(8, rundenH - 6), 7, { col: P.uiTinte, ausr: 'center' });
      var frac = Math.max(0, Math.min(1, rest / (aktiv ? Saufi.Runden.FRIST_MIN : Saufi.Runden.VORLAUF_MIN)));
      var by2 = ry + rundenH - 5, bh2 = 3;
      rr(c, rx + 10, by2, rw - 20, bh2, 'rgba(74,53,96,0.25)', 2.2); if (frac > 0.01) rr(c, rx + 10, by2, (rw - 20) * frac, bh2, aktiv ? '#e0504a' : '#f0b030', 2.2);
      R.hudRunde = { x: rx, y: ry, w: rw, h: rundenH };
    } else R.hudRunde = null;
    // Safe-Zone unten: Quer = Stick/E (~120 CSS-px); Hoch = schmale UI-Reserve unter der Welt
    var weltH = (R.weltH != null && R.hochkant) ? R.weltH : H;
    var safeBot = R.touch && !R.hochkant ? Math.ceil(120 / Math.max(0.5, sCss)) : (R.hochkant && weltH < H ? Math.max(8, H - weltH) : 22);
    var resTop = R.hochkant && weltH < H ? weltH + 2 : null;
    // Scooter-Leiste (nur in der Disko)
    if (S.ort === 'disko') {
      var bw = 150, bx = Math.round(W / 2 - bw / 2) + 2, by = H - safeBot - 18, b = S.boost, f = b.leiste, pulse = f >= 1 && Math.floor(S.t * 4) % 2 === 0;
      // Hoch: einzeilig in der UI-Reserve (unter Hilfe)
      if (resTop != null) by = Math.min(H - 14, resTop + (S.hilfe ? 14 : 0));
      panel(c, bx - 6, by - 3, bw + 12, 15, 'rgba(42,35,66,0.92)', 6);
      rr(c, bx, by, bw, 9, 'rgba(255,255,255,0.12)', 4.5, P.kontur, 0.7); if (f > 0.02) rr(c, bx + 0.8, by + 0.8, (bw - 1.6) * f, 7.4, pulse ? '#ffffff' : P.neonPink, 3.7);
      textInBox(c, S.boostAktiv ? 'HYPER HYPER!' : (f >= 1 ? 'R: HYPER-BOOST!' : 'SCOOTER · E tanzen'), bx, by, bw, 9, 7, { col: S.boostAktiv ? P.neonGelb : '#ffffff', ausr: 'center', kontur: 'rgba(30,10,60,0.9)', maxZeilen: 1 });
    }
    // Navigationspfeil (Welt→Bildschirm); Label unter Uhr/Runde
    var pfeilZoom = R.aktuellerWeltZoom != null ? R.aktuellerWeltZoom : WELT_ZOOM;
    if (S.pfeil) pfeil(R, S.pfeil.x * pfeilZoom, S.pfeil.y * pfeilZoom, ry + rundenH);
    // Banner / Hinweise (+ Quer: Dialog ≤ 60 % Breite, maxZeilen 2; Stapel mit Hilfe)
    var h = Saufi.Hinweise.aktuell(S.hinweise);
    var dialogRect = null, hilfeRect = null;
    // Touch-Quer: E/Wasser-Knopf-Rechtecke (geschaetzt, ~15 % kleiner)
    var knopfRects = [];
    if (R.touch && !R.hochkant) {
      var kS = Math.max(0.5, sCss), kE = Math.max(44 / kS, 56 * 0.85), kW2 = Math.max(44 / kS, 44 * 0.85);
      knopfRects.push({ x: W - 8 / kS - kE, y: H - 8 / kS - kE - kW2 - 8 / kS, w: kE, h: kE });
      knopfRects.push({ x: W - 8 / kS - kW2, y: H - 8 / kS - kW2, w: kW2, h: kW2 });
    }
    function freiVonKnoepfen(rect) {
      return !knopfRects.some(function (k) { return !(rect.x + rect.w <= k.x || k.x + k.w <= rect.x || rect.y + rect.h <= k.y || k.y + k.h <= rect.y); });
    }
    if (h) {
      var a = Math.min(1, h.rest * 3);
      c.globalAlpha = a;
      if (h.art === 'gross') {
        var y0 = resTop != null ? Math.min(H - 26, resTop + 40) : Math.round(H * 0.38);
        y0 += (Math.floor(S.t * 8) % 2);
        textInBox(c, h.text, 16, y0, W - 32, 24, 14, { col: '#ffe84f', ausr: 'center', kontur: P.kontur });
      } else {
        var maxZ = resTop != null ? 2 : 2;
        var maxBoxW = resTop != null ? Math.min(W - 40, 240) : Math.min(W - 40, Math.round(W * 0.6));
        var mess = textInBox(c, h.text, 0, 0, maxBoxW - 16, resTop != null ? 28 : 40, 8, { ausr: 'center', mess: true, maxZeilen: maxZ });
        var bw2 = Math.min(maxBoxW, Math.round(mess.w) + 20), hh2 = Math.round(mess.h) + 8;
        if (resTop != null) hh2 = Math.min(hh2, Math.max(16, H - weltH - (S.hilfe ? 16 : 0) - (S.ort === 'disko' ? 18 : 0) - 2));
        var wy, mx = Math.round(W / 2);
        if (resTop != null) wy = Math.min(H - hh2 - 2, resTop + (S.hilfe ? 14 : 0) + (S.ort === 'disko' ? 16 : 0));
        else wy = H - safeBot - hh2 - (S.ort === 'disko' ? 20 : 0) - (S.hilfe ? 20 : 0);
        dialogRect = { x: mx - Math.round(bw2 / 2), y: wy, w: bw2, h: hh2 };
        if (!freiVonKnoepfen(dialogRect)) { dialogRect.x = Math.max(4, Math.round(W * 0.2 - bw2 / 2)); wy = dialogRect.y; }
        panel(c, dialogRect.x, dialogRect.y, dialogRect.w, dialogRect.h, h.art === 'schlecht' ? '#ffd1da' : (h.art === 'gut' ? '#d8f5dc' : P.uiFlaeche), 7);
        textInBox(c, h.text, dialogRect.x + 6, dialogRect.y + 2, dialogRect.w - 12, dialogRect.h - 4, 8, { col: P.uiTinte, ausr: 'center', maxZeilen: maxZ });
        R.hudDialog = dialogRect;
      }
      c.globalAlpha = 1;
    } else R.hudDialog = null;
    // Hilfe: Hoch in UI-Reserve, Quer oberhalb Stick/E — ≥ 4 px Abstand zur Dialogblase
    if (S.hilfe) {
      var hm = textInBox(c, S.hilfe, 0, 0, W - 40, 14, 8, { ausr: 'center', mess: true });
      var hw = Math.min(W - 20, Math.round(hm.w) + 18), hy;
      if (resTop != null) hy = Math.min(H - 18, resTop);
      else {
        hy = H - safeBot - 4;
        if (dialogRect) hy = Math.min(hy, dialogRect.y - 16 - 4);
      }
      hilfeRect = { x: Math.round(W / 2 - hw / 2), y: hy, w: hw, h: 16 };
      if (!R.hochkant && !freiVonKnoepfen(hilfeRect)) hilfeRect.x = Math.max(4, Math.round(W * 0.15));
      panel(c, hilfeRect.x, hilfeRect.y, hilfeRect.w, hilfeRect.h, 'rgba(255,248,238,0.96)', 7);
      textInBox(c, S.hilfe, hilfeRect.x + 4, hilfeRect.y + 1, hilfeRect.w - 8, 14, 8, { col: P.uiTinte, ausr: 'center' });
      R.hudHilfe = hilfeRect;
    } else R.hudHilfe = null;
  }
  function pfeil(R, sx, sy, unterY) {
    var c = R.ctx, cx = W / 2, cy = Math.min(H, R.weltH || H) / 2, dx = sx - cx, dy = sy - cy;
    var weltH = R.weltH || H;
    var inside = sx > 10 && sx < W - 10 && sy > 50 && sy < weltH - 24;
    if (inside) { var bob = Math.sin(Date.now() / 160) * 2; poly(c, [[sx - 6, sy - 22 + bob], [sx + 6, sy - 22 + bob], [sx, sy - 11 + bob]], '#ffd75e', P.kontur, 1); return; }
    var ang = Math.atan2(dy, dx), rad = Math.min(cx - 14, (cy - 28) / Math.max(0.2, Math.abs(Math.sin(ang))), (cx - 14) / Math.max(0.2, Math.abs(Math.cos(ang))));
    var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    py = Math.max(56, Math.min(weltH - 26, py)); px = Math.max(12, Math.min(W - 12, px));
    c.save(); c.translate(px, py); c.rotate(ang);
    poly(c, [[9, 0], [-5, -7], [-3, 0], [-5, 7]], '#ffd75e', P.kontur, 1); c.restore();
    // Label unter Uhr/Runden-Panel; nie ueber Gebaeudeschildern (Dachfirst / neben Gebaeude)
    var labelY = Math.max(unterY > 0 ? unterY + 4 : 56, (R.hudUhr ? R.hudUhr.y + R.hudUhr.h + 14 : 56));
    var labelX = W / 2 - (R.hochkant ? 40 : 70), labelW = R.hochkant ? 80 : 140, labelH = 12;
    var labelTxt = R.hochkant ? '→ HIER' : 'HIER SOLLST DU HIN';
    if (R._schildRects) {
      var lab = { x: labelX, y: labelY, w: labelW, h: labelH };
      function hit(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
      R._schildRects.forEach(function (sr) {
        if (hit(lab, sr)) {
          labelY = Math.max(12, sr.y - labelH - 4);
          if (labelY < 40) { labelX = sr.x + sr.w + 4; if (labelX + labelW > W - 4) labelX = Math.max(4, sr.x - labelW - 4); labelY = Math.max(unterY > 0 ? unterY + 4 : 56, sr.y); }
          lab = { x: labelX, y: labelY, w: labelW, h: labelH };
        }
      });
    }
    R.hierLabel = { x: labelX, y: labelY, w: labelW, h: labelH };
    textInBox(c, labelTxt, labelX, labelY, labelW, labelH, 7, { col: P.uiTinte, ausr: 'center', kontur: 'rgba(255,248,238,0.9)' });
  }

  // ---------- Menues und Bildschirme ----------
  function abdunkeln(c, a) { c.fillStyle = 'rgba(42,34,54,' + a + ')'; c.fillRect(0, 0, W, H); }
  function cssSkala(R) { return (R.cssW > 0 && W > 0) ? (R.cssW / W) : 1; }
  function touchZeile(R) { return Math.ceil(44 / Math.max(0.5, cssSkala(R))); }
  function knopfZeile(c, x, y, w, h, sel, label, aktiv, rechts, blink) {
    rr(c, x, y, w, h, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, Math.min(6, h / 2.4), sel ? P.kontur : 'rgba(74,53,96,0.25)', sel ? 0.9 : 0.6);
    var padR = rechts ? Math.min(72, w * 0.38) : 0;
    textInBox(c, label, x + 5, y + 1, w - 10 - padR, h - 2, Math.min(9, h - 4), { col: aktiv === false ? '#b3a5c2' : P.uiTinte, ausr: 'left', maxZeilen: 1 });
    if (rechts) textInBox(c, rechts, x + w - padR - 2, y + 1, padR - 2, h - 2, Math.min(9, h - 4), { col: P.uiTinteWeich, ausr: 'right', maxZeilen: 1 });
  }
  function schliessX(R, bx, by, bw, bh) {
    var c = R.ctx, minHit = R.touch ? touchZeile(R) : 12, draw = R.touch ? Math.min(22, minHit) : 12;
    var x = bx + bw - draw - 4, y = by + 4;
    rr(c, x, y, draw, draw, '#ffd1da', 3, P.kontur, 0.7);
    textInBox(c, '×', x, y, draw, draw, R.touch ? 14 : 12, { col: P.bierRot, ausr: 'center' });
    // Treffer ≥ 44 CSS-px; Kästchen darf kleiner sein, Hit im Panel halten
    var hx = Math.round(x + draw / 2 - minHit / 2), hy = Math.round(y + draw / 2 - minHit / 2);
    hx = Math.max(bx + 2, Math.min(hx, bx + bw - minHit - 2));
    hy = Math.max(by + 2, Math.min(hy, (bh != null ? by + bh : by + minHit + 4) - minHit - 2));
    R.treffer.push({ x: hx, y: hy, w: minHit, h: minHit, i: 'x' });
  }
  // Panel immer in W×H halten (kuerzen statt abschneiden)
  function panelPlatz(bh) {
    bh = Math.min(bh, H - 4);
    var by = Math.round(Math.max(2, (H - bh) / 2));
    if (by + bh > H - 2) by = Math.max(2, H - 2 - bh);
    return { by: by, bh: bh };
  }
  function zeichneListe(R, titel, kopf, eintraege, index, o) {
    var c = R.ctx, bw = o && o.breite || Math.min(260, W - 20), kopfH = kopf.length * 10;
    var minRow = R.touch ? touchZeile(R) : (R.hochkant ? 26 : 18);
    var rowH = o && o.zeile != null ? o.zeile : minRow;
    if (R.touch) rowH = Math.max(minRow, rowH);
    var titelH = R.touch ? Math.max(touchZeile(R) + 4, 24) : 18;
    var scrollH = R.touch ? touchZeile(R) : 14;
    var freiMax = H - 4;
    function chrome(mitScroll) { return titelH + 8 + kopfH + (mitScroll ? 2 * scrollH : 0) + 6; }
    var maxSichtbar = Math.max(1, Math.floor((freiMax - chrome(false)) / rowH));
    var scrollt = eintraege.length > maxSichtbar;
    if (scrollt) maxSichtbar = Math.max(1, Math.floor((freiMax - chrome(true)) / rowH));
    var start = 0;
    if (scrollt) start = Math.max(0, Math.min(index - Math.floor((maxSichtbar - 1) / 2), eintraege.length - maxSichtbar));
    var nSicht = scrollt ? maxSichtbar : eintraege.length;
    var roh = chrome(scrollt) + nSicht * rowH;
    var pl = panelPlatz(Math.min(roh, freiMax)), bx = Math.round((W - bw) / 2), by = pl.by, bh = pl.bh;
    abdunkeln(c, 0.55);
    panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    textInBox(c, titel, bx + 18, by + 3, bw - 36, titelH - 4, 9, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
    schliessX(R, bx, by, bw, bh);
    var yKopf = by + titelH;
    kopf.forEach(function (z, i) { textInBox(c, z, bx + 10, yKopf + i * 10, bw - 20, 10, 8, { col: P.uiTinteWeich, ausr: 'center', maxZeilen: 1 }); });
    var y0 = yKopf + kopfH + 2;
    if (scrollt && start > 0) {
      knopfZeile(c, bx + 9, y0, bw - 18, scrollH - 2, false, '▲', true);
      R.treffer.push({ x: bx + 9, y: y0, w: bw - 18, h: scrollH, i: 'up' });
      y0 += scrollH;
    }
    var i;
    for (i = 0; i < nSicht; i++) {
      var ei = start + i, e = eintraege[ei], ey = y0 + i * rowH;
      if (ey + rowH - 2 > by + bh - 2) break;
      knopfZeile(c, bx + 9, ey, bw - 18, rowH - 2, ei === index, e.label, e.aktiv, e.rechts);
      R.treffer.push({ x: bx + 9, y: ey, w: bw - 18, h: rowH, i: ei });
    }
    if (scrollt && start + nSicht < eintraege.length) {
      var dy = Math.min(by + bh - scrollH - 2, y0 + nSicht * rowH);
      knopfZeile(c, bx + 9, dy, bw - 18, scrollH - 2, false, '▼', true);
      R.treffer.push({ x: bx + 9, y: dy, w: bw - 18, h: scrollH, i: 'down' });
    }
  }

  function startBild(R, S) {
    var c = R.ctx, t = S.t;
    Sz.kesselSzene(c, W, H, 8 + (t * 0.35) % 20, t);                    // Tageslauf im Hintergrund
    var grd = c.createRadialGradient(W / 2, 28, 4, W / 2, 28, 130); grd.addColorStop(0, 'rgba(255,79,160,0.3)'); grd.addColorStop(1, 'rgba(255,79,160,0)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    var rowH = R.touch ? touchZeile(R) : 18, rowGap = R.touch ? 4 : 2, drawH = R.touch ? rowH : 16;
    var zeilen = Saufi.Hinweise.HINWEIS_START, lz = 9, bh = zeilen.length * lz + 10;
    var knopfBlock = 2 * (rowH + rowGap) + 24;
    var gesamt = 42 + bh + 8 + knopfBlock;
    var y0 = Math.max(4, Math.round((H - gesamt) / 2));
    textInBox(c, 'Press11 - Saufi Saufi', 16, y0, W - 32, 16, 13, { col: '#fff8ee', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    textInBox(c, 'Stuttgart, Samstag 08:00 bis Sonntag 04:00', 20, y0 + 16, W - 40, 12, 8, { col: '#fff3c8', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    var by = y0 + 32;
    panel(c, 16, by, W - 32, bh, 'rgba(255,248,238,0.96)', 8);
    zeilen.forEach(function (z, i) { textInBox(c, z, 24, by + 4 + i * lz, W - 48, lz, 7, { col: i === 0 ? P.bierRot : P.uiTinte, ausr: 'center', maxZeilen: 1 }); });
    var ey = by + bh + 8;
    R.treffer = [];
    var eintraege = [{ label: 'Ich bin 18+. Los geht\'s! (E / Tippen)' }, { label: 'Scooter-Playlist (P)' }];
    eintraege.forEach(function (e, i) {
      var sel = i === S.startIndex, ry = ey + i * (rowH + rowGap), blink = sel && Math.floor(t * 2) % 2 === 0;
      rr(c, 40, ry, W - 80, drawH, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, 7, sel ? P.kontur : 'rgba(74,53,96,0.3)', 0.9);
      textInBox(c, e.label, 48, ry + 1, W - 96, drawH - 2, 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
      R.treffer.push({ x: 40, y: ry, w: W - 80, h: rowH, i: i });
    });
    var footY = ey + 2 * (rowH + rowGap);
    textInBox(c, S.best ? 'Bestwert: ' + S.best + ' Punkte' : 'Ab 18 · Fiktives Spaß-Spiel', 20, footY, W - 40, 11, 7, { col: '#fff3c8', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    textInBox(c, 'Tippen zum Start', 20, footY + 12, W - 40, 11, 7, { col: '#ffe9a8', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
  }

  function endeBild(R, S) {
    var c = R.ctx, e = S.ende, sieg = e.sieg, t = S.t;
    var sCss = cssSkala(R);
    var top = (R.hochkant && R.touch) ? Math.ceil(50 / Math.max(0.5, sCss)) : 8;
    var bx = 20, bw = W - 40, innen = bw - 20, w = e.wertung;
    var kopf = w.kopf || (sieg ? 'Du stehst noch, Saufi.' : 'Press F to pay respects.');
    var grund = sieg ? 'Sonntag, 04:00. Sonnenaufgang überm Kessel. MS-Marathon geschafft.' : (e.grund || '');
    var titelZ = (w.medaille ? w.medaille + ': ' : '') + w.titel;
    var punkteZ = 'Punkte: ' + S.punkte.punkte + (e.neuerBestwert ? '  (neuer Bestwert!)' : (S.best ? '  (Bestwert ' + S.best + ')' : ''));
    var rundenZ = 'Runden mitgetrunken: ' + S.runden.geschafft + ' von ' + S.runden.runden.length + ' · Team ' + S.runden.team + '/5';
    var dankeZ = Saufi.Hinweise.DANKE;
    var btnLabel = R.touch ? 'Tippen: Neustart' : 'E / Tippen: Neustart';
    var btnH = R.touch ? Math.max(17, touchZeile(R)) : 17;
    function mess(txt, boxH, sz, mz) { return textInBox(c, txt, 0, 0, innen, boxH, sz, { ausr: 'center', mess: true, maxZeilen: mz }); }
    var mKopf = mess(kopf, 22, kopf.length > 28 ? 9 : 11, 2), mGrund = mess(grund, 40, 9, 3);
    var mTitel = mess(titelZ, 16, 9, 2), mPunkte = mess(punkteZ, 16, 8, 2);
    var mRunden = mess(rundenZ, 16, 7, 2), mDanke = mess(dankeZ, 16, 8, 2);
    var gap = 3, pad = 10;
    var inhalt = pad + Math.ceil(mKopf.h) + gap + Math.ceil(mGrund.h) + gap + Math.ceil(mTitel.h) + 2 + Math.ceil(mPunkte.h) + 2 + Math.ceil(mRunden.h) + gap + Math.ceil(mDanke.h) + gap + btnH + pad;
    var maxPh = Math.max(60, H - top - 8), ph = Math.min(inhalt, maxPh);
    // Hoch: Panel in der Mitte des oberen Drittels → Landschaft darunter sichtbar
    var by0;
    if (R.hochkant) by0 = Math.max(top, Math.round(H / 6 - ph / 2));
    else by0 = top + Math.max(0, Math.floor((H - top - 8 - ph) / 2));
    if (by0 + ph > H - 4) by0 = Math.max(top, H - 4 - ph);
    // Kessel zuerst; Turm nur oberhalb Panel; Sterne nur im oberen Himmel
    Sz.kesselSzene(c, W, H, sieg ? 28 : 26, t, { turmMaxY: by0, sterneMaxY: Math.max(H * 0.35, by0 - 4) });
    // Sieg: grosse Sonne links der Mitte, nicht im Panel/Turm
    if (sieg) {
      var sonneR = Math.max(10, W * 0.07), sx = Math.round(W * 0.28), sy = Math.round(H * 0.42);
      if (sy + sonneR > by0 - 2) sy = by0 - sonneR - 4;
      if (sx + sonneR > bx) sx = Math.max(sonneR + 4, bx - sonneR - 8);
      G.glanz(c, sx, sy, sonneR * 3.5, 'rgba(255,230,160,0.75)', 'rgba(255,230,160,0)');
      kreis(c, sx, sy, sonneR, '#ffe08a'); kreis(c, sx - sonneR * 0.25, sy - sonneR * 0.25, sonneR * 0.35, '#fff6c8');
      R.endeSonne = { x: sx, y: sy, r: sonneR };
    } else R.endeSonne = null;
    // Panel undurchsichtig (Alpha 1.0) — kein Turmschaft durchs Panel
    panel(c, bx, by0, bw, ph, 'rgba(255,248,238,1)', 10);
    R.panel = { x: bx, y: by0, w: bw, h: ph };
    var y = by0 + pad;
    textInBox(c, kopf, bx + 10, y, innen, Math.ceil(mKopf.h), kopf.length > 28 ? 9 : 11, { col: sieg ? '#2f8a4a' : P.bierRot, ausr: 'center', maxZeilen: 2 });
    y += Math.ceil(mKopf.h) + gap;
    textInBox(c, grund, bx + 10, y, innen, Math.ceil(mGrund.h), 9, { col: P.uiTinteWeich, ausr: 'center', maxZeilen: 3 });
    y += Math.ceil(mGrund.h) + gap;
    textInBox(c, titelZ, bx + 10, y, innen, Math.ceil(mTitel.h), 9, { col: P.uiTinte, ausr: 'center', maxZeilen: 2 });
    y += Math.ceil(mTitel.h) + 2;
    textInBox(c, punkteZ, bx + 10, y, innen, Math.ceil(mPunkte.h), 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 2 });
    y += Math.ceil(mPunkte.h) + 2;
    textInBox(c, rundenZ, bx + 10, y, innen, Math.ceil(mRunden.h), 7, { col: P.uiTinteWeich, ausr: 'center', maxZeilen: 2 });
    y += Math.ceil(mRunden.h) + gap;
    textInBox(c, dankeZ, bx + 10, y, innen, Math.ceil(mDanke.h), 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 2 });
    y += Math.ceil(mDanke.h) + gap;
    var byBtn = Math.min(by0 + ph - pad - btnH, Math.max(y, by0 + pad));
    var blink = Math.floor(t * 2) % 2 === 0, bxBtn = 56, bwBtn = W - 112;
    rr(c, bxBtn, byBtn, bwBtn, btnH, blink ? '#fff3b0' : '#ffe9a8', 7, P.kontur, 0.9);
    textInBox(c, btnLabel, bxBtn + 4, byBtn + 1, bwBtn - 8, btnH - 2, 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
    R.treffer = [];
    R.treffer.push({ x: bxBtn, y: byBtn, w: bwBtn, h: btnH, i: 0 });
  }

  function pressFBild(R, S) {
    var c = R.ctx, p = S.pressF, hat = p.zweitesLeben;
    c.fillStyle = 'rgba(10,6,20,0.72)'; c.fillRect(0, 0, W, H);
    textInBox(c, 'F', W / 2 - 40, H * 0.18, 80, 48, 42 + Math.sin(S.t * 14) * 2, { col: '#ffffff', ausr: 'center', kontur: P.kontur, min: 24 });
    textInBox(c, hat ? 'Press F! Steh wieder auf!' : 'Press F to pay respects', 20, H * 0.48, W - 40, 20, 12, { col: '#ffe84f', ausr: 'center', kontur: P.kontur, maxZeilen: 2 });
    if (hat) {
      textInBox(c, 'Drück F (oder tipp) ' + p.noetig + ' Mal in 3 Sekunden: ' + p.n + '/' + p.noetig, 16, H * 0.58, W - 32, 28, 8, { col: '#ffffff', ausr: 'center', kontur: P.kontur, maxZeilen: 2 });
      rr(c, W / 2 - 60, H * 0.73, 120, 8, 'rgba(255,255,255,0.18)', 4, '#ffffff', 0.7); if (p.rest > 0) rr(c, W / 2 - 59, H * 0.73 + 1, 118 * Math.max(0.02, Math.min(1, p.rest / 3)), 6, '#ff5f8a', 3);
    } else {
      textInBox(c, 'Kein zweites Leben mehr. Drück F.', 20, H * 0.60, W - 40, 16, 9, { col: '#ffffff', ausr: 'center', kontur: P.kontur, maxZeilen: 2 });
    }
  }

  function textFeld(R, titel, absaetze, fussEintraege, index) {
    var c = R.ctx, bw = W - 28, fussH = R.touch ? touchZeile(R) : 20, titelH = R.touch ? Math.max(touchZeile(R) + 4, 24) : 18;
    var fh = fussEintraege.length * fussH, textH = Math.max(40, H - 6 - titelH - 8 - fh), bx = 14;
    var bh = Math.min(H - 6, titelH + 8 + textH + fh + 4);
    var pl = panelPlatz(bh); bh = pl.bh;
    var by = pl.by;
    abdunkeln(c, 0.6); panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    textInBox(c, titel, bx + 18, by + 3, bw - 36, titelH - 4, 9, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
    schliessX(R, bx, by, bw, bh);
    var bodyH = bh - titelH - 4 - fh, bodyY = by + titelH;
    var joined = absaetze.join('\n\n');
    textInBox(c, joined, bx + 10, bodyY, bw - 20, bodyH, 9, { col: P.uiTinte, ausr: 'left', v: 'top' });
    fussEintraege.forEach(function (e, i) {
      var ey = by + bh - fh + i * fussH - 2, sel = i === index, rh = fussH - 2;
      if (ey + rh > by + bh - 2) return;
      knopfZeile(c, bx + 50, ey, bw - 100, rh, sel, e.label, true);
      R.treffer.push({ x: bx + 50, y: ey, w: bw - 100, h: Math.max(rh, R.touch ? touchZeile(R) : rh), i: i });
    });
  }

  // Playlist-Bild: Titelliste in zwei Spalten, Status, Knoepfe, X zum Schliessen.
  // Panel muss immer in W×H passen (Hoch- und Querformat); Touch: hoehere Zeilen; Titel kuerzen statt abschneiden.
  function playlistBild(R, S) {
    var c = R.ctx, o = S.overlay, Mu = Saufi.Musik, z = S.musikInfo || {};
    var bw = W - 20, bx = 10, tl = Mu.TITEL, zeilen = Math.ceil(tl.length / 2), nBtn = o.eintraege.length;
    var maxBh = H - 4, hoch = R.hochkant, touch = !!R.touch;
    var kopfH = touch ? Math.max(hoch ? 22 : 18, touchZeile(R) + 4) : (hoch ? 22 : 18);
    var songSz = hoch ? 9 : 8, lz = hoch ? 11 : 9;
    var metaSz = hoch ? 9 : 8, metaLz = hoch ? 11 : 9;
    var minRow = touch ? touchZeile(R) : 12;
    var rowH = touch ? Math.max(minRow, hoch ? 28 : 18) : (hoch ? 24 : 14);
    var scrollH = touch ? touchZeile(R) : 14;
    var qn = { mp3: 'Eigene MP3 (music/)', youtube: 'YouTube-Einbettung', webaudio: 'Eigener Spiel-Beat' }[z.quelle] || z.quelle;
    var quelleText = 'Quelle: ' + qn + (z.spielt ? ' (läuft: ' + ({ mp3: 'MP3', youtube: 'YouTube', webaudio: 'Beat' }[z.aktiv]) + ')' : '');
    // Kurz: keine Titelliste in der YouTube-Zeile (sonst … in Hoch)
    var hint = z.hinweis || '';
    if (/YouTube:\s*\d+\s*Videos/.test(hint)) hint = ('YouTube: ' + Mu.VIDEOS.length + ' Videos');
    if (!hint) hint = z.youtubeVerfuegbar
      ? 'YouTube: ' + Mu.VIDEOS.length + ' Videos'
      : 'YouTube nur über http://localhost, nicht file://';
    function bhVon(kH, lz2, mLz, rH, nShow, mitScroll) { return kH + zeilen * lz2 + 4 + 2 * mLz + 4 + (mitScroll ? 2 * scrollH : 0) + nShow * rH + 4; }
    var maxBtn = nBtn, scrollt = false, start = 0;
    var bh = bhVon(kopfH, lz, metaLz, rowH, maxBtn, false);
    while (bh > maxBh && lz > 9) { lz--; bh = bhVon(kopfH, lz, metaLz, rowH, maxBtn, false); }
    while (bh > maxBh && metaLz > 9) { metaLz--; bh = bhVon(kopfH, lz, metaLz, rowH, maxBtn, false); }
    while (bh > maxBh && kopfH > 18) { kopfH--; bh = bhVon(kopfH, lz, metaLz, rowH, maxBtn, false); }
    if (bh > maxBh) {
      scrollt = true;
      var rest = maxBh - (kopfH + zeilen * lz + 4 + 2 * metaLz + 4 + 2 * scrollH + 4);
      maxBtn = Math.max(1, Math.floor(rest / Math.max(minRow, rowH)));
      rowH = Math.max(minRow, Math.min(rowH, Math.floor(rest / maxBtn)));
      bh = Math.min(maxBh, bhVon(kopfH, lz, metaLz, rowH, maxBtn, true));
      start = Math.max(0, Math.min(o.index - Math.floor((maxBtn - 1) / 2), nBtn - maxBtn));
    }
    var pl = panelPlatz(bh); bh = pl.bh; var by = pl.by;
    abdunkeln(c, 0.6); panel(c, bx, by, bw, bh, P.uiFlaeche, 8);
    R.panel = { x: bx, y: by, w: bw, h: bh };
    R.treffer = [];
    textInBox(c, 'Scooter-Playlist', bx + 18, by + 2, bw - 36, kopfH - 2, 9, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
    schliessX(R, bx, by, bw, bh);
    var colW = (bw - 20) / 2;
    tl.forEach(function (t2, i) {
      var cx2 = bx + 10 + (i >= zeilen ? colW : 0), cy2 = by + kopfH + (i % zeilen) * lz;
      textInBox(c, (i + 1) + '. ' + t2, cx2, cy2, colW - 4, lz, songSz, { col: P.uiTinte, ausr: 'left', maxZeilen: 1 });
    });
    var sy = by + kopfH + zeilen * lz + 2;
    textInBox(c, quelleText, bx + 8, sy, bw - 16, metaLz, metaSz, { col: P.uiTinteWeich, ausr: 'center', maxZeilen: 1 });
    textInBox(c, hint, bx + 8, sy + metaLz, bw - 16, metaLz, metaSz, { col: P.uiTinteWeich, ausr: 'center', maxZeilen: 1 });
    var ey0 = sy + 2 * metaLz + 2;
    if (scrollt && start > 0) {
      knopfZeile(c, bx + 8, ey0, bw - 16, scrollH - 2, false, '▲', true);
      R.treffer.push({ x: bx + 8, y: ey0, w: bw - 16, h: scrollH, i: 'up' });
      ey0 += scrollH;
    }
    var i, nShow = scrollt ? maxBtn : nBtn;
    for (i = 0; i < nShow; i++) {
      var ei = start + i, e = o.eintraege[ei], ey = ey0 + i * rowH;
      if (ey + rowH - 2 > by + bh - 2) break;
      knopfZeile(c, bx + 8, ey, bw - 16, rowH - 2, ei === o.index, e.label, true, e.rechts);
      R.treffer.push({ x: bx + 8, y: ey, w: bw - 16, h: rowH, i: ei });
    }
    if (scrollt && start + nShow < nBtn) {
      var dy = Math.min(by + bh - scrollH - 2, ey0 + nShow * rowH);
      knopfZeile(c, bx + 8, dy, bw - 16, scrollH - 2, false, '▼', true);
      R.treffer.push({ x: bx + 8, y: dy, w: bw - 16, h: scrollH, i: 'down' });
    }
  }

  function uebergangBild(R, S) {
    if (S.uebergang) { var u = S.uebergang, a = u.t < u.dauer / 2 ? u.t / (u.dauer / 2) : 1 - (u.t - u.dauer / 2) / (u.dauer / 2); R.ctx.globalAlpha = Math.max(0, Math.min(1, a)); r(R.ctx, 0, 0, W, H, '#14102a'); R.ctx.globalAlpha = 1; }
  }

  // Innenraum: Zoom so, dass der Raum die Weltflaeche fuellt (kein grosser Schwarzstreifen)
  function weltZoomFuer(R, S, weltH) {
    var kam = S.kamera, prevW = kam ? kam.viewW : 0, prevH = kam ? kam.viewH : 0, zoom;
    if (!S.karte || !S.karte.innen) {
      R.aktuellerWeltZoom = WELT_ZOOM;
      if (kam) { kam.viewW = R.VW || VW; kam.viewH = R.VH || VH; }
      zoom = WELT_ZOOM;
    } else {
      zoom = Math.max(W / Math.max(1, S.karte.pxW), weltH / Math.max(1, S.karte.pxH));
      zoom = Math.max(MIN_WELT_ZOOM, zoom);
      kam.viewW = W / zoom;
      kam.viewH = weltH / zoom;
      kam.weltW = S.karte.pxW;
      kam.weltH = S.karte.pxH;
      R.aktuellerWeltZoom = zoom;
    }
    if (kam && S.spieler && (Math.abs(prevW - kam.viewW) > 1 || Math.abs(prevH - kam.viewH) > 1)) {
      Saufi.Kamera.sofort(kam, S.spieler.x, S.spieler.y - 8);
    }
    return zoom;
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
    var weltH = (R.hochkant && R.weltH != null) ? R.weltH : H;
    var zoom = weltZoomFuer(R, S, weltH);
    // Hoch: dunkles UI-Feld unter der Welt (Hinweise/Hilfe, kein Karten-Schwarz)
    if (R.hochkant && weltH < H) r(c, 0, weltH, W, H - weltH, P.uiDunkel || '#1b1530');
    c.save();
    if (wackel) c.translate(Math.sin(S.t * 2.1) * amp, Math.cos(S.t * 1.7) * amp);
    // Welt in Kamerakoordinaten, dann auf Bildschirm zoomen (HUD unskaliert); Hoch: Clip auf weltH
    c.save();
    if (R.hochkant && weltH < H) { c.beginPath(); c.rect(0, 0, W, weltH); c.clip(); }
    c.scale(zoom, zoom);
    zeichneWelt(R, S);
    c.restore();
    if (wackel) {                                   // doppeltes Neon-Glimmern nur im Welt-Ausschnitt (UI-Feld/HUD unberührt)
      c.globalAlpha = 0.25 + Math.min(0.2, (S.fig.pegel - 1.5) * 0.1); c.globalCompositeOperation = 'lighter';
      c.save();
      c.beginPath(); c.rect(0, 0, W, weltH); c.clip();
      c.drawImage(R.canvas, 0, 0, R.canvas.width, Math.round(weltH * sk), 3, 0, W, weltH);
      c.restore();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
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
    P: P, K: K, erstelle: erstelle, setzeBildschirm: setzeBildschirm, setzeAufloesung: setzeAufloesung, begrenzDpr: begrenzDpr, zeichne: zeichne, bauplan: bauplan, figur: figur,
    kameraView: kameraView, weltView: weltView, berechnePortH: berechnePortH,
    W: BASE_W, H: BASE_H, BASE_W: BASE_W, BASE_H: BASE_H, PORT_H: PORT_H, PORT_H_MIN: PORT_H_MIN, PORT_H_MAX: PORT_H_MAX,
    MAX_BREITE: MAX_BREITE, MAX_BG_SKALA: MAX_BG_SKALA, MAX_DPR: MAX_DPR,
    UI_RESERVE_HOCH: UI_RESERVE_HOCH, UI_RESERVE_HOCH_TOUCH: UI_RESERVE_HOCH_TOUCH, STADT_PX_H: STADT_PX_H,
    LATERNE_RADIUS: LATERNE_RADIUS, LATERNE_RADIUS_V06: 44, SCHILD_NACHT_ALPHA: SCHILD_NACHT_ALPHA, UI_DUNKEL: '#1b1530',
    get WELT_FLAECHE() { return WELT_FLAECHE; }, get WELT_ZOOM() { return WELT_ZOOM; },
    WELT_FLAECHE_HOCH: WELT_FLAECHE_HOCH, WELT_FLAECHE_QUER: WELT_FLAECHE_QUER
  };
})(globalThis);
