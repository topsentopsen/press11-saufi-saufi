/* Musikquellen: eigene MP3s aus music/playlist.js > YouTube-Einbettung (IFrame Player API, nur Einbetten) > eigener WebAudio-Hardstyle.
   Scooter-Titel stehen nur als Text in der Titelliste. Es werden keine Songdateien aus dem Netz geladen. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};

  var TITEL = ['Hyper Hyper', 'Move Your Ass!', 'How Much Is the Fish?', 'Maria (I Like It Loud)', 'Nessaja', 'The Logical Song', 'Weekend!',
    'Jigga Jigga!', 'One (Always Hardcore)', 'Posse (I Need You on the Floor)', 'Fire'];
  // Standard-Videos; die eigentliche Liste steht in music/playlist.js (Saufi.YOUTUBE) und laesst sich dort leicht ergaenzen.
  var STANDARD_VIDEOS = [
    { id: 'aoXOdAUD7IM', titel: 'Scooter - Hyper Hyper' },
    { id: '4YxTa1AUqps', titel: 'Scooter - The Logical Song (Official Video)' }
  ];
  function videoListe(liste) {
    if (!liste || !liste.filter) return [];
    return liste.filter(function (e) { return e && typeof e.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(e.id) && typeof e.titel === 'string'; });
  }
  var VIDEOS = videoListe(Saufi.YOUTUBE);
  if (!VIDEOS.length) VIDEOS = STANDARD_VIDEOS;
  var API_URL = 'https://www.youtube.com/iframe_api', API_TIMEOUT_MS = 8000, FENSTER_B = 220, FENSTER_H = 124;

  // Nur gueltige Eintraege: { datei: 'music/x.mp3', titel: '...' }
  function mp3Liste(liste) {
    if (!liste || !liste.filter) return [];
    return liste.filter(function (e) { return e && typeof e.datei === 'string' && e.datei.trim() !== '' && typeof e.titel === 'string'; });
  }
  // YouTube-Einbettung geht nur ueber http(s) (zum Beispiel http://localhost), nicht ueber file://, nur online und ohne Player-Fehler.
  function youtubeVerfuegbar(o) {
    o = o || {};
    return (o.protokoll === 'http:' || o.protokoll === 'https:') && o.online !== false && !o.fehler;
  }
  // Reihenfolge: eigene MP3 (falls eingetragen) > YouTube (falls verfuegbar und gewaehlt) > WebAudio
  function quelle(o) {
    o = o || {};
    if (mp3Liste(o.mp3).length) return 'mp3';
    if (o.youtubeGewaehlt && o.youtubeVerfuegbar) return 'youtube';
    return 'webaudio';
  }
  // Kurzer Hinweistext, warum YouTube nicht geht
  function hinweisYoutube(o) {
    o = o || {};
    if (o.protokoll !== 'http:' && o.protokoll !== 'https:') return 'YouTube geht nur über http://localhost, nicht über file://. Ich nehme den Spiel-Beat.';
    if (o.online === false) return 'Kein Internet, YouTube geht nicht. Ich nehme den Spiel-Beat.';
    if (o.fehler) return 'YouTube-Player meldet einen Fehler. Ich nehme den Spiel-Beat.';
    return '';
  }

  // env: { win, doc, ton, speicher, melde(text), [protokoll], [online], [mp3] } (die letzten drei nur fuer Tests)
  function erstelle(env) {
    var win = env.win || {}, doc = env.doc || null, melde = env.melde || function () {};
    var m = { aktiv: 'webaudio', spielt: false, manuell: false, fehler: null, mp3Defekt: false, defekt: {}, aktuell: null, videoIndex: 0, mp3Index: 0, hinweis: '', hinweisGezeigt: false,
      gewaehlt: env.speicher ? env.speicher.bool('youtube', false) : false, zu: false, stumm: false };
    var audio = null, player = null, apiLaden = false, apiTimer = null, wartend = null;

    m.protokoll = function () { return env.protokoll !== undefined ? env.protokoll : (win.location ? win.location.protocol : 'file:'); };
    m.online = function () { return env.online !== undefined ? env.online : (win.navigator && typeof win.navigator.onLine === 'boolean' ? win.navigator.onLine : true); };
    m.mp3 = function () { return mp3Liste(env.mp3 !== undefined ? env.mp3 : Saufi.MUSIK).filter(function (t) { return !m.defekt[t.datei]; }); };
    m.verfuegbar = function () { return youtubeVerfuegbar({ protokoll: m.protokoll(), online: m.online(), fehler: m.fehler }); };
    m.quelle = function () { return quelle({ mp3: m.mp3(), youtubeGewaehlt: m.gewaehlt, youtubeVerfuegbar: m.verfuegbar() }); };

    function el(id) { return doc && doc.getElementById ? doc.getElementById(id) : null; }
    function fenster(an) { var f = el('yt-fenster'); if (f) f.hidden = !an; }
    function sag(text) { m.hinweis = text; melde(text); }

    function stoppeExtern() {
      if (audio) { try { audio.pause(); } catch (e) { /* egal */ } }
      if (player && player.pauseVideo) { try { player.pauseVideo(); } catch (e) { /* egal */ } }
      fenster(false); m.spielt = false;
    }
    function zurueckZumBeat(grund) {
      stoppeExtern(); m.aktiv = 'webaudio'; m.spielt = true;
      if (env.ton) env.ton.setzeMusik(true);
      if (grund) { sag(grund); m.hinweisGezeigt = true; }
    }
    // Dieser MP3-Titel geht nicht (fehlt, kaputt): nur er gilt als defekt, der naechste gueltige wird probiert.
    // Erst wenn alle defekt sind, kommt die naechste Quelle der Reihenfolge (YouTube, sonst Spiel-Beat)
    function mp3Ausgefallen(grund, datei) {
      if (datei !== m.aktuell) return;                       // veraltete Meldung eines schon ersetzten Titels
      m.defekt[datei] = true;
      if (m.mp3().length) return spieleMp3('weiter');
      m.mp3Defekt = true; zurueckZumBeat(grund);
      if (m.quelle() === 'youtube') m.starte(m.letzter || 'playlist');
    }

    // ---------- MP3 ----------
    function waehleTrack(anlass) {
      var l = m.mp3();
      if (anlass === 'boost') for (var i = 0; i < l.length; i++) if (/hyper/i.test(l[i].titel)) return i;
      return m.mp3Index % l.length;
    }
    function spieleMp3(anlass) {
      var l = m.mp3(); if (!l.length) return zurueckZumBeat('');
      if (!audio) {
        if (doc && doc.createElement) audio = doc.createElement('audio'); else if (win.Audio) audio = new win.Audio();
        if (!audio) return zurueckZumBeat('Dieser Browser kann keine MP3 abspielen. Ich nehme den Spiel-Beat.');
        audio.addEventListener('ended', function () { m.mp3Index += 1; if (m.aktiv === 'mp3') spieleMp3('weiter'); });
        audio.addEventListener('error', function () { if (m.aktiv === 'mp3') mp3Ausgefallen('MP3 nicht gefunden (music/playlist.js prüfen). Ich nehme die nächste Quelle.', m.aktuell); });
      }
      m.mp3Index = waehleTrack(anlass);
      var datei = m.aktuell = l[m.mp3Index].datei;
      audio.src = datei; audio.muted = m.stumm; audio.volume = 0.8;
      if (env.ton) env.ton.setzeMusik(false);
      m.aktiv = 'mp3'; m.spielt = true;
      var p = null; try { p = audio.play(); } catch (e) { p = null; }
      if (p && p.catch) p.catch(function () { if (m.aktiv === 'mp3') mp3Ausgefallen('MP3 lässt sich nicht abspielen. Ich nehme die nächste Quelle.', datei); });
    }

    // ---------- YouTube ----------
    function ladeApi(fertig) {
      if (win.YT && win.YT.Player) return fertig(true);
      wartend = fertig;
      if (apiLaden) return;
      apiLaden = true;
      win.onYouTubeIframeAPIReady = function () { if (apiTimer) win.clearTimeout(apiTimer); var w = wartend; wartend = null; if (w) w(true); };
      apiTimer = win.setTimeout(function () { var w = wartend; wartend = null; apiLaden = false; if (w) w(false); }, API_TIMEOUT_MS);
      try {
        var s = doc.createElement('script'); s.src = API_URL; s.async = true;
        s.onerror = function () { if (apiTimer) win.clearTimeout(apiTimer); var w = wartend; wartend = null; apiLaden = false; if (w) w(false); };
        (doc.head || doc.body).appendChild(s);
      } catch (e) { if (apiTimer) win.clearTimeout(apiTimer); apiLaden = false; fertig(false); }
    }
    function ytFehler() {
      m.fehler = 'player';
      zurueckZumBeat(hinweisYoutube({ protokoll: m.protokoll(), online: m.online(), fehler: m.fehler }));
    }
    // iOS: playsinline am iframe (playerVars allein reicht nicht immer)
    function setzePlaysinline() {
      var host = el('yt-player'), iframe = null;
      if (host) {
        if (host.tagName && String(host.tagName).toUpperCase() === 'IFRAME') iframe = host;
        else if (host.querySelector) iframe = host.querySelector('iframe');
      }
      if (!iframe && doc && doc.querySelector) iframe = doc.querySelector('#yt-rahmen iframe, #yt-player iframe');
      if (!iframe) return;
      try {
        iframe.setAttribute('playsinline', '1');
        iframe.setAttribute('webkit-playsinline', '1');
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      } catch (e) { /* egal */ }
    }
    function spieleYoutube(anlass) {
      m.videoIndex = anlass === 'disko' || anlass === 'boost' || anlass === 'playlist' ? 0 : m.videoIndex;
      m.aktiv = 'youtube'; m.spielt = true;
      // Touch: standardmaessig eingeklappt (E/Wasser/Stick bleiben erreichbar)
      var touchAn = !!(env.touch || (doc && doc.getElementById && doc.getElementById('rahmen') && doc.getElementById('rahmen').classList && doc.getElementById('rahmen').classList.contains('touch')));
      m.zu = !!touchAn;
      var f = el('yt-fenster'); if (f) { f.hidden = false; f.className = m.zu ? 'zu' : ''; }
      var kl = el('yt-klapp'); if (kl && m.zu) kl.textContent = '▶ Scooter';
      if (env.ton) env.ton.setzeMusik(false);
      ladeApi(function (ok) {
        if (m.aktiv !== 'youtube') return;
        if (!ok) { m.fehler = 'api'; return zurueckZumBeat(hinweisYoutube({ protokoll: m.protokoll(), online: m.online(), fehler: m.fehler })); }
        try {
          if (player && player.loadVideoById) { player.loadVideoById(VIDEOS[m.videoIndex].id); return; }
          player = new win.YT.Player('yt-player', {
            width: FENSTER_B, height: FENSTER_H, videoId: VIDEOS[m.videoIndex].id,
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: function (e) {
                setzePlaysinline();
                // Nur nach Nutzergeste (Playlist-Knopf); kein stilles Autoplay ohne Geste
                if (m.stumm && e.target.mute) e.target.mute();
                if (m.spielt && e.target.playVideo) e.target.playVideo();
              },
              onStateChange: function (e) {
                if (e.data === 0 && m.aktiv === 'youtube') { m.videoIndex = (m.videoIndex + 1) % VIDEOS.length; player.loadVideoById(VIDEOS[m.videoIndex].id); }
              },
              onError: function () { player = null; ytFehler(); }
            }
          });
          setzePlaysinline();
        } catch (e) { player = null; ytFehler(); }
      });
    }

    // anlass: 'playlist' (Knopf, Nutzer waehlt YouTube), 'disko', 'boost'
    m.starte = function (anlass) {
      m.letzter = anlass;
      if (anlass === 'playlist') { m.gewaehlt = true; m.manuell = true; if (env.speicher) env.speicher.setzeBool('youtube', true); }
      var q = m.quelle();
      if (anlass !== 'playlist' && q === 'webaudio') {
        // Nutzer wollte YouTube, es geht aber nicht: einmal kurz Bescheid sagen
        if (m.gewaehlt && !m.verfuegbar() && !m.hinweisGezeigt) { m.hinweisGezeigt = true; sag(hinweisYoutube({ protokoll: m.protokoll(), online: m.online(), fehler: m.fehler })); }
        return q;
      }
      stoppeExtern();
      if (q === 'mp3') spieleMp3(anlass);
      else if (q === 'youtube') spieleYoutube(anlass);
      else {
        if (!m.verfuegbar()) { sag(hinweisYoutube({ protokoll: m.protokoll(), online: m.online(), fehler: m.fehler })); m.hinweisGezeigt = true; }
        zurueckZumBeat('');
      }
      return m.aktiv;
    };
    // Disko oder Boost vorbei: nur zurueck zum Beat, wenn nicht ueber den Playlist-Knopf gestartet
    m.ende = function () { if (!m.manuell && m.aktiv !== 'webaudio') zurueckZumBeat(''); };
    m.stopp = function () { m.manuell = false; zurueckZumBeat(''); };
    m.setzeStumm = function (s) {
      m.stumm = !!s;
      if (audio) audio.muted = m.stumm;
      if (player && player.mute) { try { if (m.stumm) player.mute(); else player.unMute(); } catch (e) { /* egal */ } }
    };
    // Fensterchen ein-/ausklappen. Eingeklappt wird pausiert (kein verstecktes Abspielen), ausgeklappt geht es weiter.
    m.klappe = function () {
      var f = el('yt-fenster'); if (!f) return m.zu;
      m.zu = !m.zu; f.className = m.zu ? 'zu' : '';
      if (player) { try { if (m.zu) player.pauseVideo(); else if (m.aktiv === 'youtube') player.playVideo(); } catch (e) { /* egal */ } }
      return m.zu;
    };
    m.waehleYoutube = function (an) { m.gewaehlt = !!an; if (env.speicher) env.speicher.setzeBool('youtube', !!an); };
    m.zustand = function () { return { quelle: m.quelle(), aktiv: m.aktiv, spielt: m.spielt, gewaehlt: m.gewaehlt, youtubeVerfuegbar: m.verfuegbar(), fehler: m.fehler, mp3: m.mp3().length, hinweis: m.hinweis }; };
    return m;
  }

  Saufi.Musik = { TITEL: TITEL, VIDEOS: VIDEOS, videoListe: videoListe, API_URL: API_URL, mp3Liste: mp3Liste, youtubeVerfuegbar: youtubeVerfuegbar, quelle: quelle, hinweisYoutube: hinweisYoutube, erstelle: erstelle };
})(globalThis);
