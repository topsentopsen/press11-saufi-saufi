# Bau Bericht v34: Rauch und Popup an der Parkgruppe

Basis: main ba0af55, VERSION 0.33. gh-pages bleibt unangetastet.

## Rauch

Über Jule, Samir und Nico (Station `park_joint`) steigen ständig kleine Wölkchen. Vier Stück, fest, aus der Zeit gerechnet, ohne `S.rng`. Jedes zieht nach oben, driftet etwas seitlich und wird dabei durchsichtiger. Gezeichnet nach der Tönung, zwei Kreise pro Puff, Alpha höchstens 0,4. Liegt die Gruppe außerhalb des Bilds, wird nichts gezeichnet.

## Popup

Dieselbe Zeichenfunktion wie der Hinweis über einem liegenden Freund (`zeichneAktionsPopup`: weiß, Kontur, 64×12). Sichtbar, sobald der Spieler in `NAH_PX` an Jule, Samir oder Nico steht. Text: „Joint erhalten“. Der wippende Pfeil bleibt. E spricht weiter der Reihe nach eine der drei Zeilen. Es wird kein Item ins Inventar gelegt. Knöpfe und die Rucksack-Position (Item y 100) bleiben.

## HUD oben

Die Rundenleiste ist schmaler als die Uhr und nur noch 9 bis 10 Pixel hoch. Sie sitzt mit zwei Pixel Abstand direkt unter der Uhr, der Pegel darunter. In der Uhr stand „Sa · Mo“: die ersten zwei Buchstaben des Tags plus die Kürzel der Tagesphase. „Mo“ hieß Morgen, las sich aber wie Montag. Jetzt steht dort nur „Samstag“ oder „Sonntag“. Die Uhrzeit bleibt daneben.

## Bing

`Ton.bing` ist ein kurzer Sinus-Zweiklang. `fx()` spielt ihn nicht, wenn der Ton stumm ist oder der Kontext fehlt. Er kommt nach gelungenem Trinken, Joint, Prost, Essen, Fund, Wecken und bestandenem Minispiel. Ein Fehlgriff oder ein verlorenes Minispiel bleibt ohne Bing.
