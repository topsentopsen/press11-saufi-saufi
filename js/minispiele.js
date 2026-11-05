/* Trinkspiel-Minispiele: kurz (< 45 s), Tastatur+Touch, per Esc/X/Klick daneben abbrechbar.
   Siebold-Aliase (Mäxle, Dampfhammer, Sinnlos) sind Gag-Namen fuer Prost, Krug und Deckel.
   Sie starten dasselbe Spiel und sagen das im Titel. */
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
    { id: 'maexle', name: 'Mäxle', gag: true, kern: 'prost', ort: ['kneipe', 'restaurant', 'disko'], dauer: 15 },
    { id: 'dampfhammer', name: 'Dampfhammer', gag: true, kern: 'krug', ort: ['kneipe', 'disko'], dauer: 25 },
    { id: 'sinnlos', name: 'Sinnlos saufen', gag: true, kern: 'deckel', ort: ['kneipe', 'restaurant', 'disko'], dauer: 20 }
  ];

  // Gag-Alias: anderer Name, gleicher Kern. Kein stiller Fake.
  var SIEBOLD_ALIAS = { maexle: 'prost', dampfhammer: 'krug', sinnlos: 'deckel' };
  var SIEBOLD_TITEL = { maexle: 'Mäxle', dampfhammer: 'Dampfhammer', sinnlos: 'Sinnlos saufen' };
  var KERN_NAME = { prost: 'Reaktions-Prost', krug: 'Maßkrugstemmen', deckel: 'Bierdeckel-Flip' };

  // Krug: erst tippen bis der Krug steht, dann im engen Fenster halten.
  var KRUG = { haltAb: 0.7, sweetMin: 1, sweetMax: 1.04, haltSoll: 0.55, steig: 0.16, fall: 0.12, stemm: 0.14, stemmFall: 0.25 };
  // Disko: zwei Kurze, fuenf Echtzeit-Sekunden, kurzer Schluck dazwischen.
  var SHOT = { dauer: 5, ziel: 2, sperre: 0.22 };

  function prostRuf(ort) {
    if (Saufi.Hinweise && Saufi.Hinweise.prostFuer) return Saufi.Hinweise.prostFuer(ort);
    return { ruf: 'PROST!', prompt: '', ton: 'normal' };
  }

  function eintraegeFuerOrt(ort) {
    return [
      { id: 'deckel', label: 'Minispiel: Bierdeckel-Flip', ortOk: ort === 'kneipe' },
      { id: 'prost', label: 'Minispiel: Reaktions-Prost', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'krug', label: 'Minispiel: Maßkrugstemmen', ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'shottrain', label: 'Minispiel: Disko Shot-Train', ortOk: ort === 'disko' },
      { id: 'maexle', label: 'Mäxle — Gag-Alias, eigentlich dasselbe', siebold: true, gag: true, kern: 'prost', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'dampfhammer', label: 'Dampfhammer — Gag-Alias, eigentlich dasselbe', siebold: true, gag: true, kern: 'krug', ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'sinnlos', label: 'Sinnlos saufen — Gag-Alias, eigentlich dasselbe', siebold: true, gag: true, kern: 'deckel', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' }
    ].filter(function (e) { return e.ortOk; });
  }

  function starte(id, rng, ort) {
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
        hinweis: 'Wenn „' + pr.ruf + '“ kommt: sofort E / Tippen.', index: 0,
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
      if (mg.phase === 'warte') {
        mg.next -= dt;
        if (mg.next <= 0) { mg.phase = 'jetzt'; mg.fenster = 0.7; mg.eintraege[0].label = ruf + ' JETZT (E)'; }
      } else if (mg.phase === 'jetzt') {
        mg.fenster -= dt;
        if (aktion) {
          mg.score += 1; mg.feedback = ruf; mg.phase = 'warte'; mg.next = 0.7 + Math.random() * 1.1;
          mg.eintraege[0].label = 'Wart…';
          if (mg.score >= mg.ziel) { mg.fertig = true; mg.erfolg = true; }
        } else if (mg.fenster <= 0) {
          mg.feedback = 'Zu langsam!'; mg.phase = 'warte'; mg.next = 0.6 + Math.random() * 0.9;
          mg.eintraege[0].label = 'Wart…';
        }
      }
      if (aktion && mg.phase === 'warte') mg.feedback = 'Zu früh – Fehlstart.';
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
    if (!mg || !mg.erfolg) b = { punkte: 5, pegel: 0.02, team: 0, text: 'Abgebrochen/daneben. Trost-Schluck mental.' };
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
    eintraegeFuerOrt: eintraegeFuerOrt, starte: starte, update: update, belohnung: belohnung
  };
})(globalThis);
