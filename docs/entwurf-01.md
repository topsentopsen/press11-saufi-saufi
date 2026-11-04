# Entwurf 01: "Press11 - Saufi Saufi"

## 12. Änderungen nach Tobis Rückmeldung 04.11.2026

Tobi hat im Chat (04.11.2026, 17:57 bis 18:00) entschieden. Das ist unten eingearbeitet; Abschnitt 12 steht absichtlich oben, damit man es zuerst liest.

1. **Name:** Das Spiel heißt **"Press11 - Saufi Saufi"**. Slug, Ordner und Repo: `press11-saufi-saufi`. Namespace bleibt `window.Saufi`. Die "Press F"-Mechanik beim Umfallen bleibt (Abschnitt 4.6).
2. **Nicht öffentlich:** Privates Repo, kein GitHub Pages. Start lokal per Doppelklick auf `index.html` (file://) **oder** einfachem lokalem Server: `python3 -m http.server 8000`, dann http://localhost:8000. Die echten Namen der Freunde bleiben (offene Frage 7 ist erledigt).
3. **Scooter ist erlaubt.** Neuer Soundtrack:
   - **Playlist-Funktion** mit echten Scooter-Titeln als reiner Titelliste im Spiel (nur Text). Text-Shouts dürfen echte Scooter-Zitate sein ("HYPER HYPER!", "HOW MUCH IS THE FISH?").
   - **YouTube-Einbettung** (IFrame Player API, nur Einbetten, nichts herunterladen) mit den Videos von Tobi: `aoXOdAUD7IM` ("Scooter - Hyper Hyper"), `4YxTa1AUqps` ("Scooter - The Logical Song (Official Video)"), `Y5pdgyOzJtE` ("Scooter - One (Always Hardcore) (Official Video HQ)") und `teW0KULIir0` ("Scooter - How Much Is the Fish?") (Nachträge 18:00 bis 18:02). Die Liste steht als einfache Liste `Saufi.YOUTUBE` in `music/playlist.js`, damit weitere Videos leicht nachgetragen werden können. Einsatz: Knopf "Scooter-Playlist" im Menü, automatisch in der Diskothek und beim Scooter-Boost (Hyper Hyper). Die Einbettung geht meist nur über http://localhost, nicht über file://; bei file://, ohne Internet oder bei Player-Fehler wird sauber auf den Fallback umgeschaltet und kurz ein Hinweis gezeigt. Der Player ist ein kleines, ein-/ausklappbares Fenster (sichtbar, mindestens 200×113).
   - **Ordner `music/`** für Tobis eigene MP3s: `music/playlist.js` (Script-Tag, geht auch über file://) mit `Saufi.MUSIK = [{datei:'music/hyper-hyper.mp3', titel:'Hyper Hyper'}, ...]`, standardmäßig leer und mit Kommentar-Anleitung. Abspielen per `<audio>`. Keine MP3 im Repo, `.gitignore` ignoriert `music/*.mp3`.
   - **Reihenfolge der Quellen:** eigene MP3s aus `music/` (falls eingetragen) > YouTube (falls verfügbar und vom Nutzer gewählt) > eigener WebAudio-Hardstyle als Fallback.
   - Keine Songdateien aus dem Netz laden.
4. **Jugendschutz-Hinweis bleibt** (Abschnitt 11).

---

Stand: 04.11.2026. Nur Planung, kein Code. Alles in diesem Entwurf ist ein Vorschlag, den Du kippen kannst. Was ich mir ausgedacht habe, steht in Abschnitt 10 unter "Annahmen".

Ich habe mir `ref-finca/` angesehen (index.html, render.js, uhr.js, ton.js, eingabe.js, tests/run.js) und übernehme von dort: reines JavaScript, Canvas 320×176 (Handy hochkant 320×400), klassische Script-Tags mit `?v=`, Start per Doppelklick über file://, Palette-Objekt `P` mit Konturfarbe, alles per Code gezeichnet, Licht als Tönung pro Uhrzeit, WebAudio-Musik ohne Dateien, Eingabe-Modul mit Tasten und Pointer, Node-Runner mit `vm`.

---

## 1. Konzept

**In 5 Sätzen:**
1. Es ist Samstag in Stuttgart, 08:00 Uhr, und Deine Truppe will bis Sonntag 04:00 Uhr nicht nur durchhalten, sondern noch stehen.
2. Du läufst top-down im hellen Pixel-Look durch eine Stadt im Kessel und ziehst durch Hotel, Restaurant, Kneipe und Partykeller.
3. Zu jeder vollen Stunde ruft ein Stammmitglied eine Mittrunde aus, bei der alle mittrinken müssen, dazwischen musst Du essen, Wasser organisieren und Dich unauffällig durchmogeln.
4. Über Tag wird das Licht von grün-sonnig zu tiefschwarz mit leuchtenden Fenstern und Neon, und die Musik wandelt sich von leisem Beat zu vollem Hardstyle.
5. Sieg: Um 04:00 stehst Du noch. Niederlage: Du liegst, und kein zweites Leben ist übrig.

**Ton:** Augenzwinkernd, albern, Freundesgruppe. Kein Moralton im Spiel selbst, aber auch keine Glorifizierung (siehe Abschnitt 11). Sprüche kurz und auf Schwäbisch angehaucht, ohne es zu übertreiben.

**Zielgruppe:** Erwachsene (ab 18), Tobis Freundesgruppe, die sich selbst im Spiel wiederfindet. Fiktives Spaß-Spiel, keine echten Marken, keine echten Kneipen. Echte Songs nur als Titelliste, als YouTube-Einbettung oder als Tobis eigene MP3s, nie als mitgelieferte Datei (Abschnitt 12).

**Spieldauer:** Eine Runde dauert ca. **12 Minuten Echtzeit** für 20 Spielstunden (08:00 bis 04:00). Das sind **36 Sekunden pro Spielstunde**, ähnlich wie bei Finca (dort 40 s). Hartes Limit wie `TAG_LIMIT` bei Finca: 14 Minuten aktives Spielen, danach läuft die Uhr schneller bis 04:00.

---

## 2. Die vier Orte und die Stadt

### 2.1 Stadtkarte (fiktives Stuttgart-Gefühl)

Die Außenwelt ist eine Kachelkarte (Kachel 16×16, ca. 60×44 Kacheln), die sich um einen **Kessel** legt:

```
 Weinberge (Hang, Reben, Stäffele)          Aussichtsplatz
 ┌──────────────────────────────────────────────────────┐
 │ ^^^^ ^^^^                  ^^^^^^        [Bank]      │
 │ ^^ Rebenhang ^^   Hotel Kesselblick       ^^^        │
 │ ^^^^   |Stäffele|   [H]  Hotelallee ─┐   Halde       │
 │        ▼             │              │                 │
 │  ┌─Marktplatz─┐      │       ┌──────┴────────┐        │
 │  │ Brunnen, Bude│─Kesselgasse│  Hauptstraße   │        │
 │  └──────┬──────┘      │      └──┬─────────┬──┘        │
 │   [R] Gasthaus        │      [K] Kneipe  Bahnhaltestelle│
 │   Maultäschle         │      Dachs        │           │
 │         Bachweg ~~~~~~~~ Fluss ~~~~~~~~~~ │           │
 │                       │            [P] Partykeller    │
 │                       └──── Unterführung ──┘ "Untergrund 07"│
 └──────────────────────────────────────────────────────┘
```

- **Hänge:** Oben im Plan liegt der Hang mit Weinbergen (Reben-Kacheln, Trockenmauern). Man kommt über **Stäffele** (Treppen-Kacheln) hoch und runter. Hang ist langsam (Bergauf-Malus beim Laufen), Bergab geht schneller. Auf dem Hang liegen kleine Extras (versteckte Wasserflasche, Bank zum Ausruhen).
- **Kessel:** Die Mitte ist flach und städtisch (Pflaster, Straßen, Marktplatz mit Brunnen). Alles ist von Hügeln umgeben, die Kamera zeigt oben immer Hangkante, damit es nach Stuttgart aussieht.
- **Fiktive Straßennamen:** Kesselgasse, Hauptstraße, Bachweg, Hotelallee, Rebenhang, Halbhöhenweg. Keine echten Straßen, keine echten Plätze.
- **Verkehr als Kulisse:** Eine Bahn fährt auf einer Schiene durchs Bild (Hindernis, kein Spielelement in v01). Später: Stadtbahn als Abkürzung.
- **Türen:** Jeder Ort hat eine Tür-Kachel mit Schild und leuchtendem Fenster. Beim Betreten gilt: Aktionsknopf an der Tür, kurzer Schwarzblende-Übergang, dann Innenraum als eigene Karte.

### 2.2 Wechsel zwischen den Orten

- Laufen durch die Stadt (ca. 15 bis 25 Sekunden Echtzeit zwischen zwei Orten, sonst ist es zu lang).
- Wer zu betrunken ist, läuft schlingernd (Eingabe-Drift, siehe 4.1) und braucht länger. Das ist das Risiko.
- Orientierung: Kleiner Pfeil am Bildrand zeigt zur Ziel-Tür der nächsten Mittrunde ("HIER SOLLST DU HIN").
- Später: Schnellreise mit Bahn (Haltestelle Marktplatz bis Haltestelle Untergrund).

### 2.3 Hotel "Kesselblick"

- **Layout (Innen, ca. 20×14 Kacheln):** Lobby unten links (Rezeption, Sofa), Frühstücksraum rechts (Buffet-Kacheln), Treppe/Aufzug hoch zu einem Flur mit drei Zimmertüren, Dachterrasse oben mit Blick auf den Kessel.
- **Was man tut:** Frühstücksbuffet (der erste Essensbonus des Tages), Zimmer = Schlafpause (verliert Zeit, senkt Pegel stark, aber Truppe wartet nicht, gibt Strafpunkte), Dachterrasse = Spezialrunde "Sektempfang".
- **Getränke/Essen:** Kaffee (kein Alkohol, stärkt etwas), Wasser (gratis aus dem Spender), Sekt (Hotelrunde), Frühstück (Brötchen, Rührei, Obst).
- **Offen:** Rund um die Uhr. Buffet nur 07:00 bis 11:00.
- **Ereignisse:** "Sektempfang" um 10:00 (erste Runde, sanft), Hotelmanager schaut streng, wenn man schwankt (Risiko, rausgeworfen zu werden = Weg zurück auf die Straße), Zimmerservice-Wagen als Wasserquelle.

### 2.4 Restaurant "Gasthaus Maultäschle"

- **Layout (ca. 22×14 Kacheln):** Gaststube mit langem Stammtisch in der Mitte (Platz für die ganze Truppe), Tresen links, Küche hinten (hinter Durchreiche), Biergarten-Ecke rechts mit Lichterkette.
- **Was man tut:** Essen bestellen und essen (Essen-Minispiel: Aktionsknopf gedrückt halten, bis Teller leer), Stammtisch-Runde, Bedienung bei Alkoholfrei-Tausch bestechen.
- **Getränke/Essen:** Radler, Weißwein-Schorle (Hauswein), Wasser, Maultaschen in Brühe (stark gegen Pegel), Linsen mit Spätzle (stärkt Standfestigkeit), Schnitzelbrötchen (schnell, wenig Wirkung), Salatteller (Spott der Truppe).
- **Offen:** 11:00 bis 23:00 (Küche bis 22:00), danach nur noch Tresen bis 01:00, ab 01:00 zu.
- **Ereignisse:** "Mittagsrunde" um 12:00, Kellnerin bringt falsche Bestellung (Zufall: Alkoholfrei statt Bier = ungewollter Bonus), Gast am Nachbartisch will mitzählen (Minispiel, optional später).

### 2.5 Kneipe "Zum durstigen Dachs"

- **Layout (ca. 18×12 Kacheln):** Langer Tresen, Dartecke, Kicker, Jukebox-Kachel (im Spiel: Musik lauter/leiser), Hinterzimmer mit Stammtisch, Toiletten-Tür (kleine Pause, Pegel sinkt minimal durch Frische).
- **Was man tut:** Bier bestellen, Kurze trinken, Kicker spielen (Mini-Wette auf Runde), Alkoholfrei-Cheat am Tresen (siehe 4.5), Stammtisch-Runde.
- **Getränke/Essen:** Pils (Standardbier), Weizen, Kurzer ("Schwabentropfen", fiktiv), Mineralwasser, Brezeln, Currywurst-artiger "Kesselwurst-Teller".
- **Offen:** 14:00 bis 03:00 (letzte Runde um 02:30 ausgerufen).
- **Ereignisse:** "Kickerturnier" (nachmittags), "Wirt gibt eine aus" (zufällig, +1 Gratisrunde für alle), Stammgast erkennt den Alkoholfrei-Betrug.

### 2.6 Partykeller / Diskothek "Untergrund 07"

- **Layout (ca. 24×16 Kacheln):** Eingang mit Türsteher oben, Treppe nach unten, Tanzfläche in der Mitte (Boden leuchtet im Takt), DJ-Pult und Bühne oben, Bar rechts, Chill-Sofas links, Toiletten, Raucherbereich vor der Tür.
- **Was man tut:** Tanzen (Aktionsknopf im Takt, gibt Punkte und Scooter-Energie), Bar, Stammtisch-Runde an der Bar, Scooter-Boost auslösen.
- **Getränke/Essen:** Mixgetränk "Neonbrause", Shots, Energy-Drink "Kesselbull" (fiktiv, kein echtes Produkt), Wasser (teuer, kostet Punkte), Pommes-Bude vor der Tür.
- **Offen:** 22:00 bis 04:00 (Einlass nur nüchtern genug, siehe Türsteher).
- **Ereignisse:** Türsteher prüft Pegel am Eingang (zu hoch = abgewiesen, geht nur mit Wasser/Essen davor), "HYPER HYPER!"-Moment (Beat-Drop, Lichtshow, in der Diskothek startet automatisch die Scooter-Musik, Abschnitt 8.3), Scooter-Boost (siehe Abschnitt 6).

---

## 3. Tagesverlauf

### 3.1 Uhr

- Spielzeit 08:00 Samstag bis 04:00 Sonntag, 36 Sekunden Echtzeit pro Spielstunde (Konstante `SEK_PRO_STUNDE`).
- Uhrmodul wie `uhr.js` in Finca: `erstelle()`, `update()`, `text()`, `phase()`, `toenung()`, `licht()`. Zeit wird intern als Minuten seit Mitternacht Samstag geführt (480 bis 1680, Sonntag 04:00 = 1680).
- Die Uhr steht still, solange eine Textbox oder Pause offen ist.

### 3.2 Phasen und Licht

| Uhrzeit | Phase | Licht / Farbe | Stimmung |
|---|---|---|---|
| 08:00–11:00 | Morgen | hell, sattes Grün, goldene Sonne, lange Schatten | frisch, Vögelchen, ruhiger Beat |
| 11:00–15:00 | Mittag | volle Helligkeit (weiß), Pflaster warm | Restaurant-Zeit |
| 15:00–18:00 | Nachmittag | leicht dunkler, warmes Orange, Kontrast sinkt | Kneipe wird voll |
| 18:00–21:00 | Abend | Dämmerung Rosa → Violett, erste Fenster leuchten | Warm-up |
| 21:00–00:00 | Nacht | sehr dunkel (blau-violett), Gebäude/Fenster/Schilder leuchten, Neon | Disko öffnet |
| 00:00–04:00 | Tiefe Nacht | fast schwarz, nur Licht-Inseln, Neon pulsiert im Takt | Endspurt |

- Licht wird wie bei Finca als Tönungsmultiplikator über die Welt gelegt, Lichtquellen (Fenster, Laternen, Neonschilder, Disko-Tür) werden danach additiv heller gezeichnet. Fensterfarbe nutzt `fensterNacht` (#ffd77a), Neon bekommt eigene Farben (Pink, Cyan, Gelb).
- Nachts nimmt die Sichtweite ab: Nur kleine Lichtkreise rund um Laternen und Türen sind klar sichtbar. Gebäudekanten leuchten schwach, damit man navigieren kann.
- Betrunkene Wahrnehmung (ab Pegel 1,5 ‰): leichte Wackelung des Bildes und doppeltes Neon-Glühen. Abschaltbar im Menü ("Ruhiger Modus").

### 3.3 Öffnungszeiten (Übersicht)

| Ort | Offen |
|---|---|
| Hotel | immer (Buffet 07:00–11:00) |
| Restaurant | 11:00–23:00, Tresen bis 01:00 |
| Kneipe | 14:00–03:00 |
| Partykeller | 22:00–04:00 |

Geschlossene Orte haben dunkle Fenster und ein Schild. Wenn man zu früh kommt, kommentiert ein Stammmitglied ("Noch zu, Saufi.").

---

## 4. Spielmechanik

### 4.1 Pegel (fiktive Promille-Anzeige)

- Anzeige in "‰" mit einer Nachkommastelle, Bereich 0,0 bis 4,0. Rein fiktiv und spielerisch, **keine reale Berechnung** und **kein Maßstab** für echtes Verhalten (Hinweis im Spiel).
- Jedes Getränk hat einen Wert (Beispiele): Radler +0,10 / Pils +0,20 / Weizen +0,25 / Wein +0,25 / Kurzer +0,35 / Neonbrause +0,30 / Wasser −0,05 / Alkoholfrei 0,00.
- **Abbau:** −0,10 pro Spielstunde (damit Durchhalten möglich bleibt), Essen erhöht den Abbau kurz (siehe 4.4).
- **Schwellen:** unter 1,0 klar / 1,0 bis 2,0 locker (Eingabe leicht verzögert) / 2,0 bis 3,0 wackelig (Lauf-Drift, Bildwackeln) / über 3,0 kritisch (Standfestigkeit sinkt schnell).
- Darstellung: Bierkrug-Anzeige oben links, füllt sich von gelb zu orange zu rot. Daneben Zahl.

### 4.2 Standfestigkeit (Leben)

- Standfestigkeit 0 bis 100 (Herzleiste wie bei Finca, 5 Herzen à 20).
- Sinkt: bei Pegel über 3,0 pro Sekunde, bei Rempeln, Treppen bei hohem Pegel, Hausverbot-Moment, wenn man Mittrunden ablehnt (Strafe, siehe 4.3).
- Steigt: Essen (Linsen +30), Sitzen auf Bank (+1 pro Sekunde), Wasser (+5), Kaffee (+10).
- Bei **0** fällt die Figur um.

### 4.3 Mittrunden (feste Mittrinkrunden)

- **Takt:** Zur vollen Stunde ruft ein Stammmitglied eine Runde aus (Text-Einblendung groß: "RUNDE! Alle mittrinken!"). Beispiel: 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 21:00, 22:00 und danach stündlich bis 03:00. Davor 60 Sekunden Echtzeit Vorlauf (Vorwarnung, "In 1 Stunde: Runde bei Dachs").
- **Wo:** Jede Runde findet an einem bestimmten Ort statt (Stammtisch dort). Man muss rechtzeitig (innerhalb von 20 s Echtzeit nach Ausruf) am Tisch stehen.
- **Ablauf:** Alle Charaktere am Tisch trinken gleichzeitig, jeder bekommt den Pegel des Rundengetränks (Prost-Animation, Text "PROST!").
- **Ablehnen oder Verpassen:** Strafe (−15 Standfestigkeit, Spott der Truppe, Teamstimmung −1).
- **Teamstimmung:** Wert 0 bis 5 (Balken unter dem Pegel). Sinkt bei Ablehnen/Verpassen, steigt bei erfolgreichem Mittrinken. Bei 0 verlassen Stammmitglieder die Runde (Niederlage-Risiko).
- **Rundenreihenfolge (Beispiel):** 10:00 Hotel, 12:00 Restaurant, 14:30 Kneipe, 17:00 Kneipe, 19:00 Restaurant, 21:00 Kneipe, 22:30 Partykeller, 00:00 Partykeller, 01:30 Partykeller, 03:00 Partykeller. Reihenfolge ist fest (kein Zufall), damit Tests und Lernbarkeit stimmen.

### 4.4 Essen

- Jedes Gericht hat drei Werte: Pegel-Senkung (einmalig), Abbau-Boost (Dauer 2 Spielstunden), Standfestigkeit.
- Beispiele: Frühstück (−0,05, +0,05/h, +10), Maultaschen in Brühe (−0,15, +0,10/h, +20), Linsen mit Spätzle (−0,10, +0,05/h, +30), Brezel (−0,02, 0, +5), Currywurst-Teller (−0,08, +0,05/h, +15), Pommes (−0,05, 0, +10).
- Essen kostet Spielzeit (3 bis 5 Sekunden Echtzeit) und Punkte (Preis).
- Zu viel essen: Völlegefühl, nach 3 Gerichten in 2 Spielstunden Bewegung −20 % für 1 Spielstunde.

### 4.5 Wasser und Alkoholfrei-Cheat

- **Wasser:** Gratis aus Spendern (Hotel) oder kaufbar. Wirkung: Pegel −0,05, Standfestigkeit +5, kostet bei der Disko Punkte, zählt aber **nicht** als Mitgetrunken bei einer Mittrunde.
- **Alkoholfrei heimlich:** Man kann an Tresen (Kneipe, Restaurant, Disko) statt Bier ein Alkoholfrei bestellen. Das sieht aus wie ein Bier, hat Pegel +0,00.
  - **Risiko:** Jeder Alkoholfrei-Tausch bei einer Mittrunde hat eine Entdeckungschance von 25 % (steigt um 10 % pro Tausch in den letzten 2 Spielstunden und bei aufmerksamen Figuren: Probst +15 %).
  - **Erwischt:** Teamstimmung −2, Pflichtrunde nachträglich (doppeltes Getränk).
  - **Limit:** Max. 3 Alkoholfrei-Tricks pro Runde, danach Wirt/Barkeeper wird misstrauisch.
  - **Bestechung (später):** Mit Punkten die Bedienung stumm machen.
- Beide Cheats zeigen sich klar im UI (Icon Wasserglas / Icon Alkoholfrei), damit die Wirkung ablesbar bleibt.

### 4.6 Umfallen und zweites Leben

- Bei Standfestigkeit 0 fällt die Figur um: kurzer Slow-Mo-Moment, Text-Einblendung "F" (Anspielung "Press F"), Bildschirm wird schwarz.
- Es erscheint "**Press F!**": Man muss die Aktionstaste (F bzw. Antippen) innerhalb von 3 Sekunden mehrfach drücken (5 Mal), um wieder hochzukommen.
- **Zweites Leben:** Wer ein zweites Leben besitzt (Raffi, Rudi), steht danach mit 40 Standfestigkeit und −1,0 ‰ wieder auf und das Leben ist verbraucht.
- Alle anderen Figuren haben **ein** Leben. Wird die Hauptfigur nicht rechtzeitig wach (oder hat keine Leben mehr), ist die Runde verloren.
- Bei Stammmitgliedern der Truppe (NPCs): Fallen sie um, kann man sie mit Wasser wecken (Item-Aktion). Rettung gibt Punkte und Teamstimmung.

### 4.7 Sieg und Niederlage

- **Sieg:** Um **04:00** Uhr steht die Hauptfigur noch (Standfestigkeit > 0 und Teamstimmung > 0). Kleines Finale: Sonnenaufgang am Aussichtsplatz, Text: "Du stehst noch, Saufi."
- **Niederlage:**
  1. Umgefallen ohne zweites Leben.
  2. Teamstimmung 0 (alle gehen heim).
  3. Hausverbot dreimal (zu betrunken an der Tür).
- Bei Niederlage kurzer Abspann: "Press F to pay respects." mit Zusammenfassung.

### 4.8 Punkte und Wertung

- Punkte für: erfolgreich mitgetrunken (+100), Mittrunde pünktlich (+50), Essen zur rechten Zeit (+20), umgefallenen Freund geweckt (+80), Scooter-Boost ausgelöst (+150), Anwärter-Fortschritt erreicht (+200).
- Abzüge: Alkoholfrei erwischt (−150), Runde verpasst (−100), Umfallen (−200).
- Wertung am Ende: Bronze/Silber/Gold ("Standhaft", "Eiserner Saufi", "Kesselkönig/-königin").
- Bestwerte werden im `localStorage` gespeichert. Falls file:// das blockiert, in Variable halten (wie bei Finca).

---

## 5. Charaktere

### 5.1 Tabelle

Trinkfestigkeit ist ein Faktor auf die Pegelaufnahme (1,00 = Standard; kleiner = verträgt mehr).

| Figur | Rolle | Eigenheit | Trinkfestigkeit | Farbe / Erkennung | Leben |
|---|---|---|---|---|---|
| **Tobi** | Stammmitglied, **spielbar (Standard)** | Anführer-Typ, ruft die Runden aus, Spruch "Wer hat Durst?" | 1,00 | Rotes Shirt, Mütze | 1 |
| **Raphael (Raffi)** | Anwärter, 10 % | Eifrig, übernimmt sich schnell | 1,30 | Grünes Shirt, große Brille | 2 |
| **Tobias** | Anwärter, 80 % | Fast drin, hält sich zurück | 1,10 | Blaues Hemd, Gelhaare | 1 |
| **Schwickendorf** | Stammmitglied | Erzähler, hält ewig Reden | 0,95 | Brauner Mantel, Schnurrbart | 1 |
| **Buntschuh** | Stammmitglied | Auffällige Schuhe, Tänzer | 1,00 | Bunte Schuhe, gelbe Jacke | 1 |
| **Ritzi** | Stammmitglied | Lebhaft, ruft "Noch eine!" | 0,90 | Rosa Haare | 1 |
| **Siebold** | Stammmitglied | Pedant, rechnet Pegel nach | 0,85 | Graue Weste, Taschenrechner | 1 |
| **Kevin** | Stammmitglied | Jüngster, hat ständig Hunger | 1,20 | Schwarzes Cap | 1 |
| **Stöckle** | Stammmitglied | Schwabe durch und durch, geizig | 0,80 | Dunkelgrüne Trachtenweste | 1 |
| **Probst** | Stammmitglied | Strenger Aufpasser, erkennt Alkoholfrei | 0,75 | Schwarzer Hut, weißes Hemd | 1 |
| **Rudi** | Gastfigur / Stammmitglied (Frage offen) | Zufallsgast, taucht zu festen Zeiten auf | 1,00 | Orange Latzhose | 2 |

Hinweis zur Tabelle: Die Farben, Eigenheiten und Trinkfestigkeitswerte außer den Vorgaben sind **von mir erfunden** und sollen von Tobi geprüft und ersetzt werden (z. B. nach echten Eigenheiten der Freunde).

### 5.2 Anwärter-Prozente (Annahme)

**Annahme:** Die Prozentwerte (Raphael 10 %, Tobias 80 %) sind der **Anwärter-Fortschritt**, also wie weit sie auf dem Weg zur Aufnahme in die Truppe sind.

Spielerische Bedeutung:
- Anwärter-Fortschritt steigt, wenn sie bei Mittrunden mittrinken, bei Challenges mitmachen und bis in den späten Abend stehen bleiben (Raphael +4 % pro Runde, Tobias +5 % pro Runde).
- Bei **100 %** werden sie in der Disko offiziell "aufgenommen" (Zeremonie mit Text "WILLKOMMEN IN DER TRUPPE!", Bonuspunkte +200 und Teamstimmung +1).
- Tobias startet bei 80 % und braucht nur noch 4 Runden, Raphael bei 10 % schafft es nur mit Hilfe (viel Durchhalten, Joint-Challenge, Scooter-Boost).
- Fortschritt sinkt bei Peinlichkeiten (Umfallen −10 %, Alkoholfrei erwischt −15 %).
- Zusatz: Der Prozentwert dient als Startvorteil: Anwärter verlieren die erste Mittrunde nicht (Gnadenfrist).

### 5.3 Raffi, Rudi (Annahmen)

- **Raffi = Kurzform von Raphael** (Annahme). Wenn Raffi und Raphael doch zwei Personen sind, braucht es eine eigene Figur "Raffi" (offene Frage).
- **Raphael/Raffi** hat ein **zweites Leben** (laut Vorgabe).
- **Rudi** kommt in Tobis Liste sonst nicht vor, hat aber ein zweites Leben. Ich plane ihn als **Gastfigur**, die ab 14:00 in der Kneipe auftaucht und die Truppe begleitet. Offen, ob er Stammmitglied wird oder nur Gast ist (Abschnitt 10).

### 5.4 Spielbare Figuren

- **Version 01:** Nur Tobi ist spielbar (ein Hauptcharakter, Rest NPC).
- **Später:** Figurenwahl vor Rundenbeginn. Dann ändern sich Trinkfestigkeit und Eigenheit. Raphael als Hardmode (zweites Leben, aber hohe Aufnahme), Probst als Meister (erkennt Cheats).

---

## 6. Challenges und Ereignisse

### 6.1 Joint doppelt stark

- **Idee:** Ein seltenes Item "Joint" liegt an zwei festen Orten (Dachterrasse Hotel, Raucherbereich Disko). Spielmechanik: Beim Einsatz wirkt der **nächste Effekt doppelt** (nächstes Essen, nächstes Wasser, nächster Scooter-Boost oder nächstes Getränk).
- **Gegengewicht:** Danach 30 Sekunden Echtzeit "Schwammiger Pegel" (Pegelanzeige zeigt ungenaue Werte, Bild leicht verwaschen) und Bewegung −10 %.
- **Darstellung:** Stilisiert, kleines Pixel-Item mit Wölkchen-Icon, **keine Verherrlichung**, kein Konsumtutorial, nur Spielmechanik. Name im Spiel: "Dicke Tüte". Im Hilfetext: "Fiktives Spiel-Item".
- **Offene Frage an Tobi:** Soll das Item im Spiel so heißen oder nur als "Spezialitem" auftreten? Falls das Spiel auf Plattformen mit Altersfreigabe läuft, kann das Item durch ein Fantasie-Kraut ersetzt werden.

### 6.2 Scooter-Boost in der Diskothek

- **Auslöser:** Wenn in der Disko die Scooter-Leiste (füllt sich durch Tanzen im Takt) voll ist, kann man den Boost zünden (Aktionsknopf).
- **Wirkung für die ganze Truppe (10 Sekunden Echtzeit):**
  - Alle Standfestigkeitsverluste halbiert,
  - Bewegung +30 %,
  - Pegel steigt trotzdem normal (kein Freibrief),
  - Text-Einblendungen: "HYPER HYPER!", "HOW MUCH IS THE FISH?" (echte Scooter-Zitate sind erlaubt, Abschnitt 12), dazu eigene Sprüche wie "WIE VIEL IST DER KESSEL?",
  - Lichtshow; die Musik springt auf "Hyper Hyper" (YouTube-Video `aoXOdAUD7IM`, falls verfügbar und gewählt, sonst eigene MP3 oder WebAudio-Beat im Doppel-Tempo).
- **Cooldown:** 90 Sekunden Echtzeit.

### 6.3 Zusätzliche kleine Ereignisse (Auswahl)

1. **Kickerturnier (Kneipe, 15:00):** Aktionsknopf im richtigen Moment, Sieg gibt Gratisrunde Wasser.
2. **Taxi-Quiz (Marktplatz, 19:00):** Taxifahrerin fragt nach Weg zum Hotel. Richtig antworten gibt Abkürzung in die Disko (Taxi-Schnellreise einmalig).
3. **Wirt gibt eine aus (Zufall, Kneipe):** Eine freie Runde für alle (zählt als Mittrunde, Teamstimmung +1).
4. **Stäffele-Sprint (später):** Treppe schnell hochlaufen mit Wackeldrift.

---

## 7. Steuerung

Nach Vorbild `eingabe.js` aus Finca (Aktionsnamen, Mapping, `druecke`/`neu`/`halt`, Pointer-Entprellung).

### Tastatur

| Aktion | Taste |
|---|---|
| Bewegen | Pfeiltasten oder WASD |
| Aktion (Tür, Bestellen, Essen, Prost) | E oder Leertaste |
| Press F (Aufstehen / Respekt) | F |
| Wasser trinken (Schnell) | Q |
| Item benutzen (Joint, Scooter-Boost) | R |
| Scooter-Playlist / Musik-Fenster ein-/ausklappen | P |
| Ton an/aus | M |
| Pause / Menü | Escape |
| Debug | ^ (Backquote) |

### Touch

- Links unten **virtueller Joystick** (dynamisch, erscheint dort, wo der Daumen aufsetzt).
- Rechts unten **Aktionsknopf**, rund, mit Symbol und Randfarbe nach Art (Bier, Essen, Wasser, Tür, Prost, Boost), wie `#knopf-aktion` in Finca.
- Zweiter kleiner Knopf: **Wasser** (Schnellzugriff). Dritter: **Item** (nur sichtbar, wenn Item da).
- Oben rechts: Ton, Vollbild, Scooter-Playlist, Info (Hinweis 18+).
- Hochformat (320×400) für Handy ist Standard, wie bei Finca; Querformat-Tipp entfällt, wenn nicht nötig.
- Doppeltipp-Entprellung übernehmen (280 ms, 8 px).

---

## 8. Technik

### 8.1 Grundsätze (wie Finca)

- Reines JavaScript, Canvas, **ohne Build**, klassische `<script src="js/...js?v=0.1">`.
- **Start per Doppelklick** über file:// (oder lokal per `python3 -m http.server 8000`), daher keine ES-Module, kein `fetch` auf lokale Dateien.
- Alles Gezeichnete aus Code (kein Bild-Asset). Favicon als Data-URL.
- Namespace: `window.Saufi` (analog zu `window.Dorf` in Finca). Jede Datei: `(function (g) { 'use strict'; var Saufi = g.Saufi = g.Saufi || {}; ... })(this)`.
- Unterstützte Größe: 320×176 Desktop, 320×400 Mobil-Hochformat, CSS-Skalierung `--s`, `image-rendering: pixelated`.

### 8.2 Dateiliste

```
index.html            Rahmen, Canvas (spiel, hud, ui), Knöpfe, Hinweis 18+, Script-Tags
README.md             Kurzanleitung (Doppelklick und lokaler Server), Steuerung, Musikquellen, Hinweis privat/18+
.gitignore            ignoriert music/*.mp3
music/playlist.js     Saufi.MUSIK = [] (Tobis eigene MP3s, standardmäßig leer, Anleitung im Kommentar)
js/rng.js             Seeded-Zufall (für Karte, Ereignisse, Cheat-Entdeckung)
js/karte.js           Stadtkarte + Innenräume als Kachelkarten, Türen, Hindernisse
js/pfad.js            A* für NPC-Bewegung (aus Finca übernehmbar)
js/kamera.js          Kamera folgt der Figur
js/eingabe.js         Tasten + Pointer + Touch
js/uhr.js             Spieluhr 08:00 bis 04:00, Phasen, Tönung, Licht, Öffnungszeiten
js/spieler.js         Hauptfigur: Bewegung, Drift bei Pegel, Inventar
js/charaktere.js      Datentabelle aller Figuren (Trinkfestigkeit, Farben, Leben, Anwärter-Prozent)
js/getraenke.js       Getränke und Werte (Pegel, Preis, Ort)
js/essen.js           Gerichte und Werte
js/pegel.js           Pegel, Standfestigkeit, Abbau, Schwellen, Umfallen, zweites Leben
js/runden.js          Mittrunden-Plan (feste Zeiten/Orte), Ausruf, Pflicht, Teamstimmung, Strafe
js/cheats.js          Wasser, Alkoholfrei-Tausch, Entdeckungswahrscheinlichkeit
js/ereignisse.js      Joint, Scooter-Boost, kleine Ereignisse
js/npcs.js            NPC-Verhalten der Truppe (folgen, trinken, umfallen)
js/punkte.js          Punkte, Wertung, Bestwert (localStorage mit Fallback)
js/hinweise.js        Text-Einblendungen ("PROST!", "HYPER!"), Sprüche
js/render.js          Zeichnen: Kacheln, Figuren, Licht, Neon, HUD, Pegelanzeige
js/ton.js             WebAudio: Hardstyle-Generator (Fallback), Effekte
js/musik.js           Musikquellen-Logik (MP3 > YouTube > WebAudio), Titelliste, YouTube-Player, audio-Element
js/speicher.js        Einstellungen/Bestwert
js/main.js            Spielschleife, Zustände (Start, Spiel, Pause, Ende), Verdrahtung
tests/run.js          Node-Runner (vm), lädt js/*.js in Kontext
```

Das sind 22 JS-Dateien, in v01 teilweise klein. Die Reihenfolge der Script-Tags folgt den Abhängigkeiten (rng → karte → pfad → kamera → eingabe → uhr → ... → main).

### 8.3 Musik und Ton

Es gibt drei Musikquellen. Der Ton startet erst nach der ersten Berührung/Taste (Browser-Regel, wie in Finca). Es wird **nichts aus dem Netz geladen außer dem YouTube-Player selbst** (IFrame Player API, nur Einbettung, kein Download).

**Reihenfolge der Quellen** (`Saufi.Musik.quelle()`):
1. **Eigene MP3s** aus `music/playlist.js` (falls `Saufi.MUSIK` nicht leer ist), Abspielen per `<audio>`.
2. **YouTube-Einbettung** (falls verfügbar **und** vom Nutzer gewählt): Seite läuft über http(s) (nicht file://), online, kein Player-Fehler.
3. **Eigener WebAudio-Hardstyle** als Fallback.

**Scooter-Playlist (Titelliste):** Im Menü gibt es den Knopf "Scooter-Playlist". Er zeigt die Titelliste als Text (Hyper Hyper, Move Your Ass!, How Much Is the Fish?, Maria (I Like It Loud), Nessaja, The Logical Song, Weekend!, Jigga Jigga!, One (Always Hardcore), Posse (I Need You on the Floor), Fire) und startet die Wiedergabe über die gewählte Quelle.

**YouTube-Einbettung:** Videos von Tobi (Liste `Saufi.YOUTUBE` in `music/playlist.js`, beliebig erweiterbar): `aoXOdAUD7IM` ("Scooter - Hyper Hyper"), `4YxTa1AUqps` ("Scooter - The Logical Song (Official Video)"), `Y5pdgyOzJtE` ("Scooter - One (Always Hardcore) (Official Video HQ)") und `teW0KULIir0` ("Scooter - How Much Is the Fish?"). Einsatz:
- Menü-Knopf "Scooter-Playlist": spielt beide Videos nacheinander.
- Automatisch in der Diskothek (Hyper Hyper, dann The Logical Song).
- Beim Scooter-Boost (Hyper Hyper).
- Der Player ist ein **kleines, ein-/ausklappbares Fenster** (sichtbar, YouTube verlangt das; mindestens 200×113). Er wird nicht versteckt.
- **Fallback:** Bei file://, ohne Internet, bei Player-Fehler oder Zeitüberschreitung beim Laden der API wird auf die nächste Quelle umgeschaltet und kurz ein Hinweis gezeigt (z. B. "YouTube geht nur über http://localhost, ich nehme den Spiel-Beat.").

**Eigene MP3s:** `music/playlist.js` ist ein normales Script-Tag (geht daher auch über file://) und setzt `Saufi.MUSIK = [{datei:'music/hyper-hyper.mp3', titel:'Hyper Hyper'}, ...]`. Standardmäßig leer, mit Anleitung als Kommentar. Es liegen keine MP3 im Repo, `.gitignore` ignoriert `music/*.mp3`.

**Eigener WebAudio-Hardstyle (Fallback):** alles im Code, 150 BPM, 4/4, Moll (z. B. Fis-Moll-Skala), eigene Melodie.
- **Kick:** Sinus mit schneller Tonhöhenabsenkung (Verzerrung per `WaveShaper`),
- **Bass:** Sägezahn, Tiefpass, Sidechain-artig (Gain-Dip auf Kick),
- **Hyper-Synth:** Rave-Lead aus Sägezahn mit leichtem Detune, kurze Stabs,
- **Hi-Hat/Clap:** Rauschen durch Filter,
- **Riser/Drop:** Rauschen mit steigendem Filter vor dem Drop.
- **Tagesverlauf in der Musik:** Morgens nur Bass und Hi-Hat leise (fast Lounge), Nachmittag Kick dazu, Abend Lead dazu, Disko volle Pracht, in der Kneipe gedämpft (Tiefpass). Übergang weich (Zeitkonstante wie `UEBERBLENDEN` in Finca).

**Text-Shouts:** "HYPER HYPER!", "HOW MUCH IS THE FISH?", "ONE MORE!", "RUNDE!" erscheinen als große Einblendung im Takt, **keine Sprachsamples**.

**Effekte** (immer WebAudio): Prost-Klirren, Schluck, Umfallen, Rundenglocke, Tür.

**Lautstärke:** Schalter Ton an/aus (Taste M, gespeichert unter `saufi.stumm`). Stumm gilt für alle Quellen (WebAudio, `<audio>`, YouTube `mute()`).

### 8.4 Tests (Node-Runner `tests/run.js`)

Gleiche Bauweise wie Finca: Dateien per `vm` in einen Kontext laden, Funktionen `test`, `gleich`, `wahr`, `nah`. Aufruf `node tests/run.js`. Geplante Tests:

1. **RNG:** gleicher Seed, gleiche Folge.
2. **Uhr:** 08:00 Start, 36 s pro Stunde, 04:00 Ende, `text()` Format, `phase()` Grenzen, Tönung monoton dunkler zur Nacht.
3. **Öffnungszeiten:** Disko um 21:59 zu, um 22:00 auf, Restaurant 23:00 zu.
4. **Pegel:** Getränkewerte addieren, Abbau pro Stunde, Obergrenze 4,0, Wasser senkt.
5. **Trinkfestigkeit:** Faktor skaliert Aufnahme je Figur.
6. **Standfestigkeit:** Sinkt über 3,0 ‰, steigt durch Essen, bei 0 Umfallen.
7. **Zweites Leben:** Raphael/Rudi stehen einmal wieder auf, Tobi nicht.
8. **Mittrunden:** Plan hat feste Zeiten/Orte, Ausruf zur vollen Stunde, Ablehnen gibt Strafe, Teamstimmung 0 = Niederlage.
9. **Alkoholfrei:** Entdeckungschance deterministisch bei festem Seed, Limit 3 pro Runde, Pegel unverändert.
10. **Essen:** Werte wirken, Völlegefühl nach 3 Gerichten.
11. **Anwärter-Fortschritt:** Raphael 10 % → +4 % pro Runde, Tobias 80 % erreicht 100 % nach 4 Runden, Aufnahme-Ereignis genau einmal.
12. **Joint:** Nächster Effekt doppelt, danach normal, Gegengewicht greift.
13. **Scooter-Boost:** Nur bei voller Leiste, Cooldown, Wirkung für alle.
14. **Sieg/Niederlage:** 04:00 stehend = Sieg, Umfallen ohne Leben = Niederlage.
15. **Karte:** Türen erreichbar per A*, keine eingesperrten Orte, alle vier Orte verbunden.
16. **Ton:** `noten()` liefert für Takt gültige MIDI-Werte.
17. **Eingabe:** Tasten-Mapping, Entprellung.
18. **Hinweistext:** Hinweis 18+ ist im Start-Bildschirm vorhanden.
19. **Musikquellen-Logik:** Reihenfolge MP3 > YouTube > WebAudio; leere Playlist = keine MP3-Quelle; file:// = kein YouTube; Fallback bei Player-Fehler.
20. **Playlist:** Titelliste enthält die Scooter-Titel, die YouTube-Liste in `music/playlist.js` enthält die vier IDs von Tobi (ungültige IDs werden ignoriert), die MP3-Liste `Saufi.MUSIK` ist standardmäßig leer.

---

## 9. Umfang

### Version 01 (strikt klein, in einer Sitzung baubar)

- **Eine** Stadtkarte klein (ca. 40×30 Kacheln) mit **vier Türen** und Hang-Optik als Dekoration (kein Treppen-Malus).
- **Innenräume:** Pro Ort ein einfacher Raum (ein Raum pro Ort, kleine Raumgröße).
- Spielbar: nur **Tobi**; die übrigen Figuren sind NPCs, die der Figur folgen und bei Runden mittrinken.
- Uhr 08:00 bis 04:00 mit allen Lichtphasen.
- Pegel, Standfestigkeit, Umfallen, zweites Leben (nur Raphael/Rudi).
- Mittrunden: 6 feste Runden (statt 10), Teamstimmung.
- Getränke: Pils, Radler, Kurzer, Wasser, Alkoholfrei. Essen: Frühstück, Maultaschen, Linsen, Brezel.
- Alkoholfrei-Cheat mit Entdeckungschance.
- Joint (ein Item, ein Fundort) und Scooter-Boost (einfach).
- Musik: drei Quellen (eigene MP3 aus `music/` > YouTube-Einbettung mit den Videos aus `music/playlist.js` > WebAudio-Hardstyle als Fallback), Knopf "Scooter-Playlist" mit Titelliste, Text-Shouts, Hinweis bei file://.
- `music/playlist.js` (leer, mit Anleitung), `.gitignore`, `README.md` (Deutsch).
- Test-/Debug-Haken: URL-Parameter `?tempo=N` und `?seed=N`, globale Funktion `Saufi.debug`.
- Tastatur und Touch (Joystick, Aktionsknopf).
- Hinweis 18+ am Start.
- Tests aus Abschnitt 8.4 (Kern: 1 bis 8, 14, 15, 18) plus 19 und 20 (Musikquellen).
- Punkte ohne Bestenliste.

### Später

- Hang mit Stäffele und Weinbergen vollständig, Bahn als Schnellreise, Taxi-Quiz.
- Figurenwahl, mehr Ereignisse, Kickerturnier-Minispiel.
- Bestechung, Bestenliste, Sicherungs-Code (wie Finca Elternbereich → hier Einstellungen).
- Feineres Audio (mehr Patterns, Pattern-Wechsel, Drops).
- Mehrspieler an einem Gerät (jede Person eine Figur).
- Mehr Sprüche, Schwäbisch-Dialektmodus.

---

## 10. Annahmen und offene Fragen an Tobi

### Annahmen
1. **Prozentwerte = Anwärter-Fortschritt** (Raphael 10 %, Tobias 80 %), siehe 5.2.
2. **Raffi = Raphael** (eine Person, hat zweites Leben).
3. **Rudi = Gastfigur** mit zweitem Leben, später eventuell Stammmitglied.
4. **Spielbar in v01 nur Tobi**; die Liste der Stammmitglieder inklusive Tobi ergibt 8 plus 2 Anwärter plus Rudi = 11 Figuren.
5. Eigenheiten, Farben und Trinkfestigkeit der Figuren sind **erfunden**.
6. Alle Orte, Straßen und Produkte sind **erfunden** ("Kesselblick", "Maultäschle", "Zum durstigen Dachs", "Untergrund 07", "Kesselbull").
7. Rundendauer 12 Minuten, Startzeit 08:00 (wie vorgegeben).
8. Pegelwerte sind **fiktiv** und kein Maßstab fürs echte Leben.
9. Der Joint ist ein reines Spiel-Item ohne Tutorial-Charakter und kann ersetzt werden.

### Offene Fragen
1. **Rudi:** Stammmitglied, Gast oder Anwärter? Hat er eine eigene Eigenheit?
2. **Raffi vs. Raphael:** Wirklich dieselbe Person?
3. **Prozentwerte:** Stimmt meine Deutung als Anwärter-Fortschritt? Oder sollen sie z. B. Trinkfestigkeit oder Startpegel sein?
4. **Echte Eigenheiten:** Gibt es Insider-Sprüche, Looks oder Running Gags der Freunde, die rein sollen? (Namen sind ja echt, was darf über sie gesagt werden? Alle einverstanden?)
5. **Joint:** Name und Darstellung? Das Spiel bleibt privat (Abschnitt 12), die Frage nach Plattform/Altersfreigabe entfällt.
6. ~~Scooter-Anspielungen~~ **Erledigt:** Scooter ist erlaubt, echte Titel als Text und Zitate sind drin (Abschnitt 12).
7. ~~Repo öffentlich?~~ **Erledigt:** privates Repo, echte Namen bleiben (Abschnitt 12).
8. **Spieldauer 12 Minuten** ok oder lieber 8 oder 20?
9. **Mehrere Spieler** (Couch) gewünscht?
10. **Dialekt:** Schwäbische Sprüche ja/nein, wie stark?

---

## 11. Hinweis Jugendschutz und Verantwortung

Im Spiel erscheint beim Start (und unter dem Info-Knopf) ein kurzer Hinweistext, der bestätigt werden muss:

> **Press11 - Saufi Saufi** ist ein fiktives Spaß-Spiel für Erwachsene (ab 18). Alle Personen, Orte, Getränke und Werte sind erfunden. Die Promille-Anzeige ist ein Spielelement und kein Maßstab. Das Spiel ruft nicht zum Trinken auf. Trink im echten Leben nur, was Du verträgst, setz Dich nie betrunken ans Steuer und pass auf Deine Freunde auf. Drogen sind nicht harmlos: Der "Joint" ist nur ein Spiel-Item.

Zusätzlich:
- Hinweis kurz auch auf dem Endbildschirm ("Danke fürs Spielen, trink Wasser.").
- Keine Anleitung zum Konsum, keine Darstellung realer Mengen oder Mischungen als Empfehlung.
- Das Spiel hat keine Werbung und keine Weitergabe von Daten, alles läuft lokal. Einzige Ausnahme: Wählt man YouTube, lädt der eingebettete Player von YouTube nach; das Spiel selbst sendet nichts.
- Das Spiel wird nicht öffentlich geteilt (privates Repo, kein GitHub Pages).
- Die Lust zum Vergleich ("wer trinkt am meisten") wird nicht belohnt: Punkte gibt es fürs **Durchhalten**, nicht für die Menge.
