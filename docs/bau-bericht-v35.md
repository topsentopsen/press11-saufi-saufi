# Bau Bericht v35: Blasen, Passanten, keine Boombox

Basis: main f24529e, VERSION 0.34. gh-pages bleibt unangetastet.

## Sprechblasen

Vorher stand jede Blase fest 4,5 Sekunden. Jetzt `blaseDauer`: mindestens 7 Sekunden, plus 60 ms je Zeichen, höchstens 10 Sekunden. Der Shuffle-Bag bleibt. `blasenRahmen` und `bedienRects` schieben Blasen weiter neben die Bedienung. Zufallssprüche und freche Zeilen bleiben bei höchstens zwei gleichzeitig, und gezeichnete Boxen überlappen sich nicht.

## Stadt

Acht zusätzliche Fußgänger: Mira und Noa auf dem Gras, Lina und Cem joggen, Anna und Jonas gehen versetzt denselben Weg, Ernst ist langsam, Leila liefert aus. Kein Auto, kein extra Zufall. Das sind 26 statt 18 Stadtleben, also etwa 44 Prozent mehr.

## Boombox

Die v0.32-Boombox mit schwebenden Noten, `Musik.noten`, `Musik.macher` und `djAktualisieren` sind weg. Die Jukebox in Sophies Brauhaus bleibt und öffnet weiter die Playlist.
