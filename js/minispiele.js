/* Trinkspiel-Minispiele: kurz (< 45 s), Tastatur+Touch, per Esc/X/Klick daneben abbrechbar. */
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
    { id: 'maexle', name: 'Mäxle', ort: ['kneipe', 'restaurant', 'disko'], dauer: 15 },
    { id: 'dampfhammer', name: 'Dampfhammer', ort: ['kneipe', 'disko'], dauer: 25 },
    { id: 'sinnlos', name: 'Sinnlos saufen', ort: ['kneipe', 'restaurant', 'disko'], dauer: 20 }
  ];

  var SIEBOLD_ALIAS = { maexle: 'prost', dampfhammer: 'krug', sinnlos: 'deckel' };
  var SIEBOLD_TITEL = { maexle: 'Mäxle', dampfhammer: 'Dampfhammer', sinnlos: 'Sinnlos saufen' };

  function eintraegeFuerOrt(ort) {
    return [
      { id: 'deckel', label: 'Minispiel: Bierdeckel-Flip', ortOk: ort === 'kneipe' },
      { id: 'prost', label: 'Minispiel: Reaktions-Prost', ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'krug', label: 'Minispiel: Maßkrugstemmen', ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'maexle', label: 'Mäxle', siebold: true, ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' },
      { id: 'dampfhammer', label: 'Dampfhammer', siebold: true, ortOk: ort === 'kneipe' || ort === 'disko' },
      { id: 'sinnlos', label: 'Sinnlos saufen', siebold: true, ortOk: ort === 'kneipe' || ort === 'restaurant' || ort === 'disko' }
    ].filter(function (e) { return e.ortOk; });
  }

  function starte(id, rng) {
    if (SIEBOLD_ALIAS[id]) {
      var genannt = starte(SIEBOLD_ALIAS[id], rng);
      if (!genannt) return null;
      genannt.angebot = id;
      genannt.titel = SIEBOLD_TITEL[id];
      return genannt;
    }
    if (id === 'deckel') {
      return { id: id, art: 'minispiel', titel: 'Bierdeckel-Flip', t: 0, dauer: 18, ziel: 5, score: 0, phase: 'bereit', cool: 0,
        hinweis: 'E / Tippen im richtigen Moment (Balken voll). 5 Treffer!', index: 0,
        eintraege: [{ label: 'Flip! (E)', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    if (id === 'prost') {
      return { id: id, art: 'minispiel', titel: 'Reaktions-Prost', t: 0, dauer: 14, score: 0, ziel: 4, phase: 'warte', next: 0.8 + rng.next() * 0.8, fenster: 0,
        hinweis: 'Wenn PROST! kommt: sofort E / Tippen.', index: 0,
        eintraege: [{ label: 'Wart…', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    if (id === 'krug') {
      return { id: id, art: 'minispiel', titel: 'Maßkrugstemmen', t: 0, dauer: 22, kraft: 0, ziel: 1, score: 0, phase: 'stemmen',
        hinweis: 'Hammer E / Tippen: Balken füllen, nicht überlaufen lassen!', index: 0,
        eintraege: [{ label: 'Stemmen! (E)', id: 'mg_aktion' }, { label: 'Abbrechen', id: 'zurueck' }] };
    }
    return null;
  }

  function update(mg, dt, aktion) {
    if (!mg || mg.fertig) return mg;
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
      if (mg.phase === 'warte') {
        mg.next -= dt;
        if (mg.next <= 0) { mg.phase = 'jetzt'; mg.fenster = 0.7; mg.eintraege[0].label = 'PROST! JETZT (E)'; }
      } else if (mg.phase === 'jetzt') {
        mg.fenster -= dt;
        if (aktion) {
          mg.score += 1; mg.feedback = 'PROST!'; mg.phase = 'warte'; mg.next = 0.7 + Math.random() * 1.1;
          mg.eintraege[0].label = 'Wart…';
          if (mg.score >= mg.ziel) { mg.fertig = true; mg.erfolg = true; }
        } else if (mg.fenster <= 0) {
          mg.feedback = 'Zu langsam!'; mg.phase = 'warte'; mg.next = 0.6 + Math.random() * 0.9;
          mg.eintraege[0].label = 'Wart…';
        }
      }
      if (aktion && mg.phase === 'warte') mg.feedback = 'Zu früh – Fehlstart.';
    } else if (mg.id === 'krug') {
      mg.kraft = Math.max(0, (mg.kraft || 0) - dt * 0.25);
      if (aktion) mg.kraft = Math.min(1.15, mg.kraft + 0.14);
      if (mg.kraft >= 1 && mg.kraft <= 1.08) { mg.score = 1; mg.fertig = true; mg.erfolg = true; mg.feedback = 'Krug oben!'; }
      else if (mg.kraft > 1.08) { mg.kraft = 0; mg.feedback = 'Überkippt – Schaum überall.'; }
      mg.balken = Math.min(1, mg.kraft);
    }
    return mg;
  }

  function belohnung(mg) {
    var b;
    if (!mg || !mg.erfolg) b = { punkte: 5, pegel: 0.02, team: 0, text: 'Abgebrochen/daneben. Trost-Schluck mental.' };
    else if (mg.id === 'deckel') b = { punkte: 80, pegel: 0.05, team: 1, text: 'Bierdeckel-König! Team +1' };
    else if (mg.id === 'prost') b = { punkte: 70, pegel: 0.08, team: 1, text: 'Reaktions-Prost gemeistert!' };
    else if (mg.id === 'krug') b = { punkte: 90, pegel: 0.1, team: 0, stand: 3, text: 'Maßkrug gehalten. Arme aus Stahl(filz).' };
    else b = { punkte: 40, pegel: 0.05, team: 0, text: 'Minispiel geschafft.' };
    if (mg && mg.angebot && mg.titel) b.text = mg.titel + ': ' + b.text;
    return b;
  }

  Saufi.Minispiele = { IDEEN: IDEEN, eintraegeFuerOrt: eintraegeFuerOrt, starte: starte, update: update, belohnung: belohnung };
})(globalThis);
