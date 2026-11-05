# Bau Bericht v22: Namensschild, Blasen, Zeise

Basis: main, VERSION 0.21. Ziel: kein dauerhaftes Namensschild über Raphael, Sprechblasen etwas länger, Zeise ohne den Alle-Biere-Gag.

## Namensschild

`namensschild()` in `js/render.js` zeichnete eine cremefarbene Kachel mit dem Namen. Aufgerufen nur für Raphael: als NPC, wenn er steht und keine echte Blase hat, und als Spieler mit `?figur=raphael`. Tobi las das als Sprechblase, die immer nur „Raphael“ sagt. Im Scooter-Pool steht der Name nicht. Die Funktion und beide Aufrufe sind weg. Der goldene Spieler-Marker bleibt. Die Anwärter-Neckerei in `js/frech.js` bleibt, inklusive „Raphael bleibt Anwärter, bis er Gas gibt.“

## Sprechblasen

Eine gemeinsame Dauer `Saufi.Hinweise.BLASE_SEK = 4.5` (vorher 2,5 bis 3,5 Sekunden). Sie gilt für Scooter-Blasen, Frech, Motiv, Elon als NPC, S21-Freundesblase, „Runde kommt!“, „Ich hol 'ne Runde!“, Siebolds Trinkspiel und das Stadtvolk. Hinweis-Banner (`sag`) und Promille bleiben unverändert.

## Zeise

Titel auf der Karte: genau „Legendäres Gründungsmitglied“. Rolle bleibt „Der Vernünftige“, er geht weiter früher heim. Spruch, Plus-Zeile und README ohne „alle Biere“ / „mit allen Bieren gewaschen“ / „Kennt jedes Bier“.

## Version

VERSION 0.22, alle `?v=0.22`. Promille-Anzeige unverändert.
