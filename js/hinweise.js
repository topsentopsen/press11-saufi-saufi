/* Texte: Hinweis 18+ (Start und Info), Text-Einblendungen ("PROST!", "HYPER HYPER!"), Sprueche. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var TITEL = 'Press11 - Saufi Saufi';
  // Voller Hinweis (Info-Knopf, README)
  var HINWEIS_VOLL = TITEL + ' ist ein fiktives Spaß-Spiel für Erwachsene (ab 18). Alle Personen, Orte, Getränke und Werte sind erfunden. ' +
    'Die Promille-Anzeige ist ein Spielelement und kein Maßstab. Das Spiel ruft nicht zum Trinken auf. ' +
    'Trink im echten Leben nur, was Du verträgst, setz Dich nie betrunken ans Steuer und pass auf Deine Freunde auf. ' +
    'Drogen sind nicht harmlos: Der "Joint" ist nur ein Spiel-Item. Privates Spiel, nicht zum Teilen.';
  // Kurzfassung in Zeilen fuer den Startbildschirm (320 Pixel breit)
  var HINWEIS_START = [
    'Ab 18! Fiktives Spaß-Spiel für Erwachsene.',
    'Alle Personen, Orte und Werte sind erfunden.',
    'Die Promille-Anzeige ist nur ein Spielelement.',
    'Kein Aufruf zum Trinken. Im echten Leben:',
    'trink nur, was Du verträgst, nie ans Steuer,',
    'pass auf Deine Freunde auf. Drogen sind nicht',
    'harmlos: der "Joint" ist nur ein Spiel-Item.'
  ];
  var DANKE = 'Danke fürs Spielen, trink Wasser.';

  var SHOUTS = ['HYPER HYPER!', 'HOW MUCH IS THE FISH?', 'ONE MORE!', 'WIE VIEL IST DER KESSEL?'];
  var PROST = ['PROST!', 'ZUM WOHL!', 'AUF DIE TRUPPE!', 'SCHWABENTROPFEN!'];
  var STAND_WEG = ['Noch zu, Saufi.', 'Hier isch noch zu.', 'Mach auf, Wirt!'];
  var SPRUECHE = [
    'Wer hat Durst?', 'Noch eine!', 'Kehrwoche kann warten.', 'Des gaht scho.', 'Net so hektisch, Saufi.',
    'Trink a Wasser, Saufi.', 'Kessel-Wetter heut!', 'Gibt ja Maultasche.'
  ];

  function erstelle() { return { liste: [], t: 0 }; }
  // art: 'info' | 'gross' (Runde, Shout) | 'gut' | 'schlecht'
  function zeige(h, text, dauer, art) {
    if (h.liste.length && h.liste[h.liste.length - 1].text === text) { h.liste[h.liste.length - 1].rest = dauer || 2.2; return; }
    h.liste.push({ text: text, rest: dauer || 2.2, dauer: dauer || 2.2, art: art || 'info' });
    if (h.liste.length > 4) h.liste.shift();
  }
  function update(h, dt) {
    h.t += dt;
    for (var i = h.liste.length - 1; i >= 0; i--) { h.liste[i].rest -= dt; if (h.liste[i].rest <= 0) h.liste.splice(i, 1); }
  }
  function aktuell(h) { return h.liste.length ? h.liste[h.liste.length - 1] : null; }

  Saufi.Hinweise = {
    TITEL: TITEL, HINWEIS_VOLL: HINWEIS_VOLL, HINWEIS_START: HINWEIS_START, DANKE: DANKE,
    SHOUTS: SHOUTS, PROST: PROST, STAND_WEG: STAND_WEG, SPRUECHE: SPRUECHE,
    erstelle: erstelle, zeige: zeige, update: update, aktuell: aktuell
  };
})(globalThis);
