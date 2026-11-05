# Bau Bericht v21: Stadt-Look und Stadtvolk

Auftrag Tobi, 05.11.2026: mehr Stadt, weniger Wiese. Gehweg, Asphalt, Häuserblöcke und mehr Laternen. Südpark, Südhain, Rebenhang und der Motocross-Park bleiben grün. Dazu drei feste Stadtfiguren, die nicht zur Truppe gehören: der Wirt in Sophies Brauhaus, Kalle vom Bänkle auf der Bank am Markt, die Rezeptionistin im Jaz. Antippen oder E zum Quatschen. Keine Kinderfiguren, keine Gedankenstriche in den neuen Texten.

Basis: main `5e1efb0`, VERSION 0.20. Option B aus dem Bauplan plus Stadtvolk. Kartengröße, Orte und die rng-Reihenfolge in `erstelleStadt` bleiben.

## Diagnose (gemessen, Seed 1, v20)

Die Karte startet als Gras (`neueKarte(..., T.GRAS)`). Bäume und Büsche liegen nur auf Gras, Wege sind sandbeige, ab y40 lagen Beete, Heuballen, Zaun und ein zweiter Teich im Hintergrund.

| Kachel | Anzahl |
|---|---|
| GRAS | 1020 |
| BAUM | 184 |
| BUSCH | 103 |
| GRAS+BAUM+BUSCH | 1307 von 2400 (54,5 %) |
| REBEN | 198 |
| STRASSE | 80 |

Grün (Gras, Baum, Busch) nach Bändern: y7..29 = 466, y30..47 = 454, y48..59 = 376.

## Nach dem Umbau (gemessen, Seed 1, v21)

`urbanisiere` läuft nach `baueS21` und nach allem rng-Verbrauch. Sie ersetzt nur GRAS, BAUM und BUSCH.

| Kachel | Anzahl |
|---|---|
| GRAS | 179 |
| BAUM | 64 |
| BUSCH | 20 |
| GRAS+BAUM+BUSCH | 263 von 2400 (11,0 %) |
| GEHWEG | 597 |
| ASPHALT | 64 |
| HAUS | 369 |
| Laternen | 35 (vorher 21, plus 14) |
| REBEN | 198 (unverändert) |

## Neue Tile-IDs und Zonen

| ID | Name | Blockiert |
|---|---|---|
| 16 | GEHWEG | nein |
| 17 | ASPHALT | nein |
| 18 | HAUS | ja |

Häuserblöcke: West- und Ostzeile (0,7,2×6), (31,7,6×4), (37,7,3×6); Mitte (1,17,8×3), (14,17,10×3); südlich vom Fluss (1,25,9×3), (14,25,10×3), (37,25,3×3); Süden (1,40,10×3), (14,40,10×3); ganz unten (1,50,8×3), (1,55,8×3), (18,54,6×3), (27,50,6×3), (34,50,5×3), (27,55,12×3).

Asphalt-Querstraßen: y30 von x0..24 und x26..39, y43 von x0..24.

Gehwege in den übrigen Stadtbändern. Grün bleiben Südpark samt Rand, Südhain, Motocross-Innenfeld, Rebenhang, Baumallee y47 und Randzeile y59. Deko nur noch auf Gras. Innenstadtwege neben Gehweg, Asphalt oder Haus werden grau gezeichnet, Weinbergwege bleiben sandig. Fassadenfenster leuchten nachts. Heuballen und Beete sind weg.

## Stadtvolk

| id | Karte | Kachel | Ansprech-Kachel | belegt |
|---|---|---|---|---|
| wirt | kneipe | (5,2) | (5,4) | ja |
| penner | stadt, Bank `bank_markt_b` | (18,9) | (18,10) | Bank blockiert schon |
| rezeption | hotel | (3,2) | (3,4) | ja |

Neue Station `rezeption` an der Hoteltheke, nicht im Schwarm. Figuren stehen fest, trinken nicht, haben keinen Pegel und ziehen kein `S.rng`. Nähe spricht von selbst (eine Blase, dann Pause). Tipp oder E ohne Station: Quatschen. Theke, Bank am Markt und Rezeption hängen eine Reaktionszeile an die bestehende Aktion.

## Tests

- Versionen in den Bestandstests von 0.20 auf 0.21. Promille-Werte `0.20` in den Pegeltests bleiben.
- `js/stadtvolk` in der Dateiliste des Testläufers, Script-Tag in `index.html`.
- Neu: 224 Versionen, 225 Stadt-Look, 226 urbanisiere ohne rng, 227 Stadtvolk-Daten, 228 Render, 229 Interaktion.

## Bewusst nicht geändert

- Kartengröße 40×60, Türen, Gebäude, Stationen, Spawn (25,13), Brunnen, Markt, Fluss, Brücken, Stäffele, Rebenhang.
- Motocross-Park und S21.
- Truppe und `npcs.js`, Scooter-Pools, Rede-Regeln (Bundschuh und Tobias ohne Scooter, Tobias nur Elon, Raphi nur Anwärter, Siebold Trinkspiele, Schwinki ohne Schwäche, Zeise früh, vernünftig, Gründungsmitglied).
- Türsteher in der Disko.
- `WELT_FLAECHE_HOCH` 1.5, Querformat, Zoom, Kamera.
- Musik, Audio-Optionen 6 bis 10, 12 und 14.
- rng-Reihenfolge in `erstelleStadt`.
- Innenräume außer den zwei belegten Plätzen und der Station `rezeption`.
- Hotelname bleibt `Jaz`. "Jazz in the City" steht nur im Bericht v13.

## Abweichungen vom Plan

- `erstelleStadt` ruft `Saufi.Karte.urbanisiere` auf, damit ein Test den Nachlauf durch eine leere Funktion ersetzen kann. Die Funktion selbst zieht kein rng.
- Tobis stehende Mütze bleibt die bisherige Kappe. Die rote Wollmütze `#b03a3a` mit Bommel gilt, wenn die Figur sitzt (Kalle).
- Die Reaktionszeilen bleiben bei zwei und drei Sätzen, wie im Plan aufgeschrieben. Die Längenprüfung 6 bis 12 gilt für die Spruchpools.
- Test 125 suchte Heuballen im Hintergrund-Cache. Der Cache zeichnet jetzt `stadtDeko`. Die Zoom- und rng-Prüfungen des Tests bleiben.
- Die Bank-Aktion im Test stellt den Spieler auf die Kachel vor Kalle (18, 10). `geheZuStation` landet sonst oft auf dem Bierkasten daneben.
