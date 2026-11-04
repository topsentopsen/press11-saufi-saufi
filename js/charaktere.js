/* Alle Figuren: Trinkfestigkeit (1,00 = Standard, groesser = vertraegt weniger), Leben, Farben, Anwaerter-Fortschritt.
   Farben, Eigenheiten und Trinkfestigkeit ausser den Vorgaben sind erfunden (Entwurf Abschnitt 5). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var LISTE = [
    { id: 'tobi', name: 'Tobi', rolle: 'stamm', spielbar: true, trink: 1.00, leben: 1, shirt: '#e0504a', hose: '#3f4f7a', haar: '#5a3a28', extra: 'muetze', spruch: 'Wer hat Durst?' },
    { id: 'raphael', name: 'Raphael', alias: 'Raffi', rolle: 'anwaerter', fortschritt: 10, fortschrittProRunde: 4, trink: 1.30, leben: 2, shirt: '#5fbf6a', hose: '#4a5a8a', haar: '#3a2a20', extra: 'brille', spruch: 'Ich pack das!' },
    { id: 'tobias', name: 'Tobias', rolle: 'anwaerter', fortschritt: 80, fortschrittProRunde: 5, trink: 1.10, leben: 1, shirt: '#4a7ad8', hose: '#3a3a4a', haar: '#d8b86a', extra: 'gel', spruch: 'Fast drin.' },
    { id: 'schwickendorf', name: 'Schwickendorf', rolle: 'stamm', trink: 0.95, leben: 1, shirt: '#8a5a38', hose: '#5a4a3a', haar: '#8a8a8a', extra: 'schnurrbart', spruch: 'Also, früher...' },
    { id: 'buntschuh', name: 'Buntschuh', rolle: 'stamm', trink: 1.00, leben: 1, shirt: '#f0c828', hose: '#6a4a9a', haar: '#4a3020', extra: 'schuhe', spruch: 'Tanzen!' },
    { id: 'ritzi', name: 'Ritzi', rolle: 'stamm', trink: 0.90, leben: 1, shirt: '#e870a8', hose: '#4a4a6a', haar: '#ff8ac0', extra: 'rosa', spruch: 'Noch eine!' },
    { id: 'siebold', name: 'Siebold', rolle: 'stamm', trink: 0.85, leben: 1, shirt: '#9a9aa8', hose: '#3a3a4a', haar: '#6a6a6a', extra: 'weste', spruch: 'Ich rechne nach...' },
    { id: 'kevin', name: 'Kevin', rolle: 'stamm', trink: 1.20, leben: 1, shirt: '#2a2a32', hose: '#2a2a32', haar: '#5a3a28', extra: 'cap', spruch: 'Hunger!' },
    { id: 'stoeckle', name: 'Stöckle', rolle: 'stamm', trink: 0.80, leben: 1, shirt: '#2f6a3f', hose: '#5a4a3a', haar: '#7a5a38', extra: 'tracht', spruch: 'Des koschd extra!' },
    { id: 'probst', name: 'Probst', rolle: 'stamm', trink: 0.75, leben: 1, shirt: '#f4f4f4', hose: '#222228', haar: '#2a2a2a', extra: 'hut', spruch: 'Ich sehe alles.' },
    { id: 'rudi', name: 'Rudi', rolle: 'gast', kommtAb: 14 * 60, trink: 1.00, leben: 2, shirt: '#f08a2a', hose: '#f08a2a', haar: '#a05a28', extra: 'latz', spruch: 'Oh, hier isch schee.' }
  ];

  function holen(id) {
    for (var i = 0; i < LISTE.length; i++) if (LISTE[i].id === id || (LISTE[i].alias && LISTE[i].alias.toLowerCase() === String(id).toLowerCase())) return LISTE[i];
    return null;
  }
  // Alle ausser der gespielten Figur folgen als NPCs.
  function npcs(spielerId) { return LISTE.filter(function (c) { return c.id !== spielerId; }); }

  Saufi.Charaktere = { LISTE: LISTE, holen: holen, npcs: npcs };
})(globalThis);
