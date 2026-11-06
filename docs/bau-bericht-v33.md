# Bau Bericht v33: HUD unten, Pfeile, Parkgruppe

Basis: main 6006cba, VERSION 0.32. gh-pages bleibt unangetastet.

## E-Hinweis

`S.hilfe`, das mit `E:` beginnt, wird nicht mehr gezeichnet. Der Aktionsknopf bleibt. Auf dem Handy zeigt er im Leerlauf weiter die Hand, daneben den Aktionstext, sobald eine Station in Reichweite ist. Die Scooter-Leiste sagt „tanzen“, ohne E.

## Crew und Knöpfe

Die Crew-Leiste liegt auf der Canvas-Unterkante (`CREW_CSS` 36). Wasser und Hand sind beide 96 px, `bottom: 0`, Abstand 8 px, und sitzen über der Leiste (`--crew` plus 8 px). Stick und „ziehen“ rücken um dieselbe Höhe hoch. Die Safe-Area bleibt das Body-Padding. Ein zweites `env(safe-area-inset-bottom)` an der Leiste würde sie doppelt anheben.

## Sprechblasen

Gesammelt in der Welt, gezeichnet nach `hud` und vor Menüs. `bedienRects` nennt Uhr, Promille, Banner, Crew, Zoom, Stick und die beiden Knöpfe. Überlappt eine Blase so ein Rechteck, rückt sie daneben, nicht darauf.

## Aktionspfeile

Vorher hatte kein Aktionspunkt einen eigenen wippenden Pfeil. Bierkästen waren nur das Kastensprite. Der einzige nach unten zeigende Wipper war der Rundennavigationspfeil und das kleine Dreieck über der Spielfigur. Jetzt bekommt jede Station und jede Stadtfigur denselben Pfeil. Die Dicke Tüte und die Wasserflasche verlieren ihn, sobald sie aufgehoben sind.

## Park

Jule, Samir und Nico im Südpark waren Stadtleben, kein Aktionspunkt, unmarkiert. Die Dicke Tüte liegt im Hotel, nicht im Park. Neu: Station `park_joint` (Typ `jointgruppe`, Kacheln 7,33 Größe 5×2). E spricht der Reihe nach eine der drei Zeilen als Sprechblase. Ein Pfeil über der Gruppe.
