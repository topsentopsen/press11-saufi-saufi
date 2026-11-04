# Bau-Bericht v05: Press11 - Saufi Saufi

Stand: 04.11.2026. Auftrag: Hoch-Welt in voller Höhe / Karte nach Süden (Branch `v05-wip`, Basis v04).

## Was geändert

### 1. Stadtkarte 40×48 (`js/karte.js` `erstelleStadt`)
- `neueKarte('stadt', 40, 48, …)` → `pxH = 768`. Alle Koordinaten y 0..29 unverändert (Gebäude, Türen, Wege, Streuung oben).
- Neuer Südstreifen y 30..47: Weg ab (25,29) nach Süden, Querweg, kleiner Park (Pflaster, 3 Bänke, Laterne, Teich `T.WASSER`), Laternen, weiche Baum-/Mauerreihe an y 46–47.
- RNG: feste Süd-Geometrie **vor** der Blumen-Schleife (kein `rng`); Süd-`streue` **danach**, damit Seeds der oberen 30 Zeilen deterministisch bleiben.

### 2. Hoch-Kamera / UI-Reserve (`js/render.js`)
- `KARTE_PX_H = 480` entfernt; neu `UI_RESERVE_HOCH = 80`, `STADT_PX_H = 768`, `R.stadtPxH`.
- Hoch: `weltHZiel = H - UI_RESERVE_HOCH`, `VH = min(weltHZiel/zoom, stadtPxH)`, `R.weltH = round(VH*zoom)`. Dunkelfeld nur `H - weltH`.
- Hinweise/Hilfe/große Banner und Scooter-Leiste in der UI-Reserve (nicht mitten über dem Spieler).
- Quer unverändert: `VH = H/zoom`.
- Innenräume: keine neuen Streifen; Kamera zentriert weiter über `Kamera.ziel`, wenn `weltH ≤ viewH`.

### 3. Main / Debug
- `VERSION = '0.5'`; `debug.mass()` um `weltH` ergänzt.
- Nach Spielstart: `R.stadtPxH` aus Karte, HG/Props-Cache geleert, Hoch-Layout ggf. neu gesetzt, Kamera sofort auf Spawn.

### 4. Docs / Cache
- `index.html`: alle `?v=0.5`.
- README „Neu in v05“; dieser Bericht.

## Tests
- Neu: **67–73** (Karte, Erreichbarkeit, Hoch-Anteil, Kameraklemme, mass+weltH, Quer, Versionen).
- Erwartung: `node tests/run.js` ≥ 73 grün.

### Angepasste alte Tests (Begründung)
| Test | Anpassung | Warum |
|---|---|---|
| 15 | `h === 48` (war 30) | Karte gewachsen |
| 39 / 42 | VERSION / `?v=` `0.5` | Pflichtteil v05 |
| 53 | VH≤768; Fläche ≥70 % von `altH` / `WELT_FLAECHE_HOCH*0.7`; `weltH < H` | UI-Reserve statt Kappung 480; bei `PORT_H=400` ist die sichtbare Fläche bewusst kleiner als v04-`WELT_FLAECHE_HOCH` |
| 64 | VH≤768; `weltH ≤ H` | neue Kappenhöhe |

Keine Tests gelöscht; Schwellwerte nur wo die Layout-Formel absichtlich geändert wurde.

## Abweichungen vom Auftrag
- `UI_RESERVE_HOCH = 80` (Richtwert 72–90).
- Screenshots 390×844 / 375×667 hier nicht visuell geprüft (kein Browser in der Agent-Session); nur Kennzahlen/Tests.
- Shell war zeitweise blockiert; Tests lokal vom Auftraggeber mit `node tests/run.js` ausführen.

## Rest-Probleme
- Bei sehr großem logischem `H` und voll sichtbarer Karte (`VH = 768`) kann das Dunkelfeld etwas größer als 80 px werden (`H - round(768*zoom)`).
- Innenräume in Hoch: großer Kamerarahmen um den kleinen Raum (wie bisher, nur mit höherem VH) – Absicht laut Auftrag.
- Hinweis-/Hilfe-/Boost-Stapel in der schmalen Reserve kann bei Disko + langem Text eng werden; `textInBox` hält Text in der Box.

## Abhakliste
1. [x] Karte 40×48, Südstreifen, alte Orte unverändert
2. [x] Hardcodes 480/30 → `karte.h` / `stadtPxH` (Render)
3. [x] Hoch-Layout UI-Reserve, Hinweise in Reserve
4. [x] `debug.mass` + `weltH`
5. [x] VERSION 0.5, `?v=`, README, Bericht
6. [x] Tests 67–73 + angepasste Alt-Tests

## Nachtrag Grok Bot
- Ton (js/ton.js): `entsperrt` wird nach asynchronem `resume()` bzw. bei `statechange` auf running nachgezogen, Hinweis „Tippen für Ton“ verschwindet dann (Befund Cloud-Review v04).
- Headless-Test (nacht.mjs): 29/29 grün, Hoch 390x844 Kamera 392x626 (v04: 392x480), 375x667 392x497.
