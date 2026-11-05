/* Alle Figuren: Trinkfestigkeit (1,00 = Standard, groesser = vertraegt weniger), Leben, Farben, Anwaerter-Fortschritt.
   Farben, Eigenheiten und Trinkfestigkeit ausser den Vorgaben sind erfunden (Entwurf Abschnitt 5).
   auswahl: Startkarten-Texte (rolle/plus/minus). Stats tempo/heil/punkteFaktor/abbauMul/teamStart optional. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var LISTE = [
    { id: 'tobi', name: 'Tobi', rolle: 'stamm', spielbar: true, trink: 1.00, leben: 1, shirt: '#d8222a', hose: '#3f4f7a', haar: '#5a3a28', extra: 'muetze', spruch: 'Wer hat Durst?',
      punkteFaktor: 1, rundenFaktor: 1, tempo: 1, heil: 1, abbauMul: 1,
      auswahl: { rolle: 'Tesla-Tobi, Elon-Fanboy', plus: 'Elon-Sprüche', minus: 'nach 2 Uhr schwer zu motivieren' } },
    { id: 'raphael', name: 'Raphael', alias: 'Raphi', rolle: 'anwaerter', fortschritt: 10, fortschrittProRunde: 4, trink: 1.30, leben: 2, shirt: '#ff4fa0', hose: '#4a5a8a', haar: null, extra: 'kaeppi', spruch: 'Ich pack das!',
      tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 1, gasBis: 12 * 60, gas: 1.5,
      auswahl: { rolle: 'Anwärter, zweites Leben', plus: 'Extra-Leben', minus: 'gibt am Anfang zu viel Gas' } },
    { id: 'tobias', name: 'Tobias', rolle: 'anwaerter', fortschritt: 80, fortschrittProRunde: 5, trink: 1.10, leben: 1, shirt: '#4a7ad8', hose: '#3a3a4a', haar: '#d8b86a', extra: 'gel', spruch: 'Fast drin.' },
    { id: 'schwickendorf', name: 'Schwickendorf', rolle: 'stamm', trink: 0.95, leben: 1, shirt: '#8a5a38', hose: '#5a4a3a', haar: '#8a8a8a', extra: 'schnurrbart', spruch: 'Also, früher...' },
    { id: 'bundschuh', name: 'Bundschuh', rolle: 'stamm', trink: 0.92, leben: 1, shirt: '#f0c828', hose: '#6a4a9a', haar: '#4a3020', extra: 'schuhe', spruch: 'Tanzen!',
      tempo: 0.92, heil: 1.2, punkteFaktor: 0.92, abbauMul: 1.15, ueberblick: true, heim: true,
      auswahl: { rolle: 'Organisationstalent', plus: 'Überblick, alle kommen heim', minus: 'langsamer, weniger Punkte' } },
    { id: 'ritzi', name: 'Ritzi', rolle: 'stamm', trink: 0.95, leben: 1, shirt: '#8a5cc8', hose: '#4a4a6a', haar: '#4a2a6a', extra: 'kurz', spruch: 'Noch eine!',
      teamStart: 4, tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 1,
      auswahl: { rolle: 'Captain', plus: 'Teamstimmung steigt leichter', minus: 'trinkt fast jede Runde mit' } },
    { id: 'siebold', name: 'Siebold', rolle: 'stamm', trink: 0.85, leben: 1, shirt: '#9a9aa8', hose: '#3a3a4a', haar: '#6a6a6a', extra: 'weste', spruch: 'Ich rechne nach...', motivator: true, gameMaster: true,
      tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 0.8,
      auswahl: { rolle: 'Game Master, Motivator', plus: 'initiiert Trinkspiele', minus: 'selten nüchtern' } },
    { id: 'schwinki', name: 'Schwinki', rolle: 'stamm', gehtAb: 25 * 60, trink: 1.20, leben: 1, shirt: '#2a2a32', hose: '#2a2a32', haar: '#5a3a28', extra: 'cap', spruch: 'Hunger!',
      tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 1, nachschub: true,
      auswahl: { rolle: 'Der Vernünftige', plus: 'hat immer Nachschub dabei', minus: 'geht immer früher nach Hause' } },
    { id: 'stoeckle', name: 'Stöckle', rolle: 'stamm', trink: 0.80, leben: 1, shirt: '#2f6a3f', hose: '#5a4a3a', haar: '#7a5a38', extra: 'tracht', spruch: 'Des koschd extra!', motivator: true,
      tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 0.75,
      auswahl: { rolle: 'Motivator, nächste Runde', plus: 'findet Runden', minus: 'kaum Ausnüchtern' } },
    { id: 'probst', name: 'Probst', rolle: 'stamm', trink: 0.75, leben: 1, shirt: '#f4f4f4', hose: '#222228', haar: '#2a2a2a', extra: 'hut', spruch: 'Ich sehe alles.' },
    { id: 'himmelsbach', name: 'Himmelsbach', rolle: 'stamm', kommtAb: 14 * 60, trink: 1.00, leben: 2, shirt: '#3a6ea8', hose: '#2f3a52', haar: '#4a3a2a', extra: 'pfeife', spruch: 'Auf geht\'s, nächste Runde!', motivator: true,
      tempo: 1.04, heil: 0.85, punkteFaktor: 1, abbauMul: 1,
      auswahl: { rolle: 'Motivator, nächste Runde', plus: 'zieht zur Runde', minus: 'wenig Pause' } },
    { id: 'zeise', name: 'Zeise', rolle: 'stamm', kommtAb: 16 * 60, trink: 1.10, leben: 1, shirt: '#e8872a', hose: '#2e6e6e', haar: '#c8a050', extra: 'brille', spruch: 'Neu hier, aber bereit!',
      tempo: 1, heil: 1, punkteFaktor: 1, abbauMul: 1,
      auswahl: { rolle: 'Neu dabei', plus: 'noch unbekannt, überrascht alle', minus: 'kennt die Runden noch nicht' } }
  ];

  // Reihenfolge der Startkarten (erweiterbar)
  var AUSWAHL = [
    { id: 'raphael' }, { id: 'tobi' }, { id: 'bundschuh' }, { id: 'ritzi' },
    { id: 'himmelsbach' }, { id: 'stoeckle' }, { id: 'schwinki' }, { id: 'siebold' },
    { id: 'zeise' }
  ];

  function holen(id) {
    for (var i = 0; i < LISTE.length; i++) if (LISTE[i].id === id || (LISTE[i].alias && LISTE[i].alias.toLowerCase() === String(id).toLowerCase())) return LISTE[i];
    return null;
  }
  // Alle ausser der gespielten Figur folgen als NPCs.
  function npcs(spielerId) { return LISTE.filter(function (c) { return c.id !== spielerId; }); }
  function auswahlChars() {
    return AUSWAHL.map(function (e) { return holen(e.id); }).filter(Boolean);
  }

  Saufi.Charaktere = { LISTE: LISTE, AUSWAHL: AUSWAHL, holen: holen, npcs: npcs, auswahlChars: auswahlChars };
})(globalThis);
