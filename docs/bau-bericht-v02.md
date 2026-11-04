# Bau-Bericht v02: Press11 - Saufi Saufi

Stand: 04.11.2026. Aufträge: `aufgabe-v02.md`, `aufgabe-v02b.md`, `auftrag-cursor-v02.md`.

## Was geändert

- **Jukebox-Bug:** Nach `pl_start` schließt das Overlay (`S.overlay = null`). Alle Overlays: Esc, X-Button, Klick/Touch außerhalb (`R.panel`). Canvas `tabindex=0`, Fokus zurück vom YouTube-iframe.
- **Schriften:** Mindestgröße ~11 px logisch (`Gfx.MIN_SCHRIFT`), Schatten statt dicker Pixelkontur.
- **Setting:** Größere Ortsschilder, Kehrwoche-/Spätzle-/Feinstaub-Gags an den Fassaden.
- **Teamstimmung 0:** Endtitel „Die Truppe hat dich abgehängt“ / Wertung „Abgehängt“ (nicht Press F / Umgefallen).
- **„privat“ entfernt:** `index.html`-Titel, README, `hinweise.js` (18+ bleibt).
- **Humor & Sprüche:** Pools je Figur (≥8), Situation, Ort, Pegel (lallend ab hoch); max. 2 Sprechblasen; MS-Marathon-Gags, Getränke-/Essensnamen.
- **Ereignisse:** `docs/ereignisse-plan.md` + ≥20 Pannen in `ereignisse.js`, pegelgestuft, E/Q zum Lösen.
- **Minispiele:** `docs/minispiele-plan.md` + 3 Spiele (Deckel, Prost, Krug) in `minispiele.js`, abbrechbar.
- **VERSION** bleibt `0.2`. README-Abschnitt „Neu in v02“.

## Abhakliste (Auftrag)

1. [x] JUKEBOX-BUG + Regressionstests
2. [x] Schriften ≥ ~11 px
3. [x] Setting Stuttgart/Orte schärfen (wo nötig)
4. [x] Teamstimmung 0 eigener Titel
5. [x] „privat“ entfernen
6. [x] Humor + Sprüche-Pools + Tests
7. [x] Ereignisse-Plan + Einbau + Tests
8. [x] Minispiele-Plan + 3 Einbau + Tests
9. [x] README „Neu in v02“ + dieser Bericht

## Teil 2 (aufgabe-v02b)

1. [x] Jukebox/Overlay schließen (Esc/X/daneben/Songwahl)
2. [x] Humorvoller Ton (MS-Marathon, Schwaben-Gags)
3. [x] Sprechblasen/Sprüche ausgebaut
4. [x] Trinkspiel-Minispiele (3)
5. [x] Weitere Gags (Schilder, Getränke, Essen)
6. [x] Freund-wecken-ähnliche Interaktionen / Saufpannen

## Testergebnis

`node tests/run.js`: 46 von 46 grün (auf der Box ausgeführt). Browsertest in Headless-Chrome mit echten Eingaben: Jukebox per Songwahl, Esc, X und Klick daneben schließbar, danach Bewegung ok, keine Konsolenfehler.

## Werkzeuge

Code v02 geschrieben von Cursor-CLI (`cursor-agent -p --trust`, ohne --force) auf dem Cloud-PC; Grundlage waren Claudes WIP und Grok-Fixes (Commit 82f0794). Gebaut ohne Claude auf Tobis Wunsch.
