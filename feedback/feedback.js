/* Feedback-Seite: schickt Text, Idee oder Sprach-Transkript an den Eingang.
   Der Eingang (Worker) legt per repository_dispatch ein Issue an.
   Kein Token, kein Audio, kein direkter GitHub-API-Aufruf in dieser Datei.
   Schlaegt das Absenden fehl, bleibt ein Entwurfslink (issues/new) als Hinweis. */
(function (g) {
  'use strict';

  var REPO = 'https://github.com/topsentopsen/press11-saufi-saufi/issues/new';
  var VORSCHAU = 60;
  var ISSUE_URL_MAX = 8000;
  var LOGIN_URL_MAX = 7500;
  var KURZ = '\n\n[Der Text war zu lang für die Adresszeile und wurde hier gekürzt.]';
  var BESTAETIGUNG = 'Danke. Die Nachricht ist angekommen und wird als Issue angelegt.';
  var FEHLER_LEER = 'Bitte schreib ein kurzes Feedback.';
  var FEHLER_LEER_IDEE = 'Bitte schreib eine kurze Idee.';
  var FEHLER_LEER_SPRACHE = 'Bitte schreib den Text oder nimm eine Sprachnachricht auf.';
  var FEHLER_SENDEN = 'Das Absenden hat nicht geklappt. Du kannst es noch einmal versuchen.';
  var HINWEIS_KEINE_SPRACHE = 'Spracherkennung geht in diesem Browser nicht. Bitte tippe den Text. Chrome und Safari können das oft, Firefox oft nicht.';
  var HINWEIS_SPRACHE_FEHLER = 'Die Erkennung hat nicht geklappt. Bitte noch einmal oder tippe den Text.';
  var HINWEIS_TRANSKRIPT = 'Transkript steht im Textfeld. Es wird nur der Text abgeschickt, keine Aufnahme.';

  function eineZeile(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  function normArt(art) {
    if (art === 'idee' || art === 'sprache') return art;
    return 'feedback';
  }

  function prefixTitel(art) {
    if (art === 'idee') return '[Idee]';
    if (art === 'sprache') return '[Feedback (Sprache)]';
    return '[Feedback]';
  }

  function vorschau(text) {
    var s = eineZeile(text);
    if (s.length <= VORSCHAU) return s;
    return s.slice(0, VORSCHAU - 1).replace(/\s+$/g, '') + '…';
  }

  function titel(text, art) {
    art = normArt(art);
    var v = vorschau(text);
    var p = prefixTitel(art);
    return v ? p + ' ' + v : p;
  }

  function koerper(name, text, art) {
    art = normArt(art);
    name = eineZeile(name);
    text = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (art === 'idee') return 'Art: Idee' + (name ? '\nName: ' + name : '') + '\n\n' + text;
    if (art === 'sprache') return 'Art: Feedback (Sprache)\nQuelle: Sprache' + (name ? '\nName: ' + name : '') + '\n\n' + text;
    if (!name) return text;
    return 'Name: ' + name + '\n\n' + text;
  }

  function fehlerLeer(art) {
    if (art === 'idee') return FEHLER_LEER_IDEE;
    if (art === 'sprache') return FEHLER_LEER_SPRACHE;
    return FEHLER_LEER;
  }

  function bauen(title, body) {
    return REPO + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  function loginUrl(issueUrl) {
    return 'https://github.com/login?return_to=' + encodeURIComponent(issueUrl);
  }

  function passt(url) {
    return url.length < ISSUE_URL_MAX && loginUrl(url).length < LOGIN_URL_MAX;
  }

  function suchen(title, name, text, art) {
    var lo = 0, hi = text.length, best = '';
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var stueck = text.slice(0, mid).replace(/\s+$/g, '');
      var url = bauen(title, koerper(name, stueck, art) + KURZ);
      if (passt(url)) { best = url; lo = mid + 1; }
      else hi = mid - 1;
    }
    return best;
  }

  function issueUrl(name, text, art) {
    art = normArt(art);
    var roh = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    var title = titel(roh, art);
    var voll = bauen(title, koerper(name, roh, art));
    if (passt(voll)) return voll;
    var mitName = suchen(title, name, roh, art);
    if (mitName) return mitName;
    var ohneName = suchen(title, '', roh, art);
    if (ohneName) return ohneName;
    var fallback = art === 'idee' ? 'Art: Idee' : (art === 'sprache' ? 'Art: Feedback (Sprache)\nQuelle: Sprache' : 'Feedback');
    return bauen(prefixTitel(art), fallback);
  }

  function spracheMoeglich(fenster) {
    var w = fenster || (typeof window !== 'undefined' ? window : null);
    if (!w) return false;
    return typeof w.SpeechRecognition === 'function' || typeof w.webkitSpeechRecognition === 'function';
  }

  function erkennerKlasse(opt) {
    if (opt && typeof opt.Recognition === 'function') return opt.Recognition;
    var w = (opt && opt.fenster) || (typeof window !== 'undefined' ? window : null);
    if (!w) return null;
    if (typeof w.SpeechRecognition === 'function') return w.SpeechRecognition;
    if (typeof w.webkitSpeechRecognition === 'function') return w.webkitSpeechRecognition;
    return null;
  }

  function transkript(ev) {
    if (!ev || !ev.results) return '';
    var teile = [], i, r, stueck;
    for (i = 0; i < ev.results.length; i++) {
      r = ev.results[i];
      stueck = r && r[0] && r[0].transcript ? String(r[0].transcript) : '';
      if (stueck) teile.push(stueck);
    }
    return teile.join(' ').replace(/\s+/g, ' ').trim();
  }

  function artVon(form) {
    var el = null;
    try { el = form.querySelector('[name="art"]:checked'); } catch (e) { el = null; }
    if (el && (el.value === 'idee' || el.value === 'sprache' || el.value === 'feedback')) return el.value;
    return 'feedback';
  }

  function waehleArt(form, art) {
    var el = null;
    try { el = form.querySelector('[name="art"][value="' + art + '"]'); } catch (e) { el = null; }
    if (el) el.checked = true;
  }

  function ladeZiel(netz) {
    if (netz && typeof netz.eingang === 'string') return Promise.resolve(netz.eingang);
    var hole = (netz && netz.hole) || (typeof fetch === 'function' ? function (url, opt) { return fetch(url, opt); } : null);
    if (!hole) return Promise.resolve('');
    return Promise.resolve(hole('ziel.json', { headers: { 'Accept': 'application/json' } })).then(function (res) {
      if (!res || !res.ok || typeof res.json !== 'function') return '';
      return res.json().then(function (data) {
        return data && typeof data.url === 'string' ? data.url.trim() : '';
      }, function () { return ''; });
    }, function () { return ''; });
  }

  function sende(name, text, art, netz) {
    netz = netz || {};
    art = normArt(art);
    var textTrim = String(text == null ? '' : text).trim();
    if (!textTrim) return Promise.resolve({ ok: false, fehler: fehlerLeer(art) });
    if (eineZeile(netz.website)) return Promise.resolve({ ok: true, still: true, bestaetigung: BESTAETIGUNG });
    var entwurf = issueUrl(name, textTrim, art);
    return ladeZiel(netz).then(function (url) {
      if (!url) return { ok: false, fehler: FEHLER_SENDEN, url: entwurf };
      var hole = netz.hole || (typeof fetch === 'function' ? function (url, opt) { return fetch(url, opt); } : null);
      if (!hole) return { ok: false, fehler: FEHLER_SENDEN, url: entwurf };
      return Promise.resolve(hole(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ art: art, name: eineZeile(name), text: textTrim, website: netz.website || '' })
      })).then(function (res) {
        if (!res || typeof res.json !== 'function') return { ok: false, fehler: FEHLER_SENDEN, url: entwurf };
        return res.json().then(function (data) {
          if (res.ok && data && data.ok) return { ok: true, bestaetigung: BESTAETIGUNG };
          return { ok: false, fehler: (data && data.fehler) || FEHLER_SENDEN, url: entwurf };
        }, function () {
          return { ok: false, fehler: FEHLER_SENDEN, url: entwurf };
        });
      }, function () {
        return { ok: false, fehler: FEHLER_SENDEN, url: entwurf };
      });
    });
  }

  function zeige(form, erg) {
    var box = form.querySelector('#bestaetigung');
    var meldung = form.querySelector('[data-meldung]');
    var linkZeile = form.querySelector('[data-linkzeile]');
    var link = form.querySelector('[data-issue-link]');
    if (box) box.hidden = false;
    if (!erg || !erg.ok) {
      if (meldung) meldung.textContent = (erg && erg.fehler) || FEHLER_SENDEN;
      if (link && erg && erg.url) {
        link.href = erg.url;
        link.textContent = 'Entwurf bei GitHub öffnen (Konto nötig)';
      }
      if (linkZeile) linkZeile.hidden = !(erg && erg.url);
      return;
    }
    if (meldung) meldung.textContent = erg.bestaetigung || BESTAETIGUNG;
    if (linkZeile) linkZeile.hidden = true;
    if (box && typeof box.focus === 'function') box.focus();
  }

  function bind(form, opt) {
    opt = opt || {};
    var nameEl = form.querySelector('[name="name"]');
    var textEl = form.querySelector('[name="text"]');
    var honig = form.querySelector('[name="website"]');
    var mikro = form.querySelector('[data-mikro]');
    var hinweis = form.querySelector('[data-sprache-hinweis]');
    var laufend = null;
    function hinweisText(s) {
      if (!hinweis) return;
      hinweis.hidden = !s;
      hinweis.textContent = s || '';
    }
    if (mikro) {
      mikro.addEventListener('click', function (ev) {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (laufend) {
          try { laufend.stop(); } catch (e0) {}
          laufend = null;
          mikro.textContent = 'Sprachnachricht aufnehmen';
          return;
        }
        var Rec = erkennerKlasse(opt);
        if (!Rec) { hinweisText(HINWEIS_KEINE_SPRACHE); return; }
        var rec;
        try { rec = new Rec(); }
        catch (e1) { hinweisText(HINWEIS_KEINE_SPRACHE); return; }
        rec.lang = 'de-DE';
        rec.continuous = false;
        rec.interimResults = true;
        rec.onresult = function (evnt) {
          var text = transkript(evnt);
          if (text && textEl) textEl.value = text;
          if (text) { waehleArt(form, 'sprache'); hinweisText(HINWEIS_TRANSKRIPT); }
        };
        rec.onerror = function (evnt) {
          if (evnt && evnt.error === 'aborted') return;
          hinweisText(HINWEIS_SPRACHE_FEHLER);
        };
        rec.onend = function () {
          laufend = null;
          mikro.textContent = 'Sprachnachricht aufnehmen';
        };
        try {
          rec.start();
          laufend = rec;
          mikro.textContent = 'Aufnahme beenden';
          hinweisText('Ich höre zu. Es wird nichts gespeichert, nur der Text.');
        } catch (e2) {
          hinweisText(HINWEIS_KEINE_SPRACHE);
        }
      });
    }
    form.addEventListener('submit', function (ev) {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      var name = nameEl ? nameEl.value : '';
      var text = textEl ? textEl.value : '';
      var art = artVon(form);
      var netz = {
        eingang: opt.eingang,
        hole: opt.hole,
        website: honig ? honig.value : ''
      };
      var job = sende(name, text, art, netz).then(function (erg) { zeige(form, erg); return erg; });
      if (typeof opt.merke === 'function') opt.merke(job);
    });
  }

  g.Press11Feedback = {
    titel: titel,
    koerper: koerper,
    issueUrl: issueUrl,
    sende: sende,
    oeffne: sende,
    bind: bind,
    spracheMoeglich: spracheMoeglich,
    transkript: transkript,
    HINWEIS_KEINE_SPRACHE: HINWEIS_KEINE_SPRACHE
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
