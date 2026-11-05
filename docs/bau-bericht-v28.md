# Bau Bericht v28: Autos weg, Stadt dichter, Hochformat näher

Basis: main `c785324`, VERSION 0.27. Idee #19 und die Hochformat-Quick-Wins. Die Auswahl (Charakterkarten) bleibt im Code unangetastet.

## Stadt

In `js/stadtvolk.js` sind die drei Autos (`auto_strasse`, `auto_west`, `auto_sued`) und der Wrap-Wagen weg. `js/render.js` zeichnet kein Auto mehr.

Geblieben und etwas dichter: Frau Hilde (Tempo 15, kürzere Pause), Ute auf dem Halbhöhenweg, Jule, Samir und Nico, Mina und Levin, zwei Hunde, fünf Vögel (neu: über dem Bach), zwei geparkte Räder, das Rad am Südrand und ein Rad auf dem Südweg. Nichts davon zieht `S.rng`. Kein neues Fahrzeug in Autogröße.

## Hochformat, nur im Spiel

`WELT_FLAECHE_HOCH` ist `1.0` (Zoom 1.0, vorher 1.5 / Zoom etwa 0.82). Quer bleibt `4.0` / Zoom 0.5.

Linkes HUD bei Touch-Hochformat: `HUD_SK_HOCH_TOUCH` `0.96` (vorher `(54/62)*0.85`, etwa 0.74, rund +30 %).

Knöpfe und Stick wachsen nur mit der Klasse `spiel`, nicht auf der Auswahl:

- Stick-Basis 104×104 (vorher 80), Knopf 40 (vorher 30), Auslenkung 52 (vorher 40).
- Aktion 94×73 (vorher mindestens 72×56). Wasser mindestens 73×58. Item und F 58.
- Die Oben-Knöpfe bleiben 44. Größer würden sie das linke HUD schneiden.
- Bedienleiste im Spiel 124–180 CSS-px bei 18 % der Höhe (Auswahl bleibt 96–140 bei 14 %).

Safe-Area: das Padding am Body bleibt das eine Inset. `#rahmen.touch.hoch #touch` und `#stick` rücken nicht noch einmal mit `env(safe-area-inset-*)` ein.

## Zoom

Plus und Minus stehen rechts, unter den Oben-Knöpfen, 56×56. Sichtbar nur in `#rahmen.spiel` ohne Overlay und ohne Ende. Stufen `0.75, 0.88, 1, 1.15, 1.30, 1.45` als Faktor auf den Layout-Zoom. Default `1`, also Hochformat-Zoom 1.0. Unter `MIN_WELT_ZOOM` 0.5 geht es nicht. Die Stufe liegt unter `saufi.zoomFaktor`.

`VERSION` ist `0.28`. Alle `?v=0.28` in der Wurzel-`index.html`.
