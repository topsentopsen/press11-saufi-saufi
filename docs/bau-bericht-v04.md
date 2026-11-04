# Bau-Bericht v04: Press11 - Saufi Saufi

Stand: 04.11.2026. Auftrag: `auftrag-cursor-v04.md` (Branch `v04-wip`, Basis v03).

## Was geändert

### 1. Start per Tipp (`js/main.js` `updateStart`, `js/render.js` `startBild`)
- Im Zustand `start` ohne Overlay: Treffer `klick === 1` öffnet die Playlist; **jeder andere Klick** (auch daneben / `klick === null` bei vorhandenem Tipp) ruft `starteSpiel`.
- Tasten unverändert: Auf/Ab wechselt `startIndex`, Enter/E/Space aktiviert die Auswahl.
- `startBild`: Zeile „Tippen zum Start“.
- `js/eingabe.js`: Canvas-`pointerdown`/`touchstart` → `klicke` war bereits verdrahtet (unverändert).

### 2. Debug-Haken (`js/main.js`)
- `dbg.mass = function () { return { W, H, VW, VH, zoom: R.weltZoom }; }` neben `dbg.musik`.

### 3. Schrift kleiner
- `js/gfx.js`: `MIN_SCHRIFT` 9 → **7**; `textInBox` bricht um, verkleinert bis min, kürzt mit `…`.
- `js/render.js`: HUD/Liste/Start/Ende/Playlist/Blase/Knöpfe ca. 15–20 % kleiner; Hoch-HUD-Panel über Skala ≈ **84×54**.
- `js/main.js` `berechneSkala`: hartes `11 /` → Konstante `MIN_CSS_SCHRIFT = 9`.
- `index.html`: `.knopf` 15→13, `#oben .knopf` 13→12, `#knopf-aktion` 18→16, `#knopf-wasser` 11→10, `#ton-hinweis` 13→11; Touchfläche ≥ 44 px.

### 4. Hochformat-Layout (`js/render.js` `setzeBildschirm`, `zeichne`, `hud`, `pfeil`)
- Stadtkarte 40×30 = 640×480: in Hoch `VH = min(H/zoom, 480)`, `R.weltH = VH * zoom`; Welt nur in die oberen `weltH` Pixel (Clip), darunter UI-Feld `#1b1530`.
- Hinweise/Hilfe/Banner: Hoch im dunklen Feld bzw. oberhalb Stick/E-Reserve; Quer mit Safe-Bottom (~120 CSS-px).
- HUD: Uhr nie über linkem Panel (`hudLinks`); bei Engpass unter Oben-Knöpfen und unter linkem Panel; `pfeil`-Text „→ HIER“ / versetzt unter Uhr/Runde.
- `#ton-hinweis`: `top: calc(env(safe-area-inset-top,0px) + 56px)`, `bottom: auto`, `max-width: 280px`.

### 5. Zoom (`js/render.js`)
- `WELT_FLAECHE_QUER` 2,25 → **3,0**; `MIN_WELT_ZOOM = 0,5`.
- Hoch-Fläche bleibt nahe v03 (Kartenhöhe-Kappung statt stärker reinzoomen).

### 6. Version / Docs
- `VERSION = '0.4'`; alle `?v=0.4` in `index.html`.
- README „Neu in v04“; dieser Bericht.

## Tests
- Neu: **61–66** (Start-Tipp, `debug.mass`, Schrift, Zoom, Hoch-Overlap, Versionen).
- Erwartung: `node tests/run.js` ≥ 66 grün.

### Angepasste alte Tests (Begründung)
| Test | Anpassung | Warum |
|---|---|---|
| 39 | VERSION `0.4`; `MIN_SCHRIFT <= 7` | v04 Schrift/Version |
| 42 | VERSION/`?v=` `0.4` | Cache-Buster |
| 49 | Lesbarkeit `s * MIN_SCHRIFT >= 8` (war ≥ 10) | Ziel CSS-Schrift 9 statt 11, `MIN_SCHRIFT` 7 |
| 52 | `WELT_FLAECHE_QUER >= 3` (Obergrenze 2,5 entfernt) | bewusster Zoom v04 |
| 53 | Hoch: VH≤480, Fläche ≥ 90 % von v03 statt exakt `WELT_FLAECHE_HOCH` | Kartenhöhen-Kappung |
| 55 | `WELT_FLAECHE_QUER >= 3` | Zoom v04 |

Keine Tests gelöscht oder inhaltlich abgeschwächt über die bewussten v04-Schwellwerte hinaus.

## Abweichungen vom Auftrag
- Hoch: statt Zoom = `max(Flächen-Zoom, H/480)` (würde bei großen `H` **reinzoomen**) Kamerahöhe auf 480 gekappt + dunkles UI-Feld – erlaubt laut Auftrag („Alternativ einfacher“), erhält sichtbare Welt ≈ v03.
- `R.weltH` gesetzt; in `mass()` nicht enthalten (laut Auftrag nicht nötig).

## Rest-Probleme
- Browser-Screenshots 390×844 / 375×667 hier nicht visuell verifiziert (kein Browsertest in dieser Session).
- Innenräume nutzen dieselbe VH-Kappung; Zentrierung bleibt über die Kamera.
- Sehr lange Hinweistexte im dunklen Hoch-Feld können bei extremem `H` und vielen UI-Zeilen eng werden – `textInBox` hält sie in der Box.

## Abhakliste
1. [x] Start per Tipp / Playlist-Treffer / „Tippen zum Start“
2. [x] `debug.mass`
3. [x] Schrift kleiner (Gfx, Render, CSS, `MIN_CSS_SCHRIFT`)
4. [x] Hoch-Layout (VH≤480, weltH, HUD, Hinweise, ton-hinweis)
5. [x] `WELT_FLAECHE_QUER = 3`, Mindestzoom 0,5
6. [x] VERSION 0.4, `?v=0.4`, README, Bericht
7. [x] Tests 61–66 + angepasste Alt-Tests

## Nachtrag Grok Bot (Nacht 04./05.11.2026)
- Hochformat: Hilfe-Zeile, Scooter-Leiste und Hinweis-Panel im UI-Feld untereinander statt übereinander (Overlap behoben, js/render.js `hud`).
- Getestet mit Headless-Chrome (browsertest/nacht.mjs im Arbeitsordner): Durchspielen bis 04:00, iPhone 390x844/375x667 + Quer, Start per Tipp, AudioContext nach erstem Tipp, Joystick, E-Knopf.
