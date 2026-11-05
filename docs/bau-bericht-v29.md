# Bau Bericht v29: Handy hochkant, Leiste über der Welt

Basis: main `47ea45c`, VERSION 0.28. Die Diagnose zum Screenshot: die Welt war nicht auf 176 px zusammengefallen. `weltH` ist weiter `min(H − Reserve, Stadthöhe × Zoom)`, und Touch füllt eine Lücke auf `H − Reserve`. Der blaue Streifen war die 80er-Reserve plus die Bedienleiste (`#1b1530`). Die Höhenformel bleibt. Geändert hat sich, wohin die Reserve und die Knöpfe gehen.

## Layout, nur im Spiel

`UI_RESERVE_HOCH_TOUCH` ist `0`. Ohne Touch bleibt die Reserve `80`. Im Spiel zieht `--bedien` die Canvas-Höhe nicht mehr ab; die Leiste ist `position: absolute` und fast durchsichtig über der Welt. Die Auswahl behält den festen Streifen und damit ihre Canvas-Höhe.

E und Trinken stehen unten rechts auf der Welt (80 px, Trinken mit Schrift). F und Item liegen in einer Reihe darüber (56 px). Die Versionszeile sitzt in der Ecke darunter. Zoom ist links (`left: 8px`, `top: 156px`), damit die Jukebox hinten rechts in Sophies Brauhaus tippbar bleibt.

Uhr, Tagesphase, Sterne und das Rundenbanner liegen oben links der Oben-Knöpfe. Das Pegel-Panel rückt darunter. Hinweise, „ist heim“ und die Stimmungswarnung sind Karten über der Teamleiste. Die Teamleiste zeigt fünf Stimmungsmarken und die Köpfe; wer weg ist, ist grau mit Häuschen. Die Kamera schiebt den Spieler im Spiel etwas nach oben (`daumenFrei`), damit der Daumen ihn nicht verdeckt.

## Knöpfe und Menüs

Trinken (`#knopf-wasser`) ist im Spiel 80×80 px, Schrift 15 px. Aktionsmenüs und Minispiele im Hochformat-Touch sind ein Bottom-Sheet: erste Aktion über die volle Breite, der Rest Kacheln von mindestens 64 CSS-px. Querformat, Playlist, Hinweis und die Charakterauswahl bleiben beim bisherigen Panel.

## Texte

Intern bleiben `fig.verloren` und `Runden.verloren`. Auf dem Schirm:

- Teamstimmung 0: Titel „Feierabend“, Kopf „Die Truppe ist ohne dich weitergezogen.“, Grund „Teamstimmung 0 – die anderen sitzen schon im Taxi.“
- „X geht früher nach Hause.“ wird zur Karte „🚕 X ist heim. Noch N von M dabei.“
- Stimmung 1: gelbe Karte „Stimmung kippt! Nächste Runde mittrinken, sonst zieht die Truppe ohne dich weiter.“ Das Wort „Feierabend“ bleibt dem Rauswurf im Lokal. Einmal vibrieren, falls das Gerät das kann.
- Press F: Meme oben, untere 40 % sind die Tippfläche. Mit zweitem Leben „Tipp schnell: wieder aufstehen!“, sonst „Das war's für heute. Tipp für Respekt.“
- Ende im Hochformat-Touch: Sheet unten mit „Nochmal raus“. Kein Link auf die Feedback-Seite, die bleibt getrennt.

`VERSION` ist `0.29`. Alle `?v=0.29` in der Wurzel-`index.html`.
