/* Spielschleife, Zustaende (Start, Spiel, Menue/Pause, Umgefallen, Ende) und Verdrahtung.
   Saufi.Spiel ist die DOM-freie Spiellogik (testbar), Saufi.Main verbindet sie mit Canvas, Tasten, Touch, Ton und Musik. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16, VERSION = '0.2';

  // ---------------------------------------------------------------- Neues Spiel
  function neuesSpiel(opt) {
    opt = opt || {};
    var seed = opt.seed !== undefined && isFinite(opt.seed) ? opt.seed >>> 0 : 1, tempo = opt.tempo > 0 ? opt.tempo : 1;
    var welt = Saufi.Karte.erstelleWelt(Saufi.RNG.erstelle(seed)), char = Saufi.Charaktere.holen(opt.figur || 'tobi') || Saufi.Charaktere.holen('tobi');
    var sp = Saufi.Spieler.erstelle(welt.stadt.spawn.x, welt.stadt.spawn.y);
    var viewW = opt.viewW || 320, viewH = opt.viewH || 176;
    var S = {
      version: VERSION, seed: seed, tempo: tempo, rng: Saufi.RNG.erstelle(seed + 1000), welt: welt, ort: 'stadt', karte: welt.stadt, char: char,
      fig: Saufi.Pegel.neu(char), uhr: Saufi.Uhr.erstelle(tempo), spieler: sp, kamera: Saufi.Kamera.erstelle(viewW, viewH, welt.stadt.pxW, welt.stadt.pxH),
      npcs: Saufi.NPCs.erstelle(char.id), runden: Saufi.Runden.erstelle(), cheats: Saufi.Cheats.erstelle(), punkte: Saufi.Punkte.erstelle(),
      joint: Saufi.Ereignisse.Joint.erstelle(), boost: Saufi.Ereignisse.Boost.erstelle(), boostAktiv: false, flaschen: 2, flascheGenommen: false,
      hinweise: Saufi.Hinweise.erstelle(), licht: null, t: 0, zustand: opt.start ? 'spiel' : 'start', startIndex: 0, overlay: null, uebergang: null,
      effekte: [], hilfe: '', pfeil: null, ende: null, pressF: null, hausverbote: 0, letzteStunde: Math.floor(Saufi.Uhr.START / 60), prost: 0, tanzBeat: false,
      sprechT: 4, aufnahmeWartet: [], ruhig: !!opt.ruhig, treffer: [], panel: null, musikInfo: { quelle: 'webaudio', aktiv: 'webaudio', spielt: false, youtubeVerfuegbar: false, hinweis: '' },
      best: opt.best || 0, speicher: opt.speicher || null, doppelt: false, stummAn: false, neustart: false, spielSek: 0, stats: { getrunken: 0, gegessen: 0, getauscht: 0, geweckt: 0 },
      pannen: Saufi.Ereignisse.erstellePannen()
    };
    S.licht = Saufi.Uhr.licht(S.uhr);
    Saufi.NPCs.uebergang(S.npcs, welt.stadt, sp.x / K | 0, (sp.y / K | 0));
    Saufi.Kamera.sofort(S.kamera, sp.x, sp.y - 8);
    return S;
  }

  // ---------------------------------------------------------------- Helfer
  function minute(S) { return S.uhr.minute; }
  function sag(S, text, dauer, art) { Saufi.Hinweise.zeige(S.hinweise, text, dauer, art); }
  function jointFaktor(S) { return Saufi.Ereignisse.Joint.verstaerke(S.joint); }
  function mitteVon(st) { return { x: (st.x + st.w / 2) * K, y: (st.y + st.h / 2) * K }; }
  function stationDe(karte, id) { for (var i = 0; i < karte.stationen.length; i++) if (karte.stationen[i].id === id) return karte.stationen[i]; return null; }
  function halbiert(S) { return Saufi.Ereignisse.Boost.verlustFaktor(S.boost) < 1; }
  function funken(S, x, y, farbe, n) {
    for (var i = 0; i < n; i++) S.effekte.push({ x: x, y: y, vx: (S.rng.next() - 0.5) * 50, vy: -S.rng.next() * 40 - 10, rest: 0.7, dauer: 0.7, farbe: farbe });
    if (S.effekte.length > 60) S.effekte.splice(0, S.effekte.length - 60);
  }
  function stub(X) {
    X = X || {};
    if (!X.T) X.T = Saufi.Ton.erstelle(null);
    return X;
  }
  function probstDa(S) { return S.npcs.some(function (n) { return n.id === 'probst' && n.aktiv && !n.liegt; }); }

  // ---------------------------------------------------------------- Ende
  function beende(S, sieg, grund, X) {
    if (S.zustand === 'ende') return;
    X = stub(X);
    S.zustand = 'ende'; S.overlay = null; S.uebergang = null;
    var art = sieg ? 'sieg' : (/Teamstimmung/.test(grund || '') ? 'team' : 'umfall');
    var w = Saufi.Punkte.wertung(S.punkte.punkte, sieg, art), neu = false;
    if (S.speicher) { var alt = S.speicher.zahl('best', 0); if (sieg && S.punkte.punkte > alt) { S.speicher.setzeZahl('best', S.punkte.punkte); neu = true; S.best = S.punkte.punkte; } else S.best = Math.max(S.best || 0, alt); }
    else if (sieg && S.punkte.punkte > (S.best || 0)) { S.best = S.punkte.punkte; neu = true; }
    if (art === 'team' && (!grund || /Teamstimmung 0/.test(grund))) grund = 'Die Truppe hat dich abgehängt (Teamstimmung 0).';
    S.ende = { sieg: sieg, grund: grund || '', wertung: w, art: art, t: 0, neuerBestwert: neu };
    if (sieg) X.T.fanfare(); else X.T.verloren();
    if (X.M) X.M.ende();
    X.T.setzeBoost(false);
  }

  // ---------------------------------------------------------------- Uebergaenge (Tuer, Rauswurf)
  function uebergang(S, fn, dauer) { S.uebergang = { t: 0, dauer: dauer || 0.5, fn: fn, gemacht: false }; S.overlay = null; }
  function stelleHin(S, tx, ty) {
    var sp = S.spieler; Saufi.Spieler.setzeKachel(sp, tx, ty); S.kamera.weltW = S.karte.pxW; S.kamera.weltH = S.karte.pxH;
    Saufi.Kamera.sofort(S.kamera, sp.x, sp.y - 8);
  }
  function musikFuerOrt(S, X) {
    var T = X.T, h = S.uhr.minute / 60, e = h < 11 ? 0 : (h < 18 ? 1 : 2);
    if (S.ort === 'disko' || S.boostAktiv) e = 3;
    T.setzeEbene(e); T.setzeTief(S.ort === 'kneipe');
  }
  function betreten(S, ort, X) {
    X = stub(X);
    S.ort = ort; S.karte = S.welt.innen[ort]; stelleHin(S, S.karte.spawn.x, S.karte.spawn.y);
    Saufi.NPCs.uebergang(S.npcs, S.karte, S.karte.spawn.x, S.karte.spawn.y);
    S.spieler.sitzt = false; X.T.tuer();
    sag(S, Saufi.Karte.NAMEN[ort], 2, 'info');
    if (ort === 'disko' && X.M) X.M.starte('disko');
    musikFuerOrt(S, X);
  }
  function verlassen(S, X) {
    X = stub(X);
    var von = S.ort, b = null;
    S.welt.stadt.gebaeude.forEach(function (g2) { if (g2.id === von) b = g2; });
    S.ort = 'stadt'; S.karte = S.welt.stadt; stelleHin(S, b.aussen.x, b.aussen.y);
    Saufi.NPCs.uebergang(S.npcs, S.karte, b.aussen.x, b.aussen.y);
    S.spieler.sitzt = false; X.T.tuer();
    if (von === 'disko' && X.M) X.M.ende();
    musikFuerOrt(S, X);
  }

  // ---------------------------------------------------------------- Aktionen (Trinken, Essen, Runden)
  function trinke(S, id, X) {
    var G = Saufi.Getraenke, def = G.LISTE[id], f = def.pegel < 0 || id === 'alkoholfrei' ? 1 : jointFaktor(S);
    if (def.pegel < 0) f = jointFaktor(S);
    Saufi.Pegel.trinke(S.fig, id, f);
    if (def.alk) S.stats.getrunken += 1;
    X.T.schluck();
  }
  function startEssen(S, id) {
    var g2 = Saufi.Essen.GERICHTE[id];
    if (S.spieler.isst > 0) return;
    S.spieler.isst = g2.dauer; S.spieler.essenId = id; S.spieler.sitzt = false;
    Saufi.Punkte.add(S.punkte, -g2.preis, 'Essen');
    sag(S, 'Mampf, mampf: ' + g2.label, g2.dauer, 'info');
  }
  function endeEssen(S, X) {
    var sp = S.spieler, g2 = Saufi.Essen.GERICHTE[sp.essenId];
    var gut = S.fig.pegel >= 1.0;                          // Essen zur rechten Zeit
    var res = Saufi.Pegel.essen(S.fig, g2, minute(S), jointFaktor(S));
    S.stats.gegessen += 1;
    if (gut) { Saufi.Punkte.add(S.punkte, 20, 'Essen zur rechten Zeit'); }
    sag(S, 'Satt! Pegel ' + Saufi.Pegel.anzeige(S.fig.pegel) + ' ‰, Standfestigkeit ' + Math.round(S.fig.stand) + '.' + (res.voll ? ' Puh, voll gefuttert (langsamer).' : ''), 2.4, 'gut');
    X.T.pling(); sp.essenId = null;
  }

  function runde(S, art, X) {
    var rs = S.runden, r = Saufi.Runden.aktive(rs);
    if (!r) return;
    var T = X.T, res;
    function npcsTrinken() { Saufi.NPCs.trinkeRunde(S.npcs, r); }
    function pegelWerte(glaeser) { Saufi.Pegel.trinke(S.fig, r.getraenk, glaeser * jointFaktor(S)); }
    if (art === 'runde_trinken') {
      var rest = r.rest; res = Saufi.Runden.trinke(rs, r, minute(S));
      pegelWerte(rest); npcsTrinken(); S.stats.getrunken += rest;
      Saufi.Punkte.add(S.punkte, res.punkte, 'Mittrunde');
      sag(S, Saufi.Hinweise.PROST[0] + ' +' + res.punkte, 2.2, 'gross'); T.prost(); S.prost = 1.4; funken(S, S.spieler.x, S.spieler.y - 20, '#ffe84f', 14);
      nachRunde(S, res);
    } else if (art === 'runde_frei') {
      res = Saufi.Runden.tausche(rs, r, S.cheats, S.rng, minute(S), probstDa(S));
      if (!res.erlaubt) { sag(S, 'Der Wirt wird misstrauisch: höchstens 3 Tauschgeschäfte pro Runde.', 3, 'schlecht'); return; }
      S.stats.getauscht += 1;
      if (res.erwischt) {
        Saufi.Pegel.trinke(S.fig, r.getraenk, res.nachtrunk);
        npcsTrinken(); Saufi.Punkte.add(S.punkte, res.punkte, 'Alkoholfrei erwischt');
        sag(S, 'ERWISCHT! Probst: "Ich sehe alles." Pflichtrunde nachträglich, Team -2.', 4, 'schlecht'); T.umfall();
        if (Saufi.Runden.verloren(rs)) beende(S, false, 'Teamstimmung 0: alle gehen heim.', X);
      } else if (res.fertig) {
        npcsTrinken(); Saufi.Punkte.add(S.punkte, res.punkte, 'Mittrunde (Alkoholfrei)');
        sag(S, 'PROST! Niemand hat was gemerkt. +' + res.punkte, 2.4, 'gross'); T.prost(); S.prost = 1.4;
        nachRunde(S, res);
      } else {
        sag(S, 'Heimlich getauscht! Noch ' + res.rest + ' Glas.', 2, 'gut'); T.pling();
        stammtisch(S, X);                                  // Menue wieder auf
      }
    } else if (art === 'runde_ablehnen') {
      res = Saufi.Runden.ablehnen(rs, r);
      Saufi.Pegel.schaden(S.fig, -res.stand); npcsTrinken(); Saufi.Punkte.add(S.punkte, res.punkte, 'Runde abgelehnt');
      sag(S, 'Abgelehnt! Die Truppe lästert. Team -1, Standfestigkeit -15.', 3, 'schlecht'); T.umfall();
      if (Saufi.Runden.verloren(rs)) beende(S, false, 'Teamstimmung 0: alle gehen heim.', X);
    }
  }
  function nachRunde(S, res) {
    if (res && res.aufgenommen && res.aufgenommen.length) res.aufgenommen.forEach(function (id) { S.aufnahmeWartet.push(id); });
  }

  // ---------------------------------------------------------------- Menues
  function oeffneMenue(S, titel, kopf, eintraege, opt) { S.overlay = { art: 'menue', titel: titel, kopf: kopf || [], eintraege: eintraege, index: 0, opt: opt || {} }; }
  function zurueckEintrag() { return { label: 'Zurück', id: 'zurueck' }; }

  function getraenkeMenue(S, st) {
    var G = Saufi.Getraenke, ids = G.MENUE[st.typ] || [], preis = G.PREIS_PUNKTE[st.typ] || {}, e = [];
    ids.forEach(function (id) { e.push({ label: G.LISTE[id].label, rechts: preis[id] ? '-' + preis[id] + ' ★' : (G.LISTE[id].pegel > 0 ? '+' + G.LISTE[id].pegel.toFixed(2).replace('.', ',') : ''), id: 'getraenk', daten: id, preis: preis[id] || 0 }); });
    (Saufi.Essen.MENUE[st.typ] || []).forEach(function (id) { e.push({ label: Saufi.Essen.GERICHTE[id].label, rechts: 'Essen', id: 'essen', daten: id }); });
    Saufi.Minispiele.eintraegeFuerOrt(S.ort).forEach(function (m) { e.push({ label: m.label, rechts: 'Spiel', id: 'minispiel', daten: m.id }); });
    e.push(zurueckEintrag());
    oeffneMenue(S, st.label, ['Pegel ' + Saufi.Pegel.anzeige(S.fig.pegel) + ' ‰ · MS-Marathon optional'], e);
  }
  function essenMenue(S, st) {
    var E2 = Saufi.Essen, e = [];
    (E2.MENUE[st.typ] || []).forEach(function (id) { var g2 = E2.GERICHTE[id]; e.push({ label: g2.label, rechts: '-' + g2.preis + ' ★', id: 'essen', daten: id }); });
    e.push(zurueckEintrag());
    oeffneMenue(S, st.label, ['Essen senkt den Pegel und stärkt.'], e);
  }
  function stammtisch(S, X) {
    var r = Saufi.Runden.aktive(S.runden);
    if (!r || r.ort !== S.ort) {
      var n = Saufi.Runden.naechste(S.runden);
      sag(S, n ? 'Hier ist gerade keine Runde. Nächste: ' + Saufi.Uhr.zeitText(n.zeit) + ', ' + Saufi.Karte.NAMEN[n.ort] + '.' : 'Alle Runden sind durch. Halt durch!', 3, 'info');
      return;
    }
    var frei = Saufi.Cheats.MAX_PRO_RUNDE - S.cheats.rundeTricks, gl = Saufi.Getraenke.LISTE[r.getraenk].label;
    oeffneMenue(S, 'RUNDE! Alle mittrinken!', ['Noch ' + r.rest + ' Glas: ' + gl],
      [{ label: 'Mittrinken (' + r.rest + ' × ' + gl + ')', id: 'runde_trinken' },
        { label: 'Alkoholfrei tauschen (heimlich)', rechts: frei + ' frei', id: 'runde_frei', aktiv: frei > 0 },
        { label: 'Ablehnen (Team -1, Standf. -15)', id: 'runde_ablehnen' }]);
  }
  function pauseMenue(S, X) {
    var M = X.M;
    oeffneMenue(S, 'Pause', ['Die Uhr steht still.'],
      [{ label: 'Weiter', id: 'weiter' }, { label: 'Scooter-Playlist', id: 'playlist' },
        { label: 'Ton', rechts: S.stummAn ? 'aus' : 'an', id: 'ton' }, { label: 'Ruhiger Modus', rechts: S.ruhig ? 'an' : 'aus', id: 'ruhig' },
        { label: 'Hinweis 18+', id: 'info' }, { label: 'Neustart', id: 'neustart' }]);
  }
  function playlistOverlay(S, X) {
    var z = X.M ? X.M.zustand() : S.musikInfo;
    S.musikInfo = z;
    var vorher = S.overlay && S.overlay.art === 'playlist' ? S.overlay.vorher : (S.overlay || null);
    S.overlay = { art: 'playlist', vorher: vorher, index: 0,
      eintraege: [{ label: 'Scooter-Playlist abspielen', id: 'pl_start' }, { label: 'Player-Fenster ein-/ausklappen', id: 'pl_fenster', aktiv: z.quelle === 'youtube' || z.aktiv === 'youtube' },
        { label: 'Musik: eigener Spiel-Beat', id: 'pl_beat' }, { label: 'Zurück', id: 'zurueck' }] };
  }
  function infoOverlay(S) {
    var vorher = S.overlay && S.overlay.art === 'info' ? S.overlay.vorher : (S.overlay || null);
    S.overlay = { art: 'info', vorher: vorher, index: 0, eintraege: [{ label: 'Zurück', id: 'zurueck' }] };
  }
  function schliesse(S) { var v = S.overlay && S.overlay.vorher; S.overlay = v || null; }

  function waehle(S, e, X) {
    X = stub(X);
    var T = X.T;
    switch (e.id) {
      case 'zurueck': schliesse(S); break;
      case 'weiter': S.overlay = null; break;
      case 'getraenk':
        if (e.preis && S.punkte.punkte < e.preis) { sag(S, 'Zu wenig Punkte für ' + Saufi.Getraenke.LISTE[e.daten].label + '.', 2, 'schlecht'); break; }
        if (e.preis) Saufi.Punkte.add(S.punkte, -e.preis, 'Wasser');
        trinke(S, e.daten, X); S.overlay = null;
        sag(S, e.daten === 'alkoholfrei' ? 'Alkoholfrei. Sieht aus wie Bier. Pegel unverändert.' : Saufi.Getraenke.LISTE[e.daten].label + ': Pegel ' + Saufi.Pegel.anzeige(S.fig.pegel) + ' ‰', 2, 'info');
        break;
      case 'essen':
        S.overlay = null; startEssen(S, e.daten); break;
      case 'spender_trinken': S.overlay = null; trinke(S, 'wasser', X); sag(S, 'Wasser. Gut so!', 1.8, 'gut'); break;
      case 'spender_fuellen': S.overlay = null; S.flaschen = Math.min(3, S.flaschen + 1); sag(S, 'Flasche aufgefüllt (' + S.flaschen + '/3).', 2, 'gut'); T.pling(); break;
      case 'runde_trinken': case 'runde_frei': case 'runde_ablehnen': S.overlay = null; runde(S, e.id, X); break;
      case 'playlist': playlistOverlay(S, X); break;
      case 'pl_start':
        if (X.M) { X.M.starte('playlist'); S.musikInfo = X.M.zustand(); }
        S.overlay = null; // Songwahl schließt die Jukebox/Playlist (Regression: Bewegung wieder frei)
        break;
      case 'pl_fenster': if (X.M) { X.M.klappe(); S.musikInfo = X.M.zustand(); } break;
      case 'pl_beat': if (X.M) { X.M.stopp(); X.M.waehleYoutube(false); S.musikInfo = X.M.zustand(); } S.overlay = null; break;
      case 'ton': toggleTon(S, X); pauseMenue(S, X); S.overlay.index = 2; break;
      case 'ruhig': S.ruhig = !S.ruhig; if (S.speicher) S.speicher.setzeBool('ruhig', S.ruhig); pauseMenue(S, X); S.overlay.index = 3; break;
      case 'info': infoOverlay(S); break;
      case 'neustart': S.neustart = true; break;
      case 'minispiel': starteMinispiel(S, e.daten, X); break;
      case 'mg_aktion': if (S.overlay && S.overlay.art === 'minispiel') Saufi.Minispiele.update(S.overlay, 0, true); break;
      case 'panne_ok': loeseAktivePanne(S, 'aktion', X); break;
    }
  }

  function starteMinispiel(S, id, X) {
    var mg = Saufi.Minispiele.starte(id, S.rng);
    if (!mg) return;
    S.overlay = mg;
  }
  function beendeMinispiel(S, X) {
    var mg = S.overlay;
    if (!mg || mg.art !== 'minispiel') { schliesse(S); return; }
    var bel = Saufi.Minispiele.belohnung(mg);
    Saufi.Punkte.add(S.punkte, bel.punkte || 0, 'Minispiel');
    if (bel.pegel) S.fig.pegel = Math.max(0, Math.min(4, S.fig.pegel + bel.pegel));
    if (bel.stand) S.fig.stand = Math.max(0, Math.min(100, S.fig.stand + bel.stand));
    if (bel.team) Saufi.Runden.teamAendern(S.runden, bel.team);
    sag(S, bel.text || 'Minispiel Ende', 3, mg.erfolg ? 'gut' : 'info');
    S.overlay = null;
    if (X && X.T) X.T.pling();
  }
  function loeseAktivePanne(S, via, X) {
    var res = Saufi.Ereignisse.loesePanne(S.pannen, via);
    if (!res) return false;
    var ef = res.effekt || {};
    if (ef.punkte) Saufi.Punkte.add(S.punkte, ef.punkte, 'Panne');
    if (ef.team) Saufi.Runden.teamAendern(S.runden, ef.team);
    if (ef.stand) S.fig.stand = Math.max(0, Math.min(100, S.fig.stand + ef.stand));
    if (ef.pegel) S.fig.pegel = Math.max(0, Math.min(4, S.fig.pegel + ef.pegel));
    sag(S, res.def.text + ' → erledigt!' + (ef.punkte ? ' +' + ef.punkte : ''), 3, 'gut');
    if (X && X.T) X.T.pling();
    if (S.overlay && S.overlay.art === 'panne') S.overlay = null;
    return true;
  }
  function toggleTon(S, X) {
    S.stummAn = !S.stummAn; X.T.setzeStumm(S.stummAn); if (X.M) X.M.setzeStumm(S.stummAn);
    if (S.speicher) S.speicher.setzeBool('stumm', S.stummAn);
  }

  // ---------------------------------------------------------------- Aktionstaste an Stationen
  function aktion(S, X) {
    var sp = S.spieler, T = X.T, st;
    if (sp.isst > 0) return;
    if (sp.sitzt) { sp.sitzt = false; return; }
    st = Saufi.Karte.nahe(S.karte, sp.x, sp.y - 2, 14);
    // Panne nur loesen, wenn keine Station im Weg (sonst brechen Mittrunden/Menues)
    if (!st && S.pannen && S.pannen.aktiv && S.pannen.aktiv.def.loesung === 'aktion' && loeseAktivePanne(S, 'aktion', X)) return;
    if (!st) { sag(S, 'Hier gibt es nichts zu tun.', 1.2, 'info'); return; }
    var m = minute(S), Uhr = Saufi.Uhr;
    switch (st.typ) {
      case 'tuer':
        if (!Uhr.offen(st.ziel, m)) { sag(S, Saufi.Hinweise.STAND_WEG[0] + ' ' + Saufi.Karte.NAMEN[st.ziel] + ' hat zu.', 2.5, 'schlecht'); return; }
        if (st.ziel === 'disko' && S.fig.pegel > 2.5) {
          S.hausverbote += 1; Saufi.Pegel.schaden(S.fig, 5);
          sag(S, 'Türsteher: "Zu breit, Saufi!" Hausverbot ' + S.hausverbote + '/3. Erst Wasser und Essen.', 3.5, 'schlecht'); T.umfall();
          if (S.hausverbote >= 3) beende(S, false, 'Dreimal Hausverbot: zu betrunken an der Tür.', X);
          return;
        }
        uebergang(S, function () { betreten(S, st.ziel, X); }); break;
      case 'ausgang': uebergang(S, function () { verlassen(S, X); }); break;
      case 'buffet':
        if (!Uhr.buffetOffen(m)) { sag(S, 'Das Frühstücksbuffet gibt es nur von 07:00 bis 11:00.', 2.5, 'info'); return; }
        essenMenue(S, st); break;
      case 'kueche':
        if (!Uhr.kuecheOffen(m)) { sag(S, 'Die Küche ist zu (offen bis 22:00).', 2.5, 'info'); return; }
        essenMenue(S, st); break;
      case 'spender':
        oeffneMenue(S, 'Wasserspender', ['Gratis!'], [{ label: 'Wasser trinken', id: 'spender_trinken' }, { label: 'Flasche auffüllen (' + S.flaschen + '/3)', id: 'spender_fuellen' }, zurueckEintrag()]); break;
      case 'tresen_restaurant': case 'tresen_kneipe': case 'bar_disko':
        if (!Uhr.tresenOffen(S.ort, m)) { sag(S, 'Der Tresen ist schon zu.', 2, 'info'); return; }
        getraenkeMenue(S, st); break;
      case 'stammtisch': stammtisch(S, X); break;
      case 'sofa': case 'bank':
        sp.sitzt = true; sp.vx = 0; sp.vy = 0; sag(S, 'Ausruhen: die Standfestigkeit steigt. Bewegen oder E zum Aufstehen.', 2.4, 'info'); break;
      case 'tanz': tanzen(S, X); break;
      case 'jukebox': playlistOverlay(S, X); break;
      case 'joint':
        if (Saufi.Ereignisse.Joint.nimm(S.joint)) sag(S, 'Dicke Tüte eingesteckt (Spiel-Item). R: nächster Effekt doppelt, danach 30 s schwammig.', 4, 'info');
        else sag(S, 'Hier liegt nichts mehr.', 1.5, 'info');
        break;
      case 'flasche':
        if (S.flascheGenommen) sag(S, 'Hier liegt nichts mehr.', 1.5, 'info'); else { S.flascheGenommen = true; S.flaschen = Math.min(3, S.flaschen + 1); sag(S, 'Wasserflasche gefunden (' + S.flaschen + '/3).', 2, 'gut'); T.pling(); }
        break;
    }
  }

  function minispielMenue(S) {
    var e = Saufi.Minispiele.eintraegeFuerOrt(S.ort).map(function (m) { return { label: m.label, id: 'minispiel', daten: m.id }; });
    if (!e.length) { sag(S, 'Hier gerade kein Minispiel. Kneipe/Disko/Gasthaus versuchen.', 2.5, 'info'); return; }
    e.push(zurueckEintrag());
    oeffneMenue(S, 'Trinkspiele', ['Kurz, abbrechbar, MS-Marathon-Light.'], e);
  }
  function tanzen(S, X) {
    var sp = S.spieler;
    if (sp.tanzt > 0.15) return;
    var auf = X.T.aufBeat(S.t);
    sp.tanzt = 0.35;
    if (Saufi.Ereignisse.Boost.aktiv(S.boost)) { if (auf) Saufi.Punkte.add(S.punkte, 5, 'Tanz'); return; }
    Saufi.Ereignisse.Boost.tanz(S.boost, auf);
    if (auf) { Saufi.Punkte.add(S.punkte, 5, 'Tanz im Takt'); funken(S, sp.x, sp.y - 16, '#ff4fa0', 5); }
    if (S.boost.leiste >= 1) sag(S, 'Scooter-Leiste voll! R: HYPER-BOOST!', 3, 'gut');
  }

  function wasserTrinken(S, X) {
    var sp = S.spieler, n = Saufi.NPCs.naechsterLiegender(S.npcs, S.ort, sp.x, sp.y, 28);
    if (n) {
      if (S.flaschen <= 0) { sag(S, 'Keine Flasche zum Wecken. Am Spender auffüllen!', 2.5, 'schlecht'); return; }
      S.flaschen -= 1; Saufi.NPCs.wecke(n); S.stats.geweckt += 1;
      Saufi.Punkte.add(S.punkte, 80, 'Freund geweckt'); Saufi.Runden.teamAendern(S.runden, 1);
      sag(S, n.char.name + ' ist wieder wach! +80, Team +1', 3, 'gut'); X.T.pling(); return;
    }
    if (S.pannen && S.pannen.aktiv && S.pannen.aktiv.def.loesung === 'wasser' && loeseAktivePanne(S, 'wasser', X)) return;
    if (S.flaschen <= 0) { sag(S, 'Keine Flasche mehr. Am Spender oder an der Bar auffüllen.', 2.5, 'schlecht'); return; }
    S.flaschen -= 1; trinke(S, 'wasser', X);
    sag(S, 'Wasser! Pegel ' + Saufi.Pegel.anzeige(S.fig.pegel) + ' ‰, Standfestigkeit ' + Math.round(S.fig.stand), 2, 'gut');
  }
  function itemNutzen(S, X) {
    var B = Saufi.Ereignisse.Boost, J = Saufi.Ereignisse.Joint;
    if (S.ort === 'disko' && B.bereit(S.boost)) {
      var f = jointFaktor(S);
      B.zuende(S.boost, f); Saufi.Punkte.add(S.punkte, 150, 'Scooter-Boost');
      sag(S, Saufi.Hinweise.SHOUTS[0], 3, 'gross'); X.T.boostFx(); X.T.setzeBoost(true); if (X.M) X.M.starte('boost');
      S.boostAktiv = true; musikFuerOrt(S, X);
      return;
    }
    if (J.benutze(S.joint)) { sag(S, 'Dicke Tüte: der nächste Effekt wirkt doppelt!', 3, 'gut'); X.T.pling(); return; }
    if (S.ort === 'disko') sag(S, S.boost.leiste >= 1 ? 'Boost noch im Cooldown.' : 'Scooter-Leiste noch nicht voll: tanz im Takt (E).', 2.5, 'info');
    else sag(S, 'Gerade kein Item einsetzbar.', 1.5, 'info');
  }

  // ---------------------------------------------------------------- Hilfetext, Pfeil
  function hilfeText(S) {
    var sp = S.spieler;
    if (sp.sitzt) return 'Bewegen: aufstehen';
    if (Saufi.NPCs.naechsterLiegender(S.npcs, S.ort, sp.x, sp.y, 28)) return 'Q: Freund wecken';
    var st = Saufi.Karte.nahe(S.karte, sp.x, sp.y - 2, 14);
    if (!st) return '';
    var t = { tuer: 'E: ' + (st.label || 'Tür'), ausgang: 'E: Hinaus', buffet: 'E: Frühstück', kueche: 'E: Essen bestellen', spender: 'E: Wasser', tresen_restaurant: 'E: Bestellen', tresen_kneipe: 'E: Bestellen',
      bar_disko: 'E: Bestellen', stammtisch: Saufi.Runden.aktive(S.runden) && Saufi.Runden.aktive(S.runden).ort === S.ort ? 'E: PROST!' : 'E: Stammtisch', sofa: 'E: Ausruhen', bank: 'E: Ausruhen', tanz: 'E: Tanzen (im Takt!)',
      jukebox: 'E: Musik', joint: 'E: Aufheben', flasche: 'E: Aufheben' }[st.typ];
    return t || '';
  }
  function berechnePfeil(S) {
    var n = Saufi.Runden.naechste(S.runden);
    if (!n || (n.status !== 'warnung' && n.status !== 'aktiv')) return null;
    var tx, ty;
    if (S.ort === n.ort) { var st = stationDe(S.karte, 'stammtisch'); var c = mitteVon(st); tx = c.x; ty = c.y; }
    else if (S.ort === 'stadt') { var b = null; S.welt.stadt.gebaeude.forEach(function (g2) { if (g2.id === n.ort) b = g2; }); tx = b.aussen.x * K + 8; ty = b.aussen.y * K + 8; }
    else { var ex = stationDe(S.karte, 'ausgang'), c2 = mitteVon(ex); tx = c2.x; ty = c2.y; }
    return { x: tx - S.kamera.x, y: ty - S.kamera.y };
  }

  // ---------------------------------------------------------------- Update
  function ereignisRunden(S, ev, X) {
    ev.forEach(function (e) {
      var r = e.runde;
      if (e.typ === 'warnung') sag(S, 'In 1 Stunde: Runde bei ' + Saufi.Karte.NAMEN[r.ort] + ' (' + Saufi.Uhr.zeitText(r.zeit) + ')', 4, 'info');
      else if (e.typ === 'ausruf') {
        Saufi.Cheats.neueRunde(S.cheats);
        sag(S, 'RUNDE! Alle mittrinken!', 3, 'gross'); X.T.glocke();
        sag(S, 'Tobi: "Wer hat Durst?" Ab zum Stammtisch: ' + Saufi.Karte.NAMEN[r.ort], 4, 'info');
      } else if (e.typ === 'verpasst') {
        Saufi.NPCs.trinkeRunde(S.npcs, r);
        Saufi.Pegel.schaden(S.fig, -e.effekt.stand); Saufi.Punkte.add(S.punkte, e.effekt.punkte, 'Runde verpasst');
        sag(S, 'Runde verpasst! Team -1, Standfestigkeit -15.', 4, 'schlecht'); X.T.umfall();
        if (Saufi.Runden.verloren(S.runden)) beende(S, false, 'Teamstimmung 0: alle gehen heim.', X);
      }
    });
  }
  function stundenEreignisse(S, X) {
    var h = Math.floor(minute(S) / 60);
    while (S.letzteStunde < h) {
      S.letzteStunde += 1;
      Saufi.Punkte.add(S.punkte, 20, 'Durchgehalten');
      Saufi.NPCs.stunde(S.npcs, S.rng);
    }
  }

  // Nur das echte Pause-Menue (auch die Playlist, die daraus geoeffnet wurde) haelt die Uhr an
  function istPause(o) {
    if (o.art === 'playlist') o = o.vorher || {};
    return o.art === 'menue' && o.titel === 'Pause';
  }
  // Uhr, Stunden und Runden laufen auch hinter anderen Overlays (Playlist, Info, Bar-/Essensmenue, Stammtisch) weiter
  function uhrLaeuft(S, dt, X) {
    var stunden = Saufi.Uhr.update(S.uhr, dt), m = minute(S);
    S.licht = Saufi.Uhr.licht(S.uhr); S.spielSek += dt;
    if (stunden > 0) { Saufi.Pegel.abbau(S.fig, stunden, m); Saufi.NPCs.abbau(S.npcs, stunden, m); }
    stundenEreignisse(S, X);
    ereignisRunden(S, Saufi.Runden.tick(S.runden, m), X);
    if (S.zustand === 'ende') return;
    if (Saufi.Runden.verloren(S.runden)) beende(S, false, 'Teamstimmung 0: alle gehen heim.', X);
    else if (Saufi.Uhr.vorbei(S.uhr)) beende(S, true, 'Sonntag, 04:00 Uhr: Du stehst noch.', X);
  }

  function updateSpiel(S, dt, X, E) {
    var sp = S.spieler, T = X.T, fig = S.fig;
    // Uhr und Stunden
    var stunden = Saufi.Uhr.update(S.uhr, dt), m = minute(S);
    S.licht = Saufi.Uhr.licht(S.uhr); S.spielSek += dt;
    if (stunden > 0) { Saufi.Pegel.abbau(fig, stunden, m); Saufi.NPCs.abbau(S.npcs, stunden, m); }
    stundenEreignisse(S, X);
    var neue = Saufi.NPCs.ankommen(S.npcs, m, S.karte, sp.x / K | 0, (sp.y - 1) / K | 0);
    neue.forEach(function (n) { sag(S, n.char.name + ' stößt dazu.', 3, 'info'); });
    // Joint / Boost Zeit
    Saufi.Ereignisse.Joint.update(S.joint, dt); Saufi.Ereignisse.Boost.update(S.boost, dt);
    var war = S.boostAktiv; S.boostAktiv = Saufi.Ereignisse.Boost.aktiv(S.boost);
    if (war && !S.boostAktiv) { T.setzeBoost(false); sag(S, 'Boost vorbei. Cooldown 90 s.', 2.5, 'info'); musikFuerOrt(S, X); if (X.M && S.ort === 'disko') X.M.starte('disko'); }
    // Runden
    ereignisRunden(S, Saufi.Runden.tick(S.runden, m), X);
    if (S.zustand === 'ende') return;
    // Aufnahme-Zeremonie in der Disko
    if (S.ort === 'disko' && S.aufnahmeWartet.length) {
      S.aufnahmeWartet.splice(0).forEach(function (id) {
        Saufi.Punkte.add(S.punkte, 200, 'Aufnahme'); sag(S, 'WILLKOMMEN IN DER TRUPPE, ' + Saufi.Charaktere.holen(id).name.toUpperCase() + '!', 4, 'gross'); T.fanfare();
      });
    }
    // Rauswurf bei Ladenschluss
    if (S.ort !== 'stadt' && !Saufi.Uhr.tresenOffen(S.ort, m) && !S.uebergang) {
      sag(S, 'Feierabend! Ihr werdet rausgeworfen.', 3, 'info');
      uebergang(S, function () { verlassen(S, X); });
    }
    // Eingabe und Bewegung
    var achse = E ? E.achse() : { x: 0, y: 0 }, bewegt = Math.hypot(achse.x, achse.y) > 0.1;
    if (sp.isst > 0) { sp.isst -= dt; sp.vx = 0; sp.vy = 0; if (sp.isst <= 0) endeEssen(S, X); }
    else if (sp.sitzt) { if (bewegt) sp.sitzt = false; else Saufi.Pegel.heile(fig, dt * 1.0); }
    else {
      var faktor = Saufi.Ereignisse.Boost.bewegung(S.boost) * Saufi.Pegel.bewegung(fig, m) * Saufi.Ereignisse.Joint.bewegung(S.joint);
      Saufi.Spieler.bewegung(sp, achse, fig.pegel, dt, S.t, faktor, S.karte);
    }
    if (sp.tanzt > 0) sp.tanzt -= dt;
    if (S.prost > 0) S.prost -= dt;
    if (E) {
      if (E.neu('aktion')) aktion(S, X);
      if (E.neu('wasser')) wasserTrinken(S, X);
      if (E.neu('item')) itemNutzen(S, X);
    }
    // Standfestigkeit
    Saufi.Pegel.update(fig, dt, halbiert(S));
    var fall = Saufi.Pegel.pruefe(fig);
    if (fall) {
      sp.liegt = true; sp.sitzt = false; sp.isst = 0; T.umfall();
      Saufi.Punkte.add(S.punkte, -200, 'Umgefallen');
      S.zustand = 'umgefallen';
      S.pressF = { n: 0, noetig: 5, rest: 3, zweitesLeben: fall === 'aufstehbar', t: 0 };
      sag(S, 'F', 2, 'gross');
      return;
    }
    // NPCs
    var tischSlots = null, ra = Saufi.Runden.aktive(S.runden);
    if (ra && ra.ort === S.ort) { var tst = stationDe(S.karte, 'stammtisch'); if (tst) tischSlots = Saufi.Karte.umgebung(S.karte, tst); }
    var nev = Saufi.NPCs.update(S.npcs, { karte: S.karte, spieler: sp, dt: dt, t: S.t, halbiert: halbiert(S), faktor: Saufi.Ereignisse.Boost.bewegung(S.boost), tischSlots: tischSlots, minute: m });
    nev.forEach(function (e) {
      if (e.typ === 'umgefallen') {
        sag(S, e.npc.char.name + ' liegt! ' + (e.verloren ? 'Q mit Wasser: wecken.' : '(zweites Leben: steht gleich wieder auf)'), 4, 'schlecht');
        Saufi.Runden.peinlich(S.runden, e.npc.id, -10);
      } else if (e.typ === 'aufgestanden') sag(S, e.npc.char.name + ' steht wieder auf (zweites Leben)!', 3, 'gut');
    });
    S.sprechT -= dt; if (S.sprechT <= 0) { Saufi.NPCs.sprechen(S.npcs, S.rng, S.ort, S.fig.pegel); S.sprechT = 5 + S.rng.next() * 5; }
    Saufi.Ereignisse.updatePannen(S.pannen, dt);
    if (S.rng.next() < dt * 0.015) {
      var pan = Saufi.Ereignisse.wuerflePanne(S.pannen, S.rng, S.fig.pegel);
      if (pan) sag(S, pan.def.text + (pan.def.loesung === 'aktion' ? ' (E)' : pan.def.loesung === 'wasser' ? ' (Q)' : ''), 5, 'info');
    }
    S.tanzBeat = S.ort === 'disko' && (S.boostAktiv || sp.tanzt > 0);
    // Kamera, Hilfe, Pfeil, Musik
    Saufi.Kamera.update(S.kamera, sp.x, sp.y - 8, dt);
    S.hilfe = S.overlay ? '' : hilfeText(S); S.pfeil = berechnePfeil(S);
    var e0 = minute(S) / 60 < 11 ? 0 : (minute(S) / 60 < 18 ? 1 : 2);
    if (S.ort !== 'disko' && !S.boostAktiv && S._ebene !== e0) { S._ebene = e0; musikFuerOrt(S, X); }
    // Niederlage / Sieg
    if (Saufi.Runden.verloren(S.runden)) beende(S, false, 'Teamstimmung 0: alle gehen heim.', X);
    else if (Saufi.Uhr.vorbei(S.uhr)) beende(S, true, 'Sonntag, 04:00 Uhr: Du stehst noch.', X);
  }

  function updatePressF(S, dt, X, E) {
    var p = S.pressF, sp = S.spieler;
    p.t += dt;
    var druck = E && (E.neu('pressF') || E.neu('aktion')) ? 1 : 0;
    if (E) E.klicks().forEach(function () { druck = 1; });
    if (!p.zweitesLeben) {
      if (druck && p.t > 0.5 || p.t > 6) beende(S, false, 'Umgefallen ohne zweites Leben. Du hast keine Leben mehr.', X);
      return;
    }
    p.rest -= dt;
    if (druck) p.n += 1;
    if (p.n >= p.noetig) {
      if (Saufi.Pegel.aufstehen(S.fig)) { sp.liegt = false; S.zustand = 'spiel'; S.pressF = null; sag(S, 'Du stehst wieder! Das zweite Leben ist verbraucht.', 4, 'gut'); X.T.pling(); }
    } else if (p.rest <= 0) beende(S, false, 'Nicht rechtzeitig aufgestanden.', X);
  }

  function updateOverlay(S, X, E) {
    var o = S.overlay;
    if (!E) return;
    if (o.art === 'minispiel') {
      Saufi.Minispiele.update(o, 0, false);
      if (o.fertig) { beendeMinispiel(S, X); return; }
    }
    var n = o.eintraege.length, aktivIdx = function (d) {
      var i = o.index; for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (o.eintraege[i].aktiv !== false) return i; } return o.index;
    };
    if (E.neu('hoch')) o.index = aktivIdx(-1);
    if (E.neu('runter')) o.index = aktivIdx(1);
    var geklickt = null, daneben = false;
    E.klicks().forEach(function (k) {
      var hit = null;
      S.treffer.forEach(function (t) { if (k.x >= t.x && k.x <= t.x + t.w && k.y >= t.y && k.y <= t.y + t.h) hit = t.i; });
      if (hit !== null) geklickt = hit;
      else {
        var p = S.panel;
        if (p && !(k.x >= p.x && k.x <= p.x + p.w && k.y >= p.y && k.y <= p.y + p.h)) daneben = true;
        else if (!p) daneben = true;
      }
    });
    if (geklickt === 'x' || daneben) { if (o.art === 'minispiel') { S.overlay = null; return; } schliesse(S); return; }
    var wahlNr = E.neu('wahl1') ? 0 : (E.neu('wahl2') ? 1 : (E.neu('wahl3') ? 2 : -1));
    if (wahlNr >= 0 && wahlNr < n && (o.art === 'menue' || o.art === 'minispiel')) geklickt = wahlNr;
    var best = geklickt !== null ? geklickt : (E.neu('aktion') ? o.index : -1);
    if (E.neu('pause')) {
      if (o.art === 'menue' && o.titel === 'Pause') { S.overlay = null; return; }
      if (o.art === 'minispiel') { S.overlay = null; return; }
      schliesse(S); return;
    }
    if (E.neu('playlist')) { if (o.art === 'playlist') schliesse(S); else playlistOverlay(S, X); return; }
    if (typeof best === 'number' && best >= 0 && o.eintraege[best] && o.eintraege[best].aktiv !== false) { o.index = best; waehle(S, o.eintraege[best], X); }
  }

  function updateStart(S, X, E) {
    if (!E) return;
    if (S.overlay) { updateOverlay(S, X, E); return; }
    if (E.neu('hoch') || E.neu('runter')) S.startIndex = 1 - S.startIndex;
    var klick = null;
    E.klicks().forEach(function (k) { S.treffer.forEach(function (t) { if (k.x >= t.x && k.x <= t.x + t.w && k.y >= t.y && k.y <= t.y + t.h) klick = t.i; }); });
    if (E.neu('playlist')) { playlistOverlay(S, X); return; }
    if (klick === 1 || (klick === null && E.neu('aktion') && S.startIndex === 1)) { playlistOverlay(S, X); return; }
    if (klick === 0 || (klick === null && E.neu('aktion') && S.startIndex === 0)) starteSpiel(S, X);
  }
  function starteSpiel(S, X) {
    S.zustand = 'spiel'; S.overlay = null;
    if (X.T.start) X.T.start();
    X.T.setzeMusik(!(X.M && X.M.aktiv !== 'webaudio'));
    musikFuerOrt(S, X);
    sag(S, 'Samstag, 08:00. Heute stehst Du bis 04:00 durch, Saufi.', 4, 'info');
    sag(S, 'E: Aktion · Q: Wasser · R: Item · P: Playlist · Esc: Pause', 5, 'info');
  }

  // Hauptschritt
  function update(S, dt, X) {
    X = stub(X);
    var E = X.E;
    S.t += dt;
    Saufi.Hinweise.update(S.hinweise, dt);
    S.effekte = S.effekte.filter(function (e) { e.rest -= dt; return e.rest > 0; });
    if (E && E.neu('stumm') && S.zustand !== 'start') toggleTon(S, X);
    if (X.M) { var stat = S.overlay && S.overlay.art === 'playlist'; if (stat) S.musikInfo = X.M.zustand(); }
    if (S.zustand === 'start') { updateStart(S, X, E); }
    else if (S.zustand === 'ende') {
      S.ende.t += dt;
      var neu = E && (E.neu('aktion') || E.klicks().length) && S.ende.t > 0.8;
      if (neu) S.neustart = true;
    }
    else if (S.uebergang) {
      var u = S.uebergang; u.t += dt;
      if (!u.gemacht && u.t >= u.dauer / 2) { u.gemacht = true; u.fn(); }
      if (u.t >= u.dauer) S.uebergang = null;
    }
    else if (S.overlay) {
      if (!istPause(S.overlay) && S.zustand === 'spiel') uhrLaeuft(S, dt, X);
      if (S.overlay && S.overlay.art === 'minispiel') Saufi.Minispiele.update(S.overlay, dt, false);
      if (S.overlay && S.overlay.art === 'minispiel' && S.overlay.fertig) beendeMinispiel(S, X);
      if (S.overlay) { updateOverlay(S, X, E); S.hilfe = ''; }
    }
    else if (S.zustand === 'umgefallen') updatePressF(S, dt, X, E);
    else if (S.zustand === 'spiel') {
      if (E && E.neu('pause')) pauseMenue(S, X);
      else if (E && E.neu('playlist')) playlistOverlay(S, X);
      else updateSpiel(S, dt, X, E);
    }
    if (E && S.zustand === 'spiel' && !S.overlay) { /* Eingabe wird vom Aufrufer mit E.ende() geleert */ }
    return S;
  }

  // ---------------------------------------------------------------- Debug / Test-Hilfen
  function schnappschuss(S) {
    var n = Saufi.Runden.naechste(S.runden);
    return {
      version: VERSION, zeit: Saufi.Uhr.text(S.uhr), minute: Math.round(S.uhr.minute * 10) / 10, tag: Saufi.Uhr.tag(S.uhr), tagesphase: Saufi.Uhr.phase(S.uhr),
      ort: S.ort, pegel: Math.round(S.fig.pegel * 100) / 100, standfestigkeit: Math.round(S.fig.stand * 10) / 10, leben: S.fig.leben, phase: S.zustand,
      team: S.runden.team, punkte: S.punkte.punkte, flaschen: S.flaschen, hausverbote: S.hausverbote,
      runde: n ? { zeit: Saufi.Uhr.zeitText(n.zeit), ort: n.ort, status: n.status, rest: n.rest } : null, rundenGeschafft: S.runden.geschafft,
      boost: { leiste: Math.round(S.boost.leiste * 100) / 100, aktiv: S.boostAktiv }, joint: { hat: S.joint.hat, doppelt: S.joint.doppelt },
      overlay: S.overlay ? S.overlay.art + (S.overlay.titel ? ':' + S.overlay.titel : '') : null, hinweis: (Saufi.Hinweise.aktuell(S.hinweise) || {}).text || '',
      figur: S.char.id, seed: S.seed, tempo: S.tempo, pos: { x: Math.round(S.spieler.x), y: Math.round(S.spieler.y) }, ende: S.ende ? { sieg: S.ende.sieg, grund: S.ende.grund, wertung: S.ende.wertung.titel } : null,
      anwaerter: S.runden.anwaerter, npcLiegen: S.npcs.filter(function (x) { return x.liegt; }).map(function (x) { return x.id; })
    };
  }
  // Spieler direkt neben eine Station stellen (nur fuer Tests und den Debug-Haken)
  function geheZuStation(S, ort, stationId, X) {
    X = stub(X);
    if (S.ort !== ort) {
      if (ort === 'stadt') { verlassen(S, X); }
      else { if (S.ort !== 'stadt') verlassen(S, X); betreten(S, ort, X); }
    }
    var st = stationDe(S.karte, stationId);
    if (!st) return false;
    var umg = Saufi.Karte.umgebung(S.karte, st).sort(function (a, b) { return Math.hypot(a.x - S.karte.spawn.x, a.y - S.karte.spawn.y) - Math.hypot(b.x - S.karte.spawn.x, b.y - S.karte.spawn.y); });
    if (!umg.length) return false;
    var best = umg[0], bd = 1e9;
    umg.forEach(function (u) { var d = Saufi.Karte.abstand(u.x * K + 8, u.y * K + 8, st); if (d < bd) { bd = d; best = u; } });
    stelleHin(S, best.x, best.y); S.uebergang = null; S.overlay = null;
    return true;
  }
  function setze(S, o) {
    if (o.pegel !== undefined) S.fig.pegel = Math.max(0, Math.min(4, o.pegel));
    if (o.stand !== undefined) S.fig.stand = Math.max(0, Math.min(100, o.stand));
    if (o.minute !== undefined) S.uhr.minute = Math.max(Saufi.Uhr.START, Math.min(Saufi.Uhr.ENDE, o.minute));
    if (o.team !== undefined) S.runden.team = o.team;
    if (o.punkte !== undefined) S.punkte.punkte = o.punkte;
    if (o.flaschen !== undefined) S.flaschen = o.flaschen;
    if (o.boost !== undefined) S.boost.leiste = o.boost;
    if (o.joint) { S.joint.hat = true; S.joint.gefunden = true; }
    if (o.start && S.zustand === 'start') starteSpiel(S, stub({}));
    S.licht = Saufi.Uhr.licht(S.uhr);
    return schnappschuss(S);
  }

  Saufi.Spiel = {
    VERSION: VERSION, neu: neuesSpiel, update: update, beende: beende, aktion: aktion, waehle: waehle, runde: runde, wasserTrinken: wasserTrinken, itemNutzen: itemNutzen,
    betreten: betreten, verlassen: verlassen, schnappschuss: schnappschuss, geheZuStation: geheZuStation, setze: setze, starteSpiel: starteSpiel, stationDe: stationDe,
    pauseMenue: pauseMenue, playlistOverlay: playlistOverlay, infoOverlay: infoOverlay, stammtisch: stammtisch, tanzen: tanzen, stub: stub,
    schliesse: schliesse, minispielMenue: minispielMenue
  };

  // ---------------------------------------------------------------- DOM-Verdrahtung (nur im Browser)
  function parameter(search) {
    var o = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (p) {
      if (!p) return; var kv = p.split('='), k = decodeURIComponent(kv[0]), v = kv.length > 1 ? decodeURIComponent(kv[1]) : '';
      o[k] = v;
    });
    var out = {};
    if (o.tempo !== undefined && isFinite(parseFloat(o.tempo)) && parseFloat(o.tempo) > 0) out.tempo = Math.min(1000, parseFloat(o.tempo));
    if (o.seed !== undefined && isFinite(parseInt(o.seed, 10))) out.seed = parseInt(o.seed, 10);
    if (o.figur) out.figur = o.figur;
    if (o.start !== undefined) out.start = true;
    return out;
  }

  function starte(win, doc) {
    var canvas = doc.getElementById('spiel'), rahmen = doc.getElementById('rahmen');
    var par = parameter(win.location && win.location.search);
    var speicher = Saufi.Speicher.erstelle(win);
    var R = Saufi.Render.erstelle(canvas, doc);
    var T = Saufi.Ton.erstelle(win);
    var E = Saufi.Eingabe.erstelle(win, canvas, 320, 176);
    var S = null, M = null, X = null;
    function melde(text) { if (S) sag(S, text, 5, 'info'); }
    M = Saufi.Musik.erstelle({ win: win, doc: doc, ton: T, speicher: speicher, melde: melde });
    function neuStarten() {
      var mobilHoch = !!(E.touch || (win.matchMedia && win.matchMedia('(pointer: coarse)').matches)) && win.innerHeight > win.innerWidth;
      Saufi.Render.setzeBildschirm(R, mobilHoch); E.setzeMass(R.W, R.H);
      S = neuesSpiel({ seed: par.seed, tempo: par.tempo, figur: par.figur, viewW: R.W, viewH: R.H, best: speicher.zahl('best', 0), speicher: speicher, ruhig: speicher.bool('ruhig', false) });
      S.stummAn = speicher.bool('stumm', false); T.setzeStumm(S.stummAn); M.setzeStumm(S.stummAn);
    }
    X = { E: E, M: M, T: T };
    neuStarten();
    if (par.start) starteSpiel(S, X);           // ?start: ohne Startbildschirm (fuer Tests)

    // Debug-Haken fuer Headless-Tests
    var dbg = function () { return schnappschuss(S); };
    dbg.setze = function (o) { return setze(S, o); };
    dbg.tippe = function (name) { E.druecke(Saufi.Eingabe.AKTIONEN[name][0]); E.loese(Saufi.Eingabe.AKTIONEN[name][0]); return schnappschuss(S); };
    dbg.geheZu = function (ort, st) { var ok = geheZuStation(S, ort, st, X); return ok; };
    dbg.schritte = function (sek, ds) { ds = ds || 1 / 30; for (var i = 0; i < sek / ds; i++) { update(S, ds, X); E.ende(); } return schnappschuss(S); };
    dbg.zustand = function () { return S; };
    dbg.musik = function () { return M.zustand(); };
    Saufi.debug = dbg;

    // Groesse: stufenlos, hochaufloesend
    function groesse() {
      var hoch = !!(E.touch || (win.matchMedia && win.matchMedia('(pointer: coarse)').matches)) && win.innerHeight > win.innerWidth;
      if (hoch !== R.hochkant) { Saufi.Render.setzeBildschirm(R, hoch); E.setzeMass(R.W, R.H); S.kamera.viewW = R.W; S.kamera.viewH = R.H; }
      // stufenlos skalieren, Backing-Store in Geraete-Pixeln (devicePixelRatio) -> scharf statt pixelig
      var s = Math.max(1, Math.min((win.innerWidth - 16) / R.W, (win.innerHeight - 16) / R.H));
      var cw = Math.round(R.W * s), ch = Math.round(R.H * s);
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
      Saufi.Render.setzeAufloesung(R, cw, ch, win.devicePixelRatio || 1);
      rahmen.style.setProperty('--s', String(s)); rahmen.classList.toggle('touch', !!(E.touch || (win.matchMedia && win.matchMedia('(pointer: coarse)').matches)));
    }
    win.addEventListener('resize', groesse); win.addEventListener('orientationchange', groesse); groesse();

    function geste() { if (!T.gestartet) { T.start(); T.setzeMusik(S.zustand !== 'start' && M.aktiv === 'webaudio'); } }
    win.addEventListener('keydown', geste); canvas.addEventListener('pointerdown', geste);
    canvas.tabIndex = 0;
    canvas.addEventListener('pointerdown', function () { try { canvas.focus(); } catch (err) { /* egal */ } });
    win.addEventListener('blur', function () {
      setTimeout(function () {
        var ae = doc.activeElement, tag = ae && ae.tagName ? String(ae.tagName).toUpperCase() : '';
        if (tag === 'IFRAME' || (ae && ae.id === 'yt-player')) { try { canvas.focus(); } catch (err2) { /* egal */ } }
      }, 0);
    });
    doc.addEventListener('focusin', function (ev) {
      var t = ev && ev.target, tag = t && t.tagName ? String(t.tagName).toUpperCase() : '';
      if (tag === 'IFRAME') { try { canvas.focus(); } catch (err3) { /* egal */ } }
    });
    win.addEventListener('keydown', function (ev) { if (ev.code === 'Backquote') { var d = doc.getElementById('debug'); if (d) d.hidden = !d.hidden; } });
    // Knoepfe
    function knopf(id, fn) { var b = doc.getElementById(id); if (!b) return; b.addEventListener('click', function (ev) { ev.preventDefault(); geste(); fn(b); }); return b; }
    knopf('ton-knopf', function (b) { toggleTon(S, X); b.classList.toggle('aus', S.stummAn); });
    knopf('vollbild-knopf', function () { var el = rahmen; if (doc.fullscreenElement) doc.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); });
    knopf('playlist-knopf', function () { if (S.zustand === 'spiel' || S.zustand === 'start') { if (S.overlay && S.overlay.art === 'playlist') schliesse(S); else playlistOverlay(S, X); } });
    knopf('info-knopf', function () { if (S.zustand === 'spiel' || S.zustand === 'start') infoOverlay(S); });
    knopf('yt-klapp', function (b) { var zu = M.klappe(); b.textContent = zu ? '▶ Scooter' : '– Scooter'; });
    function tippKnopf(id, aktion2) {
      var b = doc.getElementById(id); if (!b) return;
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); E.touch = true; geste(); E.tippe(aktion2); });
    }
    tippKnopf('knopf-aktion', 'aktion'); tippKnopf('knopf-wasser', 'wasser'); tippKnopf('knopf-item', 'item'); tippKnopf('knopf-f', 'pressF');

    // Virtueller Joystick (links unten, erscheint dort, wo der Daumen aufsetzt)
    var zone = doc.getElementById('stick'), basis = doc.getElementById('stick-basis'), dau = doc.getElementById('stick-dau'), stickId = null, o0 = null;
    if (zone) {
      zone.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); E.touch = true; geste(); if (stickId !== null) return;
        stickId = ev.pointerId; var r0 = zone.getBoundingClientRect(); o0 = { x: ev.clientX, y: ev.clientY };
        if (basis) { basis.style.display = 'block'; basis.style.left = (o0.x - r0.left) + 'px'; basis.style.top = (o0.y - r0.top) + 'px'; }
        if (zone.setPointerCapture) { try { zone.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ } }
      });
      zone.addEventListener('pointermove', function (ev) {
        if (ev.pointerId !== stickId) return; ev.preventDefault();
        var dx = ev.clientX - o0.x, dy = ev.clientY - o0.y, rad = 40, l = Math.hypot(dx, dy);
        if (l > rad) { dx = dx / l * rad; dy = dy / l * rad; }
        E.stick.x = Math.abs(dx) < 6 ? 0 : dx / rad; E.stick.y = Math.abs(dy) < 6 ? 0 : dy / rad;
        if (dau) dau.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      var ende = function (ev) { if (ev.pointerId !== stickId) return; stickId = null; E.stick.x = 0; E.stick.y = 0; if (basis) basis.style.display = 'none'; if (dau) dau.style.transform = ''; };
      zone.addEventListener('pointerup', ende); zone.addEventListener('pointercancel', ende);
    }

    // Touch-Knoepfe nur zeigen, wenn passend
    function knoepfeAktualisieren() {
      var item = doc.getElementById('knopf-item'), f = doc.getElementById('knopf-f');
      if (item) item.style.display = (S.joint.hat || (S.ort === 'disko' && S.boost.leiste >= 1)) ? 'block' : 'none';
      if (f) f.style.display = S.zustand === 'umgefallen' ? 'block' : 'none';
      var dbgEl = doc.getElementById('debug'); if (dbgEl && !dbgEl.hidden) dbgEl.textContent = JSON.stringify(schnappschuss(S), null, 1);
    }

    // Tab im Hintergrund: automatisch Pause
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && S.zustand === 'spiel' && !S.overlay) pauseMenue(S, X); });

    var letzte = null;
    function frame(ms) {
      if (letzte === null) letzte = ms;
      var dt = Math.min(0.05, (ms - letzte) / 1000); letzte = ms;
      if (E.touch !== undefined && E.touch) rahmen.classList.add('touch');
      if (rahmen && rahmen.classList) rahmen.classList.toggle('overlay', !!S.overlay);
      S.treffer = R.treffer; S.panel = R.panel || null;
      update(S, dt, X);
      if (S.neustart) { neuStarten(); starteSpiel(S, X); }
      musikInfoSync();
      Saufi.Render.zeichne(R, S);
      S.treffer = R.treffer; S.panel = R.panel || null;
      if (rahmen && rahmen.classList) rahmen.classList.toggle('overlay', !!S.overlay);
      knoepfeAktualisieren();
      E.ende();
      win.requestAnimationFrame(frame);
    }
    function musikInfoSync() { if (S.zustand === 'start' || (S.overlay && S.overlay.art === 'playlist')) S.musikInfo = M.zustand(); }
    win.requestAnimationFrame(frame);
    return { S: function () { return S; }, R: R, E: E, M: M, T: T };
  }

  Saufi.Main = { parameter: parameter, starte: starte };

  if (g.document && g.document.getElementById && g.document.getElementById('spiel') && !g.__SAUFI_OHNE_START) {
    starte(g, g.document);
  }
})(globalThis);
