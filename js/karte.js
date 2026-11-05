/* Karten: Stuttgart-Kessel-Stadtkarte (40x60 Kacheln) und vier Innenraeume (Hotel, Restaurant, Kneipe, Partykeller).
   Orte, Strassen und Namen sind erfunden. Kachel = 16x16 Pixel. Obere 30 Zeilen wie v04; y 30..47 = Suedstreifen v05; y 48..59 = v08-Verlaengerung. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16;

  var T = {
    GRAS: 0, WEG: 1, PFLASTER: 2, STRASSE: 3, WASSER: 4, BRUECKE: 5, MAUER: 6, REBEN: 7, BAUM: 8, LATERNE: 9, BRUNNEN: 10, BANK: 11,
    STAEFFELE: 12, GEB: 13, TUER: 14, BUSCH: 15,
    BODEN: 20, WAND: 21, TRESEN: 22, TISCH: 23, SOFA: 24, BUFFET: 25, SPENDER: 26, TANZ: 27, DJ: 28, JUKEBOX: 29, PFLANZE: 30,
    TEPPICH: 31, KUECHE: 32, AUSGANG: 33, KICKER: 34, TERRASSE: 35,
    ERDE: 36, HUEGEL: 37, TRIBUENE: 38, ABSPERR: 39, BAUZAUN: 40, BAUGRUBE: 41
  };
  var BLOCK = {};
  [T.WASSER, T.MAUER, T.REBEN, T.BAUM, T.LATERNE, T.BRUNNEN, T.BANK, T.GEB, T.TUER, T.BUSCH, T.WAND, T.TRESEN, T.TISCH, T.SOFA, T.BUFFET,
    T.SPENDER, T.DJ, T.JUKEBOX, T.PFLANZE, T.KUECHE, T.AUSGANG, T.KICKER, T.TRIBUENE, T.ABSPERR, T.BAUZAUN, T.BAUGRUBE].forEach(function (t) { BLOCK[t] = true; });

  var ORTE = ['hotel', 'restaurant', 'kneipe', 'disko'];
  var NAMEN = { hotel: 'Jaz', restaurant: 'Gasthaus Maultäschle', kneipe: 'Sophies Brauhaus', disko: 'Untergrund 07', motocross: 'Motocross-Park' };
  var KURZ = { hotel: 'Jaz', restaurant: 'Maultäschle', kneipe: 'Sophie', disko: 'Untergrund', motocross: 'Motocross' };

  function neueKarte(id, w, h, fill, innen) {
    var k = {
      id: id, w: w, h: h, innen: !!innen, tiles: new Uint8Array(w * h).fill(fill), tueren: [], stationen: [], gebaeude: [], deco: [],
      spawn: { x: 0, y: 0 }, pxW: w * K, pxH: h * K,
      tile: function (x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? T.MAUER : k.tiles[y * w + x]; },
      setze: function (x, y, t) { if (x >= 0 && y >= 0 && x < w && y < h) k.tiles[y * w + x] = t; },
      rect: function (x, y, rw, rh, t) { for (var j = y; j < y + rh; j++) for (var i = x; i < x + rw; i++) k.setze(i, j, t); },
      blockiert: function (x, y) { return !!BLOCK[k.tile(x, y)]; },
      station: function (id2, typ, x, y, sw, sh, label, extra) {
        var s = { id: id2, typ: typ, x: x, y: y, w: sw || 1, h: sh || 1, label: label || '' };
        if (extra) for (var key in extra) s[key] = extra[key];
        k.stationen.push(s); return s;
      }
    };
    return k;
  }

  // ---------------------------------------------------------------- Stadt
  function bauwerk(k, id, x, y, w, h, tuerX) {
    k.rect(x, y, w, h, T.GEB);
    k.setze(tuerX, y + h - 1, T.TUER);
    var b = { id: id, x: x, y: y, w: w, h: h, tuer: { x: tuerX, y: y + h - 1 }, aussen: { x: tuerX, y: y + h }, name: NAMEN[id] };
    k.gebaeude.push(b);
    k.tueren.push({ id: id, x: tuerX, y: y + h - 1, aussen: b.aussen });
    k.station('tuer_' + id, 'tuer', tuerX, y + h - 1, 1, 1, NAMEN[id], { ziel: id });
    return b;
  }

  function erstelleStadt(rng) {
    var k = neueKarte('stadt', 40, 60, T.GRAS, false), x, y;
    // Hang mit Weinbergen und Trockenmauer
    k.rect(0, 0, 40, 5, T.REBEN);
    for (x = 0; x < 40; x++) if (rng.next() < 0.25) k.setze(x, 0, T.BAUM);
    k.rect(0, 5, 40, 1, T.MAUER);
    k.rect(0, 6, 40, 1, T.WEG);                                     // Halbhoehenweg
    // Aussichtsplatz oben rechts mit Staeffele
    k.rect(32, 1, 6, 3, T.PFLASTER); k.setze(36, 2, T.BANK); k.setze(34, 4, T.STAEFFELE); k.setze(34, 5, T.STAEFFELE);
    k.station('bank_aussicht', 'bank', 36, 2, 1, 1, 'Bank am Aussichtsplatz');
    k.station('flasche', 'flasche', 33, 2, 1, 1, 'Wasserflasche');
    // Zweites Staeffele und kleine Bank im Rebenhang
    k.rect(4, 2, 5, 2, T.PFLASTER); k.setze(8, 2, T.BANK); k.setze(6, 4, T.STAEFFELE); k.setze(6, 5, T.STAEFFELE);
    k.station('bank_reben', 'bank', 8, 2, 1, 1, 'Bank im Rebenhang');
    // Marktplatz mit Brunnen
    k.rect(10, 8, 10, 6, T.PFLASTER);
    k.rect(14, 10, 2, 2, T.BRUNNEN);
    k.setze(11, 9, T.BANK); k.setze(18, 9, T.BANK);
    k.station('bank_markt_a', 'bank', 11, 9, 1, 1, 'Bank am Markt');
    k.station('bank_markt_b', 'bank', 18, 9, 1, 1, 'Bank am Markt');
    [[10, 8], [19, 8], [10, 13], [19, 13]].forEach(function (p) { k.setze(p[0], p[1], T.LATERNE); });
    // Hauptstrasse
    k.rect(0, 14, 40, 2, T.STRASSE);
    // Hotel Jaz (oben rechts) mit Hotelallee
    bauwerk(k, 'hotel', 22, 7, 8, 5, 25);
    k.rect(24, 12, 3, 2, T.PFLASTER);
    // Gasthaus Maeultaeschle (links)
    bauwerk(k, 'restaurant', 2, 8, 7, 5, 5);
    k.rect(4, 13, 3, 1, T.PFLASTER);
    // Sophies Brauhaus (rechts, suedlich der Strasse) mit Kesselgasse und Brauhausgasse
    bauwerk(k, 'kneipe', 30, 17, 7, 4, 33);
    k.rect(27, 16, 2, 6, T.WEG);
    k.rect(27, 21, 11, 1, T.WEG);
    k.rect(0, 21, 27, 1, T.WEG);                                    // Bachweg
    // Fluss mit zwei Bruecken
    k.rect(0, 22, 40, 2, T.WASSER);
    k.rect(27, 22, 2, 2, T.BRUECKE); k.rect(11, 22, 2, 2, T.BRUECKE);
    // Partykeller Untergrund 07 (suedlich des Flusses)
    bauwerk(k, 'disko', 27, 25, 9, 4, 31);
    k.rect(25, 24, 1, 6, T.WEG); k.rect(25, 29, 12, 1, T.WEG);
    k.rect(11, 24, 2, 6, T.WEG);
    // Laternen
    [[4, 16], [12, 16], [20, 16], [26, 16], [38, 16], [3, 21], [15, 21], [23, 21], [38, 21], [29, 24], [24, 28], [38, 29]].forEach(function (p) {
      if (!k.blockiert(p[0], p[1])) k.setze(p[0], p[1], T.LATERNE);
    });
    // Baeume und Buesche nur in freien Zonen, damit nichts zugestellt wird (obere 30 Zeilen, rng-Reihenfolge wie v04)
    function streue(x0, y0, x1, y1, p, t) {
      for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) if (k.tile(i, j) === T.GRAS && rng.next() < p) k.setze(i, j, t);
    }
    streue(0, 7, 1, 13, 0.5, T.BAUM); streue(0, 17, 9, 20, 0.14, T.BAUM); streue(11, 17, 25, 20, 0.10, T.BUSCH);
    streue(0, 24, 10, 28, 0.12, T.BAUM); streue(13, 25, 23, 28, 0.10, T.BUSCH); streue(37, 7, 39, 13, 0.4, T.BAUM);
    streue(30, 7, 36, 12, 0.10, T.BUSCH); streue(37, 24, 39, 28, 0.3, T.BAUM);
    // Suedstreifen y 30..47: fest (kein rng), schliesst an Weg (25,29) an
    k.rect(25, 30, 1, 16, T.WEG);                                    // Suedweg bis y 45
    k.rect(12, 38, 14, 1, T.WEG);                                    // Querweg
    k.rect(12, 32, 1, 7, T.WEG);                                     // Park-Anschluss
    k.rect(3, 32, 9, 7, T.PFLASTER);                                 // kleiner Park
    k.setze(4, 33, T.BANK); k.setze(9, 33, T.BANK); k.setze(6, 37, T.BANK);
    k.setze(6, 34, T.LATERNE);
    k.rect(5, 35, 2, 2, T.WASSER);                                   // Teich
    k.station('bank_park_a', 'bank', 4, 33, 1, 1, 'Bank im Südpark');
    k.station('bank_park_b', 'bank', 9, 33, 1, 1, 'Bank am Teich');
    k.station('bank_park_c', 'bank', 6, 37, 1, 1, 'Bank am Parkweg');
    [[2, 32], [11, 32], [2, 38], [18, 38], [32, 40], [8, 44]].forEach(function (p) {
      if (!k.blockiert(p[0], p[1]) && k.tile(p[0], p[1]) !== T.WEG) k.setze(p[0], p[1], T.LATERNE);
    });
    // Untere Kante y47: weiche Baum-/Mauerreihe (v05, Koordinaten unveraendert)
    for (x = 0; x < 40; x++) {
      if (x % 5 === 2) k.setze(x, 47, T.MAUER);
      else k.setze(x, 47, T.BAUM);
      if (x % 3 === 0 && k.tile(x, 46) === T.GRAS) k.setze(x, 46, T.BAUM);
      else if (x % 3 === 1 && k.tile(x, 46) === T.GRAS) k.setze(x, 46, T.BUSCH);
    }
    // v08: Suedverlaengerung y 48..59 — Hauptweg fortsetzen, kleiner Park, Rand Reben/Baeume (keine neuen Tueren)
    k.setze(25, 46, T.WEG); k.setze(25, 47, T.WEG);
    k.rect(25, 48, 1, 10, T.WEG);
    k.rect(18, 52, 8, 1, T.WEG);
    k.rect(10, 50, 7, 5, T.PFLASTER);
    k.setze(12, 51, T.BANK); k.setze(15, 53, T.BANK); k.setze(13, 52, T.LATERNE);
    k.rect(17, 51, 9, 1, T.WEG);
    k.station('bank_sued_a', 'bank', 12, 51, 1, 1, 'Bank im Südhain');
    k.station('bank_sued_b', 'bank', 15, 53, 1, 1, 'Bank am Südweg');
    k.rect(0, 48, 40, 1, T.REBEN);
    k.setze(25, 48, T.WEG);                                         // Hauptweg durch Rebenzeile
    for (x = 0; x < 40; x++) {
      if (x === 25) continue;
      if (x % 4 === 0) k.setze(x, 59, T.BAUM);
      else if (x % 4 === 2) k.setze(x, 59, T.BUSCH);
      else if (x % 5 === 1) k.setze(x, 59, T.MAUER);
      if (k.tile(x, 58) === T.GRAS && x % 3 === 0) k.setze(x, 58, T.BAUM);
      else if (k.tile(x, 58) === T.GRAS && x % 3 === 1) k.setze(x, 58, T.BUSCH);
    }
    // Gras-Tupfer und Blumen (nur Optik); y 0..29 unveraendert, weil Sued-Geometrie ohne rng davor lag
    var farben = ['#ff8fb4', '#ffe066', '#ffffff', '#b9a3f5'];
    for (y = 0; y < k.h; y++) for (x = 0; x < k.w; x++) {
      if (k.tile(x, y) === T.GRAS && rng.next() < (y >= 48 ? 0.16 : 0.12)) k.deco.push({ x: x * K + rng.int(2, 13), y: y * K + rng.int(2, 13), farbe: rng.pick(farben) });
    }
    // Wiese im Sueden: Baeume/Buesche nach Blumen-rng, damit Seeds der oberen 30 Zeilen stabil bleiben
    streue(0, 30, 39, 45, 0.11, T.BAUM); streue(0, 30, 39, 45, 0.09, T.BUSCH);
    streue(0, 49, 39, 57, 0.10, T.BAUM); streue(0, 49, 39, 57, 0.08, T.BUSCH);
    // Hauptweg-Suedspine nach Reben/streue: x=25 durchgaengig, Querweg y=52 zum Suedpark
    for (var sy = 46; sy <= 57; sy++) k.setze(25, sy, T.WEG);
    k.rect(11, 52, 15, 1, T.WEG);
    // Motocross-Park (Ostseite y 31..44, x 27..38) nach streue, damit Seeds oben stabil bleiben
    baueMotocross(k);
    baueS21(k);
    // Bierkaesten an jede Bank (Prop, begehbar)
    k.stationen.filter(function (st) { return st.typ === 'bank'; }).forEach(function (st) {
      bierkasten(k, st.x, st.y, st.id);
    });
    // Bierkaesten am Motocross-Park (Wiese ausserhalb der Piste, nach Bank-Kaesten)
    [[37, 33], [28, 42], [37, 42]].forEach(function (p, i) {
      if (!k.blockiert(p[0], p[1])) k.station('kasten_mx' + (i + 1), 'bierkasten', p[0], p[1], 1, 1, 'Bierkasten');
    });
    k.spawn = { x: 25, y: 13 };
    return k;
  }

  // Freie Nachbarkachel Ost/West/Sued: Bierkasten als begehbare Station (kein BLOCK)
  function bierkasten(k, bx, by, bankId) {
    var dirs = [[1, 0], [-1, 0], [0, 1]], i, x, y, id = (bankId || (bx + '_' + by)).replace(/^bank_/, '');
    for (i = 0; i < dirs.length; i++) {
      x = bx + dirs[i][0]; y = by + dirs[i][1];
      if (x < 0 || y < 0 || x >= k.w || y >= k.h) continue;
      if (k.blockiert(x, y)) continue;
      if (k.tile(x, y) === T.BANK) continue;
      var belegt = false;
      k.stationen.forEach(function (st) {
        if (st.typ === 'bierkasten' && st.x === x && st.y === y) belegt = true;
        if (st.typ === 'bank' && st.x === x && st.y === y) belegt = true;
      });
      if (belegt) continue;
      k.station('kasten_' + id, 'bierkasten', x, y, 1, 1, 'Bierkasten');
      return true;
    }
    return false;
  }

  function baueS21(k) {
    var x, y;
    // Flaeche x14..23, y31..36: freie Wiese zwischen Weg x12, Suedweg x25 und Querweg y38
    k.rect(14, 31, 10, 6, T.GRAS);
    // Ring Bauzaun, innen Baugrube
    for (y = 31; y <= 36; y++) for (x = 14; x <= 23; x++) {
      var rand = (x === 14 || x === 23 || y === 31 || y === 36);
      k.setze(x, y, rand ? T.BAUZAUN : T.BAUGRUBE);
    }
    // Innen x15..22, y32..35 bereits Baugrube durch die Schleife
    k.deco = k.deco.filter(function (d) {
      var tx = Math.floor(d.x / K), ty = Math.floor(d.y / K);
      return !(tx >= 14 && tx <= 23 && ty >= 31 && ty <= 36);
    });
    k.s21 = { x: 14, y: 31, w: 10, h: 6 };
  }

  function baueMotocross(k) {
    var x, y, cx = 32.5, cy = 37.5;
    k.rect(26, 38, 2, 1, T.WEG);                                       // Querweg nach Osten zum Eingang
    for (y = 31; y <= 44; y++) for (x = 27; x <= 38; x++) {
      var dx = (x + 0.5) - cx, dy = (y + 0.5) - cy;
      var rx = dx / 5.2, ry = dy / 5.8, d2 = rx * rx + ry * ry;
      var rand = (x === 27 || x === 38 || y === 31 || y === 44);
      var eingang = (x === 27 && y >= 37 && y <= 39);
      if (rand && !eingang) k.setze(x, y, T.ABSPERR);
      else if (d2 >= 0.42 && d2 <= 0.92) k.setze(x, y, T.ERDE);
      else k.setze(x, y, T.GRAS);
    }
    // Drei Huegel/Spruenge auf der Piste (begehbar)
    k.setze(30, 33, T.HUEGEL); k.setze(36, 35, T.HUEGEL); k.setze(32, 42, T.HUEGEL);   // alle auf der Piste (d² 0,42 bis 0,92)
    // Tribuene Nordseite, Nachbarkacheln frei (Piste/Gras)
    k.rect(28, 32, 4, 1, T.TRIBUENE);
    k.station('tribuene', 'tribuene', 28, 32, 4, 1, 'Tribüne');
    // Eingang offen halten und Weganschluss
    k.setze(27, 38, T.WEG); k.setze(26, 38, T.WEG);
    k.setze(28, 38, T.ERDE);
    // Keine Blumen/Baeume auf der Piste; Laterne (32,40) ist ueberschrieben
    k.deco = k.deco.filter(function (d) {
      var tx = Math.floor(d.x / K), ty = Math.floor(d.y / K);
      return !(tx >= 27 && tx <= 38 && ty >= 31 && ty <= 44);
    });
  }

  // ---------------------------------------------------------------- Innenraeume
  function raum(id, w, h) {
    var k = neueKarte(id, w, h, T.BODEN, true);
    k.rect(0, 0, w, 2, T.WAND);
    k.rect(0, h - 1, w, 1, T.WAND); k.rect(0, 0, 1, h, T.WAND); k.rect(w - 1, 0, 1, h, T.WAND);
    return k;
  }
  function ausgang(k, x) {
    k.setze(x, k.h - 1, T.AUSGANG); k.setze(x + 1, k.h - 1, T.AUSGANG);
    k.station('ausgang', 'ausgang', x, k.h - 1, 2, 1, 'Ausgang');
    k.spawn = { x: x, y: k.h - 2 };
    k.ausgangX = x;
  }

  function erstelleHotel() {
    var k = raum('hotel', 16, 12);
    ausgang(k, 7);
    k.rect(2, 3, 4, 1, T.TRESEN);                                   // Rezeption
    k.rect(9, 2, 4, 1, T.BUFFET); k.station('buffet', 'buffet', 9, 2, 4, 1, 'Frühstücksbuffet');
    k.setze(14, 2, T.SPENDER); k.station('spender', 'spender', 14, 2, 1, 1, 'Wasserspender');
    k.rect(1, 7, 4, 3, T.TEPPICH); k.rect(1, 8, 3, 1, T.SOFA); k.station('sofa', 'sofa', 1, 8, 3, 1, 'Sofa');
    k.rect(7, 5, 3, 2, T.TISCH); k.station('stammtisch', 'stammtisch', 7, 5, 3, 2, 'Stammtisch');
    k.rect(11, 7, 4, 3, T.TERRASSE);                                // Dachterrasse
    k.setze(10, 7, T.PFLANZE); k.setze(10, 9, T.PFLANZE); k.setze(1, 2, T.PFLANZE);
    k.station('joint', 'joint', 14, 8, 1, 1, 'Dicke Tüte');
    return k;
  }
  function erstelleRestaurant() {
    var k = raum('restaurant', 16, 12);
    ausgang(k, 7);
    k.rect(2, 3, 5, 1, T.TRESEN); k.station('tresen', 'tresen_restaurant', 2, 3, 5, 1, 'Tresen');
    k.rect(10, 2, 5, 1, T.KUECHE); k.rect(10, 3, 5, 1, T.TRESEN); k.station('kueche', 'kueche', 10, 3, 5, 1, 'Küche (Durchreiche)');
    k.rect(5, 6, 6, 2, T.TISCH); k.station('stammtisch', 'stammtisch', 5, 6, 6, 2, 'Stammtisch');
    k.rect(12, 8, 3, 2, T.TERRASSE);                                // Biergarten-Ecke
    k.setze(1, 10, T.PFLANZE); k.setze(14, 10, T.PFLANZE); k.setze(1, 2, T.PFLANZE);
    return k;
  }
  function erstelleKneipe() {
    var k = raum('kneipe', 14, 11);
    ausgang(k, 6);
    k.rect(2, 3, 8, 1, T.TRESEN); k.station('tresen', 'tresen_kneipe', 2, 3, 8, 1, 'Tresen');
    k.setze(12, 2, T.JUKEBOX); k.station('jukebox', 'jukebox', 12, 2, 1, 1, 'Jukebox');
    k.rect(1, 6, 2, 1, T.KICKER);
    k.rect(7, 5, 5, 4, T.TEPPICH); k.rect(8, 6, 3, 2, T.TISCH); k.station('stammtisch', 'stammtisch', 8, 6, 3, 2, 'Stammtisch');
    k.setze(12, 9, T.PFLANZE);
    return k;
  }
  function erstelleDisko() {
    var k = raum('disko', 18, 12);
    ausgang(k, 8);
    k.rect(7, 2, 4, 1, T.DJ);
    k.rect(4, 4, 10, 4, T.TANZ); k.station('tanz', 'tanz', 4, 4, 10, 4, 'Tanzfläche');
    k.rect(16, 3, 1, 6, T.TRESEN); k.station('bar', 'bar_disko', 16, 3, 1, 6, 'Bar');
    k.rect(12, 10, 3, 1, T.TISCH); k.station('stammtisch', 'stammtisch', 12, 10, 3, 1, 'Stammtisch');
    k.rect(1, 4, 1, 4, T.SOFA); k.station('sofa', 'sofa', 1, 4, 1, 4, 'Chill-Sofa');
    k.setze(1, 10, T.PFLANZE); k.setze(16, 10, T.PFLANZE);
    return k;
  }

  function erstelleWelt(rng) {
    var w = { stadt: erstelleStadt(rng), innen: { hotel: erstelleHotel(), restaurant: erstelleRestaurant(), kneipe: erstelleKneipe(), disko: erstelleDisko() } };
    w.karte = function (id) { return id === 'stadt' ? w.stadt : w.innen[id]; };
    return w;
  }

  // Abstand eines Punkts (Pixel) zu einem Kachel-Rechteck
  function abstand(px, py, s) {
    var x0 = s.x * K, y0 = s.y * K, x1 = (s.x + s.w) * K, y1 = (s.y + s.h) * K;
    var dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
    return Math.hypot(dx, dy);
  }
  // Naechste Station in Reichweite
  function nahe(karte, px, py, reichweite) {
    var best = null, bd = reichweite || 12;
    for (var i = 0; i < karte.stationen.length; i++) {
      var d = abstand(px, py, karte.stationen[i]);
      if (d <= bd) { bd = d; best = karte.stationen[i]; }
    }
    return best;
  }
  // Begehbare Kacheln rund um eine Station (fuer die Truppe am Stammtisch), nach Abstand sortiert
  function umgebung(karte, s) {
    var res = [];
    for (var y = s.y - 1; y <= s.y + s.h; y++) for (var x = s.x - 1; x <= s.x + s.w; x++) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) continue;
      if (!karte.blockiert(x, y)) res.push({ x: x, y: y });
    }
    return res;
  }

  Saufi.Karte = { K: K, T: T, BLOCK: BLOCK, ORTE: ORTE, NAMEN: NAMEN, KURZ: KURZ, erstelleStadt: erstelleStadt, erstelleWelt: erstelleWelt, nahe: nahe, umgebung: umgebung, abstand: abstand };
})(globalThis);
