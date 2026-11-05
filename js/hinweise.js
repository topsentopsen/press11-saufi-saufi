/* Texte: Hinweis 18+, Text-Einblendungen ("PROST!", "HYPER HYPER!"), Scooter-Pool fuer NPC-Sprechblasen. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var TITEL = 'Press11 - Stuttgart Edition';
  // Voller Hinweis (Info-Knopf, README) – ohne "privat"
  var HINWEIS_VOLL = TITEL + ' ist ein fiktives Spaß-Spiel für Erwachsene (ab 18). Alle Personen, Orte, Getränke und Werte sind erfunden. ' +
    'Die Promille-Anzeige ist ein Spielelement und kein Maßstab. Das Spiel ruft nicht zum Trinken auf. ' +
    'Trink im echten Leben nur, was Du verträgst, setz Dich nie betrunken ans Steuer und pass auf Deine Freunde auf. ' +
    'Drogen sind nicht harmlos: Der "Joint" ist nur ein Spiel-Item.';
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
  // v22: eine Dauer für alle Sprechblasen (vorher 2,5–3,5 s)
  var BLASE_SEK = 4.5;

  var SHOUTS = ['HYPER HYPER!', 'HOW MUCH IS THE FISH?', 'ONE MORE!', 'WIE VIEL IST DER KESSEL?', 'JIGGA JIGGA!'];
  var PROST = ['PROST!', 'ZUM WOHL!', 'AUF DIE TRUPPE!', 'SCHWABENTROPFEN!', 'UFF DIE KESSELWELLE!'];
  var STAND_WEG = ['Noch zu, Saufi.', 'Hier isch noch zu.', 'Mach auf, Wirt!', 'Kehrwoche? Nein, Kneipenruhe.'];

  // v18: Sprechblasen nur noch kurze Scooter-Titel und Rufe (keine Liedtexte)
  var SCOOTER = [
    'Hyper Hyper!', 'How much is the fish?', 'Move your ass!', 'Maria (I like it loud)!',
    'Jigga Jigga!', 'Fire!', 'Nessaja!', 'Posse! I need you on the floor!',
    'Weekend!', 'The Logical Song!', 'Faster Harder Scooter!', 'Call me Mañana!',
    'J\'adore Hardcore!', 'Back in the U.K.!', 'Endless Summer!', 'Ramp!',
    'I\'m raving!', 'Stuttgart!', 'Jumping all over the world!', 'Rebel Yell!',
    'Behind the Cow!', 'Cambodia!', 'And no matches!', 'Wicked!',
    'Suzuki!', 'Scooter!', 'Always Hardcore!', 'Respect to the man in the ice cream van!'
  ];
  var SPRUECHE = SCOOTER;
  // v20: Tobi und Bundschuh nicht im Scooter-Pool. Tobi bekommt den Elon-Pool aus elon.js.
  var FIGUR = {}; ['raphael','tobias','schwickendorf','ritzi','siebold','schwinki','stoeckle','probst','himmelsbach','zeise'].forEach(function (id) { FIGUR[id] = SCOOTER; });
  var SITUATION = {}; ['mittrinken','essen','wasser','erwischt','umfallen','aufstehen','scooter','joint'].forEach(function (k) { SITUATION[k] = SCOOTER; });
  var ORT = {}; ['hotel','restaurant','kneipe','disko','stadt','motocross'].forEach(function (k) { ORT[k] = SCOOTER; });
  var PEGEL = {}; ['nuechtern','angeheitert','voll','absturz'].forEach(function (k) { PEGEL[k] = SCOOTER; });

  function pegelStufe(pegel) {
    if (pegel >= 3.0) return 'absturz';
    if (pegel >= 2.0) return 'voll';
    if (pegel >= 1.0) return 'angeheitert';
    return 'nuechtern';
  }

  function lallen(text, pegel) {
    if (pegel < 2.5) return text;
    return String(text)
      .replace(/[Kk]essel/g, 'Kesssel')
      .replace(/en\b/g, 'n')
      .replace(/s\b/g, 'sch')
      .replace(/!\s*$/, '!!');
  }

  function pick(rng, arr) { return arr && arr.length ? (rng && rng.pick ? rng.pick(arr) : arr[Math.floor((rng ? rng.next() : Math.random()) * arr.length)]) : ''; }

  // rng-Verbrauch: genau 2 Aufrufe (next fuer Poolwahl, pick fuer Spruch). Tobi nur Elon, Bundschuh gar kein Scooter.
  function spruch(rng, opt) {
    opt = opt || {};
    if (opt.id === 'bundschuh') {
      if (rng && rng.next) rng.next();
      pick(rng, ['']);
      return '';
    }
    var basis = SCOOTER;
    if (opt.id === 'tobi' && Saufi.Elon && Saufi.Elon.ALLGEMEIN && Saufi.Elon.ALLGEMEIN.length) basis = Saufi.Elon.ALLGEMEIN;
    var pools = [basis];
    var chosenPool = pools[Math.floor((rng && rng.next ? rng.next() : Math.random()) * pools.length)] || basis;
    return lallen(pick(rng, chosenPool) || basis[0], opt.pegel || 0);
  }

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
    SHOUTS: SHOUTS, PROST: PROST, STAND_WEG: STAND_WEG, SPRUECHE: SPRUECHE, SCOOTER: SCOOTER,
    FIGUR: FIGUR, SITUATION: SITUATION, ORT: ORT, PEGEL: PEGEL,
    pegelStufe: pegelStufe, lallen: lallen, spruch: spruch, BLASE_SEK: BLASE_SEK,
    erstelle: erstelle, zeige: zeige, update: update, aktuell: aktuell
  };
})(globalThis);
