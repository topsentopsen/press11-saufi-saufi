# Bau-Bericht v03: Press11 - Saufi Saufi

Stand: 04.11.2026. Auftrag: `auftrag-cursor-v03.md` (Branch `v03-wip`, Basis v02).

## Was geändert

- **Viewport/Safe-Area:** `viewport-fit=cover`, `100dvh`, `overscroll-behavior: none`, `touch-action`; `env(safe-area-inset-*)` an Body, Stick, Touch- und Oben-Knöpfen.
- **Skalierung:** Touch-Hochformat 320×400, Quer 320×176; CSS-Skalierung so, dass `MIN_SCHRIFT * s ≥ ~11` CSS-px.
- **Touch-Ziele:** Knöpfe `min-width/height: 44px`, Oben-Knöpfe `max(44px, …)`, Menü-/Jukebox-Zeilen und Schließen-X auf Touch größer.
- **Joystick-Bug:** `#stick` standardmäßig `pointer-events: none`; nur `#rahmen.touch:not(.overlay) #stick` aktiv. Overlay-Klasse am Rahmen; Klick links unten schließt Jukebox.
- **Menüs:** Panel immer in `W×H` (`panelPlatz`), Zeilen kürzen/weglassen statt abschneiden; Hoch- und Querformat.
- **YouTube:** auf Touch klein oben links (nicht über Joystick/Aktionen), bei `#rahmen.overlay` weiterhin ausgeblendet.
- **Performance:** Konstante `Render.MAX_DPR = 2`, `begrenzDpr()`; Hintergrund-Cache nur bei Skalenwechsel.
- **VERSION** `0.3`, Script-`?v=0.3`, README „Neu in v03“.

## Abhakliste (Auftrag)

1. [x] Viewport/Safe-Area, 100dvh, kein Scrollen/Zoomen
2. [x] Skalierung Hoch-/Querformat, Mindestschrift ~11 CSS-px
3. [x] Touch-Ziele ≥ 44 CSS-px, höhere Menüzeilen
4. [x] Joystick links / Aktionen rechts, Safe-Area
5. [x] Joystick blockiert Overlay-Klicks nicht
6. [x] Jukebox/Menüs passen auf den Bildschirm
7. [x] YouTube auf Handy klein/oben, Overlay blendet aus
8. [x] DPR max. 2
9. [x] Tests 42–45 (DPR, Hochformat, Joystick/Overlay, Touch 44)
10. [x] VERSION 0.3, README, dieser Bericht

## Testergebnis

`node tests/run.js`: Tests 1–45 (inkl. neue 42–45) – auf der Box ausführen. Erwartet: alle grün.

## Dateien

- `index.html` – CSS Viewport, Safe-Area, Stick, Touch, YT, `?v=0.3`
- `js/main.js` – VERSION 0.3, Skalierung/DPR/Touch-Flag, Stick bei Overlay abbrechen
- `js/render.js` – `MAX_DPR`, `begrenzDpr`, Panel-Platz, Touch-Zeilen
- `js/gfx.js` – Kommentar Mindestschrift
- `tests/run.js` – Tests 42–45, VERSION-Assert 0.3
- `README.md`, `docs/bau-bericht-v03.md`
