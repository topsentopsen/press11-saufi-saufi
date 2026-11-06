/* v21 Stadtvolk: feste Stadt-Figuren (Wirt, Penner, Rezeptionistin).
   v26 leben: Umgebung (Frau Hilde, Jugendliche, Kinder, Hunde, Voegel, Fahrraeder).
   v28: Autos weg (zu klein). Dafuer etwas dichter: Ute, Suedrad, Bachvogel, flotter unterwegs.
   Laeuft nicht mit der Truppe, blockiert keine Kachel, zieht kein S.rng. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16;
  var NAH_PX = 56, REDE_PX = 40, PAUSE = 9;
  // Südpark: Jule, Samir, Nico. Kein Konsum, nur der Fleck, an dem sie stehen.
  var PARK_SPRUECHE = [
    'Jule: Des isch unser Fleck.',
    'Samir: Der Südpark hält die Runde aus.',
    'Nico: Setz dich, der Kasten bleibt aber zu.'
  ];

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
    },
    apotheker: {
      name: 'Apotheker', haltung: 'steht',
      look: { id: 'apotheker', shirt: '#f7f4ee', hose: '#2f6a4a', haar: '#5a4636', extra: 'brille' },
      sprueche: [
        'Apotheke am Kessel. Rezept oder Pflaster?',
        'Auf Rezept, sagt der Zettel. Mehr steht da nicht.',
        'Die Tüte ist nur ein Spielitem. Wasser gibt es im Jaz.',
        'Bitte nicht in der Schlange kotzen.',
        'Nach acht hat die Apotheke zu.',
        'Ein Rezept, eine Tüte. Kein zweites Mal.',
        'Grünes Kreuz, kurze Antworten.',
        'Hustenbonbons links. Die Tüte nur mit Zettel.'
      ],
      reaktion: { rezept: ['Rezept ist da. Eine Tüte, und gut.', 'Auf Rezept. Bitte nicht im Laden anzünden.'] }
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
    v.blase = { text: text, rest: Saufi.Hinweise.blaseDauer(text) };
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

  // Umgebung. Positionen haengen nur an der Zeit, nicht an S.rng und nicht an belegten Kacheln.
  function randKacheln() { return (Saufi.Karte && Saufi.Karte.RAND) || 0; }
  function kachelnZuWeg(tiles) {
    var o = randKacheln();
    return tiles.map(function (t) { return { x: (t[0] + o) * K + 8, y: (t[1] + o) * K + 14 }; });
  }
  function strecke(tiles, opt) {
    opt = opt || {};
    var weg = kachelnZuWeg(tiles);
    var i = opt.start || 0;
    if (i < 0) i = 0;
    if (i >= weg.length) i = weg.length - 1;
    return {
      id: opt.id, art: opt.art || 'person', name: opt.name || '', karteId: 'stadt', spricht: false,
      px: weg[i].x, py: weg[i].y, dir: opt.dir || 'unten', laeuft: false, phase: opt.phase || 0,
      haltung: opt.haltung || 'steht', look: opt.look || null, scale: opt.scale || 1,
      modus: opt.modus || 'ping', weg: weg,
      kacheln: tiles.map(function (t) { var o = randKacheln(); return [t[0] + o, t[1] + o]; }),
      i: i, richtung: opt.richtung || 1, speed: opt.speed || 16, warte: 0,
      pauseAmEnde: opt.pauseAmEnde || 0, farbe: opt.farbe || null, fell: opt.fell || null
    };
  }
  function vogel(opt) {
    var w = opt.winkel || 0, o = randKacheln() * K, cx = opt.cx + o, cy = opt.cy + o;
    return {
      id: opt.id, art: 'vogel', name: '', karteId: 'stadt', spricht: false, modus: 'ellipse',
      cx: cx, cy: cy, rx: opt.rx, ry: opt.ry, winkel: w, dreh: opt.dreh,
      px: cx + Math.cos(w) * opt.rx, py: cy + Math.sin(w) * opt.ry,
      dir: 'rechts', laeuft: true, phase: 0, farbe: opt.farbe || '#2a2342', kacheln: [], scale: 1
    };
  }
  function leben(welt, seed) {
    void welt;
    var n = (seed || 1) % 5;
    var hildeLook = { id: 'hilde', shirt: '#6a3a62', hose: '#3a2a38', haar: '#e4e4ea', extra: 'dutt' };
    var list = [
      strecke([[29, 13], [34, 13], [38, 13], [36, 16], [32, 16], [29, 16]], {
        id: 'hilde', name: 'Frau Hilde', look: hildeLook, speed: 15, pauseAmEnde: 1.6, dir: 'rechts'
      }),
      strecke([[4, 6], [14, 6], [24, 6], [34, 6]], {
        id: 'spazier_ute', name: 'Ute', speed: 16, pauseAmEnde: 1.2, dir: 'rechts',
        look: { id: 'spazier_ute', shirt: '#e8d56a', hose: '#3a4a6a', haar: '#c4c4cc', extra: 'kurz' }
      }),
      strecke([[7, 34]], {
        id: 'jugend_jule', name: 'Jule', modus: 'steh', dir: 'rechts',
        look: { id: 'jugend_jule', shirt: '#3a6ad8', hose: '#2a2a32', haar: '#3a2418' }
      }),
      strecke([[10, 33]], {
        id: 'jugend_samir', name: 'Samir', modus: 'steh', dir: 'links',
        look: { id: 'jugend_samir', shirt: '#e0504a', hose: '#3a3a4a', haar: '#e8c070' }
      }),
      strecke([[11, 34]], {
        id: 'jugend_nico', name: 'Nico', modus: 'steh', dir: 'unten', haltung: 'sitzt',
        look: { id: 'jugend_nico', shirt: '#2a2a32', hose: '#3f6b4a', haar: '#4a3020', extra: 'cap' }
      }),
      strecke([[0, 31], [1, 31], [1, 32], [1, 33], [0, 33], [0, 32]], {
        id: 'kind_mina', name: 'Mina', modus: 'loop', speed: 26, scale: 0.68, dir: 'rechts',
        look: { id: 'kind_mina', shirt: '#ff8f2e', hose: '#4a6ad8', haar: '#c87830' }
      }),
      strecke([[0, 31], [1, 31], [1, 32], [1, 33], [0, 33], [0, 32]], {
        id: 'kind_levin', name: 'Levin', modus: 'loop', speed: 32, scale: 0.66, start: 3, dir: 'links',
        look: { id: 'kind_levin', shirt: '#4fe6ff', hose: '#3a3a4a', haar: '#5a3a28' }
      }),
      strecke([[1, 34]], {
        id: 'hund_park', art: 'hund', name: 'Hund', modus: 'steh', fell: '#8a5a32', dir: 'rechts'
      }),
      strecke([[1, 20], [4, 20], [8, 20]], {
        id: 'hund_weg', art: 'hund', name: 'Hund', speed: 22, fell: '#2a2a32', dir: 'rechts'
      }),
      vogel({ id: 'vogel_markt', cx: 248, cy: 176, rx: 58, ry: 26, winkel: 0.4 + n * 0.2, dreh: 0.7, farbe: '#2a2342' }),
      vogel({ id: 'vogel_park', cx: 120, cy: 560, rx: 46, ry: 20, winkel: 1.2, dreh: 0.95, farbe: '#4a3560' }),
      vogel({ id: 'vogel_hoch', cx: 320, cy: 288, rx: 130, ry: 34, winkel: 2.1, dreh: 0.48, farbe: '#1b1530' }),
      vogel({ id: 'vogel_ost', cx: 480, cy: 128, rx: 34, ry: 16, winkel: 0.2, dreh: 1.1, farbe: '#3a2a4e' }),
      vogel({ id: 'vogel_bach', cx: 200, cy: 360, rx: 72, ry: 18, winkel: 0.6 + n * 0.15, dreh: 0.85, farbe: '#241838' }),
      strecke([[3, 16]], { id: 'rad_markt', art: 'rad', modus: 'park', farbe: '#c9c3d6', dir: 'rechts' }),
      strecke([[34, 13]], { id: 'rad_hotel', art: 'rad', modus: 'park', farbe: '#e0504a', dir: 'links' }),
      strecke([[2, 45], [6, 45], [10, 45], [14, 45]], {
        id: 'rad_fahrt', art: 'rad', speed: 34, farbe: '#3a6ad8', dir: 'rechts'
      }),
      strecke([[12, 52], [16, 52], [20, 52], [24, 52]], {
        id: 'rad_sued', art: 'rad', speed: 32, farbe: '#2f6a3f', dir: 'rechts'
      }),
      // v35: mehr Leben, nur zu Fuß. Wege liegen auf freiem Gras, Gehweg oder Weg. Kein Auto.
      strecke([[4, 31], [5, 31], [6, 31], [5, 31]], {
        id: 'kind_mira', name: 'Mira', modus: 'loop', speed: 22, scale: 0.67, dir: 'rechts',
        look: { id: 'kind_mira', shirt: '#e85a8a', hose: '#f2d36b', haar: '#3a2418' }
      }),
      strecke([[0, 34], [1, 34], [2, 34], [2, 35]], {
        id: 'kind_noa', name: 'Noa', modus: 'loop', speed: 29, scale: 0.64, start: 2, dir: 'links',
        look: { id: 'kind_noa', shirt: '#7d5cff', hose: '#2a2a32', haar: '#e8c070' }
      }),
      strecke([[4, 6], [14, 6], [24, 6], [34, 6]], {
        id: 'jogger_lina', name: 'Lina', speed: 38, pauseAmEnde: 0.4, dir: 'rechts',
        look: { id: 'jogger_lina', shirt: '#ff4fa0', hose: '#1a1a22', haar: '#c4c4cc', extra: 'kurz' }
      }),
      strecke([[25, 32], [25, 38], [25, 44], [25, 52]], {
        id: 'jogger_cem', name: 'Cem', speed: 42, pauseAmEnde: 0.3, dir: 'unten',
        look: { id: 'jogger_cem', shirt: '#3ad07a', hose: '#2a2a32', haar: '#3a2418' }
      }),
      strecke([[24, 21], [30, 21], [36, 21]], {
        id: 'paar_anna', name: 'Anna', speed: 17, pauseAmEnde: 0.8, dir: 'rechts',
        look: { id: 'paar_anna', shirt: '#f2d36b', hose: '#6a3a62', haar: '#e4e4ea', extra: 'kurz' }
      }),
      strecke([[24, 21], [30, 21], [36, 21]], {
        id: 'paar_jonas', name: 'Jonas', speed: 17, pauseAmEnde: 0.8, start: 1, dir: 'rechts',
        look: { id: 'paar_jonas', shirt: '#4a7ad8', hose: '#3a3a4a', haar: '#5a3a28' }
      }),
      strecke([[14, 38], [18, 38], [22, 38]], {
        id: 'opa_ernst', name: 'Ernst', speed: 9, pauseAmEnde: 2.2, dir: 'rechts',
        look: { id: 'opa_ernst', shirt: '#8a8a8a', hose: '#4a3a2a', haar: '#d8d8de', extra: 'kurz' }
      }),
      strecke([[20, 13], [26, 13], [32, 13], [36, 13]], {
        id: 'bote_leila', name: 'Leila', speed: 28, pauseAmEnde: 0.6, dir: 'rechts',
        look: { id: 'bote_leila', shirt: '#e07030', hose: '#2a3a6a', haar: '#3a2418', extra: 'cap' }
      })
    ];
    return list;
  }
  function parkSpruch(list, n) {
    var gruppe = (list || []).filter(function (a) { return a && a.id && a.id.indexOf('jugend_') === 0; });
    if (!gruppe.length) return '';
    var i = (n | 0) % gruppe.length;
    var text = PARK_SPRUECHE[i % PARK_SPRUECHE.length];
    gruppe[i].blase = { text: text, rest: Saufi.Hinweise.blaseDauer(text) };
    return text;
  }
  function bewege(list, dt) {
    if (!dt || dt < 0) return;
    (list || []).forEach(function (a) {
      if (a && a.blase) { a.blase.rest -= dt; if (a.blase.rest <= 0) a.blase = null; }
      if (!a || a.modus === 'steh' || a.modus === 'park') { a.laeuft = false; return; }
      if (a.modus === 'ellipse') {
        a.winkel += a.dreh * dt;
        var nx = a.cx + Math.cos(a.winkel) * a.rx;
        var ny = a.cy + Math.sin(a.winkel) * a.ry;
        a.dir = nx >= a.px ? 'rechts' : 'links';
        a.px = nx; a.py = ny;
        a.phase += dt * 10;
        a.laeuft = true;
        return;
      }
      if (a.warte > 0) { a.warte -= dt; a.laeuft = false; return; }
      if (!a.weg || !a.weg.length) return;
      var ziel = a.weg[a.i];
      if (!ziel) return;
      var dx = ziel.x - a.px, dy = ziel.y - a.py, dist = Math.hypot(dx, dy);
      if (dist < 1.2) {
        a.px = ziel.x; a.py = ziel.y;
        if (a.modus === 'loop') a.i = (a.i + 1) % a.weg.length;
        else {
          var ni = a.i + a.richtung;
          if (ni < 0 || ni >= a.weg.length) {
            a.richtung *= -1;
            ni = a.i + a.richtung;
            a.warte = a.pauseAmEnde || 0;
          }
          if (ni >= 0 && ni < a.weg.length) a.i = ni;
        }
        a.laeuft = false;
        return;
      }
      var step = Math.min((a.speed || 16) * dt, dist);
      a.px += dx / dist * step;
      a.py += dy / dist * step;
      a.laeuft = true;
      a.phase = (a.phase || 0) + dt * 8;
      a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'rechts' : 'links') : (dy > 0 ? 'unten' : 'oben');
    });
  }

  Saufi.Stadtvolk = {
    LISTE: LISTE, NAH_PX: NAH_PX, REDE_PX: REDE_PX, PAUSE: PAUSE,
    erstelle: erstelle, naechster: naechster, inReichweite: inReichweite, sprich: sprich, fuerId: fuerId, aufBank: aufBank, update: update,
    leben: leben, bewege: bewege, PARK_SPRUECHE: PARK_SPRUECHE, parkSpruch: parkSpruch
  };
})(globalThis);
