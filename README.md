# Press11 - Saufi Saufi

Fiktives Spaß-Spiel für Erwachsene (**ab 18**). Öffentliches Repo, spielbar unter [GitHub Pages](https://topsentopsen.github.io/press11-saufi-saufi/).

Samstag, 08:00, Stuttgart im Kessel. Du bist Tobi und willst bis Sonntag 04:00 nicht nur durchhalten, sondern noch stehen. Zu jeder Mittrunde musst Du am Stammtisch sein, dazwischen isst Du, holst Wasser und mogelst Dich durch. Das Licht wandert von grün-sonnig bis tiefschwarz mit leuchtenden Fenstern und Neon. Reines JavaScript, Canvas, alles per Code gezeichnet, kein Build, nichts zu installieren.

## Neu in v18

- Zufällige NPC-Sprechblasen sind jetzt kurze Scooter-Titel und Rufe ("Hyper Hyper!", "How much is the fish?", "Nessaja!" und mehr), keine erfundenen Sprüche mehr.
- Bei hohem Pegel wird weiter gelallt.
- Raphi-Gag, freche Sprüche, Elon, S21, Motivatoren, Schilder und Funktionstexte bleiben unverändert.

## Neu in v17

- Neun Startkarten: Zeise ist neu dabei (Brille, orange Shirt, stößt als Freund um 16:00 dazu).
- Umbenennungen: Raphi, Bundschuh, Siebold, Schwinki.
- Startseite zeigt neun Karten in Hoch (2 × 5) und Quer (3 × 3).

## Neu in v16

- Spielerauswahl mit acht Startkarten (Portrait, Rolle, Plus, Minus); Tastatur und Tippen.
- Himmelsbach ersetzt Rudi; Motivatoren stupsen zur nächsten Runde.
- Motocross-Finale um 18:30 an der Tribüne (Hinweise, Belohnung) und Bierkästen im Park.

## Neu in v15

- Tobi trägt Tesla-Rot mit stilisiertem T und murmelt ab und zu Elon-Sprüche (Stadt, Tribüne, S21, Kneipe).
- Alle Figuren männlich: Ritzi mit kurzen Haaren, Stimme angepasst.
- An jeder Bank steht ein Bierkasten: E trinkt Pils mit Abklingzeit, Tippen führt hin.

## Neu in v14

- Freunde stecken nicht mehr in Bänken: NPC-Wege ohne Ecken abschneiden, Stuck-Teleport, eigene Standplätze.
- Spieler-Stuck-Erkennung: nach 1,5 s in der Enge wieder frei.
- Motocross mit vier Fahrern (reine Formel), Überholen und Sprungbögen.
- Stuttgart-21-Baustelle mit Bauzaun, Kränen, Schild und Musk/Boring-Company-Sprüchen.
- Starship-Überflug ab 19:30 mit Countdown und Lift-off.
- Musik-Intensität steigt über den Tag (BPM, Lautstärke, Schichten).

## Neu in v13

- Versionsanzeige mittig oben (oder unten, wenn das HUD die Mitte belegt).
- Raphael pink mit Käppi und Glatze, Namensschild über dem Kopf. Ritzi jetzt lila.
- Sophies Brauhaus (ex Kneipe), Hotel Jazz in the City.
- Motocross-Park mit Tribüne, Piste, Öffnungszeiten 12 bis 20 Uhr und Zuschauer-Bier.
- Zielmarker im Hochformat größer.

## Neu in v12

- Tippen oder Klicken auf einen Punkt der Karte: Die Figur läuft per Wegsuche (A*) dorthin, wie in Finca.
- Zielmarker am Boden. Ein neuer Tipp ersetzt das alte Ziel, rot mit X heißt nicht erreichbar. Tasten oder Joystick brechen den Tippweg ab. Der Joystick bleibt optional.
- Tipp auf Tresen, Jukebox, Stammtisch, Tür oder einen liegenden Kumpel: hinlaufen und die Aktion startet bei Ankunft. Ist das Ziel schon nah, sofort.
- Handy Fix: Taps im Spiel wurden nie ausgewertet (E.klicks blieb ungelesen) und die Joystick Zone schluckte Taps auf der linken Hälfte. Kurze Tipps in der Joystick Zone gehen jetzt an die Welt.

## Neu in v11

- **Musik aus:** Taste N, Knopf ♬ oben und Eintrag im Pausemenü; Effekte bleiben an, Zustand wird gespeichert.
- **MP3 Playlist:** eigene Titel in `music/` ablegen und in `music/playlist.js` eintragen; Reihenfolge MP3, dann YouTube, dann WebAudio.
- **Aktive Truppe:** beim Betreten schwärmt die Truppe aus; in Kneipe, Restaurant und Disko holt ein Freund spontan eine Runde (Mittrinken Team +1, Ablehnen Team −1).
- **Wecken mit Q repariert:** Reichweite 48 px statt 28 px (Freunde stehen 26 bis 53 px hinter Dir); Hinweis nur in Reichweite; Geweckte fallen nicht sofort wieder um.
- **Touch Kontextknöpfe:** Aktion, Wecken/Trinken und Boost/Tüte zeigen ihre Beschriftung und sind ausgegraut, wenn nichts geht.

## Neu in v10

- **HUD Hoch:** Uhr in der UI-Reserve (`UI_RESERVE_HOCH_TOUCH = 80`), Stapel Uhr→Banner→Hinweis→Dialog; kein Uhr-Panel mehr auf dem Hoteldach; „→ HIER“ nur als Marker wenn Ziel sichtbar.
- **Nachtschilder:** eine Quelle `schildHaupt` (Tag = Nacht, keine Doppelung); Blasen nach Fensterlichtern; Kneipen-Warteschlange unter „Feinstaub“.
- **Ende-Bild:** Hintergrundebenen bis über den Rand (`x=−2…W+2`); Sonne voll sichtbar; E/Wasser/Item/F im Ende ausgeblendet.
- **Hoch-Zoom / Süd:** `WELT_FLAECHE_HOCH = 2.4`; Süd-Wiese mit Beet, Heuballen, Zaun, Teich (HG-Cache, kein `S.rng`); Quer unverändert 4.0.
- **Playlist:** einheitliche Schriftgröße für alle Titel (kein `…`); Banner-Kurznamen (`Karte.KURZ`).
- **Durchspiel-Bot v2:** Wegfindung + Soft-Lock-Fixes (Umfallen schließt Overlay, Rauswurf-`return`, `verlassen` null-sicher, Minispiel-`beendeMinispiel` bei Klick daneben).
- **Ton-Check:** Start-Tipp entsperrt im selben Handler; kein Resume-Spam bei `running`.

## Neu in v09

- **Overlays/Reserve:** Banner, „E:“-Hinweis und Dialog im Hoch in der UI-Reserve (`UI_RESERVE_HOCH_TOUCH = 72`); Uhr kompakt in der oberen Reihe; Quer: Banner am Uhr-Panel (Uhr+Banner ≤ 38 px), Blasen unten mittig ≤ 45 % Breite.
- **Ende-Bild:** genau eine Sonne (`ohneSonne` im Himmel); untere Hälfte mit Weg, Wiese, Büschen, Zaun — keine leere Fläche.
- **Nacht-Schilder/Disko:** dunkler Schildgrund + gecachter Text-Overlay (Kontrast ≥ 4,5:1); Disko ohne ausgebrannten weißen Kern (Neon-Glanz ≤ 0,6× Länge).
- **Figuren/Partikel:** weicher Laufzyklus, Idle-Atmen, pegelabhängiges Torkeln, Prost-Armbogen mit Schaum; Funken-Sterne, Staub beim Laufen (`js/partikel.js`, kein `S.rng`).
- **Innenräume:** Lampen-Flackern, Bierfass-Glanz, rotierende Disko-Spots, Hotel-Uhrzeiger und Pflanzen-Wippen.
- **Quer-Zoom:** `WELT_FLAECHE_QUER = 4.6`, `MIN_WELT_ZOOM = 0.46` (Gebäudenamen ≥ 8 CSS-px).
- **Ton-Check:** erster Tipp entsperrt einmal; Hinweis bleibt bei `running`/visibility aus; Ende ohne Hinweis.

## Neu in v08

- **Schilder / Banner / Blasen:** Hotelschild „Kehrwoche ok“ einzeilig auf dem Gesims; RUNDE-Banner und Uhr frei von Gebäudenamen; Quer-Dialog ≤ 60 % Breite, gestapelt über E/Wasser; NPC-Blasen nicht über Kneipenschild.
- **Nachtgrafik:** Schild-Aufheller (`SCHILD_NACHT_ALPHA`), weichere Fenster/Disko/Laternen (Radius 22), Wiese nachts erkennbar, Abendton warm-orange.
- **Hoch-Zoom / Karte:** Stadtkarte 40×60 (960 px), `WELT_FLAECHE_HOCH ≈ 2.1` — ca. 20 % mehr Welt ohne Schwarzbereich.
- **Grafik Tag:** Wiese mit Ton-Varianten/Halmen, Wege mit Kante/Kies, Wasser mit Schaumsaum, Dächer/Bäume detaillierter (Cache-Sprites).
- **Ende-Bild:** sichtbare Sonne links, opakes Panel oben, Turmschaft nicht durchs Panel, Landschaft darunter.

## Neu in v07

- **Mond-Bug:** `Gfx.hex` parst auch `rgb(…)`; Mond als echte Sichel (kein schwarzer Fleck); Sieg-Daemmerung mit Sonne; Turm verschoben.
- **Ton:** Bestätigungston nach erstem Entsperren; Hinweis klein über der Bedienleiste (Hoch+Touch); YT-Player ≤ 160 px, Touch eingeklappt; Resume nach App-Wechsel.
- **Zoom:** Quer `WELT_FLAECHE_QUER = 4.0` (Welt ≈ 640×352); Hoch unverändert voll.
- **Grafik:** warme Nachtfenster, weichere/kleinere Laternen, kein heller Gebäuderahmen; eine Dunkelfläche Canvas+#bedien.
- **Safe-Area/Drehen:** `orientationchange` mit Nachzug 120/400 ms ohne Zustandsverlust; DPR Hoch-Touch ≤ 2.

## Neu in v06

- **Ende-Bild Hoch:** kompaktes Panel unter den Oben-Knöpfen, Kesselszene sichtbar; Neustart ≥ 44 CSS-px, Tippen irgendwo nach 0,8 s; Ton-Hinweis ausgeblendet.
- **Wackel** nur im Welt-Ausschnitt; **Touch später** → einmal `groesse()` ohne Neustart.
- **Schilder** „Kehrwoche ok“ / „Feinstaub drin“ ohne `…`; Jukebox-Hinweis `YouTube: N Videos`.
- **Hoch+Touch:** `UI_RESERVE_HOCH_TOUCH` ≈ 48, DOM-Leiste 96–140 CSS-px; Overlay-Zeilen/X ≥ 44 CSS-px mit Scroll (▲/▼).
- **Stick:** Totzone 0,18; Mehrfinger Stick+E; Cancel/Blur setzt zurück.
- **Nachtrag:** Stumm-Hinweis ≥ 4 s; Disko/Innenräume füllen die Weltfläche; Zuruf „RUNDE!“ mit Abstand zur Scooter-Leiste.

## Neu in v05

- **Stadtkarte 40×48:** nach Süden erweitert (pxH 768); obere 30 Zeilen unverändert (Türen, Orte, Seed). Südstreifen mit Weg, Park, Wiese, weicher Baum-/Mauer-Abschluss.
- **Hoch-Welt voll:** Welt füllt ≥ 85 % der Canvashöhe; unten nur schmale UI-Reserve (`UI_RESERVE_HOCH`) für Hinweise/Hilfe; E/Wasser-Knöpfe darin/darüber.
- **Debug:** `Saufi.debug.mass()` liefert zusätzlich `weltH`.

## Neu in v04

- **Start per Tipp:** Tippen irgendwo auf dem Startbild startet; nur der Playlist-Eintrag öffnet die Jukebox. Zeile „Tippen zum Start“.
- **Schrift kleiner:** `MIN_SCHRIFT` 7, HUD/Panels/Menüs ~15–20 % kleiner; CSS-Knöpfe und Ton-Hinweis angepasst (Touchfläche ≥ 44 px).
- **Weiter rausgezoomt:** Quer `WELT_FLAECHE_QUER = 3.0`; Mindestzoom 0,5.
- **Hoch-Layout:** Kamerahöhe auf Stadtkartenhöhe (480 px) begrenzt, darunter dunkles UI-Feld; HUD ohne Panel-Overlap; Hinweise nicht über Stick/E/Wasser; `#ton-hinweis` oben mittig unter den Oben-Knöpfen.
- **Debug:** `Saufi.debug.mass()` liefert `{ W, H, VW, VH, zoom }`.

## Neu in v03

- Handy-Optimierung Hoch- und Querformat: `viewport-fit=cover`, Safe-Area, `100dvh`, kein Scrollen/Zoomen.
- Skalierung: Hochformat logisch 320×400 (Spielfeld oben, Bedienung unten), Quer volle Breite; Schrift auf Touch ≥ ~11 CSS-px.
- Touch-Ziele ≥ 44 CSS-px; Menü-/Jukebox-Zeilen auf Touch höher; Joystick links unten, Aktionen rechts unten.
- Joystick-Zone schluckt keine Overlay-Klicks mehr (`pointer-events` bei Overlay und ohne Touch aus).
- Jukebox/Menüs passen in beide Orientierungen (kürzen statt abschneiden); YouTube auf dem Handy klein oben, bei Overlay aus.
- `devicePixelRatio` auf max. 2 begrenzt (Performance).
- **iPhone/Safari (v03b):** `position:fixed` + `-webkit-fill-available`, Doppeltipp-Zoom aus, Touch-Fallback (`touchstart`/`touchend`, `passive: false`) für Joystick und Knöpfe; Start per Tipp.
- **Ton auf iOS:** AudioContext erst bei `touchend`/`pointerup`/`click`, stummer 1-Sample-Puffer, Resume nach Unterbrechung; Hinweis „Tippen für Ton“ / einmalig „Kein Ton? Stummschalter am iPhone prüfen“. YouTube nur nach Geste, `playsinline`.
- **Textfit (v03c):** `Gfx.textInBox` – Text misst, umbricht, verkleinert und kürzt mit `…`, damit nichts aus Panels/Blasen/HUD/Menüs/Schildern läuft; Sprechblasen-Breite am Text.
- **Kamera (v03c):** ~1,5× mehr sichtbare Weltfläche (Hoch- und Querformat); HUD bleibt in Bildschirmkoordinaten lesbar.
- **Grafik (v03c):** sauberere Figuren (Umrisse, Schatten, Laufanimation), detailreichere Fassaden/Innenräume, weichere Licht-/Schattenübergänge.

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

Am Startbildschirm Hinweis 18+ bestätigen (E, Enter, Leertaste) oder irgendwo tippen (außer auf „Scooter-Playlist“).

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
- Vier Orte: Jazz in the City, Gasthaus Maultäschle, Sophies Brauhaus, Untergrund 07. Dazu Motocross-Park mit Tribüne. Öffnungszeiten: Hotel immer, Gasthaus 11:00 bis 23:00, Kneipe 14:00 bis 03:00, Disko 22:00 bis 04:00, Motocross 12:00 bis 20:00.
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

### v15 Nachtrag

Raphi-Gag und freche Sprechblasen (js/frech.js) halten das Zwei-Blasen-Limit ein, Blasen werden gegeneinander gestaffelt, die Raphi-Sätze sind kurz.
