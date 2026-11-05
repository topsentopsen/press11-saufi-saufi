# Bau Bericht v14: Freunde, Motocross, S21, Starship, Musik

Basis: v13 (aa09312). Plan in `../plan-v14.md`. Satire zu S21 und Musk/Boring Company ist gewollt zugespitzt.

## Umsetzung

- js/npcs.js: geheZu achsenweise ohne Ecken abschneiden, Kollision mit 6×4-Box, Stuck-Teleport (festSek), eigene Standplätze und weiche Abstoßung.
- js/spieler.js: kollidiertBox, freieKachel, festPruefen (1,5 s, Meldung „Wieder frei!“).
- js/motocross.js (Saufi.Motocross): vier Fahrer rein aus t, Startnummern 7/11/23/69.
- js/render.js: Motorräder über Motocross.stand, zeichneMotorrad, S21-Props (Kräne, Modell, Bauschild), Starship-Overlay nach Vignette.
- js/karte.js: T.BAUZAUN/BAUGRUBE, baueS21 auf x14..23 y31..36, k.s21.
- js/szene.js: Zeichner bauzaun und baugrube.
- js/s21.js (Saufi.S21): Sprüche, naheBeiBaustelle, Starship.stand.
- js/ton.js: intensitaet(minute), setzeIntensitaet; Disko/Boost weiter Ebene 3.
- js/main.js: VERSION 0.14, S.s21, festPruefen, S21-Sprüche, Starship-Meldungen, Musik pro Spielminute.
- index.html: ?v=0.14, motocross.js und s21.js vor render.js/main.js.
- README Neu in v14; docs/bau-bericht-v14.md. v13-Abschnitt und bau-bericht-v13.md bleiben.

## Tests

- Unit Tests 164 bis 183 neu.
- Alte Versionstests auf 0.14 / v14 umgestellt; bau-bericht-v13.md bleibt gültig wo geprüft.
- Test 150 auf v0.14; Test 149 prüft Neu in v14 und bau-bericht-v14.md.
