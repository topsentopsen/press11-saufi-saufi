/* Eingabe: gehaltene und frisch gedrueckte Tasten pro Frame, Klicks/Tippen (Pointer) und ein virtueller Stick fuer Touch. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var AKTIONEN = {
    hoch: ['ArrowUp', 'KeyW'], runter: ['ArrowDown', 'KeyS'],
    links: ['ArrowLeft', 'KeyA'], rechts: ['ArrowRight', 'KeyD'],
    aktion: ['KeyE', 'Space', 'Enter', 'NumpadEnter'],     // Tuer, Bestellen, Essen, Prost, Boost-Tanz
    pressF: ['KeyF'],                                       // Press F (Aufstehen / Respekt)
    wasser: ['KeyQ'],                                       // Wasser schnell trinken / Freund wecken
    item: ['KeyR'],                                         // Joint, Scooter-Boost
    playlist: ['KeyP'],                                     // Scooter-Playlist
    stumm: ['KeyM'], musik: ['KeyN'], pause: ['Escape'],
    wahl1: ['Digit1', 'Numpad1'], wahl2: ['Digit2', 'Numpad2'], wahl3: ['Digit3', 'Numpad3'],
    debug: ['Backquote']
  };
  var RELEVANT = {};
  Object.keys(AKTIONEN).forEach(function (a) { AKTIONEN[a].forEach(function (c) { RELEVANT[c] = true; }); });

  function zuIntern(cx, cy, rect, W, H) { return { x: (cx - rect.left) / rect.width * W, y: (cy - rect.top) / rect.height * H }; }

  // Ein zweites Tippen kurz danach an fast derselben Stelle zaehlt nicht
  var DOPPEL_MS = 280, DOPPEL_PX = 8;

  function erstelle(win, canvas, W, H) {
    var halt = {}, frisch = {}, klicks = [], letzter = null, ersatzMs = 0;
    W = W || 320; H = H || 176;
    var e = {
      stick: { x: 0, y: 0 },      // virtueller Joystick, -1 bis 1
      druecke: function (code) { if (!halt[code]) frisch[code] = true; halt[code] = true; },
      loese: function (code) { halt[code] = false; },
      halt: function (a) { return AKTIONEN[a].some(function (c) { return !!halt[c]; }); },
      neu: function (a) { return AKTIONEN[a].some(function (c) { return !!frisch[c]; }); },
      // Bewegungsachse aus Tasten oder Stick, Laenge hoechstens 1
      achse: function () {
        var x = (e.halt('rechts') ? 1 : 0) - (e.halt('links') ? 1 : 0), y = (e.halt('runter') ? 1 : 0) - (e.halt('hoch') ? 1 : 0);
        if (!x && !y) { x = e.stick.x; y = e.stick.y; }
        var l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        return { x: x, y: y };
      },
      klicke: function (x, y, quelle) { if (isFinite(x) && isFinite(y)) klicks.push({ x: x, y: y, zeiger: !!quelle }); },
      // Pointer mit Zeitstempel: Doppeltipper herausfiltern. Rueckgabe true, wenn der Tipp zaehlt
      zeiger: function (x, y, ms) {
        if (letzter && ms - letzter.ms >= 0 && ms - letzter.ms < DOPPEL_MS && Math.hypot(x - letzter.x, y - letzter.y) < DOPPEL_PX) return false;
        letzter = { x: x, y: y, ms: ms };
        e.klicke(x, y, 'zeiger');
        return true;
      },
      aktiv: function () { return klicks.length > 0 || Object.keys(frisch).length > 0 || Object.keys(halt).some(function (c) { return halt[c]; }); },
      // Knopf auf dem Bildschirm: wirkt wie ein kurzer Tastendruck
      tippe: function (a) { if (AKTIONEN[a]) frisch[AKTIONEN[a][0]] = true; },
      // Gedrückt halten (Krug-Fenster, Touch-Knopf). an=true setzt auch den ersten Tipp.
      halte: function (a, an) {
        var code = AKTIONEN[a] && AKTIONEN[a][0];
        if (!code) return;
        if (an) e.druecke(code); else e.loese(code);
      },
      touch: false,
      setzeMass: function (nw, nh) { if (nw > 0) W = nw; if (nh > 0) H = nh; },
      klicks: function () { return klicks; },
      ende: function () { frisch = {}; klicks = []; }
    };
    if (win && win.addEventListener) {
      var imFeld = function (ev) { var t = ev && ev.target, n = t && t.tagName ? String(t.tagName).toUpperCase() : ''; return n === 'TEXTAREA' || n === 'INPUT'; };
      win.addEventListener('keydown', function (ev) { if (imFeld(ev)) return; if (RELEVANT[ev.code]) { ev.preventDefault(); e.druecke(ev.code); } });
      win.addEventListener('keyup', function (ev) { if (imFeld(ev)) return; if (RELEVANT[ev.code]) { ev.preventDefault(); e.loese(ev.code); } });
      win.addEventListener('blur', function () { halt = {}; e.stick.x = 0; e.stick.y = 0; });
      win.addEventListener('pagehide', function () { halt = {}; });
    }
    if (canvas && canvas.addEventListener) {
      var pointerMs = -1;
      function canvasZeiger(clientX, clientY, timeStamp, alsTouch) {
        if (alsTouch) e.touch = true;
        var rect = canvas.getBoundingClientRect();
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) return;
        var p = zuIntern(clientX, clientY, rect, W, H);
        var ms = typeof timeStamp === 'number' && timeStamp > 0 ? timeStamp : (typeof Date !== 'undefined' ? Date.now() : (ersatzMs += 1000));
        e.zeiger(p.x, p.y, ms);
      }
      canvas.addEventListener('pointerdown', function (ev) {
        if (ev.preventDefault) ev.preventDefault();
        if (ev.isPrimary === false) return;
        if (ev.button !== undefined && ev.button > 0) return;
        pointerMs = typeof ev.timeStamp === 'number' ? ev.timeStamp : Date.now();
        canvasZeiger(ev.clientX, ev.clientY, ev.timeStamp, ev.pointerType === 'touch');
      });
      // iOS-Fallback neben Pointer Events: touchstart/touchend mit preventDefault ({passive:false})
      canvas.addEventListener('touchstart', function (ev) {
        if (ev.preventDefault) ev.preventDefault();
        var ts = typeof ev.timeStamp === 'number' ? ev.timeStamp : Date.now();
        if (pointerMs >= 0 && Math.abs(ts - pointerMs) < 80) return; // schon per Pointer verarbeitet
        var t0 = ev.changedTouches && ev.changedTouches[0];
        if (!t0) return;
        canvasZeiger(t0.clientX, t0.clientY, ev.timeStamp, true);
      }, { passive: false });
      canvas.addEventListener('touchend', function (ev) { if (ev.preventDefault) ev.preventDefault(); }, { passive: false });
      canvas.addEventListener('contextmenu', function (ev) { if (ev.preventDefault) ev.preventDefault(); });
    }
    return e;
  }

  Saufi.Eingabe = { AKTIONEN: AKTIONEN, DOPPEL_MS: DOPPEL_MS, DOPPEL_PX: DOPPEL_PX, erstelle: erstelle, zuIntern: zuIntern };
})(globalThis);
