# Bau Bericht v36: Verstecke, Park-Joint, Straßenjoints

Basis: main 7e7a390, VERSION 0.35. gh-pages bleibt unangetastet.

## Der Park-Bug

„Joint erhalten“ war nur gezeichneter Text. Er erschien, sobald man bis zu 56 Pixel an Jule, Samir oder Nico herankam. Der Knopf E sucht aber nur die nächste Station im Umkreis von 14 Pixeln.

Auf Samirs Kachel (10, 33) lag der Bierkasten der Teichbank, mitten in der Station `park_joint`. Bei gleichem Abstand gewinnt die später eingetragene Station. E zapfte also Bier, oder traf daneben eine Bank, und die Gruppe kam nicht dran. Selbst wenn E die Gruppe traf, lief nur eine Sprechblase (`parkSpruch`). `Joint.nimm` wurde nie aufgerufen. Der Rucksack blieb leer.

Jetzt liegt der Kasten nördlich der Bank, nicht mehr auf der Gruppe. Das Popup erscheint nur, wenn E auch wirklich die Gruppe trifft, und nur solange der Joint von dort noch nicht im Rucksack ist. E spricht weiter eine Zeile und legt den Joint dazu. Bing wie bei den anderen Fundsachen. Die Dicke Tüte im Hotel bleibt ein eigener Fund.

## Verstecke

Vier Bierkästen, drei Schnapsflaschen und zwei Joints liegen fest in Ecken und auf Wiesen, ohne wippenden Pfeil. Nah dran kommt das gleiche Popup wie an der Parkgruppe. E hebt auf. Bier trinkt ein Pils, Schnaps einen Kurzen, der Joint ist dasselbe Spiel-Item wie die Dicke Tüte. Weg ist weg. Volle Hände lassen den Joint liegen.

## Straße

Drei weitere Joints liegen auf Straße, Weg, Gehweg oder Asphalt. Der Karten-Zufall bleibt unangetastet, die Stellen hängen an einem eigenen Seed. Dieselbe Runde findet sie immer an denselben Flecken. Nicht direkt vor der Haustür und nicht auf einer Türschwelle.

Keine Autos. Zoom und HUD bleiben, wo sie sind.
