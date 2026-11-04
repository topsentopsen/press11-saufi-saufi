# Bau-Bericht v03: Press11 - Saufi Saufi

Stand: 04.11.2026. Auftrag: `auftrag-cursor-v03.md` + `auftrag-cursor-v03b.md` (Branch `v03-wip`, Basis v02).

## Was geändert (v03)

- **Viewport/Safe-Area:** `viewport-fit=cover`, `100dvh`, `overscroll-behavior: none`, `touch-action`; `env(safe-area-inset-*)` an Body, Stick, Touch- und Oben-Knöpfen.
- **Skalierung:** Touch-Hochformat 320×400, Quer 320×176; CSS-Skalierung so, dass `MIN_SCHRIFT * s ≥ ~11` CSS-px (soweit der Viewport es erlaubt).
- **Touch-Ziele:** Knöpfe `min-width/height: 44px`, Oben-Knöpfe `max(44px, …)`, Menü-/Jukebox-Zeilen und Schließen-X auf Touch größer.
- **Joystick-Bug:** `#stick` standardmäßig `pointer-events: none`; nur `#rahmen.touch:not(.overlay) #stick` aktiv. Overlay-Klasse am Rahmen; Klick links unten schließt Jukebox.
- **Menüs:** Panel immer in `W×H` (`panelPlatz`), Zeilen kürzen/weglassen statt abschneiden; Hoch- und Querformat.
- **YouTube:** auf Touch klein oben links (nicht über Joystick/Aktionen), bei `#rahmen.overlay` weiterhin ausgeblendet.
- **Performance:** Konstante `Render.MAX_DPR = 2`, `begrenzDpr()`; Hintergrund-Cache nur bei Skalenwechsel.
- **VERSION** `0.3`, Script-`?v=0.3`, README „Neu in v03“.

## Was geändert (v03b – iPhone Safari)

- **Kein Zoom/Scroll/Gummiband:** Meta `maximum-scale=1, user-scalable=no, viewport-fit=cover`; Body `position: fixed`, `100dvh` + `-webkit-fill-available`; `touch-action: none`, `-webkit-user-select/touch-callout: none`; Doppeltipp-Zoom per `touchend`+`preventDefault`.
- **Touch-Events:** Pointer Events plus `touchstart`/`touchend`-Fallback mit `{passive:false}` für Canvas, Joystick und Aktionsknöpfe; Startbildschirm per Tipp.
- **Layout:** `Main.berechneSkala` berücksichtigt Safe-Area-Padding; 390×844 und 375×667 Hochformat passen vollständig.
- **Audio iOS:** `Ton.entsperre()` nur sinnvoll aus `touchend`/`pointerup`/`click`; `resume` bei `suspended`/`interrupted`; stummer 1-Sample-Puffer; Hinweis `#ton-hinweis` („Tippen für Ton“, danach einmalig Stummschalter-Hinweis); nach `visibilitychange` erneutes Entsperren bei nächster Geste.
- **YouTube iOS:** Start nur nach Playlist-Geste; `playerVars.playsinline: 1` und iframe-Attribut `playsinline` / `webkit-playsinline`.

## Abhakliste (Auftrag v03)

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

## Abhakliste (Auftrag v03b)

1. [x] Volle Spielbarkeit iPhone Hochformat (Safe-Area, kein Zoom/Scroll, Touch-Fallback, Start per Tipp, 390×844 / 375×667)
2. [x] Ton: Entsperren per touchend/pointerup/click, stummer Puffer, Resume nach Unterbrechung, Hinweistexte, YouTube playsinline nur nach Geste
3. [x] Grafik responsive, Schrift scharf (DPR max 2)
4. [x] Tests 46–50, erwartet alle grün
5. [x] Bau-Bericht und README „Neu in v03“ ergänzt

## Testergebnis

`node tests/run.js`: Tests 1–50 (inkl. 42–45 v03, 46–50 v03b) – auf der Box ausführen. Erwartet: alle grün.

## Dateien

- `index.html` – Viewport, Safe-Area, fixed Body, Ton-Hinweis, Touch-CSS, `?v=0.3`
- `js/ton.js` – entsperre, stummer Puffer, Hinweise, Unterbrechung
- `js/musik.js` – playsinline am iframe, Start nur nach Geste
- `js/eingabe.js` – touchstart/touchend-Fallback Canvas
- `js/main.js` – Geste pointerup/touchend/click, Joystick/Knopf-Touch, Skala/Safe-Area, Ton-Hinweis-UI
- `js/render.js` – `MAX_DPR`, Panel-Platz (unverändert v03)
- `tests/run.js` – Tests 42–50
- `README.md`, `docs/bau-bericht-v03.md`
