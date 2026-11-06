/* Trinkspiel-Minispiele: kurz (< 45 s), Tastatur+Touch, per Esc/X/Klick daneben abbrechbar.
   Mäxle ist ein eigenes Würfelspiel. Dampfhammer und Sinnlos bleiben Gag-Aliase
   für Krug und Deckel und sagen das im Titel. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var IDEEN = [
    { id: 'deckel', name: 'Bierdeckel-Flip', ort: ['kneipe'], dauer: 20 },
    { id: 'prost', name: 'Reaktions-Prost', ort: ['kneipe', 'restaurant', 'disko'], dauer: 15 },
    { id: 'krug', name: 'Maßkrugstemmen', ort: ['kneipe', 'disko'], dauer: 25 },
    { id: 'kings', name: 'Kings-Cup-light', ort: ['restaurant', 'kneipe'], dauer: 40 },
    { id: 'flunky', name: 'Flunkyball-Light', ort: ['disko'], dauer: 35 },
    { id: 'rhytmus', name: 'Zapfhahn-Rhythmus', ort: ['kneipe'], dauer: 20 },
    { id: 'truth', name: 'Wahrheit oder Kurzer (soft)', ort: ['restaurant'], dauer: 30 },
    { id: 'shottrain', name: 'Disko Shot-Train', ort: ['disko'], dauer: 5 },
    { id: 'maexle', name: 'Mäxle', ort: ['kneipe', 'restaurant', 'disko'], dauer: 40 },
    { id: 'dampfhammer', name: 'Dampfhammer', gag: true, kern: 'krug', ort: ['kneipe', 'disko'], dauer: 25 },
    { id: 'sinnlos', name: 'Sinnlos saufen', gag: true, kern: 'deckel', ort: ['kneipe', 'restaurant', 'disko'], dauer: 20 }
  ];

  // Gag-Alias: anderer Name, gleicher Kern. Kein stiller Fake.
  var SIEBOLD_ALIAS = { dampfhammer: 'krug', sinnlos: 'deckel' };
  var SIEBOLD_TITEL = { dampfhammer: 'Dampfhammer', sinnlos: 'Sinnlos saufen' };
  var KERN_NAME = { prost: 'Reaktions-Prost', krug: 'Maßkrugstemmen', deckel: 'Bierdeckel-Flip' };

  // Krug: erst tippen bis der Krug steht, dann im engen Fenster halten.
  var KRUG = { haltAb: 0.7, sweetMin: 1, sweetMax: 1.04, haltSoll: 0.55, steig: 0.16, fall: 0.12, stemm: 0.14, stemmFall: 0.25 };
  // Disko: zwei Kurze, fuenf Echtzeit-Sekunden, kurzer Schluck dazwischen.
  var SHOT = { dauer: 5, ziel: 2, sperre: 0.22 };

  function prostRuf(ort) {
    if (Saufi.Hinweise && Saufi.Hinweise.prostFuer) return Saufi.Hinweise.prostFuer(ort);
    return { ruf: 'PROST!', prompt: '', ton: 'normal' };
  }

  // Mäxle: 21 (2 und 1) schlägt alles, danach Pasche von 66 abwärts, danach der Rest (65 … 31).
  function maexleWert(a, b) {
    var hi = a > b ? a : b, lo = a < b ? a : b;
    if (hi === 2 && lo === 1) return { a: 2, b: 1, name: 'Mäxle 21', rang: 100, art: 'maexle' };
    if (hi === lo) return { a: hi, b: lo, name: 'Pasch ' + hi + hi, rang: 80 + hi, art: 'pasch' };
    return { a: hi, b: lo, name: String(hi * 10 + lo), rang: hi * 10 + lo, art: 'zahl' };
  }
  var MAEXLE_LEITER = null;
  function maexleLeiter() {
    if (MAEXLE_LEITER) return MAEXLE_LEITER;
    var list = [], a, b;
    list.push(maexleWert(2, 1));
    for (a = 1; a <= 6; a++) list.push(maexleWert(a, a));
    for (a = 1; a <= 6; a++) for (b = a + 1; b <= 6; b++) {
      if (!(a === 1 && b === 2)) list.push(maexleWert(b, a));
    }
    list.sort(function (p, q) { return p.rang - q.rang; });
    MAEXLE_LEITER = list;
    return list;
  }
  function maexleNaechstes(rang) {
    var list = maexleLeiter(), i;
    for (i = 0; i < list.length; i++) if (list[i].rang > rang) return list[i];
    return null;
  }
  function wuerfelZahl(rng) {
    var u = rng && rng.next ? rng.next() : Math.random();
    return 1 + Math.floor(u * 6);
  }
  function npcZweifelt(rang, wurf) {
    if (rang >= 100) return true;
    return rang >= 70 + (wurf || 0) * 30;
  }
  // Siebold blufft nie, Himmelsbach immer. Probst behauptet Mäxle und verrät sich.
  var BLUFF_RATE = { siebold: 0, himmelsbach: 1, probst: 1 };
  var PROBST_BLUFF = 'Probst sagt ‚Mäxle‘ und guckt dabei auf den Boden.';
  function bluffRate(id) {
    if (id && BLUFF_RATE[id] != null) return BLUFF_RATE[id];
    return 0;
  }
  // Drei von zehn Rufen, also 30 %. nr ist der 0-basierte Fensterzähler.
  var PROBST_ANTEIL = 3, PROBST_WORT = 'PROBST!', PROBST_BLASE = 'Des war dr Probst, ned s\'Prost!';
  function istProbstFalle(nr) { return (nr % 10) < PROBST_ANTEIL; }
  function maexleStart(rng, ort) {
    return {
      id: 'maexle', art: 'minispiel', titel: 'Mäxle', t: 0, dauer: 40, score: 0, ziel: 1, phase: 'wurf',
      rng: rng, ort: ort || '', gegner: 'siebold', wuerfel: null, wert: null, ansage: null, gelogen: false, npc: null,
      strafePegel: 0.15, alleTrinken: false,
      hinweis: 'Zwei Würfel. 31 bis 65, dann Pasch 11 bis 66, dann Mäxle 21. Ansagen, bluffen, anzweifeln.',
      index: 0,
      eintraege: [{ label: 'Würfeln (E)', id: 'mx_wurf' }, { label: 'Abbrechen', id: 'zurueck' }]
    };
  }
  function maexleEnde(mg, sieg, text) {
    mg.fertig = true; mg.erfolg = !!sieg; mg.score = sieg ? 1 : 0; mg.phase = 'ende';
    mg.feedback = text; mg.strafePegel = sieg ? 0 : 0.15;
    return mg;
  }
  function maexleAnsagenMenue(mg) {
    var e = [{ label: 'Wahrheit: ' + mg.wert.name, id: 'mx_ansage', daten: mg.wert }];
    var nxt = maexleNaechstes(mg.wert.rang);
    if (nxt) e.push({ label: 'Bluffen: ' + nxt.name, id: 'mx_ansage', daten: nxt });
    if (mg.wert.rang < 100 && (!nxt || nxt.rang < 100)) e.push({ label: 'Bluffen: Mäxle 21', id: 'mx_ansage', daten: maexleWert(2, 1) });
    e.push({ label: 'Abbrechen', id: 'zurueck' });
    mg.eintraege = e; mg.index = 0; mg.phase = 'ansage';
    mg.hinweis = 'Du hast ' + mg.wuerfel[0] + ' und ' + mg.wuerfel[1] + ' (' + mg.wert.name + '). Hohe Ansagen zweifelt Siebold eher an.';
  }
  function maexleNpc(mg) {
    var id = mg.gegner || 'siebold';
    var rate = bluffRate(id);
    var a = wuerfelZahl(mg.rng), b = wuerfelZahl(mg.rng), wert = maexleWert(a, b);
    if (wert.rang >= 100) {
      mg.alleTrinken = true;
      return maexleEnde(mg, false, 'Mäxle 21 beim Gegner. Alle trinken.');
    }
    var ansage, gelogen, hinweis;
    if (id === 'probst') {
      ansage = maexleWert(2, 1);
      gelogen = ansage.rang > wert.rang;
      hinweis = PROBST_BLUFF;
    } else if (rate <= 0) {
      if (wert.rang > (mg.ansage ? mg.ansage.rang : 0)) {
        ansage = wert;
        gelogen = false;
        hinweis = 'Siebold sagt „' + ansage.name + '“. Er blufft nicht.';
      } else {
        return maexleEnde(mg, true, 'Siebold blufft nie und kommt nicht höher. Er trinkt.');
      }
    } else {
      ansage = maexleNaechstes(wert.rang) || maexleWert(2, 1);
      if (mg.ansage && ansage.rang <= mg.ansage.rang) ansage = maexleNaechstes(mg.ansage.rang) || maexleWert(2, 1);
      gelogen = ansage.rang > wert.rang;
      hinweis = 'Himmelsbach blufft: „' + ansage.name + '“.';
    }
    mg.npc = { id: id, wuerfel: [a, b], wert: wert, ansage: ansage, gelogen: gelogen };
    mg.phase = 'gegen';
    mg.hinweis = hinweis;
    mg.feedback = id === 'probst' ? PROBST_BLUFF : 'Seine Würfel bleiben zu.';
    mg.index = 0;
    mg.eintraege = [
      { label: 'Anzweifeln', id: 'mx_zweifel' },
      { label: 'Glauben (du trinkst)', id: 'mx_glauben' },
      { label: 'Abbrechen', id: 'zurueck' }
    ];
    return mg;
  }
  function maexleWahl(mg, id, daten) {
    if (!mg || mg.id !== 'maexle' || mg.fertig) return mg;
    if (id === 'mx_wurf' && mg.phase === 'wurf') {
      var a = wuerfelZahl(mg.rng), b = wuerfelZahl(mg.rng);
      mg.wuerfel = [a, b]; mg.wert = maexleWert(a, b);
      if (mg.wert.rang >= 100) {
        mg.alleTrinken = true;
        return maexleEnde(mg, true, 'Mäxle 21. Alle trinken.');
      }
      maexleAnsagenMenue(mg);
      return mg;
    }
    if (id === 'mx_ansage' && mg.phase === 'ansage' && daten) {
      mg.ansage = daten;
      mg.gelogen = daten.rang > mg.wert.rang;
      var stimmung = mg.rng && mg.rng.next ? mg.rng.next() : Math.random();
      if (npcZweifelt(daten.rang, stimmung)) {
        if (mg.gelogen) return maexleEnde(mg, false, 'Siebold zweifelt. Gelogen — Trinkstrafe.');
        return maexleEnde(mg, true, 'Siebold zweifelt. Wahrheit. Er trinkt.');
      }
      return maexleNpc(mg);
    }
    if (id === 'mx_zweifel' && mg.phase === 'gegen' && mg.npc) {
      if (mg.npc.gelogen) return maexleEnde(mg, true, 'Siebold hat gelogen (' + mg.npc.wert.name + '). Er trinkt.');
      return maexleEnde(mg, false, 'Siebold hatte ' + mg.npc.wert.name + '. Trinkstrafe.');
    }
    if (id === 'mx_glauben' && mg.phase === 'gegen') return maexleEnde(mg, false, 'Du glaubst Siebold. Trinkstrafe.');
    return mg;
  }

  function eintraegeFuerOrt(ort) {
    return [
      { id: 'deckel', label: 'Minispiel: Bierdeckel-Flip', ortOk: ort === 'kneipe' },
      { id: 'prost', label: 'Minispiel: Reaktions-Prost', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'krug', label: 'Minispiel: Maßkrugstemmen', ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'shottrain', label: 'Minispiel: Disko Shot-Train', ortOk: ort === 'disko' },
      { id: 'maexle', label: 'Mäxle — zwei Würfel', siebold: true, ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'dampfhammer', label: 'Dampfhammer — Gag-Alias, eigentlich dasselbe', siebold: true, gag: true, kern: 'krug', ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'sinnlos', label: 'Sinnlos saufen — Gag-Alias, eigentlich dasselbe', siebold: true, gag: true, kern: 'deckel', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' }
    ].filter(function (e) { return e.ortOk; });
  }

  function starte(id, rng, ort) {
    if (id === 'maexle') return maexleStart(rng, ort);
    if (SIEBOLD_ALIAS[id]) {
      var kern = SIEBOLD_ALIAS[id];
      var genannt = starte(kern, rng, ort);
      if (!genannt) return null;
      genannt.angebot = id;
      genannt.gagAlias = true;
      genannt.kern = kern;
      genannt.titel = SIEBOLD_TITEL[id] + ' (Gag-Alias)';
      genannt.untertitel = 'eigentlich dasselbe: ' + (KERN_NAME[kern] || kern);
      genannt.hinweis = 'Gag-Alias, eigentlich dasselbe (' + (KERN_NAME[kern] || kern) + '). Siebold hat die Würfel vergessen. ' + (genannt.hinweis || '');
      return genannt;
    }
    if (id === 'deckel') {
      return { id: id, art: 'minispiel', titel: 'Bierdeckel-Flip', t: 0, dauer: 18, ziel: 5, score: 0, phase: 'bereit', cool: 0,
        hinweis: 'E / Tippen im richtigen Moment (Balken voll). 5 Treffer!', index: 0,
        eintraege: [{ label: 'Flip! (E)', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    if (id === 'prost') {
      var pr = prostRuf(ort);
      return { id: id, art: 'minispiel', titel: 'Reaktions-Prost', t: 0, dauer: 14, score: 0, ziel: 4, phase: 'warte', next: 0.8 + rng.next() * 0.8, fenster: 0,
        ruf: pr.ruf, ton: pr.ton, ort: ort || '',
        rufNr: 0,
        hinweis: 'Wenn „' + pr.ruf + '“ kommt: sofort E / Tippen. Steht PROBST!, nicht drücken.', index: 0,
        eintraege: [{ label: 'Wart…', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    if (id === 'krug') {
      return { id: id, art: 'minispiel', titel: 'Maßkrugstemmen', t: 0, dauer: 22, kraft: 0, ziel: 1, score: 0, phase: 'stemmen', haltZeit: 0,
        hinweis: 'Spammen, dann E halten. Fenster eng, nicht tippen.', index: 0,
        eintraege: [{ label: 'Stemmen! (E)', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    if (id === 'shottrain') {
      return { id: id, art: 'minispiel', titel: 'Disko Shot-Train', t: 0, dauer: SHOT.dauer, score: 0, ziel: SHOT.ziel, phase: 'kurzer', sperre: 0, restSek: SHOT.dauer,
        ton: 'disko', ort: 'disko',
        hinweis: 'Zwei Kurze in fünf Sekunden. Zweimal E, schnell!', index: 0,
        eintraege: [{ label: 'Kurzer 1 — JETZT (E)', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    return null;
  }

  function krugHalten(mg, dt, aktion, halten) {
    if (mg.phase !== 'halten') {
      mg.kraft = Math.max(0, (mg.kraft || 0) - dt * KRUG.stemmFall);
      if (aktion) mg.kraft += KRUG.stemm;
      if (mg.kraft >= KRUG.haltAb) {
        mg.phase = 'halten';
        mg.kraft = KRUG.haltAb;
        mg.haltZeit = 0;
        mg.feedback = 'Fenster eng: E gedrückt halten, nicht tippen.';
        mg.eintraege[0].label = 'Halten! (E gedrückt)';
      }
      return;
    }
    if (aktion && !halten) {
      mg.feedback = 'Tippen reicht nicht. E gedrückt halten.';
      return;
    }
    var vorher = mg.kraft;
    if (halten) mg.kraft += dt * KRUG.steig;
    else mg.kraft -= dt * KRUG.fall;
    if (mg.kraft > KRUG.sweetMax) {
      mg.kraft = 0;
      mg.phase = 'stemmen';
      mg.haltZeit = 0;
      mg.feedback = 'Überkippt – Schaum überall.';
      mg.eintraege[0].label = 'Stemmen! (E)';
    } else if (mg.kraft < KRUG.haltAb - 0.08) {
      mg.phase = 'stemmen';
      mg.haltZeit = 0;
      mg.feedback = 'Zu locker. Nochmal stemmen.';
      mg.eintraege[0].label = 'Stemmen! (E)';
    } else {
      var war = vorher >= KRUG.sweetMin && vorher <= KRUG.sweetMax;
      var ist = mg.kraft >= KRUG.sweetMin && mg.kraft <= KRUG.sweetMax;
      if (war && ist) {
        mg.haltZeit = (mg.haltZeit || 0) + dt;
        mg.feedback = 'Halten… ' + Math.min(100, Math.round(mg.haltZeit / KRUG.haltSoll * 100)) + '%';
        if (mg.haltZeit >= KRUG.haltSoll) {
          mg.score = 1; mg.fertig = true; mg.erfolg = true;
          mg.feedback = 'Krug oben, gehalten!';
        }
      } else if (!ist) {
        mg.haltZeit = 0;
        mg.feedback = halten ? 'Hoch damit, das Fenster kommt.' : 'Nicht loslassen, das Fenster ist eng.';
      } else mg.feedback = 'Fenster! Jetzt halten.';
    }
  }

  function update(mg, dt, aktion, opt) {
    if (!mg || mg.fertig) return mg;
    opt = opt || {};
    mg.t += dt;
    if (mg.t >= mg.dauer) { mg.fertig = true; mg.erfolg = mg.score >= (mg.ziel || 1); return mg; }

    if (mg.id === 'deckel') {
      mg.phaseT = (mg.phaseT || 0) + dt;
      var pulse = 0.5 + 0.5 * Math.sin(mg.phaseT * 5.2);
      mg.balken = pulse;
      if (aktion) {
        if (pulse > 0.78) { mg.score += 1; mg.feedback = 'Sauberer Flip!'; }
        else { mg.feedback = 'Daneben – Deckel auf dem Boden.'; }
        if (mg.score >= mg.ziel) { mg.fertig = true; mg.erfolg = true; }
      }
    } else if (mg.id === 'prost') {
      var ruf = mg.ruf || 'PROST!';
      var getroffen = false;
      if (mg.phase === 'warte') {
        mg.next -= dt;
        if (mg.next <= 0) {
          mg.phase = 'jetzt'; mg.fenster = 0.7;
          mg.rufNr = mg.rufNr || 0;
          mg.falle = istProbstFalle(mg.rufNr);
          mg.rufNr += 1;
          mg.gezeigt = mg.falle ? PROBST_WORT : ruf;
          mg.eintraege[0].label = mg.gezeigt + ' JETZT (E)';
        }
      }
      if (mg.phase === 'jetzt') {
        if (aktion) {
          if (mg.falle || mg.gezeigt === PROBST_WORT) {
            mg.score -= 1;
            mg.feedback = PROBST_BLASE;
            mg.blase = PROBST_BLASE;
            mg.falle = false;
          } else {
            mg.score += 1; mg.feedback = ruf;
            if (mg.score >= mg.ziel) { mg.fertig = true; mg.erfolg = true; }
          }
          mg.phase = 'warte';
          mg.next = 0.7 + ((Math.abs(mg.score) * 37) % 100) / 100 * 1.1;
          mg.eintraege[0].label = 'Wart…';
          getroffen = true;
        } else {
          mg.fenster -= dt;
          if (mg.fenster <= 0) {
            mg.feedback = 'Zu langsam!'; mg.phase = 'warte';
            mg.next = 0.6 + ((mg.score * 53) % 100) / 100 * 0.9;
            mg.eintraege[0].label = 'Wart…';
          }
        }
      }
      if (aktion && !getroffen && mg.phase === 'warte') mg.feedback = 'Zu früh – Fehlstart.';
    } else if (mg.id === 'krug') {
      krugHalten(mg, dt, aktion, !!opt.halten);
      mg.balken = Math.max(0, Math.min(1, (mg.kraft || 0) / 1.15));
      mg.haltText = mg.phase === 'halten'
        ? ('Kraft ' + (mg.kraft || 0).toFixed(2) + ' · Fenster ' + KRUG.sweetMin.toFixed(2) + '–' + KRUG.sweetMax.toFixed(2))
        : '';
    } else if (mg.id === 'shottrain') {
      mg.restSek = Math.max(0, mg.dauer - mg.t);
      mg.balken = mg.dauer > 0 ? mg.restSek / mg.dauer : 0;
      if (mg.sperre > 0) {
        mg.sperre -= dt;
        if (aktion) mg.feedback = 'Runterschlucken, dann der zweite!';
        if (mg.sperre <= 0) {
          mg.sperre = 0;
          mg.phase = 'kurzer';
          mg.eintraege[0].label = 'Kurzer ' + (mg.score + 1) + ' — JETZT (E)';
          mg.feedback = 'Zweiter Kurzer. Jetzt!';
        }
      } else if (aktion && mg.phase === 'kurzer') {
        mg.score += 1;
        if (mg.score >= mg.ziel) {
          mg.fertig = true; mg.erfolg = true;
          mg.feedback = 'Shot-Train sitzt!';
          mg.eintraege[0].label = 'Geschafft';
        } else {
          mg.phase = 'schluck';
          mg.sperre = SHOT.sperre;
          mg.feedback = 'Kurzer ' + mg.score + ' weg.';
          mg.eintraege[0].label = 'Schluck…';
        }
      }
    }
    return mg;
  }

  function belohnung(mg) {
    var b;
    if (mg && mg.id === 'maexle') {
      if (mg.erfolg) b = { punkte: 80, pegel: 0, team: 1, alle: !!mg.alleTrinken, text: mg.feedback || 'Mäxle gewonnen. Der andere trinkt.' };
      else b = { punkte: 10, pegel: mg.strafePegel || 0.15, team: 0, alle: !!mg.alleTrinken, text: mg.feedback || 'Trinkstrafe.' };
    }
    else if (!mg || !mg.erfolg) b = { punkte: 5, pegel: 0.02, team: 0, text: 'Abgebrochen/daneben. Trost-Schluck mental.' };
    else if (mg.id === 'deckel') b = { punkte: 80, pegel: 0.05, team: 1, text: 'Bierdeckel-König! Team +1' };
    else if (mg.id === 'prost') b = { punkte: 70, pegel: 0.08, team: 1, text: 'Reaktions-Prost gemeistert!' };
    else if (mg.id === 'krug') b = { punkte: 90, pegel: 0.1, team: 0, stand: 3, text: 'Maßkrug gehalten. Arme aus Stahl(filz).' };
    else if (mg.id === 'shottrain') b = { punkte: 100, pegel: 0.14, team: 1, text: 'Shot-Train! Zwei Kurze in fünf Sekunden.' };
    else b = { punkte: 40, pegel: 0.05, team: 0, text: 'Minispiel geschafft.' };
    if (mg && mg.gagAlias && mg.titel) b.text = mg.titel + ': ' + (mg.untertitel || 'eigentlich dasselbe') + ' ' + b.text;
    return b;
  }

  Saufi.Minispiele = {
    IDEEN: IDEEN, KRUG: KRUG, SHOT: SHOT, GAG: SIEBOLD_ALIAS, KERN_NAME: KERN_NAME,
    eintraegeFuerOrt: eintraegeFuerOrt, starte: starte, update: update, belohnung: belohnung, wahl: maexleWahl,
    wert: maexleWert, naechstes: maexleNaechstes, leiter: maexleLeiter, npcZweifelt: npcZweifelt,
    bluffRate: bluffRate, BLUFF_RATE: BLUFF_RATE, PROBST_BLUFF: PROBST_BLUFF,
    istProbstFalle: istProbstFalle, PROBST_WORT: PROBST_WORT, PROBST_BLASE: PROBST_BLASE, PROBST_ANTEIL: PROBST_ANTEIL
  };
})(globalThis);
