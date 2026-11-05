/* Hauptfigur: Bewegung mit Kollision, Verzoegerung und Schlingern je nach Pegel. Position in Pixeln (Fuesse, Mitte). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16, SPEED = 56, FEST_SEK = 1.5, FEST_MIN_V = 2;

  function erstelle(tx, ty) {
    return { x: tx * K + K / 2, y: ty * K + K / 2, dir: 'unten', vx: 0, vy: 0, anim: 0, schritt: 0, laeuft: false, sitzt: false, tanzt: 0, isst: 0, essenId: null, liegt: false, festSek: 0, letztPos: null };
  }
  function setzeKachel(sp, tx, ty) { sp.x = tx * K + K / 2; sp.y = ty * K + K / 2; sp.vx = 0; sp.vy = 0; sp.laeuft = false; }
  function kachelX(sp) { return Math.floor(sp.x / K); }
  function kachelY(sp) { return Math.floor((sp.y - 1) / K); }

  // Kollisionsbox an den Fuessen: 8 breit, 5 hoch (Standard) bzw. w×h
  function kollidiertBox(karte, x, y, hw, hh) {
    hw = hw == null ? 4 : hw; hh = hh == null ? 5 : hh;
    var x0 = Math.floor((x - hw) / K), x1 = Math.floor((x + hw - 0.01) / K), y0 = Math.floor((y - hh) / K), y1 = Math.floor((y - 0.01) / K);
    for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) if (karte.blockiert(i, j)) return true;
    return false;
  }
  function kollidiert(karte, x, y) { return kollidiertBox(karte, x, y, 4, 5); }

  // Naechste freie Kachel mit mindestens 2 freien Nachbarn (Befreiung aus Engstellen)
  function freieKachel(karte, sp) {
    var tx = kachelX(sp), ty = kachelY(sp);
    var DX = [0, 1, -1, 0, 0, 1, -1, 1, -1], DY = [0, 0, 0, 1, -1, 1, 1, -1, -1];
    var best = null, bd = 1e9;
    for (var r = 0; r <= 6; r++) {
      for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        var x = tx + i, y = ty + j;
        if (karte.blockiert(x, y)) continue;
        var frei = 0;
        for (var d = 1; d <= 4; d++) if (!karte.blockiert(x + DX[d], y + DY[d])) frei++;
        if (frei < 2) continue;
        var dist = Math.hypot(x + 0.5 - sp.x / K, y + 0.5 - sp.y / K);
        if (dist < bd) { bd = dist; best = { x: x, y: y }; }
      }
      if (best) return best;
    }
    return { x: tx, y: ty };
  }

  // achse: { x, y } -1..1. faktor: Bewegungsfaktor (Boost, satt, schwammig). t: Echtzeit-Sekunden (fuer das Schlingern).
  function bewegung(sp, achse, pegel, dt, t, faktor, karte) {
    var st = Saufi.Pegel.schwelle(pegel), ax = achse.x, ay = achse.y, laenge = Math.hypot(ax, ay);
    var v = SPEED * (faktor || 1);
    var zx = ax * v, zy = ay * v;
    if (laenge > 0.05 && (st === 'wackelig' || st === 'kritisch')) {
      var amp = st === 'wackelig' ? 0.30 : 0.55, w = Math.sin(t * 2.3) + 0.5 * Math.sin(t * 5.1);
      zx += (-ay) * w * amp * v; zy += ax * w * amp * v;
    }
    var rate = st === 'klar' ? 30 : (st === 'locker' ? 7 : 5);       // locker: leicht verzoegert
    var a = Math.min(1, rate * dt);
    sp.vx += (zx - sp.vx) * a; sp.vy += (zy - sp.vy) * a;
    var nx = sp.x + sp.vx * dt, ny = sp.y + sp.vy * dt;
    if (!kollidiert(karte, nx, sp.y)) sp.x = nx; else sp.vx = 0;
    if (!kollidiert(karte, sp.x, ny)) sp.y = ny; else sp.vy = 0;
    sp.x = Math.max(4, Math.min(karte.pxW - 4, sp.x)); sp.y = Math.max(6, Math.min(karte.pxH, sp.y));
    sp.laeuft = Math.hypot(sp.vx, sp.vy) > 4;
    if (laenge > 0.1) sp.dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'rechts' : 'links') : (ay > 0 ? 'unten' : 'oben');
    if (sp.laeuft) { sp.anim += dt * 9; sp.schritt = Math.floor(sp.anim) % 4; } else { sp.schritt = 0; }
    return sp.laeuft;
  }

  // Stuck-Erkennung: Achse gedrueckt, kaum Bewegung → auf freieKachel setzen
  function festPruefen(st, sp, achse, dt) {
    if (!st || !sp || !st.karte) return false;
    if (sp.sitzt || sp.isst > 0 || sp.liegt || st.overlay || st.uebergang) { sp.festSek = 0; sp.letztPos = { x: sp.x, y: sp.y }; return false; }
    var laenge = Math.hypot(achse.x, achse.y);
    if (laenge <= 0.5) { sp.festSek = 0; sp.letztPos = { x: sp.x, y: sp.y }; return false; }
    var lp = sp.letztPos || { x: sp.x, y: sp.y };
    var v = Math.hypot(sp.x - lp.x, sp.y - lp.y) / Math.max(dt, 1e-6);
    sp.letztPos = { x: sp.x, y: sp.y };
    if (v >= FEST_MIN_V) { sp.festSek = 0; return false; }
    sp.festSek = (sp.festSek || 0) + dt;
    if (sp.festSek < FEST_SEK) return false;
    var fk = freieKachel(st.karte, sp);
    setzeKachel(sp, fk.x, fk.y);
    sp.vx = 0; sp.vy = 0; sp.festSek = 0;
    if (Saufi.Hinweise && st.hinweise) Saufi.Hinweise.zeige(st.hinweise, 'Wieder frei!', 1.5, 'info');
    return true;
  }

  Saufi.Spieler = {
    K: K, SPEED: SPEED, FEST_SEK: FEST_SEK, erstelle: erstelle, setzeKachel: setzeKachel, kachelX: kachelX, kachelY: kachelY,
    kollidiert: kollidiert, kollidiertBox: kollidiertBox, bewegung: bewegung, freieKachel: freieKachel, festPruefen: festPruefen
  };
})(globalThis);
