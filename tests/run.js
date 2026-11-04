#!/usr/bin/env node
/* Eigener Test-Runner ohne Abhaengigkeiten: laedt die Spieldateien per vm in einen Kontext. Aufruf: node tests/run.js */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');

var ROOT = path.join(__dirname, '..');
// Reihenfolge wie die Script-Tags in index.html
var DATEIEN = ['js/rng', 'js/uhr', 'js/charaktere', 'js/getraenke', 'js/essen', 'js/pegel', 'js/cheats', 'js/runden', 'js/ereignisse', 'js/punkte', 'js/hinweise',
  'js/speicher', 'js/karte', 'js/pfad', 'js/kamera', 'js/eingabe', 'js/spieler', 'js/npcs', 'js/ton', 'music/playlist', 'js/musik', 'js/render', 'js/main'];

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
  'moveTo', 'lineTo', 'arc', 'rect', 'fill', 'stroke', 'clip', 'quadraticCurveTo', 'bezierCurveTo'];
var CTX_EIGENSCHAFTEN = ['fillStyle', 'strokeStyle', 'font', 'textAlign', 'textBaseline', 'globalAlpha', 'globalCompositeOperation', 'lineWidth', 'imageSmoothingEnabled'];
var GCO = ['source-over', 'lighter', 'multiply', 'screen', 'destination-out', 'source-atop'];
function pruefeZahlen(name, args) {
  Array.prototype.forEach.call(args, function (a) { if (typeof a === 'number' && !isFinite(a)) throw new Error('Canvas ' + name + ' mit ungueltiger Zahl ' + a); });
}
function mockCtx(log) {
  var store = { fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif' };
  return new Proxy(store, {
    get: function (t, k) {
      if (typeof k === 'symbol') return undefined;
      if (k === 'measureText') return function (s) { return { width: String(s).length * 4 }; };
      if (k === 'createRadialGradient') return function (a, b, c, d, e, f) { pruefeZahlen(k, arguments); if (c < 0 || f < 0) throw new Error('negativer Radius'); return { addColorStop: function (o, col) { if (!(o >= 0 && o <= 1) || typeof col !== 'string') throw new Error('addColorStop ' + o + ' ' + col); } }; };
      if (k === 'createLinearGradient') return function () { pruefeZahlen(k, arguments); return { addColorStop: function () {} }; };
      if (CTX_EIGENSCHAFTEN.indexOf(k) >= 0) return t[k];
      if (CTX_METHODEN.indexOf(k) >= 0) return function (a) {
        pruefeZahlen(k, arguments);
        if (k === 'fillText') { if (typeof a !== 'string') throw new Error('fillText mit ' + typeof a); if (log) log.push(a); }
        if (k === 'drawImage') { if (!arguments[0] || !arguments[0].getContext) throw new Error('drawImage braucht ein Canvas'); }
      };
      throw new Error('Unbekannte Canvas-Eigenschaft: ' + String(k));
    },
    set: function (t, k, v) {
      if (CTX_EIGENSCHAFTEN.indexOf(k) < 0) throw new Error('Unbekannte Canvas-Eigenschaft gesetzt: ' + String(k));
      if (k === 'globalCompositeOperation' && GCO.indexOf(v) < 0) throw new Error('Unbekannte Mischart ' + v);
      if (k === 'globalAlpha' && !(v >= 0 && v <= 1)) throw new Error('globalAlpha ausserhalb 0..1: ' + v);
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v !== 'string' && (!v || typeof v.addColorStop !== 'function')) throw new Error('fillStyle ' + v);
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
  gleich(st1.w, 40); gleich(st1.h, 30);
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
  var treffer = S.treffer[0]; wahr(treffer && treffer.i === 0, 'Playlist-Zeilen sind anklickbar');
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
  gleich(r.S.zustand, 'ende'); wahr(!r.S.ende.sieg); wahr(/Teamstimmung/.test(r.S.ende.grund)); gleich(r.S.runden.team, 0); wahr(r.D.Uhr.zeitText(r.S.uhr.minute) < '19:00', 'schon nachmittags vorbei');
  wahr(r.log.some(function (t) { return /Press F to pay respects/.test(t); }), 'Endbildschirm Niederlage');
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
  wahr(['HOTEL KESSELBLICK', 'GASTHAUS MAULTÄSCHLE', 'ZUM DURSTIGEN DACHS', 'UNTERGRUND 07'].every(function (s) { return log.indexOf(s) >= 0; }), 'Schilder der vier Orte');
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

// ---------- Ausfuehren ----------
var ausgabe = [];
tests.forEach(function (t) {
  try { t.fn(); ok++; ausgabe.push('  ok   ' + t.name); }
  catch (e) { fehler++; ausgabe.push('  FAIL ' + t.name + '\n         ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n         ') : e)); }
});
console.log(ausgabe.join('\n'));
console.log('\n' + ok + ' von ' + tests.length + ' Tests gruen' + (fehler ? ', ' + fehler + ' FEHLER' : '') + '.');
process.exit(fehler ? 1 : 0);
