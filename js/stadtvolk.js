/* v21 Stadtvolk: feste Stadt-Figuren (Wirt, Penner, Rezeptionistin). Laufen nicht mit, nutzen kein S.rng. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16;
  var NAH_PX = 56, REDE_PX = 40, PAUSE = 9, BLASE_SEK = Saufi.Hinweise.BLASE_SEK;

  var LISTE = {
    wirt: {
      name: 'Wirt', haltung: 'steht',
      look: { id: 'wirt', shirt: '#f4efe6', hose: '#3a2a20', haar: '#5a4636', extra: 'tracht' },
      sprueche: [
        "Was darf's sein, Jungs?",
        'Kessel-Pils, frisch gezapft!',
        'Samstagnacht, do läuft dr Hahn heiß.',
        'Angeschrieben wird nur bis Mitternacht.',
        'Wer kotzt, putzt. Hausregel.',
        'Sieben Minuten für a gscheits Pils.',
        "Sophie sagt: letzte Runde isch, wenn i's sag.",
        "Ihr seid d'Press11? Dann glei zwei Kästen.",
        'Trinkt au mal a Wasser, Kerle.',
        'Prost, ihr Halbstarken!'
      ],
      reaktion: { bestellen: ['Kommt sofort!', 'Zapf i dir.', 'Gute Wahl, Saufi.'] }
    },
    penner: {
      name: 'Kalle vom Bänkle', haltung: 'sitzt',
      look: { id: 'penner', shirt: '#7a6a4a', hose: '#4a4a5a', haar: '#8a8a8a', extra: 'muetze' },
      sprueche: [
        'Hasch mal en Euro?',
        'Des isch mei Bänkle.',
        'Finger weg vom Kasten. Na gut, nimm oin.',
        'Stuttgart 21 hab i scho 1994 kommen sehen.',
        'Samstagnacht isch hier Kino.',
        'Pfandflaschen sind mei Rente.',
        'Die Tram fährt eh nimmer.',
        'Früher war hier alles Wiese.',
        'Bring mir a Pils mit, dann erzähl i vom Kessel.',
        'Der Brunnen isch mei Badewanne.'
      ],
      reaktion: { sitzen: ['Rück a bissle, gell.', 'Schön warm, des Bänkle, oder?'] }
    },
    rezeption: {
      name: 'Rezeptionistin', haltung: 'steht',
      look: { id: 'rezeption', shirt: '#2a3a6a', hose: '#2a2a3a', haar: '#c8843a', extra: 'weste' },
      sprueche: [
        'Willkommen im Jaz! Zimmer oder nur Klo?',
        "Frühstück gibt's von sieben bis elf.",
        'Bitte nicht in die Lobby kotzen.',
        'Der Aufzug isch koi Partyraum.',
        'Ihr seid laut. Sehr laut.',
        'Zimmerschlüssel nur gegen Ausweis.',
        'Wasser am Spender, gratis. Bitte nehmen!',
        'Die Dachterrasse schließt nie. Leider.',
        'Kehrwoche isch morgen um sieben.',
        'Schöne Samstagnacht noch, die Herren.'
      ],
      reaktion: { rezeption: ['Kann ich helfen?', 'Zimmer 11 isch noch frei.'] }
    }
  };

  function poolFuer(v, art) {
    var def = LISTE[v.id];
    if (!def) return [''];
    if (art && def.reaktion && def.reaktion[art] && def.reaktion[art].length) return def.reaktion[art];
    return def.sprueche;
  }

  function erstelle(welt, seed) {
    var list = [], start = (seed >>> 0);
    function add(karte) {
      (karte.stadtvolk || []).forEach(function (p) {
        var def = LISTE[p.id];
        if (!def) return;
        list.push({
          id: p.id, name: def.name, karteId: karte.id,
          x: p.x, y: p.y,
          px: p.x * K + 8,
          py: p.y * K + (p.id === 'penner' ? 13 : 15),
          vorne: p.vorne ? { x: p.vorne.x, y: p.vorne.y } : { x: p.x, y: p.y + 1 },
          haltung: def.haltung, look: def.look,
          blase: null, pause: 0,
          n: def.sprueche.length ? (start % def.sprueche.length) : 0,
          bank: p.bank || null
        });
      });
    }
    if (welt && welt.stadt) add(welt.stadt);
    if (welt && welt.innen) Object.keys(welt.innen).forEach(function (id) { add(welt.innen[id]); });
    return list;
  }

  function naechster(list, karteId, wx, wy, r) {
    var best = null, bd = r == null ? REDE_PX : r;
    (list || []).forEach(function (v) {
      if (v.karteId !== karteId) return;
      var d = Math.hypot(v.px - wx, (v.py - 10) - wy);
      if (d <= bd) { bd = d; best = v; }
    });
    return best;
  }

  function inReichweite(list, karteId, x, y) {
    var best = null, bd = REDE_PX;
    (list || []).forEach(function (v) {
      if (v.karteId !== karteId) return;
      var d = Math.hypot(v.px - x, v.py - y);
      if (d <= bd) { bd = d; best = v; }
    });
    return best;
  }

  function sprich(v, art) {
    if (!v) return '';
    var pool = poolFuer(v, art);
    var text = pool[v.n % pool.length];
    v.n += 1;
    v.blase = { text: text, rest: BLASE_SEK };
    v.pause = PAUSE;
    return text;
  }

  function fuerId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function aufBank(list, bankId) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].bank === bankId) return list[i];
    return null;
  }

  function update(list, ctx) {
    ctx = ctx || {};
    var ort = ctx.ort, sp = ctx.spieler, dt = ctx.dt || 0, hat = false, nah = null, bd = NAH_PX;
    (list || []).forEach(function (v) {
      if (v.blase) {
        v.blase.rest -= dt;
        if (v.blase.rest <= 0) v.blase = null;
        else if (v.karteId === ort) hat = true;
      }
      if (v.pause > 0) v.pause = Math.max(0, v.pause - dt);
    });
    if (hat || !sp) return;
    (list || []).forEach(function (v) {
      if (v.karteId !== ort || v.pause > 0 || v.blase) return;
      var d = Math.hypot(v.px - sp.x, v.py - sp.y);
      if (d <= bd) { bd = d; nah = v; }
    });
    if (nah) sprich(nah, null);
  }

  Saufi.Stadtvolk = {
    LISTE: LISTE, NAH_PX: NAH_PX, REDE_PX: REDE_PX, PAUSE: PAUSE,
    erstelle: erstelle, naechster: naechster, inReichweite: inReichweite, sprich: sprich, fuerId: fuerId, aufBank: aufBank, update: update
  };
})(globalThis);
