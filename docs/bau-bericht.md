# Bau-Bericht: Press11 - Saufi Saufi, Version 01

Stand: 04.11.2026. Aufgabe: `aufgabe-bau.md` (erst Teil A, dann Teil B).

## Teil A: `entwurf-01.md` überarbeitet

- Titel jetzt "Entwurf 01: "Press11 - Saufi Saufi"", Hinweistext in Abschnitt 11 mit neuem Namen.
- Neuer Abschnitt **"12. Änderungen nach Tobis Rückmeldung 04.11.2026"** ganz oben unter dem Titel (Name/Slug, nicht öffentlich, Scooter-Soundtrack mit Playlist, YouTube, `music/`, Quellenreihenfolge, Jugendschutz bleibt).
- Angepasst: Zielgruppen-Satz (keine echten Songs mehr), Abschnitt 6.2 (Scooter-Boost mit echten Zitaten und Hyper Hyper), Disko-Ereignisse, Steuerung (P = Scooter-Playlist), Dateiliste (`music/playlist.js`, `.gitignore`, neu `js/musik.js`, jetzt 22 JS-Dateien), Abschnitt 8.1 (Start per Doppelklick oder lokalem Server), **Abschnitt 8.3 komplett neu** (drei Musikquellen, Playlist, YouTube-Fenster, Fallback, MP3), Tests 19 und 20 (Musikquellen, Playlist), Umfang v01, offene Fragen 5 bis 7 (Joint-Plattform entfällt, Frage 6 und 7 als erledigt markiert), Datenschutz-Satz (YouTube lädt nur bei Wahl nach).
- "Press F"-Mechanik beim Umfallen bleibt unverändert.

## Teil B: Version 01 gebaut

Ordner `press11-saufi-saufi/` (3 700 Zeilen, ohne `npm install`, ohne Netzwerk, ohne git).

### Was gebaut ist

- **Spielbar von Start bis Ende:** Startbildschirm mit Hinweis 18+ und Titel "Press11 - Saufi Saufi" (Bestätigung nötig), Spielen von Samstag 08:00 bis Sonntag 04:00 (36 s pro Spielstunde, ca. 12 Minuten), Sieg um 04:00 oder Niederlage, Endbildschirm mit Neustart (E oder Tippen) und Bestwert.
- **Grafik wie Finca:** Pixel-Handheld-Look, Palette mit Kontur, alles per Code gezeichnet, Canvas 320×176 (Handy hochkant 320×400), Tönung nach Uhrzeit: morgens hell und grün-golden, mittags weiß, nachmittags warm und dunkler, abends rosa bis violett, nachts sehr dunkel mit leuchtenden Fenstern, Laternen-Lichtinseln und pulsierendem Neon, Wackeln und doppeltes Neon ab 1,5 ‰ (abschaltbar mit "Ruhiger Modus").
- **Stuttgart-Kessel-Stadtkarte** 40×30 Kacheln: Rebenhang mit Trockenmauer und Stäffele, Aussichtsplatz mit Bank, Marktplatz mit Brunnen, Hauptstraße, Fluss mit zwei Brücken, fiktive Straßen. **Vier Orte mit Innenräumen:** Hotel Kesselblick (Buffet, Wasserspender, Sofa, Dachterrasse mit Dicker Tüte, Stammtisch), Gasthaus Maultäschle (Tresen, Küchen-Durchreiche, Stammtisch), Kneipe Zum durstigen Dachs (Tresen, Jukebox, Kicker, Stammtisch), Untergrund 07 (Türsteher, Tanzfläche, DJ-Pult, Bar, Stammtisch, Strahler im Takt).
- **Mechanik:** Pegel (fiktive ‰, 0,0 bis 4,0), Standfestigkeit, Trinkfestigkeit je Figur, Abbau, Essen mit Völlegefühl, Wasser (Flaschen, Spender), Alkoholfrei-Tausch mit Entdeckungschance, 6 feste Mittrunden mit Vorwarnung, Frist, Strafe und Teamstimmung, Umfallen mit "Press F" und zweitem Leben (Raphael, Rudi), 11 Figuren (Tobi spielbar, 10 NPCs folgen per A*, trinken mit, fallen um, lassen sich mit Wasser wecken, Rudi kommt ab 14:00), Anwärter-Fortschritt (Raphael +4 %, Tobias +5 %, Aufnahme in der Disko), Dicke Tüte (nächster Effekt doppelt, danach 30 s schwammig), Scooter-Boost (Tanzen im Takt füllt die Leiste, 10 s, Cooldown 90 s), Öffnungszeiten mit Rauswurf bei Ladenschluss, Türsteher mit Hausverbot, Punkte und Medaillen.
- **Musik und Ton:** drei Quellen in der Reihenfolge eigene MP3 aus `music/` > YouTube (IFrame API, genau die zwei Videos `aoXOdAUD7IM` und `4YxTa1AUqps`, kleines ein-/ausklappbares Fenster 220×124) > eigener WebAudio-Hardstyle. Knopf und Taste "Scooter-Playlist" mit Titelliste (nur Text), automatisch in der Disko und beim Boost. Bei file://, ohne Internet oder Player-Fehler Umschalten auf die nächste Quelle mit kurzem Hinweis. Text-Shouts "HYPER HYPER!", "HOW MUCH IS THE FISH?". Effekte per WebAudio.
- **Steuerung:** Tastatur und Touch (virtueller Joystick, Aktionsknopf, Wasser, Item, F), Menüs per Tasten oder Antippen.
- **Test-/Debug-Haken:** `?tempo=N`, `?seed=N` (dazu `?start`, `?figur=`) und `Saufi.debug()` mit Uhrzeit, Ort, Pegel, Standfestigkeit, Phase und mehr, plus `Saufi.debug.setze/tippe/geheZu/schritte/musik` und eine Live-Anzeige auf der Taste `^`.

### Dateien

```
press11-saufi-saufi/
  index.html            Rahmen, Canvas, Knöpfe, YouTube-Fenster, Script-Tags
  README.md             Deutsch: Start (Doppelklick, lokaler Server), Steuerung, Musikquellen, MP3 eintragen, privat/18+, Tests
  .gitignore            music/*.mp3
  music/playlist.js     Saufi.MUSIK = [] (leer, Anleitung im Kommentar)
  js/ (22 Dateien)      rng, uhr, charaktere, getraenke, essen, pegel, cheats, runden, ereignisse, punkte, hinweise,
                        speicher, karte, pfad, kamera, eingabe, spieler, npcs, ton, musik, render, main
  tests/run.js          Test-Runner
```

Aus Finca als Vorlage übernommen und angepasst: `rng`, `pfad`, `kamera`, `eingabe` (Aktionen, Entprellung), `uhr` (Struktur, Licht-Tabelle), Palette und Zeichenhelfer in `render`, Aufbau des Test-Runners.

### Testergebnis

`node tests/run.js`: **36 von 36 Tests grün.** Abgedeckt: Kern-Tests 1 bis 8, 14, 15, 18 aus dem Entwurf, dazu 9 bis 13, 16, 17, die Musikquellen-Tests (19: Reihenfolge MP3 > YouTube > WebAudio, leere Playlist, kaputte Einträge, file:// = kein YouTube, offline, Player-Fehler; 19b: Instanz mit Fake-Player und Fake-Audio, Fallbackkette; 20: Titelliste, genau zwei Video-IDs, `Saufi.MUSIK` leer, `.gitignore`, keine MP3 im Repo), NPCs, Orte und Türen, Menüs, Mittrunde am Stammtisch, Boost im Spiel, Debug-Haken und URL-Parameter, die Browser-Verdrahtung mit Fake-DOM, **zwei komplette Durchspiel-Läufe** (Bot gewinnt um 04:00 mit allen sechs Runden und Aufnahme von Tobias, ohne Mittrinken verliert man nachmittags durch Teamstimmung 0) und ein Render-Test über alle Orte und Tageszeiten.

Zusätzlich habe ich das Bild mit einem eigenen kleinen Software-Rasterizer als PNG ausgegeben und angesehen (Startbildschirm, Stadt morgens/mittags/nachmittags/abends/nachts, alle vier Innenräume, Disko mit Boost, Menüs, Press F, Ende). Das Werkzeug lag in einem Wegwerf-Ordner und ist wieder gelöscht, es gehört nicht zum Projekt.

## Abweichungen vom Entwurf

- **Ein Canvas** (`#spiel`) statt drei, HUD und Menüs werden danach in dasselbe Bild gezeichnet. Touch-Knöpfe, Joystick und YouTube-Fenster sind DOM-Elemente.
- **Mittrunden-Zeiten:** 10:00, 12:30, 15:30, 19:30, 22:30, 01:30 (nicht alle zur vollen Stunde, damit jede Runde zur Öffnungszeit des Ortes liegt). Vorwarnung 1 Spielstunde vorher (36 s Echtzeit, nicht 60 s), Frist 33 Spielminuten (ca. 20 s Echtzeit), jede Runde hat 2 oder 3 Gläser (Alkoholfrei-Limit 3 gilt je Runde und Glas).
- **Press F und Leben:** Wer nur ein Leben hat (Tobi), sieht nach dem Umfallen "Press F to pay respects" und verliert. Nur Figuren mit zweitem Leben (Raphael, Rudi, spielbar über `?figur=raphael`) können mit 5 Mal F in 3 s wieder aufstehen. NPCs mit zweitem Leben stehen nach 15 s von selbst auf.
- **Restaurant:** Tür 11:00 bis 23:00, wer schon drin ist, darf bis 01:00 am Tresen bleiben (dann Rauswurf), Küche bis 22:00.
- **Hang:** nur Dekoration plus zwei kleine Aussichtsplätze mit Bank (und eine Wasserflasche), kein Treppen-Malus (wie in Abschnitt 9 vorgesehen).
- **Neu dazugekommen:** Wasserflaschen als kleines Inventar (Q trinkt oder weckt einen Umgefallenen), Tür-Check an der Disko (Pegel über 2,5 = Hausverbot, Schwelle von mir festgelegt), kleine Sprechblasen der NPCs, NPCs trinken zwischen den Runden zusätzlich (Kevin, Raphael, Tobias einen Kurzen pro Stunde), +20 Punkte pro Spielstunde fürs Durchhalten, Medaillen-Grenzen (Silber 1000, Gold 1500) und Preise in Punkten für Essen und Disko-Wasser sind eigene Annahmen.
- **Beat und Tanzen:** Der Takt fürs Tanzen kommt von der Spieluhr (150 BPM), nicht aus den Audiodaten. Bei MP3 oder YouTube ist er nur ein Metronom im Hintergrund.
- **Eingeklapptes YouTube-Fenster pausiert das Video** (ausgeklappt geht es weiter), damit nichts verdeckt abgespielt wird.
- **YouTube ist nur an, wenn Du "Scooter-Playlist" benutzt hast** (dann gemerkt): so wird ohne Zutun nichts von außen geladen. Danach startet es wie gewünscht automatisch in der Disko und beim Boost.

## Nicht gebaut (aus Entwurf "Später" oder bewusst gestrichen)

Stäffele-Malus, Bahn und Schnellreise, Taxi-Quiz, Kickerturnier, "Wirt gibt eine aus", Sektempfang und Hotelzimmer-Schlaf, Figurenwahl vor dem Start, Bestechung, Bestenliste, Sicherungs-Code, Mehrspieler, Dialektmodus, Pommes-Bude, Kesselbull/Neonbrause, zweiter Joint-Fundort.

## Bekannte Lücken und Risiken

- **Nicht im echten Browser geprüft.** Das Starten von Google Chrome (headless) wurde in dieser Sitzung nicht freigegeben. Geprüft ist alles über `vm`-Tests mit einem strengen Canvas-Mock (kennt nur echte 2D-Methoden, prüft Zahlen, Alpha und Mischarten) und über die selbst gerenderten PNGs. **Nicht getestet:** echte Schrift und Textumbruch (im Rasterizer nur Platzhalter-Blöcke, in `measureText` echte Breiten), WebAudio und wie der Hardstyle klingt, der YouTube-Player gegen die echte API, `<audio>` mit echten MP3s, Touch und Joystick auf einem Gerät, Vollbild. Bitte einmal in Chrome per Doppelklick und einmal über `python3 -m http.server 8000` öffnen und kurz mit `?tempo=10` durchspielen.
- Der Hardstyle ist ein einfacher Generator (Kick, Sägezahn-Bass, Lead, Hi-Hat, Clap) und wurde nicht abgehört; Lautstärke und Mischung sind Schätzwerte.
- Ausbalancierung ist nur per Bot und Rechnung geprüft: ohne eigenes Trinken (nur Runden) bleibt der Pegel unter 2; gefährlich wird es erst durch zusätzliches Trinken (über 3,0 sinkt die Standfestigkeit). Das Spiel ist damit eher leicht zu gewinnen, schwer wird es durch Verpassen der Runden und Umfallen von Freunden.
- Hochformat am Handy ist umgesetzt (320×400, Knöpfe), aber das Layout der Bedienelemente auf echten Geräten ist ungeprüft.
- Lokaler Speicher: Bei Browsern, die localStorage unter file:// sperren, bleibt der Bestwert nur bis zum Neuladen im Speicher (wie in Finca).

## Lauf 3: Fixes nach Cursor-Review

Drei Befunde aus `cursor-review.txt` behoben, minimal-invasiv (`music/playlist.js` unberührt):

1. **NPC nach zweitem Leben (`js/npcs.js`)**: Steht ein Umgefallener auf einer anderen Karte als der Spieler wieder auf, wird er auf die nächste begehbare Kachel neben dem Spieler gesetzt (Pfad und Ziel zurückgesetzt), wie bei einem normalen Übergang. Vorher blieben alte Innenraum-Koordinaten stehen.
2. **Uhr bei Overlays (`js/main.js`)**: Nur das echte Pause-Menü (Esc, samt einer daraus geöffneten Playlist) hält die Uhr an. Bei Playlist, Info, Bar-/Essensmenü und Stammtisch laufen Uhr, Stundenereignisse, Rundenfristen sowie Sieg-/Niederlagenprüfung weiter (`uhrLaeuft`). Start- und Endbildschirm sind unverändert.
3. **Defekte MP3 (`js/musik.js`)**: Ein Fehler sperrt nur den betroffenen Titel (`defekt`-Liste), danach wird der nächste gültige MP3-Titel gespielt. Erst wenn alle defekt sind, geht es zur nächsten Quelle (YouTube, falls gewählt, sonst Spiel-Beat). Veraltete Fehlermeldungen eines schon ersetzten Titels werden ignoriert.

Tests (`tests/run.js`): neu `19c` (MP3 pro Titel), `33` (NPC-Platzierung), `34` (Uhr bei Overlays inkl. Frist-Ablauf und Startbildschirm). Der bestehende Test `19b` wurde angepasst, weil sich das Soll-Verhalten ändert: Nach dem ersten Fehler spielt jetzt der zweite Titel, erst der zweite Fehler führt zum Beat (eine Prüfung ergänzt, keine entfernt). Ergebnis: `node tests/run.js` → 39 von 39 grün. Weiterhin nicht im echten Browser geprüft.

## Nachträge Grok Bot (04.11.2026, nach Lauf 2/3)

- **YouTube-Playlist als einfache Liste:** `music/playlist.js` enthält jetzt neben `Saufi.MUSIK` (eigene MP3s) die Liste `Saufi.YOUTUBE` mit allen vier Videos von Tobi (aoXOdAUD7IM Hyper Hyper, 4YxTa1AUqps The Logical Song, Y5pdgyOzJtE One (Always Hardcore), teW0KULIir0 How Much Is the Fish?). Nachtrag = eine Zeile. `js/musik.js` liest die Liste (ungültige IDs werden ignoriert, Standard-Fallback auf die zwei ersten Videos). Playlist-Anzeige in `js/render.js` nennt die Videos dynamisch. Test 20 angepasst.
- **Cursor-Prüfung:** `cursor-agent -p --trust --mode ask` (nur lesend) auf einer Kopie; Ergebnis in `cursor-review.txt`, drei Bugs -> von Claude in Lauf 3 behoben.
- **Echter Browser (Google Chrome headless, lokaler Server und file://):** Startbildschirm, Spiel mit `?tempo=60` und `?tempo=1000`, Endbildschirm, Nacht-Licht, Disko, Playlist-Knopf -> YouTube-Player lädt Hyper Hyper (sichtbares Fenster). Keine Konsolenfehler. Alle vier Videos spielen eingebettet über http://localhost (IFrame API, Status "playing").
- Nicht im echten Browser durchgespielt: ein kompletter Sieg (nur per Node-Durchspiel-Test). Ton nicht abgehört, kein echtes Touch-Gerät.
