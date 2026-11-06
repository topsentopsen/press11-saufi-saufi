/* Pegel (fiktiv, 0,0 bis 4,0), Standfestigkeit 0 bis 100, Abbau, Schwellen, Umfallen, zweites Leben.
   Gilt fuer jede Figur (Spieler und NPCs). Rein Spielwerte, kein Massstab fuers echte Leben. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var MAX = 4.0, ABBAU_PRO_STUNDE = 0.10, STAND_MAX = 100;
  // Kotzen ab der kritischen Schwelle, zusätzlich zum Umfallen. Kein rng.
  var KOTZ_AB = 3.0, KOTZ_DAUER = 1.7, FLECK_SEK = 12, KOTZ_PAUSE = 18;
  var KOTZ_TEXTE = ['Bäh!', 'Würg…', 'Zu viel!'];

  function neu(char) {
    return { id: char.id, trink: char.trink, pegel: 0, stand: STAND_MAX, leben: char.leben, umgefallen: false, verloren: false,
      abbauBonus: 0, abbauBis: 0, mahlzeiten: [], vollBis: 0,
      heil: char.heil != null ? char.heil : 1, abbauMul: char.abbauMul != null ? char.abbauMul : 1, tempo: char.tempo != null ? char.tempo : 1 };
  }
  function klemme(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rund1(v) { return Math.round(v * 10) / 10; }

  function addPegel(f, d) { f.pegel = klemme(f.pegel + d, 0, MAX); return f.pegel; }
  // Getraenk trinken: Alkoholisches wird mit der Trinkfestigkeit skaliert (Getraenke.pegelDelta), Wasser hebt die Standfestigkeit.
  function trinke(f, id, mal) {
    var G = Saufi.Getraenke, def = G.LISTE[id];
    if (!def) return 0;
    var d = G.pegelDelta(id, f.trink) * (mal || 1), alt = f.pegel;
    addPegel(f, d);
    if (def.stand) heile(f, def.stand * (mal || 1));
    return f.pegel - alt;
  }
  function abbau(f, stunden, minute) {
    var rate = (ABBAU_PRO_STUNDE + (minute < f.abbauBis ? f.abbauBonus : 0)) * (f.abbauMul != null ? f.abbauMul : 1);
    f.pegel = klemme(f.pegel - rate * stunden, 0, MAX);
  }
  function schwelle(p) { return p < 1 ? 'klar' : (p < 2 ? 'locker' : (p < 3 ? 'wackelig' : 'kritisch')); }
  function heile(f, n) { f.stand = klemme(f.stand + n, 0, STAND_MAX); }
  function schaden(f, n, halbiert) { f.stand = klemme(f.stand - n * (halbiert ? 0.5 : 1), 0, STAND_MAX); }
  // Ueber 3,0 sinkt die Standfestigkeit jede Sekunde, je hoeher, desto schneller.
  function verlustProSekunde(f) { return f.pegel > 3 ? 1.5 + (f.pegel - 3) * 3 : 0; }
  function update(f, dt, halbiert) { var v = verlustProSekunde(f) * dt; if (v > 0) schaden(f, v, halbiert); return v; }

  // Bei Standfestigkeit 0 faellt die Figur um und verbraucht ein Leben.
  // Rueckgabe: null (steht) | 'aufstehbar' (hat noch ein Leben) | 'verloren' (kein Leben mehr)
  function pruefe(f) {
    if (f.umgefallen || f.stand > 0) return null;
    f.stand = 0; f.umgefallen = true; f.leben -= 1;
    f.verloren = f.leben <= 0;
    return f.verloren ? 'verloren' : 'aufstehbar';
  }
  function aufstehen(f) {
    if (!f.umgefallen || f.leben <= 0) return false;
    f.umgefallen = false; f.stand = 40; f.pegel = klemme(f.pegel - 1.0, 0, MAX);
    return true;
  }

  // Essen: Pegel runter, Standfestigkeit rauf, Abbau-Boost 2 Spielstunden. 3 Gerichte in 2 Spielstunden machen satt (Bewegung -20 %).
  function essen(f, gericht, minute, faktor) {
    var E = Saufi.Essen, k = faktor || 1;
    addPegel(f, gericht.pegel * k);
    heile(f, gericht.stand * k);
    if (gericht.abbau > 0) { f.abbauBonus = gericht.abbau; f.abbauBis = minute + 120; }
    f.mahlzeiten.push(minute);
    f.mahlzeiten = f.mahlzeiten.filter(function (m) { return minute - m <= E.VOLL_FENSTER_MIN; });
    if (f.mahlzeiten.length >= E.VOLL_ANZAHL) f.vollBis = minute + E.VOLL_DAUER_MIN;
    return { voll: minute < f.vollBis };
  }
  function bewegung(f, minute) { return minute < f.vollBis ? Saufi.Essen.VOLL_FAKTOR : 1; }
  function anzeige(p) { return rund1(p).toFixed(1).replace('.', ','); }

  // st: { pause, aktiv, flecke, n }. opt.umfallen erzwingt einen Schub, auch in der Pause (neben dem Einschlafen).
  function kotzTick(st, dt, pegel, opt) {
    opt = opt || {};
    if (!st) st = { pause: 0, aktiv: null, flecke: [], n: 0 };
    if (!st.flecke) st.flecke = [];
    if (st.pause > 0) st.pause -= dt;
    if (st.aktiv) {
      st.aktiv.t += dt;
      if (st.aktiv.t >= KOTZ_DAUER) st.aktiv = null;
    }
    var i = st.flecke.length;
    while (i--) {
      st.flecke[i].rest -= dt;
      if (st.flecke[i].rest <= 0) st.flecke.splice(i, 1);
    }
    var drueber = pegel >= KOTZ_AB;
    var jetzt = drueber && !st.aktiv && (!!opt.umfallen || st.pause <= 0);
    st.neu = false;
    if (jetzt) {
      st.n = (st.n || 0) + 1;
      st.aktiv = { t: 0, text: KOTZ_TEXTE[(st.n - 1) % KOTZ_TEXTE.length] };
      st.flecke.push({ x: opt.x || 0, y: opt.y || 0, rest: FLECK_SEK, dauer: FLECK_SEK });
      if (st.flecke.length > 4) st.flecke.shift();
      st.pause = KOTZ_PAUSE;
      st.neu = true;
    }
    return st;
  }

  Saufi.Pegel = {
    MAX: MAX, ABBAU_PRO_STUNDE: ABBAU_PRO_STUNDE, STAND_MAX: STAND_MAX,
    KOTZ_AB: KOTZ_AB, KOTZ_DAUER: KOTZ_DAUER, FLECK_SEK: FLECK_SEK, KOTZ_PAUSE: KOTZ_PAUSE, KOTZ_TEXTE: KOTZ_TEXTE,
    neu: neu, addPegel: addPegel, trinke: trinke, abbau: abbau, schwelle: schwelle, heile: heile, schaden: schaden,
    verlustProSekunde: verlustProSekunde, update: update, pruefe: pruefe, aufstehen: aufstehen, essen: essen, bewegung: bewegung, anzeige: anzeige,
    kotzTick: kotzTick
  };
})(globalThis);
