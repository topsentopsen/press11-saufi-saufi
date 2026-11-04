/* Hauptfigur: Bewegung mit Kollision, Verzoegerung und Schlingern je nach Pegel. Position in Pixeln (Fuesse, Mitte). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16, SPEED = 56;

  function erstelle(tx, ty) {
    return { x: tx * K + K / 2, y: ty * K + K / 2, dir: 'unten', vx: 0, vy: 0, anim: 0, schritt: 0, laeuft: false, sitzt: false, tanzt: 0, isst: 0, essenId: null, liegt: false };
  }
  function setzeKachel(sp, tx, ty) { sp.x = tx * K + K / 2; sp.y = ty * K + K / 2; sp.vx = 0; sp.vy = 0; sp.laeuft = false; }
  function kachelX(sp) { return Math.floor(sp.x / K); }
  function kachelY(sp) { return Math.floor((sp.y - 1) / K); }

  // Kollisionsbox an den Fuessen: 8 breit, 5 hoch
  function kollidiert(karte, x, y) {
    var x0 = Math.floor((x - 4) / K), x1 = Math.floor((x + 3.99) / K), y0 = Math.floor((y - 5) / K), y1 = Math.floor((y - 0.01) / K);
    for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) if (karte.blockiert(i, j)) return true;
    return false;
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

  Saufi.Spieler = { K: K, SPEED: SPEED, erstelle: erstelle, setzeKachel: setzeKachel, kachelX: kachelX, kachelY: kachelY, kollidiert: kollidiert, bewegung: bewegung };
})(globalThis);
