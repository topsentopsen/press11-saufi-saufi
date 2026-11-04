/* Einstellungen und Bestwert in localStorage. Blockiert file:// das Speichern, bleiben die Werte im Arbeitsspeicher. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var PRAEFIX = 'saufi.';

  function erstelle(win) {
    var mem = {}, ls = null;
    try { ls = win && win.localStorage ? win.localStorage : null; if (ls) { ls.setItem(PRAEFIX + 'test', '1'); ls.removeItem(PRAEFIX + 'test'); } } catch (e) { ls = null; }
    function lies(k, std) {
      var v = null;
      try { v = ls ? ls.getItem(PRAEFIX + k) : null; } catch (e) { v = null; }
      if (v === null || v === undefined) v = Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
      return v === null ? std : v;
    }
    function schreibe(k, v) {
      mem[k] = String(v);
      try { if (ls) ls.setItem(PRAEFIX + k, String(v)); } catch (e) { /* bleibt im Speicher */ }
    }
    return {
      persistent: !!ls,
      bool: function (k, std) { var v = lies(k, null); return v === null ? !!std : v === '1'; },
      setzeBool: function (k, v) { schreibe(k, v ? '1' : '0'); },
      zahl: function (k, std) { var v = parseFloat(lies(k, '')); return isFinite(v) ? v : std; },
      setzeZahl: function (k, v) { schreibe(k, v); },
      text: lies, setzeText: schreibe
    };
  }

  Saufi.Speicher = { erstelle: erstelle };
})(globalThis);
