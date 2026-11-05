/* Motivatoren (Himmelsbach, Stoeckle, Siebold): Runden-Anstupser. Eigener Zaehler, kein rng. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var IDS = { himmelsbach: true, stoeckle: true, siebold: true };

  function intervall(n) { return 22 + (((n | 0) * 7) % 11); }

  function text(id, runde, minute) {
    if (!runde) return 'Noch bis vier durchhalten!';
    var ort = (Saufi.Karte && Saufi.Karte.NAMEN && Saufi.Karte.NAMEN[runde.ort]) || runde.ort;
    var zeit = (Saufi.Uhr && Saufi.Uhr.zeitText) ? Saufi.Uhr.zeitText(runde.zeit) : String(runde.zeit);
    var pool = {
      himmelsbach: ['Auf geht\'s, ' + zeit + ' im ' + ort + '!', 'Net trödeln, ' + ort + ' um ' + zeit + '!'],
      stoeckle: ['Net trödeln, Kneipe um ' + zeit + '!', 'Auf geht\'s, ' + zeit + ' im ' + ort + '!'],
      siebold: ['Rechnerisch bleiben ' + Math.max(0, Math.round(runde.zeit - (minute || 0))) + ' Minuten bis zur Runde.', 'Auf geht\'s, ' + zeit + ' im ' + ort + '!']
    };
    var arr = pool[id] || ['Auf geht\'s, ' + zeit + ' im ' + ort + '!'];
    var n = (minute | 0) + (id ? id.length : 0);
    return arr[n % arr.length];
  }

  function sprecher(npcs, ort, k) {
    if (!npcs) return null;
    if (npcs.filter(function (n) { return n.blase; }).length >= 2) return null;
    var kand = npcs.filter(function (n) {
      return n.aktiv && !n.liegt && n.karteId === ort && !n.blase && IDS[n.id];
    });
    if (!kand.length) return null;
    return kand[(k | 0) % kand.length];
  }

  Saufi.Motiv = { intervall: intervall, text: text, sprecher: sprecher, IDS: IDS };
})(globalThis);
