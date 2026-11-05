/* Stuttgart 21: Sprüche an der Baustelle und Starship-Überflug. Reine Funktionen plus Konstanten. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16;

  var SPRUECHE = [
    'Typisch deutsch: S21 seit Jahren fertig bald. Elon Musk hätte das mit der Boring Company längst in einem halben Jahr gebohrt.',
    'Die Deutschen kriegen\'s einfach nicht auf die Reihe. Musk und die Boring Company: ein halbes Jahr, fertig.',
    'Ein Loch im Boden, zwei Kräne, null Gleise. Musk und die Boring Company schaffen das in einem halben Jahr.',
    'S21: der teuerste Sandkasten Schwabens. Musk bohrt das mit der Boring Company in sechs Monaten.',
    'Wetten, Musk und die Boring Company haben den Tunnel schon gebohrt, bevor hier der Kran sich fertigdreht?',
    'Die Rakete landet sich selbst. S21 nicht. Musk und die Boring Company lachen sich kaputt.',
    'Ein halbes Jahr bis zum Mars mit Musk und der Boring Company, Stuttgart wartet noch auf den Tiefbahnhof.'
  ];

  function naheBeiBaustelle(px, py, rechteck, abstand) {
    if (!rechteck) return false;
    abstand = abstand == null ? 40 : abstand;
    var d = Saufi.Karte.abstand(px, py, rechteck);
    return d > 0 && d <= abstand;
  }

  function naechsterSpruch(s21) {
    s21 = s21 || { n: 0 };
    var text = SPRUECHE[s21.n % SPRUECHE.length];
    s21.n = (s21.n + 1) | 0;
    return text;
  }

  // Starship: Start 19:30 (Minute 1170), Countdown ab T-3, Flug 12 Spielminuten
  var START = 19 * 60 + 30;
  var COUNTDOWN_VON = START - 3;
  var FLUG_MIN = 12;

  function starshipStand(minute) {
    minute = +minute || 0;
    if (minute < COUNTDOWN_VON) return { phase: 'vorher', p: 0 };
    if (minute < START) return { phase: 'countdown', p: (minute - COUNTDOWN_VON) / 3 };
    if (minute < START + FLUG_MIN) return { phase: 'flug', p: (minute - START) / FLUG_MIN };
    return { phase: 'nachher', p: 1 };
  }

  Saufi.S21 = {
    SPRUECHE: SPRUECHE, naheBeiBaustelle: naheBeiBaustelle, naechsterSpruch: naechsterSpruch,
    Starship: { START: START, COUNTDOWN_VON: COUNTDOWN_VON, FLUG_MIN: FLUG_MIN, stand: starshipStand },
    starshipStand: starshipStand
  };
})(globalThis);
