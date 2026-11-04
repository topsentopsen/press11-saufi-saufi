# Press11 - Saufi Saufi

Fiktives Spaß-Spiel für Erwachsene (**ab 18**). Öffentliches Repo, spielbar unter [GitHub Pages](https://topsentopsen.github.io/press11-saufi-saufi/).

Samstag, 08:00, Stuttgart im Kessel. Du bist Tobi und willst bis Sonntag 04:00 nicht nur durchhalten, sondern noch stehen. Zu jeder Mittrunde musst Du am Stammtisch sein, dazwischen isst Du, holst Wasser und mogelst Dich durch. Das Licht wandert von grün-sonnig bis tiefschwarz mit leuchtenden Fenstern und Neon. Reines JavaScript, Canvas, alles per Code gezeichnet, kein Build, nichts zu installieren.

## Neu in v03

- Handy-Optimierung Hoch- und Querformat: `viewport-fit=cover`, Safe-Area, `100dvh`, kein Scrollen/Zoomen.
- Skalierung: Hochformat logisch 320×400 (Spielfeld oben, Bedienung unten), Quer volle Breite; Schrift auf Touch ≥ ~11 CSS-px.
- Touch-Ziele ≥ 44 CSS-px; Menü-/Jukebox-Zeilen auf Touch höher; Joystick links unten, Aktionen rechts unten.
- Joystick-Zone schluckt keine Overlay-Klicks mehr (`pointer-events` bei Overlay und ohne Touch aus).
- Jukebox/Menüs passen in beide Orientierungen (kürzen statt abschneiden); YouTube auf dem Handy klein oben, bei Overlay aus.
- `devicePixelRatio` auf max. 2 begrenzt (Performance).
- **iPhone/Safari (v03b):** `position:fixed` + `-webkit-fill-available`, Doppeltipp-Zoom aus, Touch-Fallback (`touchstart`/`touchend`, `passive: false`) für Joystick und Knöpfe; Start per Tipp.
- **Ton auf iOS:** AudioContext erst bei `touchend`/`pointerup`/`click`, stummer 1-Sample-Puffer, Resume nach Unterbrechung; Hinweis „Tippen für Ton“ / einmalig „Kein Ton? Stummschalter am iPhone prüfen“. YouTube nur nach Geste, `playsinline`.

## Neu in v02

- Schärfere Grafik (hohe Canvas-Auflösung × DPR), lesbare Schriften (mind. ~11 px logisch).
- Jukebox/Playlist und alle Menüs: Esc, X, Klick daneben; Songwahl schließt das Overlay (Bewegung wieder frei).
- Teamstimmung 0: eigener Endtitel („Die Truppe hat dich abgehängt“), nicht „Press F/Umgefallen“.
- Mehr Humor (MS-Marathon-Stil), Sprüche-Pools je Figur/Ort/Pegel, max. 2 Sprechblasen.
- Saufpannen & Mitspieler-Gags (Freund stützen, Hose weg, …), pegelgestuft.
- Drei Trinkspiel-Minispiele an Tresen/Bar (Bierdeckel-Flip, Reaktions-Prost, Maßkrugstemmen), abbrechbar.
- Titel ohne „privat“; Hinweis 18+ bleibt.

> Alle Personen, Orte, Getränke und Werte sind erfunden. Die Promille-Anzeige ist nur ein Spielelement. Das Spiel ruft nicht zum Trinken auf. Trink im echten Leben nur, was Du verträgst, setz Dich nie betrunken ans Steuer und pass auf Deine Freunde auf. Der "Joint" ist nur ein Spiel-Item.

## Starten

**Variante 1: Doppelklick.** `index.html` im Browser öffnen (file://). Alles außer der YouTube-Einbettung funktioniert so.

**Variante 2: lokaler Server** (nötig für die YouTube-Einbettung, siehe Musik):

```
cd press11-saufi-saufi
python3 -m http.server 8000
```

Dann im Browser <http://localhost:8000> öffnen.

Am Startbildschirm Hinweis 18+ bestätigen (E, Enter, Leertaste oder Tippen).

## Steuerung

| Aktion | Tastatur | Touch |
|---|---|---|
| Bewegen | Pfeiltasten oder WASD | Joystick links unten (erscheint dort, wo der Daumen aufsetzt) |
| Aktion (Tür, Bestellen, Essen, Prost, Tanzen) | E, Leertaste oder Enter | runder Knopf rechts unten |
| Press F (Aufstehen / Respekt) | F | Knopf "F" beim Umfallen |
| Wasser trinken / Freund wecken | Q | Knopf "Wasser" |
| Item (Dicke Tüte, Scooter-Boost) | R | Knopf "R" (nur wenn etwas da ist) |
| Scooter-Playlist | P | Knopf ♫ oben rechts |
| Ton an/aus | M | Knopf ♪ |
| Pause / Menü | Escape | – |
| Menüs | Pfeile hoch/runter, E; Tasten 1 bis 3; Antippen | Antippen |
| Debug-Anzeige | ^ (Taste links neben der 1) | – |

Handy: Hoch- und Querformat. Joystick links unten, Aktion/Wasser rechts unten (Safe-Area). Oben rechts: Scooter-Playlist, Ton, Vollbild und Info (Hinweis 18+).

## Spielziel

- Sieg: Um **04:00** stehst Du noch (Standfestigkeit über 0 und Teamstimmung über 0). Eine Runde dauert ca. 12 Minuten (36 Sekunden pro Spielstunde).
- Niederlage: Du fällst um und hast kein zweites Leben, die Teamstimmung fällt auf 0 (alle gehen heim) oder Du bekommst dreimal Hausverbot an der Disko-Tür (Pegel über 2,5).
- Vier Orte: Hotel Kesselblick, Gasthaus Maultäschle, Zum durstigen Dachs, Untergrund 07. Alle mit eigenen Öffnungszeiten (Hotel immer, Gasthaus 11:00 bis 23:00, Kneipe 14:00 bis 03:00, Disko 22:00 bis 04:00).
- Sechs feste Mittrunden (10:00 Hotel, 12:30 Gasthaus, 15:30 Kneipe, 19:30 Gasthaus, 22:30 und 01:30 Disko). Eine Stunde vorher gibt es eine Warnung, nach dem Ausruf hast Du ca. 20 Sekunden Echtzeit, am Stammtisch zu stehen. Mittrinken, heimlich gegen Alkoholfrei tauschen (Risiko erwischt zu werden, höchstens 3 pro Runde) oder ablehnen (Strafe).
- Essen senkt den Pegel und stärkt, Wasser hilft, Freunde die umfallen kannst Du mit Wasser wecken (Q).
- Disko: im Takt tanzen füllt die Scooter-Leiste, bei voller Leiste zündet R den Boost für die ganze Truppe (Verluste halbiert, schneller).
- Punkte gibt es fürs Durchhalten, nicht für die Menge. Medaillen: Bronze (Standhaft), Silber ab 1000 (Eiserner Saufi), Gold ab 1500 (Kesselkönig/-königin). Der Bestwert wird lokal gespeichert.

## Musik

Es gibt drei Quellen, in dieser Reihenfolge (die erste, die geht):

1. **Eigene MP3s** aus dem Ordner `music/` (falls eingetragen), abgespielt per `<audio>`.
2. **YouTube-Einbettung** (nur Einbetten, nichts wird heruntergeladen) mit vier Videos von Tobi: "Scooter - Hyper Hyper", "Scooter - The Logical Song (Official Video)", "Scooter - One (Always Hardcore) (Official Video HQ)" und "Scooter - How Much Is the Fish?". Die Liste steht in `music/playlist.js` (`Saufi.YOUTUBE`); ein weiteres Video trägt man dort als neue Zeile `{ id: 'VIDEO_ID', titel: 'Scooter - Titel' },` ein (ID = Teil nach `youtu.be/`). Sie startet über den Knopf **Scooter-Playlist** (Menü, Pause-Menü, Jukebox in der Kneipe, Taste P) und danach automatisch in der Diskothek und beim Scooter-Boost (Hyper Hyper). Das Video läuft in einem kleinen, ein-/ausklappbaren Fenster unten links (sichtbar, 220×124). Eingeklappt wird pausiert.
3. **Eigener Hardstyle** per WebAudio (150 BPM, Fis-Moll, Kick, Bass, Hyper-Synth) als Fallback. Er läuft sonst immer im Hintergrund und wandelt sich mit der Tageszeit.

Die Scooter-Titelliste im Spiel ist nur Text (Hyper Hyper, Move Your Ass!, How Much Is the Fish?, Maria (I Like It Loud), Nessaja, The Logical Song, Weekend!, Jigga Jigga!, One (Always Hardcore), Posse (I Need You on the Floor), Fire). Dazu kommen Text-Einblendungen wie "HYPER HYPER!" und "HOW MUCH IS THE FISH?".

**YouTube geht nur über http://localhost**, nicht über file://. Bei file://, ohne Internet oder bei einem Player-Fehler schaltet das Spiel sauber auf die nächste Quelle um und zeigt kurz einen Hinweis. YouTube wird erst geladen, wenn Du den Knopf "Scooter-Playlist" benutzt hast (die Wahl wird gemerkt).

### Eigene MP3s eintragen

1. MP3-Dateien in den Ordner `music/` legen, zum Beispiel `music/hyper-hyper.mp3`.
2. In `music/playlist.js` eintragen:

   ```js
   Saufi.MUSIK = [
     { datei: 'music/hyper-hyper.mp3', titel: 'Hyper Hyper' },
     { datei: 'music/the-logical-song.mp3', titel: 'The Logical Song' }
   ];
   ```
3. Seite neu laden. Sobald die Liste nicht leer ist, haben diese Lieder Vorrang vor YouTube. Beim Scooter-Boost wird ein Titel mit "hyper" im Namen bevorzugt. Läuft eine Datei nicht, geht es mit der nächsten Quelle weiter.

`music/playlist.js` ist ein normales Script und funktioniert auch per Doppelklick. Im Repo liegt keine MP3, `.gitignore` ignoriert `music/*.mp3`.

## Test- und Debug-Haken

- `?tempo=N`: die Uhr läuft N-mal schneller (zum Beispiel `?tempo=10`).
- `?seed=N`: fester Zufall (Karte, Heimlich-Tausch).
- `?start`: ohne Startbildschirm (nur für Tests). `?figur=raphael` spielt Raphael (hat ein zweites Leben).
- `Saufi.debug()` in der Konsole liefert den Zustand: Uhrzeit (`zeit`), `ort`, `pegel`, `standfestigkeit`, `phase` (start, spiel, umgefallen, ende), `team`, `punkte`, nächste Runde, Musik. Dazu `Saufi.debug.setze({pegel, stand, minute, team, punkte, flaschen, boost, joint})`, `Saufi.debug.tippe('aktion')`, `Saufi.debug.geheZu(ort, station)`, `Saufi.debug.schritte(sekunden)`, `Saufi.debug.musik()`. Die Taste `^` blendet den Zustand live ein.

## Tests

```
node tests/run.js
```

Eigener Runner ohne Abhängigkeiten (lädt die Dateien per `vm`). Er prüft unter anderem RNG, Uhr und Öffnungszeiten, Pegel, Trinkfestigkeit, Standfestigkeit, zweites Leben, Mittrunden, Alkoholfrei-Tausch, Essen, Anwärter-Fortschritt, Joint, Scooter-Boost, Sieg und Niederlage, Karte (alle Türen per A* erreichbar), Ton, Eingabe, Hinweis 18+, die Musikquellen-Logik und spielt zwei komplette Runden durch (Sieg und Niederlage).

## Dateien

```
index.html          Rahmen, Canvas, Knöpfe, YouTube-Fenster, Script-Tags
music/playlist.js   Saufi.MUSIK, Tobis eigene MP3s (standardmäßig leer)
js/                 rng, uhr, charaktere, getraenke, essen, pegel, cheats, runden, ereignisse, punkte,
                    hinweise, speicher, karte, pfad, kamera, eingabe, spieler, npcs, ton, musik, render, main
tests/run.js        Test-Runner
```

Namespace: `window.Saufi`. Alle Orte, Straßen und Produkte sind erfunden.
