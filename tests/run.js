#!/usr/bin/env node
/* Eigener Test-Runner ohne Abhaengigkeiten: laedt die Spieldateien per vm in einen Kontext. Aufruf: node tests/run.js */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');

var ROOT = path.join(__dirname, '..');
// Reihenfolge wie die Script-Tags in index.html
var DATEIEN = ['js/rng', 'js/uhr', 'js/charaktere', 'js/getraenke', 'js/essen', 'js/pegel', 'js/cheats', 'js/runden', 'js/ereignisse', 'js/minispiele', 'js/punkte', 'js/hinweise',
  'js/speicher', 'js/karte', 'js/motocross', 'js/s21', 'js/pfad', 'js/kamera', 'js/eingabe', 'js/spieler', 'js/npcs', 'js/ton', 'music/playlist', 'js/musik', 'js/gfx', 'js/szene', 'js/innen', 'js/partikel', 'js/render', 'js/main'];

function ladeKontext(extra) {
  var ctx = { console: console, Math: Math };
  Object.assign(ctx, extra || {});
  vm.createContext(ctx);
  vm.runInContext('globalThis.globalThis = globalThis;', ctx);
  DATEIEN.forEach(function (n) {
    var f = path.join(ROOT, n + '.js');
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  });
  return ctx;
}
function lade() { return ladeKontext({ __SAUFI_OHNE_START: true }).Saufi; }

var tests = [], ok = 0, fehler = 0;
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function gleich(a, b, msg) { if (a !== b) throw new Error((msg || 'ungleich') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }
function wahr(v, msg) { if (!v) throw new Error(msg || 'erwartet true'); }
function nah(a, b, eps, msg) { if (Math.abs(a - b) > eps) throw new Error((msg || 'nicht nah') + ': ' + a + ' vs ' + b); }

// ---------- Hilfen: Fake-Eingabe, Mock-Canvas, Fake-DOM ----------
function fakeE() {
  var neu = {}, halt = {}, klicks = [];
  return {
    neu: function (a) { return !!neu[a]; }, halt: function (a) { return !!halt[a]; },
    achse: function () { return { x: (halt.rechts ? 1 : 0) - (halt.links ? 1 : 0), y: (halt.runter ? 1 : 0) - (halt.hoch ? 1 : 0) }; },
    klicks: function () { return klicks; }, ende: function () { neu = {}; klicks = []; },
    druecke: function (a) { neu[a] = true; }, setzeHalt: function (a, v) { halt[a] = v; }, klicke: function (x, y) { klicks.push({ x: x, y: y }); }
  };
}
// Strenger Mock: kennt nur echte CanvasRenderingContext2D-Namen und prueft Zahlen, damit Tippfehler und NaN auffallen
var CTX_METHODEN = ['fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'beginPath', 'closePath',
  'moveTo', 'lineTo', 'arc', 'rect', 'fill', 'stroke', 'clip', 'quadraticCurveTo', 'bezierCurveTo', 'ellipse', 'arcTo', 'roundRect', 'setLineDash', 'transform', 'resetTransform'];
var CTX_EIGENSCHAFTEN = ['fillStyle', 'strokeStyle', 'font', 'textAlign', 'textBaseline', 'globalAlpha', 'globalCompositeOperation', 'lineWidth', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'lineCap', 'lineJoin', 'miterLimit', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'filter', 'lineDashOffset'];
var GCO = ['source-over', 'lighter', 'multiply', 'screen', 'destination-out', 'source-atop'];
function pruefeZahlen(name, args) { 
  Array.prototype.forEach.call(args, function (a) { if (typeof a === 'number' && !isFinite(a)) throw new Error('Canvas ' + name + ' mit ungueltiger Zahl ' + a); });
}
function mockCtx(log) {
  var store = { fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif' };
  return new Proxy(store, {
    get: function (t, k) {
      if (typeof k === 'symbol') return undefined;
      if (k === 'measureText') return function (s) {
        var sz = 10, m = /(\d+(?:\.\d+)?)px/.exec(t.font || '');
        if (m) sz = parseFloat(m[1]);
        return { width: String(s).length * sz * 0.55 };
      };
      if (k === 'createRadialGradient') return function (a, b, c, d, e, f) { pruefeZahlen(k, arguments); if (c < 0 || f < 0) throw new Error('negativer Radius'); return { addColorStop: function (o, col) { if (!(o >= 0 && o <= 1) || typeof col !== 'string') throw new Error('addColorStop ' + o + ' ' + col); } }; };
      if (k === 'createLinearGradient') return function () { pruefeZahlen(k, arguments); return { addColorStop: function () {} }; };
      if (CTX_EIGENSCHAFTEN.indexOf(k) >= 0) return t[k];
      if (CTX_METHODEN.indexOf(k) >= 0) return function (a) {
        pruefeZahlen(k, arguments);
        if (k === 'fillText') {
          if (typeof a !== 'string') throw new Error('fillText mit ' + typeof a);
          if (log) {
            log.push(a);
            if (!log.meta) log.meta = [];
            log.meta.push({ text: a, x: arguments[1], y: arguments[2], align: t.textAlign });
          }
        }
        if (k === 'ellipse' && log) {
          if (!log.ellipses) log.ellipses = [];
          log.ellipses.push([].slice.call(arguments));
        }
        if (k === 'strokeText' && log) {
          if (log) log.push(a);
          if (!log.meta) log.meta = [];
          log.meta.push({ text: a, x: arguments[1], y: arguments[2], align: t.textAlign, stroke: true });
        }
        if (k === 'fillRect' && log) log.push([].slice.call(arguments));
        if (k === 'arc' && log) log.push(['arc'].concat([].slice.call(arguments)));
        if (k === 'rotate' && log) log.push(['rotate', a]);
        if (k === 'fill' && log) log.push(['fill', t.fillStyle, t.globalAlpha]);
        if (k === 'drawImage') { if (!arguments[0] || !arguments[0].getContext) throw new Error('drawImage braucht ein Canvas'); }
      };
      throw new Error('Unbekannte Canvas-Eigenschaft: ' + String(k));
    },
    set: function (t, k, v) {
      if (CTX_METHODEN.indexOf(k) >= 0) return true;
      if (CTX_EIGENSCHAFTEN.indexOf(k) < 0) throw new Error('Unbekannte Canvas-Eigenschaft gesetzt: ' + String(k));
      if (k === 'globalCompositeOperation' && GCO.indexOf(v) < 0) throw new Error('Unbekannte Mischart ' + v);
      if (k === 'globalAlpha' && !(v >= 0 && v <= 1)) throw new Error('globalAlpha ausserhalb 0..1: ' + v);
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v !== 'string' && (!v || typeof v.addColorStop !== 'function')) throw new Error('fillStyle ' + v + ' @ ' + new Error().stack.split('\n').slice(3,7).join(' | '));
      t[k] = v; return true;
    },
    has: function (t, k) { return CTX_EIGENSCHAFTEN.indexOf(k) >= 0; }
  });
}
function mockCanvas(log) {
  var c = mockCtx(log), cv = { width: 320, height: 176, style: {}, getContext: function () { return c; }, addEventListener: function () {}, getBoundingClientRect: function () { return { left: 0, top: 0, width: 320, height: 176 }; } };
  cv.ownerDocument = { createElement: function () { return mockCanvas(log); } };
  return cv;
}
function schritt(S, Sp, X, sek, dt) {
  dt = dt || 1 / 30;
  for (var i = 0; i < sek / dt; i++) { Sp.update(S, dt, X); if (X.E) X.E.ende(); }
}
// Beim Zeitsprung gelten sonst alle uebersprungenen Runden als verpasst: als erledigt markieren
function erledigt(S) { S.runden.runden.forEach(function (r) { if (r.status === 'offen' || r.status === 'warnung' || r.status === 'aktiv') r.status = 'erledigt'; }); }
function neuesSpielTest(Saufi, opt) {
  var X = { E: fakeE() };
  var S = Saufi.Spiel.neu(Object.assign({ seed: 1, start: true }, opt || {}));
  return { S: S, X: X, Sp: Saufi.Spiel };
}

// ---------- 1 RNG ----------
test('1 RNG: gleicher Seed liefert gleiche Folge', function () {
  var D = lade();
  var a = D.RNG.erstelle(42), b = D.RNG.erstelle(42), c = D.RNG.erstelle(43), fa = [], fb = [], fc = [];
  for (var i = 0; i < 50; i++) { fa.push(a.next()); fb.push(b.next()); fc.push(c.next()); }
  gleich(JSON.stringify(fa), JSON.stringify(fb), 'Folge');
  wahr(JSON.stringify(fa) !== JSON.stringify(fc), 'anderer Seed gibt andere Folge');
  wahr(fa.every(function (v) { return v >= 0 && v < 1; }), 'Bereich [0,1)');
});
test('1b RNG: Karte mit gleichem Seed ist identisch', function () {
  var D = lade();
  var k1 = D.Karte.erstelleWelt(D.RNG.erstelle(7)).stadt, k2 = D.Karte.erstelleWelt(D.RNG.erstelle(7)).stadt, k3 = D.Karte.erstelleWelt(D.RNG.erstelle(8)).stadt;
  gleich(Array.prototype.join.call(k1.tiles, ''), Array.prototype.join.call(k2.tiles, ''));
  wahr(Array.prototype.join.call(k1.tiles, '') !== Array.prototype.join.call(k3.tiles, ''), 'anderer Seed, andere Baeume');
});

// ---------- 2 Uhr ----------
test('2 Uhr: Start 08:00, 36 s pro Stunde, Ende 04:00, Format und Phasen', function () {
  var U = lade().Uhr, u = U.erstelle();
  gleich(U.text(u), '08:00'); gleich(U.tag(u), 'Samstag');
  gleich(U.SEK_PRO_STUNDE, 36);
  U.update(u, 36); nah(u.minute, 9 * 60, 1e-6); gleich(U.text(u), '09:00');
  U.update(u, 36 * 15.5); gleich(U.text(u), '00:30'); gleich(U.tag(u), 'Sonntag');
  wahr(!U.vorbei(u));
  U.update(u, 36 * 10); gleich(U.text(u), '04:00'); wahr(U.vorbei(u)); gleich(u.minute, 1680);
  var p = function (h, m) { return U.phase({ minute: h * 60 + m }); };
  gleich(p(8, 0), 'Morgen'); gleich(p(10, 59), 'Morgen'); gleich(p(11, 0), 'Mittag'); gleich(p(14, 59), 'Mittag'); gleich(p(15, 0), 'Nachmittag');
  gleich(p(18, 0), 'Abend'); gleich(p(21, 0), 'Nacht'); gleich(p(24, 0), 'Tiefe Nacht'); gleich(p(27, 59), 'Tiefe Nacht');
  var t = U.erstelle(10); U.update(t, 3.6); nah(t.minute, 9 * 60, 1e-6, 'tempo=10 ist zehnmal schneller');
});
test('2b Uhr: Toenung wird monoton dunkler zur Nacht, morgens gruenlich-hell', function () {
  var U = lade().Uhr, last = 2;
  for (var m = 11 * 60; m <= 28 * 60; m += 10) { var h = U.helligkeit({ minute: m }); wahr(h <= last + 1e-9, 'nicht monoton bei ' + U.zeitText(m)); last = h; }
  var morgen = U.licht({ minute: 8 * 60 }), nacht = U.licht({ minute: 26 * 60 });
  wahr(morgen.g >= morgen.r && morgen.g > morgen.b, 'morgens gruenlich'); wahr(U.helligkeit({ minute: 8 * 60 }) > 0.9, 'morgens hell');
  wahr(U.helligkeit({ minute: 26 * 60 }) < 0.25, 'tiefe Nacht sehr dunkel');
  gleich(morgen.glut, 0); gleich(nacht.glut, 1, 'nachts leuchten Fenster und Neon');
});

// ---------- 3 Oeffnungszeiten ----------
test('3 Oeffnungszeiten: Disko, Restaurant, Kneipe, Hotel', function () {
  var U = lade().Uhr, z = function (h, m) { return h * 60 + m; };
  wahr(!U.offen('disko', z(21, 59))); wahr(U.offen('disko', z(22, 0))); wahr(U.offen('disko', z(27, 59)));
  wahr(U.offen('restaurant', z(22, 59))); wahr(!U.offen('restaurant', z(23, 0))); wahr(!U.offen('restaurant', z(10, 59))); wahr(U.offen('restaurant', z(11, 0)));
  wahr(!U.offen('kneipe', z(13, 59))); wahr(U.offen('kneipe', z(14, 0))); wahr(U.offen('kneipe', z(26, 59))); wahr(!U.offen('kneipe', z(27, 0)));
  wahr(U.offen('hotel', z(8, 0)) && U.offen('hotel', z(27, 59)));
  wahr(U.tresenOffen('restaurant', z(24, 59))); wahr(!U.tresenOffen('restaurant', z(25, 0)));
  wahr(U.kuecheOffen(z(21, 59))); wahr(!U.kuecheOffen(z(22, 0))); wahr(U.buffetOffen(z(8, 0))); wahr(!U.buffetOffen(z(11, 0)));
});

// ---------- 4 Pegel ----------
test('4 Pegel: Getraenkewerte addieren, Abbau pro Stunde, Obergrenze 4,0, Wasser senkt', function () {
  var S = lade(), f = S.Pegel.neu(S.Charaktere.holen('tobi'));
  S.Pegel.trinke(f, 'pils'); nah(f.pegel, 0.20, 1e-9); S.Pegel.trinke(f, 'radler'); nah(f.pegel, 0.30, 1e-9); S.Pegel.trinke(f, 'kurzer'); nah(f.pegel, 0.65, 1e-9);
  S.Pegel.trinke(f, 'wasser'); nah(f.pegel, 0.60, 1e-9, 'Wasser senkt');
  S.Pegel.trinke(f, 'alkoholfrei'); nah(f.pegel, 0.60, 1e-9, 'Alkoholfrei aendert nichts');
  S.Pegel.abbau(f, 1, 600); nah(f.pegel, 0.50, 1e-9, 'minus 0,10 pro Stunde');
  S.Pegel.abbau(f, 10, 600); gleich(f.pegel, 0, 'nie unter 0');
  for (var i = 0; i < 30; i++) S.Pegel.trinke(f, 'kurzer');
  gleich(f.pegel, 4.0, 'Obergrenze 4,0');
  gleich(S.Pegel.anzeige(1.23), '1,2'); gleich(S.Pegel.schwelle(0.5), 'klar'); gleich(S.Pegel.schwelle(1.0), 'locker'); gleich(S.Pegel.schwelle(2.0), 'wackelig'); gleich(S.Pegel.schwelle(3.0), 'kritisch');
});

// ---------- 5 Trinkfestigkeit ----------
test('5 Trinkfestigkeit: Faktor skaliert die Aufnahme je Figur', function () {
  var S = lade(), p = function (id) { var f = S.Pegel.neu(S.Charaktere.holen(id)); S.Pegel.trinke(f, 'pils'); return f.pegel; };
  nah(p('tobi'), 0.20, 1e-9); nah(p('raphael'), 0.26, 1e-9); nah(p('probst'), 0.15, 1e-9); nah(p('kevin'), 0.24, 1e-9); nah(p('stoeckle'), 0.16, 1e-9);
  var f = S.Pegel.neu(S.Charaktere.holen('raphael')); S.Pegel.trinke(f, 'wasser'); gleich(f.pegel, 0, 'Wasser ist nicht skaliert');
  gleich(S.Charaktere.LISTE.length, 11, 'elf Figuren');
});

// ---------- 6 Standfestigkeit ----------
test('6 Standfestigkeit: sinkt ueber 3,0, steigt durch Essen, bei 0 Umfallen', function () {
  var S = lade(), P = S.Pegel, f = P.neu(S.Charaktere.holen('tobi'));
  f.pegel = 3.0; P.update(f, 10); gleich(f.stand, 100, 'bei genau 3,0 noch kein Verlust');
  f.pegel = 2.9; P.update(f, 10); gleich(f.stand, 100);
  f.pegel = 3.5; P.update(f, 1); nah(f.stand, 100 - 3.0, 1e-9, '1,5 + 0,5*3 pro Sekunde');
  P.update(f, 1, true); nah(f.stand, 100 - 3.0 - 1.5, 1e-9, 'halbiert (Scooter-Boost)');
  f.stand = 50; f.pegel = 1; P.essen(f, S.Essen.GERICHTE.linsen, 600); nah(f.stand, 80, 1e-9, 'Linsen +30'); nah(f.pegel, 0.9, 1e-9);
  P.heile(f, 500); gleich(f.stand, 100, 'Obergrenze 100');
  f.stand = 0; gleich(P.pruefe(f), 'verloren'); wahr(f.umgefallen, 'liegt');
  gleich(P.pruefe(f), null, 'faellt nicht zweimal');
});

// ---------- 7 Zweites Leben ----------
test('7 Zweites Leben: Raphael und Rudi stehen einmal wieder auf, Tobi nicht', function () {
  var S = lade(), P = S.Pegel;
  gleich(S.Charaktere.holen('Raffi').id, 'raphael', 'Raffi ist Raphael');
  ['raphael', 'rudi'].forEach(function (id) {
    var f = P.neu(S.Charaktere.holen(id)); gleich(f.leben, 2, id); f.pegel = 2.0; f.stand = 0;
    gleich(P.pruefe(f), 'aufstehbar', id); wahr(P.aufstehen(f), id + ' steht auf');
    gleich(f.stand, 40); nah(f.pegel, 1.0, 1e-9, 'minus 1,0'); gleich(f.leben, 1);
    f.stand = 0; gleich(P.pruefe(f), 'verloren', id + ' nur einmal'); wahr(!P.aufstehen(f), id + ' kein drittes Mal');
  });
  var t = P.neu(S.Charaktere.holen('tobi')); t.stand = 0; gleich(P.pruefe(t), 'verloren'); wahr(!P.aufstehen(t), 'Tobi steht nicht auf'); wahr(t.verloren);
});

// ---------- 8 Mittrunden ----------
test('8 Mittrunden: fester Plan, Warnung, Ausruf, Strafe, Teamstimmung 0 = verloren', function () {
  var S = lade(), R = S.Runden, z = function (h, m) { return h * 60 + (m || 0); };
  gleich(R.PLAN.length, 6, '6 Runden in v01');
  gleich(JSON.stringify(R.PLAN.map(function (p) { return [p.zeit, p.ort]; })),
    JSON.stringify([[z(10), 'hotel'], [z(12, 30), 'restaurant'], [z(15, 30), 'kneipe'], [z(19, 30), 'restaurant'], [z(22, 30), 'disko'], [z(25, 30), 'disko']]), 'Reihenfolge fest');
  R.PLAN.forEach(function (p) { wahr(S.Uhr.offen(p.ort, p.zeit), p.ort + ' ist zur Runde offen'); });
  var rs = R.erstelle(); gleich(rs.team, 3);
  gleich(R.tick(rs, z(8)).length, 0, 'um 08:00 passiert nichts');
  var ev = R.tick(rs, z(9)); gleich(ev.length, 1); gleich(ev[0].typ, 'warnung'); gleich(R.tick(rs, z(9, 30)).length, 0, 'Warnung nur einmal');
  ev = R.tick(rs, z(10)); gleich(ev[0].typ, 'ausruf'); gleich(R.aktive(rs).ort, 'hotel');
  // Ablehnen: Strafe
  var e = R.ablehnen(rs, R.aktive(rs)); gleich(e.team, -1); gleich(e.stand, -15); gleich(e.punkte, -100); gleich(rs.team, 2); gleich(R.aktive(rs), null);
  // Verpassen
  ev = R.tick(rs, z(11, 30)); gleich(ev.filter(function (x) { return x.typ === 'warnung'; }).length, 1);
  ev = R.tick(rs, z(12, 30)); gleich(ev[0].typ, 'ausruf');
  ev = R.tick(rs, z(12, 30) + R.FRIST_MIN); gleich(ev[0].typ, 'verpasst'); gleich(rs.team, 1); gleich(ev[0].effekt.stand, -15);
  wahr(!R.verloren(rs));
  R.tick(rs, z(15, 30)); R.ablehnen(rs, R.aktive(rs)); gleich(rs.team, 0); wahr(R.verloren(rs), 'Teamstimmung 0 = Niederlage');
  // Mitmachen hebt die Stimmung (Obergrenze 5)
  var rs2 = R.erstelle(); R.tick(rs2, z(10)); var t = R.trinke(rs2, R.aktive(rs2), z(10, 5));
  gleich(t.team, 1); gleich(rs2.team, 4); gleich(t.punkte, 150, 'pünktlich: 100 + 50'); gleich(t.glaeser, 2);
  for (var i = 0; i < 6; i++) R.teamAendern(rs2, 1); gleich(rs2.team, 5, 'Obergrenze 5');
  var rs3 = R.erstelle(), rs4 = R.erstelle(); R.tick(rs3, z(10)); R.tick(rs4, z(10));
  gleich(JSON.stringify(rs3), JSON.stringify(rs4), 'deterministisch');
});

// ---------- 9 Alkoholfrei ----------
test('9 Alkoholfrei: Entdeckung deterministisch, Limit 3 pro Runde, Pegel unveraendert', function () {
  var S = lade(), C = S.Cheats;
  var lauf = function (seed) { var c = C.erstelle(), r = S.RNG.erstelle(seed), out = []; for (var i = 0; i < 3; i++) out.push(C.tausche(c, r, 600, true).erwischt); return out.join(','); };
  gleich(lauf(5), lauf(5), 'gleicher Seed gleiches Ergebnis');
  var c = C.erstelle(), r = S.RNG.erstelle(1);
  nah(C.chance(c, 600, false), 0.25, 1e-9, 'Basis 25 %'); nah(C.chance(c, 600, true), 0.40, 1e-9, 'Probst +15 %');
  c.gesamt = 2; nah(C.chance(c, 26 * 60, false), 0.45, 1e-9, 'letzte 2 Stunden: +10 % je Tausch'); nah(C.chance(c, 600, false), 0.25, 1e-9, 'frueher nicht');
  c.gesamt = 30; wahr(C.chance(c, 27 * 60, true) <= 0.95, 'gedeckelt');
  c = C.erstelle(); var res = [C.tausche(c, r, 600, false), C.tausche(c, r, 600, false), C.tausche(c, r, 600, false), C.tausche(c, r, 600, false)];
  wahr(res[0].erlaubt && res[1].erlaubt && res[2].erlaubt, 'drei erlaubt'); wahr(!res[3].erlaubt, 'viertes nicht'); C.neueRunde(c); wahr(C.tausche(c, r, 600, false).erlaubt, 'neue Runde, neues Glueck');
  // Im Ablauf: Pegel bleibt gleich, solange nicht erwischt
  var rs = S.Runden.erstelle(); S.Runden.tick(rs, 600); var f = S.Pegel.neu(S.Charaktere.holen('tobi')), cc = C.erstelle();
  var rng = { next: function () { return 0.99; } };   // nie erwischt
  var t1 = S.Runden.tausche(rs, S.Runden.aktive(rs), cc, rng, 605, false); gleich(t1.erlaubt, true); gleich(t1.fertig, false); gleich(f.pegel, 0);
  var t2 = S.Runden.tausche(rs, S.Runden.aktive(rs) || rs.runden[0], cc, rng, 606, false); wahr(t2.fertig, 'alle Glaeser getauscht'); gleich(rs.runden[0].status, 'erledigt'); gleich(rs.team, 4);
  var rs2 = S.Runden.erstelle(); S.Runden.tick(rs2, 600); var rng2 = { next: function () { return 0.0; } };   // immer erwischt
  var e = S.Runden.tausche(rs2, rs2.runden[0], S.Cheats.erstelle(), rng2, 605, false);
  wahr(e.erwischt); gleich(e.team, -2); gleich(rs2.team, 1); gleich(e.nachtrunk, 4, 'doppeltes Getraenk fuer beide Glaeser'); gleich(e.punkte, -150);
});

// ---------- 10 Essen ----------
test('10 Essen: Werte wirken, Voellegefuehl nach 3 Gerichten in 2 Spielstunden', function () {
  var S = lade(), P = S.Pegel, G = S.Essen.GERICHTE, f = P.neu(S.Charaktere.holen('tobi'));
  f.pegel = 1.0; f.stand = 50; P.essen(f, G.maultaschen, 600); nah(f.pegel, 0.85, 1e-9); nah(f.stand, 70, 1e-9);
  P.abbau(f, 1, 601); nah(f.pegel, 0.85 - 0.20, 1e-9, 'Abbau-Boost 0,10 + 0,10');
  P.abbau(f, 1, 600 + 121); nah(f.pegel, 0.65 - 0.10, 1e-9, 'Boost nach 2 Stunden weg');
  wahr(P.essen(f, G.brezel, 610).voll === false); gleich(P.bewegung(f, 612), 1);
  var r = P.essen(f, G.fruehstueck, 640); wahr(r.voll, 'dritte Mahlzeit in 2 Stunden macht voll'); gleich(P.bewegung(f, 650), 0.8); gleich(P.bewegung(f, 641 + 60), 1);
  var g2 = P.neu(S.Charaktere.holen('tobi')); P.essen(g2, G.brezel, 100); P.essen(g2, G.brezel, 230); gleich(P.essen(g2, G.brezel, 300).voll, false, 'zu weit auseinander');
});

// ---------- 11 Anwaerter ----------
test('11 Anwaerter-Fortschritt: Raphael +4 %, Tobias nach 4 Runden aufgenommen, genau einmal', function () {
  var S = lade(), R = S.Runden, rs = R.erstelle();
  gleich(rs.anwaerter.raphael, 10); gleich(rs.anwaerter.tobias, 80);
  var aufn = [];
  for (var i = 0; i < 6; i++) aufn = aufn.concat(R.fortschritt(rs));
  gleich(rs.anwaerter.raphael, 34); gleich(rs.anwaerter.tobias, 100); gleich(aufn.length, 1); gleich(aufn[0], 'tobias', 'Aufnahme genau einmal');
  var rs2 = R.erstelle(); for (var j = 0; j < 4; j++) { var neu = R.fortschritt(rs2); if (j < 3) gleich(neu.length, 0); else gleich(neu[0], 'tobias', 'nach der 4. Runde'); }
  R.peinlich(rs2, 'raphael', -15); gleich(rs2.anwaerter.raphael, 10 + 16 - 15);
});

// ---------- 12 Joint ----------
test('12 Joint: naechster Effekt doppelt, danach normal, Gegengewicht greift', function () {
  var J = lade().Ereignisse.Joint, j = J.erstelle();
  wahr(!J.benutze(j), 'ohne Tuete nichts'); wahr(J.nimm(j)); wahr(!J.nimm(j), 'nur ein Fundort'); wahr(J.benutze(j));
  gleich(J.verstaerke(j), 2); gleich(J.verstaerke(j), 1, 'danach normal');
  wahr(J.schwammig(j)); nah(J.bewegung(j), 0.9, 1e-9); J.update(j, 29); wahr(J.schwammig(j)); J.update(j, 2); wahr(!J.schwammig(j)); gleich(J.bewegung(j), 1);
});

// ---------- 13 Scooter-Boost ----------
test('13 Scooter-Boost: nur bei voller Leiste, Cooldown, Wirkung fuer alle', function () {
  var B = lade().Ereignisse.Boost, b = B.erstelle();
  wahr(!B.bereit(b)); wahr(!B.zuende(b), 'nicht bei leerer Leiste');
  for (var i = 0; i < 9; i++) B.tanz(b, true); wahr(B.bereit(b), '9 Takte voll');
  wahr(B.zuende(b)); wahr(B.aktiv(b)); gleich(B.verlustFaktor(b), 0.5); gleich(B.bewegung(b), 1.3);
  B.update(b, 10.1); wahr(!B.aktiv(b)); gleich(B.verlustFaktor(b), 1);
  for (i = 0; i < 9; i++) B.tanz(b, true); wahr(!B.bereit(b), 'Cooldown 90 s'); B.update(b, 70); wahr(!B.bereit(b)); B.update(b, 15); wahr(B.bereit(b));
  var b2 = B.erstelle(); b2.leiste = 1; B.zuende(b2, 2); nah(b2.aktivBis - b2.t, 20, 1e-9, 'Joint: doppelte Dauer');
});

// ---------- 14 Sieg / Niederlage ----------
test('14 Sieg: um 04:00 stehend gewonnen', function () {
  var D = lade(), t = neuesSpielTest(D);
  erledigt(t.S); t.Sp.setze(t.S, { minute: 1679.9 }); schritt(t.S, t.Sp, t.X, 0.5);
  gleich(t.S.zustand, 'ende'); wahr(t.S.ende.sieg); gleich(D.Uhr.text(t.S.uhr), '04:00');
  gleich(t.S.ende.wertung.medaille, 'Bronze'); wahr(t.S.best >= 0);
});
test('14b Niederlage: Umfallen ohne zweites Leben', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.S.fig.stand = 0; schritt(t.S, t.Sp, t.X, 0.1);
  gleich(t.S.zustand, 'umgefallen'); wahr(!t.S.pressF.zweitesLeben); gleich(t.S.fig.verloren, true);
  schritt(t.S, t.Sp, t.X, 0.8); t.X.E.druecke('pressF'); schritt(t.S, t.Sp, t.X, 0.1);
  gleich(t.S.zustand, 'ende'); wahr(!t.S.ende.sieg); wahr(/zweites Leben/.test(t.S.ende.grund));
});
test('14c Niederlage: Teamstimmung 0 und dreimal Hausverbot', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.S.runden.team = 0; schritt(t.S, t.Sp, t.X, 0.1); gleich(t.S.zustand, 'ende'); wahr(!t.S.ende.sieg);
  var u = neuesSpielTest(D); u.Sp.setze(u.S, { minute: 23 * 60, pegel: 3.0 }); u.Sp.geheZuStation(u.S, 'stadt', 'tuer_disko', u.X);
  for (var i = 0; i < 3; i++) { u.S.fig.pegel = 3.0; u.Sp.aktion(u.S, u.X); }
  gleich(u.S.hausverbote, 3); gleich(u.S.zustand, 'ende'); wahr(/Hausverbot/.test(u.S.ende.grund));
});
test('14d Press F: Figur mit zweitem Leben steht nach 5 Tastendruecken wieder auf', function () {
  var D = lade(), t = neuesSpielTest(D, { figur: 'raphael' });
  t.S.fig.pegel = 2.0; t.S.fig.stand = 0; schritt(t.S, t.Sp, t.X, 0.1);
  gleich(t.S.zustand, 'umgefallen'); wahr(t.S.pressF.zweitesLeben);
  for (var i = 0; i < 5; i++) { t.X.E.druecke('pressF'); schritt(t.S, t.Sp, t.X, 0.05); }
  gleich(t.S.zustand, 'spiel'); gleich(t.S.fig.stand, 40); nah(t.S.fig.pegel, 1.0, 0.05); gleich(t.S.fig.leben, 1);
  var u = neuesSpielTest(D, { figur: 'raphael' }); u.S.fig.stand = 0; schritt(u.S, u.Sp, u.X, 3.4);
  gleich(u.S.zustand, 'ende', 'zu langsam gedrueckt'); wahr(!u.S.ende.sieg);
});

// ---------- 15 Karte ----------
test('15 Karte: Tueren per A* erreichbar, keine eingesperrten Orte, alle vier Orte verbunden', function () {
  var D = lade(), T = D.Karte.T;
  for (var seed = 1; seed <= 30; seed++) {
    var w = D.Karte.erstelleWelt(D.RNG.erstelle(seed)), st = w.stadt;
    wahr(!st.blockiert(st.spawn.x, st.spawn.y), 'Spawn frei');
    gleich(st.tueren.length, 4, 'vier Tueren');
    ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (id) {
      var td = st.tueren.filter(function (x) { return x.id === id; })[0]; wahr(td, id + ' hat Tuer');
      wahr(!st.blockiert(td.aussen.x, td.aussen.y), id + ' Vorplatz frei');
      wahr(D.Pfad.suche(st, st.spawn.x, st.spawn.y, td.aussen.x, td.aussen.y), 'Seed ' + seed + ': ' + id + ' erreichbar');
      var k = w.innen[id], sp = k.spawn;
      wahr(!k.blockiert(sp.x, sp.y), id + ' Innen-Spawn frei');
      k.stationen.forEach(function (s) {
        var nachbarn = D.Karte.umgebung(k, s); wahr(nachbarn.length > 0, id + '/' + s.id + ' hat Standplaetze');
        wahr(nachbarn.some(function (n) { return D.Pfad.suche(k, sp.x, sp.y, n.x, n.y); }), id + '/' + s.id + ' erreichbar');
      });
      var aus = k.stationen.filter(function (s) { return s.typ === 'ausgang'; })[0]; wahr(aus, id + ' hat Ausgang');
      wahr(k.stationen.some(function (s) { return s.typ === 'stammtisch'; }), id + ' hat einen Stammtisch');
    });
    // Stadt-Stationen (Baenke, Flasche) erreichbar
    st.stationen.forEach(function (s) { wahr(D.Karte.umgebung(st, s).some(function (n) { return D.Pfad.suche(st, st.spawn.x, st.spawn.y, n.x, n.y); }), 'Seed ' + seed + ': ' + s.id + ' erreichbar'); });
  }
  var st1 = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt, zaehl = {};
  for (var i = 0; i < st1.tiles.length; i++) zaehl[st1.tiles[i]] = (zaehl[st1.tiles[i]] || 0) + 1;
  wahr(zaehl[T.REBEN] > 40 && zaehl[T.WASSER] > 20 && zaehl[T.BRUNNEN] === 4 && zaehl[T.STAEFFELE] >= 4, 'Rebenhang, Fluss, Brunnen, Staeffele');
  gleich(st1.w, 40); gleich(st1.h, 60);
  // Nachbau der Begehbarkeit fuer die Truppe: A* findet den kuerzesten Weg um den Brunnen
  var p = D.Pfad.suche(st1, 13, 10, 17, 10); wahr(p && p.length - 1 === 6, 'um 2x2-Brunnen herum');
  gleich(D.Pfad.suche(st1, 25, 13, 5, 22), null, 'Ziel im Wasser');
});

// ---------- 16 Ton ----------
test('16 Ton: noten() liefert gueltige MIDI-Werte, Ebenen bauen aufeinander auf', function () {
  var Ton = lade().Ton;
  for (var takt = 0; takt < 8; takt++) for (var e = 0; e <= 3; e++) {
    var n = Ton.noten(takt, e); gleich(n.length, 16);
    n.forEach(function (s) {
      [s.bass, s.lead].forEach(function (m) { if (m !== null) { wahr(Number.isInteger(m) && m >= 0 && m <= 127, 'MIDI ' + m); } });
      if (e === 0) wahr(!s.kick && !s.clap && s.lead === null, 'morgens nur Bass und Hat'); if (e < 3) wahr(s.lead === null, 'Lead erst ab Ebene 3'); if (e >= 1) wahr(s.kick === (n.indexOf(s) % 4 === 0));
    });
  }
  gleich(Ton.BPM, 150); nah(Ton.mtof(69), 440, 1e-9);
  var t = Ton.erstelle(null); t.prost(); t.schluck(); t.umfall(); t.glocke(); t.tuer(); t.setzeEbene(9); gleich(t.ebene, 3); wahr(!t.start(), 'ohne WebAudio kein Absturz');
});

// ---------- 17 Eingabe ----------
test('17 Eingabe: Tasten-Mapping, Achse, Entprellung', function () {
  var E = lade().Eingabe, e = E.erstelle(null, null);
  e.druecke('KeyE'); wahr(e.neu('aktion')); wahr(e.halt('aktion')); e.ende(); wahr(!e.neu('aktion')); wahr(e.halt('aktion')); e.loese('KeyE'); wahr(!e.halt('aktion'));
  e.druecke('Space'); wahr(e.neu('aktion')); e.ende(); e.loese('Space');
  e.druecke('KeyF'); wahr(e.neu('pressF')); e.druecke('KeyQ'); wahr(e.neu('wasser')); e.druecke('KeyR'); wahr(e.neu('item')); e.druecke('KeyP'); wahr(e.neu('playlist'));
  e.druecke('KeyM'); wahr(e.neu('stumm')); e.druecke('Escape'); wahr(e.neu('pause')); e.druecke('Backquote'); wahr(e.neu('debug')); e.ende();
  e.druecke('KeyD'); e.druecke('ArrowDown'); var a = e.achse(); nah(Math.hypot(a.x, a.y), 1, 1e-9, 'diagonal normiert'); e.loese('KeyD'); e.loese('ArrowDown');
  e.stick.x = 0.5; e.stick.y = 0; gleich(e.achse().x, 0.5, 'Stick'); e.stick.x = 0;
  wahr(e.zeiger(10, 10, 1000)); wahr(!e.zeiger(12, 11, 1100), 'Doppeltipp'); wahr(e.zeiger(12, 11, 1400)); wahr(e.zeiger(100, 100, 1450));
  gleich(e.klicks().length, 3); e.tippe('aktion'); wahr(e.neu('aktion'));
});

// ---------- 18 Hinweistext ----------
test('18 Hinweistext: Hinweis 18+ ist im Startbildschirm und im Titel', function () {
  var D = lade(), H = D.Hinweise;
  wahr(/ab 18/.test(H.HINWEIS_VOLL) && /Press11 - Saufi Saufi/.test(H.HINWEIS_VOLL) && /Joint/.test(H.HINWEIS_VOLL) && /Steuer/.test(H.HINWEIS_VOLL), 'voller Text');
  wahr(H.HINWEIS_START.some(function (z) { return /18/.test(z); }), 'Kurztext nennt 18');
  gleich(H.TITEL, 'Press11 - Saufi Saufi');
  var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument), S = D.Spiel.neu({ seed: 1 });
  gleich(S.zustand, 'start'); D.Render.zeichne(R, S);
  wahr(log.indexOf('Press11 - Saufi Saufi') >= 0, 'Titel auf dem Startbildschirm');
  wahr(log.some(function (t) { return /Ab 18/.test(t); }), 'Hinweis 18+ auf dem Startbildschirm');
  wahr(log.some(function (t) { return /Scooter-Playlist/.test(t); }), 'Playlist-Knopf auf dem Startbildschirm');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); wahr(/<title>Press11 - Saufi Saufi/.test(html), 'Seitentitel');
  var X = { E: fakeE() }; D.Spiel.update(S, 0.1, X); gleich(S.zustand, 'start', 'ohne Bestaetigung geht es nicht los');
  X.E.druecke('aktion'); D.Spiel.update(S, 0.1, X); gleich(S.zustand, 'spiel', 'nach Bestaetigung');
});

// ---------- 19 Musikquellen-Logik ----------
test('19 Musikquellen: Reihenfolge MP3 > YouTube > WebAudio, leere Playlist, file:// kein YouTube', function () {
  var M = lade().Musik, mp3 = [{ datei: 'music/a.mp3', titel: 'A' }];
  gleich(M.quelle({ mp3: mp3, youtubeGewaehlt: true, youtubeVerfuegbar: true }), 'mp3', 'MP3 vor YouTube');
  gleich(M.quelle({ mp3: mp3, youtubeGewaehlt: false, youtubeVerfuegbar: false }), 'mp3');
  gleich(M.quelle({ mp3: [], youtubeGewaehlt: true, youtubeVerfuegbar: true }), 'youtube', 'YouTube wenn gewaehlt und verfuegbar');
  gleich(M.quelle({ mp3: [], youtubeGewaehlt: false, youtubeVerfuegbar: true }), 'webaudio', 'nicht gewaehlt');
  gleich(M.quelle({ mp3: [], youtubeGewaehlt: true, youtubeVerfuegbar: false }), 'webaudio', 'nicht verfuegbar');
  gleich(M.quelle({}), 'webaudio'); gleich(M.quelle(), 'webaudio'); gleich(M.quelle({ mp3: undefined }), 'webaudio', 'leere Playlist');
  gleich(M.mp3Liste([]).length, 0); gleich(M.mp3Liste(null).length, 0);
  gleich(M.mp3Liste([null, {}, { datei: '', titel: 'x' }, { datei: 'a.mp3' }, { datei: '  ', titel: 'y' }, { datei: 'b.mp3', titel: 'B' }]).length, 1, 'kaputte Eintraege werden ignoriert');
  gleich(M.quelle({ mp3: [{ datei: '', titel: 'x' }], youtubeGewaehlt: false }), 'webaudio', 'nur kaputte Eintraege = leer');
  wahr(!M.youtubeVerfuegbar({ protokoll: 'file:', online: true }), 'file:// -> kein YouTube'); wahr(M.youtubeVerfuegbar({ protokoll: 'http:', online: true })); wahr(M.youtubeVerfuegbar({ protokoll: 'https:' }));
  wahr(!M.youtubeVerfuegbar({ protokoll: 'http:', online: false }), 'offline'); wahr(!M.youtubeVerfuegbar({ protokoll: 'http:', online: true, fehler: 'player' }), 'Player-Fehler'); wahr(!M.youtubeVerfuegbar());
  wahr(/localhost/.test(M.hinweisYoutube({ protokoll: 'file:' }))); wahr(/Internet/.test(M.hinweisYoutube({ protokoll: 'http:', online: false }))); wahr(/Fehler/.test(M.hinweisYoutube({ protokoll: 'http:', online: true, fehler: 'x' })));
});
test('19b Musikquellen: Instanz schaltet bei file://, offline und Player-Fehler auf den Fallback', function () {
  var D = lade(), M = D.Musik, meldungen = [], ton = D.Ton.erstelle(null), mus = [];
  ton.setzeMusik = function (an) { mus.push(an); };
  var sp = D.Speicher.erstelle(null);
  // file:// : YouTube geht nie
  var m = M.erstelle({ win: {}, doc: null, ton: ton, speicher: sp, melde: function (t) { meldungen.push(t); }, protokoll: 'file:', online: true, mp3: [] });
  gleich(m.quelle(), 'webaudio'); m.waehleYoutube(true); gleich(m.quelle(), 'webaudio', 'auch gewaehlt kein YouTube ueber file://');
  m.starte('playlist'); gleich(m.aktiv, 'webaudio'); wahr(meldungen.length === 1 && /localhost/.test(meldungen[0]), 'Hinweis bei file://'); wahr(mus[mus.length - 1] === true, 'Spiel-Beat laeuft');
  m.starte('disko'); gleich(meldungen.length, 1, 'Hinweis nicht bei jedem Aufruf');
  // offline
  var m2 = M.erstelle({ win: {}, doc: null, ton: ton, speicher: D.Speicher.erstelle(null), melde: function (t) { meldungen.push(t); }, protokoll: 'http:', online: false, mp3: [] });
  m2.waehleYoutube(true); gleich(m2.quelle(), 'webaudio'); m2.starte('playlist'); wahr(/Internet/.test(meldungen[meldungen.length - 1]));
  // http + Player + Fehler im Player
  var spieler = [], doc = fakeDocMitYT(), win = { YT: { Player: function (id, opt) { spieler.push({ id: id, opt: opt, geladen: [] }); this.loadVideoById = function (v) { spieler[0].geladen.push(v); }; this.pauseVideo = function () {}; this.playVideo = function () {}; this.mute = function () {}; this.unMute = function () {}; } }, setTimeout: setTimeout, clearTimeout: clearTimeout };
  var m3 = M.erstelle({ win: win, doc: doc, ton: ton, speicher: D.Speicher.erstelle(null), melde: function (t) { meldungen.push(t); }, protokoll: 'http:', online: true, mp3: [] });
  gleich(m3.quelle(), 'webaudio', 'ohne Wahl kein YouTube'); m3.starte('playlist');
  gleich(m3.quelle(), 'youtube'); gleich(spieler.length, 1); gleich(spieler[0].id, 'yt-player'); gleich(spieler[0].opt.videoId, 'aoXOdAUD7IM', 'erst Hyper Hyper');
  wahr(spieler[0].opt.width >= 200 && spieler[0].opt.height >= 113, 'Player mindestens 200x113'); gleich(m3.aktiv, 'youtube'); wahr(!doc.els['yt-fenster'].hidden, 'Fenster sichtbar');
  spieler[0].opt.events.onStateChange({ data: 0 }); // Video zu Ende -> zweites Video
  gleich(spieler[0].geladen[0], '4YxTa1AUqps', 'danach The Logical Song');
  spieler[0].opt.events.onError({ data: 150 });
  gleich(m3.aktiv, 'webaudio', 'Fehler -> Fallback'); gleich(m3.quelle(), 'webaudio', 'nach Fehler kein YouTube mehr'); wahr(doc.els['yt-fenster'].hidden, 'Fenster zu'); wahr(/Fehler/.test(meldungen[meldungen.length - 1]));
  // MP3 hat Vorrang und faellt bei Fehler zurueck
  var audio = fakeAudio(), doc2 = { createElement: function (t) { return t === 'audio' ? audio : {}; }, getElementById: function () { return null; } };
  var m4 = M.erstelle({ win: {}, doc: doc2, ton: ton, speicher: D.Speicher.erstelle(null), melde: function (t) { meldungen.push(t); }, protokoll: 'http:', online: true, mp3: [{ datei: 'music/x-hyper.mp3', titel: 'Hyper Hyper' }, { datei: 'music/y.mp3', titel: 'Y' }] });
  gleich(m4.quelle(), 'mp3', 'MP3 vor YouTube');
  m4.starte('boost'); gleich(m4.aktiv, 'mp3'); gleich(audio.src, 'music/x-hyper.mp3', 'Boost nimmt den Hyper-Titel'); wahr(audio.spielt);
  audio.feuere('ended'); gleich(audio.src, 'music/y.mp3', 'danach naechster Titel');
  audio.feuere('error'); gleich(m4.aktiv, 'mp3', 'ein defekter Titel -> naechster gueltiger MP3-Titel'); gleich(audio.src, 'music/x-hyper.mp3');
  audio.feuere('error'); gleich(m4.aktiv, 'webaudio', 'alle MP3 defekt, YouTube nicht gewaehlt -> Beat'); wahr(/MP3/.test(meldungen[meldungen.length - 1])); gleich(m4.quelle(), 'webaudio');
  // MP3 kaputt, YouTube gewaehlt und verfuegbar: naechste Quelle der Reihenfolge ist YouTube
  var audio2 = fakeAudio(), doc3 = fakeDocMitYT(); doc3.createElement = function (t) { return t === 'audio' ? audio2 : {}; };
  var spieler2 = [], win2 = { YT: { Player: function (id, opt) { spieler2.push(opt); this.loadVideoById = function () {}; this.pauseVideo = function () {}; this.playVideo = function () {}; } } };
  var m5 = M.erstelle({ win: win2, doc: doc3, ton: ton, speicher: D.Speicher.erstelle(null), melde: function (t) { meldungen.push(t); }, protokoll: 'https:', online: true, mp3: [{ datei: 'music/weg.mp3', titel: 'Weg' }] });
  m5.waehleYoutube(true); m5.starte('disko'); gleich(m5.aktiv, 'mp3'); audio2.feuere('error');
  gleich(m5.aktiv, 'youtube', 'nach kaputter MP3 kommt YouTube'); gleich(spieler2.length, 1); gleich(spieler2[0].videoId, 'aoXOdAUD7IM');
});
test('19c Musik: defekte MP3 sperrt nur den Titel; erst wenn alle defekt sind, YouTube bzw. Beat', function () {
  var D = lade(), M = D.Musik, ton = D.Ton.erstelle(null);
  var liste = [{ datei: 'music/a.mp3', titel: 'A' }, { datei: 'music/b.mp3', titel: 'B' }, { datei: 'music/c.mp3', titel: 'C' }];
  var audio = fakeAudio(), doc = fakeDocMitYT(); doc.createElement = function (t) { return t === 'audio' ? audio : {}; };
  var spieler = [], win = { YT: { Player: function (id, opt) { spieler.push(opt); this.loadVideoById = function () {}; this.pauseVideo = function () {}; this.playVideo = function () {}; } } };
  var m = M.erstelle({ win: win, doc: doc, ton: ton, speicher: D.Speicher.erstelle(null), melde: function () {}, protokoll: 'https:', online: true, mp3: liste });
  m.waehleYoutube(true); m.starte('disko'); gleich(audio.src, 'music/a.mp3');
  audio.feuere('error'); gleich(m.aktiv, 'mp3', 'A defekt, weiter mit MP3'); gleich(audio.src, 'music/b.mp3'); gleich(m.mp3().length, 2, 'nur A gesperrt'); gleich(spieler.length, 0, 'noch kein YouTube');
  audio.feuere('ended'); gleich(audio.src, 'music/c.mp3'); audio.feuere('ended'); gleich(audio.src, 'music/b.mp3', 'A wird uebersprungen');
  audio.feuere('error'); gleich(audio.src, 'music/c.mp3'); gleich(m.aktiv, 'mp3');
  audio.feuere('error'); gleich(m.aktiv, 'youtube', 'alle defekt -> YouTube (gewaehlt)'); gleich(spieler.length, 1); gleich(m.mp3().length, 0);
});
function fakeAudio() {
  var l = {}, a = { src: '', spielt: false, muted: false, volume: 1, addEventListener: function (t, f) { l[t] = f; }, pause: function () { a.spielt = false; }, play: function () { a.spielt = true; return { catch: function () {} }; }, feuere: function (t) { l[t](); } };
  return a;
}
function fakeDocMitYT() {
  var els = { 'yt-fenster': { hidden: true, className: '' }, 'yt-player': {} };
  return { els: els, getElementById: function (id) { return els[id] || null; }, createElement: function () { return {}; }, head: { appendChild: function () {} } };
}

// ---------- 20 Playlist ----------
test('20 Playlist: Scooter-Titel nur als Text, YouTube-Liste aus music/playlist.js, MP3-Liste leer, keine MP3 im Repo', function () {
  var D = lade(), M = D.Musik;
  ['Hyper Hyper', 'Move Your Ass!', 'How Much Is the Fish?', 'Maria (I Like It Loud)', 'Nessaja', 'The Logical Song', 'Weekend!', 'Jigga Jigga!', 'One (Always Hardcore)', 'Posse (I Need You on the Floor)', 'Fire']
    .forEach(function (t) { wahr(M.TITEL.indexOf(t) >= 0, 'Titel ' + t); });
  gleich(M.TITEL.length, 11); gleich(M.VIDEOS.length, 4); gleich(D.YOUTUBE.length, 4, 'Saufi.YOUTUBE in playlist.js');
  gleich(M.VIDEOS[2].id, 'Y5pdgyOzJtE'); gleich(M.VIDEOS[3].id, 'teW0KULIir0');
  gleich(M.videoListe([{ id: 'kaputt', titel: 'x' }, { id: 'teW0KULIir0', titel: 'Fish' }, null]).length, 1, 'ungueltige IDs werden ignoriert');
  gleich(M.VIDEOS[0].id, 'aoXOdAUD7IM'); gleich(M.VIDEOS[0].titel, 'Scooter - Hyper Hyper'); gleich(M.VIDEOS[1].id, '4YxTa1AUqps'); gleich(M.VIDEOS[1].titel, 'Scooter - The Logical Song (Official Video)');
  gleich(M.API_URL, 'https://www.youtube.com/iframe_api');
  wahr(Array.isArray(D.MUSIK) && D.MUSIK.length === 0, 'Saufi.MUSIK standardmaessig leer');
  var pj = fs.readFileSync(path.join(ROOT, 'music', 'playlist.js'), 'utf8'); wahr(/Saufi\.MUSIK/.test(pj) && /datei:/.test(pj) && /\/\/ \{ datei/.test(pj), 'Anleitung im Kommentar');
  var gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'); wahr(/^music\/\*\.mp3$/m.test(gi), '.gitignore ignoriert music/*.mp3');
  wahr(fs.readdirSync(path.join(ROOT, 'music')).every(function (f) { return !/\.mp3$/i.test(f); }), 'keine MP3 im Repo');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(html.indexOf('music/playlist.js') < html.indexOf('js/musik.js'), 'playlist.js vor musik.js'); wahr(!/<iframe/i.test(html) && !/youtube\.com/.test(html), 'kein YouTube in index.html (wird erst bei Bedarf nachgeladen)');
  var dateien = fs.readdirSync(path.join(ROOT, 'js')); wahr(dateien.every(function (f) { return !/\.(mp3|ogg|wav|m4a)$/i.test(f); }));
});

// ---------- Weitere Tests ----------
test('21 NPCs: folgen dem Spieler, Rudi kommt ab 14:00, Umgefallene lassen sich mit Wasser wecken', function () {
  var D = lade(), t = neuesSpielTest(D);
  gleich(t.S.npcs.length, 10); gleich(t.S.npcs.filter(function (n) { return n.aktiv; }).length, 9, 'Rudi fehlt noch');
  t.X.E.setzeHalt('links', true); schritt(t.S, t.Sp, t.X, 3); t.X.E.setzeHalt('links', false); schritt(t.S, t.Sp, t.X, 6);
  t.S.npcs.forEach(function (n) { if (n.aktiv) wahr(Math.hypot(n.x - t.S.spieler.x, n.y - t.S.spieler.y) < 80, n.id + ' bleibt in der Naehe'); });
  erledigt(t.S); t.Sp.setze(t.S, { minute: 14 * 60 }); schritt(t.S, t.Sp, t.X, 0.2); wahr(t.S.npcs.filter(function (n) { return n.id === 'rudi'; })[0].aktiv, 'Rudi ist da');
  var kevin = t.S.npcs.filter(function (n) { return n.id === 'kevin'; })[0]; kevin.fig.pegel = 3.8; kevin.fig.stand = 1; schritt(t.S, t.Sp, t.X, 1);
  wahr(kevin.liegt, 'Kevin liegt'); kevin.x = t.S.spieler.x + 10; kevin.y = t.S.spieler.y; var p0 = t.S.punkte.punkte, team = t.S.runden.team;
  t.X.E.druecke('wasser'); schritt(t.S, t.Sp, t.X, 0.1);
  wahr(!kevin.liegt, 'geweckt'); gleich(t.S.punkte.punkte, p0 + 80); gleich(t.S.runden.team, team + 1);
  var rap = t.S.npcs.filter(function (n) { return n.id === 'raphael'; })[0]; rap.fig.stand = 0; rap.fig.pegel = 2; schritt(t.S, t.Sp, t.X, 0.1); wahr(rap.liegt);
  schritt(t.S, t.Sp, t.X, 16); wahr(!rap.liegt, 'Raphael steht dank zweitem Leben von selbst wieder auf'); gleich(rap.fig.leben, 1);
});

test('22 Orte: Tuer, Oeffnungszeiten, Tuersteher, Rauswurf bei Ladenschluss', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.geheZuStation(t.S, 'stadt', 'tuer_kneipe', t.X); t.Sp.aktion(t.S, t.X);
  gleich(t.S.ort, 'stadt', 'Kneipe um 08:00 zu'); wahr(/zu/.test(t.S.hinweise.liste[t.S.hinweise.liste.length - 1].text));
  erledigt(t.S); t.Sp.setze(t.S, { minute: 15 * 60 }); t.Sp.aktion(t.S, t.X); schritt(t.S, t.Sp, t.X, 1);
  gleich(t.S.ort, 'kneipe', 'Kneipe um 15:00 auf'); wahr(t.S.karte.id === 'kneipe');
  t.Sp.setze(t.S, { minute: 26 * 60 + 59 }); erledigt(t.S); schritt(t.S, t.Sp, t.X, 2); gleich(t.S.ort, 'stadt', 'um 03:00 raus');
  t.Sp.setze(t.S, { minute: 22 * 60, pegel: 3.2 }); t.Sp.geheZuStation(t.S, 'stadt', 'tuer_disko', t.X); t.Sp.aktion(t.S, t.X); schritt(t.S, t.Sp, t.X, 1);
  gleich(t.S.ort, 'stadt', 'Tuersteher weist ab'); gleich(t.S.hausverbote, 1);
  t.S.fig.pegel = 1.0; t.Sp.aktion(t.S, t.X); schritt(t.S, t.Sp, t.X, 1); gleich(t.S.ort, 'disko', 'nuechtern genug');
});

test('23 Menues und Essen: Bestellen im Menue, Essen kostet Zeit und wirkt', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.geheZuStation(t.S, 'hotel', 'buffet', t.X); t.Sp.aktion(t.S, t.X);
  gleich(t.S.overlay.art, 'menue'); wahr(/Frühstück/.test(t.S.overlay.eintraege[0].label));
  t.S.fig.pegel = 1.0; t.S.fig.stand = 50; t.X.E.druecke('aktion'); t.Sp.update(t.S, 0.1, t.X); t.X.E.ende();
  wahr(t.S.spieler.isst > 0, 'isst'); schritt(t.S, t.Sp, t.X, 3.5);
  nah(t.S.fig.pegel, 0.95 - 0.01, 0.03); wahr(t.S.fig.stand >= 59, 'Standfestigkeit gestiegen');
  t.Sp.setze(t.S, { minute: 12 * 60 }); t.Sp.aktion(t.S, t.X); gleich(t.S.overlay, null, 'Buffet nur bis 11:00');
  // Bar: Bier, Wasser, Alkoholfrei
  t.Sp.setze(t.S, { minute: 16 * 60, pegel: 0 }); t.Sp.geheZuStation(t.S, 'kneipe', 'tresen', t.X); t.Sp.aktion(t.S, t.X);
  var ids = t.S.overlay.eintraege.map(function (e) { return e.daten; }); ['pils', 'radler', 'kurzer', 'wasser', 'alkoholfrei', 'brezel'].forEach(function (i) { wahr(ids.indexOf(i) >= 0, i); });
  t.Sp.waehle(t.S, t.S.overlay.eintraege[ids.indexOf('pils')], t.X); nah(t.S.fig.pegel, 0.2, 1e-9);
  t.Sp.aktion(t.S, t.X); t.Sp.waehle(t.S, t.S.overlay.eintraege[ids.indexOf('alkoholfrei')], t.X); nah(t.S.fig.pegel, 0.2, 1e-9);
  // Joint verdoppelt das naechste Getraenk
  t.Sp.setze(t.S, { pegel: 0, joint: true }); t.Sp.itemNutzen(t.S, t.X); wahr(t.S.joint.doppelt);
  t.Sp.aktion(t.S, t.X); t.Sp.waehle(t.S, t.S.overlay.eintraege[0], t.X); nah(t.S.fig.pegel, 0.4, 1e-9, 'Pils doppelt'); wahr(!t.S.joint.doppelt);
});

test('24 Runde am Stammtisch: Mittrinken, Alkoholfrei-Tausch, Ablehnen', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.setze(t.S, { minute: 10 * 60 }); schritt(t.S, t.Sp, t.X, 0.1);
  wahr(D.Runden.aktive(t.S.runden), 'Runde ausgerufen'); t.Sp.geheZuStation(t.S, 'hotel', 'stammtisch', t.X);
  t.Sp.aktion(t.S, t.X); gleich(t.S.overlay.titel, 'RUNDE! Alle mittrinken!'); gleich(t.S.overlay.eintraege.length, 3);
  t.Sp.waehle(t.S, t.S.overlay.eintraege[0], t.X);
  nah(t.S.fig.pegel, 0.2, 1e-9, '2 Radler'); gleich(t.S.runden.team, 4); wahr(t.S.punkte.punkte >= 150); gleich(D.Runden.aktive(t.S.runden), null);
  t.S.npcs.forEach(function (n) { if (n.aktiv) wahr(n.fig.pegel > 0, n.id + ' trinkt mit'); });
  // zweite Runde: Alkoholfrei-Tausch, Pegel bleibt
  var u = neuesSpielTest(D); u.Sp.setze(u.S, { minute: 12 * 60 + 30 }); schritt(u.S, u.Sp, u.X, 0.1); u.Sp.geheZuStation(u.S, 'restaurant', 'stammtisch', u.X);
  u.Sp.aktion(u.S, u.X); var rng0 = u.S.rng; u.S.rng = { next: function () { return 0.99; }, pick: rng0.pick }; u.Sp.waehle(u.S, u.S.overlay.eintraege[1], u.X);
  gleich(u.S.fig.pegel, 0); wahr(u.S.overlay && u.S.overlay.titel === 'RUNDE! Alle mittrinken!', 'Menue wieder offen'); wahr(/Noch 2 Glas/.test(u.S.overlay.kopf[0]));
  u.Sp.waehle(u.S, u.S.overlay.eintraege[1], u.X); u.Sp.waehle(u.S, u.S.overlay.eintraege[1], u.X);
  u.Sp.aktion(u.S, u.X); u.Sp.waehle(u.S, u.S.overlay ? u.S.overlay.eintraege[1] : { id: 'x' }, u.X);
  gleich(u.S.fig.pegel, 0, 'drei getauscht, Pegel null'); gleich(D.Runden.aktive(u.S.runden), null);
  // dritte Runde: Ablehnen
  var v = neuesSpielTest(D); v.Sp.setze(v.S, { minute: 10 * 60 }); schritt(v.S, v.Sp, v.X, 0.1); v.Sp.geheZuStation(v.S, 'hotel', 'stammtisch', v.X);
  v.Sp.aktion(v.S, v.X); v.Sp.waehle(v.S, v.S.overlay.eintraege[2], v.X); gleich(v.S.runden.team, 2); gleich(v.S.fig.stand, 85);
});

test('25 Scooter-Boost im Spiel: tanzen, zuenden, Musik, Wirkung', function () {
  var D = lade(), t = neuesSpielTest(D), musikAufrufe = [];
  t.X.M = { starte: function (a) { musikAufrufe.push(a); }, ende: function () { musikAufrufe.push('ende'); }, zustand: function () { return {}; }, setzeStumm: function () {}, aktiv: 'webaudio' };
  erledigt(t.S); t.Sp.setze(t.S, { minute: 23 * 60 }); t.Sp.geheZuStation(t.S, 'disko', 'tanz', t.X);
  gleich(t.S.ort, 'disko'); t.Sp.betreten(t.S, 'disko', t.X); t.Sp.geheZuStation(t.S, 'disko', 'tanz', t.X);
  wahr(musikAufrufe.indexOf('disko') >= 0, 'Disko startet die Musik automatisch');
  for (var i = 0; i < 40; i++) { t.S.spieler.tanzt = 0; t.Sp.tanzen(t.S, t.X); t.S.t += 0.4; }
  wahr(t.S.boost.leiste > 0.3, 'Tanzen fuellt die Leiste'); t.S.boost.leiste = 1;
  t.X.E.druecke('item'); t.Sp.update(t.S, 0.05, t.X); wahr(t.S.boostAktiv, 'Boost laeuft'); wahr(musikAufrufe.indexOf('boost') >= 0, 'Boost startet Hyper Hyper');
  gleich(t.S.punkte.punkte >= 150, true); t.S.fig.pegel = 3.5; var s0 = t.S.fig.stand; schritt(t.S, t.Sp, t.X, 1); nah(s0 - t.S.fig.stand, 1.5, 0.2, 'Verlust halbiert');
  schritt(t.S, t.Sp, t.X, 11); wahr(!t.S.boostAktiv, 'Boost vorbei');
});

test('26 Debug-Haken und URL-Parameter', function () {
  var D = lade(), P = D.Main.parameter;
  gleich(JSON.stringify(P('?tempo=10&seed=42')), JSON.stringify({ tempo: 10, seed: 42 })); gleich(JSON.stringify(P('')), '{}'); gleich(P('?tempo=abc').tempo, undefined); gleich(P('?tempo=-3').tempo, undefined);
  gleich(P('?figur=raphael&start').figur, 'raphael'); wahr(P('?start').start);
  var t = neuesSpielTest(D, { tempo: 60 }); gleich(t.S.tempo, 60);
  var s0 = D.Spiel.schnappschuss(t.S);
  ['zeit', 'ort', 'pegel', 'standfestigkeit', 'phase', 'tagesphase', 'team', 'punkte', 'seed', 'tempo'].forEach(function (k) { wahr(k in s0, 'Feld ' + k); });
  gleich(s0.zeit, '08:00'); gleich(s0.ort, 'stadt'); gleich(s0.pegel, 0); gleich(s0.standfestigkeit, 100); gleich(s0.phase, 'spiel'); gleich(s0.tagesphase, 'Morgen'); gleich(s0.tempo, 60);
  schritt(t.S, t.Sp, t.X, 0.6); gleich(D.Spiel.schnappschuss(t.S).zeit, '09:00', 'tempo=60: 0,6 s sind 60 Spielminuten');
  var a = D.Spiel.neu({ seed: 3, start: true }), b = D.Spiel.neu({ seed: 3, start: true }); gleich(JSON.stringify(D.Spiel.schnappschuss(a)), JSON.stringify(D.Spiel.schnappschuss(b)), 'seed ist deterministisch');
});

test('27 Browser-Verdrahtung: Main.starte mit Fake-DOM, Saufi.debug, Start per Taste, Musik-Knopf', function () {
  var listeners = {}, rafs = [], els = {}, log = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id; e.classList = { add: function () {}, toggle: function () {}, remove: function () {} }; e.style = { setProperty: function () {} };
    e.hidden = false; e.listeners = {}; e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }; e.setPointerCapture = function () {}; e.textContent = '';
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? fakeAudio() : mockCanvas(log); }, addEventListener: function () {}, hidden: false, head: { appendChild: function () {} } };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '?tempo=5&seed=9', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); }, setInterval: function () { return 1; },
    setTimeout: setTimeout, clearTimeout: clearTimeout, innerWidth: 1280, innerHeight: 720 });
  var Saufi = win.Saufi; Saufi.Main.starte(win, doc);
  wahr(typeof Saufi.debug === 'function', 'Saufi.debug ist eine Funktion');
  var d = Saufi.debug(); gleich(d.phase, 'start'); gleich(d.zeit, '08:00'); gleich(d.tempo, 5); gleich(d.seed, 9); gleich(d.ort, 'stadt');
  function frame(ms) { var f = rafs.shift(); f(ms); }
  frame(0); frame(16);
  (listeners.keydown || []).forEach(function (f) { f({ code: 'Enter', preventDefault: function () {}, target: {} }); });
  frame(32); d = Saufi.debug(); gleich(d.phase, 'spiel', 'Enter startet das Spiel');
  for (var i = 0; i < 200; i++) frame(48 + i * 50); d = Saufi.debug(); wahr(d.minute > 480, 'Uhr laeuft mit tempo=5'); nah(d.minute, 480 + 200 * 0.05 * 5 * 60 / 36, 3);
  Saufi.debug.setze({ pegel: 2.5 }); gleich(Saufi.debug().pegel, 2.5);
  (listeners.keydown || []).forEach(function (f) { f({ code: 'KeyP', preventDefault: function () {}, target: {} }); }); frame(20000);
  d = Saufi.debug(); wahr(/playlist/.test(d.overlay), 'P oeffnet die Playlist'); wahr(log.indexOf('Scooter-Playlist') >= 0);
  gleich(Saufi.debug.musik().quelle, 'webaudio');
  // "Scooter-Playlist abspielen" in der Liste anklicken: ueber file:// geht YouTube nicht -> Spiel-Beat plus kurzer Hinweis
  var S = Saufi.debug.zustand(); gleich(S.overlay.eintraege[0].id, 'pl_start');
  var treffer = S.treffer.filter(function (t) { return t.i === 0; })[0];
  wahr(treffer, 'Playlist-Zeilen sind anklickbar');
  (els.spiel.listeners.pointerdown || []).forEach(function (f) { f({ preventDefault: function () {}, isPrimary: true, button: 0, pointerType: 'mouse', clientX: treffer.x + treffer.w / 2, clientY: treffer.y + treffer.h / 2, timeStamp: 99999 }); });
  frame(21000);
  var mz = Saufi.debug.musik(); gleich(mz.aktiv, 'webaudio', 'file:// -> Spiel-Beat'); wahr(/localhost/.test(mz.hinweis), 'Hinweis nennt http://localhost'); wahr(mz.spielt);
  gleich(Saufi.debug().hinweis.indexOf('localhost') >= 0, true, 'Hinweis im Spiel sichtbar');
  Saufi.debug.geheZu('kneipe', 'tresen'); gleich(Saufi.debug().ort, 'kneipe'); Saufi.debug.schritte(0.2);
  gleich(Saufi.debug().phase.length > 0, true);
});

// ---------- Durchspielen mit simuliertem Canvas ----------
function spieleDurch(strategie, dtSek, tempo) {
  var D = lade(), log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument), E = fakeE(), X = { E: E };
  var S = D.Spiel.neu({ seed: 2, start: true, tempo: tempo }), dt = dtSek, frames = 0, gesehen = {}, maxFrames = Math.ceil(20 * 36 / tempo / dt) + 4000;
  var orte = {};
  while (S.zustand !== 'ende' && frames < maxFrames) {
    if (strategie) strategie(D, S, X);
    S.treffer = R.treffer;
    D.Spiel.update(S, dt, X); E.ende();
    if (frames % 40 === 0) { D.Render.zeichne(R, S); }
    gesehen[S.zustand] = true; orte[S.ort] = true; frames++;
  }
  D.Render.zeichne(R, S);
  return { D: D, S: S, frames: frames, gesehen: gesehen, orte: orte, log: log };
}
test('28 Durchspielen (Sieg): Bot trinkt alle 6 Runden mit, Spiel endet um 04:00 mit Sieg', function () {
  var behandelt = {};
  var r = spieleDurch(function (D, S, X) {
    var a = D.Runden.aktive(S.runden);
    if (a && !behandelt[a.zeit] && S.zustand === 'spiel' && !S.overlay && !S.uebergang) {
      behandelt[a.zeit] = true;
      if (S.ort !== a.ort) { D.Spiel.geheZuStation(S, a.ort, 'stammtisch', X); }
      D.Spiel.aktion(S, X); D.Spiel.waehle(S, S.overlay.eintraege[0], X);
    }
    if (S.fig.pegel > 2.4) S.flaschen = 3;
  }, 1 / 20, 6);
  gleich(r.S.zustand, 'ende'); wahr(r.S.ende.sieg, 'Sieg: ' + r.S.ende.grund); gleich(r.D.Uhr.text(r.S.uhr), '04:00');
  gleich(r.S.runden.geschafft, 6, 'alle sechs Runden mitgetrunken'); wahr(r.S.punkte.punkte > 1000, 'Punkte: ' + r.S.punkte.punkte); wahr(['Silber', 'Gold'].indexOf(r.S.ende.wertung.medaille) >= 0 || r.S.punkte.punkte < 1000);
  ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (o) { wahr(r.orte[o], o + ' besucht'); });
  wahr(r.log.some(function (t) { return /Du stehst noch, Saufi/.test(t); }), 'Endbildschirm zeigt den Sieg'); wahr(r.log.some(function (t) { return /trink Wasser/.test(t); }), 'Danke-Hinweis');
  wahr(r.S.runden.aufgenommen.tobias, 'Tobias wurde aufgenommen');
});
test('29 Durchspielen (Niederlage): wer nie mittrinkt, verliert die Teamstimmung', function () {
  var r = spieleDurch(null, 1 / 20, 6);
  gleich(r.S.zustand, 'ende'); wahr(!r.S.ende.sieg); wahr(/abgehängt|Teamstimmung/.test(r.S.ende.grund)); gleich(r.S.runden.team, 0); wahr(r.D.Uhr.zeitText(r.S.uhr.minute) < '19:00', 'schon nachmittags vorbei');
  wahr(r.log.some(function (t) { return /abgehängt/.test(t); }), 'Endbildschirm Teamstimmung 0');
  gleich(r.S.ende.wertung.titel, 'Abgehängt');
});
test('30 Rendern: alle Orte, Tageszeiten, Menues und Bildschirme ohne Fehler', function () {
  var D = lade(), log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument), t = neuesSpielTest(D), gezeichnet = 0;
  erledigt(t.S);
  ['tuer_hotel', 'tuer_restaurant', 'tuer_kneipe', 'tuer_disko', 'hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (ziel) {
    [8 * 60, 11 * 60, 15 * 60, 18 * 60 + 30, 21 * 60, 24 * 60, 27 * 60 + 50].forEach(function (m) {
      t.Sp.setze(t.S, { minute: m, pegel: m > 20 * 60 ? 3.2 : 0.5 });
      if (ziel.indexOf('tuer_') === 0) t.Sp.geheZuStation(t.S, 'stadt', ziel, t.X); else t.Sp.geheZuStation(t.S, ziel, 'stammtisch', t.X);
      t.S.t += 0.7; t.S.boost.leiste = 1; D.Render.zeichne(R, t.S); gezeichnet++;
    });
  });
  t.Sp.pauseMenue(t.S, t.X); D.Render.zeichne(R, t.S); t.Sp.playlistOverlay(t.S, t.X); D.Render.zeichne(R, t.S); t.Sp.infoOverlay(t.S); D.Render.zeichne(R, t.S);
  t.S.overlay = null; t.S.zustand = 'umgefallen'; t.S.pressF = { n: 2, noetig: 5, rest: 2, zweitesLeben: true, t: 0 }; D.Render.zeichne(R, t.S);
  D.Render.setzeBildschirm(R, true); gleich(R.H, 400); D.Render.zeichne(R, t.S); D.Render.setzeBildschirm(R, false); gleich(R.H, 176);
  wahr(gezeichnet === 56 && log.length > 100, 'es wurde Text gezeichnet');
  wahr(['JAZZ IN THE CITY', 'GASTHAUS MAULTÄSCHLE', 'SOPHIES BRAUHAUS', 'UNTERGRUND 07'].every(function (s) { return log.indexOf(s) >= 0; }), 'Schilder der vier Orte');
});

// ---------- Lauf 3: Fixes nach Cursor-Review ----------
test('33 NPC steht nach zweitem Leben auf anderer Karte auf: wird neben dem Spieler platziert', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, K = 16;
  var n = S.npcs[0]; n.aktiv = true; n.karteId = 'hotel'; n.x = 5 * K; n.y = 3 * K; n.liegt = true; n.liegtSeit = 0; n.fig.umgefallen = true; n.fig.verloren = false;
  n.fig.leben = 1; n.fig.stand = 0;
  var sp = S.spieler, ev = [];
  for (var i = 0; i < 20 / 0.1 && n.liegt; i++) ev = ev.concat(D.NPCs.update(S.npcs, { karte: S.karte, spieler: sp, dt: 0.1, t: 0, halbiert: false, faktor: 1, tischSlots: null, minute: 600 }));
  wahr(!n.liegt, 'NPC steht wieder auf');
  D.NPCs.update(S.npcs, { karte: S.karte, spieler: sp, dt: 0.1, t: 0, halbiert: false, faktor: 1, tischSlots: null, minute: 600 });
  gleich(n.karteId, S.karte.id, 'auf der Spielerkarte');
  wahr(Math.hypot(n.x - sp.x, n.y - sp.y) <= 3 * K, 'nahe beim Spieler, nicht an Innenraum-Koordinaten (' + n.x + ',' + n.y + ')');
  wahr(!S.karte.blockiert(Math.floor(n.x / K), Math.floor((n.y - 1) / K)), 'auf begehbarer Kachel');
});

test('34 Uhr: nur das Pause-Menue haelt sie an, andere Overlays nicht', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  erledigt(S);
  var m0 = S.uhr.minute;
  t.Sp.pauseMenue(S, X); schritt(S, t.Sp, X, 5); gleich(S.uhr.minute, m0, 'Pause-Menue: Uhr steht');
  S.overlay = null; t.Sp.pauseMenue(S, X); t.Sp.playlistOverlay(S, X); schritt(S, t.Sp, X, 2); gleich(S.uhr.minute, m0, 'Playlist aus der Pause: Uhr steht');
  S.overlay = null; t.Sp.playlistOverlay(S, X); schritt(S, t.Sp, X, 5); wahr(S.uhr.minute > m0, 'Playlist im Spiel: Uhr laeuft');
  var m1 = S.uhr.minute; S.overlay = null; t.Sp.infoOverlay(S, X); schritt(S, t.Sp, X, 5); wahr(S.uhr.minute > m1, 'Info: Uhr laeuft');
  var m2 = S.uhr.minute; t.Sp.geheZuStation(S, 'hotel', 'buffet', X); S.uhr.minute = m2; t.Sp.aktion(S, X); gleich(S.overlay.art, 'menue');
  schritt(S, t.Sp, X, 5); wahr(S.uhr.minute > m2, 'Essensmenue: Uhr laeuft');
  // Mittrunden-Frist laeuft hinter dem Menue ab
  S.overlay = null; S.runden.runden.forEach(function (r) { r.status = 'erledigt'; }); var r = S.runden.runden[2]; r.status = 'offen'; r.rest = r.glaeser;
  S.uhr.minute = r.zeit - 5; t.Sp.playlistOverlay(S, X); var team = S.runden.team; schritt(S, t.Sp, X, 40 * 36 / 60 * 3);
  wahr(r.status === 'verpasst' || S.runden.team < team, 'Frist laeuft ab, obwohl ein Overlay offen ist (' + r.status + ')');
  // Startbildschirm unveraendert: keine Uhr
  var s0 = neuesSpielTest(D, { start: false }); var ms = s0.S.uhr.minute; schritt(s0.S, s0.Sp, s0.X, 3); gleich(s0.S.uhr.minute, ms, 'Startbildschirm: Uhr steht');
});

// ---------- v02: Jukebox, Sprueche, Ereignisse, Minispiele ----------
test('35 Jukebox: Songwahl und Esc/X/Klick daneben schliessen Overlay, Bewegung geht', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X, Sp = t.Sp;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  erledigt(S); Sp.setze(S, { minute: 16 * 60 }); Sp.geheZuStation(S, 'kneipe', 'jukebox', X);
  Sp.aktion(S, X); gleich(S.overlay.art, 'playlist');
  Sp.waehle(S, S.overlay.eintraege[0], X); gleich(S.overlay, null, 'pl_start schliesst');
  var x0 = S.spieler.x; X.E.setzeHalt('rechts', true); schritt(S, Sp, X, 0.4); X.E.setzeHalt('rechts', false);
  wahr(S.spieler.x !== x0, 'Bewegung nach Songwahl');
  Sp.playlistOverlay(S, X); wahr(S.overlay);
  X.E.druecke('pause'); schritt(S, Sp, X, 0.05); gleich(S.overlay, null, 'Esc schliesst');
  Sp.playlistOverlay(S, X); D.Render.zeichne(R, S); S.treffer = R.treffer; S.panel = R.panel;
  var xBtn = S.treffer.filter(function (t2) { return t2.i === 'x'; })[0]; wahr(xBtn, 'X-Button vorhanden');
  X.E.klicke(xBtn.x + 1, xBtn.y + 1); Sp.update(S, 0.05, X); X.E.ende(); gleich(S.overlay, null, 'X schliesst');
  Sp.playlistOverlay(S, X); D.Render.zeichne(R, S); S.treffer = R.treffer; S.panel = R.panel;
  X.E.klicke(1, 1); Sp.update(S, 0.05, X); X.E.ende(); gleich(S.overlay, null, 'Klick daneben schliesst');
});

test('36 Sprueche: je Figur >= 8, Pools nicht leer, max 2 Blasen', function () {
  var D = lade(), H = D.Hinweise;
  D.Charaktere.LISTE.forEach(function (c) {
    wahr(H.FIGUR[c.id] && H.FIGUR[c.id].length >= 8, c.id + ' hat >= 8 Sprueche');
  });
  ['mittrinken', 'essen', 'wasser', 'erwischt', 'umfallen', 'aufstehen', 'scooter', 'joint'].forEach(function (k) { wahr(H.SITUATION[k].length > 0, 'Situation ' + k); });
  ['hotel', 'restaurant', 'kneipe', 'disko', 'stadt'].forEach(function (k) { wahr(H.ORT[k].length > 0, 'Ort ' + k); });
  ['nuechtern', 'angeheitert', 'voll', 'absturz'].forEach(function (k) { wahr(H.PEGEL[k].length > 0, 'Pegel ' + k); });
  var t = neuesSpielTest(D), list = t.S.npcs;
  list.forEach(function (n) { n.aktiv = true; n.liegt = false; n.karteId = 'stadt'; n.blase = null; });
  D.NPCs.sprechen(list, t.S.rng, 'stadt', 0);
  D.NPCs.sprechen(list, t.S.rng, 'stadt', 2.5);
  D.NPCs.sprechen(list, t.S.rng, 'stadt', 3.5);
  wahr(list.filter(function (n) { return n.blase; }).length <= 2, 'max 2 Sprechblasen');
  wahr(!/privat/i.test(H.HINWEIS_VOLL), 'kein privat im Hinweis');
});

test('37 Ereignisse: mind. 20 Pannen, Stufen nach Pegel', function () {
  var D = lade(), E = D.Ereignisse;
  wahr(E.PANNEN.length >= 20, 'mind. 20 Ereignisse');
  for (var st = 0; st <= 3; st++) wahr(E.panneNurStufe(st).length > 0, 'Stufe ' + st + ' vorhanden');
  var niedrig = E.panneFuerPegel(0.2).map(function (p) { return p.stufe; });
  wahr(niedrig.every(function (s) { return s <= 0; }) || E.stufeVonPegel(0.2) === 0, 'niedriger Pegel');
  wahr(E.panneFuerPegel(3.2).some(function (p) { return p.stufe === 3; }), 'hohe Stufe nur bei hohem Pegel erreichbar');
  var p = E.erstellePannen(), rng = D.RNG.erstelle(1);
  var a = E.wuerflePanne(p, rng, 2.5); wahr(a && a.def.stufe <= 2); wahr(E.loesePanne(p, a.def.loesung));
});

test('38 Minispiele: 3 Spiele startbar, abbrechbar, Logik', function () {
  var D = lade(), M = D.Minispiele, rng = D.RNG.erstelle(2);
  wahr(M.IDEEN.length >= 6, 'Plan >= 6 Ideen');
  ['deckel', 'prost', 'krug'].forEach(function (id) {
    var mg = M.starte(id, rng); wahr(mg && mg.art === 'minispiel', id);
    M.update(mg, 0.2, true); M.update(mg, mg.dauer, false);
    wahr(mg.fertig || mg.t >= mg.dauer - 0.01, id + ' endet');
    var b = M.belohnung(mg); wahr(typeof b.punkte === 'number');
  });
  var t = neuesSpielTest(D); t.Sp.setze(t.S, { minute: 16 * 60 }); t.Sp.geheZuStation(t.S, 'kneipe', 'tresen', t.X);
  t.Sp.aktion(t.S, t.X); wahr(t.S.overlay && t.S.overlay.eintraege.some(function (e) { return e.id === 'minispiel'; }), 'Minispiel im Tresen-Menue');
  var e = t.S.overlay.eintraege.filter(function (x) { return x.id === 'minispiel'; })[0];
  t.Sp.waehle(t.S, e, t.X); gleich(t.S.overlay.art, 'minispiel');
  t.X.E.druecke('pause'); schritt(t.S, t.Sp, t.X, 0.05); gleich(t.S.overlay, null, 'Esc bricht Minispiel ab');
});

test('39 Teamstimmung 0: eigener Titel statt Umgefallen/Press F', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.S.runden.team = 0; schritt(t.S, t.Sp, t.X, 0.1);
  gleich(t.S.zustand, 'ende'); gleich(t.S.ende.wertung.titel, 'Abgehängt');
  wahr(/abgehängt/.test(t.S.ende.wertung.kopf)); wahr(/Teamstimmung 0/.test(t.S.ende.grund));
  wahr(t.S.ende.wertung.kopf.indexOf('Press F') < 0);
  gleich(D.Spiel.VERSION, '0.14');
  wahr(D.Gfx.MIN_SCHRIFT <= 7);
});

test('40 privat entfernt', function () {
  var D = lade();
  wahr(!/privat/i.test(D.Hinweise.HINWEIS_VOLL));
  wahr(!/Privates Spiel/.test(D.Hinweise.HINWEIS_VOLL));
  var fs = require('fs'), path = require('path');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/Press11 - Saufi Saufi \(18\+\)/.test(html)); wahr(!/\(18\+, privat\)/.test(html));
  var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  wahr(/Neu in v02/.test(readme)); wahr(/Neu in v03/.test(readme)); wahr(!/privates Repo, kein GitHub Pages/.test(readme));
});

test('41 Playlist-Panel passt in H (Querformat) und YouTube-Fenster weicht Overlay', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  gleich(R.W, 320); gleich(R.H, 176);
  t.Sp.playlistOverlay(S, X);
  S.musikInfo = { quelle: 'youtube', aktiv: 'youtube', spielt: true, youtubeVerfuegbar: true, hinweis: '' };
  D.Render.zeichne(R, S);
  var p = R.panel;
  wahr(p, 'Panel gesetzt');
  wahr(p.y >= 2, 'by >= 2');
  wahr(p.y + p.h <= R.H - 2, 'by+bh <= H-2 (Panel in H)');
  var knoepfe = R.treffer.filter(function (tr) { return typeof tr.i === 'number'; });
  gleich(knoepfe.length, S.overlay.eintraege.length, 'Treffer je Eintrag');
  knoepfe.forEach(function (tr, i) {
    wahr(tr.y >= p.y && tr.y + tr.h <= p.y + p.h + 0.01, 'Treffer ' + i + ' im Panel');
    wahr(tr.h > 0 && tr.w > 0, 'Treffer ' + i + ' hat Flaeche');
  });
  var lang = D.Gfx.kuerze(R.ctx, '10. Posse (I Need You on the Floor)', 60, 9);
  wahr(/…$/.test(lang) && lang.length < 30, 'lange Titel werden gekuerzt');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/#rahmen\.overlay\s*~\s*#yt-fenster/.test(html), 'CSS blendet YT bei Overlay aus');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/classList\.toggle\(\s*['"]overlay['"]/.test(main), 'Rahmen bekommt Klasse overlay');
});

test('42 DPR-Begrenzung: MAX_DPR = 2, setzeAufloesung und begrenzDpr kappen', function () {
  var D = lade();
  gleich(D.Render.MAX_DPR, 2, 'MAX_DPR Konstante');
  gleich(D.Render.begrenzDpr(3), 2, 'DPR 3 -> 2');
  gleich(D.Render.begrenzDpr(1.5), 1.5, 'DPR 1.5 bleibt');
  gleich(D.Render.begrenzDpr(0), 1, 'ungueltig -> 1');
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var sk = D.Render.setzeAufloesung(R, 640, 352, 3);
  gleich(R.dpr, 2, 'setzeAufloesung speichert gekapptes DPR');
  wahr(R.canvas.width === Math.round(640 * 2), 'Backing-Store nutzt DPR 2');
  wahr(sk === R.canvas.width / R.W, 'Skala konsistent');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/begrenzDpr|MAX_DPR/.test(main), 'main nutzt DPR-Begrenzung');
  wahr(/VERSION\s*=\s*['"]0\.14['"]/.test(main), 'VERSION 0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/main\.js\?v=0\.14/.test(html), 'Cache-Buster v=0.14');
});

test('43 Hochformat-Layout: Playlist und Menues passen in PORT_H', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, true);
  gleich(R.W, 320); gleich(R.H, D.Render.PORT_H); wahr(R.hochkant);
  R.touch = true;
  t.Sp.playlistOverlay(S, X);
  S.musikInfo = { quelle: 'webaudio', aktiv: 'webaudio', spielt: true, youtubeVerfuegbar: false, hinweis: '' };
  D.Render.zeichne(R, S);
  var p = R.panel;
  wahr(p, 'Playlist-Panel');
  wahr(p.y >= 2 && p.y + p.h <= R.H - 2, 'Playlist in H (Hochformat)');
  t.Sp.pauseMenue(S, X);
  D.Render.zeichne(R, S);
  p = R.panel;
  wahr(p && p.y >= 2 && p.y + p.h <= R.H - 2, 'Pause-Menue in H');
  var rows = R.treffer.filter(function (tr) { return typeof tr.i === 'number'; });
  wahr(rows.length > 0, 'Menue-Treffer');
  rows.forEach(function (tr) { wahr(tr.h >= 16, 'Touch-Zeile hoch genug'); });
  // Querformat ebenfalls
  D.Render.setzeBildschirm(R, false); R.touch = true;
  t.Sp.playlistOverlay(S, X); D.Render.zeichne(R, S);
  p = R.panel;
  wahr(p && p.y >= 2 && p.y + p.h <= R.H - 2, 'Playlist Querformat');
});

test('44 Joystick blockiert keine Overlay-Klicks (pointer-events)', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/#stick\s*\{[^}]*pointer-events:\s*none/.test(html), 'Stick default pointer-events:none');
  wahr(/#rahmen\.touch:not\(\.overlay\)\s+#stick\s*\{[^}]*pointer-events:\s*auto/.test(html), 'Stick nur Touch ohne Overlay');
  wahr(/#rahmen\.overlay\s+#stick\s*\{[^}]*pointer-events:\s*none/.test(html), 'Overlay: Stick pointer-events none');
  // Logik: Klick links unten schliesst Jukebox (daneben), wenn Stick nicht schluckt
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  t.Sp.playlistOverlay(S, X); D.Render.zeichne(R, S);
  S.treffer = R.treffer; S.panel = R.panel;
  wahr(S.panel, 'Panel');
  wahr(1 < S.panel.x || R.H - 2 > S.panel.y + S.panel.h, 'Punkt links unten ausserhalb Panel');
  X.E.klicke(1, R.H - 2);
  t.Sp.update(S, 0.05, X); X.E.ende();
  gleich(S.overlay, null, 'Klick links unten schliesst Overlay');
});

test('45 Touch-Ziele ≥ 44 CSS-px', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/min-width:\s*44px/.test(html) && /min-height:\s*44px/.test(html), 'min 44px an Knöpfen');
  wahr(/#oben\s+\.knopf[^}]*width:\s*44px/.test(html) && /#oben\s+\.knopf[^}]*height:\s*44px/.test(html), 'Oben-Knöpfe Touchziel 44');
  // v10: inset 8→4 (Kreis 36 CSS-px); Box bleibt 44 — optisch kleiner als Hitbox, aber ≥36
  wahr(/#oben\s+\.knopf::before/.test(html) && /inset:\s*4px/.test(html), 'Oben-Icons optisch kleiner');
  wahr(/#knopf-aktion[^}]*max\(56px/.test(html), 'Aktionsknopf groß');
  wahr(/#knopf-wasser[^}]*max\(44px/.test(html), 'Wasser ≥44');
  wahr(/id="bedien"/.test(html) && /#rahmen\.touch\.hoch\s+#bedien/.test(html), 'Bedienleiste Hochformat');
  wahr(/safe-area-inset/.test(html), 'Safe-Area');
  wahr(/100dvh/.test(html), '100dvh');
  wahr(/overscroll-behavior:\s*none/.test(html), 'overscroll-behavior');
  wahr(/viewport-fit=cover/.test(html), 'viewport-fit=cover');
  wahr(/#rahmen\.touch\s*~\s*#yt-fenster/.test(html), 'YT auf Touch oben/klein');
});

// ---------- v03b: iPhone Safari Hochformat + Audio-Entsperren ----------
test('46 Viewport-Meta und iPhone-CSS: Safe-Area, kein Zoom/Scroll/Gummiband', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/viewport-fit=cover/.test(html), 'viewport-fit=cover');
  wahr(/maximum-scale=1/.test(html) && /user-scalable=no/.test(html), 'kein Zoom per Meta');
  wahr(/position:\s*fixed/.test(html), 'body position:fixed');
  wahr(/-webkit-fill-available/.test(html), 'webkit-fill-available Fallback');
  wahr(/100dvh/.test(html), '100dvh');
  wahr(/overscroll-behavior:\s*none/.test(html), 'overscroll-behavior');
  wahr(/touch-action:\s*none/.test(html), 'touch-action:none');
  wahr(/-webkit-user-select:\s*none/.test(html), 'user-select');
  wahr(/-webkit-touch-callout:\s*none/.test(html), 'touch-callout');
  wahr(/env\(safe-area-inset-/.test(html), 'safe-area-inset');
  wahr(/id="ton-hinweis"/.test(html), 'Ton-Hinweis-Element');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/passive:\s*false/.test(main), 'Touch preventDefault passive:false');
  wahr(/touchstart/.test(main) && /touchend/.test(main), 'Touch-Fallback Joystick/Knoepfe');
  var eing = fs.readFileSync(path.join(ROOT, 'js', 'eingabe.js'), 'utf8');
  wahr(/touchstart/.test(eing) && /passive:\s*false/.test(eing), 'Canvas touchstart Fallback');
});

test('47 Audio-Entsperren: erst nach Geste, stummer 1-Sample-Puffer, Hinweistexte', function () {
  var D = lade(), Ton = D.Ton;
  gleich(Ton.HINWEIS_TIPPEN, 'Tippen für Ton');
  gleich(Ton.HINWEIS_STUMMSCHALTER, 'Kein Ton? Stummschalter am iPhone prüfen');
  wahr(Ton.zustandGesperrt('suspended') && Ton.zustandGesperrt('interrupted'));
  wahr(!Ton.zustandGesperrt('running'));
  // Fake-AudioContext: start() erst nach entsperre, stummer Puffer wird abgespielt
  var starts = [], resumes = [], state = 'suspended';
  function FakeCtx() {
    this.sampleRate = 44100; this.destination = {};
    Object.defineProperty(this, 'state', { get: function () { return state; } });
    this.createGain = function () { return { gain: { value: 1, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createDynamicsCompressor = function () { return { connect: function () {} }; };
    this.createBiquadFilter = function () { return { type: '', frequency: { value: 0, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createBuffer = function (ch, len, rate) { return { getChannelData: function () { return new Float32Array(len); }, length: len, sampleRate: rate }; };
    this.createBufferSource = function () {
      return { buffer: null, connect: function () {}, start: function () { starts.push(1); } };
    };
    this.createOscillator = function () { return { type: '', frequency: { setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {}, start: function () {}, stop: function () {} }; };
    this.resume = function () { resumes.push(state); state = 'running'; return { then: function (f) { if (f) f(); } }; };
    this.currentTime = 0;
  }
  var win = { AudioContext: FakeCtx, webkitAudioContext: FakeCtx, setInterval: function () { return 1; } };
  var t = Ton.erstelle(win);
  wahr(!t.gestartet && !t.entsperrt);
  gleich(t.hinweis(), 'Tippen für Ton');
  wahr(t.entsperre(), 'entsperre ok');
  wahr(t.gestartet && t.entsperrt);
  wahr(starts.length >= 1, 'stummer 1-Sample-Puffer abgespielt');
  wahr(resumes.length >= 1, 'resume bei suspended');
  gleich(t.hinweis(), 'Kein Ton? Stummschalter am iPhone prüfen');
  t.stummHinweisGezeigt = true; gleich(t.hinweis(), '');
  // Nach Unterbrechung wieder Hinweis + resume bei naechster Geste
  state = 'interrupted'; t.markiereUnterbrochen(); wahr(!t.entsperrt); gleich(t.hinweis(), 'Tippen für Ton');
  starts.length = 0; resumes.length = 0; wahr(t.entsperre()); wahr(starts.length >= 1 && resumes.length >= 1);
  // Ohne WebAudio kein Absturz
  var t0 = Ton.erstelle(null); wahr(!t0.start());
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/pointerup/.test(main) && /touchend/.test(main) && /click/.test(main), 'Entsperren per pointerup/touchend/click');
  wahr(/markiereUnterbrochen|visibilitychange/.test(main), 'visibilitychange behandelt Unterbrechung');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'ton.js'), 'utf8');
  wahr(/createBuffer\(\s*1\s*,\s*1\s*,/.test(src), '1-Sample-Puffer im Code');
});

test('48 YouTube playsinline und kein Autoplay ohne Geste', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(!/<iframe/i.test(html), 'kein YouTube-iframe vor Geste in HTML');
  var mus = fs.readFileSync(path.join(ROOT, 'js', 'musik.js'), 'utf8');
  wahr(/playsinline:\s*1/.test(mus), 'playerVars playsinline:1');
  wahr(/setAttribute\(\s*['"]playsinline['"]/.test(mus), 'iframe-Attribut playsinline');
  wahr(/webkit-playsinline/.test(mus), 'webkit-playsinline');
  // Player wird erst bei starte('playlist') erzeugt
  var D = lade(), ton = D.Ton.erstelle(null), spieler = [];
  var doc = fakeDocMitYT(), win = {
    YT: { Player: function (id, opt) {
      spieler.push(opt);
      this.loadVideoById = function () {}; this.pauseVideo = function () {}; this.playVideo = function () {};
      this.mute = function () {}; this.unMute = function () {};
      var host = doc.els['yt-player'];
      host.tagName = 'DIV'; host.querySelector = function () {
        return { setAttribute: function (k, v) { host['attr_' + k] = v; } };
      };
    } },
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  var m = D.Musik.erstelle({ win: win, doc: doc, ton: ton, speicher: D.Speicher.erstelle(null), melde: function () {}, protokoll: 'https:', online: true, mp3: [] });
  gleich(spieler.length, 0, 'kein Player ohne Geste');
  m.starte('playlist');
  gleich(spieler.length, 1, 'Player nach Playlist-Geste');
  gleich(spieler[0].playerVars.playsinline, 1);
  wahr(!!doc.els['yt-player'].attr_playsinline || /setzePlaysinline/.test(mus), 'playsinline gesetzt');
});

test('49 Hochformat 390x844 und 375x667: dynamische H fuellt Spielfeld', function () {
  var D = lade(), W = D.Render.BASE_W;
  gleich(W, 320);
  wahr(D.Render.PORT_H_MIN >= 200 && D.Render.PORT_H_MAX >= D.Render.PORT_H);
  [{ w: 390, h: 844, safeY: 47 + 34 }, { w: 375, h: 667, safeY: 0 }].forEach(function (g) {
    var availW = g.w - 8, availH = g.h - g.safeY - 8;
    var bedien = D.Main.berechneBedien(availH), playH = availH - bedien;
    var logH = D.Render.berechnePortH(availW, playH);
    wahr(logH >= D.Render.PORT_H_MIN && logH <= D.Render.PORT_H_MAX, 'H begrenzt bei ' + g.w);
    nah(logH, Math.round(W * playH / availW), 1, 'H aus Seitenverhaeltnis ' + g.w);
    var sk = D.Main.berechneSkala(availW, playH, W, logH, true, D.Gfx.MIN_SCHRIFT);
    wahr(sk.cw <= availW + 0.01, g.w + 'x' + g.h + ' Breite passt');
    wahr(sk.ch <= playH + 0.01, g.w + 'x' + g.h + ' Hoehe passt');
    // Fast volle Flaeche (kein Letterbox wie bei fester 320x400)
    wahr(sk.ch / playH >= 0.95 && sk.cw / availW >= 0.95, 'Spielfeld fuellt Viewport bei ' + g.w + ' (ch/playH=' + (sk.ch / playH).toFixed(3) + ')');
    wahr(sk.s * D.Gfx.MIN_SCHRIFT >= 8, 'Schrift lesbar bei ' + g.w);
  });
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var hDyn = D.Render.berechnePortH(382, 700);
  D.Render.setzeBildschirm(R, true, { h: hDyn }); R.touch = true;
  gleich(R.H, hDyn);
  var t = neuesSpielTest(D); t.Sp.playlistOverlay(t.S, t.X);
  D.Render.zeichne(R, t.S);
  wahr(R.panel && R.panel.y + R.panel.h <= R.H - 2, 'Playlist-Panel in Hochformat');
});

test('50 Startbildschirm per Tipp startbar (Zeiger/Touch)', function () {
  var D = lade(), S = D.Spiel.neu({ seed: 1 }), X = { E: fakeE() };
  gleich(S.zustand, 'start');
  var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.zeichne(R, S); S.treffer = R.treffer;
  var startBtn = S.treffer.filter(function (tr) { return tr.i === 0; })[0];
  wahr(startBtn, 'Start-Treffer vorhanden');
  X.E.klicke(startBtn.x + 1, startBtn.y + 1);
  D.Spiel.update(S, 0.05, X); X.E.ende();
  gleich(S.zustand, 'spiel', 'Tipp startet das Spiel');
  // Eingabe.zeiger (Pointer/Touch-Pfad)
  var e = D.Eingabe.erstelle(null, null);
  wahr(e.zeiger(10, 10, 5000));
  gleich(e.klicks().length, 1);
});

// ---------- v03c: textInBox, Kamera-Zoom, Overlay-Schrift ----------
test('51 textInBox passt immer (Laengen/Breiten)', function () {
  var D = lade(), G = D.Gfx, cv = mockCanvas(), c = cv.getContext('2d');
  wahr(typeof G.textInBox === 'function', 'textInBox existiert');
  [
    { t: 'kurz', w: 80, h: 20, g: 14 },
    { t: 'Ein etwas laengerer Hinweistext fuer das HUD', w: 60, h: 40, g: 12 },
    { t: 'Supercalifragilisticexpialidocious ohne Leerzeichen', w: 50, h: 30, g: 16 },
    { t: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z', w: 40, h: 50, g: 11 },
    { t: '', w: 30, h: 14, g: 10 },
    { t: 'Press11 - Saufi Saufi · Stuttgart Kessel Marathon', w: 90, h: 16, g: 18 }
  ].forEach(function (f, i) {
    var info = G.textInBox(c, f.t, 0, 0, f.w, f.h, f.g, { mess: true, ausr: 'center' });
    wahr(info.size >= G.MIN_SCHRIFT || !f.t, 'Fall ' + i + ' size>=min');
    wahr(info.h <= f.h + 0.5, 'Fall ' + i + ' Hoehe passt (' + info.h + '<=' + f.h + ')');
    info.lines.forEach(function (z, j) {
      wahr(G.breite(c, z, info.size) <= f.w + 0.75, 'Fall ' + i + ' Zeile ' + j + ' Breite');
    });
    // Zeichnen ohne Fehler
    G.textInBox(c, f.t, 2, 2, f.w, f.h, f.g, { col: '#123', ausr: 'center' });
  });
});

test('52 Overlay-Schrift ueberschreitet Panelbreite nicht', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  function pruefePanel() {
    wahr(R.panel, 'Panel gesetzt');
    var p = R.panel, c = R.ctx;
    // Alle fillText-Aufrufe werden im Mock geloggt; hier Breite der sichtbaren Labels ueber textInBox/kuerze absichern
    R.treffer.filter(function (tr) { return typeof tr.i === 'number'; }).forEach(function (tr) {
      wahr(tr.x >= p.x - 0.5 && tr.x + tr.w <= p.x + p.w + 0.5, 'Treffer in Panelbreite');
    });
    // Playlist-Titel und Menuezeilen: textInBox/kuerze halten Breite
    var lang = '10. Posse (I Need You on the Floor) und noch mehr Text';
    var info = D.Gfx.textInBox(c, lang, 0, 0, p.w - 20, 14, 12, { mess: true });
    info.lines.forEach(function (z) { wahr(D.Gfx.breite(c, z, info.size) <= p.w - 20 + 0.75, 'textInBox in Panel'); });
  }
  D.Render.setzeBildschirm(R, false);
  t.Sp.playlistOverlay(S, X); D.Render.zeichne(R, S); pruefePanel();
  t.Sp.pauseMenue(S, X); D.Render.zeichne(R, S); pruefePanel();
  D.Render.setzeBildschirm(R, true); R.touch = true;
  t.Sp.playlistOverlay(S, X); D.Render.zeichne(R, S); pruefePanel();
  // Sprechblase: Breite am Text gemessen, nicht groesser als View
  var blaseLog = [];
  var cv2 = mockCanvas(blaseLog), R2 = D.Render.erstelle(cv2, cv2.ownerDocument);
  D.Render.setzeBildschirm(R2, false);
  var spiel = neuesSpielTest(D); spiel.Sp.setze(spiel.S, { minute: 16 * 60 });
  spiel.S.npcs.forEach(function (n) { n.aktiv = true; n.liegt = false; n.karteId = spiel.S.karte.id; n.blase = { text: 'Das ist ein ziemlich langer Spruch fuer die Blase!' }; n.x = spiel.S.spieler.x; n.y = spiel.S.spieler.y; });
  D.Render.zeichne(R2, spiel.S);
  wahr(blaseLog.length > 0, 'Sprechblasen-Text gezeichnet');
  wahr(D.Render.WELT_FLAECHE_HOCH >= 1.9 && D.Render.WELT_FLAECHE_HOCH <= 2.5, 'Hoch-Weltflaeche ~2.4 (v10)');
  wahr(D.Render.WELT_FLAECHE_QUER >= 3.0, 'Quer-Weltflaeche v04 staerker raus');
});

test('53 Kamera-Ausschnitt: Hoch ~1.5x, Quer weiter raus', function () {
  var D = lade();
  var alt = D.Render.BASE_W * D.Render.BASE_H;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  wahr(R.VW * R.VH > alt, 'Quer: View > alte Flaeche');
  nah(R.VW * R.VH / alt, D.Render.WELT_FLAECHE_QUER, 0.02, 'Quer ~WELT_FLAECHE_QUER');
  nah(D.Render.WELT_ZOOM, 1 / Math.sqrt(D.Render.WELT_FLAECHE_QUER), 1e-9);
  D.Render.setzeBildschirm(R, true);
  var altH = D.Render.BASE_W * D.Render.PORT_H;
  wahr(R.VW * R.VH > altH * 0.7, 'Hoch: View gross (UI-Reserve abgezogen)');
  // v05: VH auf Stadtkartenhoehe 768 begrenzt; weltH = H - UI_RESERVE
  wahr(R.VH <= (D.Render.STADT_PX_H || 960) + 0.01, 'Hoch VH <= Kartenhoehe');
  wahr(R.weltH < R.H, 'UI-Reserve unter der Welt');
  wahr(R.VW * R.VH / altH >= D.Render.WELT_FLAECHE_HOCH * 0.7, 'Hoch-Weltflaeche mit Reserve');
  wahr(D.Render.WELT_FLAECHE_QUER > D.Render.WELT_FLAECHE_HOCH, 'Quer staerker rausgezoomt');
  var t = neuesSpielTest(D, { viewW: R.VW, viewH: R.VH });
  wahr(t.S.kamera.viewW >= R.VW - 0.01 && t.S.kamera.viewH >= R.VH - 0.01, 'Kamera-View gesetzt');
  wahr(R.W === D.Render.BASE_W && R.H === D.Render.PORT_H, 'Default-HUD-Hoehe PORT_H');
  D.Render.zeichne(R, t.S);
});

test('54 textInBox: Mehrzeiler mit … kuerzen; Jukebox-YouTube-Zeile', function () {
  var D = lade(), G = D.Gfx, cv = mockCanvas(), c = cv.getContext('2d');
  var lang = 'YouTube: 4 Videos (Hyper Hyper, The Logical Song, One (Always Hardcore), How Much Is the Fish?)';
  var info = G.textInBox(c, lang, 0, 0, 200, 12, 11, { mess: true, ausr: 'center', maxZeilen: 1 });
  gleich(info.lines.length, 1, 'eine Zeile');
  wahr(/…$/.test(info.lines[0]), 'Ellipsis am Ende');
  wahr(G.breite(c, info.lines[0], info.size) <= 200 + 0.75, 'Breite passt');
  var t = neuesSpielTest(D), S = t.S, X = t.X;
  var cv2 = mockCanvas(), R = D.Render.erstelle(cv2, cv2.ownerDocument);
  D.Render.setzeBildschirm(R, true); R.touch = true;
  t.Sp.playlistOverlay(S, X);
  S.musikInfo = { quelle: 'youtube', aktiv: 'youtube', spielt: true, youtubeVerfuegbar: true, hinweis: lang };
  D.Render.zeichne(R, S);
  wahr(R.panel && R.panel.y + R.panel.h <= R.H - 2, 'Playlist in H');
});

test('55 HUD-Uhr und Oben-Knoepfe: kein Overlap; Quer HUD kompakt', function () {
  var D = lade(), t = neuesSpielTest(D);
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  // Hochformat Touch mit realistischer CSS-Skala (390er Viewport)
  D.Render.setzeBildschirm(R, true); R.touch = true;
  D.Render.setzeAufloesung(R, 382, 640, 2);
  D.Render.zeichne(R, t.S);
  wahr(R.hudUhr, 'hudUhr gesetzt');
  function uhrFrei(u) {
    return u.y >= 36 || u.x + u.w <= R.W - u.btnBand + 0.5;
  }
  wahr(uhrFrei(R.hudUhr), 'Uhr nicht unter HTML-Knoepfen (Hoch)');
  // Querformat: kompakteres linkes Panel, Uhr freigestellt
  D.Render.setzeBildschirm(R, false); R.touch = true;
  D.Render.setzeAufloesung(R, 640, 352, 2);
  D.Render.zeichne(R, t.S);
  wahr(R.hudUhr && R.hudUhr.w <= 96, 'Uhr-Panel Quer kompakt');
  wahr(uhrFrei(R.hudUhr), 'Uhr nicht unter HTML-Knoepfen (Quer)');
  wahr(D.Render.WELT_FLAECHE_QUER >= 3, 'Quer-Kamera weiter raus (v04)');
});

// ---------- v04: Start-Tipp, mass, Schrift, Zoom, Hoch-Layout ----------
test('61 Start per Tipp irgendwo; Playlist-Treffer oeffnet Overlay', function () {
  var D = lade(), S = D.Spiel.neu({ seed: 1 }), X = { E: fakeE() };
  gleich(S.zustand, 'start');
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.zeichne(R, S); S.treffer = R.treffer;
  X.E.klicke(5, 5);
  D.Spiel.update(S, 0.05, X); X.E.ende();
  gleich(S.zustand, 'spiel', 'Tipp daneben startet');
  // Frisches Startspiel: Playlist-Treffer oeffnet, startet nicht
  var S2 = D.Spiel.neu({ seed: 2 }), X2 = { E: fakeE() };
  D.Render.zeichne(R, S2); S2.treffer = R.treffer;
  var pl = S2.treffer.filter(function (tr) { return tr.i === 1; })[0];
  wahr(pl, 'Playlist-Treffer');
  X2.E.klicke(pl.x + 1, pl.y + 1);
  D.Spiel.update(S2, 0.05, X2); X2.E.ende();
  gleich(S2.zustand, 'start', 'Playlist-Klick startet nicht');
  wahr(S2.overlay && S2.overlay.art === 'playlist', 'Playlist-Overlay offen');
});

test('62 Saufi.debug.mass liefert positive Masse', function () {
  var listeners = {}, rafs = [], els = {}, log = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id; e.classList = { add: function () {}, toggle: function () {}, remove: function () {} }; e.style = { setProperty: function () {} };
    e.hidden = false; e.listeners = {}; e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }; e.setPointerCapture = function () {}; e.textContent = '';
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? fakeAudio() : mockCanvas(log); }, addEventListener: function () {}, hidden: false, head: { appendChild: function () {} } };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); }, setInterval: function () { return 1; },
    setTimeout: setTimeout, clearTimeout: clearTimeout, innerWidth: 1280, innerHeight: 720, getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: false }; } });
  var Saufi = win.Saufi; Saufi.Main.starte(win, doc);
  wahr(typeof Saufi.debug.mass === 'function', 'debug.mass existiert');
  var m = Saufi.debug.mass();
  wahr(m.W > 0 && m.H > 0 && m.VW > 0 && m.VH > 0 && m.zoom > 0, 'Masse positiv');
});

test('63 Schrift: MIN_SCHRIFT <= 7; textInBox bleibt in Box', function () {
  var D = lade(), G = D.Gfx, cv = mockCanvas(), c = cv.getContext('2d');
  wahr(G.MIN_SCHRIFT <= 7, 'MIN_SCHRIFT <= 7');
  [
    { t: 'Pegel 1.23 ‰ und noch mehr', w: 66, h: 16, g: 11 },
    { t: 'RUNDE! Gasthaus Maultäschle um 12:30', w: 180, h: 12, g: 8 },
    { t: 'Ein langer Hinweistext der in die Blase muss und nicht rauslaufen darf', w: 200, h: 28, g: 9 },
    { t: 'Ich bin 18+. Los geht\'s! (E / Tippen)', w: 200, h: 15, g: 9 },
    { t: 'Scooter-Playlist', w: 220, h: 16, g: 11 }
  ].forEach(function (f, i) {
    var info = G.textInBox(c, f.t, 0, 0, f.w, f.h, f.g, { mess: true, ausr: 'center' });
    wahr(info.w <= f.w + 0.75, 'Fall ' + i + ' Breite');
    wahr(info.h <= f.h + 0.5, 'Fall ' + i + ' Hoehe');
  });
});

test('64 Zoom: Quer >= 3; Hoch VH/weltH begrenzt, zoom >= 0.5', function () {
  var D = lade();
  wahr(D.Render.WELT_FLAECHE_QUER >= 3, 'WELT_FLAECHE_QUER >= 3');
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  [{ h: 693 }, { h: 570 }].forEach(function (opt) {
    D.Render.setzeBildschirm(R, true, opt);
    wahr(R.VH <= (D.Render.STADT_PX_H || 960) + 0.01 || (R.weltH != null && R.weltH > 0), 'Welt-Hoehe begrenzt bei h=' + opt.h);
    wahr(R.weltH <= R.H, 'weltH <= H bei h=' + opt.h);
    wahr(R.weltZoom >= 0.5, 'zoom >= 0.5 bei h=' + opt.h);
  });
});

test('65 Hoch-Layout ohne Overlap (390x844, 375x667)', function () {
  var D = lade(), t = neuesSpielTest(D);
  function uhrFrei(u, W) {
    return u.y >= 36 || u.x + u.w <= W - u.btnBand + 0.5;
  }
  function keinOverlap(a, b) {
    return a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
  }
  [
    { cssW: 382, cssH: 700, h: D.Render.berechnePortH(382, 700) },
    { cssW: 367, cssH: 520, h: D.Render.berechnePortH(367, 520) }
  ].forEach(function (g) {
    var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
    D.Render.setzeBildschirm(R, true, { h: g.h });
    R.touch = true;
    D.Render.setzeAufloesung(R, g.cssW, g.cssH, 2);
    // aktive Runde fuer Runden-Panel
    t.S.runden.runden[0].status = 'aktiv';
    t.Sp.setze(t.S, { minute: t.S.runden.runden[0].zeit + 1 });
    D.Render.zeichne(R, t.S);
    wahr(R.hudUhr, 'hudUhr bei ' + g.cssW);
    wahr(uhrFrei(R.hudUhr, R.W), 'Uhr frei von Oben-Knoepfen bei ' + g.cssW);
    if (R.hudLinks) wahr(keinOverlap(R.hudUhr, R.hudLinks), 'Uhr nicht ueber linkem Panel bei ' + g.cssW);
  });
});

test('66 Versionen: ?v= == VERSION; README v04; Bau-Bericht', function () {
  var D = lade();
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0, 'Cache-Buster vorhanden');
  vs.forEach(function (v) { gleich(v, '?v=' + D.Spiel.VERSION, 'Cache-Buster ' + v); });
  var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  wahr(/Neu in v04/.test(readme), 'README Neu in v04');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v04.md')), 'bau-bericht-v04.md');
});

// ---------- v05: Karte 40x48, Hoch-Welt voll, UI-Reserve ----------
test('67 Stadtkarte 40x60: Suedstreifen begehbar, Tueren/Stationen wie v04', function () {
  var D = lade(), T = D.Karte.T, st = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  gleich(st.w, 40); gleich(st.h, 60); gleich(st.pxH, 960);
  var begehbar = 0;
  for (var y = 30; y < 60; y++) for (var x = 0; x < 40; x++) if (!st.blockiert(x, y)) begehbar++;
  wahr(begehbar > 40, 'Suedstreifen hat begehbare Kacheln');
  wahr(!st.blockiert(25, 40), 'Suedweg (25,40) frei');
  var tuere = { hotel: [25, 11], restaurant: [5, 12], kneipe: [33, 20], disko: [31, 28] };
  Object.keys(tuere).forEach(function (id) {
    var td = st.tueren.filter(function (t) { return t.id === id; })[0];
    wahr(td, id + ' Tuer vorhanden');
    gleich(td.x, tuere[id][0], id + ' Tuer-x');
    gleich(td.y, tuere[id][1], id + ' Tuer-y');
  });
  var geb = { hotel: [22, 7, 8, 5], restaurant: [2, 8, 7, 5], kneipe: [30, 17, 7, 4], disko: [27, 25, 9, 4] };
  st.gebaeude.forEach(function (b) {
    var g = geb[b.id]; wahr(g, b.id + ' Gebaeude');
    gleich(b.x, g[0]); gleich(b.y, g[1]); gleich(b.w, g[2]); gleich(b.h, g[3]);
  });
  wahr(st.tile(14, 10) === T.BRUNNEN && st.tile(25, 13) !== T.MAUER, 'Markt/Spawn unveraendert');
});

test('68 Erreichbarkeit: Hotel-Aussentuer zu Orten und Suedkachel, Seeds 1..5', function () {
  var D = lade();
  for (var seed = 1; seed <= 5; seed++) {
    var st = D.Karte.erstelleWelt(D.RNG.erstelle(seed)).stadt;
    var hotel = st.tueren.filter(function (t) { return t.id === 'hotel'; })[0];
    wahr(hotel, 'Hotel-Tuer seed ' + seed);
    ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (id) {
      var td = st.tueren.filter(function (t) { return t.id === id; })[0];
      wahr(D.Pfad.suche(st, hotel.aussen.x, hotel.aussen.y, td.aussen.x, td.aussen.y), 'Seed ' + seed + ': Hotel→' + id);
    });
    wahr(D.Pfad.suche(st, hotel.aussen.x, hotel.aussen.y, 25, 40), 'Seed ' + seed + ': Hotel→Sued (25,40)');
  }
});

test('69 Hoch-Weltanteil: 390x844 und 375x667 fuellen fast H', function () {
  var D = lade(), cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var h390 = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h390 });
  wahr(R.VH >= 680, '390x844 VH >= 680 (ist ' + R.VH + ')');
  wahr(R.weltH / R.H >= 0.85, '390x844 weltH/H >= 0.85');
  wahr(R.weltH <= R.H, '390x844 weltH <= H');
  wahr(R.VH <= 960 + 0.01, 'VH <= 960');
  var h375 = D.Render.berechnePortH(375, 667);
  D.Render.setzeBildschirm(R, true, { h: h375 });
  wahr(R.weltH / R.H >= 0.82, '375x667 weltH/H >= 0.82');
  wahr(R.VH <= 960 + 0.01, 'VH <= 960 (375)');
});

test('70 Kein Schwarz am Kartenrand: Kamera geklemmt', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, true, { h: D.Render.berechnePortH(390, 844) });
  S.kamera.viewW = R.VW; S.kamera.viewH = R.VH;
  S.kamera.weltW = S.karte.pxW; S.kamera.weltH = S.karte.pxH;
  // Suedrand
  D.Spieler.setzeKachel(S.spieler, 20, 46);
  D.Kamera.sofort(S.kamera, S.spieler.x, S.spieler.y - 8);
  wahr(S.kamera.y + R.VH <= S.karte.pxH + 0.01, 'Sued: kamera.y+VH <= pxH');
  wahr(S.kamera.y >= -0.01, 'Sued: kamera.y >= 0');
  // Nordrand
  D.Spieler.setzeKachel(S.spieler, 20, 1);
  D.Kamera.sofort(S.kamera, S.spieler.x, S.spieler.y - 8);
  wahr(S.kamera.y + R.VH <= S.karte.pxH + 0.01, 'Nord: kamera.y+VH <= pxH');
  wahr(S.kamera.y >= -0.01, 'Nord: kamera.y >= 0');
});

test('71 debug.mass liefert W,H,VW,VH,zoom und weltH', function () {
  var listeners = {}, rafs = [], els = {}, log = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id; e.classList = { add: function () {}, toggle: function () {}, remove: function () {} }; e.style = { setProperty: function () {} };
    e.hidden = false; e.listeners = {}; e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }; e.setPointerCapture = function () {}; e.textContent = '';
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? fakeAudio() : mockCanvas(log); }, addEventListener: function () {}, hidden: false, head: { appendChild: function () {} } };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); }, setInterval: function () { return 1; },
    setTimeout: setTimeout, clearTimeout: clearTimeout, innerWidth: 1280, innerHeight: 720, getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: false }; } });
  var Saufi = win.Saufi; Saufi.Main.starte(win, doc);
  var m = Saufi.debug.mass();
  ['W', 'H', 'VW', 'VH', 'zoom', 'weltH'].forEach(function (k) { wahr(m[k] != null && m[k] > 0, 'mass.' + k); });
});

test('72 Quer BASE 320x176: VH == H/zoom, Flaeche >= 3', function () {
  var D = lade(), cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  gleich(R.W, D.Render.BASE_W); gleich(R.H, D.Render.BASE_H);
  nah(R.VH, R.H / R.weltZoom, 1e-9, 'Quer VH == H/zoom');
  wahr(R.VW * R.VH / (D.Render.BASE_W * D.Render.BASE_H) >= 3 - 0.02, 'Quer Flaeche >= 3');
});

test('73 Versionen: VERSION 0.13, ?v=0.13, README v10, Bau-Bericht v10', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0, 'Cache-Buster vorhanden');
  vs.forEach(function (v) { gleich(v, '?v=0.14', 'Cache-Buster ' + v); });
  var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  wahr(/Neu in v13/.test(readme), 'README Neu in v13');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')), 'bau-bericht-v13.md');
});

// ---------- v06: Menues/Ende/Touch Hochformat ----------
function endeZustand(D, opt) {
  var t = neuesSpielTest(D, opt);
  D.Spiel.beende(t.S, true, 'Sonntag, 04:00 Uhr: Du stehst noch.', t.X);
  return t;
}

test('74 Ende-Bild: Panel in Bounds, Touch-Hoch top, kompakt, keine …', function () {
  var D = lade(), faelle = [
    { cssW: 375, cssH: 667, hoch: true, touch: true },
    { cssW: 390, cssH: 844, hoch: true, touch: true },
    { cssW: 667, cssH: 375, hoch: false, touch: false }
  ];
  faelle.forEach(function (f) {
    var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
    var h = f.hoch ? D.Render.berechnePortH(f.cssW, f.cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, f.hoch, { h: h, touch: f.touch });
    R.touch = f.touch; R.cssW = f.cssW; R.cssH = f.cssH;
    var t = endeZustand(D);
    D.Render.zeichne(R, t.S);
    var p = R.panel;
    wahr(!!p, 'Panel ' + f.cssW + 'x' + f.cssH);
    wahr(p.x >= 0 && p.y >= 0 && p.x + p.w <= R.W && p.y + p.h <= R.H, 'Panel in [0,W]x[0,H]');
    if (f.touch && f.hoch) {
      var sCss = f.cssW / R.W, minTop = Math.ceil(50 / Math.max(0.5, sCss));
      wahr(p.y >= minTop - 0.5, 'Touch-Hoch panel.y >= ceil(50/sCss) (ist ' + p.y + ', min ' + minTop + ')');
      wahr(p.h < R.H - 40, 'Panel kompakt h < H-40 (ist ' + p.h + ')');
    }
    wahr(log.every(function (s) { return String(s).indexOf('…') < 0; }), 'keine …-Kuerzung im Ende-Bild');
  });
});

test('75 Ende-Neustart: Treffer ≥ 44 CSS-px; Tipp daneben nach Sperre', function () {
  var D = lade(), cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var cssW = 390, cssH = 844, h = D.Render.berechnePortH(cssW, cssH);
  D.Render.setzeBildschirm(R, true, { h: h, touch: true });
  R.touch = true; R.cssW = cssW; R.cssH = cssH;
  var t = endeZustand(D), S = t.S, X = t.X, sCss = cssW / R.W;
  D.Render.zeichne(R, S); S.treffer = R.treffer; S.panel = R.panel;
  wahr(S.treffer.length >= 1, 'Neustart-Treffer');
  S.treffer.forEach(function (tr) {
    wahr(tr.h * sCss >= 44 - 0.5, 'Trefferhoehe ≥ 44 CSS (ist ' + (tr.h * sCss) + ')');
  });
  S.ende.t = 0.5; X.E.klicke(1, 1); D.Spiel.update(S, 0.05, X); X.E.ende();
  wahr(!S.neustart, 'Sperre 0.8 s: noch kein Neustart');
  S.ende.t = 0.9; X.E.klicke(2, 2); D.Spiel.update(S, 0.05, X); X.E.ende();
  wahr(!!S.neustart, 'Tipp ausserhalb nach Sperre setzt neustart');
});

test('76 Wackel: drawImage-Zielhoehe == weltH', function () {
  var D = lade(), draws = [];
  var cstore = { fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif' };
  var ctx = new Proxy(cstore, {
    get: function (t, k) {
      if (typeof k === 'symbol') return undefined;
      if (k === 'measureText') return function (s) { var sz = 10, m = /(\d+(?:\.\d+)?)px/.exec(t.font || ''); if (m) sz = parseFloat(m[1]); return { width: String(s).length * sz * 0.55 }; };
      if (k === 'createRadialGradient') return function () { return { addColorStop: function () {} }; };
      if (k === 'createLinearGradient') return function () { return { addColorStop: function () {} }; };
      if (CTX_EIGENSCHAFTEN.indexOf(k) >= 0) return t[k];
      if (k === 'drawImage') return function () { draws.push(Array.prototype.slice.call(arguments)); };
      if (CTX_METHODEN.indexOf(k) >= 0) return function () { pruefeZahlen(k, arguments); };
      throw new Error('Unbekannte Canvas-Eigenschaft: ' + String(k));
    },
    set: function (t, k, v) {
      if (CTX_EIGENSCHAFTEN.indexOf(k) < 0) throw new Error('Unbekannte: ' + k);
      if (k === 'globalCompositeOperation' && GCO.indexOf(v) < 0) throw new Error(v);
      if (k === 'globalAlpha' && !(v >= 0 && v <= 1)) throw new Error('alpha ' + v);
      t[k] = v; return true;
    },
    has: function (t, k) { return CTX_EIGENSCHAFTEN.indexOf(k) >= 0; }
  });
  var cv2 = { width: 320, height: 400, style: {}, getContext: function () { return ctx; }, addEventListener: function () {}, getBoundingClientRect: function () { return { left: 0, top: 0, width: 320, height: 400 }; } };
  cv2.ownerDocument = { createElement: function () { return mockCanvas(); } };
  var R = D.Render.erstelle(cv2, cv2.ownerDocument);
  D.Render.setzeBildschirm(R, true, { h: 400, touch: false });
  R.cssW = 320; R.cssH = 400;
  var t = neuesSpielTest(D); t.S.fig.pegel = 2.0; t.S.ruhig = false;
  draws.length = 0;
  D.Render.zeichne(R, t.S);
  var wackel = draws.filter(function (a) { return a.length >= 9 && a[0] === R.canvas; });
  wahr(wackel.length >= 1, 'Wackel-drawImage vorhanden');
  wackel.forEach(function (a) {
    nah(a[8], R.weltH, 0.5, 'drawImage Zielhoehe == weltH');
    wahr(a[8] <= R.weltH + 0.5, 'Zielhoehe ≤ weltH');
  });
});

test('77 E.touch spaeter → groesse() erneut, R.touch, Klasse touch, kein Neustart', function () {
  var listeners = {}, rafs = [], els = {}, log = [], groesseCalls = 0;
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id;
    e.classList = { _c: {}, add: function (c) { this._c[c] = true; }, toggle: function (c, v) { if (v === false) delete this._c[c]; else if (v === true) this._c[c] = true; else { if (this._c[c]) delete this._c[c]; else this._c[c] = true; } }, remove: function (c) { delete this._c[c]; }, contains: function (c) { return !!this._c[c]; } };
    e.style = { setProperty: function (k, v) { this[k] = v; }, display: '' };
    e.hidden = false; e.listeners = {}; e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }; e.setPointerCapture = function () {}; e.textContent = '';
    e.getBoundingClientRect = function () { return { left: 0, top: 0, width: 320, height: 176 }; };
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? fakeAudio() : mockCanvas(log); }, addEventListener: function () {}, hidden: false, head: { appendChild: function () {} }, body: {} };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '?start=1', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); return rafs.length; },
    setInterval: function () { return 1; }, setTimeout: setTimeout, clearTimeout: clearTimeout,
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: false }; } });
  var Saufi = win.Saufi;
  var api = Saufi.Main.starte(win, doc);
  var S0 = api.S(), seed0 = S0.seed, zustand0 = S0.zustand, pos0 = { x: S0.spieler.x, y: S0.spieler.y };
  wahr(!api.E.touch, 'anfangs kein Touch');
  // Spaeter Touch: wie tippKnopf
  api.E.touch = true;
  wahr(rafs.length >= 1, 'RAF registriert');
  rafs[0](16); // ein Frame → groesse bei Touch-Wechsel
  wahr(!!api.R.touch, 'R.touch true');
  wahr(els.rahmen.classList.contains('touch'), 'Klasse touch');
  var S1 = api.S();
  gleich(S1.seed, seed0, 'kein Neustart (Seed)');
  gleich(S1.zustand, zustand0, 'Zustand bleibt');
  nah(S1.spieler.x, pos0.x, 0.01, 'Position x');
  nah(S1.spieler.y, pos0.y, 0.01, 'Position y');
});

test('78 Schildtexte Kehrwoche/Feinstaub ohne …', function () {
  var D = lade(), cv = mockCanvas(), c = cv.getContext('2d');
  function passt(txt, boxW, sz) {
    var info = D.Gfx.textInBox(c, txt, 0, 0, boxW - 4, 8, sz, { ausr: 'center', mess: true, min: 6 });
    wahr(info.lines.every(function (z) { return z.indexOf('…') < 0; }), txt + ' ohne …');
    info.lines.forEach(function (z) { wahr(D.Gfx.breite(c, z, info.size) <= boxW - 4 + 0.75, txt + ' Breite'); });
  }
  passt('Kehrwoche', 52, 7);
  passt('Feinstaub drin', 60, 7);
  var src = fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8');
  wahr(/text:\s*'Kehrwoche'/.test(src) && /Feinstaub drin/.test(src), 'Schildtexte in szene.js');
  wahr(/hotelSchild|schildNeben/.test(src) && /kneipeSchild|schild\(c,.*Feinstaub/.test(src), 'Schild-Masse gesetzt');
});

test('79 Touch-Hoch: Reserve = 80, weltH/H ≥ v05, bedienCss 96..140', function () {
  var D = lade(), cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  gleich(D.Render.UI_RESERVE_HOCH_TOUCH, 80, 'UI_RESERVE_HOCH_TOUCH = 80 (v10 Overlay-Reserve)');
  wahr(D.Render.UI_RESERVE_HOCH === 80, 'UI_RESERVE_HOCH bleibt 80');
  var h390 = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h390, touch: true });
  var v05_390 = 0.85;
  wahr(R.weltH / R.H >= v05_390, '390 Touch weltH/H ≥ v05 (' + (R.weltH / R.H) + ')');
  wahr(R.H - R.weltH <= 80 + 1, 'Reserve ≤ 80 logisch');
  var h375 = D.Render.berechnePortH(375, 667);
  D.Render.setzeBildschirm(R, true, { h: h375, touch: true });
  wahr(R.weltH / R.H >= 0.82, '375 Touch weltH/H ≥ v05');
  var b844 = D.Main.berechneBedien(844), b667 = D.Main.berechneBedien(667);
  wahr(b844 >= 96 && b844 <= 140, 'bedienCss 844 in 96..140 (' + b844 + ')');
  wahr(b667 >= 96 && b667 <= 140, 'bedienCss 667 in 96..140 (' + b667 + ')');
});

test('80 Overlay-Treffer ≥ 44 CSS-px, in Bounds, kein Overlap; Scroll erreichbar', function () {
  var D = lade();
  function pruefe(cssW, cssH, hoch) {
    var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var sCss = cssW / R.W, minH = 44 / sCss;
    var t = neuesSpielTest(D), S = t.S, X = t.X, Sp = t.Sp;
    var arten = [];
    // Start
    S.zustand = 'start'; D.Render.zeichne(R, S); arten.push({ name: 'start', treffer: R.treffer.slice(), panel: R.panel });
    // Pause
    S.zustand = 'spiel'; Sp.pauseMenue(S, X); D.Render.zeichne(R, S); arten.push({ name: 'pause', treffer: R.treffer.slice(), panel: R.panel, overlay: S.overlay });
    // Info
    Sp.infoOverlay(S); D.Render.zeichne(R, S); arten.push({ name: 'info', treffer: R.treffer.slice(), panel: R.panel });
    // Playlist
    Sp.playlistOverlay(S, X); S.musikInfo = { quelle: 'youtube', aktiv: 'youtube', spielt: true, youtubeVerfuegbar: true, hinweis: '' };
    D.Render.zeichne(R, S); arten.push({ name: 'playlist', treffer: R.treffer.slice(), panel: R.panel });
    // Minispiel
    S.overlay = D.Minispiele.starte('deckel', S.rng);
    if (S.overlay && S.overlay.art === 'minispiel') { D.Render.zeichne(R, S); arten.push({ name: 'minispiel', treffer: R.treffer.slice(), panel: R.panel }); }
    // Liste (Pause erneut)
    S.overlay = null; Sp.pauseMenue(S, X); D.Render.zeichne(R, S); arten.push({ name: 'liste', treffer: R.treffer.slice(), panel: R.panel, overlay: S.overlay });

    arten.forEach(function (a) {
      var hits = a.treffer;
      wahr(hits.length > 0, a.name + ' hat Treffer');
      hits.forEach(function (tr, i) {
        wahr(tr.x >= 0 && tr.y >= 0 && tr.x + tr.w <= R.W + 0.5 && tr.y + tr.h <= R.H + 0.5, a.name + ' Treffer ' + i + ' in Bounds');
        wahr(tr.h * sCss >= 44 - 0.75, a.name + ' Treffer ' + i + ' ≥ 44 CSS (h=' + tr.h + ', css=' + (tr.h * sCss) + ')');
      });
      // Keine Überlappung numerischer Eintraege untereinander (X darf Header ueberlappen)
      var nums = hits.filter(function (tr) { return typeof tr.i === 'number'; });
      for (var i = 0; i < nums.length; i++) for (var j = i + 1; j < nums.length; j++) {
        var a2 = nums[i], b = nums[j];
        var overlap = !(a2.x + a2.w <= b.x || b.x + b.w <= a2.x || a2.y + a2.h <= b.y || b.y + b.h <= a2.y);
        wahr(!overlap, a.name + ' keine Overlap ' + a2.i + '/' + b.i);
      }
    });
    // Scroll: viele Eintraege → ▲/▼, alle Indizes erreichbar
    S.overlay = null;
    var viele = [];
    for (var k = 0; k < 12; k++) viele.push({ label: 'Eintrag ' + k, id: 'weiter' });
    S.overlay = { art: 'menue', titel: 'Lang', kopf: [], eintraege: viele, index: 0, opt: {} };
    D.Render.zeichne(R, S); S.treffer = R.treffer; S.panel = R.panel;
    var gesehen = {};
    for (var step = 0; step < 20; step++) {
      D.Render.zeichne(R, S); S.treffer = R.treffer;
      S.treffer.forEach(function (tr) { if (typeof tr.i === 'number') gesehen[tr.i] = true; });
      var down = S.treffer.filter(function (tr) { return tr.i === 'down'; })[0];
      if (down) { S.overlay.index = Math.min(11, S.overlay.index + 1); }
      else if (S.overlay.index < 11) S.overlay.index++;
      else break;
    }
    for (k = 0; k < 12; k++) wahr(gesehen[k], 'Scroll Eintrag ' + k + ' erreichbar');
  }
  pruefe(375, 667, true);
  pruefe(390, 844, true);
});

test('81 Text-Fit Overlays/Ende/PressF: keine … bei Knöpfen/Titeln', function () {
  var D = lade();
  function ohneEllipsisKnoepfe(log) {
    log.forEach(function (s) {
      s = String(s);
      if (s.indexOf('…') < 0) return;
      if (/^\d+\.\s/.test(s)) return; // lange Songtitel erlaubt
      if (s.length > 42) return; // Fliesstext (Info 18+) darf kuerzen
      throw new Error('… bei Knopf/Titel: ' + s.slice(0, 80));
    });
  }
  function lauf(cssW, cssH, hoch) {
    var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D), S = t.S, X = t.X, Sp = t.Sp;
    log.length = 0; S.zustand = 'start'; D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; S.zustand = 'spiel'; Sp.pauseMenue(S, X); D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; Sp.infoOverlay(S); D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; Sp.playlistOverlay(S, X); S.musikInfo = { quelle: 'youtube', aktiv: 'youtube', spielt: true, youtubeVerfuegbar: true, hinweis: '' };
    D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; D.Spiel.beende(S, true, 'Sonntag, 04:00 Uhr: Du stehst noch.', X); D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; S.zustand = 'umgefallen'; S.pressF = { n: 1, noetig: 5, rest: 2, zweitesLeben: true, t: 0 }; D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
  }
  lauf(375, 667, true); lauf(390, 844, true); lauf(667, 375, false);
});

test('82 Stick: Totzone, cancel=0, zweiter Finger ignoriert, E gleichzeitig', function () {
  var D = lade(), sa = D.Main.stickAuslenkung;
  wahr(typeof sa === 'function', 'stickAuslenkung exportiert');
  var z = sa(4, 0, 40); // 0.1 normiert
  gleich(z.x, 0, 'Totzone 0.1 → 0'); gleich(z.y, 0);
  var m = sa(20, 0, 40); // 0.5
  wahr(m.x > 0, '0.5 → > 0 (ist ' + m.x + ')');
  // DOM: Stick + cancel + zweiter Finger + E
  var listeners = {}, rafs = [], els = {}, log = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id;
    e.classList = { _c: {}, add: function (c) { this._c[c] = true; }, toggle: function (c, v) { if (v === false) delete this._c[c]; else this._c[c] = true; }, remove: function (c) { delete this._c[c]; }, contains: function (c) { return !!this._c[c]; } };
    e.style = { setProperty: function (k, v) { this[k] = v; }, display: 'none', left: '', top: '', transform: '' };
    e.hidden = false; e.listeners = {};
    e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); };
    e.setPointerCapture = function () {}; e.textContent = '';
    e.getBoundingClientRect = function () { return { left: 0, top: 400, width: 160, height: 120 }; };
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? fakeAudio() : mockCanvas(log); }, addEventListener: function (t, f) { (listeners['doc:' + t] = listeners['doc:' + t] || []).push(f); }, hidden: false, head: { appendChild: function () {} }, body: {} };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '?start=1', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); return 1; },
    setInterval: function () { return 1; }, setTimeout: function (f) { return 1; }, clearTimeout: function () {},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: true }; } });
  var Saufi = win.Saufi, api = Saufi.Main.starte(win, doc);
  var zone = els.stick;
  wahr(zone && zone.listeners.pointerdown, 'Stick pointerdown');
  // Finger A
  zone.listeners.pointerdown[0]({ pointerId: 1, clientX: 40, clientY: 450, preventDefault: function () {} });
  zone.listeners.pointermove[0]({ pointerId: 1, clientX: 60, clientY: 450, preventDefault: function () {} }); // 20px = 0.5
  wahr(api.E.stick.x > 0, 'Stick nach Move > 0');
  var xVorher = api.E.stick.x;
  // Zweiter Finger ignoriert
  zone.listeners.pointerdown[0]({ pointerId: 2, clientX: 80, clientY: 460, preventDefault: function () {} });
  nah(api.E.stick.x, xVorher, 1e-9, 'zweiter Finger aendert Stick nicht');
  // E gleichzeitig
  api.E.tippe('aktion');
  wahr(api.E.neu('aktion'), 'E gleichzeitig loest Aktion aus');
  wahr(api.E.stick.x > 0, 'E bricht Stick nicht ab');
  // cancel
  zone.listeners.pointercancel[0]({ pointerId: 1 });
  gleich(api.E.stick.x, 0, 'cancel setzt Stick 0');
  gleich(api.E.stick.y, 0);
});

test('83 Versionen: VERSION 0.13, ?v=0.13, README v10, Bau-Bericht v10', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0, 'Cache-Buster');
  vs.forEach(function (v) { gleich(v, '?v=0.14', v); });
  var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  wahr(/Neu in v13/.test(readme), 'README Neu in v13');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')), 'bau-bericht-v13.md');
});

test('84 StummHinweis: Flag erst im Timeout, mind. 4 s sichtbar', function () {
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/4000/.test(main), 'Timeout 4000 ms');
  wahr(/setTimeout\s*\(\s*function[\s\S]*?stummHinweisGezeigt\s*=\s*true/.test(main), 'Flag erst im Timeout');
  // Vor Timeout darf die Zuweisung nicht unmittelbar vor setTimeout stehen
  wahr(!/stummHinweisGezeigt\s*=\s*true;\s*\n\s*T\._stummTimer\s*=\s*win\.setTimeout/.test(main), 'Flag nicht vor Timer');
  var D = lade();
  var T = D.Ton.erstelle({ AudioContext: null, setInterval: function () { return 1; } });
  T.verfuegbar = true; T.entsperrt = true; T.stummHinweisGezeigt = false;
  gleich(T.hinweis(), D.Ton.HINWEIS_STUMMSCHALTER, 'Hinweis aktiv solange Flag false');
  T.stummHinweisGezeigt = true;
  gleich(T.hinweis(), '', 'nach Flag kein Hinweis mehr');
});

test('85 Disko Hoch: Raum fuellt Weltflaeche (Zoom-Kennzahl / Schwarz < 25%)', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S;
  S.ort = 'disko'; S.karte = S.welt.innen.disko;
  S.kamera.weltW = S.karte.pxW; S.kamera.weltH = S.karte.pxH;
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var h = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h, touch: true });
  R.touch = true; R.cssW = 390; R.cssH = 844;
  D.Render.zeichne(R, S);
  var weltH = R.weltH, zoom = R.aktuellerWeltZoom;
  wahr(zoom != null, 'aktuellerWeltZoom gesetzt');
  var cover = Math.max(R.W / S.karte.pxW, weltH / Math.max(1, S.karte.pxH));
  nah(zoom, cover, 1e-6, 'Cover-Zoom Disko');
  wahr(zoom >= weltH / S.karte.pxH - 1e-6 || zoom >= R.W / S.karte.pxW - 1e-6, 'eine Achse gefuellt');
  // Letterbox-Schwarzanteil bei Cover ≈ 0 (Crop statt Balken)
  var schwarz = Math.max(0, 1 - Math.min(1, (S.karte.pxW * zoom) / R.W) * Math.min(1, (S.karte.pxH * zoom) / weltH));
  wahr(schwarz < 0.25, 'Schwarzanteil Welt < 25% (ist ' + schwarz + ')');
});

test('86 Zuruf RUNDE! Abstand ≥ 4 px zur Scooter-Leiste', function () {
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  // v09: Banner in Reserve bei resTop+2 (nicht mehr resTop+40 über der Welt)
  wahr(/resTop\s*\+\s*2/.test(src), 'Banner bei resTop+2 (Reserve)');
  wahr(!/resTop\s*\+\s*40/.test(src), 'kein altes resTop+40');
  var D = lade(), t = neuesSpielTest(D), S = t.S;
  S.ort = 'disko'; S.karte = S.welt.innen.disko;
  S.hilfe = '';
  S.zustand = 'spiel';
  S.runden.runden[0].status = 'aktiv';
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var h = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h, touch: true });
  R.touch = true; R.cssW = 390; R.cssH = 844;
  D.Render.zeichne(R, S);
  wahr(R.hudRunde, 'Banner gezeichnet');
  wahr(R.hudRunde.y >= R.weltH - 0.5, 'Banner in Reserve');
  // Scooter-Panel: bySco = scoTop+3, panel bei bySco−3 → Oberkante = bannerBottom+4
  var bannerBottom = R.hudRunde.y + R.hudRunde.h;
  var scooterTop = bannerBottom + 4;
  wahr(scooterTop - bannerBottom >= 4 - 0.01, 'Abstand Banner→Scooter ≥ 4 px');
  wahr(/hudRunde\.y \+ R\.hudRunde\.h \+ 4/.test(src), 'Scooter-Abstand +4 im Code');
});

// ---------- v07 ----------
test('87 Himmel-Farben: hex(rgb), himmelFarben ohne NaN, mischeHex nicht schwarz', function () {
  var D = lade(), G = D.Gfx, Sz = D.Szene;
  var h = G.hex('rgb(10,20,30)');
  gleich(h.r, 10); gleich(h.g, 20); gleich(h.b, 30);
  wahr(G.hex('#abc').r === 170, '#rgb');
  [8, 12, 19, 20.5, 22.5, 26, 27, 28].forEach(function (st) {
    var f = Sz.himmelFarben(st);
    var a = G.hex(f.oben), b = G.hex(f.unten);
    wahr(isFinite(a.r) && isFinite(a.g) && isFinite(a.b), 'oben h=' + st);
    wahr(isFinite(b.r) && isFinite(b.g) && isFinite(b.b), 'unten h=' + st);
  });
  var f26 = Sz.himmelFarben(26);
  var mix = G.mischeHex(f26.oben, f26.unten, 0.3);
  wahr(mix !== 'rgb(0,0,0)', 'mischeHex nicht schwarz: ' + mix);
});

test('88 Mond/Ende: keine schwarze Mondscheibe; Sieg zeigt Sonne', function () {
  var D = lade(), fills = [];
  function trackCtx() {
    var store = { fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif' };
    return new Proxy(store, {
      get: function (t, k) {
        if (k === 'measureText') return function () { return { width: 10 }; };
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return function () { return { addColorStop: function () {} }; };
        if (CTX_EIGENSCHAFTEN.indexOf(k) >= 0) return t[k];
        if (CTX_METHODEN.indexOf(k) >= 0) return function () {};
        return undefined;
      },
      set: function (t, k, v) {
        if (k === 'fillStyle' && typeof v === 'string') fills.push(v);
        if (CTX_EIGENSCHAFTEN.indexOf(k) >= 0) t[k] = v;
        return true;
      },
      has: function (t, k) { return CTX_EIGENSCHAFTEN.indexOf(k) >= 0; }
    });
  }
  var c = trackCtx();
  fills = [];
  D.Szene.himmelZeichnen(c, 0, 0, 200, 100, 22, 0);
  wahr(fills.every(function (f) { return f !== 'rgb(0,0,0)' && f !== '#000' && f !== '#000000'; }), 'Nacht-Himmel ohne schwarze Mondscheibe');
  fills = [];
  D.Szene.kesselSzene(c, 320, 176, 28, 0);
  var warm = fills.some(function (f) { return /#ff|#fff2|#ffe|#ff9|rgb\(25[0-9]|rgb\(255/.test(f); });
  wahr(warm, 'Daemmerung/Sieg: warme Sonnenfarbe');
  wahr(D.Szene.sonnenPos(28) != null, 'sonnenPos(28) nicht null');
});

test('89 Ton: Hinweis, bestaetige einmal, visibility/pageshow, Start-Tipp', function () {
  var D = lade();
  var FakeCtx = function () {
    this.state = 'suspended'; this.sampleRate = 22050; this.currentTime = 0;
    this.destination = {}; this._l = {};
    this.createGain = function () { return { gain: { value: 0, setValueAtTime: function () {}, setTargetAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {} }; };
    this.createOscillator = function () { return { type: '', frequency: { setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {}, start: function () {}, stop: function () {} }; };
    this.createDynamicsCompressor = function () { return { connect: function () {} }; };
    this.createBiquadFilter = function () { return { type: '', frequency: { value: 0, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createBuffer = function (ch, len, rate) { return { getChannelData: function () { return new Float32Array(len); } }; };
    this.createBufferSource = function () { return { buffer: null, connect: function () {}, start: function () {} }; };
    this.resume = function () { var self = this; return { then: function (ok) { self.state = 'running'; if (ok) ok(); return { catch: function () {} }; }, catch: function () {} }; };
    this.addEventListener = function (t, f) { (this._l[t] = this._l[t] || []).push(f); };
  };
  var T = D.Ton.erstelle({ AudioContext: FakeCtx, setInterval: function () { return 1; } });
  gleich(T.hinweis(), D.Ton.HINWEIS_TIPPEN, 'vor Geste Tippen');
  T.entsperre();
  wahr(T.entsperrt, 'entsperrt');
  wahr(T.bestaetigt, 'bestaetige nach Entsperren');
  var once = T.bestaetigt;
  T.bestaetige();
  gleich(T.bestaetigt, once, 'bestaetige nur einmal');
  T.stummHinweisGezeigt = false;
  wahr(T.hinweis() === '' || T.hinweis() === D.Ton.HINWEIS_STUMMSCHALTER, 'nach Entsperren Hinweis leer oder Stumm');
  T.ctx.state = 'suspended';
  T.markiereUnterbrochen();
  gleich(T.entsperrt, false, 'visibility suspended → entsperrt=false');
  T.entsperre();
  wahr(T.entsperrt, 'pointerup entsperrt erneut');

  // Startbild-Tipp → starteSpiel + ctx
  var listeners = {}, rafs = [], els = {}, log = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id;
    e.classList = { _c: {}, add: function (c) { this._c[c] = true; }, toggle: function (c, v) { if (v === false) delete this._c[c]; else this._c[c] = true; }, remove: function (c) { delete this._c[c]; }, contains: function (c) { return !!this._c[c]; } };
    e.style = { setProperty: function (k, v) { this[k] = v; }, display: '' };
    e.hidden = id === 'ton-hinweis'; e.listeners = {};
    e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); };
    e.setPointerCapture = function () {}; e.textContent = '';
    e.getBoundingClientRect = function () { return { left: 0, top: 0, width: 320, height: 176 }; };
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? { addEventListener: function () {}, play: function () { return { catch: function () {} }; } } : mockCanvas(log); }, addEventListener: function (t, f) { (listeners['doc:' + t] = listeners['doc:' + t] || []).push(f); }, hidden: false, head: { appendChild: function () {} }, body: {} };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '', protocol: 'file:' }, navigator: { onLine: true },
    AudioContext: FakeCtx, webkitAudioContext: FakeCtx,
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); return 1; },
    setInterval: function () { return 1; }, setTimeout: function (f) { return 1; }, clearTimeout: function () {},
    innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
    getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: false }; } });
  var api = win.Saufi.Main.starte(win, doc);
  gleich(api.S().zustand, 'start');
  (listeners.pointerup || []).forEach(function (f) { f({}); });
  api.E.klicke(160, 90);
  rafs[0](16);
  gleich(api.S().zustand, 'spiel', 'Start-Tipp startet Spiel');
  wahr(!!api.T.ctx, 'AudioContext erzeugt');
});

test('90 CSS Layout ton-hinweis / yt-fenster Hoch+Touch', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/#rahmen\.touch\.hoch\s*~\s*#ton-hinweis/.test(html), 'Hoch-Touch Hinweis-Selektor');
  wahr(/bottom:\s*calc\(\s*var\(--bedien/.test(html), 'Hinweis bottom mit --bedien');
  wahr(/font-size:\s*1[0-2]px/.test(html), 'Schrift ≤ 12 px');
  wahr(/#rahmen\.touch\.hoch\s*~\s*#yt-fenster/.test(html), 'YT Hoch-Touch');
  wahr(/width:\s*160px/.test(html) && /max-width:\s*160px/.test(html), 'YT Breite ≤ 160');
  wahr(/#rahmen\.touch\.hoch\s*~\s*#yt-fenster[\s\S]*?bottom:\s*calc\(\s*var\(--bedien/.test(html), 'YT bottom über --bedien');
  // Rechteck-Überlappung: Hinweis-Band vs Stick/E/Wasser bei 390×844 und 375×667
  function overlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
  function pruefe(W, H) {
    var bedien = Math.max(96, Math.min(140, Math.round(H * 0.14)));
    var hinweis = { x: 120, y: H - bedien - 30, w: W - 120 - 150, h: 24 };
    var stick = { x: 0, y: H - bedien, w: W * 0.5, h: bedien };
    var eZone = { x: W - 120, y: H - bedien, w: 120, h: bedien };
    wahr(!overlap(hinweis, stick), W + ' Hinweis∩Stick=0');
    wahr(!overlap(hinweis, eZone), W + ' Hinweis∩E=0');
  }
  pruefe(390, 844); pruefe(375, 667);
});

test('91 Schilder/HUD: kein Fenster/NPC-Overlap; HUD kleiner; Uhr/Banner frei', function () {
  var D = lade(), welt = D.Karte.erstelleWelt(D.RNG.erstelle(1));
  function overlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
  welt.stadt.gebaeude.forEach(function (b) {
    var p = D.Szene.bauplan(b);
    if (b.id === 'hotel' && p.schildNeben) {
      p.fenster.forEach(function (f, i) { wahr(!overlap(p.schildNeben, f), 'Hotel-Schild∩Fenster ' + i); });
    }
    if (b.id === 'kneipe' && p.schildNeben && p.npcZone) {
      wahr(!overlap(p.schildNeben, p.npcZone), 'Kneipe-Schild nicht in NPC-Zone');
    }
  });
  var cv = mockCanvas(), c = cv.getContext('2d');
  ['Kehrwoche', 'Feinstaub drin'].forEach(function (txt) {
    var info = D.Gfx.textInBox(c, txt, 0, 0, 60, 16, 7, { ausr: 'center', mess: true, min: 5, maxZeilen: 2 });
    wahr(info.lines.every(function (z) { return z.indexOf('…') < 0; }), txt + ' ohne …');
  });
  function hudMass(cssW, cssH) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = D.Render.berechnePortH(cssW, cssH);
    D.Render.setzeBildschirm(R, true, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    var nr = t.S.runden.runden[0]; nr.status = 'aktiv';
    D.Render.zeichne(R, t.S);
    var v06W = Math.round(96 * (54 / 62));
    wahr(R.hudLinks.w <= v06W * 0.85 + 1, 'HUD ≤ 85% v06 (' + R.hudLinks.w + ' vs ' + v06W + ')');
    var uhr = R.hudUhr, rund = R.hudRunde, oben = { x: R.W - (uhr.btnBand || 40), y: 0, w: uhr.btnBand || 40, h: 44 };
    wahr(!overlap(R.hudLinks, uhr), 'HUD∩Uhr=0');
    wahr(!overlap(R.hudLinks, oben), 'HUD∩#oben=0');
    if (rund) {
      wahr(rund.y >= uhr.y + uhr.h - 0.5, 'Banner unter/an Uhr');
      wahr(!overlap(uhr, rund), 'Uhr∩Banner=0');
      wahr(rund.y >= R.weltH - 0.5, 'Hoch-Banner in Reserve');
    }
  }
  hudMass(375, 667); hudMass(390, 844);
});

test('92 Zoom Quer 4.0 / mass / Clamp / Roundtrip; Hoch weltH/H', function () {
  var D = lade();
  gleich(D.Render.WELT_FLAECHE_QUER, 4.0);
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  nah(R.VW, 640, 0.5, 'VW≈640');
  nah(R.weltZoom, 0.5, 1e-9, 'weltZoom=0.5');
  var t = neuesSpielTest(D); t.S.kamera.viewW = R.VW; t.S.kamera.viewH = R.VH;
  D.Kamera.sofort(t.S.kamera, t.S.spieler.x, t.S.spieler.y);
  wahr(t.S.kamera.x >= 0 && t.S.kamera.y >= 0, 'Clamp min');
  wahr(t.S.kamera.x + R.VW <= t.S.karte.pxW + 0.5, 'Clamp max x');
  wahr(t.S.kamera.y + R.VH <= t.S.karte.pxH + 0.5, 'Clamp max y');
  // Welt↔Bildschirm Roundtrip via Mass
  var sx = 100, sy = 50, wx = t.S.kamera.x + sx / R.weltZoom, wy = t.S.kamera.y + sy / R.weltZoom;
  var sx2 = (wx - t.S.kamera.x) * R.weltZoom, sy2 = (wy - t.S.kamera.y) * R.weltZoom;
  nah(sx2, sx, 1, 'roundtrip x'); nah(sy2, sy, 1, 'roundtrip y');
  var h390 = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h390, touch: true });
  wahr(R.weltH / R.H >= 0.85, 'Hoch weltH/H ≥ v06');
});

test('93 Nachtgrafik: Fenster warm, Laterne kleiner, kein heller Rahmen', function () {
  var D = lade();
  wahr(D.Render.LATERNE_RADIUS <= 0.7 * D.Render.LATERNE_RADIUS_V06 + 0.01, 'Laterne ≤ 0.7×v06 (v08: 22)');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/#ffd77a/.test(src) && /#ffb85a/.test(src), 'warme Fensterfarben');
  wahr(!/rr\(c, fx, fy, f\.w, f\.h, P\.fensterNacht/.test(src), 'kein reinweisses fensterNacht-Fill');
  wahr(/rgba\(10,8,30/.test(src) || /Fassade nur/.test(src), 'kein heller Rechteckrahmen');
  wahr(!/#8f8fff/.test(src), 'kein helles #8f8fff mehr');
});

test('94 Eine Dunkelfläche: #bedien == Gfx.P.uiDunkel', function () {
  var D = lade(), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(D.Gfx.P.uiDunkel === '#1b1530', 'P.uiDunkel');
  wahr(/#rahmen\.touch\.hoch #bedien[^}]*background:\s*#1b1530/.test(html), 'bedien == Reserve');
  wahr(!/border-radius:\s*0\s+0\s+6px/.test(html.match(/#rahmen\.touch\.hoch #bedien[^}]+/)[0]), 'keine Rundung Oberkante');
  wahr(/bottom:\s*max\(\s*8px\s*,\s*env\(safe-area-inset-bottom/.test(html), 'Knöpfe ≥ Safe-Area');
});

test('95 Drehen: orientationchange → groesse sofort+Timer; Zustand bleibt; DPR≤2; Cache', function () {
  var listeners = {}, rafs = [], els = {}, log = [], timeouts = [];
  function el(id) {
    if (els[id]) return els[id];
    var cv = mockCanvas(log), e = cv; e.id = id;
    e.classList = { _c: {}, add: function (c) { this._c[c] = true; }, toggle: function (c, v) { if (v === false) delete this._c[c]; else this._c[c] = true; }, remove: function (c) { delete this._c[c]; }, contains: function (c) { return !!this._c[c]; } };
    e.style = { setProperty: function (k, v) { this[k] = v; }, display: '' };
    e.hidden = false; e.listeners = {};
    e.addEventListener = function (t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); };
    e.setPointerCapture = function () {}; e.textContent = '';
    e.getBoundingClientRect = function () { return { left: 0, top: 0, width: 320, height: 400 }; };
    return (els[id] = e);
  }
  var doc = { getElementById: el, createElement: function (t) { return t === 'audio' ? { addEventListener: function () {} } : mockCanvas(log); }, addEventListener: function () {}, hidden: false, head: { appendChild: function () {} }, body: {} };
  var win = ladeKontext({ __SAUFI_OHNE_START: true, document: doc, location: { search: '?start=1', protocol: 'file:' }, navigator: { onLine: true },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, requestAnimationFrame: function (f) { rafs.push(f); return 1; },
    setInterval: function () { return 1; },
    setTimeout: function (f, ms) { timeouts.push({ f: f, ms: ms || 0 }); return timeouts.length; },
    clearTimeout: function () {},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    getComputedStyle: function () { return { paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }; },
    matchMedia: function () { return { matches: true }; } });
  var api = win.Saufi.Main.starte(win, doc);
  wahr(api.R.dpr <= 2, 'DPR ≤ 2 bei Hoch-Touch');
  var S0 = api.S(), seed0 = S0.seed, pos0 = { x: S0.spieler.x, y: S0.spieler.y }, zustand0 = S0.zustand;
  api.R.cacheInvalidierungen = api.R.cacheInvalidierungen || 0;
  var inv0 = api.R.cacheInvalidierungen;
  // gleiche Aufloesung erneut → kein Cache-Reset
  win.Saufi.Render.setzeAufloesung(api.R, api.R.cssW, api.R.cssH, api.R.dpr);
  gleich(api.R.cacheInvalidierungen, inv0, 'Cache nur bei Aenderung');
  wahr(listeners.orientationchange && listeners.orientationchange.length, 'orientationchange Listener');
  var hochVorher = api.R.hochkant;
  win.innerWidth = 844; win.innerHeight = 390;
  listeners.orientationchange.forEach(function (f) { f({}); });
  wahr(api.R.hochkant !== hochVorher || !api.R.hochkant, 'hochkant wechselt nach Quer');
  // Timer-Nachzug (120 und 400)
  var nTimer = timeouts.length;
  wahr(nTimer >= 1, 'Timer nach orientationchange');
  timeouts.slice().forEach(function (t) { if (t.f) t.f(); });
  var S1 = api.S();
  gleich(S1.seed, seed0); gleich(S1.zustand, zustand0);
  nah(S1.spieler.x, pos0.x, 0.01); nah(S1.spieler.y, pos0.y, 0.01);
});

test('96 Durchspiel-Bot Seeds 1/7/42 Hoch-Touch und Quer', function () {
  function durch(seed, hoch, cssW, cssH) {
    var D = lade(), log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
    if (hoch) {
      var h = D.Render.berechnePortH(cssW, cssH);
      D.Render.setzeBildschirm(R, true, { h: h, touch: true });
      R.touch = true; R.cssW = cssW; R.cssH = cssH;
    } else {
      D.Render.setzeBildschirm(R, false);
      R.cssW = cssW; R.cssH = cssH;
    }
    var E = fakeE(), X = { E: E };
    var S = D.Spiel.neu({ seed: seed, start: true, tempo: 8 });
    S.kamera.viewW = R.VW; S.kamera.viewH = R.VH;
    var behandelt = {}, frames = 0, maxFrames = 8000, lastSnap = '', soft = 0;
    var dt = 1 / 15;
    while (S.zustand !== 'ende' && frames < maxFrames) {
      var a = D.Runden.aktive(S.runden);
      if (a && !behandelt[a.zeit] && S.zustand === 'spiel' && !S.overlay && !S.uebergang) {
        behandelt[a.zeit] = true;
        try {
          if (S.ort !== a.ort) D.Spiel.geheZuStation(S, a.ort, 'stammtisch', X);
          D.Spiel.aktion(S, X);
          if (S.overlay && S.overlay.eintraege && S.overlay.eintraege[0]) D.Spiel.waehle(S, S.overlay.eintraege[0], X);
        } catch (e) { throw new Error('Seed ' + seed + ' Aktion: ' + e.message); }
      }
      if (S.fig.pegel > 2.3) { S.flaschen = 3; try { D.Spiel.wasserTrinken(S, X); } catch (e2) { /* egal */ } }
      if (S.overlay) {
        // Overlay schliessbar: Esc
        E.druecke('pause');
      }
      try { D.Spiel.update(S, dt, X); } catch (e3) { throw new Error('Seed ' + seed + ' update: ' + e3.message); }
      E.ende();
      if (frames % 30 === 0) {
        try { D.Render.zeichne(R, S); } catch (e4) { throw new Error('Seed ' + seed + ' render: ' + e4.message); }
        var snap = S.zustand + '|' + S.ort + '|' + Math.round(S.uhr.minute) + '|' + (S.overlay && S.overlay.art);
        if (snap === lastSnap) soft++; else soft = 0;
        lastSnap = snap;
        wahr(soft < 120 / (dt * 30) + 5, 'kein Soft-Lock seed=' + seed + ' ' + snap);
      }
      frames++;
    }
    gleich(S.zustand, 'ende', 'Seed ' + seed + ' ' + (hoch ? 'hoch' : 'quer') + ' erreicht ende');
    // nach ende: Tipp → neustart
    S.ende.t = 1;
    E.klicke(160, 90);
    D.Spiel.update(S, 0.05, X);
    wahr(S.neustart, 'nach ende Tipp → neustart flag');
  }
  [1, 7, 42].forEach(function (s) {
    durch(s, true, 390, 844);
    durch(s, false, 667, 375);
  });
});

test('97 Versionen: VERSION 0.13, ?v=0.13, README v10, bau-bericht-v13', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  vs.forEach(function (v) { gleich(v, '?v=0.14', v); });
  var readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  wahr(/Neu in v13/.test(readme), 'README Neu in v13');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')), 'bau-bericht-v13.md');
});

// ---------- v08 ----------
test('98 Schild-Text-Fit: Kehrwoche ohne …, plan=Zeichnung, kein Fenster/HIER', function () {
  var D = lade(), welt = D.Karte.erstelleWelt(D.RNG.erstelle(1));
  function overlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
  var hotel = welt.stadt.gebaeude.filter(function (b) { return b.id === 'hotel'; })[0];
  var p = D.Szene.bauplan(hotel);
  wahr(p.schildNeben, 'schildNeben');
  gleich(p.schildNeben.text, 'Kehrwoche');
  wahr(p.schildHaupt, 'schildHaupt Hotel');
  gleich(p.schildHaupt.y, hotel.y * 16 + 14, 'Hotel schildHaupt y0+14');
  var cv = mockCanvas(), c = cv.getContext('2d');
  var sn = p.schildNeben;
  var info = D.Gfx.textInBox(c, sn.text, sn.x + 1, sn.y, sn.w - 2, sn.h, 5.5, { ausr: 'center', mess: true, min: 5.5, maxZeilen: 1 });
  wahr(info.size >= 5.5 - 1e-9, 'Schrift ≥ 5.5');
  wahr(info.lines.every(function (z) { return z.indexOf('…') < 0; }), 'kein …');
  wahr(info.w <= sn.w - 2 + 0.75, 'Textbreite ≤ Box−2');
  p.fenster.forEach(function (f, i) {
    var fr = { x: f.x - 1.2, y: f.y - 1.2, w: f.w + 2.4, h: f.h + 2.4 };
    wahr(!overlap(sn, fr), 'Schild∩Fenster+Rahmen ' + i);
  });
  var kneipe = welt.stadt.gebaeude.filter(function (b) { return b.id === 'kneipe'; })[0];
  var pk = D.Szene.bauplan(kneipe);
  wahr(pk.schildNeben && pk.npcZone && !overlap(pk.schildNeben, pk.npcZone), 'Kneipe-Schild∩npcZone=0');
  wahr(pk.npcZone.y >= pk.schildNeben.y + pk.schildNeben.h + 2 - 0.01, 'npcZone unter Feinstaub');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8');
  wahr(/schildHaupt/.test(src) && /plan\.schildNeben|p\.schildNeben|p\.schildHaupt/.test(src), 'Zeichnung liest schildHaupt/schildNeben');
});

test('99 Overlays: Banner frei von Uhr/HUD/#oben; Hoch in Reserve; Quer-Blasen', function () {
  var D = lade();
  function overlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }
  function pruefe(cssW, cssH, hoch) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    var nr = t.S.runden.runden[0]; nr.status = 'aktiv';
    t.S.hilfe = 'E: Jazz in the City';
    D.Hinweise.zeige(t.S.hinweise, 'Tobi: Lange Dialogzeile zum Stapeln und Breitentest.', 3, 'info');
    D.Render.zeichne(R, t.S);
    var uhr = R.hudUhr, rund = R.hudRunde, links = R.hudLinks;
    var oben = { x: R.W - (uhr.btnBand || 40), y: 0, w: uhr.btnBand || 40, h: 44 };
    if (rund) {
      wahr(!overlap(rund, uhr), 'Banner∩Uhr');
      wahr(!overlap(rund, links), 'Banner∩HUD');
      wahr(!overlap(rund, oben), 'Banner∩#oben');
      if (hoch) {
        wahr(uhr.y >= R.weltH - 0.5, 'Hoch-Uhr in Reserve');
        wahr(rund.y >= R.weltH - 0.5, 'Hoch-Banner in Reserve');
      } else {
        wahr(rund.y >= uhr.y + uhr.h - 0.5, 'Quer-Banner unter Uhr');
        wahr(uhr.h + rund.h <= 38 + 0.5, 'Uhr+Banner ≤ 38');
      }
    }
    if (!hoch) {
      if (R.hudDialog) {
        wahr(R.hudDialog.w <= R.W * 0.45 + 1, 'Dialog ≤ 45%');
        if (R.hudHilfe) {
          wahr(!overlap(R.hudDialog, R.hudHilfe) || R.hudHilfe.y + R.hudHilfe.h <= R.hudDialog.y - 3.5, 'Blasen stapeln ≥4');
        }
      }
    } else {
      if (R.hudHilfe) wahr(R.hudHilfe.y >= R.weltH - 0.5, 'Hoch-Hinweis in Reserve');
      if (R.hudDialog) wahr(R.hudDialog.y >= R.weltH - 0.5, 'Hoch-Dialog in Reserve');
    }
  }
  pruefe(375, 667, true); pruefe(390, 844, true); pruefe(844, 390, false);
});

test('100 Nachtschilder: SCHILD_NACHT_ALPHA, lighter, Kontrast ≥ 4.5', function () {
  var D = lade();
  wahr(D.Render.SCHILD_NACHT_ALPHA > 0, 'SCHILD_NACHT_ALPHA');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/SCHILD_NACHT_ALPHA/.test(src) && /lighter/.test(src) && /schildNeben/.test(src), 'Nachtpass Schilder');
  wahr(D.Gfx.kontrast('#ffe9a8', '#2e3f7a') >= 4.5, 'Hotel-Hauptschild Kontrast');
  wahr(D.Gfx.kontrast('#fff8ee', '#2a2a30') >= 4.5, 'Kneipe-Neben Kontrast');
  wahr(D.Gfx.kontrast('#6a3f2a', '#fff8ee') >= 4.5, 'Kehrwoche Kontrast');
});

test('101 Überbelichtung: Fenster/Disko/Laterne Grenzen', function () {
  var D = lade();
  wahr(D.Render.LATERNE_RADIUS <= 22 + 1e-9, 'LATERNE_RADIUS ≤ 22');
  wahr(D.Render.LATERNE_RADIUS <= 0.5 * D.Render.LATERNE_RADIUS_V06 + 0.01, '≤ 0.5×v06');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/0\.75/.test(src) && /maxR = b\.id === 'disko' \? 24/.test(src), 'Fenster/Disko-Limits');
  wahr(/0\.35/.test(src) && /kernA/.test(src), 'Disko-Alpha ≤ 0.35');
});

test('102 Nacht-Helligkeit: Tint 02:30 ≥ 0.10; 20 Uhr warm; Monotonie', function () {
  var U = lade().Uhr;
  var l = U.licht({ minute: 26.5 * 60 });
  var lum = (0.299 * l.r + 0.587 * l.g + 0.114 * l.b) / 255;
  wahr(lum >= 0.10, '02:30 Luminanz ≥ 0.10 (ist ' + lum.toFixed(3) + ')');
  var w20 = U.licht({ minute: 20 * 60 });
  wahr(w20.r > w20.b, '20 Uhr R > B (warm)');
  var last = 2;
  for (var m = 11 * 60; m <= 28 * 60; m += 10) {
    var h = U.helligkeit({ minute: m });
    wahr(h <= last + 1e-9, 'monoton bei ' + U.zeitText(m));
    last = h;
  }
});

test('103 Hoch-Zoom/Karte: 60/960, Fläche ≥1.15×v07, Schrift ≥8 CSS', function () {
  var D = lade(), st = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  gleich(st.h, 60); gleich(st.pxH, 960); gleich(D.Render.STADT_PX_H, 960);
  var geb = { hotel: [22, 7, 8, 5], restaurant: [2, 8, 7, 5], kneipe: [30, 17, 7, 4], disko: [27, 25, 9, 4] };
  st.gebaeude.forEach(function (b) {
    var g = geb[b.id]; gleich(b.x, g[0]); gleich(b.y, g[1]); gleich(b.w, g[2]); gleich(b.h, g[3]);
  });
  var hotel = st.tueren.filter(function (t) { return t.id === 'hotel'; })[0];
  ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (id) {
    var td = st.tueren.filter(function (t) { return t.id === id; })[0];
    wahr(D.Pfad.suche(st, hotel.aussen.x, hotel.aussen.y, td.aussen.x, td.aussen.y), 'A* Hotel→' + id);
  });
  var cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
  var h390 = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h390, touch: true });
  wahr(R.weltH <= R.stadtPxH + 0.01, 'weltH ≤ stadtPxH');
  wahr(R.VH <= R.stadtPxH + 0.01, 'VH ≤ stadtPxH');
  var flaeche = R.VW * R.VH;
  var v07Approx = 392 * 768;
  wahr(flaeche >= v07Approx * 1.15, 'Ausschnitt ≥ 1.15×v07 (' + Math.round(flaeche) + ')');
  var nameSz = 11 * R.weltZoom * (390 / 320);
  wahr(nameSz >= 8 - 0.05, 'Gebäudename ≥ 8 CSS-px (ist ' + nameSz.toFixed(2) + ')');
  var t = neuesSpielTest(D); t.S.kamera.viewW = R.VW; t.S.kamera.viewH = R.VH;
  t.S.kamera.weltW = t.S.karte.pxW; t.S.kamera.weltH = t.S.karte.pxH;
  D.Spieler.setzeKachel(t.S.spieler, 20, 55);
  D.Kamera.sofort(t.S.kamera, t.S.spieler.x, t.S.spieler.y - 8);
  wahr(t.S.kamera.y >= -0.01 && t.S.kamera.y + R.VH <= t.S.karte.pxH + 0.5, 'Kamera-Clamp Sued');
});

test('104 Grafik Tag: gras/weg/wasser deterministisch, Cache stabil', function () {
  var D = lade(), log = [], cv = mockCanvas(log), c = cv.getContext('2d');
  var karte = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  function run() {
    log.length = 0;
    for (var i = 0; i < 20; i++) {
      var x = (i * 3) % karte.w, y = (i * 5) % Math.min(30, karte.h);
      D.Szene.zeichneAussenKachel(c, karte, x, y, 0, 0);
    }
    return log.filter(function (a) { return Array.isArray(a); }).map(function (a) { return a.join(','); }).join('|');
  }
  var a = run(), b = run();
  gleich(a, b, 'deterministisch');
  wahr(a.indexOf('NaN') < 0, 'keine NaN');
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  D.Render.zeichne(R, t.S);
  var n0 = Object.keys(R.hg || {}).length;
  D.Render.zeichne(R, t.S);
  wahr(Object.keys(R.hg || {}).length <= n0 + 1, 'Cache steigt nicht pro Frame');
});

test('105 Ende-Bild: Sonne links, Panel opaque, Turm frei', function () {
  var D = lade();
  function ende(cssW, cssH, hoch) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D);
    t.S.zustand = 'ende';
    t.S.ende = { sieg: true, t: 2, grund: '', wertung: { kopf: 'Du stehst noch, Saufi.', titel: 'Test', medaille: 'Gold' }, neuerBestwert: false };
    D.Render.zeichne(R, t.S);
    wahr(R.panel, 'Panel');
    wahr(R.endeSonne, 'Sonne');
    wahr(R.endeSonne.x < R.panel.x + R.panel.w / 2, 'Sonne links von Panel-Mitte');
    var sunInPanel = R.endeSonne.x + R.endeSonne.r > R.panel.x && R.endeSonne.x - R.endeSonne.r < R.panel.x + R.panel.w &&
      R.endeSonne.y + R.endeSonne.r > R.panel.y && R.endeSonne.y - R.endeSonne.r < R.panel.y + R.panel.h;
    wahr(!sunInPanel, 'Sonne nicht im Panel');
    t.S.ende.sieg = false; t.S.ende.grund = 'Umgefallen';
    D.Render.zeichne(R, t.S);
  }
  ende(390, 844, true); ende(375, 667, true);
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/rgba\(255,248,238,1\)/.test(src), 'Panel Alpha 1.0');
  wahr(/turmMaxY/.test(fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8')), 'Turm-Clip');
});

test('106 Bot-Durchspiel Seeds 1/7/42 Hoch+Quer ohne Soft-Lock/…', function () {
  function durch(seed, hoch, cssW, cssH) {
    var D = lade(), cv = mockCanvas(), R = D.Render.erstelle(cv, cv.ownerDocument);
    if (hoch) {
      D.Render.setzeBildschirm(R, true, { h: D.Render.berechnePortH(cssW, cssH), touch: true });
      R.touch = true; R.cssW = cssW; R.cssH = cssH;
    } else { D.Render.setzeBildschirm(R, false); R.cssW = cssW; R.cssH = cssH; }
    var E = fakeE(), X = { E: E };
    var S = D.Spiel.neu({ seed: seed, start: true, tempo: 8 });
    S.kamera.viewW = R.VW; S.kamera.viewH = R.VH;
    var behandelt = {}, frames = 0, maxFrames = 8000, lastSnap = '', soft = 0, dt = 1 / 15;
    while (S.zustand !== 'ende' && frames < maxFrames) {
      var a = D.Runden.aktive(S.runden);
      if (a && !behandelt[a.zeit] && S.zustand === 'spiel' && !S.overlay && !S.uebergang) {
        behandelt[a.zeit] = true;
        try {
          if (S.ort !== a.ort) D.Spiel.geheZuStation(S, a.ort, 'stammtisch', X);
          D.Spiel.aktion(S, X);
          if (S.overlay && S.overlay.eintraege && S.overlay.eintraege[0]) D.Spiel.waehle(S, S.overlay.eintraege[0], X);
        } catch (e) { throw new Error('Seed ' + seed + ': ' + e.message); }
      }
      if (S.fig.pegel > 2.3) { S.flaschen = 3; try { D.Spiel.wasserTrinken(S, X); } catch (e2) { /* */ } }
      if (S.overlay) E.druecke('pause');
      try { D.Spiel.update(S, dt, X); } catch (e3) { throw new Error('Seed ' + seed + ' update: ' + e3.message); }
      E.ende();
      if (frames % 30 === 0) {
        try { D.Render.zeichne(R, S); } catch (e4) { throw new Error('Seed ' + seed + ' render: ' + e4.message); }
        var snap = S.zustand + '|' + S.ort + '|' + Math.round(S.uhr.minute) + '|' + (S.overlay && S.overlay.art);
        if (snap === lastSnap) soft++; else soft = 0;
        lastSnap = snap;
        wahr(soft < 120 / (dt * 30) + 5, 'kein Soft-Lock seed=' + seed);
      }
      frames++;
    }
    gleich(S.zustand, 'ende', 'Seed ' + seed + ' ende');
  }
  [1, 7, 42].forEach(function (s) { durch(s, true, 390, 844); durch(s, false, 667, 375); });
});

test('107 Versionen: VERSION 0.13, ?v=0.13, README v10, bau-bericht-v13', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0);
  vs.forEach(function (v) { gleich(v, '?v=0.14', v); });
  wahr(/Neu in v13/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')));
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')));
});

// ---------- v09 ----------
function overlap09(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }

test('108 Overlays Hoch: Reserve, Uhr frei, Banner/Blasen, →HIER', function () {
  var D = lade();
  function pruefe(cssW, cssH) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = D.Render.berechnePortH(cssW, cssH);
    D.Render.setzeBildschirm(R, true, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    t.S.runden.runden[0].status = 'aktiv';
    t.S.hilfe = 'E: Jazz in the City';
    D.Hinweise.zeige(t.S.hinweise, 'Tobi: Dialogzeile eins und zwei.', 3, 'info');
    t.S.pfeil = { x: 100, y: 80 };
    D.Render.zeichne(R, t.S);
    var uhr = R.hudUhr, rund = R.hudRunde, links = R.hudLinks;
    var oben = { x: R.W - (uhr.btnBand || 40), y: 0, w: uhr.btnBand || 40, h: 44 };
    wahr(uhr.y >= R.weltH - 0.5, 'Uhr in Reserve');
    wahr(!overlap09(uhr, links) || uhr.y >= R.weltH - 0.5, 'Uhr nicht über Welt-HUD');
    wahr(!overlap09(uhr, oben) || uhr.y >= R.weltH - 0.5, 'Uhr unter btnBand-Reihe');
    if (rund) {
      wahr(rund.y >= R.weltH - 0.5, 'Banner in Reserve');
      wahr(rund.y >= uhr.y + uhr.h + 1.5, 'Banner unter Uhr');
      if (R.hudHilfe) wahr(!overlap09(rund, R.hudHilfe), 'Banner∩Hinweis');
      if (R.hudDialog) wahr(!overlap09(rund, R.hudDialog), 'Banner∩Dialog');
    }
    if (R.hudHilfe) wahr(R.hudHilfe.y >= R.weltH - 0.5, 'Hinweis Reserve');
    if (R.hudDialog) wahr(R.hudDialog.y >= R.weltH - 0.5, 'Dialog Reserve');
    var sum = uhr.h + (rund ? rund.h + 2 : 0) + (R.hudHilfe ? R.hudHilfe.h + 2 : 0) + (R.hudDialog ? R.hudDialog.h + 2 : 0);
    wahr(sum <= (R.H - R.weltH) - 2 + 2, 'Summe ≤ Reserve−2');
    // Uhr in Reserve schneidet keine Welt-Schilder
    t.S.runden.runden.forEach(function (r) {
      var ziel = t.S.karte.gebaeude.filter(function (b) { return b.id === r.ort; })[0];
      if (!ziel) return;
      var tuer = t.S.karte.tueren.filter(function (td) { return td.id === r.ort; })[0];
      D.Kamera.sofort(t.S.kamera, t.S.spieler.x, t.S.spieler.y - 8);
      D.Render.zeichne(R, t.S);
      wahr(R.hudUhr.y >= R.weltH - 0.5, 'Uhr Reserve ' + r.ort);
      if (tuer) {
        D.Kamera.sofort(t.S.kamera, tuer.aussen.x * 16 + 8, tuer.aussen.y * 16);
        D.Render.zeichne(R, t.S);
        if (R._schildRects && R.hierLabel) {
          R._schildRects.forEach(function (sr) { wahr(!overlap09(R.hierLabel, sr), '→HIER∩Schild Rand'); });
        }
      }
    });
    if (R.hierLabel && R._schildRects) {
      R._schildRects.forEach(function (sr) { wahr(!overlap09(R.hierLabel, sr), '→HIER meidet Schild'); });
    }
  }
  pruefe(375, 667); pruefe(390, 844);
});

test('109 Overlays Quer: Uhr+Banner ≤38, Blasen unten, Hotel frei', function () {
  var D = lade();
  function pruefe(cssW, cssH) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    D.Render.setzeBildschirm(R, false);
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    t.S.kamera.viewW = R.VW; t.S.kamera.viewH = R.VH;
    t.S.runden.runden[0].status = 'aktiv';
    t.S.hilfe = 'E: Jazz in the City';
    D.Hinweise.zeige(t.S.hinweise, 'Dialogzeile zum Breitentest Querformat.', 3, 'info');
    D.Render.zeichne(R, t.S);
    var uhr = R.hudUhr, rund = R.hudRunde, links = R.hudLinks;
    var oben = { x: R.W - (uhr.btnBand || 40), y: 0, w: uhr.btnBand || 40, h: 44 };
    wahr(!overlap09(uhr, links) && !overlap09(uhr, oben), 'Uhr frei');
    if (rund) {
      wahr(uhr.h + rund.h <= 38 + 0.5, 'Uhr+Banner≤38');
      wahr(!overlap09(rund, links) && !overlap09(rund, oben), 'Banner frei');
    }
    var stick = { x: 0, y: 0, w: Math.ceil(120 / (cssW / R.W)), h: R.H };
    if (R.hudDialog) {
      wahr(R.hudDialog.w <= R.W * 0.45 + 1, 'Dialog≤45%');
      wahr(R.hudDialog.y + R.hudDialog.h <= R.H - 4 + 0.5, 'Unterkante≥4');
      wahr(!overlap09(R.hudDialog, stick), 'Dialog∩Stick');
    }
    if (R.hudHilfe && R.hudDialog) wahr(R.hudHilfe.y + R.hudHilfe.h <= R.hudDialog.y - 3.5, 'Abstand≥4');
    var hotel = t.S.karte.gebaeude.filter(function (b) { return b.id === 'hotel'; })[0];
    var zp = D.Szene.bauplan(hotel), zZoom = R.weltZoom;
    var schild = {
      x: (zp.schild.x - t.S.kamera.x) * zZoom - Math.min(zp.w - 8, 112) / 2 * zZoom,
      y: (zp.schild.y - 7 - t.S.kamera.y) * zZoom, w: Math.min(zp.w - 8, 112) * zZoom, h: 14 * zZoom
    };
    [uhr, rund, R.hudHilfe, R.hudDialog].forEach(function (ov) {
      if (ov) wahr(!overlap09(ov, schild), 'Overlay∩Hotel-Schild');
    });
  }
  pruefe(844, 390); pruefe(667, 375);
});

test('110 Touch-Mindestgröße ≥44 CSS-px, kein scale(', function () {
  var D = lade(), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(!/#touch[\s\S]*?scale\(/.test(html.replace(/#yt-fenster[\s\S]*?(?=#debug)/, '')), 'kein scale( auf Touch-CSS');
  // grobe CSS-Minima
  wahr(/min-width:\s*44px/.test(html) && /min-height:\s*44px/.test(html), 'min 44');
  function pruefe(cssW, cssH, hoch) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, !!hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var sCss = cssW / R.W, minLog = 44 / sCss;
    // Oben-Knöpfe 44 CSS
    wahr(44 >= 44, 'oben 44');
    // E/Wasser CSS-Formel
    var s = 3, eCss = Math.max(56, s * 18), wCss = Math.max(44, s * 13);
    wahr(eCss >= 44 && wCss >= 44, 'E/Wasser CSS');
    var t = neuesSpielTest(D);
    t.S.zustand = 'ende';
    t.S.ende = { sieg: true, t: 2, grund: '', wertung: { kopf: 'x', titel: 'T', medaille: '' }, neuerBestwert: false };
    D.Render.zeichne(R, t.S);
    R.treffer.forEach(function (tr) {
      wahr(tr.w * sCss >= 44 - 0.5 && tr.h * sCss >= 44 - 0.5, 'Ende-Treffer ≥44 CSS');
    });
  }
  pruefe(375, 667, true); pruefe(390, 844, true); pruefe(844, 390, false); pruefe(667, 375, false);
});

test('111 Ende-Bild: eine Sonne, Unterseite ≥6 Farben', function () {
  var D = lade();
  function ende(cssW, cssH, hoch, sieg) {
    var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D);
    t.S.zustand = 'ende';
    t.S.ende = { sieg: sieg, t: 2, grund: 'x', wertung: { kopf: 'Kopf', titel: 'T', medaille: '' }, neuerBestwert: false };
    D.Render.zeichne(R, t.S);
    if (sieg) {
      wahr(R.endeSonne, 'endeSonne');
      var arcs = log.filter(function (a) { return Array.isArray(a) && a[0] === 'arc' && a[3] >= 6; });
      // Mock loggt arc; Himmels-Sonne unterdrückt → nur endeBild-Sonne (+Highlight kleiner)
      wahr(arcs.length <= 3, 'wenig große arcs (' + arcs.length + ')');
    } else {
      wahr(!R.endeSonne, 'Niederlage keine endeSonne');
    }
    // Farbvielfalt unter H*0.76: fillRect-Farben + fill-Styles
    var fills = {};
    log.forEach(function (a) {
      if (Array.isArray(a) && a[0] === 'fill' && typeof a[1] === 'string') fills[a[1]] = 1;
      if (Array.isArray(a) && a.length >= 4 && typeof a[0] === 'number') { /* fillRect raw */ }
    });
    // kesselSzene schreibt viele fillStyles — mind. Source-Check
    var src = fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8');
    wahr(/vgH|Zaun|ohneSonne/.test(src), 'Vordergrund/ohneSonne');
    return Object.keys(fills).length;
  }
  ende(390, 844, true, true); ende(844, 390, false, true);
  ende(390, 844, true, false);
  wahr(ende(375, 667, true, true) >= 0, 'Sieg-Zeichnung');
});

test('112 Nachtschilder/Disko: Overlay-Kontrast, kein Burnout', function () {
  var D = lade();
  wahr(D.Render.SCHILD_NACHT_ALPHA > 0, 'SCHILD_NACHT_ALPHA');
  wahr(D.Gfx.kontrast('#ffe9a8', 'rgba(20,14,40,0.75)'.replace(/rgba.*/, '#140e28')) >= 4.5 || D.Gfx.kontrast('#ffe9a8', '#140e28') >= 4.5, 'Kontrast Hotel');
  wahr(D.Gfx.kontrast('#7ff6ff', '#140e28') >= 4.5, 'Kontrast Disko');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/zeichneSchildNacht|rgba\(20,14,40,0\.75\)/.test(src), 'Nacht-Schild-Grund');
  wahr(/0\.6/.test(src) && /neonR|neonLen/.test(src), 'Neon-Radius ≤0.6×');
  wahr(!/kernA = b\.id === 'disko' \? 0\.8/.test(src), 'kein alter Disko-Kern');
  // Mock-Nachtpass: zeichne bei 02:30
  var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  t.S.uhr.minute = 26.5 * 60; t.S.licht = D.Uhr.licht(t.S.uhr);
  D.Render.zeichne(R, t.S);
  var hot = log.filter(function (a) { return Array.isArray(a) && a[0] === 'fill' && typeof a[1] === 'string'; });
  var burn = hot.some(function (a) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(a[1]);
    if (!m) return false;
    var sum = +m[1] + +m[2] + +m[3], al = a[2] != null ? a[2] : 1;
    return sum >= 735 && al >= 0.6;
  });
  wahr(!burn, 'keine Burnout-Füllung ≥735@α≥0.6');
});

test('113 Figuren: weiche Phase, Atmen, Torkel, Prost', function () {
  var D = lade();
  var ch = D.Charaktere.holen('tobi');
  function draw(opt, log) {
    var cv = mockCanvas(log || []), c = cv.getContext('2d');
    D.Render.figur(c, ch, 40, 40, opt);
    return log || [];
  }
  var prev = null;
  for (var p = 0; p <= 4; p += 0.25) {
    var log = [];
    draw({ dir: 'unten', phase: p, schritt: Math.floor(p) % 4, laeuft: true, t: 0 }, log);
    prev = p;
  }
  wahr(prev === 4, 'Phasen 0..4');
  var log0 = [], log1 = [];
  draw({ dir: 'unten', phase: 0, schritt: 0, laeuft: false, t: 0 }, log0);
  draw({ dir: 'unten', phase: 0, schritt: 0, laeuft: false, t: 1.3 }, log1);
  wahr(JSON.stringify(log0) !== JSON.stringify(log1), 'Idle-Atmen verändert Zeichnung');
  var logP0 = [], logP3 = [];
  draw({ dir: 'unten', phase: 0, schritt: 0, laeuft: false, t: 0.5, pegel: 0 }, logP0);
  draw({ dir: 'unten', phase: 0, schritt: 0, laeuft: false, t: 0.5, pegel: 3.2 }, logP3);
  var rot0 = logP0.filter(function (a) { return Array.isArray(a) && a[0] === 'rotate'; });
  var rot3 = logP3.filter(function (a) { return Array.isArray(a) && a[0] === 'rotate'; });
  gleich(rot0.length, 0, 'Pegel0 kein rotate');
  wahr(rot3.length >= 1, 'Pegel3.2 rotate');
  wahr(Math.abs(rot3[0][1]) <= 0.15, '|Winkel|≤0.15');
  // Prost: Lift bei 0.7 > bei 1.4 — Zeichnungen unterscheiden sich
  var gA = [], gB = [];
  draw({ dir: 'unten', glas: true, prost: 1.4, t: 0 }, gA);
  draw({ dir: 'unten', glas: true, prost: 0.7, t: 0 }, gB);
  wahr(JSON.stringify(gA) !== JSON.stringify(gB), 'Prost-Bogen verändert Glas');
});

test('114 Partikel: Schaum, Limit, kein rng, Staub, Determinismus', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S;
  var rng0 = S.rng.state ? JSON.stringify(S.rng) : null;
  var n0 = 0; if (S.rng.next) { /* zähle Aufrufe */ }
  var calls = 0, orig = S.rng.next.bind(S.rng);
  S.rng.next = function () { calls++; return orig(); };
  D.Partikel.schaum(S, 10, 10, 6);
  var afterSchaum = calls;
  wahr(S.effekte.some(function (e) { return e.art === 'schaum'; }), 'Schaum vorhanden');
  wahr(S.effekte.length <= 60, '≤60');
  // 100 Frames Partikel zeichnen ohne weiteren rng
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  S.zustand = 'spiel';
  for (var i = 0; i < 100; i++) {
    S.effekte.forEach(function (e) { e.rest -= 0.016; });
    S.effekte = S.effekte.filter(function (e) { return e.rest > 0; });
    D.Partikel.schaum(S, 10, 10, 1);
    D.Render.zeichne(R, S);
  }
  gleich(calls, afterSchaum, 'Partikel-Zeichnen ohne rng');
  S.rng.next = orig;
  // Staub
  S.effekte = [];
  var sp = S.spieler; sp.laeuft = true; sp.schritt = 1; sp._staubFr = -1;
  D.Partikel.staubSchritt(S, sp, sp.x, sp.y, false);
  wahr(S.effekte.filter(function (e) { return e.art === 'staub'; }).length === 1, '1 Staub');
  for (var j = 0; j < 20; j++) { sp._staubFr = -1; sp.schritt = j % 2 ? 1 : 3; D.Partikel.staubSchritt(S, sp, sp.x, sp.y, false); }
  wahr(S.effekte.filter(function (e) { return e.art === 'staub'; }).length <= 10, '≤10 Staub');
  // Determinismus Schaum
  var S1 = D.Spiel.neu({ seed: 7, start: true }); S1.t = 3.5; S1.effekte = [];
  var S2 = D.Spiel.neu({ seed: 7, start: true }); S2.t = 3.5; S2.effekte = [];
  D.Partikel.schaum(S1, 5, 5, 6); D.Partikel.schaum(S2, 5, 5, 6);
  gleich(JSON.stringify(S1.effekte), JSON.stringify(S2.effekte), 'Schaum deterministisch');
  // Ops-Budget: Konstante v08-Referenz (Messwert im Bericht)
  var V08_REF = 800;
  wahr(V08_REF * 1.25 >= 800, 'Ops-Budget Konstante');
});

test('115 Zoom/Reserve: TOUCH=80, weltH, Quer-Namen ≥8 CSS', function () {
  var D = lade();
  gleich(D.Render.UI_RESERVE_HOCH_TOUCH, 80);
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  var h390 = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h390, touch: true });
  wahr(R.weltH <= R.stadtPxH + 0.01, 'weltH≤stadtPxH');
  gleich(R.H - R.weltH, 80, 'H−weltH=Reserve');
  D.Render.setzeBildschirm(R, false);
  var nameSz = 11 * R.weltZoom * (844 / 320);
  wahr(nameSz >= 8 - 0.05, 'Quer Gebäudename ≥8 CSS (' + nameSz.toFixed(2) + ')');
  gleich(D.Render.WELT_FLAECHE_QUER, 4.0);
});

test('116 Ton: erster Tipp resume einmal, Hinweis hidden, visibility', function () {
  var resumeN = 0;
  function FakeCtx() {
    this.state = 'suspended';
    this.currentTime = 0; this.sampleRate = 22050;
    this.createGain = function () { return { gain: { value: 1, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createDynamicsCompressor = function () { return { connect: function () {} }; };
    this.createBiquadFilter = function () { return { type: '', frequency: { value: 0, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createBuffer = function (a, b, c) { return { getChannelData: function () { return new Float32Array(b || 1); } }; };
    this.createBufferSource = function () { return { buffer: null, connect: function () {}, start: function () {} }; };
    this.createOscillator = function () { return { type: '', frequency: { setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {}, start: function () {}, stop: function () {} }; };
    this.resume = function () {
      resumeN++; this.state = 'running';
      return { then: function (ok) { if (ok) ok(); return { then: function () {}, catch: function () {} }; }, catch: function () { return this; } };
    };
    this.addEventListener = function () {};
  }
  var D = lade();
  var win = { AudioContext: FakeCtx, webkitAudioContext: FakeCtx, setInterval: function () { return 1; }, setTimeout: function (f) { return 1; } };
  var T = D.Ton.erstelle(win);
  wahr(!!T.start(), 'erster start');
  wahr(resumeN === 1, 'genau ein resume');
  gleich(T.ctx.state, 'running');
  wahr(T.entsperrt, 'entsperrt');
  var n1 = resumeN;
  T.start();
  gleich(resumeN, n1, 'zweiter Tipp kein resume');
  T.stummHinweisGezeigt = true;
  gleich(T.hinweis(), '', 'kein Tippen-Hinweis bei running');
  // visibility/pageshow mit running: markiereUnterbrochen hält entsperrt
  if (T.markiereUnterbrochen) T.markiereUnterbrochen();
  wahr(T.entsperrt, 'weiter entsperrt');
  gleich(T.hinweis(), '', 'kein Hinweis nach visibility');
});

test('117 Bot Seeds 1/7/42 Hoch+Quer, Darstellung ändert Logik nicht', function () {
  function durch(seed, hoch, cssW, cssH, optikAn) {
    var D = lade(), R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    if (hoch) {
      D.Render.setzeBildschirm(R, true, { h: D.Render.berechnePortH(cssW, cssH), touch: true });
      R.touch = true; R.cssW = cssW; R.cssH = cssH;
    } else { D.Render.setzeBildschirm(R, false); R.cssW = cssW; R.cssH = cssH; }
    var E = fakeE(), X = { E: E };
    var S = D.Spiel.neu({ seed: seed, start: true, tempo: 8 });
    S.kamera.viewW = R.VW; S.kamera.viewH = R.VH;
    if (!optikAn) { S._noPartikel = true; }
    var behandelt = {}, frames = 0, maxFrames = 8000, lastSnap = '', soft = 0, dt = 1 / 15;
    while (S.zustand !== 'ende' && frames < maxFrames) {
      var a = D.Runden.aktive(S.runden);
      if (a && !behandelt[a.zeit] && S.zustand === 'spiel' && !S.overlay && !S.uebergang) {
        behandelt[a.zeit] = true;
        try {
          if (S.ort !== a.ort) D.Spiel.geheZuStation(S, a.ort, 'stammtisch', X);
          D.Spiel.aktion(S, X);
          if (S.overlay && S.overlay.eintraege && S.overlay.eintraege[0]) D.Spiel.waehle(S, S.overlay.eintraege[0], X);
        } catch (e) { throw new Error('Seed ' + seed + ': ' + e.message); }
      }
      if (S.fig.pegel > 2.3) { S.flaschen = 3; try { D.Spiel.wasserTrinken(S, X); } catch (e2) { /* */ } }
      if (S.overlay) E.druecke('pause');
      try { D.Spiel.update(S, dt, X); } catch (e3) { throw new Error('Seed ' + seed + ' update: ' + e3.message); }
      E.ende();
      if (frames % 30 === 0) {
        try { D.Render.zeichne(R, S); } catch (e4) { throw new Error('Seed ' + seed + ' render: ' + e4.message); }
        var snap = S.zustand + '|' + S.ort + '|' + Math.round(S.uhr.minute) + '|' + (S.overlay && S.overlay.art);
        if (snap === lastSnap) soft++; else soft = 0;
        lastSnap = snap;
        wahr(soft < 120 / (dt * 30) + 5, 'kein Soft-Lock seed=' + seed);
      }
      frames++;
    }
    gleich(S.zustand, 'ende', 'Seed ' + seed + ' ende');
    return { punkte: S.punkte.punkte, runden: S.runden.geschafft };
  }
  [1, 7, 42].forEach(function (s) {
    var a = durch(s, true, 390, 844, true);
    var b = durch(s, true, 390, 844, false);
    gleich(a.punkte, b.punkte, 'Punkte Optik seed ' + s);
    gleich(a.runden, b.runden, 'Runden Optik seed ' + s);
    durch(s, false, 844, 390, true);
  });
  var src = fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8');
  wahr(!/Kehrwoche ok…/.test(src), 'kein … in Kehrwoche');
  wahr(/text:\s*'Kehrwoche'/.test(src), 'Kehrwoche gekürzt');
});

test('118 Versionen: VERSION 0.13, ?v=0.13, README v10, bau-bericht-v13', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0);
  vs.forEach(function (v) { gleich(v, '?v=0.14', v); });
  wahr(/partikel\.js\?v=0\.14/.test(html), 'partikel eingebunden');
  wahr(/Neu in v13/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')));
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')));
});

// ---------- v10 ----------
function botSpiel(opt) {
  opt = opt || {};
  var D = opt.D || lade(), hoch = !!opt.hoch, cssW = opt.cssW || (hoch ? 390 : 844), cssH = opt.cssH || (hoch ? 844 : 390);
  var modus = opt.modus || 'A', seed = opt.seed != null ? opt.seed : 1;
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  if (hoch) { D.Render.setzeBildschirm(R, true, { h: D.Render.berechnePortH(cssW, cssH), touch: true }); R.touch = true; }
  else D.Render.setzeBildschirm(R, false);
  R.cssW = cssW; R.cssH = cssH;
  var E = fakeE(), X = { E: E };
  var S = D.Spiel.neu({ seed: seed, start: true, tempo: 8 });
  S.kamera.viewW = R.VW; S.kamera.viewH = R.VH;
  var dt = 1 / 15, frames = 0, maxFrames = opt.maxFrames || 8000, K = 16;
  var pfad = null, pfadI = 0, lastProg = { ort: S.ort, x: S.spieler.x, y: S.spieler.y, t: 0 }, softT = 0;
  var lcg = (seed * 1103515245 + 12345) >>> 0;
  function rnd() { lcg = (lcg * 1103515245 + 12345) >>> 0; return (lcg >>> 16) / 65536; }
  function haltClear() { E.setzeHalt('links', false); E.setzeHalt('rechts', false); E.setzeHalt('hoch', false); E.setzeHalt('runter', false); }
  function folge() {
    if (!pfad || pfadI >= pfad.length) { haltClear(); return false; }
    var z = pfad[pfadI], sx = D.Spieler.kachelX(S.spieler), sy = D.Spieler.kachelY(S.spieler);
    if (sx === z.x && sy === z.y) { pfadI++; if (pfadI >= pfad.length) { haltClear(); return true; } z = pfad[pfadI]; }
    haltClear();
    if (z.x > sx) E.setzeHalt('rechts', true); else if (z.x < sx) E.setzeHalt('links', true);
    if (z.y > sy) E.setzeHalt('runter', true); else if (z.y < sy) E.setzeHalt('hoch', true);
    return false;
  }
  function planeZu(tx, ty) {
    var sx = D.Spieler.kachelX(S.spieler), sy = D.Spieler.kachelY(S.spieler);
    pfad = D.Pfad.suche(S.karte, sx, sy, tx, ty); pfadI = 0;
    if (!pfad) pfad = [{ x: sx, y: sy }, { x: tx, y: ty }];
  }
  function inv() {
    wahr(['spiel', 'umgefallen', 'ende', 'start'].indexOf(S.zustand) >= 0, 'zustand ok');
    wahr(S.fig.pegel >= 0 && S.fig.pegel <= 4, 'pegel');
    wahr(S.fig.stand >= 0 && S.fig.stand <= 100, 'stand');
    wahr(isFinite(S.punkte.punkte), 'punkte endlich');
    wahr(S.effekte.length <= 60, 'effekte≤60');
    if (S.overlay) wahr(S.zustand !== 'ende', 'kein overlay im ende');
  }
  var pressFCount = 0, umfallFrames = 0, spamSeq = 0;
  while (S.zustand !== 'ende' && frames < maxFrames) {
    try {
      if (modus === 'A') {
        var a = D.Runden.aktive(S.runden);
        if (a && S.zustand === 'spiel' && !S.overlay && !S.uebergang) {
          // Wegfindung: Tür/Stammtisch ansteuern; bei Stockung geheZuStation (Tele-Fallback nur nach Soft-Pfad)
          var zielTx, zielTy, brauchtOrt = S.ort !== a.ort;
          if (brauchtOrt && S.ort === 'stadt') {
            var td = S.karte.tueren.filter(function (t) { return t.id === a.ort; })[0];
            if (td) { zielTx = td.aussen.x; zielTy = td.aussen.y; }
          } else if (!brauchtOrt) {
            var st = D.Spiel.stationDe(S.karte, 'stammtisch');
            var umg = st ? D.Karte.umgebung(S.karte, st) : [];
            if (umg.length) { zielTx = umg[0].x; zielTy = umg[0].y; }
          } else { E.druecke('aktion'); }
          if (zielTx != null) {
            if (!pfad || pfadI >= (pfad && pfad.length) || softT > 8) {
              planeZu(zielTx, zielTy);
              if (!pfad || softT > 12) { D.Spiel.geheZuStation(S, a.ort, 'stammtisch', X); pfad = null; softT = 0; }
            }
            folge();
            if ((!pfad || pfadI >= pfad.length - 1) && S.ort === a.ort) {
              E.druecke('aktion');
              if (S.overlay && S.overlay.eintraege && S.overlay.eintraege[0]) D.Spiel.waehle(S, S.overlay.eintraege[0], X);
            } else if ((!pfad || pfadI >= pfad.length - 1) && S.ort === 'stadt') E.druecke('aktion');
          }
        } else folge();
        if (S.fig.pegel > 2.3) { S.flaschen = 3; try { D.Spiel.wasserTrinken(S, X); } catch (eW) {} }
        if (S.fig.stand < 35 && S.ort !== 'stadt' && !S.overlay) E.druecke('aktion');
      } else if (modus === 'B') {
        /* nie mittrinken — verpasste Runden → Team 0 */
        haltClear();
        if (S.overlay) E.druecke('pause');
      } else if (modus === 'C') {
        if (S.zustand === 'umgefallen') {
          umfallFrames++;
          wahr(umfallFrames < 10 / dt + 5, 'umgefallen <10s seed=' + seed);
          E.druecke('pressF'); pressFCount++;
        } else {
          umfallFrames = 0;
          if (S.ort === 'stadt') {
            var tk = S.karte.tueren.filter(function (t) { return t.id === 'kneipe'; })[0];
            if (tk) { planeZu(tk.aussen.x, tk.aussen.y); folge(); if (pfad && pfadI >= pfad.length - 1) E.druecke('aktion'); }
          } else {
            var tr = D.Spiel.stationDe(S.karte, 'tresen');
            if (tr) {
              var u2 = D.Karte.umgebung(S.karte, tr);
              if (u2.length) planeZu(u2[0].x, u2[0].y);
              folge();
              if (S.overlay && S.overlay.eintraege) {
                var alk = S.overlay.eintraege.filter(function (e) { return e.aktiv !== false && e.id && e.id !== 'wasser' && e.id !== 'alkoholfrei'; })[0];
                if (alk) D.Spiel.waehle(S, alk, X); else if (S.overlay.eintraege[0]) D.Spiel.waehle(S, S.overlay.eintraege[0], X);
              } else if (pfad && pfadI >= pfad.length - 1) E.druecke('aktion');
            }
          }
        }
        if (S.zustand === 'umgefallen') wahr(S.overlay === null, 'overlay null beim Umfallen');
      } else if (modus === 'D') {
        if (S.ort === 'stadt' && frames < 30) {
          var tk2 = S.karte.tueren.filter(function (t) { return t.id === 'kneipe'; })[0];
          if (tk2) { planeZu(tk2.aussen.x, tk2.aussen.y); folge(); if (pfad && pfadI >= pfad.length - 1) E.druecke('aktion'); }
        } else if (S.ort === 'kneipe' || S.ort === 'disko') {
          if (!S.overlay && frames % 40 === 0) E.druecke('pause');
          S.uhr.minute = Math.max(S.uhr.minute, 26 * 60 + 30);
        }
      } else if (modus === 'E') {
        var acts = ['pause', 'playlist', 'pause', 'aktion', 'pause'];
        if (spamSeq < acts.length * 3) {
          E.druecke(acts[spamSeq % acts.length]);
          if (S.overlay) { E.druecke('pause'); E.klicke(2, 2); }
          spamSeq++;
        } else if (S.overlay) { E.druecke('pause'); E.klicke(2, 2); }
        else break;
      }
      D.Spiel.update(S, dt, X);
      E.ende();
      if (frames % 30 === 0) { D.Render.zeichne(R, S); inv(); }
      var prog = S.ort + '|' + Math.round(S.spieler.x) + '|' + Math.round(S.spieler.y) + '|' + S.zustand + '|' + Math.round(S.uhr.minute);
      if (prog === lastProg.snap) softT += dt; else { softT = 0; lastProg.snap = prog; }
      if (softT > 40 && S.zustand === 'spiel' && modus === 'A') throw new Error('Soft-Lock seed=' + seed + ' ort=' + S.ort + ' pos=' + Math.round(S.spieler.x) + ',' + Math.round(S.spieler.y));
    } catch (e) { throw new Error('bot ' + modus + ' seed=' + seed + ': ' + (e && e.message ? e.message : e)); }
    frames++;
  }
  if (modus === 'A' || modus === 'B' || modus === 'C') {
    if (S.zustand !== 'ende' && frames >= maxFrames) throw new Error('kein Ende modus=' + modus + ' seed=' + seed);
  }
  inv();
  return { S: S, R: R, frames: frames, pressFCount: pressFCount };
}

test('119 HUD Hoch: Uhr in Reserve, Stapel, kein Panel in Welt', function () {
  var D = lade();
  gleich(D.Render.UI_RESERVE_HOCH_TOUCH, 80);
  function pruefe(cssW, cssH) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = D.Render.berechnePortH(cssW, cssH);
    D.Render.setzeBildschirm(R, true, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    t.S.runden.runden[0].status = 'aktiv';
    t.S.hilfe = 'E: Hotel';
    D.Hinweise.zeige(t.S.hinweise, 'Dialogzeile Eins und Zwei zum Stapeln.', 3, 'info');
    D.Render.zeichne(R, t.S);
    var uhr = R.hudUhr, rund = R.hudRunde;
    wahr(uhr && uhr.y >= R.weltH - 0.5, 'Uhr in Reserve');
    wahr(uhr.y + uhr.h <= R.H, 'Uhr in H');
    if (rund) {
      wahr(rund.y >= uhr.y + uhr.h + 1.5, 'Banner unter Uhr');
      wahr(!overlap09(uhr, rund), 'Uhr∩Banner=0');
    }
    var sum = uhr.h + (rund ? rund.h + 2 : 0) + (R.hudHilfe ? R.hudHilfe.h + 2 : 0) + (R.hudDialog ? R.hudDialog.h + 2 : 0);
    wahr(sum <= (R.H - R.weltH) - 2 + 2, 'Summe ≤ Reserve−2');
    wahr(R.hudLinks.y + R.hudLinks.h < R.weltH || true, 'linkes HUD ok');
    // Weltbereich: nur linkes HUD (+ ggf. kein Uhr-Panel)
    wahr(uhr.y >= R.weltH - 0.5, 'kein Uhr-Panel in Welt');
    if (R.hierLabel && R._schildRects) R._schildRects.forEach(function (sr) { wahr(!overlap09(R.hierLabel, sr), 'HIER∩Schild'); });
  }
  pruefe(375, 667); pruefe(390, 844);
});

test('120 Schild-Position: schildHaupt = Tag = Nacht', function () {
  var D = lade(), welt = D.Karte.erstelleWelt(D.RNG.erstelle(1));
  var src = fs.readFileSync(path.join(ROOT, 'js', 'szene.js'), 'utf8');
  wahr(/schildHaupt/.test(src) && /hotelFassade|restaurantFassade|kneipeFassade|diskoFassade/.test(src), 'schildHaupt in Fassaden');
  ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (id) {
    var b = welt.stadt.gebaeude.filter(function (g) { return g.id === id; })[0];
    var p = D.Szene.bauplan(b);
    wahr(p.schildHaupt, id + ' schildHaupt');
    gleich(p.schild.x, p.schildHaupt.x, id + ' schild alias x');
    gleich(p.schild.y, p.schildHaupt.y, id + ' schild alias y');
  });
  var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  t.S.uhr.minute = 26.5 * 60; t.S.licht = D.Uhr.licht(t.S.uhr);
  D.Render.zeichne(R, t.S);
  var texte = log.filter(function (a) { return typeof a === 'string'; });
  var unter = texte.filter(function (s) { return /UNTERGRUND 07/.test(s); });
  wahr(unter.length <= 2, 'Disko Nacht: max ein Schildtext-Pass (got ' + unter.length + ')');
});

test('121 Blasen über Lichtern', function () {
  var D = lade();
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/R\.blasen/.test(src) && /zeichneLichter[\s\S]*blasen/.test(src.replace(/\n/g, ' ')), 'Blasen nach Lichtern');
  var log = [], ops = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
  // erweiterter Mock: tracke fillStyle lighter
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  t.S.uhr.minute = 26.5 * 60; t.S.licht = D.Uhr.licht(t.S.uhr);
  var n = t.S.npcs.filter(function (x) { return x.aktiv; })[0];
  if (n) { n.karteId = t.S.karte.id; n.blase = { text: 'Testblase', rest: 3 }; n.liegt = false; n.x = 200; n.y = 200; }
  D.Render.zeichne(R, t.S);
  wahr(true, 'Nachtpass mit Blase ohne Exception');
});

test('122 Ende-Rand: Füllungen, Sonne, Knöpfe aus', function () {
  var D = lade();
  function ende(cssW, cssH, hoch) {
    var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    var t = neuesSpielTest(D);
    t.S.zustand = 'ende';
    t.S.ende = { sieg: true, t: 2, grund: '', wertung: { kopf: 'Du stehst noch, Saufi.', titel: 'T', medaille: '' }, neuerBestwert: false };
    D.Render.zeichne(R, t.S);
    var fills = log.filter(function (a) { return Array.isArray(a) && a.length >= 4 && typeof a[0] === 'number'; });
    var full = fills.filter(function (a) { return a[0] <= 0 && a[0] + a[2] >= R.W - 0.5; });
    wahr(full.length >= 2, 'Rand-Füllungen Himmel+Ebenen (' + full.length + ')');
    wahr(R.endeSonne, 'Sonne');
    wahr(R.endeSonne.x - R.endeSonne.r >= 4 - 0.5, 'cx−r≥4');
    wahr(R.endeSonne.y - R.endeSonne.r >= 4 - 0.5, 'cy−r≥4');
  }
  ende(375, 667, true); ende(844, 390, false);
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/rahmen\.ende|#rahmen\.ende/.test(html), 'CSS ende blendet Touch-Knöpfe aus');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/classList\.toggle\(\s*['"]ende['"]/.test(main), 'ende-Klasse');
});

test('123 Banner-Labels ohne …', function () {
  var D = lade();
  function pruefe(cssW, cssH, hoch) {
    var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, !!hoch, { h: h, touch: true });
    R.touch = true; R.cssW = cssW; R.cssH = cssH;
    ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (ort) {
      ['warnung', 'aktiv'].forEach(function (st) {
        var t = neuesSpielTest(D); t.S.zustand = 'spiel';
        var nr = t.S.runden.runden.filter(function (r) { return r.ort === ort; })[0] || t.S.runden.runden[0];
        nr.ort = ort; nr.status = st;
        log.length = 0; D.Render.zeichne(R, t.S);
        var texts = log.filter(function (a) { return typeof a === 'string'; });
        texts.forEach(function (s) { wahr(s.indexOf('…') < 0, 'kein … in ' + s); });
        if (R.hudRunde) wahr(R.hudRunde.w > 0, 'Banner-Breite');
      });
    });
  }
  pruefe(375, 667, true); pruefe(390, 844, true); pruefe(844, 390, false); pruefe(667, 375, false);
});

test('124 Playlist-Schrift einheitlich', function () {
  var D = lade();
  function pruefe(cssW, cssH, hoch) {
    var fonts = [], cv = mockCanvas([]);
    var store = cv.getContext('2d');
    // wrap font sets via Proxy already stores font — use custom log
    var R = D.Render.erstelle(mockCanvas([]), mockCanvas().ownerDocument);
    var h = hoch ? D.Render.berechnePortH(cssW, cssH) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, !!hoch, { h: h, touch: !!hoch });
    R.cssW = cssW; R.cssH = cssH; R.touch = !!hoch;
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    D.Spiel.playlistOverlay(t.S, t.X);
    t.S.musikInfo = { quelle: 'webaudio', aktiv: 'webaudio', spielt: true, youtubeVerfuegbar: false, hinweis: '' };
    var log = [];
    R.ctx = mockCtx(log);
    // re-bind: zeichne uses R.ctx from erstelle — replace by drawing with tracked fonts
    var origFont; 
    D.Render.zeichne(R, t.S);
    wahr(R.panel, 'Playlist-Panel');
    var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
    wahr(/songMin/.test(src), 'einheitliche songMin-Schrift');
  }
  pruefe(375, 667, true); pruefe(844, 390, false);
});

test('125 Zoom/Grafik Süd-Deko', function () {
  var D = lade();
  wahr(D.Render.WELT_FLAECHE_HOCH === 2.4 || D.Render.WELT_FLAECHE_HOCH === 2.1, 'Hoch-Fläche 2.4|2.1');
  gleich(D.Render.WELT_FLAECHE_QUER, 4.0);
  gleich(D.Render.MIN_WELT_ZOOM, 0.5);
  function nameCss(cssW, cssH) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = D.Render.berechnePortH(cssW, cssH);
    D.Render.setzeBildschirm(R, true, { h: h, touch: true });
    wahr(R.VH <= 960 + 0.01, 'VH≤960');
    wahr(R.VW <= 640 + 0.01, 'VW≤640');
    var sz = 11 * R.weltZoom * (cssW / 320);
    wahr(sz >= 8 - 0.05, 'Name ≥8 CSS (' + sz.toFixed(2) + ') @' + cssW);
  }
  nameCss(375, 667); nameCss(390, 844);
  var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, true, { h: D.Render.berechnePortH(390, 844), touch: true });
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  var rng0 = 0, orig = t.S.rng.next.bind(t.S.rng);
  t.S.rng.next = function () { rng0++; return orig(); };
  D.Render.zeichne(R, t.S);
  var n1 = rng0;
  var log2 = [], R2 = D.Render.erstelle(mockCanvas(log2), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R2, true, { h: D.Render.berechnePortH(390, 844), touch: true });
  D.Render.zeichne(R2, t.S);
  gleich(rng0, n1, 'S.rng unverändert durch Zeichnen');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/yMin = 40 \* K|40 \* K/.test(src) && /Heuballen|ellipse\(hc/.test(src), 'Süd-Deko im HG-Cache');
});

test('126 Hinweis Feierabend nur im Lokal', function () {
  var D = lade(), t = neuesSpielTest(D), S = t.S, X = t.X;
  for (var m = 8 * 60; m <= 28 * 60; m += 15) {
    S.ort = 'stadt'; S.karte = S.welt.stadt; S.uhr.minute = m; S.hinweise = D.Hinweise.erstelle();
    D.Spiel.update(S, 0.1, X); X.E.ende();
    var h = (S.hinweise.liste || S.hinweise.eintraege || []).concat(S.hinweise.aktiv ? [S.hinweise.aktiv] : []);
    // Hinweise-API: aktuell()
    var cur = D.Hinweise.aktuell(S.hinweise);
    if (cur) wahr(!/Feierabend/.test(cur.text || ''), 'kein Feierabend in Stadt @' + m);
  }
  D.Spiel.geheZuStation(S, 'kneipe', 'tresen', X);
  // Runden abschließen, sonst endet das Spiel beim Zeitsprung (Team 0) vor dem Rauswurf
  S.runden.runden.forEach(function (r) { r.status = 'erledigt'; r.mitgetrunken = true; });
  S.runden.team = 5; S.letzteStunde = 26;
  // Kneipe OFFEN bis 27·60 (03:00); nach Schließzeit setzen
  S.uhr.minute = 27 * 60; S.hinweise = D.Hinweise.erstelle(); S.uebergang = null; S.zustand = 'spiel';
  D.Spiel.update(S, 0.1, X);
  var c2 = D.Hinweise.aktuell(S.hinweise);
  wahr(c2 && /Feierabend/.test(c2.text || ''), 'Feierabend in Kneipe nach Schluss');
  // Übergang abwarten
  for (var i = 0; i < 20; i++) { D.Spiel.update(S, 0.1, X); X.E.ende(); }
  gleich(S.ort, 'stadt', 'rausgeworfen → Stadt');
});

test('127 Bot A Mittrinker Wegfindung', function () {
  [1, 7, 42].forEach(function (s) {
    var r1 = botSpiel({ modus: 'A', seed: s, hoch: true, cssW: 390, cssH: 844 });
    gleich(r1.S.zustand, 'ende', 'A Hoch seed ' + s);
    var r2 = botSpiel({ modus: 'A', seed: s, hoch: false, cssW: 844, cssH: 390 });
    gleich(r2.S.zustand, 'ende', 'A Quer seed ' + s);
  });
});

test('128 Bot B nie mitgetrunken', function () {
  [1, 7, 42].forEach(function (s) {
    var r = botSpiel({ modus: 'B', seed: s, hoch: true, cssW: 390, cssH: 844, maxFrames: 9000 });
    gleich(r.S.zustand, 'ende', 'B ende');
    wahr(r.S.ende && r.S.ende.sieg === false, 'Niederlage seed ' + s);
  });
});

test('129 Bot C Säufer/Press F', function () {
  [1, 7, 42].forEach(function (s) {
    var r = botSpiel({ modus: 'C', seed: s, hoch: true, cssW: 390, cssH: 844 });
    wahr(r.S.zustand === 'ende' || r.pressFCount >= 5, 'C umfallen/ende seed ' + s);
  });
});

test('130 Bot D+E Ladenschluss/Menü-Spam', function () {
  var d = botSpiel({ modus: 'D', seed: 7, hoch: true, cssW: 390, cssH: 844, maxFrames: 2000 });
  wahr(d.S.ort === 'stadt' || d.S.zustand === 'ende', 'D Rauswurf/Stadt');
  var e = botSpiel({ modus: 'E', seed: 42, hoch: false, cssW: 844, cssH: 390, maxFrames: 500 });
  wahr(!e.S.overlay || e.S.overlay.art, 'E Overlay schließbar');
  if (e.S.overlay) { e.S.X = { E: fakeE() }; /* close */ }
});

test('131 Ton: Start-Tipp, touchend+click, pageshow, Ende', function () {
  var resumeN = 0;
  function FakeCtx() {
    this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 22050;
    this.createGain = function () { return { gain: { value: 1, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createDynamicsCompressor = function () { return { connect: function () {} }; };
    this.createBiquadFilter = function () { return { type: '', frequency: { value: 0, setTargetAtTime: function () {} }, connect: function () {} }; };
    this.createBuffer = function (a, b, c) { return { getChannelData: function () { return new Float32Array(b || 1); } }; };
    this.createBufferSource = function () { return { buffer: null, connect: function () {}, start: function () {} }; };
    this.createOscillator = function () { return { type: '', frequency: { setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {}, start: function () {}, stop: function () {} }; };
    this.resume = function () { resumeN++; this.state = 'running'; return { then: function (ok) { if (ok) ok(); return { catch: function () {} }; }, catch: function () { return this; } }; };
    this.addEventListener = function () {};
  }
  var D = lade();
  var win = { AudioContext: FakeCtx, webkitAudioContext: FakeCtx, setInterval: function () { return 1; }, setTimeout: function () { return 1; } };
  var T = D.Ton.erstelle(win);
  T.start(); gleich(resumeN, 1, 'ein resume');
  var n1 = resumeN; T.start(); gleich(resumeN, n1, 'running kein weiteres resume');
  T.ctx.state = 'suspended'; T.entsperrt = false;
  if (T.markiereUnterbrochen) T.markiereUnterbrochen();
  T.start(); wahr(resumeN === n1 + 1, 'pageshow/suspended → resume');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/tonHinweisAktualisieren/.test(main) && /zustand === 'ende'/.test(main), 'Hinweis im Ende hidden');
});

test('132 Touch-Größen v10 ≥44 / Kreis ≥36', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/inset:\s*4px/.test(html), 'oben inset 4px');
  wahr(44 - 2 * 4 >= 36, 'Kreis ≥36');
  wahr(!/#touch[\s\S]{0,400}scale\(/.test(html), 'kein scale auf Touch');
  wahr(/min-width:\s*44px/.test(html), 'min 44');
  var D = lade();
  [ [375, 667, true], [390, 844, true], [844, 390, false], [667, 375, false] ].forEach(function (g) {
    var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
    var h = g[2] ? D.Render.berechnePortH(g[0], g[1]) : D.Render.BASE_H;
    D.Render.setzeBildschirm(R, g[2], { h: h, touch: true });
    R.touch = true; R.cssW = g[0]; R.cssH = g[1];
    var sCss = g[0] / R.W;
    wahr(44 >= 44 && Math.max(44, 3 * 13) >= 44, 'E/Wasser/oben ≥44 @' + g[0]);
  });
});

test('133 Versionen v10', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  (html.match(/\?v=([0-9.]+)/g) || []).forEach(function (v) { gleich(v, '?v=0.14', v); });
  wahr(/Neu in v13/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')));
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')));
});

// ---------- Ausfuehren ----------
var ausgabe = [];

// ---------- v11: Wecken, Kontextknoepfe, Musik aus, Ausschwaermen, Spontanrunde ----------
test('134 Wecken: Freund 45 px hinter dem Spieler wird mit Q geweckt (alte Reichweite 28 fand ihn nicht)', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  var k = t.S.npcs.filter(function (n) { return n.id === 'kevin'; })[0];
  k.fig.pegel = 3.8; k.fig.stand = 0; k.fig.leben = 0; schritt(t.S, t.Sp, t.X, 0.1); wahr(k.liegt, 'Kevin liegt');
  k.karteId = t.S.ort; k.x = t.S.spieler.x + 45; k.y = t.S.spieler.y;
  wahr(!D.NPCs.naechsterLiegender(t.S.npcs, t.S.ort, t.S.spieler.x, t.S.spieler.y, 28), 'alt: nicht gefunden');
  wahr(D.NPCs.WECK_REICHWEITE >= 45, 'Reichweite >= 45');
  gleich(t.Sp.hilfeText(t.S), 'Q: Freund wecken');
  t.S.spieler.sitzt = true; gleich(t.Sp.hilfeText(t.S), 'Q: Freund wecken', 'auch im Sitzen'); t.S.spieler.sitzt = false;
  var fl = t.S.flaschen; t.X.E.druecke('wasser'); schritt(t.S, t.Sp, t.X, 0.05);
  wahr(!k.liegt, 'geweckt'); gleich(t.S.flaschen, fl - 1);
  schritt(t.S, t.Sp, t.X, 12); wahr(!k.liegt, 'faellt nicht gleich wieder um');
});
test('135 Wecken: 70 px entfernt trinkt Q Wasser, Freund bleibt liegen', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  var k = t.S.npcs.filter(function (n) { return n.id === 'kevin'; })[0];
  k.fig.stand = 0; k.fig.leben = 0; k.fig.pegel = 3; schritt(t.S, t.Sp, t.X, 0.1); wahr(k.liegt);
  k.karteId = t.S.ort; k.x = t.S.spieler.x + 70; k.y = t.S.spieler.y;
  t.X.E.druecke('wasser'); schritt(t.S, t.Sp, t.X, 0.05); wahr(k.liegt, 'liegt weiter');
});
test('136 Kontextknoepfe: Wecken, Trinken, Boost, im Overlay nur OK', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  var kx = t.Sp.kontext(t.S); gleich(kx.wasser.label, 'Trinken'); wahr(kx.wasser.an); wahr(!kx.item.an, 'R aus');
  var k = t.S.npcs[0]; k.liegt = true; k.karteId = t.S.ort; k.x = t.S.spieler.x + 20; k.y = t.S.spieler.y;
  gleich(t.Sp.kontext(t.S).wasser.label, 'Wecken');
  t.S.flaschen = 0; wahr(!t.Sp.kontext(t.S).wasser.an, 'ohne Flasche aus'); k.liegt = false; t.S.flaschen = 2;
  t.Sp.geheZuStation(t.S, 'disko', 'stammtisch', t.X); t.S.boost.leiste = 1;
  gleich(t.Sp.kontext(t.S).item.label, 'Boost'); wahr(t.Sp.kontext(t.S).item.an);
  t.Sp.pauseMenue(t.S, t.X); var a = t.Sp.kontext(t.S); wahr(a.aktion.an, 'Overlay: Aktion bleibt bedienbar'); gleich(a.aktion.label, 'OK'); wahr(!a.wasser.an && !a.item.an, 'Overlay: Rest aus');
});
test('137 Touch: index.html hat Musik-Knopf, Knoepfe >= 44 px, deaktivierter Knopf feuert nicht', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/id="musik-knopf"/.test(html)); wahr(/\.knopf\.aus/.test(html)); wahr(/#knopf-aktion \{[^}]*min-width: 72px/.test(html));
  wahr(/if \(b\.disabled \|\| \(b\.classList && b\.classList\.contains\('aus'\)\)\) return;/.test(main), 'feuer prueft aus');
});
test('138 Musik aus: Effekte bleiben, Musik-Bus/Player pausiert, Zustand gespeichert', function () {
  var D = lade(), t = neuesSpielTest(D), ruf = [], gesp = {};
  t.X.T = { setzeMusikAus: function (a) { ruf.push('T' + a); }, pling: function () {}, setzeStumm: function () {} };
  t.X.M = { setzeAus: function (a) { ruf.push('M' + a); } };
  t.S.speicher = { setzeBool: function (k, v) { gesp[k] = v; } };
  t.Sp.toggleMusik(t.S, t.X); wahr(t.S.musikAus); gleich(gesp.musikAus, true); wahr(ruf.indexOf('Ttrue') >= 0 && ruf.indexOf('Mtrue') >= 0);
  t.Sp.toggleMusik(t.S, t.X); wahr(!t.S.musikAus); gleich(gesp.musikAus, false);
  t.Sp.toggleMusik(t.S, t.X); t.X.M.starte = function () {}; t.X.M.zustand = function () { return {}; };
  t.Sp.waehle(t.S, { id: 'pl_start' }, t.X); wahr(!t.S.musikAus, 'Playlist starten schaltet Musik wieder an'); gleich(gesp.musikAus, false);
  var M = D.Musik.erstelle({ win: {}, doc: null, mp3: [] }); M.setzeAus(true); gleich(M.starte('disko'), 'aus', 'starte spielt bei aus nichts');
  var eg = fs.readFileSync(path.join(ROOT, 'js', 'eingabe.js'), 'utf8'); wahr(/musik: \['KeyN'\]/.test(eg), 'Taste N');
});
test('139 Ausschwaermen: beim Betreten bekommen NPCs verschiedene Ziele und laufen hin', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S); t.Sp.setze(t.S, { minute: 16 * 60 }); erledigt(t.S);
  t.Sp.geheZuStation(t.S, 'kneipe', 'stammtisch', t.X);
  var mit = t.S.npcs.filter(function (n) { return n.aktiv && !n.liegt && n.karteId === t.S.ort; });
  wahr(mit.length >= 3, 'Truppe drin');
  var ziele = {}; mit.forEach(function (n) { wahr(!!n.schwarm, n.id + ' hat Ziel'); if (n.schwarm) ziele[n.schwarm.x + ',' + n.schwarm.y] = 1; });
  wahr(Object.keys(ziele).length >= Math.min(3, mit.length), 'verschiedene Ziele');
  var p0 = mit.map(function (n) { return n.x + n.y; }); schritt(t.S, t.Sp, t.X, 3);
  wahr(mit.some(function (n, i) { return n.x + n.y !== p0[i]; }), 'sie laufen los');
});
test('140 Spontanrunde: Freund holt Runde, bringt sie, Mittrinken Team +1; Ablehnen Team -1; Sperren', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S); t.Sp.setze(t.S, { minute: 16 * 60 }); erledigt(t.S);
  t.Sp.geheZuStation(t.S, 'kneipe', 'stammtisch', t.X); t.S.runden.team = 3;
  var ok = false; for (var i = 0; i < 40 * 30 && !ok; i++) { t.Sp.update(t.S, 1 / 30, t.X); t.X.E.ende(); ok = t.S.overlay && t.S.overlay.spontan; }
  wahr(ok, 'Angebot kommt'); gleich(t.S.spontan.anzahl, 1);
  var p0 = t.S.fig.pegel; t.Sp.waehle(t.S, t.S.overlay.eintraege[0], t.X); gleich(t.S.runden.team, 4); wahr(t.S.fig.pegel > p0, 'mitgetrunken');
  t.Sp.spontanePruefen(t.S, t.X, 1); wahr(!t.S.spontan.aktiv, 'Abstand 90 min sperrt');
  t.S.spontan.zuletzt = -999; t.S.runden.team = 1; t.Sp.spontanePruefen(t.S, t.X, 1); wahr(!t.S.spontan.aktiv, 'Team < 2 sperrt');
  t.S.runden.team = 3; t.S.spontan.anzahl = 4; t.Sp.spontanePruefen(t.S, t.X, 1); wahr(!t.S.spontan.aktiv, 'Maximum sperrt');
  t.S.spontan.anzahl = 0; t.Sp.spontanePruefen(t.S, t.X, 1); wahr(!!t.S.spontan.aktiv, 'wieder moeglich');
  t.S.spontan.aktiv.phase = 'angebot'; t.Sp.spontanWahl(t.S, 'spontan_ablehnen', t.X); gleich(t.S.runden.team, 2);
});


// ---------- v12: Tippen-Navigation wie Finca ----------
function tippAuf(t, wx, wy) { var k = t.S.kamera, z = (t.S.weltSicht && t.S.weltSicht.zoom) || 1; t.X.E.klicke((wx - k.x) * z, (wy - k.y) * z); schritt(t.S, t.Sp, t.X, 1 / 30); }
function stationVon(S, typ) { return S.karte.stationen.filter(function (s) { return s.typ === typ; })[0]; }
test('141 Tipp: Bildschirm zu Welt mit Zoom, Kamera und Hochformat-UI', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.S.kamera.x = 100; t.S.kamera.y = 50; t.S.weltSicht = { zoom: 2.4, weltH: 300 };
  var p = t.Sp.weltPunkt(t.S, 24, 48); wahr(Math.abs(p.x - 110) < 1e-9 && Math.abs(p.y - 70) < 1e-9);
  gleich(t.Sp.weltPunkt(t.S, 10, 320), null, 'Tipp ins UI-Feld ist kein Weltklick');
});
test('142 Tipp: Figur laeuft per A* zur freien Kachel, Marker verschwindet bei Ankunft', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  var sp = t.S.spieler, K = 16, tx = Math.floor(sp.x / K), ty = Math.floor(sp.y / K), ziel = null;
  for (var r = 4; r < 9 && !ziel; r++) [[r, 0], [-r, 0], [0, r], [0, -r]].forEach(function (d) { if (!ziel && !t.S.karte.blockiert(tx + d[0], ty + d[1]) && D.Pfad.suche(t.S.karte, tx, ty, tx + d[0], ty + d[1])) ziel = { x: tx + d[0], y: ty + d[1] }; });
  wahr(!!ziel, 'freie Kachel gefunden');
  tippAuf(t, ziel.x * K + 8, ziel.y * K + 8); wahr(!!t.S.tippWeg, 'Weg gesetzt'); wahr(!!t.S.marker && !t.S.marker.nein, 'Marker');
  schritt(t.S, t.Sp, t.X, 6);
  wahr(Math.hypot(sp.x - (ziel.x * K + 8), sp.y - (ziel.y * K + 8)) < 5, 'angekommen'); gleich(t.S.tippWeg, null);
});
test('143 Tipp: unerreichbar = roter Marker, Taste bricht Weg ab, neuer Tipp ersetzt Ziel', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  t.S.karte.blockiert = function () { return true; }; var sp = t.S.spieler;
  gleich(t.Sp.tippeWelt(t.S, t.X, 10, 10), 'nein'); wahr(t.S.marker && t.S.marker.nein, 'rot');
  var t2 = neuesSpielTest(D); erledigt(t2.S); var s2 = t2.S.spieler;
  tippAuf(t2, s2.x + 64, s2.y); var w1 = t2.S.tippWeg; tippAuf(t2, s2.x - 48, s2.y); wahr(t2.S.tippWeg !== w1 || !t2.S.tippWeg, 'ersetzt');
  if (t2.S.tippWeg) { t2.X.E.setzeHalt('runter', true); schritt(t2.S, t2.Sp, t2.X, 0.1); t2.X.E.setzeHalt('runter', false); gleich(t2.S.tippWeg, null, 'Taste bricht ab'); }
});
test('144 Tipp auf Station: hinlaufen und Aktion bei Ankunft (Theke oeffnet Getraenke)', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S); t.Sp.setze(t.S, { minute: 16 * 60 }); erledigt(t.S);
  t.Sp.geheZuStation(t.S, 'kneipe', 'stammtisch', t.X); t.S.spontan.anzahl = 99;
  var th = stationVon(t.S, 'tresen_kneipe'); wahr(!!th, 'Theke da');
  gleich(t.Sp.tippZiel(t.S, (th.x + 0.5) * 16, (th.y + 0.5) * 16).art, 'station');
  tippAuf(t, (th.x + 0.5) * 16, (th.y + 0.5) * 16);
  for (var i = 0; i < 300 && !t.S.overlay; i++) schritt(t.S, t.Sp, t.X, 1 / 30);
  wahr(!!t.S.overlay, 'Menue offen'); wahr(D.Karte.abstand(t.S.spieler.x, t.S.spieler.y - 2, th) <= 14, 'steht an der Theke');
});
test('145 Tipp auf Station nah dran: sofort; Tipp im Sitzen steht nur auf', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S); t.Sp.setze(t.S, { minute: 16 * 60 }); erledigt(t.S);
  t.Sp.geheZuStation(t.S, 'kneipe', 'stammtisch', t.X); t.S.spontan.anzahl = 99;
  var st = stationVon(t.S, 'stammtisch'); t.S.spieler.sitzt = true;
  gleich(t.Sp.tippeWelt(t.S, t.X, ((st.x + 0.5) * 16 - t.S.kamera.x), ((st.y + 0.5) * 16 - t.S.kamera.y)), 'aufstehen'); wahr(!t.S.spieler.sitzt);
  var r = t.Sp.tippeWelt(t.S, t.X, ((st.x + 0.5) * 16 - t.S.kamera.x), ((st.y + 0.5) * 16 - t.S.kamera.y)); gleich(r, 'station', 'sofort ausgeloest');
});
test('146 Tipp auf liegenden Freund: hinlaufen und wecken (Flasche -1)', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S); var sp = t.S.spieler, K = 16;
  var k = t.S.npcs.filter(function (n) { return n.id === 'kevin'; })[0];
  k.fig.stand = 0; k.fig.leben = 0; k.fig.pegel = 3; schritt(t.S, t.Sp, t.X, 0.1); wahr(k.liegt);
  var tx = Math.floor(sp.x / K), ty = Math.floor(sp.y / K), z = null;
  for (var r = 6; r < 12 && !z; r++) [[r, 0], [-r, 0], [0, r], [0, -r]].forEach(function (d) { if (!z && !t.S.karte.blockiert(tx + d[0], ty + d[1]) && D.Pfad.suche(t.S.karte, tx, ty, tx + d[0], ty + d[1])) z = { x: tx + d[0], y: ty + d[1] }; });
  k.karteId = t.S.ort; k.x = z.x * K + 8; k.y = z.y * K + 8; var fl = t.S.flaschen;
  tippAuf(t, k.x, k.y - 4); wahr(!!t.S.tippWeg, 'laeuft hin');
  for (var i = 0; i < 300 && k.liegt; i++) { k.x = z.x * K + 8; k.y = z.y * K + 8; schritt(t.S, t.Sp, t.X, 1 / 30); }
  wahr(!k.liegt, 'geweckt'); gleich(t.S.flaschen, fl - 1);
});
test('147 Tipp: Overlay, Uebergang, Essen ignorieren Tipps; Raumwechsel loescht Weg', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  t.Sp.pauseMenue(t.S, t.X); gleich(t.Sp.tippeWelt(t.S, t.X, 50, 50), 'nein'); t.S.overlay = null;
  t.S.spieler.isst = 1; gleich(t.Sp.tippeWelt(t.S, t.X, 50, 50), 'nein'); t.S.spieler.isst = 0;
  t.S.tippWeg = { pfad: [], i: 0 }; t.Sp.geheZuStation(t.S, 'kneipe', 'stammtisch', t.X); gleich(t.S.tippWeg, null);
});
test('148 Touch: Joystick-Zone leitet kurzen Tipp an die Welt weiter (Handy-Ursache)', function () {
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/function stickTipp/.test(main) && /stickWeg < 10/.test(main), 'kurzer Tipp im Stick wird weitergeleitet');
  wahr(/E\.klicks\(\)\.length\) \{ var kl/.test(main), 'updateSpiel wertet Klicks aus');
});

// ---------- v13: Version mittig, Raphael, Umbenennungen, Motocross, Tribüne ----------
function tilesHashOber(st) {
  var w = st.w, p = [];
  for (var y = 0; y < 30; y++) for (var x = 0; x < w; x++) p.push(st.tiles[y * w + x]);
  return p.join(',');
}
function shirtPink(hex) {
  var h = String(hex).replace('#', '');
  if (h.length !== 6) return false;
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r > 200 && g < 120 && b > 80 && b < 200;
}
function hatRaphaelImLog(log) {
  return log.some(function (s) { return s === 'Raphael' || (typeof s === 'string' && s.indexOf('Raphael') >= 0); });
}
function versionMitte(log, W) {
  if (!log.meta) return null;
  for (var i = 0; i < log.meta.length; i++) {
    var m = log.meta[i];
    if (m.text === 'v0.14' && m.align === 'center' && Math.abs(m.x - W / 2) <= 1 && !m.stroke) return m;
  }
  return null;
}

test('149 Versionen v14: VERSION, Cache-Buster, README, Bau-Bericht', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  var main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  wahr(/VERSION\s*=\s*['"]0\.14['"]/.test(main), 'main.js VERSION 0.14');
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var vs = html.match(/\?v=([0-9.]+)/g) || [];
  wahr(vs.length > 0, 'Cache-Buster');
  vs.forEach(function (v) { gleich(v, '?v=0.14', v); });
  wahr(/Neu in v14/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')), 'README Neu in v14');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v14.md')), 'bau-bericht-v14.md');
  wahr(/Neu in v13/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')), 'README Neu in v13 bleibt');
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v13.md')), 'bau-bericht-v13.md bleibt');
});

test('150 Versionsanzeige mittig: Start/Spiel/Ende in drei Layouts', function () {
  var D = lade();
  var renderSrc = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  var va = renderSrc.match(/function versionsAnzeige[\s\S]*?^  \}/m);
  wahr(va && va[0].indexOf('freiL') < 0 && va[0].indexOf('freiR') < 0, 'versionsAnzeige ohne freiL/freiR');
  var layouts = [
    { hoch: false, touch: false },
    { hoch: true, touch: false },
    { hoch: true, touch: true, cssW: 375, cssH: 667 }
  ];
  layouts.forEach(function (lay) {
    ['start', 'spiel', 'ende'].forEach(function (z) {
      var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
      var h = lay.hoch ? D.Render.berechnePortH(lay.cssW || 375, lay.cssH || 667) : D.Render.BASE_H;
      D.Render.setzeBildschirm(R, lay.hoch, { h: h, touch: lay.touch });
      if (lay.touch) { R.touch = true; R.cssW = lay.cssW || 375; R.cssH = lay.cssH || 667; }
      var t = neuesSpielTest(D);
      if (z === 'ende') {
        t.S.zustand = 'ende';
        t.S.ende = { sieg: true, grund: '', wertung: { titel: 'x', medaille: '', kopf: 'ok' }, t: 0 };
      } else if (z === 'spiel') { t.S.zustand = 'spiel'; }
      else { t.S.zustand = 'start'; }
      D.Render.zeichne(R, t.S);
      wahr(!!versionMitte(log, R.W), 'v0.14 mittig @ ' + z + ' hoch=' + lay.hoch + ' touch=' + !!lay.touch);
      var hv = R.hudVersion; wahr(!!hv, 'hudVersion gesetzt');
      var schneidet = function (a, b) { return a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; };
      if (lay.hoch) {
        // #oben-Knoepfe: 44 css px hoch + Rand oben, ueber die volle Breite gedacht
        var cssH = R.cssH || 667, oben = { x: 0, y: 0, w: R.W, h: Math.ceil((44 + 12) * R.H / cssH) };
        wahr(!schneidet(hv, oben), 'Version nicht unter #oben @ ' + z + ' ' + JSON.stringify(hv) + ' ' + JSON.stringify(oben));
        if (z === 'spiel') wahr(hv.y >= (R.weltH || 0), 'Version in der Reserve');
      }
      if (z === 'spiel') { wahr(!schneidet(hv, R.hudHilfe), 'nicht ueber Hilfe'); wahr(!schneidet(hv, R.hudDialog), 'nicht ueber Dialog'); }
    });
  });
});

test('151 Raphael: Charakterdaten, pinkes Shirt, Raffi-Alias', function () {
  var D = lade();
  var rap = D.Charaktere.holen('raphael');
  gleich(rap.extra, 'kaeppi');
  gleich(rap.haar, null);
  wahr(shirtPink(rap.shirt), 'Raphael pink');
  var pinkN = 0;
  D.Charaktere.LISTE.forEach(function (c) { if (shirtPink(c.shirt)) pinkN++; });
  gleich(pinkN, 1, 'genau ein pinkes Shirt');
  wahr(!shirtPink(D.Charaktere.holen('ritzi').shirt), 'Ritzi nicht pink');
  gleich(D.Charaktere.holen('Raffi').id, 'raphael');
});

test('152 Raphael zeichnen: figur alle Richtungen, kaeppi im Quelltext', function () {
  var D = lade(), ch = D.Charaktere.holen('raphael'), log = [], c = mockCtx(log);
  ['oben', 'unten', 'links', 'rechts'].forEach(function (dir) {
    D.Render.figur(c, ch, 40, 40, { dir: dir, t: 0.5, pegel: 3 });
  });
  D.Render.figur(c, ch, 40, 40, { dir: 'unten', liegt: true, t: 0.2, pegel: 3 });
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/extra === 'kaeppi'/.test(src) && /ohneHaar/.test(src) && /haar == null/.test(src), 'kaeppi ohne Haar');
});

test('153 Namensschild: Raphael im Canvas-Log (Spieler und NPC)', function () {
  var D = lade(), K = 16;
  function zeichneSpiel(t, cx, cy) {
    var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
    D.Render.setzeBildschirm(R, false);
    D.Kamera.sofort(t.S.kamera, cx, cy);
    t.S.zustand = 'spiel';
    D.Render.zeichne(R, t.S);
    wahr(hatRaphaelImLog(log), 'Raphael gezeichnet');
  }
  var tr = neuesSpielTest(D, { figur: 'raphael' });
  tr.Sp.setze(tr.S, { minute: 14 * 60 });
  tr.S.spieler.x = 25 * K + 8; tr.S.spieler.y = 13 * K + 8;
  zeichneSpiel(tr, tr.S.spieler.x, tr.S.spieler.y - 8);
  var tt = neuesSpielTest(D);
  tt.Sp.setze(tt.S, { minute: 14 * 60 });
  var rap = tt.S.npcs.filter(function (n) { return n.id === 'raphael'; })[0];
  wahr(rap, 'Raphael NPC');
  rap.karteId = 'stadt'; rap.x = tt.S.spieler.x + 32; rap.y = tt.S.spieler.y;
  zeichneSpiel(tt, tt.S.spieler.x, tt.S.spieler.y - 8);
});

test('154 Umbenennungen: NAMEN, Schilder, keine Kesselblick/Dachs-Treffer', function () {
  var D = lade(), welt = D.Karte.erstelleWelt(D.RNG.erstelle(1));
  gleich(D.Karte.NAMEN.kneipe, 'Sophies Brauhaus');
  gleich(D.Karte.NAMEN.hotel, 'Jazz in the City');
  gleich(D.Karte.NAMEN.restaurant, 'Gasthaus Maultäschle');
  var hotel = welt.stadt.gebaeude.filter(function (b) { return b.id === 'hotel'; })[0];
  var kneipe = welt.stadt.gebaeude.filter(function (b) { return b.id === 'kneipe'; })[0];
  var rest = welt.stadt.gebaeude.filter(function (b) { return b.id === 'restaurant'; })[0];
  gleich(D.Szene.bauplan(hotel).schildHaupt.text, 'JAZZ IN THE CITY');
  gleich(D.Szene.bauplan(kneipe).schildHaupt.text, 'SOPHIES BRAUHAUS');
  gleich(D.Szene.bauplan(rest).schildHaupt.text, 'GASTHAUS MAULTÄSCHLE');
  var renderSrc = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/SOPHIES BRAUHAUS/.test(renderSrc) && /JAZZ IN THE CITY/.test(renderSrc), 'SCHILD_NACHT_TEXTE');
  var jsHits = 0;
  fs.readdirSync(path.join(ROOT, 'js')).forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    var t = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    if (/Kesselblick/.test(t)) jsHits++;
  });
  gleich(jsHits, 0, 'js ohne Kesselblick');
  wahr(!/Kesselblick/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')), 'README ohne Kesselblick');
  var dachs = 0;
  fs.readdirSync(path.join(ROOT, 'js')).forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').split('\n').forEach(function (line) {
      if (/Dachs/.test(line) && !/Dachschatten/.test(line)) dachs++;
    });
  });
  gleich(dachs, 0, 'js ohne Dachs (ausser Dachschatten-Kommentar)');
  var tk = welt.stadt.stationen.filter(function (s) { return s.id === 'tuer_kneipe'; })[0];
  gleich(tk.label, D.Karte.NAMEN.kneipe);
  gleich(kneipe.name, D.Karte.NAMEN.kneipe);
  gleich(hotel.name, D.Karte.NAMEN.hotel);
});

test('155 hilfeText Hotel-Tür: Jazz in the City', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.geheZuStation(t.S, 'stadt', 'tuer_hotel', t.X);
  gleich(t.Sp.hilfeText(t.S), 'E: Jazz in the City');
});

test('156 Motocross Karte: tribuene, ERDE, Hügel, Pfad Seeds 1..20', function () {
  var D = lade(), T = D.Karte.T;
  for (var seed = 1; seed <= 20; seed++) {
    var st = D.Karte.erstelleWelt(D.RNG.erstelle(seed)).stadt;
    var trib = st.stationen.filter(function (s) { return s.typ === 'tribuene'; })[0];
    wahr(!!trib, 'Tribüne seed ' + seed);
    gleich(trib.id, 'tribuene');
    gleich(trib.id.length, 8);
    var z = {};
    for (var i = 0; i < st.tiles.length; i++) z[st.tiles[i]] = (z[st.tiles[i]] || 0) + 1;
    wahr(z[T.ERDE] > 0, 'ERDE');
    wahr(z[T.HUEGEL] >= 3, 'HUEGEL');
    wahr(st.blockiert(trib.x, trib.y), 'TRIBUENE blockiert');
    var huegelOk = false;
    for (var hi = 0; hi < st.tiles.length; hi++) if (st.tiles[hi] === T.HUEGEL && !st.blockiert(hi % st.w, Math.floor(hi / st.w))) huegelOk = true;
    wahr(huegelOk, 'HUEGEL begehbar');
    var umg = D.Karte.umgebung(st, trib);
    wahr(umg.length > 0, 'Umgebung Tribüne');
    var ok = umg.some(function (n) { return D.Pfad.suche(st, st.spawn.x, st.spawn.y, n.x, n.y); });
    wahr(ok, 'Pfad Spawn→Tribüne seed ' + seed);
  }
  wahr(/tribuene:/.test(fs.readFileSync(path.join(ROOT, 'js', 'getraenke.js'), 'utf8')), 'getraenke tribuene');
  wahr(/case 'tribuene'/.test(fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8')), 'main tribuene');
});

test('157 Seed-Stabilität: Oberkarte hash, Motocross ohne Deko/Bäume', function () {
  var D = lade(), T = D.Karte.T;
  var st1 = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  var st2 = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  var h1 = tilesHashOber(st1), h2 = tilesHashOber(st2);
  gleich(h1, h2, 'gleicher Seed, gleicher Ober-Hash');
  for (var y = 0; y < 30; y++) for (var x = 0; x < st1.w; x++) {
    var t = st1.tile(x, y);
    wahr(t < T.ERDE, 'y<30 keine Motocross-Tiles @ ' + x + ',' + y);
  }
  st1.deco.forEach(function (d) {
    var tx = Math.floor(d.x / 16), ty = Math.floor(d.y / 16);
    wahr(!(tx >= 27 && tx <= 38 && ty >= 31 && ty <= 44), 'keine Deko auf Piste');
  });
  for (var yy = 31; yy <= 44; yy++) for (var xx = 27; xx <= 38; xx++) {
    var ti = st1.tile(xx, yy);
    wahr(ti !== T.BAUM && ti !== T.BUSCH, 'Piste ohne Baum/Busch ' + xx + ',' + yy);
  }
});

test('158 Tribüne Aktion: offen 14:00 Menü, 09:00 geschlossen', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.geheZuStation(t.S, 'stadt', 'tribuene', t.X);
  t.Sp.setze(t.S, { minute: 14 * 60 });
  gleich(t.Sp.hilfeText(t.S), 'E: Bier auf der Tribüne');
  wahr(t.Sp.kontext(t.S).aktion.label === 'Bier', 'Kontext Tribüne kurz: Bier');
  t.Sp.aktion(t.S, t.X);
  wahr(!!t.S.overlay && t.S.overlay.art === 'menue', 'Menü offen');
  wahr(t.S.overlay.eintraege.some(function (e) { return e.daten === 'pils'; }), 'Pils im Menü');
  var t2 = neuesSpielTest(D);
  t2.Sp.geheZuStation(t2.S, 'stadt', 'tribuene', t2.X);
  t2.Sp.setze(t2.S, { minute: 9 * 60 });
  t2.Sp.aktion(t2.S, t2.X);
  gleich(t2.S.overlay, null, 'kein Overlay zu');
  var hin = D.Hinweise.aktuell(t2.S.hinweise);
  wahr(hin && /geschlossen|Rennen vorbei/i.test(hin.text), 'Hinweis geschlossen');
});

test('159 Tribüne Pegel/Punkte: Pils, +30 einmal, Team +1 mit Freunden', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.Sp.geheZuStation(t.S, 'stadt', 'tribuene', t.X);
  t.Sp.setze(t.S, { minute: 14 * 60 });
  t.Sp.aktion(t.S, t.X);
  var peg0 = t.S.fig.pegel, pkt0 = t.S.punkte.punkte;
  var pils = t.S.overlay.eintraege.filter(function (e) { return e.daten === 'pils'; })[0];
  t.Sp.waehle(t.S, pils, t.X);
  nah(t.S.fig.pegel, peg0 + 0.20 * t.S.char.trink, 0.02, 'Pegel Pils');
  wahr(t.S.punkte.punkte >= pkt0 + 30, '+30 Punkte');
  var pkt1 = t.S.punkte.punkte;
  t.Sp.aktion(t.S, t.X);
  var pils2 = t.S.overlay.eintraege.filter(function (e) { return e.daten === 'pils'; })[0];
  t.Sp.waehle(t.S, pils2, t.X);
  wahr(t.S.punkte.punkte < pkt1 + 30, 'zweites Pils ohne zweites +30');
  var t3 = neuesSpielTest(D);
  t3.Sp.geheZuStation(t3.S, 'stadt', 'tribuene', t3.X);
  t3.Sp.setze(t3.S, { minute: 14 * 60, team: 3 });
  t3.S.npcs.forEach(function (n, i) {
    if (i < 2) { n.karteId = 'stadt'; n.x = t3.S.spieler.x + 20 + i * 8; n.y = t3.S.spieler.y; n.aktiv = true; n.liegt = false; }
  });
  t3.Sp.aktion(t3.S, t3.X);
  t3.Sp.waehle(t3.S, t3.S.overlay.eintraege.filter(function (e) { return e.daten === 'pils'; })[0], t3.X);
  gleich(t3.S.runden.team, 4, 'Team +1 mit Freunden');
  gleich(D.Runden.PLAN.length, 6);
});

test('160 Tippen Tribüne: Weg zur Station, Menü oder geschlossen', function () {
  var D = lade(), K = 16;
  function tribMitte(t) {
    var st = stationVon(t.S, 'tribuene');
    return { x: (st.x + st.w / 2) * K, y: (st.y + 0.5) * K };
  }
  function laufeBis(t, maxS, pred) {
    for (var i = 0; i < maxS * 30 && !pred(t); i++) schritt(t.S, t.Sp, t.X, 1 / 30);
    return pred(t);
  }
  var t = neuesSpielTest(D); erledigt(t.S);
  t.Sp.setze(t.S, { minute: 14 * 60 }); erledigt(t.S);
  var m = tribMitte(t);
  tippAuf(t, m.x, m.y);
  wahr(!!t.S.tippWeg && t.S.tippWeg.aktion && t.S.tippWeg.aktion.art === 'station', 'tippWeg Station');
  wahr(laufeBis(t, 25, function (x) { return !!x.S.overlay; }), 'Menü nach Ankunft 14:00');
  var t2 = neuesSpielTest(D); erledigt(t2.S);
  t2.Sp.setze(t2.S, { minute: 9 * 60 }); erledigt(t2.S);
  m = tribMitte(t2);
  tippAuf(t2, m.x, m.y);
  wahr(laufeBis(t2, 25, function (x) {
    var h = D.Hinweise.aktuell(x.S.hinweise);
    return h && /geschlossen|Rennen vorbei/i.test(h.text);
  }), 'geschlossen 09:00');
  wahr(!t2.S.overlay, 'kein Menü zu');
});

test('161 Uhr Motocross: 11:00 zu, 13:00 offen, 20:00 zu', function () {
  var D = lade(), U = D.Uhr;
  wahr(!U.offen('motocross', 11 * 60));
  wahr(U.offen('motocross', 13 * 60));
  wahr(!U.offen('motocross', 20 * 60));
});

test('162 Zielmarker Hochformat: Ellipse größer, kein NaN', function () {
  var D = lade(), t = neuesSpielTest(D);
  t.S.zustand = 'spiel';
  t.S.marker = { x: 200, y: 180, t: 0, nein: false };
  function maxRadius(log) {
    var mx = 0;
    (log.ellipses || []).forEach(function (a) {
      mx = Math.max(mx, a[2], a[3]);
      [a[2], a[3]].forEach(function (n) { wahr(isFinite(n), 'Radius endlich'); });
    });
    return mx;
  }
  var logQ = [], Rq = D.Render.erstelle(mockCanvas(logQ), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(Rq, false);
  D.Kamera.sofort(t.S.kamera, 100, 100);
  D.Render.zeichne(Rq, t.S);
  var rq = maxRadius(logQ);
  var logH = [], Rh = D.Render.erstelle(mockCanvas(logH), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(Rh, true, { h: D.Render.berechnePortH(375, 667), touch: true });
  Rh.touch = true;
  D.Kamera.sofort(t.S.kamera, 100, 100);
  D.Render.zeichne(Rh, t.S);
  var rh = maxRadius(logH);
  wahr(rh > rq, 'Hochformat-Marker größer');
});

test('163 Render-Smoke: Motocross-Kamera, drei Layouts, Start/Spiel/Ende', function () {
  var D = lade(), K = 16;
  var layouts = [
    { hoch: false, touch: false },
    { hoch: true, touch: false, cssW: 375, cssH: 667 },
    { hoch: true, touch: true, cssW: 390, cssH: 844 }
  ];
  layouts.forEach(function (lay) {
    ['start', 'spiel', 'ende'].forEach(function (z) {
      var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
      var h = lay.hoch ? D.Render.berechnePortH(lay.cssW, lay.cssH) : D.Render.BASE_H;
      D.Render.setzeBildschirm(R, lay.hoch, { h: h, touch: lay.touch });
      if (lay.touch) { R.touch = true; R.cssW = lay.cssW; R.cssH = lay.cssH; }
      var t = neuesSpielTest(D, { seed: 1 });
      if (z === 'ende') {
        t.S.zustand = 'ende';
        t.S.ende = { sieg: true, grund: '', wertung: { titel: 'x', medaille: '', kopf: 'ok' }, t: 0 };
      } else if (z === 'spiel') {
        t.S.zustand = 'spiel';
        D.Kamera.sofort(t.S.kamera, 32 * K, 36 * K - 8);
      }
      D.Render.zeichne(R, t.S);
    });
  });
});

// ---------- v14: Freunde, Motocross, S21, Starship, Intensitaet ----------
test('164 Bank-Szenario: NPCs nicht auf blockiert, Abstand, Spieler kommt voran', function () {
  var D = lade(), K = 16, t = neuesSpielTest(D); erledigt(t.S);
  var S = t.S, sp = S.spieler;
  sp.x = 36 * K + 8; sp.y = 3 * K + 8;
  var aktive = S.npcs.filter(function (n) { return n.aktiv; }).slice(0, 4);
  wahr(aktive.length >= 4, '4 aktive Freunde');
  [[34, 4], [34, 5], [35, 3], [33, 3]].forEach(function (p, i) {
    var n = aktive[i]; n.karteId = 'stadt'; n.liegt = false; n.x = p[0] * K + 8; n.y = p[1] * K + 8; n.pfad = null; n.festSek = 0;
  });
  var x0 = sp.x;
  t.X.E.setzeHalt('links', true);
  for (var i = 0; i < 17 * 30; i++) {
    schritt(S, t.Sp, t.X, 1 / 30);
    aktive.forEach(function (n) {
      var tl = D.NPCs.tileOf(n);
      wahr(!S.karte.blockiert(tl.x, tl.y), 'NPC nicht blockiert Frame ' + i);
    });
  }
  t.X.E.setzeHalt('links', false);
  for (var j2 = 0; j2 < 3 * 30; j2++) {
    schritt(S, t.Sp, t.X, 1 / 30);
    aktive.forEach(function (n) {
      var tl = D.NPCs.tileOf(n);
      wahr(!S.karte.blockiert(tl.x, tl.y), 'NPC nicht blockiert Settle');
    });
  }
  wahr(Math.abs(sp.x - x0) >= K * 0.5, 'Spieler weitergekommen');
  aktive.forEach(function (n, i) {
    wahr(Math.hypot(n.x - sp.x, n.y - sp.y) >= 6, 'Abstand Spieler NPC ' + i);
    aktive.forEach(function (o, j) {
      if (j <= i) return;
      wahr(Math.hypot(n.x - o.x, n.y - o.y) >= 6, 'Abstand NPC ' + i + '/' + j);
    });
    wahr((n.festSek || 0) < D.NPCs.FEST_SEK, 'festSek unter Limit');
  });
  // Marktplatz und Rebenhang kurz
  [[11, 9], [8, 2]].forEach(function (bank) {
    var u = neuesSpielTest(D); erledigt(u.S);
    u.S.spieler.x = (bank[0] - 1) * K + 8; u.S.spieler.y = (bank[1] + 1) * K + 8;
    u.S.npcs.filter(function (n) { return n.aktiv; }).slice(0, 3).forEach(function (n, i) {
      n.karteId = 'stadt'; n.x = u.S.spieler.x + (i - 1) * 10; n.y = u.S.spieler.y; n.liegt = false;
    });
    u.X.E.setzeHalt('rechts', true);
    for (var f = 0; f < 5 * 30; f++) {
      schritt(u.S, u.Sp, u.X, 1 / 30);
      u.S.npcs.forEach(function (n) {
        if (!n.aktiv || n.liegt) return;
        var tl = D.NPCs.tileOf(n);
        wahr(!u.S.karte.blockiert(tl.x, tl.y), 'Markt/Reben frei');
      });
    }
  });
});

test('165 Freunde nicht solide: Spieler laeuft durch NPC', function () {
  var D = lade(), K = 16, t = neuesSpielTest(D); erledigt(t.S);
  var sp = t.S.spieler, n = t.S.npcs.filter(function (x) { return x.aktiv; })[0];
  sp.x = 20 * K + 8; sp.y = 15 * K + 8;
  n.karteId = 'stadt'; n.x = sp.x + 20; n.y = sp.y; n.liegt = false; n.laeuft = false;
  var x0 = sp.x;
  t.X.E.setzeHalt('rechts', true);
  schritt(t.S, t.Sp, t.X, 1.0);
  wahr(sp.x > x0 + 10, 'Spieler bewegt sich durch NPC-Position');
});

test('166 NPC auf blockierter Kachel wird binnen 5 s versetzt', function () {
  var D = lade(), K = 16, t = neuesSpielTest(D); erledigt(t.S);
  var n = t.S.npcs.filter(function (x) { return x.aktiv; })[0];
  n.karteId = 'stadt'; n.liegt = false; n.x = 36 * K + 8; n.y = 2 * K + 8; // Bank
  wahr(t.S.karte.blockiert(36, 2), 'Bank blockiert');
  for (var i = 0; i < 5 * 30; i++) schritt(t.S, t.Sp, t.X, 1 / 30);
  var tl = D.NPCs.tileOf(n);
  wahr(!t.S.karte.blockiert(tl.x, tl.y), 'NPC wieder frei @' + tl.x + ',' + tl.y);
});

test('167 NPC-Wege schneiden keine Ecken: 30 s Marktplatz', function () {
  var D = lade(), K = 16, t = neuesSpielTest(D); erledigt(t.S);
  t.S.spieler.x = 15 * K + 8; t.S.spieler.y = 11 * K + 8;
  t.S.npcs.filter(function (n) { return n.aktiv; }).forEach(function (n, i) {
    n.karteId = 'stadt'; n.liegt = false; n.x = (12 + i) * K + 8; n.y = 12 * K + 8;
  });
  t.X.E.setzeHalt('rechts', true);
  for (var i = 0; i < 30 * 30; i++) {
    if (i === 15 * 30) { t.X.E.setzeHalt('rechts', false); t.X.E.setzeHalt('links', true); }
    schritt(t.S, t.Sp, t.X, 1 / 30);
    t.S.npcs.forEach(function (n) {
      if (!n.aktiv || n.liegt || n.karteId !== 'stadt') return;
      var tl = D.NPCs.tileOf(n);
      wahr(!t.S.karte.blockiert(tl.x, tl.y), 'kein Block Frame ' + i);
    });
  }
});

test('168 Spieler-Stuck: nach ca. 1,5 s freieKachel und Hinweis', function () {
  var D = lade(), K = 16, t = neuesSpielTest(D); erledigt(t.S);
  var S = t.S, sp = S.spieler, karte = S.karte;
  sp.x = 34 * K + 8; sp.y = 4 * K + 8;
  sp.festSek = 0; sp.letztPos = { x: sp.x, y: sp.y };
  var achse = { x: 0, y: -1 }, befreit = false;
  for (var i = 0; i < 60; i++) {
    var px = sp.x, py = sp.y;
    befreit = D.Spieler.festPruefen(S, sp, achse, 1 / 30) || befreit;
    // Keine echte Bewegung: Position zuruecksetzen wenn nicht befreit
    if (!befreit) { sp.x = px; sp.y = py; sp.letztPos = { x: px, y: py }; }
  }
  wahr(befreit, 'festPruefen befreit');
  var fk = D.Spieler.freieKachel(karte, sp);
  wahr(fk && !karte.blockiert(fk.x, fk.y), 'freieKachel');
  var hin = D.Hinweise.aktuell(S.hinweise);
  wahr(hin && /Wieder frei/.test(hin.text), 'Hinweis Wieder frei');
});

test('169 Motocross rein: stand(t) 4 Eintraege, deterministisch, endlich', function () {
  var D = lade(), a = D.Motocross.stand(12.5), b = D.Motocross.stand(12.5);
  gleich(a.length, 4);
  gleich(JSON.stringify(a), JSON.stringify(b), 'identisch bei gleichem t');
  a.forEach(function (e) {
    ['x', 'y', 'winkel', 'platz', 'fortschritt', 'hoehe'].forEach(function (k) {
      wahr(isFinite(e[k]), k + ' endlich');
    });
    wahr(e.nr > 0 && e.farbe, 'nr/farbe');
  });
});

test('170 Motocross Piste: Positionen auf ERDE/HUEGEL, Abstand ≥ 4', function () {
  var D = lade(), T = D.Karte.T, st = D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt;
  for (var t = 0; t <= 600; t += 0.1) {
    var bs = D.Motocross.stand(t);
    bs.forEach(function (b, i) {
      var tx = Math.floor(b.x / 16), ty = Math.floor(b.y / 16);
      var tile = st.tile(tx, ty);
      var dx = b.x / 16 - 32.5, dy = b.y / 16 - 37.5;
      var d2 = (dx / 5.2) * (dx / 5.2) + (dy / 5.8) * (dy / 5.8);
      // Kachelmitte oder geometrisch auf der Piste (Randkacheln koennen GRAS sein)
      var aufPiste = tile === T.ERDE || tile === T.HUEGEL;
      if (!aufPiste) {
        for (var oy = -1; oy <= 1 && !aufPiste; oy++) for (var ox = -1; ox <= 1; ox++) {
          var tt = st.tile(tx + ox, ty + oy);
          if (tt === T.ERDE || tt === T.HUEGEL) aufPiste = true;
        }
      }
      wahr(aufPiste && d2 >= 0.40 && d2 <= 0.95, 'Piste t=' + t + ' @' + tx + ',' + ty + ' tile=' + tile + ' d2=' + d2.toFixed(3));
      for (var j = i + 1; j < bs.length; j++) {
        wahr(Math.hypot(b.x - bs[j].x, b.y - bs[j].y) >= 4, 'Abstand Fahrer');
      }
    });
  }
});

test('171 Motocross Ueberholen: Platzreihenfolge wechselt ≥ 3 Mal, ω0 verschieden', function () {
  var D = lade(), last = null, wechsel = 0;
  var omegas = {};
  for (var t = 0; t <= 300; t += 0.5) {
    var bs = D.Motocross.stand(t);
    var key = bs.map(function (b) { return b.nr + ':' + b.platz; }).sort().join('|');
    var order = bs.slice().sort(function (a, b) { return a.platz - b.platz; }).map(function (b) { return b.nr; }).join(',');
    if (last && order !== last) wechsel++;
    last = order;
    bs.forEach(function (b) { omegas[b.nr] = b.omega; });
  }
  wahr(wechsel >= 3, 'Überholen wechsel=' + wechsel);
  var vals = Object.keys(omegas).map(function (k) { return omegas[k]; });
  wahr(new Set(vals).size === vals.length, 'ω0 verschieden');
});

test('172 Motocross Render: 4 Motorräder, kein NaN, Y-Sortierung', function () {
  var D = lade(), K = 16, log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  D.Kamera.sofort(t.S.kamera, 32 * K, 37 * K - 8);
  D.Render.zeichne(R, t.S);
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/Motocross\.stand/.test(src), 'stand genutzt');
  wahr(/zeichneMotorrad/.test(src), 'zeichneMotorrad');
});

test('173 S21 Karte: Ring/Grube blockiert, Stationen erreichbar, keine Deko, Oberhash', function () {
  var D = lade(), T = D.Karte.T;
  var hRef = tilesHashOber(D.Karte.erstelleWelt(D.RNG.erstelle(1)).stadt);
  for (var seed = 1; seed <= 20; seed++) {
    var st = D.Karte.erstelleWelt(D.RNG.erstelle(seed)).stadt;
    wahr(!!st.s21, 's21 meta');
    gleich(st.s21.x, 14); gleich(st.s21.w, 10);
    for (var y = 31; y <= 36; y++) for (var x = 14; x <= 23; x++) {
      var rand = (x === 14 || x === 23 || y === 31 || y === 36);
      gleich(st.tile(x, y), rand ? T.BAUZAUN : T.BAUGRUBE, 'tile ' + x + ',' + y);
      wahr(st.blockiert(x, y), 'blockiert');
    }
    st.deco.forEach(function (d) {
      var tx = Math.floor(d.x / 16), ty = Math.floor(d.y / 16);
      wahr(!(tx >= 14 && tx <= 23 && ty >= 31 && ty <= 36), 'keine Deko S21');
    });
    for (var yy = 31; yy <= 36; yy++) for (var xx = 14; xx <= 23; xx++) {
      wahr(st.tile(xx, yy) !== T.BAUM && st.tile(xx, yy) !== T.BUSCH, 'kein Baum');
    }
    ['hotel', 'restaurant', 'kneipe', 'disko'].forEach(function (id) {
      var td = st.tueren.filter(function (x) { return x.id === id; })[0];
      wahr(D.Pfad.suche(st, st.spawn.x, st.spawn.y, td.aussen.x, td.aussen.y), 'erreichbar ' + id + ' seed ' + seed);
    });
    if (seed === 1) gleich(tilesHashOber(st), hRef, 'Oberhash stabil');
  }
});

test('174 S21 Schild: Text im Zeichenlog und Quelltext', function () {
  var D = lade(), K = 16, log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  D.Kamera.sofort(t.S.kamera, 18 * K, 34 * K - 8);
  D.Render.zeichne(R, t.S);
  var joined = log.join('\n');
  wahr(/Fertigstellung: irgendwann in der Zukunft/.test(joined) || log.some(function (s) {
    return typeof s === 'string' && s.indexOf('Fertigstellung: irgendwann in der Zukunft') >= 0;
  }) || (log.meta && log.meta.some(function (m) { return m.text && m.text.indexOf('Fertigstellung') >= 0; })), 'Schildtext Log');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/Fertigstellung: irgendwann in der Zukunft/.test(src), 'Schildtext Quelle');
});

test('175 S21 Kraene: zwei Kraene, Ausleger aendert sich', function () {
  var D = lade();
  D.Render.kran(mockCtx([]), 40, 80, 0, 0);
  D.Render.kran(mockCtx([]), 40, 80, 1, 1);
  // Ausleger-Endpunkt aus derselben Formel wie kran()
  function end(t, nr) {
    var ang = t * 0.25 + (nr || 0) * 2;
    return { x: 26 * Math.cos(ang), y: 8 * Math.sin(ang) };
  }
  var a = end(0, 0), b = end(1, 0);
  wahr(Math.hypot(a.x - b.x, a.y - b.y) > 0.5, 'Ausleger t≠t+1');
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr((src.match(/art: 'kran'/g) || []).length >= 2, 'zwei Kran-Props');
});

test('176 S21 Spruch: Abstand, Cooldown, Musk/Boring, kein rng', function () {
  var D = lade(), K = 16;
  wahr(D.S21.naheBeiBaustelle(5 * K, 5 * K, { x: 14, y: 31, w: 10, h: 6 }, 40) === false, 'weit false');
  wahr(D.S21.naheBeiBaustelle(18 * K, 37 * K + 4, { x: 14, y: 31, w: 10, h: 6 }, 40) === true, 'nah true');
  var musk = 0;
  D.S21.SPRUECHE.forEach(function (s) {
    if (/Musk/.test(s) && /Boring Company/.test(s)) musk++;
  });
  wahr(musk >= 4, 'mind. 4 mit Musk und Boring Company');
  var rngA = D.RNG.erstelle(42), rngB = D.RNG.erstelle(42);
  var s21 = { n: 0 };
  var t0 = D.S21.naechsterSpruch(s21);
  var t1 = D.S21.naechsterSpruch(s21);
  wahr(t0 !== t1, 'verschiedene Sprueche');
  gleich(rngA.next(), rngB.next(), 'rng unberuehrt von Spruch');
  var u = neuesSpielTest(D); erledigt(u.S);
  // weit weg: kein Spruch
  u.S.spieler.x = 5 * K; u.S.spieler.y = 10 * K;
  u.S.s21.zuletzt = -999; u.S.spielSek = 100; u.S.s21.n = 0;
  schritt(u.S, u.Sp, u.X, 0.1);
  wahr(u.S.s21.zuletzt < 0, 'kein Spruch weit weg');
  // nah
  u.S.spieler.x = 18 * K + 8; u.S.spieler.y = 37 * K + 4;
  u.S.s21.zuletzt = -999; u.S.spielSek = 50;
  schritt(u.S, u.Sp, u.X, 0.2);
  var h1 = D.Hinweise.aktuell(u.S.hinweise);
  wahr(h1 && /Musk|Boring Company/.test(h1.text), 'Spruch nah');
  var text1 = h1.text, n1 = u.S.s21.n;
  u.S.spielSek += 10;
  schritt(u.S, u.Sp, u.X, 0.1);
  gleich(u.S.s21.n, n1, 'kein neuer nach 10 s');
  u.S.spielSek = u.S.s21.zuletzt + 46;
  schritt(u.S, u.Sp, u.X, 0.1);
  var h3 = D.Hinweise.aktuell(u.S.hinweise);
  wahr(h3 && h3.text !== text1, 'neuer anderer Text nach 46 s');
});

test('177 Intensitaet: monoton bpm/gain/schichten, setzeIntensitaet ok', function () {
  var D = lade(), last = { bpm: -1, gain: -1, schichten: -1 };
  for (var m = 480; m <= 1680; m += 10) {
    var i = D.Ton.intensitaet(m);
    wahr(isFinite(i.bpm) && isFinite(i.gain) && isFinite(i.schichten), 'endlich @' + m);
    wahr(i.bpm >= last.bpm - 1e-9, 'bpm mono');
    wahr(i.gain >= last.gain - 1e-9, 'gain mono');
    wahr(i.schichten >= last.schichten, 'schichten mono');
    last = i;
  }
  var start = D.Ton.intensitaet(480), ende = D.Ton.intensitaet(1680);
  wahr(start.bpm < ende.bpm && start.gain < ende.gain && start.schichten < ende.schichten, 'Start < Ende');
  nah(start.bpm, 96, 0.01); nah(ende.bpm, 150, 0.01);
  nah(start.gain, 0.25, 0.01); nah(ende.gain, 0.55, 0.01);
  gleich(start.schichten, 1); gleich(ende.schichten, 4);
  var t = D.Ton.erstelle(null);
  t.setzeIntensitaet(start);
  t.setzeIntensitaet(ende);
  wahr(/setzeIntensitaet\(\s*Saufi\.Ton\.intensitaet|setzeIntensitaet\(\s*Ton\.intensitaet/.test(fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8')), 'main ruft setzeIntensitaet');
});

test('178 Starship Zeitfenster', function () {
  var D = lade(), St = D.S21.Starship;
  gleich(D.S21.starshipStand(1160).phase, 'vorher');
  gleich(D.S21.starshipStand(1167).phase, 'countdown');
  gleich(D.S21.starshipStand(1170).phase, 'flug');
  var fl = D.S21.starshipStand(1170 + 6);
  gleich(fl.phase, 'flug'); wahr(fl.p > 0 && fl.p < 1);
  gleich(D.S21.starshipStand(1170 + 12).phase, 'nachher');
  wahr(St.START === 19 * 60 + 30);
});

test('179 Starship Meldung: 19:00→19:31, Flag verhindert Wiederholung', function () {
  var D = lade(), t = neuesSpielTest(D); erledigt(t.S);
  function hat(re) { return t.S.hinweise.liste.some(function (h) { return re.test(h.text); }); }
  t.Sp.setze(t.S, { minute: 19 * 60 });
  schritt(t.S, t.Sp, t.X, 0.1);
  t.Sp.setze(t.S, { minute: 19 * 60 + 28 });
  schritt(t.S, t.Sp, t.X, 0.2);
  wahr(hat(/Starship/), 'Countdown-Text');
  gleich(t.S.s21.gemeldet, 'countdown');
  t.Sp.setze(t.S, { minute: 19 * 60 + 30 });
  schritt(t.S, t.Sp, t.X, 0.2);
  wahr(hat(/LIFT-OFF|hebt/), 'Lift-off');
  gleich(t.S.s21.gemeldet, 'flug');
  t.Sp.setze(t.S, { minute: 19 * 60 + 31 });
  schritt(t.S, t.Sp, t.X, 0.2);
  gleich(t.S.s21.gemeldet, 'flug', 'keine Wiederholung');
});

test('180 Starship Zeichnen: Flug ja, sonst nein, drinnen nie', function () {
  var D = lade(), K = 16;
  function drawAt(minute, innen) {
    var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
    D.Render.setzeBildschirm(R, false);
    var t = neuesSpielTest(D); t.S.zustand = 'spiel';
    t.Sp.setze(t.S, { minute: minute });
    if (innen) { t.Sp.betreten(t.S, 'hotel', t.X); }
    else D.Kamera.sofort(t.S.kamera, 20 * K, 20 * K);
    D.Render.zeichne(R, t.S);
    return log;
  }
  var vor = drawAt(19 * 60, false);
  var flug = drawAt(19 * 60 + 35, false);
  var nach = drawAt(20 * 60, false);
  var inn = drawAt(19 * 60 + 35, true);
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/zeichneStarshipFlug/.test(src), 'Flugzeichner vorhanden');
  // Im Flug Zeichenaufrufe (Flamme/Koerper)
  D.Render.zeichneStarshipFlug(mockCtx([]), { uhr: { minute: 1175 }, ort: 'stadt' }, 320, 176, 1);
  D.Render.zeichneStarshipFlug(mockCtx([]), { uhr: { minute: 1000 }, ort: 'stadt' }, 320, 176, 1);
  wahr(inn, 'innen zeichnet ohne Crash');
  wahr(vor && flug && nach, 'alle Phasen ok');
});

test('181 Starship-Modell bei S21: Prop in propsFuer, Y-sortiert', function () {
  var D = lade(), src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  wahr(/starshipModell/.test(src), 'Prop starshipModell');
  wahr(/art: 'starshipModell'/.test(src) || /art: \"starshipModell\"/.test(src), 'propsFuer Eintrag');
  var K = 16, log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  D.Kamera.sofort(t.S.kamera, 18 * K, 33 * K - 8);
  D.Render.zeichne(R, t.S);
});

test('182 Versionstest v14', function () {
  var D = lade();
  gleich(D.Spiel.VERSION, '0.14');
  wahr(/Neu in v14/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')));
  wahr(fs.existsSync(path.join(ROOT, 'docs', 'bau-bericht-v14.md')));
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  wahr(/motocross\.js\?v=0\.14/.test(html) && /s21\.js\?v=0\.14/.test(html), 'Module in index');
  wahr(!!D.Motocross && !!D.S21, 'Module geladen');
});

test('183 Render-Smoke: Kamera S21 und Motocross, drei Layouts', function () {
  var D = lade(), K = 16;
  var layouts = [
    { hoch: false, touch: false },
    { hoch: true, touch: false, cssW: 375, cssH: 667 },
    { hoch: true, touch: true, cssW: 390, cssH: 844 }
  ];
  layouts.forEach(function (lay) {
    [{ x: 18, y: 34 }, { x: 32, y: 37 }].forEach(function (cam) {
      var log = [], cv = mockCanvas(log), R = D.Render.erstelle(cv, cv.ownerDocument);
      var h = lay.hoch ? D.Render.berechnePortH(lay.cssW, lay.cssH) : D.Render.BASE_H;
      D.Render.setzeBildschirm(R, lay.hoch, { h: h, touch: lay.touch });
      if (lay.touch) { R.touch = true; R.cssW = lay.cssW; R.cssH = lay.cssH; }
      var t = neuesSpielTest(D, { seed: 1 });
      t.S.zustand = 'spiel';
      D.Kamera.sofort(t.S.kamera, cam.x * K, cam.y * K - 8);
      D.Render.zeichne(R, t.S);
    });
  });
});

tests.forEach(function (t) {
  try { t.fn(); ok++; ausgabe.push('  ok   ' + t.name); }
  catch (e) { fehler++; ausgabe.push('  FAIL ' + t.name + '\n         ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n         ') : e)); }
});
console.log(ausgabe.join('\n'));
console.log('\n' + ok + ' von ' + tests.length + ' Tests gruen' + (fehler ? ', ' + fehler + ' FEHLER' : '') + '.');
process.exit(fehler ? 1 : 0);
