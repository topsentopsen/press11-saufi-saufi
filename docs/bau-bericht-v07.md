# Bau-Bericht v07

Basis: v06 (86/86 Tests), Branch `v07-wip`. Alle Teile aus `auftrag-v07.md`.

## Teil 1 – Mond-/Sonnen-Bug
- `Gfx.hex` akzeptiert `#rgb`, `#rrggbb`, `rgb(r,g,b)` / `rgba(…)`; nie NaN. Neu: `hexVon`, `mischeHexStr`.
- Mond als echte Sichel (`mondSichel`, Zwei-Bögen-Pfad) – keine himmelfarbene Scheibe mehr → kein Schwarz auf Sternen/Glanz.
- `sonnenPos(28)` liefert Daemmerungs-Sonne (nicht null); Mond ab Stunde ≥ 27.2 aus.
- Turm in `kesselSzene` von x=0.8 → 0.86 (verdeckt Mond/Sonne nicht).

## Teil 2 – Ton
- `Ton.bestaetige()`: Dur-Zweiklang ~90 ms, Gain ≤ 0.15, einmal pro Sitzung (auch bei stumm).
- `visibilitychange`/`pageshow`/`focus`: bei suspended `entsperrt=false`, stilles `resume()`; nächster Tipp entsperrt.
- `#ton-hinweis` ≤ 12 px, `max-width: 80vw`; Hoch+Touch über `#bedien` (links 120 / rechts 150 frei).
- YT-Mini-Player: Hoch+Touch `bottom` über `--bedien`, Breite ≤ 160, `z-index: 0`; Touch standardmäßig eingeklappt; Quer oben mittig.

## Teil 3 – Schilder/HUD
- Hotel „Kehrwoche ok“ zwischen Fensterreihen in der Tür-Lücke (kein Fenster-Overlap).
- Kneipe „Feinstaub drin“ auf Markisen-Band, dunkler Grund / helle Schrift; außerhalb `npcZone`.
- HUD Hoch+Touch ~15 % kleiner; RUNDE-Banner ≥ 4 px unter Uhr-Stern-Zeile.

## Teil 4 – Zoom
- `WELT_FLAECHE_QUER = 4.0` → Zoom 0.5, VW≈640. Hoch unverändert (`WELT_FLAECHE_HOCH = 1.5`): Karte 768 begrenzt `weltH/H`; Erhöhung würde Schwarzbereich riskieren (Test 69/79).
- Cache-Invalidierung bei Zoom-/Flächenwechsel (`R.cacheInvalidierungen`).

## Teil 5 – Nachtgrafik
- Fenster: Verlauf `#ffd77a`→`#ffb85a`, Alpha ≤ 0.9, dunkle Sprossen, Halo ≤ 1,5 Kachel.
- Laternen: `LATERNE_RADIUS = 30` (≤ 0,7 × v06=44), weicher Glanz, kein Kegel-Dreieck.
- Kein heller Gebäuderahmen (`#8f8fff` entfernt); nur dunkle Fassadenkanten.

## Teil 6 – Dunkelfläche
- Canvas-Reserve und `#rahmen.touch.hoch #bedien` beide `#1b1530` (`Gfx.P.uiDunkel`), Alpha 1, ohne Rundung.
- Touch-Knöpfe `bottom/right ≥ max(8px, safe-area)`.

## Teil 7 – iPhone
- `orientationchange` → `groesse()` sofort + nach 120 ms + ~400 ms (Debounce 40 ms).
- Zustand/Overlay/Spieler bleiben; Kamera neu zentriert/geclampt.
- `html/body` 100vh/100dvh; DPR Hoch-Touch ≤ 2; Cache nur bei Größen-/DPR-/Zoom-Änderung.

## Teil 8 – Durchspiel
- Test 96: Seeds 1/7/42 in Hoch-Touch 390×844 und Quer; Bot mittrunken, Wasser, Overlay Esc; `ende` ohne Soft-Lock; Tipp → `neustart`.

## Pflichtteil
- `VERSION = '0.7'`, alle `?v=0.7`, README „Neu in v07“, dieser Bericht.

## Angepasste Tests
| Nr | Änderung | Begründung |
|---|---|---|
| 39, 42, 73, 83 | `0.6` → `0.7`, README/Bericht v07 | Pflichtteil v07 |
| 87–97 | neu | Auftrag v07 |

Bestehende Tests 69/79/80/81/74 unverändert in den Schwellen; Zoom-Quer-Tests mit `>= 3` bleiben grün bei 4.0.

## Abweichungen
- Zoom-Taste Z / Knopf Normal↔Weit: nicht umgesetzt (optional, Zeit).
- Dachziegel/Wasser/Wiese-Extra: nur Fensterlicht im Kessel warm; bestehende Cache-Sprites unverändert.

## Restprobleme
- Lange Info-18+-Texte dürfen weiter mit `…` kürzen (Test 81 Ausnahme).
- Songtitel in der Playlist weiterhin kürzbar.
- Ohne echte Geräte-Screenshots: Mond/Nacht über Mock-Füllfarben und Kennzahlen abgesichert.

## Abhakliste
1. [x] `node tests/run.js` ≥ 97 grün
2. [x] Sonne/Mond ohne schwarze Scheibe (87/88)
3. [x] Erster Tipp startet Spiel + Ton-Bestätigung; Hinweis/YT nicht über Stick/E
4. [x] Quer Fläche 4.0; Hoch ohne Rückschritt
5. [x] Kein `…` in Schilden/HUD-Kern; Schilder frei; Uhr/Banner getrennt
6. [x] Nacht: warm, Laterne weicher, kein heller Rahmen
7. [x] Eine Dunkelfläche; Drehen ohne Zustandsverlust
8. [x] Bot-Durchspiel 3 Seeds × 2 Formate
9. [x] Debug-Haken / URL-Parameter / Pflichtdateien
