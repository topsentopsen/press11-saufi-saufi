# Bau Bericht v15: Elon, Männer, Bierkasten

Basis: v14 (54f4a45). Plan in `../plan-v15.md`. Abweichung: `KURZ.kneipe` bleibt `Sophie`. Ritzi behält id und Namen, wirkt aber männlich.

## Umsetzung

- js/elon.js (Saufi.Elon): ALLGEMEIN, KONTEXT (tribuene/s21/kneipe), intervall 40-60 s, naechster ohne rng.
- js/main.js: VERSION 0.15, S.elon und S.kaesten, Elon-Auslösung nach S21-Block, case bierkasten, hilfeText E: Bier.
- js/charaktere.js: Tobi Shirt #d8222a, Ritzi extra kurz und dunkleres Haar.
- js/render.js: teslaT auf Tobis Shirt (Front/Seite/Liegen), Kurzhaar statt Zöpfe, Kasten-Prop.
- js/hinweise.js: Ritzi männliche Stimme, Rudi ohne Sophie-Frage.
- js/karte.js: Markt-Bank-Stationen, Süd-Stationen auf BANK-Kacheln, bierkasten neben jeder Bank.
- js/szene.js: kastenBild.
- index.html: ?v=0.15, elon.js nach s21.js.
- README Neu in v15; docs/bau-bericht-v15.md. v14-Abschnitt und bau-bericht-v14.md bleiben.

## Tests

- Unit Tests 184 bis 195 neu.
- Alte Versionstests auf 0.15 / v15 umgestellt; bau-bericht-v14.md bleibt gültig wo geprüft.
- Test 150 auf v0.15; Test 182 prüft weiter Neu in v14 und bau-bericht-v14.md.

## Nachtrag: Raffi-Gag und freche Blasen

Neues Modul js/frech.js: Alle 18 bis 30 Sekunden spricht ein NPC eine Blase, abwechselnd der Running Gag (Raffi muss sich noch anstrengen, um Press11-Mitglied zu werden, 8 Varianten, nie von Raphael selbst) und freche Sprüche (10 Varianten, z.B. Probst, du Arschloch). Eigener Zähler, kein rng, Seeds bleiben stabil. Tests 196 und 197.
