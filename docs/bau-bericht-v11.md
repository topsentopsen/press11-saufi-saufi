# Bau-Bericht v11

Basis: v10 (133 Tests, VERSION 0.10). Ziel: Balance & Spaß (Pegel/Stand/Runden/Punkte/Tempo) + Rest-Befunde aus v10. Zielspielzeit **ca. 15–20 Min**, Sieg knapp erreichbar.

## Teil 1 – Balance-Kurven

- Getränke: `radler` 0,10→**0,20**, `pils` 0,20→**0,30**, `kurzer` 0,35→**0,50** (wasser/alkoholfrei/MENUE unverändert).
- Tempo: `Uhr.SEK_PRO_STUNDE` 36→**48** (Spielzeit 20 h × 48 s = **960 s ≈ 16 Min**).
- Runden-Frist: `FRIST_MIN` 33→**40** (≈ 32 s Echtzeit); `VORLAUF_MIN` 60 bleibt.
- NPC-Stundenschluck: Trinkfestigkeit ≥ 1,1 trinkt **`pils`** statt `kurzer`, nur wenn `pegel < 2.5`; `else if (rng < 0.3)` unverändert (gleiche rng-Reihenfolge).
- Sieg-Bonus in `beende`: vor Wertung `Punkte.add(…, 20 * team, 'Truppe hält zusammen')`; SILBER/GOLD unverändert.
- Unverändert: Abbau 0,10/h, Essen, Cheats, Minispiele, Pannen, Team ±1, Türsteher > 2,5.

### Rechenbeleg (Tobi, Abbau 0,10/h, Runden pünktlich)

| Zeitpunkt | Ereignis | Pegel A (nur Runden) | Pegel B (2× Mault.) | Pegel C (1× Mault. 21:00) |
|-----------|----------|----------------------|---------------------|---------------------------|
| 10:00 | 2 Radler | 0,40 | 0,40 | 0,40 |
| 12:30 | 3 Radler | 0,75 | 0,75 | 0,75 |
| 15:30 | 2 Pils | 1,05 | 1,05 | 1,05 |
| 18:00 | Maultaschen (−0,15, Abbau+0,10/2h) | — | 0,65 | — |
| 19:30 | 3 Pils | 1,55 | 1,25 | 1,55 |
| 21:00 | Maultaschen | — | 0,90 | 1,25 |
| 22:30 | 2 Kurze | 2,25 | 1,60 | 1,95 |
| 01:30 | 3 Kurze | **3,45** | **2,75** | **3,10** |
| → 04:00 | Standverlust | Stand → 0 vor 04:00 (**Niederlage**) | Stand 100 (**Sieg**) | Stand ≈ 20 (**knapper Sieg**) |

`maxPegel` Modell A ∈ [3,3; 3,6], B ∈ [2,5; 2,95], C ∈ [2,95; 3,3] — Tests 135–137.

## Teil 2 – Rückmeldung

- Pegelfarbe nach `Pegel.schwelle`: klar/locker `uiTinte`, wackelig `#d9701a`, kritisch `bierRot`.
- Flags `S.warn2`/`S.warn3` (Reset in `neuesSpiel`): Hinweise bei > 2,2 und > 3,0 ‰ einmalig in `updateSpiel` nach Abbau/Runden.

## Teil 3 – Ende-Bild unten

Ursache: **Fall (b)** — `#bedien` unter dem Canvas hat `background: #1b1530` (uiDunkel); die Kesselszene füllt den Canvas bis `H`, der dunkle Streifen ist die DOM-Leiste.

Fix: `#rahmen.ende { background: #2b3d28; }`, `#rahmen.ende #bedien { background: transparent; }` (+ Spezifität `.touch.hoch.ende`). Panel/Sonne/Knöpfe unverändert.

## Teil 4 – Quer-Hinweise / Wasser-Knopf

- Quer: `maxBubbleW` 45 %→**60 %**, Schrift 8→**7**, `maxZeilen` 2→**1**, Höhe ≤ 12, `min: 6`.
- `#knopf-wasser`: `font-size: 9px`, `letter-spacing: -0.2px`, `padding: 0`, `white-space: nowrap`; Heuristik 6×0,6×9 = 32,4 ≤ 0,85×44.
- Quer-Überdeckung Wasser/Kneipe bleibt Restproblem (kein Layoutumbau).

## Teil 5 – Soft-Locks / Konsistenz

- Literale 36 s/h in Tests/Code auf `SEK_PRO_STUNDE` umgestellt; README Spielzeit/Frist.
- Pegel bis 4,0: Press-F/`aufstehen`/Türsteher unverändert; kein Soft-Lock-Fix nötig (Code-Review).
- `verlassen()`: `Hinweise.entferne(…, 'Feierabend')` vor Ortswechsel (neue API).

## Teil 6 – Durchspiel

- Bot A: zusätzlich Maultaschen-Küche 18–22 bei niedrigem Stand; Invarianten/Ende wie bisher.
- Messwerte (Bot-Läufe): **nicht gelaufen** in dieser Session (cursor-agent ohne `node tests/run.js`). Erwartet nach Rechnung: Mittrinker ohne Essen eher Niederlage; mit Essen/Wasser knapper Sieg; NPC-Umfaller durch Pils-Cap ≤ 3 (Richtwert).

## Pflichtteil

- `VERSION = '0.11'`, alle `?v=0.11` (inkl. `partikel.js`).
- README „Neu in v11“, dieser Bericht.

## Angepasste Tests (Begründung)

| Test | Änderung | Warum |
|------|----------|-------|
| 2 | 36→`SEK_PRO_STUNDE`/48 | Tempo Teil 1 |
| 4/5 | Getränke-Literale aus `LISTE` / Trink×pils | Pegel-Werte Teil 1 |
| 23/24 | pils/radler aus Konstanten | Balance-Literale |
| ≈593/613/691 | `/36` → `Uhr.SEK_PRO_STUNDE` | Tempo |
| 99/109 | Dialog ≤45 % → ≤60 % | Quer-Hinweise Teil 4 (neue Grenze) |
| 39/42/73/83/97/107/118/133 | VERSION/`?v=`/README/Bericht → 0.11/v11 | Pflichtteil |

Neu: **134–145** (`balanceSim`, Bonus, NPC-Schluck, Warnungen/Farbe, Ende-CSS Fall b, Quer-Blasen, Wasser/Touch, Durchspiel-Dauer, Versionen).

## Messwerte

| Kennzahl | Wert |
|----------|------|
| Spielzeit | 960 s = 16 Min |
| Frist Echtzeit | 40/60×48 ≈ 32 s |
| Wasser-Beschriftung | 32,4 ≤ 37,4 (85 % von 44) |
| `#oben` Kreis | 44−8 = 36 CSS-px |
| Quer-Zoom / Hoch | 4.0 / 2.4 unverändert |
| Bot A/C Seeds 1/7/42 | nicht gelaufen |
| NPC-Umfaller | nicht gelaufen (Code: Pils + Cap 2,5) |

## Restprobleme

- Quer: Wasser-Knopf kann Kneipenecke weiter überdecken (bewusst kein Layoutumbau).
- `node tests/run.js` in dieser Session **nicht gelaufen** — Abhakliste unten ehrlich.
- Bot-A-Sieg bleibt fragil (kein Test hängt am Sieg, nur Ende/Invarianten).

## Abweichungen

- Ende-Füllung als **Fall b** (CSS), nicht Fall a (Wiese bis H+2): Ursache war `#bedien`, nicht fehlende Canvas-Landschaft.
- Test 142 prüft Quer-Dialog-Höhe/Breite/eine Zeile; Knopfschnitt grob über Stick-Zone (knopfRects lokal in render.js).

## Abhakliste

1. [ ] `node tests/run.js` ≥145 grün — **nicht gelaufen** (Agent ohne Shell-Testlauf); Code von Hand gegen 134–145 gerechnet/gelesen
2. [x] Spielzeit 16 Min; Frist ≈32 s; Modelle A/B/C (Tests 135–137)
3. [x] Pegelfarbe + zwei Einmal-Hinweise; NPC-Schluck Pils+Cap
4. [x] Sieg-Bonus 20×Team; Silber/Gold unverändert
5. [x] Hoch-Ende: kein dunkler Bedienstreifen (transparent); Quer einzeilig ≤60 %; Wasser ≤85 %
6. [x] Touch ≥44 CSS-px; `#oben`-Kreis ≥36; Zoom unverändert
7. [x] Debug-Haken/`?tempo`/`?seed`/`?start`; keine Datei `ls`/`tests/_ls_out.txt` angelegt

## Nachtrag Grok
- Test 26: Dauer an SEK_PRO_STUNDE (48) gekoppelt statt fest 0,6 s.
- Test 118: partikel Cache-Buster auf 0.11.
