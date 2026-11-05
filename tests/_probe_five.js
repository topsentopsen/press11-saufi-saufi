#!/usr/bin/env node
'use strict';
/* Probe nur Tests 81,86,92,111,112 */
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
var DATEIEN = ['js/rng', 'js/uhr', 'js/charaktere', 'js/getraenke', 'js/essen', 'js/pegel', 'js/cheats', 'js/runden', 'js/ereignisse', 'js/minispiele', 'js/punkte', 'js/hinweise',
  'js/speicher', 'js/karte', 'js/pfad', 'js/kamera', 'js/eingabe', 'js/spieler', 'js/npcs', 'js/ton', 'music/playlist', 'js/musik', 'js/gfx', 'js/szene', 'js/innen', 'js/partikel', 'js/render', 'js/main'];
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
        if (k === 'fillText') { if (typeof a !== 'string') throw new Error('fillText mit ' + typeof a); if (log) log.push(a); }
        if (k === 'fillRect' && log) log.push([].slice.call(arguments));
        if (k === 'arc' && log) log.push(['arc'].concat([].slice.call(arguments)));
        if (k === 'rotate' && log) log.push(['rotate', a]);
        if (k === 'fill' && log) log.push(['fill', t.fillStyle, t.globalAlpha]);
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
function fakeE() {
  var neu = {}, halt = {}, klicks = [];
  return {
    neu: function (a) { return !!neu[a]; }, halt: function (a) { return !!halt[a]; },
    achse: function () { return { x: 0, y: 0 }; },
    klicks: function () { return klicks; }, ende: function () { neu = {}; klicks = []; },
    druecke: function (a) { neu[a] = true; }, setzeHalt: function () {}, klicke: function () {}
  };
}
function neuesSpielTest(Saufi, opt) {
  var X = { E: fakeE() };
  var S = Saufi.Spiel.neu(Object.assign({ seed: 1, start: true }, opt || {}));
  return { S: S, X: X, Sp: Saufi.Spiel };
}

// --- 81 ---
(function () {
  var D = lade();
  function ohneEllipsisKnoepfe(log) {
    log.forEach(function (s) {
      s = String(s);
      if (s.indexOf('…') < 0) return;
      if (/^\d+\.\s/.test(s)) return;
      if (s.length > 42) return;
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
    log.length = 0; S.zustand = 'spiel'; Sp.pauseMenue(S, X); D.Render.zeichne(R, S);
    var ell = log.filter(function (s) { return String(s).indexOf('…') >= 0 && String(s).length <= 42 && !/^\d+\.\s/.test(String(s)); });
    if (ell.length) console.log('81 ellipsis hits', cssW, ell.slice(0, 10));
    ohneEllipsisKnoepfe(log);
    log.length = 0; Sp.infoOverlay(S); D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; Sp.playlistOverlay(S, X); S.musikInfo = { quelle: 'youtube', aktiv: 'youtube', spielt: true, youtubeVerfuegbar: true, hinweis: '' };
    D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; D.Spiel.beende(S, true, 'Sonntag, 04:00 Uhr: Du stehst noch.', X); D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
    log.length = 0; S.zustand = 'umgefallen'; S.pressF = { n: 1, noetig: 5, rest: 2, zweitesLeben: true, t: 0 }; D.Render.zeichne(R, S); ohneEllipsisKnoepfe(log);
  }
  lauf(375, 667, true); lauf(390, 844, true); lauf(667, 375, false);
  console.log('81 OK');
})();

// --- 86 ---
(function () {
  var src = fs.readFileSync(path.join(ROOT, 'js', 'render.js'), 'utf8');
  if (!/resTop\s*\+\s*2/.test(src)) throw new Error('no resTop+2');
  if (/resTop\s*\+\s*40/.test(src)) throw new Error('still resTop+40');
  var D = lade(), t = neuesSpielTest(D), S = t.S;
  S.ort = 'disko'; S.karte = S.welt.innen.disko;
  S.hilfe = ''; S.zustand = 'spiel'; S.runden.runden[0].status = 'aktiv';
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  var h = D.Render.berechnePortH(390, 844);
  D.Render.setzeBildschirm(R, true, { h: h, touch: true });
  R.touch = true; R.cssW = 390; R.cssH = 844;
  D.Render.zeichne(R, S);
  if (!R.hudRunde) throw new Error('no banner');
  if (!(R.hudRunde.y >= R.weltH - 0.5)) throw new Error('banner not in reserve ' + R.hudRunde.y + ' vs ' + R.weltH);
  console.log('86 OK', { banner: R.hudRunde, weltH: R.weltH, H: R.H });
})();

// --- 92 ---
(function () {
  var D = lade();
  var R = D.Render.erstelle(mockCanvas(), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var expect = 320 * Math.sqrt(4.6);
  console.log('92 VW', R.VW, 'expect', expect, 'zoom', R.weltZoom);
  if (Math.abs(R.VW - expect) > 0.5) throw new Error('VW');
  console.log('92 OK');
})();

// --- 111 ---
(function () {
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
      if (!R.endeSonne) throw new Error('no endeSonne');
      var arcs = log.filter(function (a) { return Array.isArray(a) && a[0] === 'arc' && a[3] >= 6; });
      console.log('111 arcs', cssW, arcs.length, arcs.map(function (a) { return a[3]; }));
      if (arcs.length > 3) throw new Error('too many arcs ' + arcs.length);
    }
  }
  ende(390, 844, true, true); ende(844, 390, false, true);
  console.log('111 OK');
})();

// --- 112 ---
(function () {
  var D = lade();
  var log = [], R = D.Render.erstelle(mockCanvas(log), mockCanvas().ownerDocument);
  D.Render.setzeBildschirm(R, false);
  var t = neuesSpielTest(D); t.S.zustand = 'spiel';
  t.S.uhr.minute = 26.5 * 60; t.S.licht = D.Uhr.licht(t.S.uhr);
  D.Render.zeichne(R, t.S);
  var hot = log.filter(function (a) { return Array.isArray(a) && a[0] === 'fill' && typeof a[1] === 'string'; });
  var burns = hot.filter(function (a) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(a[1]);
    if (!m) return false;
    var sum = +m[1] + +m[2] + +m[3], al = a[2] != null ? a[2] : 1;
    return sum >= 735 && al >= 0.6;
  });
  if (burns.length) {
    console.log('112 BURNS', burns.slice(0, 20));
    throw new Error('burnout ' + burns.length);
  }
  console.log('112 OK fills', hot.length);
})();

console.log('ALL FIVE OK');
