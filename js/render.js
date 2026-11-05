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
  var WELT_FLAECHE_HOCH = 2.4, WELT_FLAECHE_QUER = 4.0, MIN_WELT_ZOOM = 0.5, UI_RESERVE_HOCH = 80, UI_RESERVE_HOCH_TOUCH = 80, STADT_PX_H = 960;
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
        else if (t === T.TRIBUENE && karte.tile(x - 1, y) !== T.TRIBUENE) {
          var tw = 1; while (karte.tile(x + tw, y) === T.TRIBUENE) tw++;
          list.push({ y: (y + 1) * K, x: x * K, w: tw * K, art: 'tribuene' });
        }
      }
      if (karte.id === 'stadt') {
        list.push({ y: 39 * K, x: 26 * K + 4, w: 34, art: 'holzschild', text: 'Motocross' });
        // S21: zwei Kraene, Starship-Modell, Bauschild
        list.push({ y: 34 * K + 8, x: 16 * K, w: 8, art: 'kran', nr: 0, kx: 16, ky: 34 });
        list.push({ y: 33 * K + 8, x: 21 * K, w: 8, art: 'kran', nr: 1, kx: 21, ky: 33 });
        list.push({ y: 33 * K + 4, x: 20 * K, w: 12, art: 'starshipModell' });
        list.push({ y: 37 * K + 2, x: 18 * K - 10, w: 40, art: 'bauschild', zeile1: 'Stuttgart 21', zeile2: 'Fertigstellung: irgendwann in der Zukunft' });
      }
      karte.stationen.forEach(function (st) {
        if (st.typ === 'bierkasten') list.push({ y: (st.y + 1) * K, x: st.x * K, w: K, art: 'kasten' });
      });
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
    if (karte.innen) In.wandDeko(hc, karte); else {
      Sz.hangKulisse(hc, karte); Sz.blumen(hc, karte);
      // Sued-Deko y≥40·K: Beet, Heuballen, Zaun, Teich, Blumen — hash, kein S.rng
      var yMin = 40 * K;
      for (var sd = 0; sd < 5; sd++) {
        var hx = hash(sd, 77), bx = 24 + (hx % (karte.pxW - 80)), by = yMin + 20 + ((hx >> 8) % Math.max(1, karte.pxH - yMin - 60));
        var kx = Math.floor(bx / K), ky = Math.floor(by / K);
        var tt = karte.tile(kx, ky), TT = Saufi.Karte.T;
        if (karte.blockiert(kx, ky) || tt === TT.ERDE || tt === TT.HUEGEL || tt === TT.TRIBUENE || tt === TT.ABSPERR) continue;
        // Beet/Feldstreifen
        r(hc, bx, by, 28, 12, sd % 2 ? '#8a6a3a' : '#6e5430');
        r(hc, bx + 2, by + 2, 24, 1, '#5a4020'); r(hc, bx + 2, by + 5, 24, 1, '#5a4020'); r(hc, bx + 2, by + 8, 24, 1, '#5a4020');
      }
      for (var hb = 0; hb < 4; hb++) {
        var hh2 = hash(hb, 91), hx2 = 40 + (hh2 % (karte.pxW - 60)), hy2 = yMin + 40 + ((hh2 >> 6) % Math.max(1, karte.pxH - yMin - 80));
        if (karte.blockiert(Math.floor(hx2 / K), Math.floor(hy2 / K))) continue;
        ellipse(hc, hx2, hy2, 7, 4.5, '#c9a050'); ellipse(hc, hx2, hy2 - 2, 5.5, 3.2, '#d8b060');
      }
      for (var zf = 0; zf < 2; zf++) {
        var zh = hash(zf, 55), zx = 30 + (zh % (karte.pxW - 100)), zy = yMin + 60 + ((zh >> 4) % Math.max(1, karte.pxH - yMin - 100));
        if (karte.blockiert(Math.floor(zx / K), Math.floor(zy / K))) continue;
        linie(hc, zx, zy, zx + 40, zy, '#6a4a30', 1.2);
        for (var zp = 0; zp < 5; zp++) linie(hc, zx + zp * 10, zy - 5, zx + zp * 10, zy + 2, '#7a5a38', 1);
      }
      var th = hash(3, 33), tx = 80 + (th % (karte.pxW - 160)), ty = yMin + 100 + ((th >> 5) % Math.max(1, karte.pxH - yMin - 140));
      if (!karte.blockiert(Math.floor(tx / K), Math.floor(ty / K))) {
        ellipse(hc, tx, ty, 18, 10, '#4fb0d6'); ellipse(hc, tx, ty, 14, 7, '#7ec8e3');
        for (var sch = 0; sch < 4; sch++) { linie(hc, tx - 12 + sch * 8, ty + 4, tx - 10 + sch * 8, ty - 4, '#2f6a3f', 1); }
      }
      for (var bl = 0; bl < 6; bl++) {
        var bh3 = hash(bl, 44), fx = 16 + (bh3 % (karte.pxW - 32)), fy = yMin + 10 + ((bh3 >> 7) % Math.max(1, karte.pxH - yMin - 40));
        if (karte.blockiert(Math.floor(fx / K), Math.floor(fy / K))) continue;
        kreis(hc, fx, fy, 1.4, bl % 2 ? '#ff7aa0' : '#ffd36e'); kreis(hc, fx, fy, 0.6, '#fff8ee');
      }
    }
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
    if (extra === 'kurz') {
      // Kurze Haare, Seitenscheitel, keine Zöpfe
      var dk2 = dunkler(col, 0.35);
      if (dir === 'oben') {
        rr(c, hx - 4.6, hy - 1.2, 9.2, 3.2, col, 1.6);
        rr(c, hx - 4.8, hy - 0.2, 2.2, 3.6, dk2, 0.8);
      } else if (seiteKurz(dir)) {
        var sgk = dir === 'links' ? -1 : 1;
        rr(c, hx + sgk * 2.8 - 1.2, hy - 2.4, 3.6, 4.2, col, 1.2);
        rr(c, hx - sgk * 4.2, hy - 0.8, 2.4, 3.8, dk2, 0.9);
      } else {
        rr(c, hx - 4.8, hy - 2.6, 9.6, 2.8, col, 1.4);
        rr(c, hx - 4.9, hy - 0.4, 2.6, 4.2, dk2, 1);
        rr(c, hx + 2.2, hy - 0.2, 2.4, 3.2, col, 0.8);
      }
    }
  }
  function seiteKurz(dir) { return dir === 'links' || dir === 'rechts'; }
  // Stilisiertes Tesla-T auf Tobis Shirt (kein Logo-Nachbau)
  function teslaT(c, x, y, s) {
    s = s || 1;
    rr(c, x - 3 * s, y, 6 * s, 1.1 * s, '#fff');
    rr(c, x - 0.7 * s, y + 1.0 * s, 1.4 * s, 5.2 * s, '#fff');
    rr(c, x - 1.4 * s, y + 5.6 * s, 2.8 * s, 1.0 * s, '#fff');
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
    var phase = o.phase != null ? o.phase : fr;
    var pegel = o.pegel != null ? o.pegel : (o.torkel != null ? o.torkel * 3.2 : 0);
    var phOff = ((hash(ch && ch.id ? ch.id.length * 17 : (x | 0), (y | 0) + 3) % 1000) / 1000) * Math.PI * 2;
    // Bodenschatten unrotiert
    ellipse(c, x + SH.dx * 3.8, y - 0.15, 6.4 + Math.abs(SH.dx) * 3.2, 2.4, 'rgba(50,30,80,' + (0.18 + SH.a * 0.55).toFixed(3) + ')');
    if (o.liegt) {
      rr(c, x - 4, y - 6.6, 15, 6.4, ch.hose, 2.6, KONT, 0.85);
      rr(c, x - 8.6, y - 8.6, 12.4, 8, ch.shirt, 3, KONT, 0.85);
      if (ch.id === 'tobi') teslaT(c, x - 2.4, y - 7.2, 0.7);
      kreis(c, x - 10.6, y - 5.6, 4.4, P.haut, KONT, 0.85);
      c.beginPath(); c.arc(x - 10.6, y - 5.6, 4.6, Math.PI * 0.95, Math.PI * 1.9); c.fillStyle = ch.haar || P.haut; c.fill();
      if (extra === 'kaeppi') { rr(c, x - 15.4, y - 9.6, 4.2, 8, '#ff4fa0', 1.6, KONT, 0.6); rr(c, x - 16.6, y - 4.2, 2, 4, '#d8327f', 0.8); }   // Kaeppi seitlich am Kopf
      linie(c, x - 12, y - 5.6, x - 10.6, y - 5.3, KONT, 0.6); linie(c, x - 9.8, y - 5.6, x - 8.6, y - 5.3, KONT, 0.6);
      rr(c, x + 9, y - 4.6, 3.4, 2.6, KONT, 1.2);
      textInBox(c, 'zZz', x - 12, y - 20 + Math.sin(t * 3), 16, 10, 8, { col: '#ffffff', ausr: 'center', kontur: P.kontur, min: 7 });
      return;
    }
    var torkelAng = 0, torkelOn = pegel >= 1.5;
    if (torkelOn) {
      var krit = Math.min(1, Math.max(0, (pegel - 1.5) / 1.7));
      torkelAng = Math.sin(t * 1.4 * Math.PI * 2 + phOff) * 0.12 * krit;
      c.save(); c.translate(x, y); c.rotate(torkelAng); c.translate(-x, -y);
    }
    // Weiche Sinus-Interpolation aus phase (4-Frame-Lauf); Idle wenn nicht laeuft
    var laeuft = o.laeuft != null ? !!o.laeuft : (fr > 0 || (o.phase != null && Math.abs(Math.sin((o.phase) * Math.PI / 2)) > 0.05));
    var phaseLauf = laeuft ? phase : 0;
    var swing = Math.sin(phaseLauf * Math.PI / 2) * 2.4;
    var hop = o.tanzt ? -Math.abs(Math.sin(t * 12)) * 2.2 : 0;
    var wipp = o.tanzt ? Math.sin(t * 12) * 1.2 : 0;
    var atme = (!laeuft && !o.tanzt) ? Math.sin(t * (Math.PI * 2 / 2.6) + phOff) * 0.35 : 0;
    var bob = -Math.abs(Math.sin(phaseLauf * Math.PI / 2)) * 1.2 + hop + atme;
    var schulter = laeuft ? Math.sin(phaseLauf * Math.PI / 2) * 0.6 : 0;
    var hose = ch.hose, shirt = ch.shirt, by = y + hop;
    var beinFarbe = hose, schuh = extra === 'schuhe' ? ['#ff4fa0', '#4fe6ff'] : ['#3a2a3e', '#3a2a3e'];
    var l1 = seite ? swing : 0, l2 = seite ? -swing : 0;
    var up1 = seite ? 0 : Math.max(0, Math.sin(phaseLauf * Math.PI / 2)) * 2.0;
    var up2 = seite ? 0 : Math.max(0, -Math.sin(phaseLauf * Math.PI / 2)) * 2.0;
    if (seite) { rr(c, x - 1.9 + l2 * 1.05, by - 8.2, 3.8, 8.4, dunkler(beinFarbe, 0.18), 1.5, KONT, 0.55); rr(c, x - 2.4 + l2 * 1.05, by - 1.6, 5.4, 2.2, schuh[1], 1.1, KONT, 0.55); }
    rr(c, x - 3.8 + (seite ? l1 * 1.05 : 0), by - 8.4 + up1, 3.5, 8.6 - up1, beinFarbe, 1.5, KONT, 0.65);
    if (!seite) rr(c, x + 0.3, by - 8.4 + up2, 3.5, 8.6 - up2, beinFarbe, 1.5, KONT, 0.65);
    if (!seite) { rr(c, x - 4.3, by - 1.8 + up1, 4.4, 2.3, schuh[0], 1.1, KONT, 0.55); rr(c, x - 0.1, by - 1.8 + up2, 4.4, 2.3, schuh[1], 1.1, KONT, 0.55); }
    else { rr(c, x - 2.4 + l1 * 1.05 + (sg > 0 ? 0.5 : -0.5), by - 1.8, 5.4, 2.3, schuh[0], 1.1, KONT, 0.55); }
    var tanztArm = o.tanzt ? Math.sin(t * 12) * 3 : 0;
    var ay = by - 14.8 + bob, armSw = o.tanzt ? -3.6 : swing * 0.65;
    var armIdle = (!laeuft && !o.tanzt) ? Math.sin(t * (Math.PI * 2 / 2.6) + phOff) * 0.3 : 0;
    if (seite) rr(c, x - 1.2 - swing * 0.7, ay + armIdle, 2.6, 6.2, dunkler(shirt, 0.18), 1.2, KONT, 0.5);
    var tw = seite ? 6.8 : 9, tx = x - tw / 2 + schulter;
    rr(c, tx + wipp * 0.15, by - 16.6 + bob, tw, 9.4, shirt, 3.2, KONT, 0.85);
    vlauf(c, tx + 1, by - 15.8 + bob, tw - 2, 3.4, heller(shirt, 0.32), shirt);
    if (ch.id === 'tobi' && dir !== 'oben') {
      if (!seite) teslaT(c, x + wipp * 0.15, by - 14.6 + bob, 1);
      else rr(c, x - 1.2 + sg * 0.4, by - 14.2 + bob, 2.4, 1.0, '#fff');
    }
    if (extra === 'weste' && !seite) { rr(c, tx + 1.2, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); rr(c, tx + tw - 4, by - 15.4 + bob, 2.8, 8, '#7a7a88', 1.2); }
    else if (extra === 'weste') rr(c, tx + 0.8, by - 15.4 + bob, tw - 1.6, 8, '#7a7a88', 1.2);
    if (extra === 'tracht') { rr(c, tx + 1, by - 15.6 + bob, tw - 2, 8.2, '#1f4a2a', 1.6); for (var k = 0; k < 3; k++) kreis(c, x, by - 14 + bob + k * 2.4, 0.5, '#d8c070'); }
    if (extra === 'hut') { poly(c, [[x - 1.2, by - 16 + bob], [x + 1.2, by - 16 + bob], [x + 0.8, by - 9 + bob], [x - 0.8, by - 9 + bob]], '#1a1a22'); }
    // Prost-Glas: Bogen 0 → −5 → 0
    var glasLift = 0;
    if (o.glas && o.prost != null && o.prost > 0) glasLift = Math.sin(Math.PI * (1 - Math.min(1.4, o.prost) / 1.4)) * 5;
    else if (o.glas) glasLift = 0;
    var armTanzL = o.tanzt ? -tanztArm : 0, armTanzR = o.tanzt ? tanztArm : 0;
    if (!seite) {
      rr(c, tx - 2.2, ay + armSw * 0.45 + armIdle + armTanzL - (o.tanzt ? 3 : 0), 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.65);
      rr(c, tx + tw - 0.4, ay - armSw * 0.45 - armIdle + armTanzR - (o.tanzt ? 3 : 0) - glasLift, 2.6, o.tanzt ? 5 : 6.2, shirt, 1.3, KONT, 0.65);
      kreis(c, tx - 0.9, ay + 6 + armSw * 0.45 + armIdle + armTanzL - (o.tanzt ? 6 : 0), 1.3, P.haut, KONT, 0.45);
      kreis(c, tx + tw + 0.9, ay + 6 - armSw * 0.45 - armIdle + armTanzR - (o.tanzt ? 6 : 0) - glasLift, 1.3, P.haut, KONT, 0.45);
      if (o.glas) {
        var gx = tx + tw + 0.2, gy = ay + 1.4 - armSw * 0.45 - glasLift;
        rr(c, gx, gy, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5);
        r(c, gx + 0.2, gy, 3.2, 1.2, '#fff8ee');
        linie(c, gx + 0.4, gy + 1.5, gx + 0.4, gy + 3.8, 'rgba(255,255,255,0.55)', 0.6);
        kreis(c, gx + 1.0, gy + 0.2, 0.6, '#ffffff'); kreis(c, gx + 2.0, gy + 0.1, 0.7, '#fff8ee'); kreis(c, gx + 2.8, gy + 0.25, 0.5, '#ffffff');
        if (glasLift > 4.2) kreis(c, gx + 1.8, gy - 1.2, 0.9, '#ffe84f');
      }
    } else {
      rr(c, x - 1.2 + swing * 0.7, ay + armIdle - glasLift, 2.6, 6.2, shirt, 1.3, KONT, 0.65);
      kreis(c, x + swing * 0.7 + 0.1, ay + 6.2 + armIdle - glasLift, 1.3, P.haut, KONT, 0.45);
      if (o.glas) {
        var gx2 = x + sg * 1.4 + swing * 0.7 - 1.4, gy2 = ay + 2 - glasLift;
        rr(c, gx2, gy2, 3.6, 5, 'rgba(255,208,80,0.95)', 1.1, '#6a5a70', 0.5);
        r(c, gx2 + 0.2, gy2, 3.2, 1.0, '#fff8ee');
        kreis(c, gx2 + 1.2, gy2 + 0.15, 0.6, '#ffffff'); kreis(c, gx2 + 2.2, gy2 + 0.1, 0.7, '#fff8ee');
        if (glasLift > 4.2) kreis(c, gx2 + 1.8, gy2 - 1.2, 0.9, '#ffe84f');
      }
    }
    var kopfPend = torkelOn ? Math.sin(t * 1.4 * Math.PI * 2 + phOff + 1) * 0.8 : 0;
    var nick = o.tanzt ? Math.sin(t * 12) * 0.8 : 0;
    var hx = x + wipp * 0.3 + (seite ? sg * 0.5 : 0) + kopfPend, hy = by - 21.4 + bob + nick;
    r(c, hx - 1.2, hy + 3.4, 2.4, 2, dunkler(P.haut, 0.1));
    kreis(c, hx, hy, 4.7, P.haut, KONT, 0.85);
    var gaHaut = c.globalAlpha; c.globalAlpha = gaHaut * 0.22; kreis(c, hx - 1.4, hy - 1.2, 1.6, '#ffffff'); c.globalAlpha = gaHaut;
    var mundKrit = pegel >= 3.0;
    var ohneHaar = ch.haar == null || extra === 'kaeppi';
    if (dir === 'oben') { if (!ohneHaar) haare(c, ch, hx, hy, 'oben', extra); }
    else {
      if (!ohneHaar) haare(c, ch, hx, hy, dir, extra);
      if (seite) {
        kreis(c, hx + sg * 2.4, hy + 0.6, 0.75, '#3a2a40'); kreis(c, hx + sg * 4.8, hy + 1.2, 0.8, dunkler(P.haut, 0.08));
        if (mundKrit) textInBox(c, 'o', hx + sg * 1.2, hy + 0.6, 6, 6, 6, { col: '#7a2a3a', ausr: 'center', min: 5 });
        else mund(c, hx + sg * 1.6, hy + 0.2, o.schwips, false);
      } else {
        kreis(c, hx - 1.8, hy + 0.7, 0.8, '#3a2a40'); kreis(c, hx + 1.8, hy + 0.7, 0.8, '#3a2a40');
        if (mundKrit) textInBox(c, 'o', hx - 3, hy + 0.8, 6, 6, 6, { col: '#7a2a3a', ausr: 'center', min: 5 });
        else mund(c, hx, hy + 0.4, o.schwips, o.tanzt);
      }
    }
    if (extra === 'muetze') {
      c.beginPath(); c.arc(hx, hy - 0.6, 5.1, Math.PI, 0); c.closePath(); c.fillStyle = '#e0504a'; c.fill(); c.lineWidth = 0.6; c.strokeStyle = '#8a2a28'; c.stroke();
      rr(c, hx - 5.4, hy - 1.2, 10.8, 1.6, '#c03a38', 0.8);
      if (dir === 'unten') rr(c, hx - 3, hy - 0.4, 6, 1.4, '#8a2a28', 0.7); else if (dir !== 'oben') rr(c, hx + sg * 3, hy - 0.6, 4.2 * sg, 1.5, '#8a2a28', 0.7);
      kreis(c, hx, hy - 5.5, 1, '#fff8ee');
    }
    if (extra === 'schnurrbart' && dir !== 'oben') {
      if (seite) rr(c, hx + sg * 1.4 - 1.4, hy + 1.9, 3.8, 1.2, '#5a3a28', 0.6); else { rr(c, hx - 3, hy + 1.8, 3, 1.3, '#5a3a28', 0.6); rr(c, hx, hy + 1.8, 3, 1.3, '#5a3a28', 0.6); }
    }
    if (extra === 'cap') {
      c.beginPath(); c.arc(hx, hy - 0.6, 5.1, Math.PI, 0); c.closePath(); c.fillStyle = '#1a1a22'; c.fill();
      if (dir === 'unten') rr(c, hx - 4.4, hy - 1, 8.8, 1.8, '#0e0e14', 0.8); else if (dir !== 'oben') rr(c, hx + sg * 3.4 - (sg < 0 ? 4.4 : 0), hy - 0.8, 4.4, 1.6, '#0e0e14', 0.8);
      r(c, hx - 1.6, hy - 3.6, 3.2, 0.9, '#fff8ee');
    }
    if (extra === 'kaeppi') {
      c.beginPath(); c.arc(hx, hy - 0.6, 5.1, Math.PI, 0); c.closePath(); c.fillStyle = '#ff4fa0'; c.fill();
      c.lineWidth = 0.6; c.strokeStyle = '#c03070'; c.stroke();
      if (dir === 'unten') rr(c, hx - 4.6, hy - 1, 9.2, 1.8, '#fff8ee', 0.8); else if (dir !== 'oben') rr(c, hx + sg * 3.4 - (sg < 0 ? 4.6 : 0), hy - 0.8, 4.6, 1.6, '#fff8ee', 0.8);
      r(c, hx - 1.4, hy - 3.4, 2.8, 0.8, '#fff8ee');
    }
    if (extra === 'hut') {
      rr(c, hx - 7, hy - 1.8, 14, 1.8, '#1a1a22', 0.9); rr(c, hx - 4.2, hy - 6.8, 8.4, 5.4, '#1a1a22', 1.8); r(c, hx - 4.2, hy - 3.4, 8.4, 1, '#c9c3d6');
    }
    if (extra === 'tracht') {
      rr(c, hx - 6, hy - 1.8, 12, 1.6, '#2f6a3f', 0.8); rr(c, hx - 4, hy - 6.4, 8, 5, '#2f6a3f', 2);
      linie(c, hx + 2.6, hy - 5, hx + 5, hy - 9, '#d8c070', 0.9); linie(c, hx + 2.6, hy - 5, hx + 4, hy - 9.4, '#e8d890', 0.5);
    }
    if (extra === 'brille' && dir !== 'oben') {
      var gl = 'rgba(255,255,255,0.35)';
      if (seite) kreis(c, hx + sg * 2.6, hy + 0.7, 1.7, gl, '#1a1a22', 0.6);
      else { kreis(c, hx - 1.9, hy + 0.7, 1.7, gl, '#1a1a22', 0.6); kreis(c, hx + 1.9, hy + 0.7, 1.7, gl, '#1a1a22', 0.6); r(c, hx - 0.3, hy + 0.5, 0.6, 0.5, '#1a1a22'); }
    }
    if (extra === 'schuhe' && o.tanzt) kreis(c, hx, hy - 8, 0.8, '#ffd75e');
    // Himmelsbach: Stirnband + Trillerpfeife (maennlich)
    if (extra === 'pfeife') {
      rr(c, hx - 5.2, hy - 2.2, 10.4, 1.6, '#e0504a', 0.7);
      if (dir !== 'oben') {
        var pxp = seite ? (hx + sg * 2.2) : (hx + 3.2), pyp = hy + 1.4;
        rr(c, pxp - 0.6, pyp, 3.2, 1.4, '#c9c3d6', 0.6, KONT, 0.5);
        kreis(c, pxp + 2.6, pyp + 0.7, 1.1, '#fff8ee', KONT, 0.45);
      }
    }
    if (torkelOn) c.restore();
  }

  function namensschild(c, name, x, y) {
    var tw = Math.max(28, Math.min(52, String(name).length * 4.2 + 6));
    rr(c, x - tw / 2, y - 5, tw, 10, '#fff8ee', 3, P.kontur, 0.7);
    textInBox(c, name, x - tw / 2 + 1, y - 4, tw - 2, 8, 5.5, { col: P.uiTinte, ausr: 'center', min: 5, maxZeilen: 1 });
  }

  function blase(c, x, y, s, vermeide, belegt) {
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
    // v15: Blasen gegeneinander staffeln (nach oben schieben, bis frei)
    if (belegt) {
      for (var gi = 0; gi < 6; gi++) {
        var hit = belegt.filter(function (r) { return !(bx + bw <= r.x || r.x + r.w <= bx || by + bh <= r.y || r.y + r.h <= by); })[0];
        if (!hit) break;
        by = Math.round(hit.y - bh - 3);
      }
      belegt.push({ x: bx, y: by, w: bw, h: bh });
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
    } else {
      In.innenFensterNacht(c, karte, Math.min(0.85, licht.glut * 0.9), cx, cy);
      if (karte.id === 'hotel' && In.hotelAnim) In.hotelAnim(c, S, cx, cy);
    }

    // Sortierte Dinge: Props, Orte-Objekte, Figuren (Y-Sortierung verhindert Ueberlappungsfehler)
    var dinge = [];
    propsFuer(R, karte).forEach(function (p) { if (p.x - cx < viewW + 40 && p.x - cx > -140 && p.y - cy > -20 && p.y - cy < viewH + 120) dinge.push(p); });
    if (!karte.innen) dinge.push({ y: 15 * K + 4, x: 0, art: 'tram' });
    if (karte.id === 'hotel' && S.joint && !S.joint.gefunden) dinge.push({ y: 8 * K + 12, art: 'joint', x: 14 * K, ky: 8 * K });
    S.npcs.forEach(function (n) { if (n.aktiv && n.karteId === karte.id) dinge.push({ y: n.y, art: 'npc', n: n }); });
    if (S.zustand !== 'start') dinge.push({ y: S.spieler.y + 0.1, art: 'spieler' });
    if (karte.id === 'stadt' && Saufi.Motocross && Saufi.Motocross.stand) {
      Saufi.Motocross.stand(t).forEach(function (b) {
        dinge.push({ y: b.y, art: 'motorrad', b: b, x: b.x });
      });
    }
    if (karte.id === 'disko') dinge.push({ y: 10 * K + 8, art: 'tuersteher', x: 6 * K + 8, ky: 10 * K + 8 });
    dinge.sort(function (a, b) { return a.y - b.y || (a.art === 'spieler' ? 1 : 0) - (b.art === 'spieler' ? 1 : 0); });
    // Schild- und Gebaeude-Rechtecke in Bildschirmkoordinaten (fuer → HIER-Label)
    var zZoom = R.aktuellerWeltZoom != null ? R.aktuellerWeltZoom : WELT_ZOOM;
    R._schildRects = []; R._gebRects = [];
    if (!karte.innen) karte.gebaeude.forEach(function (b) {
      var pl = bauplan(b), sh = pl.schildHaupt || { x: pl.schild.x, y: pl.schild.y, w: Math.min(pl.w - 8, 112), h: 14 };
      R._schildRects.push({ x: (sh.x - sh.w / 2 - cx) * zZoom, y: (sh.y - cy) * zZoom, w: sh.w * zZoom, h: sh.h * zZoom });
      R._gebRects.push({ x: (pl.x0 - cx) * zZoom, y: (pl.y0 - cy) * zZoom, w: pl.w * zZoom, h: pl.h * zZoom });
      if (pl.schildNeben) {
        var sn = pl.schildNeben;
        R._schildRects.push({ x: (sn.x - cx) * zZoom, y: (sn.y - cy) * zZoom, w: sn.w * zZoom, h: sn.h * zZoom });
      }
    });
    R.blasen = [];
    dinge.forEach(function (d) {
      var px = d.x - cx, fy = d.y - cy;                           // d.y = Fusslinie
      if (d.art === 'geb') zeichneGebaeude(R, c, d.b, px, d.b.y * K - cy);
      else if (d.art === 'baum') { ellipse(c, px + 8 + SH.dx * 7, fy - 1, 7 + Math.abs(SH.dx) * 3, 2.6, 'rgba(50,30,80,' + (0.2 + SH.a * 0.6) + ')'); Sz.zeichneSprite(R, c, 'baum' + (d.hs % 3), 36, 38, 18, 32, px + 8, fy - 1, function (hc) { Sz.baumBild(hc, d.hs % 3); }); }
      else if (d.art === 'busch') Sz.zeichneSprite(R, c, 'busch' + (d.hs % 2), 24, 16, 12, 14, px + 8, fy - 1, function (hc) { Sz.buschBild(hc, d.hs % 2); });
      else if (d.art === 'laterne') { if (SH.a > 0.02) ellipse(c, px + 8 + SH.dx * 6, fy - 1, 5, 1.2, 'rgba(50,30,80,' + SH.a + ')'); Sz.zeichneSprite(R, c, 'laterne', 14, 28, 7, 26, px + 8, fy - 0.5, function (hc) { Sz.laterneBild(hc); }); }
      else if (d.art === 'bank') Sz.zeichneSprite(R, c, 'bank', 22, 18, 11, 16, px + 8, fy - 1, function (hc) { Sz.bankBild(hc); });
      else if (d.art === 'kasten') Sz.zeichneSprite(R, c, 'kasten', 14, 12, 7, 11, px + 8, fy - 1, function (hc) { Sz.kastenBild(hc); });
      else if (d.art === 'brunnen') { Sz.zeichneSprite(R, c, 'brunnen', 40, 42, 20, 36, px + 16, fy - 3, function (hc) { Sz.brunnenBild(hc); }); Sz.brunnenWasser(c, px + 16, fy - 3, t); }
      else if (d.art === 'tribuene') {
        for (var ti = 0; ti < 3; ti++) rr(c, px + 1, fy - 4 - ti * 6, d.w - 2, 5, ti % 2 ? '#8a6a4a' : '#a07850', 1.2, '#4a3560', 0.55);
        rr(c, px - 1, fy - 22, 3, 22, '#6a6a72', 0.8); rr(c, px + d.w - 2, fy - 22, 3, 22, '#6a6a72', 0.8);
      }
      else if (d.art === 'holzschild') {
        r(c, px + 15, fy - 14, 2, 14, '#6a4a30');
        rr(c, px, fy - 22, 34, 10, '#c98b5e', 1.5, '#5a3a28', 0.7);
        textInBox(c, d.text || 'Motocross', px + 1, fy - 21, 32, 8, 5.5, { col: '#fff8ee', ausr: 'center', min: 5, maxZeilen: 1 });
      }
      else if (d.art === 'bauschild') {
        r(c, px + 28, fy - 20, 2.5, 20, '#6a4a30');
        rr(c, px - 4, fy - 46, 66, 28, '#e8a020', 1.5, '#5a3a28', 0.7);
        textInBox(c, d.zeile1 || 'Stuttgart 21', px - 2, fy - 44, 62, 9, 7, { col: '#1a1020', ausr: 'center', min: 5, maxZeilen: 1 });
        textInBox(c, d.zeile2 || 'Fertigstellung: irgendwann in der Zukunft', px - 2, fy - 35, 62, 16, 5.5, { col: '#1a1020', ausr: 'center', min: 4.5, maxZeilen: 2 });
      }
      else if (d.art === 'kran') kran(c, px + 4, fy, t, d.nr || 0);
      else if (d.art === 'starshipModell') zeichneStarshipModell(c, px + 6, fy);
      else if (d.art === 'tram') { var tx = ((t * 14) % (karte.pxW + 160)) - 90 - cx; if (tx > -80 && tx < viewW + 10) Sz.strassenbahn(c, tx, 253 - cy, t); }
      else if (d.art === 'motorrad') zeichneMotorrad(c, d.b || d, cx, cy);
      else if (d.art === 'joint') zeichneJoint(c, d.x - cx + 8, d.ky - cy + 8, t);
      else if (d.art === 'tuersteher') figur(c, { id: 'tuersteher', shirt: '#14102a', hose: '#14102a', haar: '#14102a', extra: 'hut' }, d.x - cx, d.ky - cy, { dir: 'unten', t: t });
      else if (d.art === 'npc') {
        var n = d.n;
        figur(c, n.char, n.x - cx, n.y - cy, {
          dir: n.dir, schritt: n.schritt, phase: n.anim % 4, laeuft: n.laeuft, liegt: n.liegt, t: t,
          schwips: n.fig.pegel > 1.5, tanzt: S.tanzBeat && !n.liegt, glas: S.prost > 0 && !n.liegt,
          pegel: n.fig.pegel, prost: S.prost
        });
        if (n.char && n.char.id === 'raphael' && !n.liegt && !n.blase) namensschild(c, n.char.name, n.x - cx, n.y - cy - 28);
        if (n.blase && !n.liegt) {
          var vermeide = null;
          if (!karte.innen) karte.gebaeude.forEach(function (b) {
            if (b.id !== 'kneipe') return;
            var pl = bauplan(b); if (!pl.schildNeben) return;
            var sn = pl.schildNeben;
            vermeide = { x: sn.x - cx, y: sn.y - cy, w: sn.w, h: sn.h };
            var hs = pl.schildHaupt || pl.schild; if (hs) {
              var hw = (pl.schildHaupt && pl.schildHaupt.w) || Math.min(pl.w - 8, 108), hh = (pl.schildHaupt && pl.schildHaupt.h) || 14;
              var main = { x: hs.x - hw / 2 - cx, y: hs.y - cy, w: hw, h: hh };
              if (!vermeide || n.y - cy - 25 < sn.y - cy + sn.h) vermeide = main;
            }
          });
          R.blasen.push({ x: n.x - cx, y: n.y - cy - 25, text: n.char.name + ': ' + n.blase.text, vermeide: vermeide });
        }
        else if (n.liegt && Math.hypot(n.x - S.spieler.x, n.y - S.spieler.y) <= Saufi.NPCs.WECK_REICHWEITE) textInBox(c, (S.touch ? 'Wecken!' : 'Q = wecken'), n.x - cx - 28, n.y - cy - 22, 56, 12, 8, { col: '#ffffff', ausr: 'center', kontur: P.kontur, min: 7 });
      }
      else if (d.art === 'spieler') {
        var sp = S.spieler, ch = S.char;
        figur(c, ch, sp.x - cx, sp.y - cy, {
          dir: sp.dir, schritt: sp.schritt, phase: sp.anim % 4, laeuft: sp.laeuft, liegt: sp.liegt, t: t,
          schwips: S.fig.pegel > 1.5, tanzt: sp.tanzt > 0, glas: S.prost > 0,
          pegel: S.fig.pegel, prost: S.prost
        });
        if (!sp.liegt) {
          var mx = sp.x - cx, my = sp.y - cy - 31 + Math.sin(t * 5) * 1.2;
          if (ch.id === 'raphael') namensschild(c, ch.name, mx, my - 10);
          poly(c, [[mx - 3.2, my], [mx + 3.2, my], [mx, my + 4]], P.gold, P.kontur, 0.7);
        }
      }
    });
    // Effekte (Funken-Sterne, Schaum, Staub) — nur Weltpass
    (S.effekte || []).forEach(function (e) {
      var a = Math.max(0, e.rest / e.dauer), age = e.dauer - e.rest;
      var ex = e.x - cx + e.vx * age, ey = e.y - cy + e.vy * age + (e.art === 'funke' ? 0.5 * 40 * age * age : 0);
      c.globalAlpha = Math.min(1, a) * (e.alpha0 != null ? e.alpha0 : 1);
      if (e.art === 'schaum') {
        kreis(c, ex, ey, e.r || 0.9, e.farbe || '#fff8ee');
      } else if (e.art === 'staub') {
        kreis(c, ex, ey, e.r || 1.2, e.farbe || 'rgba(180,160,120,0.25)');
        kreis(c, ex + 1.4, ey + 0.4, (e.r || 1.2) * 0.7, e.farbe || 'rgba(180,160,120,0.2)');
      } else if (e.art === 'funke' || !e.art) {
        var col = e.farbe || '#ffe84f';
        if (e.stern) {
          var fade = a < 0.5 ? G.mischeHex('#ffe84f', '#ff8a2a', 1 - a * 2) : col;
          c.strokeStyle = fade; c.lineWidth = 1.0; c.lineCap = 'round';
          c.beginPath(); c.moveTo(ex - 0.8, ey); c.lineTo(ex + 0.8, ey); c.moveTo(ex, ey - 0.8); c.lineTo(ex, ey + 0.8); c.stroke();
        } else kreis(c, ex, ey, e.r || 1.2, a < 0.5 ? '#ff8a2a' : col);
      } else kreis(c, ex, ey, e.r || 1.2, e.farbe);
      c.globalAlpha = 1;
    });

    // Toenung: Tageslicht (draussen) oder Raumlicht (innen) — weicher Verlauf
    var tint = tintFuer(S);
    c.globalCompositeOperation = 'multiply'; r(c, 0, 0, viewW, viewH, rgb(tint)); c.globalCompositeOperation = 'source-over';
    zeichneLichter(R, S, cx, cy, tint);
    if (S.marker) {                                               // v12: Zielmarker wie Finca (rot = nicht erreichbar); v13 Hochformat groesser
      var mk = S.marker, mx = mk.x - cx, my = mk.y - cy, ms = R.hochkant ? 1.5 : 1, pu = 1 + 0.15 * Math.sin(mk.t * 8);
      c.save(); c.globalAlpha = mk.nein ? Math.max(0, 1 - mk.t) : 0.9; c.lineWidth = 1.2 * ms; c.strokeStyle = mk.nein ? '#ff4d5e' : '#ffe066';
      c.beginPath(); c.ellipse(mx, my + 2, 5 * ms * pu, 2.6 * ms * pu, 0, 0, Math.PI * 2); c.stroke();
      if (mk.nein) { c.beginPath(); c.moveTo(mx - 3 * ms, my - 1 * ms); c.lineTo(mx + 3 * ms, my + 5 * ms); c.moveTo(mx + 3 * ms, my - 1 * ms); c.lineTo(mx - 3 * ms, my + 5 * ms); c.stroke(); }
      else { c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(mx, my - 1 * ms - Math.abs(Math.sin(mk.t * 5)) * 3 * ms); c.lineTo(mx - 2.5 * ms, my - 6 * ms - Math.abs(Math.sin(mk.t * 5)) * 3 * ms); c.lineTo(mx + 2.5 * ms, my - 6 * ms - Math.abs(Math.sin(mk.t * 5)) * 3 * ms); c.closePath(); c.fill(); }
      c.restore();
    }
    // Blasen nach Lichtern (lesbar ueber Fensterlichtern)
    var belegt = []; (R.blasen || []).forEach(function (b) { blase(c, b.x, b.y, b.text, b.vermeide, belegt); });
    var nacht = karte.innen ? 0 : Sz.nachtGrad(S.uhr.minute / 60);
    if (nacht > 0.05) {                                           // weiche Vignette in der Nacht
      var vg = c.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.28, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72);
      vg.addColorStop(0, 'rgba(10,8,40,0)'); vg.addColorStop(0.55, 'rgba(10,8,40,' + (0.12 * nacht).toFixed(3) + ')');
      vg.addColorStop(1, 'rgba(10,8,40,' + (0.42 * nacht).toFixed(3) + ')');
      c.fillStyle = vg; c.fillRect(0, 0, viewW, viewH);
    }
    // Starship-Overlay in Bildschirmkoordinaten (nur Stadt, nach Lichtern und Vignette)
    if (!karte.innen && Saufi.S21 && Saufi.S21.starshipStand) zeichneStarshipFlug(c, S, viewW, viewH, t);
  }

  function kran(c, px, fy, t, nr) {
    var ang = t * 0.25 + (nr || 0) * 2;
    var ausX = 26 * Math.cos(ang), ausY = 8 * Math.sin(ang);
    // Mast (Gitter)
    r(c, px - 1.5, fy - 40, 3, 40, '#c8c8d0');
    for (var i = 0; i < 5; i++) linie(c, px - 1.5, fy - 38 + i * 7, px + 1.5, fy - 32 + i * 7, '#8a8a98', 0.7);
    // Ausleger
    linie(c, px, fy - 38, px + ausX, fy - 38 + ausY, '#d0d0d8', 2.2);
    linie(c, px, fy - 36, px + ausX, fy - 36 + ausY, '#a0a0b0', 1.0);
    // Gegengewicht
    rr(c, px - Math.sign(ausX || 1) * 10 - 4, fy - 40, 8, 5, '#6a6a78', 1);
    // Hakenseil und Last mit Pendeln
    var pend = Math.sin(t * 2.1 + nr) * 3;
    var hx = px + ausX + pend, hy = fy - 38 + ausY + 14;
    linie(c, px + ausX, fy - 38 + ausY, hx, hy, '#aaa', 0.8);
    rr(c, hx - 3, hy, 6, 5, '#e07030', 1);
  }

  function zeichneStarshipModell(c, px, fy) {
    // Edelstahl-Modell 12x44 px, Spitze oben
    var w = 12, h = 44;
    poly(c, [[px, fy - h], [px + w / 2, fy - h - 8], [px + w, fy - h]], '#c8d0d8');
    rr(c, px, fy - h, w, h, '#b8c0c8', 1.5, '#8a9098', 0.7);
    r(c, px + 2, fy - h + 8, w - 4, 3, '#9098a0');
    r(c, px + 2, fy - h + 20, w - 4, 3, '#9098a0');
    // Flossen
    poly(c, [[px - 3, fy - 2], [px, fy - 10], [px, fy]], '#a8b0b8');
    poly(c, [[px + w + 3, fy - 2], [px + w, fy - 10], [px + w, fy]], '#a8b0b8');
  }

  function zeichneMotorrad(c, b, cx, cy) {
    if (!b) return;
    var x = (b.x != null ? b.x : b.bx) - cx, y = (b.y != null ? b.y : 0) - cy;
    var hoehe = b.hoehe || 0, winkel = b.winkel != null ? b.winkel : 0;
    var cos = Math.cos(winkel), farbe = b.farbe || '#4fe6ff';
    // Schatten am Boden
    ellipse(c, x, y + 1, 7, 2.2, 'rgba(40,30,60,0.35)');
    c.save();
    c.translate(x, y - hoehe);
    var ansicht = Math.abs(cos) > 0.5 ? (cos > 0 ? 'rechts' : 'links') : (Math.sin(winkel) > 0 ? 'vorn' : 'hinten');
    if (ansicht === 'links' || ansicht === 'rechts') {
      var sp = ansicht === 'rechts' ? 1 : -1;
      kreis(c, -7 * sp, 0, 2.4, '#2a2a32'); kreis(c, 7 * sp, 0, 2.4, '#2a2a32');
      rr(c, -8, -5, 16, 4, farbe, 1.2);
      // Fahrer
      kreis(c, 0, -10, 2.6, '#1a1a22'); // Helm
      rr(c, -3, -8, 6, 5, farbe, 1);
      // Nummernschild
      rr(c, -4, -3, 8, 3.5, '#fff8ee', 0.8);
      textInBox(c, String(b.nr || ''), -4, -3, 8, 3.5, 4, { col: '#1a1020', ausr: 'center', min: 3, maxZeilen: 1 });
    } else {
      kreis(c, -3, 0, 2.2, '#2a2a32'); kreis(c, 3, 0, 2.2, '#2a2a32');
      rr(c, -5, -6, 10, 5, farbe, 1.2);
      kreis(c, 0, -11, 2.6, '#1a1a22');
      rr(c, -3.5, -3, 7, 3, '#fff8ee', 0.8);
      textInBox(c, String(b.nr || ''), -3.5, -3, 7, 3, 3.5, { col: '#1a1020', ausr: 'center', min: 3, maxZeilen: 1 });
    }
    c.restore();
  }

  function zeichneStarshipFlug(c, S, viewW, viewH, t) {
    var st = Saufi.S21.starshipStand(S.uhr.minute);
    if (st.phase !== 'flug') return;
    var p = Math.max(0, Math.min(1, st.p));
    if (!isFinite(p)) return;
    var sx = viewW * 0.55, sy = viewH + 20 - p * (viewH + 60);
    if (!isFinite(sx) || !isFinite(sy)) return;
    // Rauchspur
    for (var i = 0; i < 8; i++) {
      var a = 0.35 * (1 - i / 8) * (1 - p * 0.3);
      kreis(c, sx + Math.sin(t * 3 + i) * 2, sy + 18 + i * 7, 4 + i * 0.8, 'rgba(180,180,200,' + a.toFixed(3) + ')');
    }
    // Flamme
    var fr = 6 + Math.abs(Math.sin(t * 18)) * 4;
    if (!isFinite(fr) || fr < 0) fr = 6;
    kreis(c, sx, sy + 14, fr, '#ff8a20');
    kreis(c, sx, sy + 16, fr * 0.55, '#ffe066');
    // Koerper
    rr(c, sx - 5, sy - 28, 10, 36, '#c8d0d8', 1.5, '#8a9098', 0.7);
    poly(c, [[sx - 5, sy - 28], [sx, sy - 40], [sx + 5, sy - 28]], '#d0d8e0');
  }

  function tintFuer(S) {
    var l = S.licht, ort = S.ort;
    if (ort === 'stadt') return { r: l.r, g: l.g, b: l.b };
    if (ort === 'disko') return mix({ r: 70, g: 62, b: 120 }, { r: 110, g: 90, b: 160 }, S.boostAktiv ? 1 : 0.0);
    return mix({ r: l.r, g: l.g, b: l.b }, { r: 255, g: 238, b: 208 }, 0.55 + 0.25 * l.glut);
  }

  var SCHILD_NACHT_TEXTE = {
    hotel: { haupt: 'JAZZ IN THE CITY', hauptCol: '#ffe9a8', nebenCol: '#ffe9a8' },
    restaurant: { haupt: 'GASTHAUS MAULTÄSCHLE', hauptCol: '#ffe9a8', nebenCol: '#ffe9a8' },
    kneipe: { haupt: 'SOPHIES BRAUHAUS', hauptCol: '#ffe9a8', nebenCol: '#ffe9a8' },
    disko: { haupt: 'UNTERGRUND 07', hauptCol: '#7ff6ff', nebenCol: '#7ff6ff' }
  };
  function schildNachtSprite(R, key, w, h, text, col, size) {
    var sk = R.spSk || 1, cacheKey = 'sn_' + key + '_' + sk.toFixed(2) + '_' + w + 'x' + h;
    if (R.spr[cacheKey]) return R.spr[cacheKey];
    if (!R.neueLeinwand) return null;
    var cv = R.neueLeinwand(Math.ceil(w * sk) + 2, Math.ceil(h * sk) + 2), hc = cv ? cv.getContext('2d') : null;
    if (!hc) return null;
    hc.setTransform(sk, 0, 0, sk, 0, 0);
    if ('imageSmoothingEnabled' in hc) hc.imageSmoothingEnabled = true;
    textInBox(hc, text, 1, 1, w - 2, h - 2, size || 9, { col: col, ausr: 'center', kontur: 'rgba(20,14,40,0.9)', konturB: 0.5, min: 5, maxZeilen: 1 });
    var s = { cv: cv, w: w, h: h }; R.spr[cacheKey] = s; return s;
  }
  function zeichneSchildNacht(R, c, b, plan, cx, cy, glut) {
    var info = SCHILD_NACHT_TEXTE[b.id] || { haupt: (b.name || '').toUpperCase(), hauptCol: '#ffe9a8', nebenCol: '#ffe9a8' };
    var sh = plan.schildHaupt || { x: plan.schild.x, y: plan.schild.y, w: Math.min(plan.w - 8, b.id === 'disko' ? plan.w - 12 : 112), h: 14 };
    var sw = sh.w, shH = sh.h, sx = sh.x - cx - sw / 2, sy = sh.y - cy;
    // source-over dunkler Grund (nicht nur lighter) — exakt auf Tag-Schild
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = Math.min(1, 0.75 + SCHILD_NACHT_ALPHA * glut * 0.3);
    c.fillStyle = 'rgba(20,14,40,0.75)';
    c.fillRect(sx, sy, sw, shH);
    var spr = schildNachtSprite(R, b.id + '_h', sw, shH, info.haupt, info.hauptCol, b.id === 'disko' ? 9 : 10);
    c.globalAlpha = Math.min(1, 0.55 + glut * 0.45);
    if (spr && spr.cv) c.drawImage(spr.cv, sx, sy, sw, shH);
    else textInBox(c, info.haupt, sx + 1, sy + 1, sw - 2, shH - 2, 9, { col: info.hauptCol, ausr: 'center', kontur: 'rgba(20,14,40,0.9)', min: 5, maxZeilen: 1 });
    // Disko: Neon-Streifen ohne zweiten Text; sonst Neben-Schild (Kehrwoche/Feinstaub)
    if (plan.schildNeben && b.id !== 'disko') {
      var sn = plan.schildNeben, nx = sn.x - cx, ny = sn.y - cy;
      c.globalAlpha = Math.min(1, 0.75 + SCHILD_NACHT_ALPHA * glut * 0.3);
      c.fillStyle = 'rgba(20,14,40,0.75)';
      c.fillRect(nx, ny, sn.w, sn.h);
      var nspr = schildNachtSprite(R, b.id + '_n_' + (sn.text || ''), sn.w, sn.h, sn.text || '', info.nebenCol, 6);
      c.globalAlpha = Math.min(1, 0.55 + glut * 0.45);
      if (nspr && nspr.cv) c.drawImage(nspr.cv, nx, ny, sn.w, sn.h);
      else textInBox(c, sn.text || '', nx + 1, ny, sn.w - 2, sn.h, 6, { col: info.nebenCol, ausr: 'center', kontur: 'rgba(20,14,40,0.9)', min: 5, maxZeilen: 1 });
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
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
          var neonLen = Math.max(n.w, n.h), neonR = Math.min(neonLen * 0.6, Math.max(n.w * 0.35, 6));
          var lichtinselAktiv = glut > 0.05 && an && b.id === 'disko';
          // Disko: Glanz nicht doppelt mit Lichtinsel (gemeinsam Alpha ≤ 0.5)
          if (!(lichtinselAktiv && b.id === 'disko')) {
            c.globalAlpha = Math.min(0.5, a * 0.45); G.glanz(c, n.x + n.w / 2 - cx, n.y + n.h / 2 - cy, neonR, n.farbe, 'rgba(0,0,0,0)');
          } else {
            c.globalAlpha = Math.min(0.25, a * 0.3); G.glanz(c, n.x + n.w / 2 - cx, n.y + n.h / 2 - cy, neonR * 0.7, n.farbe, 'rgba(0,0,0,0)');
          }
          c.globalAlpha = Math.min(0.7, a * 0.5); rr(c, n.x - cx - 2, n.y - cy - 2, n.w + 4, n.h + 4, n.farbe, 2.5);
          c.globalAlpha = Math.min(0.85, a * 1.0); rr(c, n.x - cx, n.y - cy, n.w, n.h, n.farbe, 1);
        });
        if (glut > 0.05 && an) {
          var d = plan.tuer, maxR = b.id === 'disko' ? 24 : 28;
          var grd = c.createRadialGradient(d.x - cx + 8, d.y - cy + 14, 2, d.x - cx + 8, d.y - cy + 14, maxR);
          var kernA = b.id === 'disko' ? 0.28 : 0.45;
          grd.addColorStop(0, 'rgba(255,190,110,' + kernA + ')'); grd.addColorStop(1, 'rgba(255,190,110,0)');
          c.globalAlpha = Math.min(glut, b.id === 'disko' ? 0.28 : glut); c.fillStyle = grd;
          c.fillRect(d.x - cx - maxR, d.y - cy - maxR * 0.6, maxR * 2, maxR * 1.6);
        }
        // Nachtschilder: dunkler Grund + Text-Overlay (gecacht), kein reines lighter-Rechteck
        if (glut > 0.15) {
          zeichneSchildNacht(R, c, b, plan, cx, cy, glut);
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
    var kompakt = !R.hochkant, sk = kompakt ? 0.72 : (R.touch ? (54 / 62) * 0.85 : 54 / 62);
    var lpW = Math.round(96 * sk), lpH = Math.round(62 * sk), lx = 3, ly = 3;
    panel(c, lx, ly, lpW, lpH, '#fff8ee', kompakt ? 4 : 5);
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
    var sCss = (R.cssW > 0 && W > 0) ? (R.cssW / W) : 1;
    var btnBand = R.touch ? Math.ceil((4 * 44 + 8) / Math.max(0.5, sCss)) : 40;
    var freiL = lx + lpW + 4, freiR = W - btnBand - 2;
    var weltH = (R.weltH != null && R.hochkant) ? R.weltH : H;
    var resTop = R.hochkant && weltH < H ? weltH : null;
    var PHASE_KURZ = { Morgen: 'Mo', Mittag: 'Mi', Nachmittag: 'Nm', Abend: 'Ab', Nacht: 'Na', 'Tiefe Nacht': 'TN' };
    var phName = Saufi.Uhr.phase(uhr), phaseTxt = Saufi.Uhr.tag(uhr).slice(0, 2) + ' · ' + (PHASE_KURZ[phName] || phName);
    var sternTxt = '★' + S.punkte.punkte;
    var pw, ph, px, py;
    if (R.hochkant && resTop != null) {
      // Hoch: Uhr ganz oben in der Reserve (nicht im Weltbereich)
      ph = 14; pw = Math.min(Math.round(W * 0.7), W - 16);
      px = Math.round((W - pw) / 2); py = resTop + 2;
      panel(c, px, py, pw, ph, '#fff8ee', 4);
      Sz.himmelIcon(c, px + 8, py + ph / 2, 5, uhr.minute / 60, S.t);
      var uhrTxt = Saufi.Uhr.text(uhr);
      var sternW = Math.min(28, Math.max(14, Math.ceil(breite(c, sternTxt, 7) + 2)));
      var midW = pw - 18 - sternW - 4;
      textInBox(c, uhrTxt, px + 14, py + 1, Math.min(36, midW * 0.4), 12, 8, { col: P.uiTinte, ausr: 'left', maxZeilen: 1 });
      textInBox(c, phaseTxt, px + 14 + Math.min(36, midW * 0.4), py + 1, Math.max(20, midW - Math.min(36, midW * 0.4)), 12, 7, { col: P.uiTinteWeich, ausr: 'left', maxZeilen: 1 });
      textInBox(c, sternTxt, px + pw - sternW - 2, py + 1, sternW, 12, 7, { col: P.uiTinte, ausr: 'right', maxZeilen: 1 });
      R.hudUhr = { x: px, y: py, w: pw, h: ph, btnBand: btnBand };
    } else {
      // Quer / Hoch ohne Reserve: Uhr oben zwischen HUD und btnBand
      pw = kompakt ? 88 : 96; ph = kompakt ? 24 : 26; py = 3;
      px = Math.round((freiL + freiR - pw) / 2);
      px = Math.max(freiL, Math.min(px, Math.max(freiL, freiR - pw)));
      panel(c, px, py, pw, ph, '#fff8ee', kompakt ? 5 : 6);
      Sz.himmelIcon(c, px + (kompakt ? 13 : 14), py + ph / 2, kompakt ? 9 : 10, uhr.minute / 60, S.t);
      var textL = px + (kompakt ? 26 : 28), textW = pw - (kompakt ? 30 : 32);
      textInBox(c, Saufi.Uhr.text(uhr), textL, py + 1, textW, kompakt ? 11 : 12, kompakt ? 9 : 10, { col: P.uiTinte, ausr: 'center' });
      var sternWQ = Math.min(36, Math.max(16, Math.ceil(breite(c, sternTxt, 7) + 4)));
      textInBox(c, phaseTxt, textL, py + (kompakt ? 12 : 13), Math.max(20, textW - sternWQ), 9, 7, { col: P.uiTinteWeich, ausr: 'left' });
      textInBox(c, sternTxt, px + pw - sternWQ - 2, py + (kompakt ? 12 : 13), sternWQ, 9, 7, { col: P.uiTinte, ausr: 'right' });
      R.hudUhr = { x: px, y: py, w: pw, h: ph, btnBand: btnBand };
    }
    function bannerLabel(aktiv, nrOrt, nrZeit, boxW, mx) {
      if (mx) {
        var mRest = Math.max(0, Math.ceil(Saufi.MxEvent.rest(uhr.minute)));
        var labMx = 'Motocross 18:30 · noch ' + mRest + ' min · Tribüne';
        var messMx = textInBox(c, labMx, 0, 0, boxW, 8, 7, { ausr: 'center', mess: true, maxZeilen: 1, min: 6 });
        if (messMx.lines && messMx.lines.some(function (z) { return z.indexOf('…') >= 0; }) || messMx.w > boxW) {
          labMx = 'Motocross 18:30 · ' + mRest + ' min';
        }
        return labMx;
      }
      var kurz = (Saufi.Karte.KURZ && Saufi.Karte.KURZ[nrOrt]) || Saufi.Karte.NAMEN[nrOrt] || nrOrt;
      var pref = aktiv ? 'RUNDE! ' : ('Runde ' + Saufi.Uhr.zeitText(nrZeit) + ': ');
      var lab = pref + kurz;
      var mess = textInBox(c, lab, 0, 0, boxW, 8, 7, { ausr: 'center', mess: true, maxZeilen: 1, min: 6 });
      if (mess.lines && mess.lines.some(function (z) { return z.indexOf('…') >= 0; }) || mess.w > boxW) {
        pref = aktiv ? 'RUNDE ' : ('Runde ' + Saufi.Uhr.zeitText(nrZeit) + ': ');
        lab = pref + kurz;
      }
      return lab;
    }
    var nr = Saufi.Runden.naechste(S.runden), ry = 0, rundenH = 0, rx = 0, rw = 0;
    var nrSichtbar = nr && (nr.status === 'warnung' || nr.status === 'aktiv');
    // Motocross-Banner nur wenn keine Runden-Vorwarnung sichtbar (endet 18:30, Runde 19:30 startet dann)
    if (!nrSichtbar && Saufi.MxEvent && Saufi.MxEvent.sichtbar(uhr.minute)) {
      nr = { status: 'warnung', mx: true, zeit: Saufi.MxEvent.ZEIT, ort: 'motocross' };
      nrSichtbar = true;
    }
    // --- Banner ---
    if (nrSichtbar) {
      var aktiv = nr.status === 'aktiv', mxBan = !!nr.mx;
      var rest = aktiv ? nr.zeit + Saufi.Runden.FRIST_MIN - uhr.minute : (mxBan ? Saufi.MxEvent.rest(uhr.minute) : nr.zeit - uhr.minute);
      var vorlauf = mxBan ? 30 : Saufi.Runden.VORLAUF_MIN;
      var blink = aktiv && Math.floor(S.t * 3) % 2 === 0;
      var balkenH = 3, label;
      if (R.hochkant && resTop != null) {
        // Hoch: Banner unter Uhr in Reserve
        rundenH = 14; rw = Math.min(Math.round(W * 0.85), W - 16);
        rx = Math.round((W - rw) / 2); ry = py + ph + 2;
        label = bannerLabel(aktiv, nr.ort, nr.zeit, rw - 8, mxBan);
        panel(c, rx, ry, rw, rundenH, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8', 5);
        textInBox(c, label, rx + 4, ry + 1, rw - 8, 8, 7, { col: P.uiTinte, ausr: 'center', maxZeilen: 1, min: 6 });
        var frac = Math.max(0, Math.min(1, rest / (aktiv ? Saufi.Runden.FRIST_MIN : vorlauf)));
        rr(c, rx + 8, ry + rundenH - balkenH - 1, rw - 16, balkenH, 'rgba(74,53,96,0.25)', 2); if (frac > 0.01) rr(c, rx + 8, ry + rundenH - balkenH - 1, (rw - 16) * frac, balkenH, aktiv ? '#e0504a' : '#f0b030', 2);
        R.hudRunde = { x: rx, y: ry, w: rw, h: rundenH };
      } else if (!R.hochkant) {
        // Quer: Anhang direkt unter Uhr, gleiche Breite, Höhe ≤ 11, Gesamt ≤ 38
        rundenH = Math.min(11, Math.max(1, 38 - ph));
        rw = pw; rx = px; ry = py + ph;
        label = bannerLabel(aktiv, nr.ort, nr.zeit, rw - 4, mxBan);
        panel(c, rx, ry, rw, rundenH, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8', 4);
        textInBox(c, label, rx + 2, ry + 0.5, rw - 4, 7, 6.5, { col: P.uiTinte, ausr: 'center', maxZeilen: 1, min: 6 });
        var fracQ = Math.max(0, Math.min(1, rest / (aktiv ? Saufi.Runden.FRIST_MIN : vorlauf)));
        rr(c, rx + 4, ry + rundenH - 3, rw - 8, 2, 'rgba(74,53,96,0.25)', 1.5); if (fracQ > 0.01) rr(c, rx + 4, ry + rundenH - 3, (rw - 8) * fracQ, 2, aktiv ? '#e0504a' : '#f0b030', 1.5);
        R.hudRunde = { x: rx, y: ry, w: rw, h: rundenH };
      } else {
        // Hoch ohne Touch-Reserve (Dunkelstreifen): Banner trotzdem unten in Reserve-Zone
        rundenH = 14; rw = Math.min(Math.round(W * 0.85), W - 16);
        rx = Math.round((W - rw) / 2); ry = Math.max(weltH + 2, H - 70);
        label = bannerLabel(aktiv, nr.ort, nr.zeit, rw - 8, mxBan);
        panel(c, rx, ry, rw, rundenH, aktiv ? (blink ? '#ff9fb0' : '#ffd1da') : '#fff0c8', 5);
        textInBox(c, label, rx + 4, ry + 1, rw - 8, 8, 7, { col: P.uiTinte, ausr: 'center', maxZeilen: 1, min: 6 });
        R.hudRunde = { x: rx, y: ry, w: rw, h: rundenH };
      }
    } else R.hudRunde = null;
    // Safe-Zone / Knöpfe Quer (E-Basis 48, Abstand 4 CSS-px)
    var stickZone = R.touch && !R.hochkant ? Math.ceil(120 / Math.max(0.5, sCss)) : 0;
    var knopfRects = [];
    if (R.touch && !R.hochkant) {
      var kS = Math.max(0.5, sCss), kE = Math.max(44 / kS, 48 * 0.85), kW2 = Math.max(44 / kS, 44 * 0.85);
      var padQ = 2 * 3 / kS; // CSS 2·s
      knopfRects.push({ x: W - padQ - kE, y: H - padQ - kE - kW2 - 4 / kS, w: kE, h: kE });
      knopfRects.push({ x: W - padQ - kW2, y: H - padQ - kW2, w: kW2, h: kW2 });
    }
    function freiVonKnoepfen(rect) {
      return !knopfRects.some(function (k) { return !(rect.x + rect.w <= k.x || k.x + k.w <= rect.x || rect.y + rect.h <= k.y || k.y + k.h <= rect.y); });
    }
    function cutR(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
    // Scooter-Leiste Disko (Hoch-Reserve: ≥4 px unter Banner; panel wird bei bySco−3 gezeichnet)
    if (S.ort === 'disko') {
      var bwSco = 150, bxSco = Math.round(W / 2 - bwSco / 2) + 2, bySco, b = S.boost, f = b.leiste, pulse = f >= 1 && Math.floor(S.t * 4) % 2 === 0;
      if (resTop != null) {
        var scoTop = R.hudRunde ? R.hudRunde.y + R.hudRunde.h + 4 : (R.hudUhr ? R.hudUhr.y + R.hudUhr.h + 2 : resTop + 2);
        bySco = Math.min(H - 14, scoTop + 3);
      } else bySco = H - (R.touch ? Math.ceil(120 / Math.max(0.5, sCss)) : 22) - 18;
      panel(c, bxSco - 6, bySco - 3, bwSco + 12, 15, 'rgba(42,35,66,0.92)', 6);
      rr(c, bxSco, bySco, bwSco, 9, 'rgba(255,255,255,0.12)', 4.5, P.kontur, 0.7); if (f > 0.02) rr(c, bxSco + 0.8, bySco + 0.8, (bwSco - 1.6) * f, 7.4, pulse ? '#ffffff' : P.neonPink, 3.7);
      textInBox(c, S.boostAktiv ? 'HYPER HYPER!' : (f >= 1 ? 'R: HYPER-BOOST!' : 'SCOOTER · E tanzen'), bxSco, bySco, bwSco, 9, 7, { col: S.boostAktiv ? P.neonGelb : '#ffffff', ausr: 'center', kontur: 'rgba(30,10,60,0.9)', maxZeilen: 1 });
    }
    // Navigationspfeil: Referenz = Unterkante linkes HUD (Hoch) bzw. Uhr (Quer)
    var pfeilZoom = R.aktuellerWeltZoom != null ? R.aktuellerWeltZoom : WELT_ZOOM;
    var pfeilUnter = (R.hochkant && resTop != null) ? (ly + lpH + 2) : (py + ph);
    if (S.pfeil) pfeil(R, S.pfeil.x * pfeilZoom, S.pfeil.y * pfeilZoom, pfeilUnter);
    // Hinweis + Dialog
    var h = Saufi.Hinweise.aktuell(S.hinweise);
    var dialogRect = null, hilfeRect = null;
    var cursorY;
    if (R.hochkant && resTop != null) {
      // Reserve von oben: Uhr → Banner → Hinweis → Dialog; Summe ≤ Reserve−2; Abstand ≥ 2
      cursorY = (R.hudRunde ? R.hudRunde.y + R.hudRunde.h + 2 : (R.hudUhr.y + R.hudUhr.h + 2));
      var freiRes = H - 2 - cursorY;
      if (S.hilfe) {
        var hilfeH = Math.min(12, freiRes);
        var hm = textInBox(c, S.hilfe, 0, 0, Math.min(W - 24, Math.round(W * 0.85)) - 8, hilfeH, 7, { ausr: 'center', mess: true, maxZeilen: 1 });
        var hw = Math.min(W - 16, Math.round(hm.w) + 14);
        hilfeRect = { x: Math.round(W / 2 - hw / 2), y: cursorY, w: hw, h: hilfeH };
        panel(c, hilfeRect.x, hilfeRect.y, hilfeRect.w, hilfeRect.h, 'rgba(255,248,238,0.96)', 5);
        textInBox(c, S.hilfe, hilfeRect.x + 3, hilfeRect.y + 1, hilfeRect.w - 6, hilfeH - 2, 7, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
        R.hudHilfe = hilfeRect;
        cursorY += hilfeH + 2; freiRes = H - 2 - cursorY;
      } else R.hudHilfe = null;
      if (h && h.art !== 'gross') {
        var maxBoxW = Math.min(W - 24, Math.round(W * 0.85));
        var maxZ = freiRes < 18 ? 1 : 2;
        var mess = textInBox(c, h.text, 0, 0, maxBoxW - 12, Math.max(10, freiRes - 2), 7, { ausr: 'center', mess: true, maxZeilen: maxZ });
        var bw2 = Math.min(maxBoxW, Math.round(mess.w) + 14), hh2 = Math.min(Math.round(mess.h) + 6, freiRes);
        dialogRect = { x: Math.round(W / 2 - bw2 / 2), y: cursorY, w: bw2, h: hh2 };
        c.globalAlpha = Math.min(1, h.rest * 3);
        panel(c, dialogRect.x, dialogRect.y, dialogRect.w, dialogRect.h, h.art === 'schlecht' ? '#ffd1da' : (h.art === 'gut' ? '#d8f5dc' : P.uiFlaeche), 5);
        textInBox(c, h.text, dialogRect.x + 4, dialogRect.y + 1, dialogRect.w - 8, dialogRect.h - 2, 7, { col: P.uiTinte, ausr: 'center', maxZeilen: maxZ });
        c.globalAlpha = 1;
        R.hudDialog = dialogRect;
      } else if (h && h.art === 'gross') {
        c.globalAlpha = Math.min(1, h.rest * 3);
        textInBox(c, h.text, 16, Math.min(H - 20, cursorY), W - 32, 16, 12, { col: '#ffe84f', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
        c.globalAlpha = 1; R.hudDialog = null;
      } else R.hudDialog = null;
    } else {
      // Quer: Hinweis + Dialog unten mittig zwischen Stick und Knöpfen
      var maxBubbleW = Math.min(Math.round(W * 0.45), W - stickZone - 40);
      var bottomPad = 4;
      var stackBottom = H - bottomPad;
      if (h && h.art === 'gross') {
        c.globalAlpha = Math.min(1, h.rest * 3);
        textInBox(c, h.text, 16, Math.round(H * 0.38), W - 32, 24, 14, { col: '#ffe84f', ausr: 'center', kontur: P.kontur });
        c.globalAlpha = 1; R.hudDialog = null;
      } else if (h) {
        var messQ = textInBox(c, h.text, 0, 0, maxBubbleW - 12, 36, 8, { ausr: 'center', mess: true, maxZeilen: 2 });
        var bwQ = Math.min(maxBubbleW, Math.round(messQ.w) + 16), hhQ = Math.round(messQ.h) + 6;
        var midX = stickZone + (W - stickZone - (knopfRects[0] ? (W - knopfRects[0].x) : 40)) / 2;
        if (!isFinite(midX)) midX = W / 2;
        dialogRect = { x: Math.round(midX - bwQ / 2), y: stackBottom - hhQ, w: bwQ, h: hhQ };
        dialogRect.x = Math.max(stickZone + 4, Math.min(dialogRect.x, W - bwQ - 4));
        if (!freiVonKnoepfen(dialogRect)) {
          // verkuerzen statt verschieben
          hhQ = Math.max(12, hhQ - 4); bwQ = Math.min(bwQ, Math.round(W * 0.4));
          dialogRect = { x: Math.round(W / 2 - bwQ / 2), y: stackBottom - hhQ, w: bwQ, h: hhQ };
        }
        c.globalAlpha = Math.min(1, h.rest * 3);
        panel(c, dialogRect.x, dialogRect.y, dialogRect.w, dialogRect.h, h.art === 'schlecht' ? '#ffd1da' : (h.art === 'gut' ? '#d8f5dc' : P.uiFlaeche), 6);
        textInBox(c, h.text, dialogRect.x + 5, dialogRect.y + 1, dialogRect.w - 10, dialogRect.h - 2, 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 2 });
        c.globalAlpha = 1;
        R.hudDialog = dialogRect;
        stackBottom = dialogRect.y - 4;
      } else R.hudDialog = null;
      if (S.hilfe) {
        var hmQ = textInBox(c, S.hilfe, 0, 0, maxBubbleW - 8, 14, 8, { ausr: 'center', mess: true, maxZeilen: 1 });
        var hwQ = Math.min(maxBubbleW, Math.round(hmQ.w) + 14), hyQ = stackBottom - 12;
        hilfeRect = { x: Math.round(W / 2 - hwQ / 2), y: hyQ, w: hwQ, h: 12 };
        hilfeRect.x = Math.max(stickZone + 4, Math.min(hilfeRect.x, W - hwQ - 4));
        if (dialogRect && cutR(hilfeRect, dialogRect)) hilfeRect.y = dialogRect.y - 12 - 4;
        if (!freiVonKnoepfen(hilfeRect)) hilfeRect.x = Math.max(stickZone + 4, Math.round(W * 0.35 - hwQ / 2));
        panel(c, hilfeRect.x, hilfeRect.y, hilfeRect.w, hilfeRect.h, 'rgba(255,248,238,0.96)', 6);
        textInBox(c, S.hilfe, hilfeRect.x + 3, hilfeRect.y + 1, hilfeRect.w - 6, 10, 7, { col: P.uiTinte, ausr: 'center', maxZeilen: 1 });
        R.hudHilfe = hilfeRect;
      } else R.hudHilfe = null;
    }
  }
  function pfeil(R, sx, sy, unterY) {
    var c = R.ctx, cx = W / 2, cy = Math.min(H, R.weltH || H) / 2, dx = sx - cx, dy = sy - cy;
    var weltH = R.weltH || H;
    var inside = sx > 10 && sx < W - 10 && sy > 50 && sy < weltH - 24;
    R.hierLabel = null;
    if (inside) { var bob = Math.sin(Date.now() / 160) * 2; poly(c, [[sx - 6, sy - 22 + bob], [sx + 6, sy - 22 + bob], [sx, sy - 11 + bob]], '#ffd75e', P.kontur, 1); return; }
    var ang = Math.atan2(dy, dx), rad = Math.min(cx - 14, (cy - 28) / Math.max(0.2, Math.abs(Math.sin(ang))), (cx - 14) / Math.max(0.2, Math.abs(Math.cos(ang))));
    var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    py = Math.max(56, Math.min(weltH - 26, py)); px = Math.max(12, Math.min(W - 12, px));
    c.save(); c.translate(px, py); c.rotate(ang);
    poly(c, [[9, 0], [-5, -7], [-3, 0], [-5, 7]], '#ffd75e', P.kontur, 1); c.restore();
    // Label nur wenn kein Schnitt mit Schilder/Dach/Fassade; Referenz Oberkante = unterY (ly+lpH+2)
    var labelY = Math.max(unterY > 0 ? unterY + 4 : 56, 56);
    var labelX = W / 2 - (R.hochkant ? 40 : 70), labelW = R.hochkant ? 80 : 140, labelH = 12;
    var labelTxt = R.hochkant ? '→ HIER' : 'HIER SOLLST DU HIN';
    var lab = { x: labelX, y: labelY, w: labelW, h: labelH };
    function hit(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
    var konflikte = [].concat(R._schildRects || [], R._gebRects || []);
    var konflikt = konflikte.some(function (sr) { return hit(lab, sr); });
    if (konflikt) return;
    R.hierLabel = lab;
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

  // Version: horizontal mittig. Hochformat: unten in der Reserve (oben liegen die #oben-Knoepfe),
  // sonst oben, ausser die Uhr liegt dort (nur im Spiel, R.hudUhr gilt nur fuer den aktuellen Frame).
  function versionsAnzeige(R, imSpiel, startQuer) {
    var c = R.ctx, txt = 'v' + Saufi.Spiel.VERSION, y = 2;
    if (startQuer) {   // v16: Startbild quer, unten rechts statt auf dem Titel
      R.hudVersion = { x: W - 44, y: H - 10, w: 40, h: 8 };
      textInBox(c, txt, W - 44, H - 10, 40, 8, 6, { col: '#fff8ee', ausr: 'right', kontur: P.kontur, maxZeilen: 1 });
      return;
    }
    if (R.hochkant) {
      y = H - 10;
      [R.hudHilfe, R.hudDialog].forEach(function (b) { if (b && b.y < y + 9 && b.y + b.h > y) y = Math.max(2, b.y - 10); });
    } else if (imSpiel && R.hudUhr && R.hudUhr.y < 40) {
      y = Math.max(2, H - 10);
      if (R.hudHilfe && R.hudHilfe.y < y + 10 && R.hudHilfe.y + R.hudHilfe.h > y) y = Math.max(2, R.hudHilfe.y - 10);
    }
    R.hudVersion = { x: W / 2 - 20, y: y, w: 40, h: 8 };
    textInBox(c, txt, W / 2 - 20, y, 40, 8, 6, { col: '#fff8ee', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
  }

  var KARTEN_RASTER = { hoch: { sp: 2, z: 5 }, quer: { sp: 3, z: 3 } };

  function startBild(R, S) {
    var c = R.ctx, t = S.t, hoch = !!R.hochkant;
    Sz.kesselSzene(c, W, H, 8 + (t * 0.35) % 20, t);
    var grd = c.createRadialGradient(W / 2, 28, 4, W / 2, 28, 130); grd.addColorStop(0, 'rgba(255,79,160,0.3)'); grd.addColorStop(1, 'rgba(255,79,160,0)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    var rowH = R.touch ? touchZeile(R) : (hoch ? 18 : 14), rowGap = R.touch ? 4 : 2, drawH = R.touch ? Math.min(rowH, 18) : (hoch ? 16 : 12);
    var chars = (Saufi.Charaktere.auswahlChars && Saufi.Charaktere.auswahlChars()) || [];
    var raster = hoch ? KARTEN_RASTER.hoch : KARTEN_RASTER.quer;
    var titelH = hoch ? 14 : 10, unterH = hoch ? 10 : 0;
    var y0 = hoch ? Math.max(4, Math.min(40, Math.ceil(R.obenUnten || 0) + 2)) : 2;   // v16: unter die #oben-Knoepfe
    textInBox(c, 'Press11 - Saufi Saufi', 8, y0, W - 16, titelH, hoch ? 12 : 9, { col: '#fff8ee', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    if (hoch) textInBox(c, 'Wen spielst Du?', 20, y0 + titelH, W - 40, unterH, 8, { col: '#fff3c8', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    var knopfBlock = (!hoch ? rowH + 4 : 2 * (rowH + rowGap)) + (hoch ? 14 : 8);
    var kartenY = y0 + titelH + unterH + (hoch ? 4 : 1);
    var fussPlatz = knopfBlock + (hoch ? 12 : 2);
    var kartenRaum = Math.max(36, H - kartenY - fussPlatz);
    var gap = hoch ? 6 : 3, rand = hoch ? 8 : 4;
    var kw = Math.floor((W - rand * 2 - gap * (raster.sp - 1)) / raster.sp);
    var kh = Math.floor((kartenRaum - gap * (raster.z - 1)) / raster.z);
    if (hoch) kh = Math.min(kh, H >= 640 ? 78 : (H >= 560 ? 68 : 58));
    else kh = Math.min(kh, 44);
    kh = Math.max(kh, hoch && R.touch ? Math.min(44, Math.floor(kartenRaum / raster.z) - 1) : (hoch ? 48 : 22));
    var gridW = raster.sp * kw + (raster.sp - 1) * gap;
    var gridH = raster.z * kh + (raster.z - 1) * gap;
    // Wenn Grid die Knöpfe verdrängt: Kartenhöhe nochmal kappen
    if (kartenY + gridH + fussPlatz > H) {
      kh = Math.max(hoch ? 44 : 18, Math.floor((H - kartenY - fussPlatz - gap * (raster.z - 1)) / raster.z));
      gridH = raster.z * kh + (raster.z - 1) * gap;
    }
    var gx0 = Math.round((W - gridW) / 2), gy0 = kartenY;
    var selId = S.auswahlId || (S.char && S.char.id) || 'tobi';
    var zl = (!hoch && raster.sp === 3) ? 2 : 1;
    R.treffer = [];
    chars.forEach(function (ch, i) {
      var col = i % raster.sp, row = (i / raster.sp) | 0;
      var cx = gx0 + col * (kw + gap), cy = gy0 + row * (kh + gap);
      if (i === chars.length - 1 && chars.length % raster.sp === 1) cx = gx0 + Math.round((gridW - kw) / 2);
      var sel = ch.id === selId, blink = sel && Math.floor(t * 2) % 2 === 0;
      rr(c, cx, cy, kw, kh, sel ? (blink ? '#fff3b0' : '#ffe9a8') : 'rgba(255,248,238,0.94)', hoch ? 6 : 3, sel ? P.kontur : 'rgba(74,53,96,0.35)', 0.9);
      var figPad = hoch ? 34 : 22, figX = cx + (hoch ? 16 : 11), figY = cy + kh - (hoch ? 6 : 4);
      var figScale = hoch ? (kh >= 70 ? 1.1 : 0.85) : 0.55;
      c.save(); c.translate(figX, figY); c.scale(figScale, figScale); figur(c, ch, 0, 0, { dir: 'unten', t: t }); c.restore();
      var tx = cx + figPad, tw = Math.max(20, kw - figPad - 4);
      var nam = ch.kurz || ch.alias || ch.name;
      var au = ch.auswahl || {};
      var nameSz = hoch ? (kh >= 70 ? 8 : 7) : 6;
      var bodySz = hoch ? (kh >= 70 ? 6.5 : 5.5) : 5;
      var ly = cy + 2, lineH = bodySz + (hoch ? 1 : 0.5);
      textInBox(c, nam, tx, ly, tw, nameSz + 1, nameSz, { col: P.uiTinte, ausr: 'left', maxZeilen: 1, min: 5 });
      ly += nameSz + 1;
      if (au.rolle) {
        var rolleMax = hoch ? 2 : zl;
        var rolleH = Math.min(lineH * rolleMax, cy + kh - ly - lineH * 2);
        textInBox(c, au.rolle, tx, ly, tw, Math.max(lineH, rolleH), bodySz, { col: P.uiTinteWeich, ausr: 'left', maxZeilen: rolleMax, min: hoch ? 5 : 4 });
        ly += Math.min(lineH * rolleMax, Math.max(lineH, rolleH));
      }
      if (!hoch && zl === 1 && au.plus && au.minus && ly + lineH <= cy + kh - 1 && ly + lineH * 2 > cy + kh - 1) {
        // quer, zu wenig Hoehe: Plus links, Minus rechts in einer Zeile
        var hw = Math.floor(tw / 2) - 1;
        textInBox(c, '+ ' + au.plus, tx, ly, hw, lineH + 1, bodySz, { col: '#2a7a4a', ausr: 'left', maxZeilen: 1, min: 4 });
        textInBox(c, '- ' + au.minus, tx + hw + 2, ly, hw, lineH + 1, bodySz, { col: '#a04040', ausr: 'left', maxZeilen: 1, min: 4 });
        au = { minus: null };
      }
      if (au.plus && ly + lineH * zl <= cy + kh - 1) {
        textInBox(c, '+ ' + au.plus, tx, ly, tw, lineH * zl + 1, bodySz, { col: '#2a7a4a', ausr: 'left', maxZeilen: zl, min: 5 });
        ly += lineH * zl;
      }
      if (au.minus && ly + lineH * zl <= cy + kh - 1) {
        textInBox(c, '- ' + au.minus, tx, ly, tw, lineH * zl + 1, bodySz, { col: '#a04040', ausr: 'left', maxZeilen: zl, min: 5 });
      }
      R.treffer.push({ x: cx, y: cy, w: kw, h: Math.max(kh, R.touch ? Math.min(touchZeile(R), kh + 2) : kh), i: 'f:' + ch.id });
    });
    var hinweisY = gy0 + gridH + 2, ab18Gezeigt = false;
    if (hoch && H >= 560) {
      var zeilen = Saufi.Hinweise.HINWEIS_START, lz = H >= 640 ? 8 : 7, maxZ = H >= 640 ? 3 : 2;
      var bh = Math.min(zeilen.length, maxZ) * lz + 6;
      if (hinweisY + bh + knopfBlock < H - 2) {
        panel(c, 16, hinweisY, W - 32, bh, 'rgba(255,248,238,0.92)', 6);
        for (var zi = 0; zi < maxZ && zi < zeilen.length; zi++) {
          textInBox(c, zeilen[zi], 24, hinweisY + 3 + zi * lz, W - 48, lz, 6.5, { col: zi === 0 ? P.bierRot : P.uiTinte, ausr: 'center', maxZeilen: 1, min: 5 });
        }
        hinweisY += bh + 4; ab18Gezeigt = true;
      }
    }
    var ey = Math.min(H - knopfBlock, Math.max(hinweisY, gy0 + gridH + (hoch ? 4 : 2)));
    var eintraege = [{ label: hoch ? 'Ich bin 18+. Los geht\'s! (E / Tippen)' : 'Start (E)' }, { label: 'Scooter-Playlist (P)' }];
    if (!hoch) {
      var bw = Math.floor((W - 20) / 2);
      eintraege.forEach(function (e, i) {
        var sel = i === S.startIndex, rx = 6 + i * (bw + 8), blink = sel && Math.floor(t * 2) % 2 === 0;
        rr(c, rx, ey, bw, drawH, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, 4, sel ? P.kontur : 'rgba(74,53,96,0.3)', 0.9);
        textInBox(c, e.label, rx + 2, ey + 0.5, bw - 4, drawH - 1, 6.5, { col: P.uiTinte, ausr: 'center', maxZeilen: 1, min: 5 });
        R.treffer.push({ x: rx, y: ey, w: bw, h: Math.max(rowH, drawH), i: i });
      });
    } else {
      eintraege.forEach(function (e, i) {
        var sel = i === S.startIndex, ry = ey + i * (rowH + rowGap), blink = sel && Math.floor(t * 2) % 2 === 0;
        rr(c, 40, ry, W - 80, drawH, sel ? (blink ? '#fff3b0' : '#ffe9a8') : P.uiFlaeche2, 7, sel ? P.kontur : 'rgba(74,53,96,0.3)', 0.9);
        textInBox(c, e.label, 48, ry + 1, W - 96, drawH - 2, 8, { col: P.uiTinte, ausr: 'center', maxZeilen: 1, min: 5 });
        R.treffer.push({ x: 40, y: ry, w: W - 80, h: rowH, i: i });
      });
    }
    var footY = !hoch ? ey + drawH + 1 : ey + 2 * (rowH + rowGap);
    var fussTxt = S.best ? 'Bestwert: ' + S.best + ' Punkte' : (ab18Gezeigt ? '' : 'Ab 18 · Fiktives Spaß-Spiel');
    if (fussTxt) textInBox(c, fussTxt, 20, Math.min(footY, H - 11), W - 40, 10, 6.5, { col: '#fff3c8', ausr: 'center', kontur: P.kontur, maxZeilen: 1 });
    versionsAnzeige(R, false, !hoch);
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
    // Kessel zuerst; bei Sieg keine Himmels-Sonne (endeBild zeichnet die einzige)
    Sz.kesselSzene(c, W, H, sieg ? 28 : 26, t, { turmMaxY: by0, sterneMaxY: Math.max(H * 0.35, by0 - 4), ohneSonne: !!sieg });
    // Sieg: einzige Sonne links der Mitte, voll sichtbar (cx−r≥4, cy−r≥4), nicht unter #oben, nicht im Panel
    if (sieg) {
      var sonneR = Math.max(10, W * 0.07), sx = Math.round(W * 0.28), sy = Math.round(H * 0.42);
      sx = Math.max(sonneR + 4, Math.min(sx, Math.round(W * 0.45) - sonneR));
      sy = Math.max(sonneR + 4, Math.min(sy, H - sonneR - 4));
      // Schnitt mit Panel → unter dem Panel (Landschaft); nur bei genug Platz darüber darüber
      if (sx + sonneR > bx && sx - sonneR < bx + bw && sy + sonneR > by0 && sy - sonneR < by0 + ph) {
        var unterSy = by0 + ph + sonneR + 4, ueberSy = by0 - sonneR - 4;
        if (unterSy + sonneR <= H - 4) sy = unterSy;
        else if (ueberSy - sonneR >= 4) sy = ueberSy;
        else sy = Math.min(H - sonneR - 4, unterSy);
      }
      sy = Math.max(sonneR + 4, Math.min(sy, H - sonneR - 4));
      G.glanz(c, sx, sy, sonneR * 3.5, 'rgba(255,230,160,0.75)', 'rgba(255,230,160,0)');
      kreis(c, sx, sy, sonneR, '#ffe08a');
      // Highlight bewusst r<6, damit Mock nur 1 große Sonne zaehlt (plus Turm-Lichtpunkt)
      kreis(c, sx - sonneR * 0.25, sy - sonneR * 0.25, Math.min(5.5, sonneR * 0.28), '#fff6c8');
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
    versionsAnzeige(R);
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
    // Einheitliche Schrift: erst messen (min-Größe aller Titel), dann zeichnen — kein …
    var songMin = songSz, iT;
    for (iT = 0; iT < tl.length; iT++) {
      var labT = (iT + 1) + '. ' + tl[iT];
      var mT = textInBox(c, labT, 0, 0, colW - 4, lz * 2, songSz, { ausr: 'left', mess: true, maxZeilen: 2, min: 6 });
      if (mT.size < songMin) songMin = mT.size;
    }
    tl.forEach(function (t2, i) {
      var cx2 = bx + 10 + (i >= zeilen ? colW : 0), cy2 = by + kopfH + (i % zeilen) * lz;
      textInBox(c, (i + 1) + '. ' + t2, cx2, cy2, colW - 4, lz, songMin, { col: P.uiTinte, ausr: 'left', maxZeilen: 2, min: songMin });
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
    // Ende: nur endeBild (keine Welt darunter — sonst viele große arcs / doppelte Sonne)
    if (S.zustand === 'ende') { endeBild(R, S); return; }
    var wackel = !S.ruhig && S.fig.pegel >= 1.5, amp = Math.min(2, (S.fig.pegel - 1) * 0.8);
    S.doppelt = wackel;
    var weltH = (R.hochkant && R.weltH != null) ? R.weltH : H;
    var zoom = weltZoomFuer(R, S, weltH);
    S.weltSicht = { zoom: zoom, weltH: weltH };
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
    hud(R, S);
    versionsAnzeige(R, true);
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
    kran: kran, zeichneMotorrad: zeichneMotorrad, zeichneStarshipFlug: zeichneStarshipFlug,
    kameraView: kameraView, weltView: weltView, berechnePortH: berechnePortH,
    W: BASE_W, H: BASE_H, BASE_W: BASE_W, BASE_H: BASE_H, PORT_H: PORT_H, PORT_H_MIN: PORT_H_MIN, PORT_H_MAX: PORT_H_MAX,
    MAX_BREITE: MAX_BREITE, MAX_BG_SKALA: MAX_BG_SKALA, MAX_DPR: MAX_DPR,
    UI_RESERVE_HOCH: UI_RESERVE_HOCH, UI_RESERVE_HOCH_TOUCH: UI_RESERVE_HOCH_TOUCH, STADT_PX_H: STADT_PX_H,
    LATERNE_RADIUS: LATERNE_RADIUS, LATERNE_RADIUS_V06: 44, SCHILD_NACHT_ALPHA: SCHILD_NACHT_ALPHA, UI_DUNKEL: '#1b1530',
    get WELT_FLAECHE() { return WELT_FLAECHE; }, get WELT_ZOOM() { return WELT_ZOOM; },
    WELT_FLAECHE_HOCH: WELT_FLAECHE_HOCH, WELT_FLAECHE_QUER: WELT_FLAECHE_QUER, MIN_WELT_ZOOM: MIN_WELT_ZOOM
  };
})(globalThis);
