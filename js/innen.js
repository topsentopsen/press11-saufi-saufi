/* Innenraeume als Vektorgrafik: Hotel (Lobby), Gasthaus, Kneipe und Partykeller mit Moebeln, Wanddeko und animierten Lichtern.
   Kacheln werden in den gecachten Hintergrund gezeichnet; Bewegtes (Tanzflaeche, Kugel, Nebel, Jukebox) kommt zur Laufzeit dazu. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var G = Saufi.Gfx, P = G.P, hash = G.hash, r = G.r, rr = G.rr, kreis = G.kreis, ellipse = G.ellipse, poly = G.poly, linie = G.linie, vlauf = G.vlauf, text = G.text, textInBox = G.textInBox;
  var K = 16;
  var TANZ_FARBEN = [P.neonPink, P.neonCyan, P.neonGelb, P.neonLila];

  function nbT(karte, x, y, t) { return [karte.tile(x - 1, y) === t, karte.tile(x + 1, y) === t, karte.tile(x, y - 1) === t, karte.tile(x, y + 1) === t]; }

  // ---------- Boeden ----------
  function boden(c, id, x, y, sx, sy) {
    var hs = hash(x, y), fl = (x + y) % 2 === 0, i;
    if (id === 'hotel') {                         // Parkett (waermere Palette)
      var farben = ['#e6b78c', '#d9a578', '#efc29a'];
      for (i = 0; i < 4; i++) {
        var o = ((x + i) % 2) * 5, py = sy + i * 4, hh = hash(x, y * 4 + i);
        r(c, sx, py, K, 4, farben[hh % 3]);
        r(c, sx, py + 3.4, K, 0.6, 'rgba(100,60,40,0.28)'); r(c, sx + ((o + 3) % 16), py, 0.6, 4, 'rgba(100,60,40,0.22)');
        r(c, sx, py, K, 0.5, 'rgba(255,240,220,0.28)');
      }
    } else if (id === 'restaurant') {             // Fliesen im Schachbrett
      r(c, sx, sy, K, K, fl ? '#f8f1e6' : '#cfe0ea');
      r(c, sx, sy, K, 0.7, 'rgba(255,255,255,0.7)'); r(c, sx, sy, 0.7, K, 'rgba(255,255,255,0.5)');
      r(c, sx, sy + K - 0.5, K, 0.5, 'rgba(70,60,90,0.16)'); r(c, sx + K - 0.5, sy, 0.5, K, 'rgba(70,60,90,0.16)');
    } else if (id === 'kneipe') {                 // Dielen
      for (i = 0; i < 3; i++) {
        var py2 = sy + i * 5.34, hh2 = hash(x * 3 + i, y), dun = hh2 % 2;
        r(c, sx, py2, K, 5.4, dun ? '#9e6c48' : '#b07f56');
        r(c, sx, py2 + 4.8, K, 0.6, 'rgba(60,30,20,0.5)'); r(c, sx + ((hh2 >> 3) % 14) + 1, py2, 0.6, 5.4, 'rgba(60,30,20,0.4)');
        if (hh2 % 5 === 0) ellipse(c, sx + 3 + (hh2 >> 5) % 10, py2 + 2.6, 1.2, 0.8, 'rgba(70,40,25,0.5)');
        r(c, sx, py2, K, 0.5, 'rgba(255,220,180,0.18)');
      }
    } else {                                      // Disko: glaenzende dunkle Platten
      vlauf(c, sx, sy, K, K, fl ? '#2d2650' : '#262045', fl ? '#241e42' : '#1e193a');
      r(c, sx, sy, K, 0.6, 'rgba(160,140,255,0.16)'); r(c, sx, sy, 0.6, K, 'rgba(160,140,255,0.1)');
    }
  }

  // ---------- Waende ----------
  var WAND = {
    hotel: { oben: '#f6e6cc', unten: '#b8855f', rand: '#9b6f4e', leiste: '#7a4f36' },
    restaurant: { oben: '#efd9aa', unten: '#a56c48', rand: '#8a5636', leiste: '#5f3a26' },
    kneipe: { oben: '#8a5a44', unten: '#5a3a2e', rand: '#43291f', leiste: '#2f1c15' },
    disko: { oben: '#2f2652', unten: '#1c1634', rand: '#120e26', leiste: '#0a0818' }
  };
  function wand(c, karte, x, y, sx, sy) {
    var f = WAND[karte.id] || WAND.hotel, oben = y === 0, unten = y === karte.h - 1, seite = x === 0 || x === karte.w - 1, hs = hash(x, y);
    if (seite || unten) {
      vlauf(c, sx, sy, K, K, f.rand, f.leiste);
      if (unten) { r(c, sx, sy, K, 3, f.unten); r(c, sx, sy + 3, K, 0.8, 'rgba(0,0,0,0.3)'); }
      if (seite && !unten && y > 1) r(c, x === 0 ? sx + K - 1 : sx, sy, 1, K, 'rgba(255,255,255,0.15)');
      return;
    }
    if (oben) {
      vlauf(c, sx, sy, K, K, f.oben, G.mischeHex(f.oben, '#000000', 0.08));
      if (karte.id === 'hotel') { for (var i = 0; i < 4; i++) r(c, sx + 2 + i * 4, sy, 0.6, K, 'rgba(180,140,100,0.16)'); }
      if (karte.id === 'restaurant') { for (var j = 0; j < 3; j++) r(c, sx, sy + 2 + j * 5, K, 0.6, 'rgba(120,80,40,0.14)'); }
      if (karte.id === 'kneipe') { for (var k2 = 0; k2 < 3; k2++) r(c, sx + 2.5 + k2 * 5.4, sy, 0.7, K, 'rgba(30,15,10,0.35)'); }
      if (karte.id === 'disko') r(c, sx, sy + 12, K, 1.6, 'rgba(79,230,255,0.18)');
      r(c, sx, sy + K - 1.4, K, 1.4, 'rgba(0,0,0,0.12)');
      if (x % 4 === 2 && karte.id !== 'disko' && x > 0 && x < karte.w - 1) fensterWand(c, sx, sy);
    } else {                                      // y === 1: Sockelverkleidung
      vlauf(c, sx, sy, K, 8, G.mischeHex(f.oben, '#000000', 0.1), G.mischeHex(f.oben, '#000000', 0.04));
      vlauf(c, sx, sy + 8, K, 8, f.unten, G.mischeHex(f.unten, '#000000', 0.2));
      r(c, sx, sy + 7.6, K, 1.2, G.mischeHex(f.unten, '#ffffff', 0.25)); r(c, sx, sy + 8.8, K, 0.5, 'rgba(0,0,0,0.25)');
      rr(c, sx + 1.5, sy + 10.2, 13, 4.6, 'rgba(0,0,0,0.12)', 1);
      r(c, sx, sy + K - 1.3, K, 1.3, f.leiste);
    }
  }
  function fensterWand(c, sx, sy) {
    rr(c, sx + 1.5, sy + 2, 13, 12, '#fff8ee', 1.5, P.konturStein, 0.7);
    vlauf(c, sx + 2.5, sy + 3, 11, 10, '#b8e2f8', '#8ccaec');
    r(c, sx + 7.7, sy + 3, 0.7, 10, '#fff8ee'); r(c, sx + 2.5, sy + 7.5, 11, 0.7, '#fff8ee');
    poly(c, [[sx + 3, sy + 12.5], [sx + 7, sy + 3.5], [sx + 8.6, sy + 3.5], [sx + 4.6, sy + 12.5]], 'rgba(255,255,255,0.3)');
  }

  // ---------- Moebel ----------
  function schattenUnten(c, sx, sy, h) { r(c, sx, sy + h, K, 2.5, 'rgba(40,20,40,0.2)'); }

  function tresen(c, karte, x, y, sx, sy, hs) {
    var id = karte.id, vert = karte.tile(x, y - 1) === karte.tile(x, y) || karte.tile(x, y + 1) === karte.tile(x, y);
    var T = Saufi.Karte.T;
    if (id === 'disko' && vert) {                 // Bar an der rechten Wand, senkrecht
      r(c, sx, sy, K, K, '#2a2346');
      rr(c, sx + 1, sy - 0.5, 12, K + 1, '#6a4a3a', 2); vlauf(c, sx + 1, sy, 12, K, '#d9b08a', '#c0916c');
      r(c, sx + 13, sy, 2, K, '#4a2f27'); r(c, sx + 13.2, sy, 0.6, K, P.neonPink);
      if (hs % 2) { rr(c, sx + 4, sy + 4, 3.4, 5, '#d8f0ff', 0.8); rr(c, sx + 8, sy + 8, 3, 4, '#ffc233', 0.8); }
      return;
    }
    var kneipe = id === 'kneipe', restaurant = id === 'restaurant', hotel = id === 'hotel';
    var front = kneipe ? ['#7a4a3a', '#5a3328'] : (restaurant ? ['#a56c48', '#7a4a34'] : ['#8a5a3e', '#5f3a28']);
    vlauf(c, sx, sy + 6, K, 10, front[0], front[1]);
    for (var i = 0; i < 2; i++) { rr(c, sx + 1.5 + i * 7.4, sy + 8, 6, 6, 'rgba(0,0,0,0.15)', 1); }
    r(c, sx, sy + K - 1.6, K, 1.6, '#c9a64a');                          // Messing-Fussleiste
    vlauf(c, sx, sy + 1, K, 5.4, '#e8c49a', '#cf9f70'); r(c, sx, sy + 1, K, 0.8, '#f9e2c0'); r(c, sx, sy + 6, K, 0.6, 'rgba(60,30,20,0.4)');
    if (kneipe && !vert) {                                               // Zapfhaehne und Glaeser
      if (x === 3 || x === 5 || x === 7) {
        var cols = ['#e0504a', '#4a9ae0', '#ffc233'];
        rr(c, sx + 5, sy - 5.5, 6, 3.2, '#d9d4e0', 1.2, '#8a8296', 0.5); r(c, sx + 7.4, sy - 3, 1.2, 4.4, '#c9c3d6');
        rr(c, sx + 5.5, sy - 8.5, 5, 3.4, cols[(x - 3) / 2], 1.2, '#4a3560', 0.5); kreis(c, sx + 8, sy - 9.2, 1.1, '#fff8ee');
        rr(c, sx + 5.5, sy + 2.5, 5, 2.6, '#8a8296', 0.8);
      } else if (hs % 3 === 0) { rr(c, sx + 5, sy - 3, 4.4, 5.6, 'rgba(255,230,150,0.9)', 1, '#6a5a70', 0.5); r(c, sx + 5.3, sy - 3, 3.8, 1.4, '#fff'); r(c, sx + 9.4, sy - 1.6, 1.6, 3, 'rgba(255,255,255,0.0)'); }
      else if (hs % 3 === 1) { rr(c, sx + 9, sy - 2, 3.4, 4.6, 'rgba(220,240,255,0.85)', 1, '#6a5a70', 0.5); }
    } else if (hotel) {
      if (x === 2) { rr(c, sx + 4, sy - 3, 3, 3, '#c9a64a', 1.4); kreis(c, sx + 5.5, sy - 3.4, 1, '#ffd75e'); }          // Klingel
      else if (x === 4) { r(c, sx + 7.4, sy - 3.4, 1.2, 3.6, '#4a3560'); poly(c, [[sx + 5, sy - 3], [sx + 11, sy - 3], [sx + 10, sy - 7], [sx + 6, sy - 7]], '#ffe9a8', '#c9a64a', 0.5); }
      else if (x === 5) { rr(c, sx + 3, sy - 4.4, 8, 5.6, '#2a2342', 1, '#8a8296', 0.5); r(c, sx + 4.2, sy - 3.4, 5.6, 3, '#4fe6ff'); }
    } else if (restaurant) {
      var kuech = karte.tile(x, y - 1) === T.KUECHE;
      if (kuech) { rr(c, sx + 1, sy - 2, 14, 4, '#fffdf8', 1, '#b3a5c2', 0.5); if (x % 2) { kreis(c, sx + 8, sy - 2.5, 3, '#e8e4ee', '#9aa3bb', 0.6); r(c, sx + 7.6, sy - 6, 0.8, 1.8, '#9aa3bb'); } else { kreis(c, sx + 5, sy - 1, 2.4, '#fff', '#b3a5c2', 0.5); kreis(c, sx + 11, sy - 1, 2.4, '#fff', '#b3a5c2', 0.5); } }
      else if (hs % 2) { kreis(c, sx + 8, sy + 0.5, 3.4, '#fff', '#b3a5c2', 0.5); kreis(c, sx + 8, sy + 0.5, 2, '#f4ecdc'); }
      else rr(c, sx + 4, sy - 3, 4, 5.6, 'rgba(255,230,150,0.9)', 1, '#6a5a70', 0.5);
    }
  }

  function tisch(c, karte, x, y, sx, sy, hs) {
    var T = Saufi.Karte.T, n = nbT(karte, x, y, T.TISCH), id = karte.id;
    var rd = 2.4, x0 = sx + (n[0] ? 0 : 0.8), x1 = sx + K - (n[1] ? 0 : 0.8), y0 = sy + (n[2] ? 0 : 1.6), y1 = sy + K - (n[3] ? 0 : 0.8);
    // Schatten und Stuehle
    if (!n[3]) r(c, sx, sy + K - 1, K, 2.2, 'rgba(40,20,40,0.22)');
    if (id === 'disko') {
      rr(c, x0, y0, x1 - x0, y1 - y0, '#2c2548', rd, '#0e0a1e', 0.7); vlauf(c, x0 + 0.6, y0 + 0.6, x1 - x0 - 1.2, 3, 'rgba(160,140,255,0.4)', 'rgba(160,140,255,0)');
      r(c, x0 + 1, y1 - 2.4, x1 - x0 - 2, 0.7, P.neonPink);
    } else {
      var kar = id === 'restaurant', hotel = id === 'hotel';
      var tuch = kar ? '#fff8ee' : (hotel ? '#fffdf6' : '#9a6a44');
      rr(c, x0, y0, x1 - x0, y1 - y0, tuch, rd, kar ? '#a53a3a' : (hotel ? '#c9bfae' : '#5a3a2a'), 0.8);
      if (kar) {                                       // rot-weisses Karo
        c.save(); c.beginPath(); c.rect(x0 + 0.4, y0 + 0.4, x1 - x0 - 0.8, y1 - y0 - 0.8); c.clip();
        for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) if ((i + j + x + y) % 2 === 0) r(c, sx + i * 4, sy + j * 4, 4, 4, 'rgba(224,80,74,0.55)');
        c.restore();
      } else if (!hotel) { r(c, x0 + 1, y0 + 1, x1 - x0 - 2, 0.8, 'rgba(255,230,190,0.4)'); }
      else { r(c, x0 + 1, y1 - 3, x1 - x0 - 2, 2, 'rgba(180,170,150,0.35)'); }
      if (!n[3] && (kar || hotel)) poly(c, [[x0 + 2, y1], [x1 - 2, y1], [x1 - 3, y1 + 2.2], [x0 + 3, y1 + 2.2]], tuch, null);        // Tischdecke haengt herunter
    }
    // Tischschmuck pro Kachel
    var cx = sx + 8, cy = sy + 8;
    if (hs % 3 === 0) {                                 // Kerze
      rr(c, cx - 1.2, cy - 0.5, 2.4, 3.6, '#fff8ee', 0.8, '#b3a5c2', 0.4); poly(c, [[cx - 0.8, cy - 0.5], [cx + 0.8, cy - 0.5], [cx, cy - 3]], '#ffb037');
    } else if (hs % 3 === 1) {                          // Bierglas
      rr(c, cx - 2.2, cy - 2.4, 4.4, 5.8, 'rgba(255,208,80,0.95)', 1.2, '#6a5a70', 0.5); r(c, cx - 2, cy - 2.4, 4, 1.4, '#fff8ee'); rr(c, cx + 2.2, cy - 0.6, 1.8, 2.6, 'rgba(0,0,0,0)', 1, '#6a5a70', 0.5);
    } else { kreis(c, cx, cy, 2.8, '#fff', '#b3a5c2', 0.5); kreis(c, cx, cy, 1.6, '#f4ecdc'); }
  }

  function sofa(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, n = nbT(karte, x, y, T.SOFA), horiz = n[0] || n[1], disko = karte.id === 'disko';
    var main = disko ? '#8a6ae0' : '#c96d86', hell = disko ? '#b39cf5' : '#e690a6', dunk = disko ? '#5f45b0' : '#9a4a62';
    if (horiz) {
      var l = !n[0], rt = !n[1];
      rr(c, sx + (l ? 0.6 : -1), sy + 0.8, K + (l ? 0 : 1) + (rt ? 0 : 1) - (l ? 0.6 : 0) - (rt ? 0.6 : 0), 6.6, dunk, 2.4);
      rr(c, sx + (l ? 0.6 : -1), sy + 5.6, K + (l ? 0 : 1) + (rt ? 0 : 1) - (l ? 0.6 : 0) - (rt ? 0.6 : 0), 8.4, main, 2.8, 'rgba(50,20,40,0.7)', 0.7);
      vlauf(c, sx + 1.5, sy + 6.4, K - 3, 4.2, hell, main);
      r(c, sx + 7.7, sy + 6.2, 0.6, 7.4, 'rgba(50,20,40,0.35)');
      if (l) { rr(c, sx, sy + 3, 3.4, 11, dunk, 1.8, 'rgba(50,20,40,0.7)', 0.7); }
      if (rt) { rr(c, sx + K - 3.4, sy + 3, 3.4, 11, dunk, 1.8, 'rgba(50,20,40,0.7)', 0.7); }
      if (l) { rr(c, sx + 4, sy + 7, 4, 4, '#ffd36e', 1.2); }
      r(c, sx, sy + 14.4, K, 1.6, 'rgba(40,20,40,0.22)');
    } else {
      var o = !n[2], u = !n[3];
      rr(c, sx + 0.8, sy + (o ? 0.6 : -1), 5, K + (o ? 0 : 1) + (u ? 0 : 1) - (o ? 0.6 : 0) - (u ? 0.6 : 0), dunk, 2.4);
      rr(c, sx + 4.5, sy + (o ? 0.6 : -1), 11, K + (o ? 0 : 1) + (u ? 0 : 1) - (o ? 0.6 : 0) - (u ? 0.6 : 0), main, 2.8, 'rgba(50,20,40,0.7)', 0.7);
      vlauf(c, sx + 6, sy + 1.5, 7, K - 3, hell, main);
      if (o) rr(c, sx + 5, sy, 10, 3, dunk, 1.5); if (u) rr(c, sx + 5, sy + 13, 10, 3, dunk, 1.5);
    }
  }

  function buffet(c, karte, x, y, sx, sy, hs) {
    vlauf(c, sx, sy + 5, K, 11, '#fffdf8', '#e4dcea'); r(c, sx, sy + 5, K, 0.8, '#fff'); r(c, sx, sy + 15, K, 1, P.konturStein);
    r(c, sx, sy + 12.6, K, 0.6, 'rgba(120,100,150,0.25)');
    var k = (x - 9) % 4;
    if (k === 0) { ellipse(c, sx + 8, sy + 8, 5.2, 2.6, '#e8c9a0'); for (var i = 0; i < 4; i++) ellipse(c, sx + 4.5 + i * 2.4, sy + 7, 1.4, 1.6, '#c98b4e'); }
    else if (k === 1) { kreis(c, sx + 8, sy + 8.2, 5, '#e8e4ee', '#9aa3bb', 0.6); c.beginPath(); c.arc(sx + 8, sy + 8.2, 4.4, Math.PI, 0); c.fillStyle = 'rgba(220,240,255,0.5)'; c.fill(); kreis(c, sx + 5.5, sy + 8, 1.5, '#ff9a8a'); kreis(c, sx + 8.5, sy + 7, 1.5, '#ffd36e'); kreis(c, sx + 10.2, sy + 9, 1.4, '#a4d890'); }
    else if (k === 2) { rr(c, sx + 3, sy + 6.4, 10, 5, '#d9b17a', 1.6, '#8a5a3a', 0.5); kreis(c, sx + 5.5, sy + 6.4, 1.3, '#e0504a'); kreis(c, sx + 8.5, sy + 6, 1.4, '#ffe066'); kreis(c, sx + 11, sy + 6.4, 1.3, '#a4d890'); }
    else { rr(c, sx + 3, sy + 6.6, 3.6, 5, '#e0504a', 1.2, '#8a2a28', 0.5); rr(c, sx + 9, sy + 6.6, 3.6, 5, '#ffb037', 1.2, '#9a5a20', 0.5); r(c, sx + 3.4, sy + 6.2, 2.8, 1, '#fff8ee'); r(c, sx + 9.4, sy + 6.2, 2.8, 1, '#fff8ee'); }
  }
  function spender(c, sx, sy) {
    schattenUnten(c, sx, sy + 13, 0);
    rr(c, sx + 3.5, sy + 8, 9, 7.6, '#e8eef6', 1.8, P.konturStein, 0.7); r(c, sx + 4.5, sy + 12, 7, 0.7, '#9aa3bb'); rr(c, sx + 6.4, sy + 10, 3.2, 2, '#4fb0d6', 0.8);
    rr(c, sx + 4, sy + 0.2, 8, 8.4, 'rgba(160,220,246,0.85)', 3.4, '#6a9ab8', 0.7); ellipse(c, sx + 8, sy + 5, 2.4, 2.2, 'rgba(255,255,255,0.35)');
    kreis(c, sx + 6.6, sy + 5, 0.5, '#fff'); kreis(c, sx + 9.4, sy + 3.6, 0.5, '#fff'); rr(c, sx + 6.8, sy - 0.8, 2.4, 1.6, '#4fb0d6', 0.6);
    rr(c, sx + 6, sy + 12.8, 3.4, 2.8, '#fff', 0.8, '#9aa3bb', 0.4);
  }
  function dj(c, karte, x, y, sx, sy, hs) {
    vlauf(c, sx, sy + 2, K, 14, '#2c2548', '#1a1530'); r(c, sx, sy + 2, K, 1.2, '#5a4a8a'); r(c, sx, sy + 15, K, 1, P.neonPink);
    var k = x - 7;
    if (k === 0 || k === 3) { kreis(c, sx + 8, sy + 9, 5.4, '#0e0a1e', '#4a3d72', 0.6); kreis(c, sx + 8, sy + 9, 3.6, '#1c1630'); kreis(c, sx + 8, sy + 9, 1.1, P.neonPink); r(c, sx + 13, sy + 5, 1, 7, '#c9c3d6'); }
    else { rr(c, sx + 2, sy + 5, 12, 8, '#1c1630', 1.4, '#4a3d72', 0.6); for (var i = 0; i < 4; i++) { r(c, sx + 3.4 + i * 2.8, sy + 6, 0.8, 5, '#4a3d72'); kreis(c, sx + 3.8 + i * 2.8, sy + 7 + (i % 2) * 2.6, 0.9, TANZ_FARBEN[i]); } }
  }
  function jukebox(c, sx, sy) {
    ellipse(c, sx + 8, sy + 15.2, 7, 1.6, 'rgba(40,20,40,0.28)');
    c.beginPath(); c.moveTo(sx + 1.8, sy + 15.6); c.lineTo(sx + 1.8, sy + 5); c.arc(sx + 8, sy + 5, 6.2, Math.PI, 0); c.lineTo(sx + 14.2, sy + 15.6); c.closePath();
    var gr = c.createLinearGradient(sx, sy, sx + K, sy); gr.addColorStop(0, '#b02a3a'); gr.addColorStop(0.5, '#e0504a'); gr.addColorStop(1, '#b02a3a'); c.fillStyle = gr; c.fill();
    c.lineWidth = 0.9; c.strokeStyle = '#4a1a24'; c.stroke();
    c.beginPath(); c.arc(sx + 8, sy + 5.5, 4.4, Math.PI, 0); c.lineTo(sx + 12.4, sy + 8.8); c.lineTo(sx + 3.6, sy + 8.8); c.closePath(); c.fillStyle = '#ffe9a8'; c.fill();
    c.beginPath(); c.arc(sx + 8, sy + 5.5, 5.4, Math.PI, 0); c.strokeStyle = P.neonCyan; c.lineWidth = 0.9; c.stroke();
    rr(c, sx + 4.4, sy + 10.2, 7.2, 2.4, '#fff8ee', 0.8); r(c, sx + 5, sy + 13.2, 6, 0.8, P.neonCyan); kreis(c, sx + 8, sy + 6.4, 1.6, '#c9a64a');
  }
  function pflanze(c, sx, sy, hs, t) {
    var wipp = t != null ? Math.sin(t * 1.3 + (hs % 7)) * 0.8 : 0;
    ellipse(c, sx + 8, sy + 15.4, 5, 1.4, 'rgba(40,20,40,0.25)');
    poly(c, [[sx + 4.6, sy + 9.6], [sx + 11.4, sy + 9.6], [sx + 10.4, sy + 15.6], [sx + 5.6, sy + 15.6]], '#e28a62', '#9a4a32', 0.7); r(c, sx + 4.2, sy + 9.2, 7.6, 1.6, '#f0a07a');
    var blaetter = [[-5.6, -2.6, -40], [5.6, -2.8, 40], [0, -7, 0], [-3, -5, -20], [3.4, -5.4, 22]];
    blaetter.forEach(function (b, i) {
      c.save(); c.translate(sx + 8 + b[0] * 0.2 + wipp, sy + 9.4); c.rotate((b[2] + wipp * 4) * Math.PI / 180); c.scale(1.7, 5.4 + (i % 2));
      c.beginPath(); c.arc(0, -1, 1, 0, Math.PI * 2); c.restore(); c.fillStyle = i % 2 ? '#4f9a5a' : '#68b872'; c.fill();
    });
    if (hs % 2) kreis(c, sx + 11 + wipp, sy + 2.4, 1, '#ff8fb4');
  }
  function kueche(c, karte, x, y, sx, sy, hs) {
    vlauf(c, sx, sy + 2, K, 14, '#eef2f8', '#cfd6e4'); r(c, sx, sy + 2, K, 1.4, '#fff'); r(c, sx, sy + 15, K, 1, P.konturStein);
    rr(c, sx + 1, sy + 4.4, 14, 8, '#aab4c8', 1.4); r(c, sx + 1.4, sy + 4.8, 13.2, 1, 'rgba(255,255,255,0.5)');
    kreis(c, sx + 5, sy + 8.6, 2.6, '#3a3a48', '#8a8a98', 0.5); kreis(c, sx + 11.4, sy + 8.6, 2.6, '#3a3a48', '#8a8a98', 0.5);
    if (hs % 2) { kreis(c, sx + 5, sy + 8.6, 2, '#8a8a98'); kreis(c, sx + 5, sy + 8.2, 1.8, '#b8c0d0'); r(c, sx + 5, sy + 6.4, 0.8, 2, '#4a3560'); }
    else { rr(c, sx + 8.6, sy + 6.2, 5.6, 4.6, '#7a7a88', 1.4, '#4a4a58', 0.5); }
  }
  function kicker(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, n = nbT(karte, x, y, T.KICKER), l = !n[0], rt = !n[1];
    var x0 = sx + (l ? 0.8 : 0), x1 = sx + K - (rt ? 0.8 : 0);
    r(c, sx, sy + 14, K, 2, 'rgba(40,20,40,0.2)');
    rr(c, x0, sy + 3.4, x1 - x0, 11, '#6a4028', 1.8, '#3a2018', 0.7);
    vlauf(c, x0 + 1.4, sy + 5, x1 - x0 - 2.8, 8, '#4fb06a', '#3c9a58');
    r(c, x0 + 1.4, sy + 8.6, x1 - x0 - 2.8, 0.5, 'rgba(255,255,255,0.55)');
    if (l) r(c, x0 + 1.4, sy + 6.6, 0.5, 4.2, 'rgba(255,255,255,0.45)');
    if (rt) r(c, x1 - 1.9, sy + 6.6, 0.5, 4.2, 'rgba(255,255,255,0.45)');
    for (var i = 0; i < 2; i++) {
      var rx = sx + 3.5 + i * 8, rot = (x + i) % 2;
      r(c, rx, sy + 1.4, 0.9, 13, '#c9c3d6'); rr(c, rx - 1.2, sy + 0.2, 3.3, 2.4, rot ? '#e0504a' : '#4a7ad8', 1);
      rr(c, rx - 1.2, sy + 5.6, 3.3, 3, rot ? '#e0504a' : '#4a7ad8', 0.8); rr(c, rx - 1.2, sy + 10, 3.3, 3, rot ? '#e0504a' : '#4a7ad8', 0.8);
    }
  }
  function teppich(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, n = nbT(karte, x, y, T.TEPPICH), hotel = karte.id === 'hotel';
    var a = hotel ? '#a8465c' : '#3f7a54', b = hotel ? '#c96d82' : '#5a9a6e', gold = hotel ? '#e8c46a' : '#e0c890';
    r(c, sx, sy, K, K, a);
    var kx = n[0] ? sx - 1 : sx + 2.5, ky = n[2] ? sy - 1 : sy + 2.5, kx2 = n[1] ? sx + K + 1 : sx + K - 2.5, ky2 = n[3] ? sy + K + 1 : sy + K - 2.5;
    c.save(); c.beginPath(); c.rect(sx, sy, K, K); c.clip();
    c.lineWidth = 0.7; c.strokeStyle = gold; c.strokeRect(kx, ky, kx2 - kx, ky2 - ky);
    r(c, kx + 1.2, ky + 1.2, kx2 - kx - 2.4, ky2 - ky - 2.4, b);
    var cx = sx + 8, cy = sy + 8;
    poly(c, [[cx, cy - 4], [cx + 4, cy], [cx, cy + 4], [cx - 4, cy]], a); poly(c, [[cx, cy - 2], [cx + 2, cy], [cx, cy + 2], [cx - 2, cy]], gold);
    c.restore();
    if (!n[2]) r(c, sx, sy, K, 0.6, 'rgba(0,0,0,0.2)');
    if (!n[3]) for (var i = 0; i < 8; i++) r(c, sx + 1 + i * 2, sy + K - 0.2, 0.7, 1.4, gold);
  }
  function terrasse(c, karte, x, y, sx, sy, hs) {
    for (var i = 0; i < 4; i++) { r(c, sx, sy + i * 4, K, 4, hash(x, y * 4 + i) % 2 ? '#d9b98c' : '#cfae7e'); r(c, sx, sy + i * 4 + 3.4, K, 0.6, 'rgba(90,60,30,0.4)'); r(c, sx + ((hash(x, y + i) % 14) + 1), sy + i * 4, 0.5, 4, 'rgba(90,60,30,0.3)'); }
    if (hs % 4 === 0) { kreis(c, sx + 8, sy + 8, 1.2, '#ffe8a0'); G.glanz(c, sx + 8, sy + 8, 6, 'rgba(255,232,160,0.5)', 'rgba(255,232,160,0)'); }
  }
  function tanz(c, karte, x, y, sx, sy) {
    var fl = (x + y) % 2 === 0;
    vlauf(c, sx, sy, K, K, fl ? '#3a3166' : '#2d2652', fl ? '#2d2652' : '#241e44');
    r(c, sx, sy, K, 0.7, 'rgba(200,190,255,0.28)'); r(c, sx, sy, 0.7, K, 'rgba(200,190,255,0.16)');
    r(c, sx, sy + K - 0.5, K, 0.5, 'rgba(0,0,0,0.3)');
  }
  function ausgang(c, karte, x, y, sx, sy) {
    var links = karte.ausgangX === x;
    r(c, sx, sy, K, K, '#4a2f27');
    rr(c, sx + (links ? 1 : -1), sy + 1.5, K + 0 + (links ? 0 : 1), K - 1.5, '#c98b5e', 1.4, '#5a3328', 0.8);
    rr(c, sx + (links ? 3 : 1.6), sy + 3, links ? 11 : 11, 11, '#b87a50', 1.4); r(c, sx + (links ? 3 : 1.6), sy + 7, 11, 0.6, 'rgba(60,30,20,0.4)');
    kreis(c, links ? sx + 13.4 : sx + 2.6, sy + 8.4, 0.9, P.gold);
    rr(c, sx + 1, sy + 0.2, 14, 8, '#1f7a42', 1.4, '#0e4a26', 0.6); textInBox(c, 'EXIT', sx + 1, sy + 0.4, 14, 7.6, 9, { col: '#eaffe8', ausr: 'center', min: 6 });
  }
  function bodenGeraet(c, karte, t, x, y, sx, sy) {
    var T = Saufi.Karte.T, hs = hash(x, y);
    if (t === T.TRESEN) tresen(c, karte, x, y, sx, sy, hs);
    else if (t === T.TISCH) tisch(c, karte, x, y, sx, sy, hs);
    else if (t === T.SOFA) sofa(c, karte, x, y, sx, sy);
    else if (t === T.BUFFET) buffet(c, karte, x, y, sx, sy, hs);
    else if (t === T.SPENDER) spender(c, sx, sy);
    else if (t === T.DJ) dj(c, karte, x, y, sx, sy, hs);
    else if (t === T.JUKEBOX) jukebox(c, sx, sy);
    else if (t === T.PFLANZE) pflanze(c, sx, sy, hs);
    else if (t === T.KUECHE) kueche(c, karte, x, y, sx, sy, hs);
    else if (t === T.KICKER) kicker(c, karte, x, y, sx, sy);
    else if (t === T.TEPPICH) teppich(c, karte, x, y, sx, sy);
    else if (t === T.TERRASSE) terrasse(c, karte, x, y, sx, sy, hs);
    else if (t === T.TANZ) tanz(c, karte, x, y, sx, sy);
    else if (t === T.AUSGANG) ausgang(c, karte, x, y, sx, sy);
  }

  function zeichneInnenKachel(c, karte, x, y, sx, sy) {
    var T = Saufi.Karte.T, t = karte.tile(x, y);
    if (t === T.WAND) { wand(c, karte, x, y, sx, sy); return; }
    // Unterboden: Teppich/Terrasse/Tanz/Ausgang malen sich selbst, alles andere steht auf dem Raumboden
    boden(c, karte.id, x, y, sx, sy);
    if (t !== T.BODEN) bodenGeraet(c, karte, t, x, y, sx, sy);
  }

  // ---------- Wanddeko (nach den Kacheln, nur Reihen 0 und 1) ----------
  function bilderRahmen(c, x, y, w, h, motiv) {
    rr(c, x - 1.6, y - 1.6, w + 3.2, h + 3.2, '#c9a64a', 1.4, '#7a5a20', 0.6);
    vlauf(c, x, y, w, h, motiv === 0 ? '#9fd4f0' : '#f3d9a8', motiv === 0 ? '#e8f7ff' : '#e0a870');
    if (motiv === 0) { poly(c, [[x, y + h], [x + w * 0.35, y + h * 0.4], [x + w * 0.6, y + h * 0.7], [x + w * 0.8, y + h * 0.45], [x + w, y + h]], '#7dbb78'); kreis(c, x + w * 0.78, y + h * 0.25, 1.6, '#ffe58a'); }
    else { kreis(c, x + w / 2, y + h * 0.4, 3, '#e8b9a0'); poly(c, [[x + 1, y + h], [x + w / 2, y + h * 0.65], [x + w - 1, y + h]], '#b8566a'); }
  }
  function uhrWand(c, cx, cy, rad, t) {
    kreis(c, cx, cy, rad, '#fff8ee', '#4a3560', 0.9);
    // Zeiger: t in Sekunden → Stunden/Minuten (Demo-Lauf)
    var sek = (t || 0) % 60, min = ((t || 0) / 60) % 60, std = ((t || 0) / 3600) % 12;
    var aMin = (min / 60) * Math.PI * 2 - Math.PI / 2, aStd = ((std + min / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    linie(c, cx, cy, cx + Math.cos(aStd) * rad * 0.45, cy + Math.sin(aStd) * rad * 0.45, '#4a3560', 1.0);
    linie(c, cx, cy, cx + Math.cos(aMin) * rad * 0.7, cy + Math.sin(aMin) * rad * 0.7, '#4a3560', 0.8);
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; kreis(c, cx + Math.cos(a) * rad * 0.82, cy + Math.sin(a) * rad * 0.82, 0.3, '#4a3560'); }
  }
  function flaschenRegal(c, x, y, w, anzahl) {
    rr(c, x, y + 11, w, 2, '#5a3328', 0.6); rr(c, x, y + 4.5, w, 1.6, '#5a3328', 0.6);
    for (var i = 0; i < anzahl; i++) {
      var bx = x + 2 + i * ((w - 4) / anzahl), farben = ['#4fa86a', '#e0504a', '#ffc233', '#4a7ad8', '#c98b5e', '#a86bff'];
      rr(c, bx, y + 11 - 7, 2.8, 7, farben[i % 6], 1, 'rgba(0,0,0,0.3)', 0.4); r(c, bx + 0.9, y + 11 - 9, 1, 2.4, farben[i % 6]);
      rr(c, bx + 1, y + 4.5 - 6, 2.6, 6, farben[(i + 3) % 6], 1, 'rgba(0,0,0,0.3)', 0.4); r(c, bx + 1.8, y + 4.5 - 8, 1, 2.4, farben[(i + 3) % 6]);
    }
  }
  function zielscheibe(c, cx, cy, rad) {
    kreis(c, cx, cy, rad + 1.4, '#2a2230'); kreis(c, cx, cy, rad, '#f3ead0', '#111', 0.5);
    var ring = [[0.8, '#e0504a'], [0.62, '#f3ead0'], [0.46, '#2f9a5a'], [0.28, '#f3ead0'], [0.18, '#e0504a']];
    ring.forEach(function (q) { kreis(c, cx, cy, rad * q[0], q[1]); });
    kreis(c, cx, cy, rad * 0.08, '#111');
    linie(c, cx + 2, cy - 1, cx + 5, cy - 4, '#c9c3d6', 0.7); kreis(c, cx + 5.4, cy - 4.4, 0.9, '#e0504a');
  }

  function wandDeko(c, karte) {
    var id = karte.id, i, w = karte.pxW;
    if (id === 'hotel') {
      rr(c, 2 * K + 2, 8, 4 * K - 4, 14, '#5a3a28', 1.6, '#2e1c14', 0.6);               // Schluesselbrett
      for (i = 0; i < 8; i++) { kreis(c, 2 * K + 7 + i * 6.8, 13, 0.7, '#e8c46a'); r(c, 2 * K + 6.6 + i * 6.8, 14, 0.8, 4, '#e8c46a'); kreis(c, 2 * K + 7 + i * 6.8, 19, 1, i % 3 ? '#c9a64a' : '#e0504a'); }
      rr(c, 2 * K + 8, 1.2, 48, 10, '#c9a64a', 1.6); textInBox(c, 'REZEPTION', 2 * K + 10, 1.4, 44, 9.2, 9, { col: '#4a2f12', ausr: 'center', min: 6 });
      bilderRahmen(c, 6 * K + 4, 8, 12, 9, 0); bilderRahmen(c, 13 * K + 3, 8, 9, 11, 1);
      uhrWand(c, 8 * K + 8, 9, 5);
      rr(c, 9 * K + 4, 2, 3 * K + 10, 12, '#f6efe0', 1.6, '#8a5a3a', 0.7); textInBox(c, 'FRÜHSTÜCK', 9 * K + 6, 3, 3 * K + 6, 10, 9, { col: '#6a3f2a', ausr: 'center', min: 6 });
      rr(c, 14 * K, 1.5, 14, 10, '#4fb0d6', 1.2); textInBox(c, 'H2O', 14 * K, 2, 14, 9, 9, { col: '#fff', ausr: 'center', min: 6 });
      rr(c, 6 * K + 2, 18.5, 26, 9, '#1a1530', 1.4, '#ffe9a8', 0.7); textInBox(c, '♩ JAZ', 6 * K + 3, 19, 24, 8, 7, { col: '#ffe9a8', ausr: 'center', min: 5 });   // freie Wand unter dem Bilderrahmen, zuletzt gezeichnet
    } else if (id === 'restaurant') {
      flaschenRegal(c, 2 * K + 2, 12, 5 * K - 4, 9);
      rr(c, 8 * K + 2, 2, 2 * K - 4, 24, '#2f3a34', 1.6, '#8a5a3a', 1); textInBox(c, 'KARTE', 8 * K + 3, 3, 2 * K - 6, 10, 9, { col: '#fff8ee', ausr: 'center', min: 6 });
      textInBox(c, 'Spätzle!', 8 * K + 3, 13, 2 * K - 6, 10, 9, { col: '#ffe9a8', ausr: 'center', min: 6 });
      ['Maultaschen', 'Spätzle', 'Zwiebelrostbraten'].forEach(function (s, k) { linie(c, 8 * K + 8, 11 + k * 4.4, 10 * K - 8, 11 + k * 4.4, 'rgba(255,248,238,' + (0.8 - k * 0.1) + ')', 0.7); });
      for (i = 0; i < 5; i++) {                                                              // Pfannen und Toepfe in der Kueche
        var px = 10 * K + 6 + i * 12.5, pr = i % 2 ? 3.4 : 4.4;
        r(c, px - 0.4, 8, 0.8, 4, '#4a3560'); kreis(c, px, 14, pr, i % 2 ? '#c98b5e' : '#8a8a98', '#4a3560', 0.6); kreis(c, px, 14, pr * 0.6, 'rgba(255,255,255,0.18)');
      }
      poly(c, [[7 * K + 5, 11], [7 * K + 8, 3], [7 * K + 11, 11]], '#6a4a38');            // Geweih-Ersatz: Bierfahne
      uhrWand(c, 7 * K + 8, 10, 4.4);
    } else if (id === 'kneipe') {
      rr(c, 2 * K + 3, 2, 8 * K - 6, 22, '#2f1c15', 2, '#8a5a3a', 1);                   // Spiegelregal
      vlauf(c, 2 * K + 5, 4, 8 * K - 10, 18, 'rgba(180,200,220,0.45)', 'rgba(120,140,170,0.3)');
      flaschenRegal(c, 2 * K + 4, 8, 8 * K - 8, 18);
      zielscheibe(c, 10.5 * K, 14, 8);
      rr(c, 11.7 * K, 2, 1.5 * K, 12, '#2a2342', 1.4, P.neonGelb, 0.8); textInBox(c, 'BIER', 11.7 * K + 1, 3, 1.5 * K - 2, 10, 9, { col: P.neonGelb, ausr: 'center', min: 6 });
      for (i = 0; i < 10; i++) {                                                           // Wimpelkette
        var wx = 6 + i * 20; poly(c, [[wx, 0], [wx + 7, 0], [wx + 3.5, 6]], ['#e0504a', '#ffc233', '#4fa86a', '#4a7ad8'][i % 4]);
      }
      rr(c, 0.9 * K, 6, 12, 15, '#3a2a30', 1, '#c9a64a', 0.8); r(c, 0.9 * K + 2, 8, 8, 2.5, '#e0504a'); r(c, 0.9 * K + 2, 12, 8, 2.5, '#fff8ee'); r(c, 0.9 * K + 2, 16, 8, 2.5, '#e0504a');   // Schal im Rahmen
    } else if (id === 'disko') {
      rr(c, 6 * K + 4, 3, 6 * K - 8, 22, '#0e0a1e', 2, '#4a3d72', 0.9);                  // Videowand
      var gr = c.createLinearGradient(6 * K + 6, 0, 12 * K - 6, 0); gr.addColorStop(0, P.neonPink); gr.addColorStop(0.5, P.neonLila); gr.addColorStop(1, P.neonCyan);
      c.globalAlpha = 0.55; c.fillStyle = gr; c.fillRect(6 * K + 6, 5, 6 * K - 12, 18); c.globalAlpha = 1;
      textInBox(c, 'UNTERGRUND 07', 6 * K + 8, 8, 6 * K - 16, 12, 10, { col: '#fff8ee', ausr: 'center', kontur: 'rgba(20,10,50,0.8)', min: 6 });
      [1.1 * K, 15.6 * K].forEach(function (lx) {                                         // Lautsprecher
        rr(c, lx - 5.5, 3, 11, 26, '#1a1530', 2, '#0e0a1e', 0.6); kreis(c, lx, 10, 3.8, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx, 10, 1.4, '#5a4a8a'); kreis(c, lx, 21, 3, '#2c2548', '#0e0a1e', 0.5); kreis(c, lx, 21, 1.1, '#5a4a8a');
      });
      for (i = 0; i < 4; i++) { r(c, 2.4 * K + i * 3.2 * K, 29.4, 1.6 * K, 1.2, TANZ_FARBEN[i]); }
      r(c, 0, 0, w, 1.4, '#14102a');
    }
  }

  // ---------- Bewegtes ----------
  // Fenster innen nachts: dunkler Himmel mit Sternen (passt zu wand(): Fenster bei x % 4 === 2)
  function innenFensterNacht(c, karte, nacht, cx, cy) {
    if (karte.id === 'disko' || nacht <= 0.02) return;
    for (var x = 2; x < karte.w - 1; x += 4) {
      var fx = x * K - cx + 2.5, fy = 3 - cy;
      c.globalAlpha = Math.min(0.92, nacht); vlauf(c, fx, fy, 11, 10, '#14183c', '#2a2a5e'); c.globalAlpha = 1;
      if (nacht > 0.5) { r(c, fx + 2, fy + 2, 0.8, 0.8, '#fff'); r(c, fx + 7, fy + 5, 0.8, 0.8, '#fff'); r(c, fx + 5, fy + 1.4, 0.6, 0.6, '#fff'); }
      r(c, fx + 5.2, fy, 0.7, 10, '#fff8ee'); r(c, fx, fy + 4.5, 11, 0.7, '#fff8ee');
    }
  }

  // Tanzflaeche: farbige Platten im Takt
  function tanzFlaeche(c, S, cx, cy, beat, ph, boost) {
    var karte = S.karte, T = Saufi.Karte.T;
    for (var y = 4; y < 8; y++) for (var x = 4; x < 14; x++) {
      if (karte.tile(x, y) !== T.TANZ) continue;
      var f = TANZ_FARBEN[(x + y + beat + (boost ? beat : 0)) % 4], pul = 0.30 + (1 - ph) * 0.35, px = x * K - cx, py = y * K - cy;
      c.globalAlpha = Math.min(1, pul * (boost ? 1.3 : 1)); rr(c, px + 0.8, py + 0.8, K - 1.6, K - 1.6, f, 1.6);
      c.globalAlpha = Math.min(1, pul * 0.5); G.glanz(c, px + 8, py + 8, 11, f, 'rgba(0,0,0,0)'); c.globalAlpha = 1;
    }
  }

  // Strahler, Discokugel mit Lichtpunkten, DJ-Equalizer und Nebel (additiv, nach der Toenung)
  function diskoLichter(c, S, cx, cy) {
    var t = S.t, K2 = K, boost = S.boostAktiv, ph = (t / Saufi.Ton.BEAT) % 1, i, k;
    // 2–3 langsam rotierende Spots, Alpha ≤ 0.25, kein reinweisser Kern
    for (i = 0; i < 3; i++) {
      var ang = t * 0.35 + i * 2.1, bx = 9 * K2 - cx + Math.cos(ang) * 20, by = 3.2 * K2 - cy;
      var farbe = TANZ_FARBEN[i % 4], reach = 70 + i * 8;
      var gr = c.createRadialGradient(bx, by, 2, bx + Math.sin(ang) * 30, by + reach, reach);
      gr.addColorStop(0, farbe); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = Math.min(0.25, 0.18 + (1 - ph) * 0.07) * (boost ? 1.2 : 1); c.fillStyle = gr;
      c.beginPath(); c.moveTo(bx - 2, by); c.lineTo(bx + 2, by);
      c.lineTo(bx + Math.sin(ang) * 40 + 28, by + reach); c.lineTo(bx + Math.sin(ang) * 40 - 28, by + reach); c.closePath(); c.fill();
    }
    // Discokugel ueber der Tanzflaeche
    var kx = 9 * K2 - cx, ky = 3.6 * K2 - cy;
    c.globalAlpha = 1; r(c, kx - 0.4, ky - 12, 0.8, 12, '#8a8296');
    kreis(c, kx, ky, 5.2, '#c9c3d6'); kreis(c, kx - 1.4, ky - 1.4, 2.6, '#f4f1ff');
    for (k = 0; k < 8; k++) { var a2 = k * 0.785 + t * 1.4; c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 7 + k); kreis(c, kx + Math.cos(a2) * 3.4, ky + Math.sin(a2) * 3.4 * 0.8, 0.7, '#ffffff'); }
    c.globalAlpha = 1;
    for (k = 0; k < 16; k++) {                                         // wandernde Lichtpunkte auf Boden und Waenden
      var ang = k * 0.3927 + t * 0.7, rad = 36 + (k % 4) * 15, lx = kx + Math.cos(ang) * rad, ly = ky + 30 + Math.sin(ang) * rad * 0.55;
      c.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + k * 1.3)) * (boost ? 1.4 : 1);
      kreis(c, lx, ly, 1.5 + (k % 3) * 0.4, TANZ_FARBEN[(k + Math.floor(t * 2)) % 4]);
    }
    c.globalAlpha = 1;
    // DJ-Equalizer und Pult-Glimmen
    for (i = 0; i < 12; i++) {
      var hh = 1.5 + (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7 + (boost ? 3 : 0))) * (3 + (1 - ph) * 3.6);
      c.globalAlpha = 0.9; r(c, 7 * K2 - cx + 2 + i * 4.9, 2 * K2 - cy + 3 - hh, 3, hh, TANZ_FARBEN[i % 4]);
    }
    c.globalAlpha = 0.85; r(c, 7 * K2 - cx + 2, 2 * K2 - cy + 15, 4 * K2 - 4, 1.2, TANZ_FARBEN[Math.floor(t * 4) % 4]);
    // Nebel: weiche, langsam ziehende Schwaden ueber dem Boden
    for (i = 0; i < 7; i++) {
      var nx = ((i * 53 + t * (6 + i)) % (S.karte.pxW + 80)) - 40 - cx, ny = (7 + (i % 3) * 1.5) * K2 - cy + Math.sin(t * 0.6 + i) * 4;
      c.globalAlpha = (0.10 + 0.05 * Math.sin(t + i)) * (boost ? 1.5 : 1);
      G.glanz(c, nx, ny, 46, 'rgba(210,200,255,1)', 'rgba(210,200,255,0)');
    }
    // Laser bei Boost
    if (boost) {
      c.globalAlpha = 0.5; c.lineWidth = 0.8;
      for (i = 0; i < 6; i++) { var la = Math.sin(t * 2 + i) * 0.7; c.strokeStyle = TANZ_FARBEN[i % 4]; c.beginPath(); c.moveTo(9 * K2 - cx, 2.4 * K2 - cy); c.lineTo(9 * K2 - cx + Math.sin(la) * 150, 2.4 * K2 - cy + Math.cos(la) * 150); c.stroke(); }
    }
    c.globalAlpha = 1;
  }

  // Warmes Raumlicht: Lampen-Inseln mit Flackern, Kneipen-Jukebox/Bierfass-Glanz
  function raumLichter(c, S, cx, cy) {
    var karte = S.karte, l = S.licht, t = S.t, i;
    for (i = 0; i < karte.w; i += 5) {
      var lx = i * K + 10 - cx, ly = 3 * K - cy;
      var flack = 1 + Math.sin(t * 3.1 + hash(i, 9) * 0.01) * 0.04;
      var gr = c.createRadialGradient(lx, ly, 2, lx, ly, 50); gr.addColorStop(0, 'rgba(255,214,130,' + (0.35 * flack).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,214,130,0)');
      c.globalAlpha = Math.min(1, (0.7 + 0.3 * l.glut) * flack); c.fillStyle = gr; c.fillRect(lx - 52, ly - 52, 104, 104);
    }
    if (karte.id === 'kneipe') {
      var jx = 12.5 * K - cx, jy = 3 * K - cy, farbe = TANZ_FARBEN[Math.floor(t * 3) % 4];
      c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); G.glanz(c, jx, jy, 26, farbe, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.3; r(c, 12 * K - cx + 4, 3 * K - cy - 0.5, 8, 1, farbe);
      // Bierfass-Glanz am Tresen
      var fx = 5 * K - cx + 8, fy = 4 * K - cy + 6;
      c.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2.2); G.glanz(c, fx, fy, 12, 'rgba(255,220,140,0.7)', 'rgba(255,220,140,0)');
      c.globalAlpha = 0.35; r(c, fx - 2, fy - 4, 1.2, 6, 'rgba(255,248,220,0.7)');
    }
    c.globalAlpha = 1;
  }

  // Laufzeit-Overlay Hotel: Uhrzeiger + Pflanzen-Wippen (nicht im HG-Cache)
  function hotelAnim(c, S, cx, cy) {
    var t = S.t;
    uhrWand(c, 8 * K + 8 - cx, 9 - cy, 5, t * 40);
    var T = Saufi.Karte.T, karte = S.karte;
    for (var y = 0; y < karte.h; y++) for (var x = 0; x < karte.w; x++) {
      if (karte.tile(x, y) !== T.PFLANZE) continue;
      pflanze(c, x * K - cx, y * K - cy, hash(x, y), t);
    }
  }

  Saufi.Innen = {
    TANZ_FARBEN: TANZ_FARBEN, zeichneInnenKachel: zeichneInnenKachel, wandDeko: wandDeko, innenFensterNacht: innenFensterNacht,
    tanzFlaeche: tanzFlaeche, diskoLichter: diskoLichter, raumLichter: raumLichter, hotelAnim: hotelAnim
  };
})(globalThis);
