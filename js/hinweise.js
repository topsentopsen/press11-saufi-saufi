/* Texte: Hinweis 18+ (Start und Info), Text-Einblendungen ("PROST!", "HYPER HYPER!"), Sprueche-Pools je Figur/Situation/Ort/Pegel. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var TITEL = 'Press11 - Saufi Saufi';
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

  var SHOUTS = ['HYPER HYPER!', 'HOW MUCH IS THE FISH?', 'ONE MORE!', 'WIE VIEL IST DER KESSEL?', 'MS-MARATHON LIGHT!'];
  var PROST = ['PROST!', 'ZUM WOHL!', 'AUF DIE TRUPPE!', 'SCHWABENTROPFEN!', 'UFF DIE KESSELWELLE!'];
  var STAND_WEG = ['Noch zu, Saufi.', 'Hier isch noch zu.', 'Mach auf, Wirt!', 'Kehrwoche? Nein, Kneipenruhe.'];
  var SPRUECHE = [
    'Wer hat Durst?', 'Noch eine!', 'Kehrwoche kann warten.', 'Des gaht scho.', 'Net so hektisch, Saufi.',
    'Trink a Wasser, Saufi.', 'Kessel-Wetter heut!', 'Gibt ja Maultasche.', 'Feinstaubalarm: nur drinnen saufen.',
    'Spätzle-Notstand im Kessel!', 'Die Taube klaut die Brezel.', 'Stäffele-Ächzen level 3.'
  ];

  // Mindestens 8 Sprueche je Figur (eigene Stimme)
  var FIGUR = {
    tobi: ['Wer hat Durst?', 'Ich organisier des.', 'Kessel-Boss-Energie!', 'Noch eine Runde Plan!', 'Wasser isch auch Strategie.', 'Des wird a MS-Marathon.', 'Pass auf die Truppe auf.', 'Stuttgart rockt, Saufi!'],
    raphael: ['Ich pack das!', 'Anwärter-Modus an.', 'Nur noch ein bissle.', 'Team first, Raphi second.', 'Wasser? Gerne.', 'Ich zähl die Runden.', 'Fast Stamm, glaub ich.', 'Hyper Hyper… intern.'],
    tobias: ['Fast drin.', '80 Prozent Gefühl.', 'Disko nimmt mich auf!', 'Noch eine für die Quote.', 'Ich lächle professionell.', 'Aufnahme bitte!', 'Ich steh noch… hoffentlich.', 'Tobias-Boost!'],
    schwickendorf: ['Also, früher...', 'Früher war mehr Kehrwoche.', 'Des war anno dazumal besser.', 'Junge, Junge.', 'Ein Pils zur Geschichte.', 'Ich erzähl nur kurz…', 'Früher ohne Feinstaub.', 'Siddsch stilvoll, Saufi.'],
    bundschuh: ['Tanzen!', 'Schuh-Disco ready.', 'Beat im Blut.', 'Noch ein Step!', 'Fußboden isch Bühne.', 'Bundschuh never stops.', 'DJ, lauter!', 'Stäffele? Dancefloor!'],
    ritzi: ['Noch eine!', 'Lila Laune.', 'Ich bring Farbe.', 'Prost, Jungs!', 'Kurzer? Immer.', 'Ritzi-Power.', 'Pegel mit Stil.', 'Wir bleiben soft-hard.'],
    siebold: ['Ich rechne nach...', 'Standfestigkeit minus…', 'Statistisch ok.', 'Pegel-Excel im Kopf.', 'Team-KPI kritisch.', 'Ein Radler ist Effizienz.', 'Zahlen lügen selten.', 'Pluspunkte für Wasser.'],
    schwinki: ['Hunger!', 'Wo Brezel?', 'Maultasche ruft.', 'Ich ess nebenbei.', 'Bar-Snack-Alarm.', 'Schwinki braucht Kohlehydrate.', 'Spätzle retten Leben.', 'Döner-Theorie später.'],
    stoeckle: ['Des koschd extra!', 'Schwaben-Rechnung.', 'Net so verschwenderisch.', 'Ein Kurzer, fairer Preis.', 'Isch des im Angebot?', 'Kehrewoche zählt mit.', 'Barzahlung only.', 'Stöckle spart und prostet.'],
    probst: ['Ich sehe alles.', 'Alkoholfrei? Verdächtig.', 'Protokolliert.', 'Augen überall.', 'Probst-Radar an.', 'Heimlich? Hmm.', 'Team-Stimmung notiert.', 'Ich schweige laut.'],
    himmelsbach: ['Auf geht\'s!', 'Ab 14 Uhr Antreiber.', 'Zweites Leben ready.', 'Pfeife bereit!', 'Naechste Runde, los!', 'Tribuene oder Stammtisch!', 'Ich zieh euch mit.', 'Himmelsbach bleibt am Ball.'],
    zeise: ['Neu hier, aber bereit!', 'Wo bin ich gelandet?', 'Erklärt mir die Regeln?', 'Ich lern schnell. Glaub ich.', 'Was heißt Kehrwoche?', 'Darf ich auch mal bestellen?', 'Runden? Ich bin dabei.', 'Zeise meldet sich an.']
  };

  var SITUATION = {
    mittrinken: ['PROST, Truppe!', 'Alle mit!', 'Glas hoch!', 'Runden-Ritual!', 'Saufi-Sync!'],
    essen: ['Mampf-Modus.', 'Spätzle heilen.', 'Brezel-Boost!', 'Küche rettet Stand.', 'Satt = Strategie.'],
    wasser: ['Wasser-Held!', 'Hydration-Glitch.', 'Klarer Kopf… kurz.', 'Spender-Gang.', 'Q wie Quelle.'],
    erwischt: ['Erwischt-Alarm!', 'Probst sah alles.', 'Fake-Bier fail.', 'Team -2… ups.', 'Alkoholfrei outed.'],
    umfallen: ['Boden-Meeting.', 'Press F vibes.', 'Liege-Konferenz.', 'Stand 0, Stil 10.', 'Horizontale Pause.'],
    aufstehen: ['Wieder vertikal!', 'Aufsteh-Combo.', 'Zweite Chance.', 'Staub abklopfen.', 'Weiter, Saufi.'],
    scooter: ['HYPER HYPER!', 'Boost-Orgie!', 'Scooter im Blut.', 'Leiste voll, Ego voller.', 'Disko-Raketenstart.'],
    joint: ['Dicke Tüte aktiv.', 'Doppel-Effekt!','Schwammig incoming.', 'Item-Chaos.', 'Nur Spiel, Saufi.']
  };

  var ORT = {
    hotel: ['Lobby-Lounge.', 'Buffet ruft.', 'Zimmer mit Aussicht… und Durst.', 'Rezeption lächelt mit.', 'Jazz-Chill.'],
    restaurant: ['Maultäschle-Zeit.', 'Karte studieren.', 'Spätzle-Notstand gelöst?', 'Theke zwinkert.', 'Schwaben-Teller incoming.'],
    kneipe: ['Brauhaus-Durst!', 'Jukebox-Versuchung.', 'Dartscheibe starrt zurück.', 'Zapfhahn-Poesie.', 'Kreidetafel lügt nie.'],
    disko: ['Untergrund 07 vibes.', 'Neon im Blut.', 'Türsteher-Pokerface.', 'Tanzfläche = Therapie.', 'DJ nickt anerkennend.'],
    stadt: ['Kessel-Tour.', 'Stäffele-Cardio.', 'Taube vs. Brezel.', 'Feinstaub? Egal, Runde.', 'Halbhöhen-Flanieren.'],
    motocross: ['Motocross-Rennen!', 'Tribünen-Prost.', 'Staub und Pils.', 'Hügel-Hopser.', 'Zaun-Beifall.']
  };

  var PEGEL = {
    nuechtern: ['Noch klar im Kopf.', 'Strategisch nüchtern.', 'Wasser schmeckt… ok.', 'Frische Beine.', 'Plan A läuft.'],
    angeheitert: ['Leicht angeheitert.', 'Stimmung steigt.', 'Schwaben-Schmunzeln.', 'Noch kontrolliert schief.', 'Kessel-Knistern.'],
    voll: ['Voll, aber freundlich.', 'Lachen wird lauter.', 'Weg ist... da irgendwo.', 'Team-Kuscheln steigt.', 'Noch eine? Klar.'],
    absturz: ['Aalschdurz-Modus.', 'Wo isch mein Schuhh?', 'Bloedel-Lallen aktiv.', 'Kesssel dreht sichh.', 'Hosi? War da eina?']
  };

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

  // Waehlt einen Spruch: Figur-Pool, optional Situation/Ort/Pegel gemischt; bei hohem Pegel lallend.
  function spruch(rng, opt) {
    opt = opt || {};
    var pools = [];
    if (opt.id && FIGUR[opt.id]) pools.push(FIGUR[opt.id]);
    if (opt.situation && SITUATION[opt.situation]) pools.push(SITUATION[opt.situation]);
    if (opt.ort && ORT[opt.ort]) pools.push(ORT[opt.ort]);
    var st = pegelStufe(opt.pegel || 0);
    if (PEGEL[st]) pools.push(PEGEL[st]);
    if (!pools.length) pools.push(SPRUECHE);
    var chosenPool = pools[Math.floor((rng && rng.next ? rng.next() : Math.random()) * pools.length)] || SPRUECHE;
    return lallen(pick(rng, chosenPool) || SPRUECHE[0], opt.pegel || 0);
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
    SHOUTS: SHOUTS, PROST: PROST, STAND_WEG: STAND_WEG, SPRUECHE: SPRUECHE,
    FIGUR: FIGUR, SITUATION: SITUATION, ORT: ORT, PEGEL: PEGEL,
    pegelStufe: pegelStufe, lallen: lallen, spruch: spruch,
    erstelle: erstelle, zeige: zeige, update: update, aktuell: aktuell
  };
})(globalThis);
