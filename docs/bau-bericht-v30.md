# Bau Bericht v30: Handy hochkant, Quick Wins

Basis: main `9b5ce70`, VERSION 0.29. Die Quick Wins aus dem Hochformat-Review, ohne Auswahlbildschirm, ohne dritten Knopf, ohne Endscreen-Feedback, ohne neue Stick- oder Zoom-Formel, ohne Querformat-Umbau.

## Oben

`btnBandCss` zählt die sichtbaren Knöpfe: `n * 44 + (n - 1) * Abstand + 8`. Im Hochformat-Spiel sind das zwei Knöpfe mit 6 px Abstand, die Uhr endet davor, die Sterne bleiben sichtbar. Ton öffnet drei Zeilen (Musik, Effekte, Scooter-Playlist). Das Menü enthält Info, Version, Playlist-Fenster und entweder Vollbild oder den Hinweis „Zum Home-Bildschirm“. Der Vollbild-Knopf bleibt nur, wenn `requestFullscreen` auf dem Rahmen existiert. Dazu `apple-mobile-web-app-capable` und ein Mini-Manifest mit `display: standalone`. Die Tasten N, M und P bleiben. Die Auswahl zeigt weiter die fünf Knöpfe.

## Unten und Karte

Die Promille-Karte im Hochformat-Touch hat zwei Zeilen: Krug mit Promille in 11 logischen px, darunter die Herzen. Teamstimmung und Wasser stehen dort nicht mehr. Der Streifen unten heißt Crew, volle Breite, dunkles Band, fünf Krüge für die Stimmung, Köpfe mit mindestens 16 CSS-px. Shirtfarbe, Häuschen wenn jemand heim ist. Passt es nicht, kommt ein `+N`.

Der Wasser-Knopf zeigt „💧 Wasser ×3“, bei null Flaschen „💧 leer“. Auf dem Touch-Knopf steht im Leerlauf „✋“, sobald etwas geht das Kontextwort mit kurzem Puls. „E“ bleibt der Desktop-Hinweis und die Taste.

## Optik, nur im Spiel hochkant

Zoom ist eine Pille 44×92 links unter der Karte, Hintergrund 75 %, Rand 2 px. Der Stick zeigt im Ruhezustand den 104-px-Kreis bei 18 % an der Standardposition, in der ersten Minute das Wort „ziehen“. Anzeigen (Uhr, Promille-Karte) sind Creme mit 88 % und 1 px Rand, Knöpfe behalten den vollen Rand und den Schatten nach unten. Die Version sitzt im Menü und im Hinweis, nicht mehr unten rechts. `#rahmen.touch.hoch.spiel` hat keinen Neon-Rahmen.

`VERSION` ist `0.30`. Alle `?v=0.30` in der Wurzel-`index.html`.
