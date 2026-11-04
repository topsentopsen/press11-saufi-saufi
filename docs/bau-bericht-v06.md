# Bau-Bericht v06: Press11 - Saufi Saufi

Stand: 04.11.2026. Auftrag: Menüs/Ende/Touch spielbar im Hochformat inkl. Nachtrag 7–9 (Branch `v06-wip`, Basis v05).

## Änderungen je Teil

### Teil 1 – Ende-Bildschirm (`js/render.js` `endeBild`, `js/main.js`)
- Oberer Freiraum: Hoch+Touch `top = ceil(50 / sCss)`, sonst 8; Panel darunter, vertikal im freien Bereich zentriert; Höhe = Inhalt + Rand (max `H - top - 8`).
- Alle Zeilen mit `maxZeilen`; `e.grund` bis 3 Zeilen; Kesselszene bleibt Hintergrund.
- Neustart-Knopf: Touch-Höhe ≥ `ceil(44/sCss)`; Label `Tippen: Neustart` / sonst `E / Tippen: Neustart`.
- Tipp irgendwo nach 0,8 s Sperre → `S.neustart` (bereits in `update`); Tastatur unverändert.
- `#ton-hinweis`: bei `zustand === 'ende'` oder offenem Overlay ausgeblendet.

### Teil 2 – Wackel (`js/render.js` `zeichne`)
- Nach Clip: `drawImage` nur Quellhöhe `weltH * sk`, Ziel `W×weltH` in Clip `[0,weltH]`. UI-Feld/HUD unberührt.

### Teil 3 – Touch später (`js/main.js`)
- Flag `touchGemeldet`; bei `E.touch` und `!R.touch` einmal `groesse()` (Frame, Stick-Start, E/Wasser-Tipp).
- `groesse` übergibt `touch` an `setzeBildschirm`; `visualViewport.resize` → `groesse`. Drehen ändert weder Overlay noch Zustand.

### Teil 4 – Schilder (`js/szene.js`)
- Hotel: 52×10, Größe 7, Text „Kehrwoche ok“ (Fallback „Kehrwoche“ wenn Fassade zu schmal).
- Kneipe: 60×10, Größe 7, „Feinstaub drin“ / „Feinstaub“.
- Restaurant „Spätzle!“ auf Größe 7; weitere Schilder geprüft.

### Teil 5 – Reserve, Leiste, Trefferflächen
- Neu `UI_RESERVE_HOCH_TOUCH = 48` (exportiert); `UI_RESERVE_HOCH = 80` ohne Touch.
- Touch-Hoch: wenn die Stadtkappe die Reserve aufblähen würde, `weltH = H - reserve` erzwingen (`VH` darf > 768).
- `berechneBedien`: 96–140 CSS-px; Stick-Basis weiter 80 px in CSS.
- Overlays: Touch-Zeilen ≥ `ceil(44/sCss)`; Scroll mit ▲/▼; `schliessX`-Treffer ≥ 44 CSS-px.
- Jukebox-Hinweis: `YouTube: N Videos` ohne Titelliste; Start Touch-Einträge ≥ 44 CSS-px.

### Teil 6 – Stick/Mehrfinger
- Totzone 0,18 normiert, darüber linear (`stickAuslenkung`, exportiert).
- Zweiter Finger auf Stick-Zone ignoriert (`stickId`); E bricht Stick nicht ab.
- `pointercancel` / `touchcancel` / `blur` / `visibilitychange` → Stick 0, Basis aus.
- 80-ms-Doppelfenster Pointer/Touch bleibt.

### Teil 7 – Stumm-Hinweis
- `stummHinweisGezeigt` erst im `setTimeout` (4000 ms); Hinweis bleibt mind. 4 s sichtbar.

### Teil 8 – Disko/Innenräume
- `weltZoomFuer`: Cover-Zoom, damit der Raum die Weltfläche füllt; Kamera-View an Zoom angepasst.

### Teil 9 – Zuruf „RUNDE!“
- Groß-Banner bei Hoch: `resTop + 40` (Abstand zur Scooter-Leiste ≥ 4 px).

### Pflichtteil
- `VERSION = '0.6'`; `index.html` alle `?v=0.6`.
- README „Neu in v06“; dieser Bericht.

## Angepasste Tests (Begründung)

| Test | Anpassung | Warum |
|---|---|---|
| 39 | VERSION `0.6` | Pflichtteil v06 |
| 42 | VERSION / `?v=` `0.6` | Pflichtteil v06 |
| 73 | VERSION / `?v=` / README v06 / Bau-Bericht v06 | Pflichtteil v06 |
| 74–86 | neu | Ende, Wackel, Touch, Schilder, Reserve, Overlay, Stick, Versionen, Stumm, Disko-Zoom, RUNDE! |

Keine Tests gelöscht oder Schwellwerte abgeschwächt. `weltH/H`-Tests (69 u. a.) dürfen nur besser werden (kleinere Touch-Reserve).

## Abweichungen vom Auftrag
- `UI_RESERVE_HOCH_TOUCH = 48` (Richtwert 44–52).
- Touch-Hoch: `VH` kann `STADT_PX_H` überschreiten, damit die Reserve ≤ 52 bleibt.
- Screenshots hier nicht visuell geprüft (kein Browser in der Agent-Session); nur Kennzahlen/Tests.
- Shell in der Agent-Session war blockiert; `node tests/run.js` bitte lokal verifizieren.

## Restprobleme
- Sehr lange Info-18+-Fließtexte können in `textFeld` weiter mit `…` enden (Songtitel ebenfalls erlaubt).
- Bei extrem vielen Menüeinträgen: Scroll nötig; alle Einträge über Index/▲▼ erreichbar.
- Cover-Zoom in Innenräumen schneidet bei abweichendem Seitenverhältnis ab — Absicht gegen Schwarzstreifen.
- Querformat-Touch unverändert mit höherer Stick-Safe-Zone (~120 CSS-px).

## Abhakliste
1. [x] Ende-Panel kompakt, Neustart per Tipp, Ton-Hinweis weg
2. [x] Wackel nur Welt-Ausschnitt
3. [x] Touch später → `groesse()` ohne Neustart
4. [x] Schilder ohne `…`
5. [x] Reserve/Leiste/Treffer/Scroll/Jukebox-Hinweis
6. [x] Stick Totzone + Mehrfinger + Cancel
7. [x] Stumm ≥ 4 s, Disko-Zoom, RUNDE!-Abstand
8. [x] VERSION 0.6, README, Bericht, Tests 74–86

## Nachtrag Grok (Fix)
- Test 76 filterte alle 9-Arg-drawImage-Aufrufe, dabei auch den Hintergrund-Puffer (render.js ~298). Filter jetzt nur Quelle `R.canvas` (die Wackel-Kopie). Prüfung selbst unverändert.
- cursor-agent hatte in seiner Session keine Shell; Tests liefen danach durch Grok.
