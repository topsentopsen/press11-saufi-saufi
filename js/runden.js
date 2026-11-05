/* Mittrunden: feste Zeiten und Orte, Vorwarnung, Ausruf, Pflicht, Teamstimmung (0 bis 5), Strafe, Anwaerter-Fortschritt.
   Alles in Spielminuten. Die Funktionen liefern Wirkungs-Objekte; main.js wendet sie auf Pegel, Punkte usw. an. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var VORLAUF_MIN = 60;      // Vorwarnung eine Spielstunde vorher
  var FRIST_MIN = 40;        // ca. 32 Sekunden Echtzeit (bei 48 s/h) nach dem Ausruf Zeit, am Tisch zu stehen
  var TEAM_START = 3, TEAM_MAX = 5, STRAFE_STAND = 15;

  // 6 feste Runden (v01). Reihenfolge ist fest (kein Zufall).
  var PLAN = [
    { zeit: 10 * 60, ort: 'hotel', glaeser: 2, getraenk: 'radler' },
    { zeit: 12 * 60 + 30, ort: 'restaurant', glaeser: 3, getraenk: 'radler' },
    { zeit: 15 * 60 + 30, ort: 'kneipe', glaeser: 2, getraenk: 'pils' },
    { zeit: 19 * 60 + 30, ort: 'restaurant', glaeser: 3, getraenk: 'pils' },
    { zeit: 22 * 60 + 30, ort: 'disko', glaeser: 2, getraenk: 'kurzer' },
    { zeit: 25 * 60 + 30, ort: 'disko', glaeser: 3, getraenk: 'kurzer' }
  ];

  function erstelle() {
    var anw = {};
    Saufi.Charaktere.LISTE.forEach(function (c) { if (c.rolle === 'anwaerter') anw[c.id] = c.fortschritt; });
    return {
      runden: PLAN.map(function (p) { return { zeit: p.zeit, ort: p.ort, glaeser: p.glaeser, getraenk: p.getraenk, status: 'offen', rest: p.glaeser, getauscht: 0, erwischt: false, puenktlich: false }; }),
      team: TEAM_START, anwaerter: anw, aufgenommen: {}, geschafft: 0
    };
  }
  function aktive(rs) { for (var i = 0; i < rs.runden.length; i++) if (rs.runden[i].status === 'aktiv') return rs.runden[i]; return null; }
  function aktiveIndex(rs) { for (var i = 0; i < rs.runden.length; i++) if (rs.runden[i].status === 'aktiv') return i; return -1; }
  // Die naechste Runde, die noch kommt oder gerade laeuft
  function naechste(rs) { for (var i = 0; i < rs.runden.length; i++) { var s = rs.runden[i].status; if (s === 'offen' || s === 'warnung' || s === 'aktiv') return rs.runden[i]; } return null; }

  function teamAendern(rs, d) { rs.team = Math.max(0, Math.min(TEAM_MAX, rs.team + d)); return rs.team; }
  function verloren(rs) { return rs.team <= 0; }

  // Zeit fortschreiben. Rueckgabe: Ereignisse { typ: 'warnung'|'ausruf'|'verpasst', index, runde, effekt? }
  function tick(rs, minute) {
    var ev = [];
    for (var i = 0; i < rs.runden.length; i++) {
      var r = rs.runden[i];
      if (r.status === 'offen' && minute >= r.zeit - VORLAUF_MIN && minute < r.zeit) { r.status = 'warnung'; ev.push({ typ: 'warnung', index: i, runde: r }); }
      if ((r.status === 'offen' || r.status === 'warnung') && minute >= r.zeit) {
        if (minute >= r.zeit + FRIST_MIN) { r.status = 'aktiv'; } else { r.status = 'aktiv'; ev.push({ typ: 'ausruf', index: i, runde: r }); }
      }
      if (r.status === 'aktiv' && minute >= r.zeit + FRIST_MIN) {
        r.status = 'verpasst';
        teamAendern(rs, -1);
        ev.push({ typ: 'verpasst', index: i, runde: r, effekt: { team: -1, stand: -STRAFE_STAND, punkte: -100 } });
      }
    }
    return ev;
  }

  function erfolg(rs, r, minute) {
    r.status = 'erledigt'; r.puenktlich = minute <= r.zeit + FRIST_MIN / 2;
    teamAendern(rs, 1); rs.geschafft += 1;
    var neu = fortschritt(rs);
    return { team: 1, punkte: 100 + (r.puenktlich ? 50 : 0), aufgenommen: neu };
  }
  // Anwaerter-Fortschritt je erfolgreicher Runde. Aufnahme genau einmal bei 100 %.
  function fortschritt(rs) {
    var neu = [];
    Saufi.Charaktere.LISTE.forEach(function (c) {
      if (c.rolle !== 'anwaerter' || rs.aufgenommen[c.id]) return;
      rs.anwaerter[c.id] = Math.min(100, rs.anwaerter[c.id] + c.fortschrittProRunde);
      if (rs.anwaerter[c.id] >= 100) { rs.aufgenommen[c.id] = true; neu.push(c.id); teamAendern(rs, 1); }
    });
    return neu;
  }
  function peinlich(rs, id, delta) {
    if (rs.anwaerter[id] === undefined || rs.aufgenommen[id]) return;
    rs.anwaerter[id] = Math.max(0, rs.anwaerter[id] + delta);
  }

  // Der Spieler trinkt alle verbleibenden Glaeser.
  function trinke(rs, r, minute) {
    var glaeser = r.rest; r.rest = 0;
    var e = erfolg(rs, r, minute); e.glaeser = glaeser; return e;
  }
  // Ein Glas heimlich gegen Alkoholfrei tauschen. cheats = Saufi.Cheats-Zustand.
  function tausche(rs, r, cheats, rng, minute, probstDa) {
    var t = Saufi.Cheats.tausche(cheats, rng, minute, probstDa);
    if (!t.erlaubt) return { erlaubt: false };
    r.getauscht += 1;
    if (t.erwischt) {
      var nachtrunk = r.rest * 2;           // Pflichtrunde nachtraeglich: doppeltes Getraenk fuer jedes uebrige Glas
      r.rest = 0; r.erwischt = true; r.status = 'erledigt';
      teamAendern(rs, -2);
      peinlich(rs, 'raphael', -15); peinlich(rs, 'tobias', -15);
      return { erlaubt: true, erwischt: true, nachtrunk: nachtrunk, team: -2, punkte: -150 };
    }
    r.rest -= 1;
    if (r.rest <= 0) { var e = erfolg(rs, r, minute); e.erlaubt = true; e.erwischt = false; e.fertig = true; return e; }
    return { erlaubt: true, erwischt: false, fertig: false, rest: r.rest };
  }
  function ablehnen(rs, r) {
    r.status = 'abgelehnt'; r.rest = 0;
    teamAendern(rs, -1);
    return { team: -1, stand: -STRAFE_STAND, punkte: -100 };
  }

  Saufi.Runden = {
    PLAN: PLAN, VORLAUF_MIN: VORLAUF_MIN, FRIST_MIN: FRIST_MIN, TEAM_START: TEAM_START, TEAM_MAX: TEAM_MAX, STRAFE_STAND: STRAFE_STAND,
    erstelle: erstelle, aktive: aktive, aktiveIndex: aktiveIndex, naechste: naechste, teamAendern: teamAendern, verloren: verloren,
    tick: tick, trinke: trinke, tausche: tausche, ablehnen: ablehnen, fortschritt: fortschritt, peinlich: peinlich
  };
})(globalThis);
