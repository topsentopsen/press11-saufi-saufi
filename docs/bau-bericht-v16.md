# Bau Bericht v16: Auswahl, Himmelsbach, Motocross-Finale

Basis: v15. Plan in `../plan-v16.md`. Abweichungen: freigegebene Kartentexte (kein Platzhalter), Feld `auswahl` mit rolle/plus/minus, Kartenname Buntschu bei Anzeigename Buntschuh, Seabolt als Name bei id siebold, kleine Stats ohne rng.

## Umsetzung

- js/charaktere.js: AUSWAHL (8), Himmelsbach statt Rudi, motivator-Flags, Stats tempo/heil/punkteFaktor/abbauMul/teamStart.
- js/mxevent.js: Finale 18:30, Hinweise, Bereich Tribüne/Park, Belohnung +120/Team+1, Strafe -30 ohne Team-Minus, Sprünge als uebersprungen.
- js/motiv.js: Motivatoren-Blasen, Intervall 22-32, kein rng.
- js/main.js: VERSION 0.16, Auswahl-Logik, waehleFigur, mxTick, Motiv-Block, ?start/?figur.
- js/render.js: Startkarten-Raster, HUD-Banner Motocross, extra pfeife.
- js/karte.js: drei Bierkästen kasten_mx1..3 nach den Bank-Kästen.
- js/frech.js / hinweise.js / npcs.js: Rudi zu Himmelsbach/Seabolt.
- index.html: ?v=0.16, mxevent.js, motiv.js.
- README Neu in v16; docs/bau-bericht-v16.md.

## Tests

- Unit Tests 199 bis 209 neu.
- Alte Versionstests auf 0.16 / v16; Neu in v13/14/15 und bau-bericht-v13..15 bleiben.
- Test 7 und 21 auf Himmelsbach; Test 117 unverändert.
