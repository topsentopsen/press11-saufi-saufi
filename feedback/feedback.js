/* Feedback-Seite: baut nur eine GitHub-„New Issue“-Adresse. Kein Token, kein API-Aufruf.
   Die Seite bleibt offen und zeigt die Bestaetigung. Ein Klick auf GitHub erstellt das Issue. */
(function (g) {
  'use strict';

  var REPO = 'https://github.com/topsentopsen/press11-saufi-saufi/issues/new';
  var VORSCHAU = 60;
  /* gh begrenzt Vorschau-URLs auf 8192 Byte. Nicht angemeldete Leute laufen über
     /login?return_to=, und dort wird die Adresse noch einmal kodiert. Deshalb
     beide Längen einhalten, sonst kommt 414 oder ein leerer Entwurf. */
  var ISSUE_URL_MAX = 8000;
  var LOGIN_URL_MAX = 7500;
  var KURZ = '\n\n[Der Text war zu lang für die Adresszeile und wurde hier gekürzt.]';
  var BESTAETIGUNG = 'Danke. Der Issue-Entwurf ist bereit. Ein Klick auf „Submit new issue“ bei GitHub erstellt ihn.';
  var FEHLER_LEER = 'Bitte schreib ein kurzes Feedback.';

  function eineZeile(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  function vorschau(text) {
    var s = eineZeile(text);
    if (s.length <= VORSCHAU) return s;
    return s.slice(0, VORSCHAU - 1).replace(/\s+$/g, '') + '…';
  }

  function titel(text) {
    var v = vorschau(text);
    return v ? '[Feedback] ' + v : '[Feedback]';
  }

  function koerper(name, text) {
    name = eineZeile(name);
    text = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!name) return text;
    return 'Name: ' + name + '\n\n' + text;
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

  function suchen(title, name, text) {
    var lo = 0, hi = text.length, best = '';
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var stueck = text.slice(0, mid).replace(/\s+$/g, '');
      var url = bauen(title, koerper(name, stueck) + KURZ);
      if (passt(url)) { best = url; lo = mid + 1; }
      else hi = mid - 1;
    }
    return best;
  }

  function issueUrl(name, text) {
    var roh = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    var title = titel(roh);
    var voll = bauen(title, koerper(name, roh));
    if (passt(voll)) return voll;
    var mitName = suchen(title, name, roh);
    if (mitName) return mitName;
    var ohneName = suchen(title, '', roh);
    if (ohneName) return ohneName;
    return bauen('[Feedback]', 'Feedback');
  }

  function fensterOeffnen(url) {
    var w = typeof window !== 'undefined' ? window : null;
    if (!w || typeof w.open !== 'function') return false;
    var neu;
    try { neu = w.open(url, '_blank'); }
    catch (e) { return false; }
    if (!neu) return false;
    try { neu.opener = null; } catch (e2) {}
    return true;
  }

  function oeffne(name, text, oeffner) {
    var textTrim = String(text == null ? '' : text).trim();
    if (!textTrim) return { ok: false, fehler: FEHLER_LEER };
    var url = issueUrl(name, textTrim);
    var body = '';
    var teile = url.split('&body=');
    if (teile.length > 1) {
      try { body = decodeURIComponent(teile[teile.length - 1]); }
      catch (e) { body = ''; }
    }
    var gekuerzt = body.indexOf('wurde hier gekürzt') >= 0;
    var geoeffnet = false;
    var fn = typeof oeffner === 'function' ? oeffner : fensterOeffnen;
    try { geoeffnet = fn(url) !== false; }
    catch (e2) { geoeffnet = false; }
    var bestaetigung = BESTAETIGUNG;
    if (gekuerzt) bestaetigung += ' Der Text war zu lang und ist im Entwurf gekürzt.';
    return { ok: true, url: url, geoeffnet: geoeffnet, gekuerzt: gekuerzt, bestaetigung: bestaetigung };
  }

  function bind(form, opt) {
    opt = opt || {};
    var nameEl = form.querySelector('[name="name"]');
    var textEl = form.querySelector('[name="text"]');
    var box = form.querySelector('#bestaetigung');
    var meldung = form.querySelector('[data-meldung]');
    var linkZeile = form.querySelector('[data-linkzeile]');
    var link = form.querySelector('[data-issue-link]');
    var oeffner = opt.oeffner || fensterOeffnen;
    form.addEventListener('submit', function (ev) {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      var name = nameEl ? nameEl.value : '';
      var text = textEl ? textEl.value : '';
      var erg = oeffne(name, text, oeffner);
      if (box) box.hidden = false;
      if (!erg.ok) {
        if (meldung) meldung.textContent = erg.fehler;
        if (linkZeile) linkZeile.hidden = true;
        return;
      }
      if (meldung) meldung.textContent = erg.bestaetigung;
      if (link) {
        link.href = erg.url;
        link.textContent = erg.geoeffnet ? 'Issue-Entwurf noch einmal öffnen' : 'Issue-Entwurf bei GitHub öffnen';
      }
      if (linkZeile) linkZeile.hidden = false;
      if (box && typeof box.focus === 'function') box.focus();
    });
  }

  g.Press11Feedback = {
    titel: titel,
    koerper: koerper,
    issueUrl: issueUrl,
    oeffne: oeffne,
    bind: bind
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
