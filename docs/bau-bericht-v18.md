# Bau Bericht v18: Scooter-Sprechblasen

Basis: v17. Plan in `../plan-v18.md`. Zufällige NPC-Sprechblasen kommen nur noch aus dem Scooter-Pool. VERSION 0.18.

## Umsetzung

- js/hinweise.js: SCOOTER-Pool (28 Einträge), FIGUR/SITUATION/ORT/PEGEL/SPRUECHE zeigen darauf, spruch immer aus dem Pool bei gleichem rng-Verbrauch (2 Aufrufe), Export SCOOTER.
- js/main.js VERSION 0.18; index.html ?v=0.18; README Neu in v18.
- Unverändert: frech.js, elon.js, s21.js, motiv.js, karte.js, npcs.js, render.js sowie SHOUTS/PROST/STAND_WEG und Tobi-Funktionstexte.

## Tests

- Versionstests auf 0.18; Test 36 und 211 angepasst; neu Test 214 (Pool, rng, Frech/S21/Elon/Motiv, Sophies Brauhaus).
