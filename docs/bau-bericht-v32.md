# Bau Bericht v32: Kotzen, Boombox, Mäxle, Daumen

Basis: main mit VERSION 0.30. gh-pages bleibt unangetastet.

## Kotzen

Ab `KOTZ_AB` 3,0. Pose 1,7 s, Fleck 12 s, Pause 18 s. Umfallen erzwingt einen Schub auch in der Pause. Der Fleck hängt an der Weltposition und verblasst über `rest/dauer`. Kein `S.rng`.

## Boombox

`Musik.noten` zeichnet drei Noten per Sinus. `Musik.macher` nennt den NPC an Jukebox oder Disko-Bar, sonst die Spielfigur. `S.musikAus` blendet sie aus.

## Hände

`NPCs.haendeHoch` nur in der Stadt und nur im Lauf. Die Phase hängt am Namen. Rückgabe 0 oder 1, kein Array, kein Zufall.

## Sprechblasen

Shuffle-Bag je RNG und Pool (Scooter, Elon). Die Mischung läuft über einen eigenen Mulberry, `spruch` verbraucht weiter genau zwei Züge. Am Zyklusende rückt die erste Zeile weg, wenn sie die letzte des vorigen Durchgangs war.

## Prost

In `Minispiele.update` setzte ein Treffer die Phase auf `warte` und wurde danach als Fehlstart überschrieben. Derselbe Frame, der das Fenster öffnete, hat den Druck geschluckt, weil der `else if` nicht mehr lief. Beides ist getrennt: Treffer schreibt den Ortsruf und zählt, Fehlstart nur wenn das Fenster noch zu ist.

## Probst

Die Chance bleibt 25 % plus 15 %. Das Menü zeigt beide Prozente und die Folge (doppelte Runde, Team −2, `PROBST_STAND` 25), bevor der Tausch passiert. Ohne ihn am Tisch bleibt der Wirt und der Standfestigkeits-Abzug fällt weg.

## Mäxle

Kein Alias mehr. Rang: Mäxle 21, dann Pasche 66…11, dann 65…31. Siebold zweifelt Mäxle immer und sonst, wenn die Ansage über `70 + Wurf * 30` liegt. Verlieren gibt 0,15 Promille Trinkstrafe. Dampfhammer und Sinnlos bleiben Aliase und sagen das.

## Handy

`mobilErkannt` ist wahr bei Touch, `pointer: coarse` oder kurzer Seite ≤ 480 und langer Seite ≤ 960. Die Klasse `daumen` setzt E auf 96 px und Wasser auf 88 px im Bogen unten rechts. Das Rundenbanner im Hochformat-Touch ist `x = 0`, Breite `W`, `y = 44`, damit es die Knöpfe oben nicht schneidet. Querformat und Desktop-CSS bleiben.
