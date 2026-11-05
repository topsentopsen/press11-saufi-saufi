# Bau Bericht v12: Steuerung wie Finca

Basis: v11. Plan von Claude (nur Lesen), Umsetzung von Grok.

## Ursache Handy Problem
- updateSpiel las E.klicks() nie aus. Taps im laufenden Spiel wurden von E.ende() verworfen, auf Handy und Desktop.
- #stick (50 % breit, volle Höhe, pointer-events:auto) lag im Querformat über der linken Canvas Hälfte und schluckte Taps.

## Umsetzung
- js/main.js: weltPunkt, tippZiel, tippeWelt, tippAchse, kurzesterWeg, freieNachbarn, stoppeTippWeg. Wegsuche über Saufi.Pfad.suche, Bewegung über Saufi.Spieler.bewegung (Pegel Wackeln und Boost bleiben).
- Neuer Tipp ersetzt das Ziel, Tasten oder Joystick brechen ab, festgefahren: einmal neu planen nach 1,5 s.
- Ankunft an Station löst aktion(S, X, station) aus, liegender Kumpel wird geweckt. Sitzen: erster Tipp steht auf.
- Joystick: kurzer Tipp (unter 10 px, unter 350 ms) wird an die Welt weitergereicht.
- js/render.js: S.weltSicht für die Umrechnung, Zielmarker (gelb, rot mit X für nicht erreichbar).

## Tests
- Unit Tests 141 bis 148 neu (Umrechnung, A* Lauf, unerreichbar, Tastenabbruch, Tresen Tipp, nah und sitzend, Wecken, Overlay, Joystick Weiterleitung).
- Chrome Check nacht.mjs: echter Touch Tap rechts und links in hoch, hoch-se und quer, Tipp auf Station öffnet Menü.
