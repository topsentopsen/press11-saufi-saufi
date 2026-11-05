/* Eingang fuer anonyme Feedback-Nachrichten.
   Haelt kein Token. Der Worker liest PRESS11_DISPATCH_TOKEN nur aus der Umgebung
   und legt damit ein repository_dispatch an. Das Issue erzeugt der Workflow. */
'use strict';

var ARTEN = { feedback: true, idee: true, sprache: true };
var ERLAUBTE_FELDER = { art: true, name: true, text: true, website: true };
var TEXT_MAX = 4000;
var NAME_MAX = 80;
var BODY_MAX = 8192;
var RATE_N = 5;
var RATE_MS = 10 * 60 * 1000;
var hits = {};

function eineZeile(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

function normArt(art) {
  return ARTEN[art] ? art : '';
}

function nurErlaubteFelder(daten) {
  daten = daten || {};
  var out = {};
  Object.keys(ERLAUBTE_FELDER).forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(daten, k)) out[k] = daten[k];
  });
  return out;
}

function contentTypeOk(ct) {
  ct = String(ct || '').split(';')[0].trim().toLowerCase();
  return ct === 'application/json';
}

function pruefe(daten) {
  daten = nurErlaubteFelder(daten);
  if (eineZeile(daten.website)) return { ok: true, still: true };
  var art = normArt(daten.art);
  var text = String(daten.text == null ? '' : daten.text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (text.length > TEXT_MAX) text = text.slice(0, TEXT_MAX);
  var name = eineZeile(daten.name).slice(0, NAME_MAX);
  if (!art) return { ok: false, status: 400, fehler: 'Unbekannte Art.' };
  if (!text) return { ok: false, status: 400, fehler: 'Text fehlt.' };
  return { ok: true, art: art, name: name, text: text };
}

function rateOk(ip, jetzt) {
  jetzt = jetzt || Date.now();
  var key = String(ip || 'unbekannt');
  var arr = (hits[key] || []).filter(function (t) { return jetzt - t < RATE_MS; });
  if (arr.length >= RATE_N) { hits[key] = arr; return false; }
  arr.push(jetzt);
  hits[key] = arr;
  return true;
}

function reset() { hits = {}; }

function vorschau(text) {
  var s = eineZeile(text);
  if (s.length <= 60) return s;
  return s.slice(0, 59).replace(/\s+$/g, '') + '…';
}

function ohneMentions(s) {
  return String(s == null ? '' : s).replace(/@/g, '(at)');
}

function ohneBackticks(s) {
  return String(s == null ? '' : s).replace(/`/g, "'");
}

function codeFence(text) {
  var max = 2;
  var m = String(text).match(/`+/g);
  if (m) {
    for (var i = 0; i < m.length; i++) {
      if (m[i].length > max) max = m[i].length;
    }
  }
  return new Array(max + 2).join('`');
}

function issueFelder(art, name, text) {
  art = normArt(art) || 'feedback';
  name = ohneBackticks(ohneMentions(eineZeile(name).slice(0, NAME_MAX)));
  text = ohneBackticks(ohneMentions(String(text == null ? '' : text).replace(/\r\n/g, '\n').trim()));
  if (text.length > TEXT_MAX) text = text.slice(0, TEXT_MAX);
  var prefix = art === 'idee' ? '[Idee]' : (art === 'sprache' ? '[Feedback (Sprache)]' : '[Feedback]');
  var kurz = vorschau(text);
  var title = (kurz ? prefix + ' ' + kurz : prefix).slice(0, 240);
  var meta = '';
  if (art === 'idee') meta = 'Art: Idee' + (name ? '\nName: ' + name : '');
  else if (art === 'sprache') meta = 'Art: Feedback (Sprache)\nQuelle: Sprache' + (name ? '\nName: ' + name : '');
  else if (name) meta = 'Name: ' + name;
  var fence = codeFence(text);
  var body = (meta ? meta + '\n\n' : '') + fence + '\n' + text + '\n' + fence;
  var labels = art === 'sprache' ? ['feedback', 'sprache'] : [art === 'idee' ? 'idee' : 'feedback'];
  return { title: title, body: body, labels: labels };
}

function originErlaubt(origin) {
  if (!origin) return '';
  if (origin === 'https://topsentopsen.github.io') return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return '';
}

function jsonAntwort(status, obj, origin) {
  var headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(obj), { status: status, headers: headers });
}

function optionen(origin) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || 'https://topsentopsen.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    }
  });
}

async function cfRateOk(env, key) {
  if (!env || !env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== 'function') return true;
  try {
    var r = await env.RATE_LIMITER.limit({ key: String(key || 'unbekannt') });
    return !!(r && r.success);
  } catch (e) {
    return true;
  }
}

async function fetchHandler(request, env, hole) {
  var rohOrigin = request.headers.get('Origin') || '';
  var origin = originErlaubt(rohOrigin);
  if (rohOrigin && !origin) {
    return new Response(JSON.stringify({ ok: false, fehler: 'Origin nicht erlaubt.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
  var erlaubt = origin || 'https://topsentopsen.github.io';
  if (request.method === 'OPTIONS') return optionen(erlaubt);
  if (request.method !== 'POST') return jsonAntwort(405, { ok: false, fehler: 'Nur POST.' }, erlaubt);
  if (!contentTypeOk(request.headers.get('Content-Type'))) {
    return jsonAntwort(415, { ok: false, fehler: 'Content-Type muss application/json sein.' }, erlaubt);
  }
  var len = request.headers.get('Content-Length');
  if (len != null && len !== '' && Number(len) > BODY_MAX) {
    return jsonAntwort(413, { ok: false, fehler: 'Anfrage zu gross.' }, erlaubt);
  }
  var ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  ip = String(ip).split(',')[0].trim() || 'unbekannt';
  if (!(await cfRateOk(env, 'fb:' + ip))) {
    return jsonAntwort(429, { ok: false, fehler: 'Zu viele Nachrichten. Bitte kurz warten.' }, erlaubt);
  }
  var roh;
  try { roh = await request.arrayBuffer(); }
  catch (e0) { return jsonAntwort(400, { ok: false, fehler: 'Kein JSON.' }, erlaubt); }
  if (roh.byteLength > BODY_MAX) {
    return jsonAntwort(413, { ok: false, fehler: 'Anfrage zu gross.' }, erlaubt);
  }
  var daten;
  try { daten = JSON.parse(new TextDecoder().decode(roh)); }
  catch (e) { return jsonAntwort(400, { ok: false, fehler: 'Kein JSON.' }, erlaubt); }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) {
    return jsonAntwort(400, { ok: false, fehler: 'Kein JSON.' }, erlaubt);
  }
  var p = pruefe(daten);
  if (!p.ok) return jsonAntwort(p.status || 400, { ok: false, fehler: p.fehler }, erlaubt);
  if (p.still) return jsonAntwort(200, { ok: true }, erlaubt);
  if (!rateOk(ip)) return jsonAntwort(429, { ok: false, fehler: 'Zu viele Nachrichten. Bitte kurz warten.' }, erlaubt);
  var token = env && env.PRESS11_DISPATCH_TOKEN;
  if (!token) return jsonAntwort(503, { ok: false, fehler: 'Eingang ist noch nicht eingerichtet.' }, erlaubt);
  var repo = (env && env.PRESS11_REPO) || 'topsentopsen/press11-saufi-saufi';
  var url = 'https://api.github.com/repos/' + repo + '/dispatches';
  var ruf = hole || fetch;
  var res;
  try {
    res = await ruf(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'press11-feedback-eingang',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        event_type: 'press11-feedback',
        client_payload: { art: p.art, name: p.name, text: p.text }
      })
    });
  } catch (e2) {
    return jsonAntwort(502, { ok: false, fehler: 'Das Absenden hat nicht geklappt.' }, erlaubt);
  }
  if (!res || !res.ok) return jsonAntwort(502, { ok: false, fehler: 'Das Absenden hat nicht geklappt.' }, erlaubt);
  return jsonAntwort(200, { ok: true }, erlaubt);
}

module.exports = {
  pruefe: pruefe,
  rateOk: rateOk,
  reset: reset,
  issueFelder: issueFelder,
  originErlaubt: originErlaubt,
  contentTypeOk: contentTypeOk,
  nurErlaubteFelder: nurErlaubteFelder,
  fetch: fetchHandler
};
