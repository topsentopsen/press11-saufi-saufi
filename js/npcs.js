/* NPCs der Truppe: folgen dem Spieler (A*), stehen bei Mittrunden am Stammtisch, trinken mit, fallen um, lassen sich mit Wasser wecken. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16, SPEED = 50, AUFSTEH_SEK = 15, RUDI_ID = 'rudi', WECK_REICHWEITE = 48;

  function erstelle(spielerId) {
    return Saufi.Charaktere.npcs(spielerId).map(function (c, i) {
      return { id: c.id, char: c, fig: Saufi.Pegel.neu(c), nr: i, aktiv: !c.kommtAb, karteId: 'stadt', x: 0, y: 0, dir: 'unten', anim: 0, schritt: 0, laeuft: false,
        pfad: null, pfadI: 0, replan: 0, zielKey: '', liegt: false, liegtSeit: 0, blase: null, mitgetrunken: 0 };
    });
  }

  function sichtbar(n, karteId) { return n.aktiv && n.karteId === karteId; }

  // Breitensuche von (tx,ty): begehbare Kacheln in Reihenfolge des Abstands
  function nahKacheln(karte, tx, ty, anzahl) {
    var res = [], seen = {}, q = [{ x: tx, y: ty }];
    seen[tx + ',' + ty] = true;
    var DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    while (q.length && res.length < anzahl + 1) {
      var c = q.shift();
      if (!(c.x === tx && c.y === ty)) res.push(c);
      for (var d = 0; d < 4; d++) {
        var nx = c.x + DX[d], ny = c.y + DY[d], key = nx + ',' + ny;
        if (seen[key] || karte.blockiert(nx, ny) || nx < 0 || ny < 0 || nx >= karte.w || ny >= karte.h) continue;
        seen[key] = true; q.push({ x: nx, y: ny });
      }
    }
    return res;
  }

  // Spieler wechselt die Karte: alle stehenden NPCs kommen mit und werden rund um (tx,ty) abgesetzt.
  function uebergang(list, karte, tx, ty) {
    var mit = list.filter(function (n) { return n.aktiv && !n.liegt; });
    var plaetze = nahKacheln(karte, tx, ty, mit.length + 2);
    mit.forEach(function (n, i) {
      var p = plaetze[i] || { x: tx, y: ty };
      n.karteId = karte.id; n.x = p.x * K + K / 2; n.y = p.y * K + K / 2; n.pfad = null; n.zielKey = ''; n.laeuft = false; n.schwarm = null; n.auftrag = null;
    });
  }

  // v11: Beim Betreten eines Ortes schwaermt die Truppe aus (Tresen, Tanzflaeche, Tische, Sofa) statt nur hinterherzulaufen
  var SCHWARM_TYPEN = ['tresen_kneipe', 'tresen_restaurant', 'bar_disko', 'tanz', 'stammtisch', 'sofa', 'bank', 'buffet', 'jukebox', 'spender'];
  function ausschwaermen(list, karte) {
    if (!karte || !karte.innen) return 0;
    var ziele = [], belegt = {};
    karte.stationen.forEach(function (st) {
      if (SCHWARM_TYPEN.indexOf(st.typ) < 0) return;
      Saufi.Karte.umgebung(karte, st).forEach(function (t) { var k = t.x + ',' + t.y; if (!belegt[k]) { belegt[k] = true; ziele.push({ x: t.x, y: t.y, typ: st.typ }); } });
    });
    if (!ziele.length) return 0;
    var mit = list.filter(function (n) { return n.aktiv && !n.liegt && n.karteId === karte.id; }), z = 0;
    mit.forEach(function (n, i) {
      var t = ziele[Math.floor((i + 0.5) * ziele.length / mit.length) % ziele.length];
      n.schwarm = { x: t.x, y: t.y, typ: t.typ, sek: 9 + (n.nr % 4) * 1.5 }; z += 1;
    });
    return z;
  }
  function tileOf(n) { return { x: Math.floor(n.x / K), y: Math.floor((n.y - 1) / K) }; }

  function geheZu(n, karte, tx, ty, dt, faktor) {
    var t0 = tileOf(n), key = tx + ',' + ty;
    n.replan -= dt;
    if (!n.pfad || n.zielKey !== key || n.replan <= 0) {
      n.pfad = Saufi.Pfad.suche(karte, t0.x, t0.y, tx, ty); n.pfadI = 1; n.zielKey = key; n.replan = 0.6;
    }
    n.laeuft = false;
    if (!n.pfad || n.pfadI >= n.pfad.length) return;
    var w = n.pfad[n.pfadI], wx = w.x * K + K / 2, wy = w.y * K + K / 2, dx = wx - n.x, dy = wy - n.y, d = Math.hypot(dx, dy);
    if (d < 2) { n.pfadI += 1; return; }
    var s = Math.min(d, SPEED * (faktor || 1) * dt);
    n.x += dx / d * s; n.y += dy / d * s; n.laeuft = true;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'rechts' : 'links') : (dy > 0 ? 'unten' : 'oben');
  }

  // ctx: { karte, spieler, dt, t, halbiert, faktor, tischSlots (oder null), minute }
  // Rueckgabe: Ereignisse { typ: 'umgefallen'|'aufgestanden', npc }
  function update(list, ctx) {
    var ev = [], karte = ctx.karte, sp = ctx.spieler, dt = ctx.dt;
    list.forEach(function (n) {
      if (!n.aktiv) return;
      var f = n.fig;
      if (n.karteId !== karte.id && !n.liegt) {         // steht nach dem zweiten Leben anderswo auf: wie bei einem Uebergang neben dem Spieler absetzen
        var pl = nahKacheln(karte, tileOf(sp).x, tileOf(sp).y, 1)[0] || tileOf(sp);
        n.karteId = karte.id; n.x = pl.x * K + K / 2; n.y = pl.y * K + K / 2; n.pfad = null; n.zielKey = ''; n.laeuft = false;
      }
      // Zustand der Figur (Standfestigkeit, Umfallen) laeuft auch fuer NPCs anderswo weiter
      if (!n.liegt) {
        Saufi.Pegel.update(f, dt, ctx.halbiert);
        var r = Saufi.Pegel.pruefe(f);
        if (r) { n.liegt = true; n.liegtSeit = 0; n.pfad = null; ev.push({ typ: 'umgefallen', npc: n, verloren: r === 'verloren' }); }
      } else {
        n.liegtSeit += dt;
        if (!f.verloren && f.umgefallen && n.liegtSeit >= AUFSTEH_SEK) {      // zweites Leben: steht von selbst wieder auf
          if (Saufi.Pegel.aufstehen(f)) { n.liegt = false; ev.push({ typ: 'aufgestanden', npc: n }); }
        }
      }
      if (n.blase) { n.blase.rest -= dt; if (n.blase.rest <= 0) n.blase = null; }
      if (n.karteId !== karte.id || n.liegt) { n.laeuft = false; return; }
      if (n.schwarm && n.schwarm.sek <= 0) n.schwarm = null;
      var slot = ctx.tischSlots && ctx.tischSlots.length ? ctx.tischSlots[n.nr % ctx.tischSlots.length] : null;
      var ziel = slot || tileOf(sp);
      var t0 = tileOf(n), dist = Math.hypot(sp.x - n.x, sp.y - n.y);
      if (slot) { n.schwarm = null; if (t0.x !== slot.x || t0.y !== slot.y) geheZu(n, karte, slot.x, slot.y, dt, ctx.faktor); else n.laeuft = false; }
      else if (n.auftrag) { if (t0.x !== n.auftrag.x || t0.y !== n.auftrag.y) geheZu(n, karte, n.auftrag.x, n.auftrag.y, dt, (ctx.faktor || 1) * 1.25); else { n.laeuft = false; n.auftrag.da = true; } }
      else if (n.schwarm && (n.schwarm.sek -= dt) > 0 && dist < 120) { if (t0.x !== n.schwarm.x || t0.y !== n.schwarm.y) geheZu(n, karte, n.schwarm.x, n.schwarm.y, dt, ctx.faktor); else n.laeuft = false; }
      else if (dist > 26 + (n.nr % 4) * 6) geheZu(n, karte, ziel.x, ziel.y, dt, ctx.faktor);
      else n.laeuft = false;
      if (n.laeuft) { n.anim += dt * 8; n.schritt = Math.floor(n.anim) % 4; } else n.schritt = 0;
    });
    return ev;
  }

  // Alle aktiven, stehenden NPCs trinken die Runde mit (Pegel mit der eigenen Trinkfestigkeit)
  function trinkeRunde(list, runde) {
    list.forEach(function (n) { if (n.aktiv && !n.liegt) { Saufi.Pegel.trinke(n.fig, runde.getraenk, runde.glaeser); n.mitgetrunken += 1; } });
  }
  // Zwischendurch trinken die Mutigen mehr: Trinkfestigkeit ab 1,1 (Kevin, Raphael, Tobias) nimmt jede Spielstunde einen Kurzen
  function stunde(list, rng) {
    list.forEach(function (n) {
      if (!n.aktiv || n.liegt) return;
      if (n.char.trink >= 1.1) Saufi.Pegel.trinke(n.fig, 'kurzer', 1);
      else if (rng.next() < 0.3) Saufi.Pegel.trinke(n.fig, 'pils', 1);
    });
  }
  function abbau(list, stunden, minute) { list.forEach(function (n) { if (n.aktiv && !n.liegt) Saufi.Pegel.abbau(n.fig, stunden, minute); }); }

  function naechsterLiegender(list, karteId, x, y, reichweite) {
    var best = null, bd = reichweite || 30;
    list.forEach(function (n) {
      if (!n.aktiv || !n.liegt || n.karteId !== karteId) return;
      var d = Math.hypot(n.x - x, n.y - y); if (d <= bd) { bd = d; best = n; }
    });
    return best;
  }
  // Mit Wasser wecken (Spieler hat Wasser dabei)
  function wecke(n) {
    if (!n.liegt) return false;
    var f = n.fig;
    n.liegt = false; f.umgefallen = false; f.verloren = false; f.leben = Math.max(1, f.leben); f.stand = 45; f.pegel = Math.max(Math.min(f.pegel, 2.5), f.pegel - 1.2);
    n.pfad = null;
    return true;
  }
  // Rudi taucht ab 14:00 auf
  function ankommen(list, minute, karte, tx, ty) {
    var neu = [];
    list.forEach(function (n) {
      if (!n.aktiv && n.char.kommtAb && minute >= n.char.kommtAb) {
        n.aktiv = true; neu.push(n);
        var p = nahKacheln(karte, tx, ty, 2)[1] || { x: tx, y: ty };
        n.karteId = karte.id; n.x = p.x * K + K / 2; n.y = p.y * K + K / 2;
      }
    });
    return neu;
  }
  // Hoechstens 2 Sprechblasen gleichzeitig; Sprueche aus Pools (Figur/Ort/Pegel)
  function sprechen(list, rng, karteId, pegel) {
    var aktivBlasen = list.filter(function (n) { return n.blase; }).length;
    if (aktivBlasen >= 2) return null;
    var kandidaten = list.filter(function (n) { return n.aktiv && !n.liegt && n.karteId === karteId && !n.blase; });
    if (!kandidaten.length) return null;
    var n = rng.pick(kandidaten);
    var text = (Saufi.Hinweise && Saufi.Hinweise.spruch)
      ? Saufi.Hinweise.spruch(rng, { id: n.id, ort: karteId, pegel: pegel || 0 })
      : n.char.spruch;
    n.blase = { text: text, rest: 2.8 }; return n;
  }

  Saufi.NPCs = {
    SPEED: SPEED, AUFSTEH_SEK: AUFSTEH_SEK, erstelle: erstelle, sichtbar: sichtbar, uebergang: uebergang, ausschwaermen: ausschwaermen, update: update, trinkeRunde: trinkeRunde,
    stunde: stunde, abbau: abbau, naechsterLiegender: naechsterLiegender, WECK_REICHWEITE: WECK_REICHWEITE, wecke: wecke, ankommen: ankommen, sprechen: sprechen, nahKacheln: nahKacheln, tileOf: tileOf
  };
})(globalThis);
