# Bau Bericht v27: Gag-Alias, Shot-Train, Prost-Ort, Krug-Halten

Basis: main `f1bbd57`, VERSION 0.26.

## Gag-Alias

Mäxle, Dampfhammer und Sinnlos saufen bleiben im Tresen-Menü. Sie spielen weiter Reaktions-Prost, Maßkrugstemmen und Bierdeckel-Flip. Titel, Untertitel, Hinweis und Belohnung sagen `Gag-Alias` und `eigentlich dasselbe`. Siebolds Ansage nutzt dasselbe Menü-Label.

## Disko Shot-Train

Neues Minispiel nur bei `ort === 'disko'`, an der Bar. Zwei bestätigte Kurze in fünf Sekunden, mit kurzer Schluck-Sperre dazwischen. Ein Kurzer reicht nicht. Läuft die Disko-Runde mit genau zwei Kurzen, steht derselbe Zug zusätzlich am Stammtisch und zählt bei Erfolg als Mittrinken. Die Drei-Kurze-Runde bleibt der normale Tisch.

## PROST je Ort

`Hinweise.prostFuer` liefert Ruf und Prompt für Hotel (Jaz), Kneipe (Sophie), Disko (Untergrund) und Gasthaus (Maultäschle). Mittrinken, der heimliche Tausch und die Spontanrunde nutzen den Ruf des aktuellen Orts. `Ton.prost(art)` spielt dazu einen eigenen Klang. `PROST[0]` bleibt `PROST!`.

## Krug-Halten

Maßkrugstemmen ist dasselbe Minispiel. E füllt bis Kraft 0,70. Danach zählt nur noch gedrückt halten. Das Fenster ist 1,00–1,04 und muss 0,55 Sekunden gehalten werden. Reines Tippen oder Durchhalten kippt den Krug. Der Aktionsknopf hält mit, solange der Finger drauf bleibt.

`VERSION` ist `0.27`.
