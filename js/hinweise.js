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
  // v22 war fest 4,5 s. v35: mindestens 7 s, dazu 60 ms je Zeichen, Deckel bei 10 s.
  var BLASE_MIN = 7, BLASE_MAX = 10, BLASE_JE_ZEICHEN = 0.06;
  var BLASE_SEK = BLASE_MIN;
  function blaseDauer(text) {
    var n = String(text == null ? '' : text).length;
    var d = BLASE_MIN + n * BLASE_JE_ZEICHEN;
    if (d < BLASE_MIN) d = BLASE_MIN;
    if (d > BLASE_MAX) d = BLASE_MAX;
    return Math.round(d * 1000) / 1000;
  }

  var SHOUTS = ['HYPER HYPER!', 'HOW MUCH IS THE FISH?', 'ONE MORE!', 'WIE VIEL IST DER KESSEL?', 'JIGGA JIGGA!'];
  var PROST = ['PROST!', 'ZUM WOHL!', 'AUF DIE TRUPPE!', 'SCHWABENTROPFEN!', 'UFF DIE KESSELWELLE!'];
  // Ruf und Ton-Schlüssel je Spielort. PROST[0] bleibt der neutrale Ruf.
  var PROST_ORT = {
    hotel: { ruf: 'PROST IM JAZ!', prompt: 'Leise, die Rezeption hört mit.', ton: 'hotel' },
    kneipe: { ruf: 'PROST, SOPHIE!', prompt: 'Der Wirt haut auf den Tresen.', ton: 'kneipe' },
    disko: { ruf: 'PROST, UNTERGRUND!', prompt: 'Über den Bass hinweg.', ton: 'disko' },
    restaurant: { ruf: 'ZUM WOHL, MAULTÄSCHLE!', prompt: 'Gläser über den Maultaschen.', ton: 'restaurant' }
  };
  function prostFuer(ort) {
    if (ort && PROST_ORT[ort]) return PROST_ORT[ort];
    return { ruf: PROST[0], prompt: '', ton: 'normal' };
  }
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

  // Shuffle-Bag je rng und Pool. Die Mischung läuft über einen eigenen Generator, damit spruch weiter genau 2 rng-Aufrufe verbraucht.
  function mischeBag(pool, seed, runde, letzte) {
    var next = Saufi.RNG.mulberry32(((seed || 1) + runde * 9973) >>> 0);
    var a = pool.slice(), i, j, tmp;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(next() * (i + 1));
      tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    if (letzte && a.length > 1 && a[0] === letzte) { tmp = a[0]; a[0] = a[1]; a[1] = tmp; }
    return a;
  }
  function beutelZieh(rng, key, pool) {
    if (!rng || !pool || !pool.length) return pool && pool.length ? pool[0] : '';
    if (!rng._sprech) rng._sprech = {};
    var st = rng._sprech[key];
    if (!st || st.i >= st.reihenfolge.length || st.n !== pool.length) {
      var runde = st ? st.runde + 1 : 1;
      var letzte = st ? st.letzte : '';
      st = { reihenfolge: mischeBag(pool, rng.seed, runde, letzte), i: 0, runde: runde, n: pool.length, letzte: '' };
      rng._sprech[key] = st;
    }
    var text = st.reihenfolge[st.i++];
    st.letzte = text;
    return text;
  }

  // rng-Verbrauch: genau 2 Aufrufe (next, dann pick). Die Zeile kommt aus dem Beutel, nicht aus dem zweiten Wurf.
  // Tobi nur Elon, Bundschuh gar kein Scooter.
  function spruch(rng, opt) {
    opt = opt || {};
    if (opt.id === 'bundschuh') {
      if (rng && rng.next) rng.next();
      pick(rng, ['']);
      return '';
    }
    var basis = SCOOTER;
    var key = 'scooter';
    if (opt.id === 'tobi' && Saufi.Elon && Saufi.Elon.ALLGEMEIN && Saufi.Elon.ALLGEMEIN.length) { basis = Saufi.Elon.ALLGEMEIN; key = 'elon'; }
    if (rng && rng.next) rng.next();
    else Math.random();
    var roh = beutelZieh(rng, key, basis) || basis[0];
    pick(rng, [roh]);
    return lallen(roh, opt.pegel || 0);
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
    SHOUTS: SHOUTS, PROST: PROST, PROST_ORT: PROST_ORT, prostFuer: prostFuer, STAND_WEG: STAND_WEG, SPRUECHE: SPRUECHE, SCOOTER: SCOOTER,
    FIGUR: FIGUR, SITUATION: SITUATION, ORT: ORT, PEGEL: PEGEL,
    pegelStufe: pegelStufe, lallen: lallen, spruch: spruch, BLASE_SEK: BLASE_SEK, BLASE_MIN: BLASE_MIN, BLASE_MAX: BLASE_MAX, BLASE_JE_ZEICHEN: BLASE_JE_ZEICHEN, blaseDauer: blaseDauer,
    erstelle: erstelle, zeige: zeige, update: update, aktuell: aktuell
  };
})(globalThis);
