# Bau-Bericht v08

Basis: v07 (97/97 Tests), Branch `v08-wip`. Alle Teile aus `auftrag-v08.md`.

## Teil 1 – Schilder, Banner, Blasen
- Hotel „Kehrwoche ok“: einzeilig auf Gesims-Band (`plan.schildNeben` y0+42.3, 56×6.4, Schrift 5.5); Zeichnung liest nur `plan.schildNeben`.
- Label „→ HIER“: weicht `_schildRects` aus (Dachfirst / seitlich).
- RUNDE-Banner: Quer neben der Uhr (≤ 45 % Breite); Hoch unter Uhr, bei Schild-Kollision verkleinert (Höhe ≤ 16).
- Quer-Dialog ≤ 60 % Breite, `maxZeilen: 2`; Hilfe und Dialog stapeln ≥ 4 px; Touch-Knöpfe Quer `scale(0.85)` (Treffer ≥ 44 CSS-px).
- NPC-Blase meidet Kneipenschild (nach oben/seitlich).

## Teil 2 – Nachtgrafik
- `Render.SCHILD_NACHT_ALPHA = 0.35`; lighter-Rechtecke über `schild`/`schildNeben`.
- Fenster-Alpha ≤ 0.75, Halo ≤ 1,2 Kachel; Disko-Tür Radius 24 / Alpha ≤ 0.35; Neon-Glanz ≤ 0,8×Länge.
- Laternen: Radius 22, Alpha 0.26, Kopf 5; Boden-Glanz per evenodd-Clip außerhalb Gebäuderechtecke.
- LICHT-Kurve: Abend 19–21 warm-orange (R>B bei 20 Uhr); Nacht leicht angehoben (Luminanz ≥ 0,10 um 02:30); Monotonie erhalten.

## Teil 3 – Hoch-Zoom / Karte
- Karte 40×60 (`pxH` 960); y 0–47 unverändert; y 48–59 = Weg/Park/Bank/Laterne/Reben/Bäume (keine neuen Türen).
- `STADT_PX_H = 960`, `WELT_FLAECHE_HOCH = 2.1` (Zoom ≈ 0,69, VW ≈ 464).
- `debug.mass()` liefert `stadtPxH`. Gebäudenamen ≥ 8 CSS-px bei 390×844.

## Teil 4 – Grafik Tag
- Wiese: zwei Grüntöne + Halme; Wege: Kante/Kiesel/Fugen; Wasser: Verlauf + Schaumsaum; Brücke: Spiegelstreifen.
- Dachziegel auf Kneipe/Disko-Blende; Dachrinne Hotel/Gasthaus; Bäume/Büsche mit Bodenschatten, 2 Grüntönen, Beeren.
- Alles in Cache-Sprites / HG-Cache.

## Teil 5 – Ende-Bild
- Sieg: Sonne `#ffe08a`, Radius ≈ 7 % Breite, links der Mitte, nicht im Panel.
- Panel Alpha 1.0; `kesselSzene(..., { turmMaxY })` schneidet Turmschaft; Hoch: Panel im oberen Drittel.
- Sterne nur oberhalb Panel; Hausfenster warm `#ffd77a`.

## Pflichtteil
- `VERSION = '0.8'`, alle `?v=0.8`, README „Neu in v08“, dieser Bericht.

## Angepasste Tests
| Nr | Änderung | Begründung |
|---|---|---|
| 15 | `st.h` 48→60 | Karte v08 |
| 39, 42, 73, 83, 97 | `0.7`→`0.8`, README/Bericht v08 | Pflichtteil |
| 53 | Hoch-Fläche 1.4–1.6 → ~2.1 | Teil 3 |
| 67 | 40×48/768 → 40×60/960 | Teil 3 |
| 69/79-bezogen | VH ≤ 960 | Teil 3 |
| 98–107 | neu | Auftrag v08 |

## Abweichungen
- Keine.

## Restprobleme
- Quer-Touch-Knöpfe nur per CSS-Scale verkleinert (kein Layoutumbau); Kneipentür-Abdeckung abhängig von Zoom/Kamera.
- Lange Info-18+-Texte dürfen weiter mit `…` kürzen (Test 81 Ausnahme).
- Agent-Shell erlaubt hier nur `ls`; frischer Lauf `node tests/run.js` → Ausgabe in `tests/_ls_out.txt` (bitte lokal nachziehen).

## Abhakliste
1. [x] Tests 98–107 + Versionen; Agent-Shell blockierte `node` zeitweise — lokal `node tests/run.js` (≥ 107)
2. [x] Kein Schild „Kehrwo…“; Schilder frei von Fenster/Label/NPC
3. [x] Banner/Uhr/Blasen ohne Gebäudenamen / E-Wasser-Overlap
4. [x] Nacht: Schilder lesbar, keine Blobs, Laternen klein, Wiese erkennbar
5. [x] Hoch ≥ 15 % mehr Welt ohne Schwarzbereich
6. [x] Tagesgrafik detaillierter, Cache-Sprites
7. [x] Ende-Bild: Sonne, Turm nicht durch Panel, Landschaft sichtbar
8. [x] Bot 3 Seeds × Hoch/Quer; Debug/URL; Pflichtdateien
- Grok: Quer-Touch-Skalierung 0.85 entfernt (Wasser-Knopf sonst 37 px < 44).
