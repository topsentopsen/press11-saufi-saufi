/* Gerichte: einmalige Pegel-Senkung, Abbau-Boost fuer 2 Spielstunden, Standfestigkeit, Dauer in Echtzeit-Sekunden, Preis in Punkten. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var GERICHTE = {
    fruehstueck: { id: 'fruehstueck', label: 'Fruehstueck (Broetchen, Ruehrei, Obst)', pegel: -0.05, abbau: 0.05, stand: 10, dauer: 3, preis: 5 },
    maultaschen: { id: 'maultaschen', label: 'Maultaschen in Bruehe', pegel: -0.15, abbau: 0.10, stand: 20, dauer: 5, preis: 10 },
    linsen: { id: 'linsen', label: 'Linsen mit Spaetzle', pegel: -0.10, abbau: 0.05, stand: 30, dauer: 5, preis: 10 },
    brezel: { id: 'brezel', label: 'Brezel', pegel: -0.02, abbau: 0, stand: 5, dauer: 3, preis: 2 }
  };
  // Welche Station was verkauft
  var MENUE = {
    buffet: ['fruehstueck'],
    kueche: ['maultaschen', 'linsen', 'brezel'],
    tresen_kneipe: ['brezel']
  };
  // Umlaute in den Beschriftungen fuer die Anzeige
  var ANZEIGE = { fruehstueck: 'Frühstück (Brötchen, Rührei, Obst)', maultaschen: 'Maultaschen in Brühe', linsen: 'Linsen mit Spätzle', brezel: 'Brezel' };
  Object.keys(GERICHTE).forEach(function (k) { GERICHTE[k].label = ANZEIGE[k]; });

  Saufi.Essen = { GERICHTE: GERICHTE, MENUE: MENUE, VOLL_ANZAHL: 3, VOLL_FENSTER_MIN: 120, VOLL_DAUER_MIN: 60, VOLL_FAKTOR: 0.8 };
})(globalThis);
