# Bau Bericht v18: Scooter-Sprechblasen

Basis: v17. Plan in `../plan-v18.md`. Zufällige NPC-Sprechblasen kommen nur noch aus dem Scooter-Pool. VERSION 0.18.

## Umsetzung

- js/hinweise.js: SCOOTER-Pool (28 Einträge), FIGUR/SITUATION/ORT/PEGEL/SPRUECHE zeigen darauf, spruch immer aus dem Pool bei gleichem rng-Verbrauch (2 Aufrufe), Export SCOOTER.
- js/main.js VERSION 0.18; index.html ?v=0.18; README Neu in v18.
- Unverändert: frech.js, elon.js, s21.js, motiv.js, karte.js, npcs.js, render.js sowie SHOUTS/PROST/STAND_WEG und Tobi-Funktionstexte.

## Tests

- Versionstests auf 0.18; Test 36 und 211 angepasst; neu Test 214 (Pool, rng, Frech/S21/Elon/Motiv, Sophies Brauhaus).

## Musik-Ueberarbeitung (Claude Opus + Grok)

Ist: WebAudio-Hardstyle ohne Distortion/Sidechain, lineare BPM 96→150 erst um 04:00 Peak.

Soll/Ist jetzt in `js/ton.js`:
- Distortion-Kick (WaveShaper) + Klick
- padBus-Sidechain (Bass/Lead ducken auf Kick)
- Super-Saw-Lead (5 Saegezaehne, Filter-Huellkurve), 8 eigene Lead-Patterns
- Riser/Drop alle 16 Takte ab Ebene 2
- stueckweise BPM (08–18: 96→110, 18–23: 110→140, 23–01: 140→150)
- Filter-Cutoff 900→20000 Hz bis 23:00
- weicher Mute-Fade (~0,3 s)

Kein Spotify, keine Samples/MP3 im Repo, keine fremden Melodien. YouTube/MP3-Quellen unveraendert.
Tests 216–218. VERSION bleibt 0.18 (Branch v18-wip).
