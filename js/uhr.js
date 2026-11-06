/* Spieluhr Samstag 08:00 bis Sonntag 04:00, 36 s Echtzeit pro Spielstunde, Licht pro Uhrzeit, Oeffnungszeiten.
   Zeit ist intern in Minuten seit Samstag 00:00 (08:00 = 480, Sonntag 04:00 = 1680). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var START = 8 * 60, ENDE = 28 * 60, SEK_PRO_STUNDE = 36;

  function erstelle(tempo) { return { minute: START, tempo: tempo > 0 ? tempo : 1 }; }

  // Gibt die vergangenen Spielstunden zurueck.
  function update(uhr, dt) {
    var alt = uhr.minute, schritt = dt * 60 / SEK_PRO_STUNDE * uhr.tempo;
    uhr.minute = Math.min(ENDE, uhr.minute + schritt);
    return (uhr.minute - alt) / 60;
  }
  function vorbei(uhr) { return uhr.minute >= ENDE; }
  function zeitText(minute) {
    var m = Math.floor(minute), hh = Math.floor(m / 60) % 24, mm = m % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function text(uhr) { return zeitText(uhr.minute); }
  function tag(uhr) { return uhr.minute < 24 * 60 ? 'Samstag' : 'Sonntag'; }
  function phase(uhr) {
    var h = uhr.minute / 60;
    if (h < 11) return 'Morgen'; if (h < 15) return 'Mittag'; if (h < 18) return 'Nachmittag';
    if (h < 21) return 'Abend'; if (h < 24) return 'Nacht'; return 'Tiefe Nacht';
  }

  // Oeffnungszeiten [von, bis) in Minuten. Hotel immer, Restaurant 11-23 (Tresen bis 01:00, Kueche bis 22:00),
  // Kneipe 14-03, Partykeller 22-04, Motocross-Rennen 12-20.
  var OFFEN = { hotel: [0, 99999], restaurant: [11 * 60, 23 * 60], kneipe: [14 * 60, 27 * 60], disko: [22 * 60, 28 * 60 + 1], apotheke: [8 * 60, 20 * 60], motocross: [12 * 60, 20 * 60] };
  function offen(ort, minute) { var o = OFFEN[ort]; return !o ? true : (minute >= o[0] && minute < o[1]); }
  // Wer schon drin ist, darf am Tresen bleiben, bis auch das zu ist.
  function tresenOffen(ort, minute) { return ort === 'restaurant' ? (minute >= OFFEN.restaurant[0] && minute < 25 * 60) : offen(ort, minute); }
  function kuecheOffen(minute) { return minute >= 11 * 60 && minute < 22 * 60; }
  function buffetOffen(minute) { return minute >= 7 * 60 && minute < 11 * 60; }

  // Licht zum Multiplizieren: morgens hell mit gruenlichem Gold, mittags weiss, nachmittags warm und dunkler, abends rosa bis violett, nachts fast schwarz.
  // Abend 19–21 warm-orange; Nacht etwas angehoben (Luminanz ≥ 0.10 um 02:30); Monotonie 08→20→26 bleibt
  var LICHT = [
    [8, 0xf0ffcc], [9.5, 0xf6ffe0], [11, 0xffffff], [15, 0xfff3de], [17, 0xffd8a8], [18.5, 0xffb27e],
    [19.5, 0xffa060], [20, 0xe88850], [21, 0xc07058], [22.5, 0x5a5a9c], [24, 0x3a3a7a], [26.5, 0x2e2e68], [28, 0x2a2a5a]
  ];
  function kanal(f, k) { return (f >> k) & 255; }
  function mische(a, b, t) {
    return { r: Math.round(kanal(a, 16) + (kanal(b, 16) - kanal(a, 16)) * t), g: Math.round(kanal(a, 8) + (kanal(b, 8) - kanal(a, 8)) * t), b: Math.round(kanal(a, 0) + (kanal(b, 0) - kanal(a, 0)) * t) };
  }
  function klemme(v) { return Math.max(0, Math.min(1, v)); }
  function licht(uhr) {
    var h = uhr.minute / 60, f = LICHT[LICHT.length - 1][1], farbe = null;
    if (h <= LICHT[0][0]) farbe = mische(LICHT[0][1], LICHT[0][1], 0);
    for (var i = 0; i < LICHT.length - 1 && !farbe; i++) {
      var a = LICHT[i], b = LICHT[i + 1];
      if (h >= a[0] && h <= b[0]) farbe = mische(a[1], b[1], (h - a[0]) / (b[0] - a[0]));
    }
    if (!farbe) farbe = mische(f, f, 0);
    return {
      r: farbe.r, g: farbe.g, b: farbe.b,
      glut: klemme((h - 17.5) / 3),          // wie hell Fenster und Neon leuchten
      lampen: klemme((h - 18) / 2),          // Anteil der Laternen, die an sind
      sonne: h < 11 ? 1 : klemme(1 - (h - 11) / 8)
    };
  }
  // 0 (schwarz) bis 1 (weiss): Helligkeit des Lichts, fuer Tests und Musik.
  function helligkeit(uhr) { var l = licht(uhr); return (0.299 * l.r + 0.587 * l.g + 0.114 * l.b) / 255; }

  Saufi.Uhr = {
    START: START, ENDE: ENDE, SEK_PRO_STUNDE: SEK_PRO_STUNDE, OFFEN: OFFEN,
    erstelle: erstelle, update: update, vorbei: vorbei, text: text, zeitText: zeitText, tag: tag, phase: phase,
    licht: licht, helligkeit: helligkeit, offen: offen, tresenOffen: tresenOffen, kuecheOffen: kuecheOffen, buffetOffen: buffetOffen
  };
})(globalThis);
