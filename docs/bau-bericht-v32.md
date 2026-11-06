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

In `Minispiele.update` für `prost` setzte ein Treffer die Phase auf `warte` und wurde danach als Fehlstart überschrieben. Derselbe Frame, der das Fenster öffnete, hat den Druck geschluckt, weil der `else if` nicht mehr lief. Beides ist getrennt: Treffer schreibt den Ortsruf und zählt, Fehlstart nur wenn das Fenster noch zu ist.

Drei von zehn Fenstern (`istProbstFalle`) zeigen `PROBST!`. Ein Druck darauf zieht einen Punkt ab und setzt die Blase „Des war dr Probst, ned s'Prost!“.

## Probst

Die Chance bleibt 25 % plus 15 %, solange er zuschaut. Das Menü zeigt beide Prozente und die Folge (doppelte Runde, Team -2, `PROBST_STAND` 25). Solange `Hecke.aktiv` ist, geht `tausche` mit `probstDa = false` raus. Die Einblendung heißt: „Probst steckt in der Hecke. Himmelsbach filmt. Jetzt tauschen, für die Gruppe.“

## Mäxle

Kein Alias mehr. Rang: 31…65, dann Pasch 11…66, dann Mäxle 21. Menü: ansagen, bluffen, anzweifeln. Wer beim Aufdecken falschliegt, trinkt. Ein gewürfeltes Mäxle lässt alle trinken. `bluffRate`: Siebold 0, Himmelsbach 1, Probst behauptet Mäxle und guckt auf den Boden. Dampfhammer und Sinnlos bleiben Aliase.

## Handy

`mobilErkannt` ist wahr bei Touch, `pointer: coarse` oder kurzer Seite ≤ 480 und langer Seite ≤ 960. Die Klasse `daumen` setzt E auf 96 px und Wasser auf 88 px im Bogen unten rechts. Das Rundenbanner im Hochformat-Touch ist `x = 0`, Breite `W`, `y = 44`, damit es die Knöpfe oben nicht schneidet. Querformat und Desktop-CSS bleiben.
