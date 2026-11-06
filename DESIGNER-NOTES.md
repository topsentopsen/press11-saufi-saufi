# Designer-Notizen: Innenräume – Zoom, Sprechblasen, Übergang

Branch `designer-innenzoom`. Betrifft alle vier Innenräume: Hotel „Jaz“ (16×12 Kacheln), Gasthaus Maultäschle (16×12),
Sophies Brauhaus / Kneipe (14×11), Disko „Untergrund 07“ (18×12). Weitere Innenräume gibt es nicht; der Motocross-Park
ist Teil der Stadtkarte.

Referenzgerät für alle Zahlen: Handy hochkant, 390×844 CSS-px. Das Spiel rechnet dort mit 320×700 logischen px,
1 logisches px ≈ 1,22 CSS-px.

## Ausgangslage (v0.35)

| | draußen | drinnen (alt) |
|---|---|---|
| Hochformat | Zoom 1,0 (Sicht 320×700 Welt-px) | „Cover“-Zoom ≈ 3,6: füllt die Höhe, zeigt nur ~90 von 256 px Raumbreite |
| Querformat | Zoom 0,5 (Sicht 640×352) | Cover ≈ 1,25: Raum oben und unten abgeschnitten |
| Sprechblasen | skalieren mit dem Welt-Zoom | drinnen also bis zu 3,6× so groß wie draußen |
| Übergang | 0,5 s Abblende auf Dunkel, Kartenwechsel in der Mitte, harter Zoomsprung | |

Hauptproblem: Drinnen sah man im Hochformat nur einen Ausschnitt des Raums (Tresen, Tanzfläche und Ausgang selten gleichzeitig
im Bild). Die Blasen waren riesig und verdeckten die Figuren.

---

## A) Vorschlag (Werte und Begründung)

### 1. Kamera-Zoom

- **Draußen: unverändert.** Hochformat 1,0, Querformat 0,5, jeweils × Nutzer-Zoom.
- **Drinnen: `min(Raum-Fit, Außen-Basis × 0,9) × Nutzer-Zoom`, nie unter 0,4.**
  - *Raum-Fit* bedeutet, dass der ganze Raum plus **1 Kachel (16 px) Rand** ringsum ins Bild passt („contain“, nicht „cover“).
    Der Rand hält die Wände lesbar und verhindert, dass der Raum an den Bildschirmrand klebt.
  - *Außen × 0,9:* Drinnen soll sich wie ein Schritt zurück anfühlen, also wie ein Überblick. Im Hochformat sind alle Räume
    schmaler als 20 Kacheln. Ein reiner Fit wäre dort *näher* als draußen (Brauhaus 1,25). Der Deckel 0,9 sorgt dafür,
    dass drinnen immer weiter herausgezoomt ist als draußen. 10 % sind gerade genug, damit es spürbar ist. Figuren bleiben
    am Handy bei etwa 17 CSS-px Höhe gut erkennbar.
  - *Untergrenze 0,4 statt 0,5:* Die Stadt darf nicht unter 0,5 (Performance, Leere neben der Karte). Ein Raum ist klein
    und billig zu zeichnen. Ohne diese Ausnahme wäre im Querformat drinnen nicht weiter raus möglich.
- **Nutzer-Zoom ± als reiner Faktor** auf beide Werte (Stufen 0,75 … 1,45). Wer draußen + gedrückt hat, ist drinnen
  ebenfalls proportional näher. Das Verhältnis innen zu außen bleibt also gleich.
- **Spieler bleibt Bezugspunkt.** Die Kamera zentriert auf den Spieler, auch mit dem bestehenden Daumen-Versatz von 12 %
  nach oben. Neu ist nur eine Regel: Passt der Raum in einer Achse komplett ins Bild, folgt die Kamera dem Spieler in dieser
  Achse nur so weit, dass der Raum vollständig sichtbar bleibt. Vertikal ist im Hochformat immer genug Platz, dort ist der
  Spieler exakt mittig. Horizontal kann er bis zu etwa einem Viertel aus der Mitte rutschen, wenn er an einer Seitenwand
  steht. Das entspricht der Logik draußen, wo die Kamera am Kartenrand auch stoppt. Bei Nutzer-Zoom + ist der Raum größer
  als das Bild, dann gilt normales Folgen.

Ergebnis im Hochformat (390×844):

| Raum | Zoom alt | Zoom neu | Raum am Schirm (Breite) |
|---|---|---|---|
| Hotel / Gasthaus (256×192) | 3,65 | 0,90 | 230 von 320 px (72 %) |
| Brauhaus (224×176) | 3,98 | 0,90 | 202 von 320 px (63 %) |
| Disko (288×192) | 3,65 | 0,90 | 259 von 320 px (81 %) |

Querformat: draußen 0,5, drinnen 0,45. Der Raum steht dort als kleines „Diorama“ im Dunkeln (siehe offene Punkte).

### 2. Sprechblasen

- **Draußen: unverändert**, Blasen-Skala = Welt-Zoom.
- **Drinnen: 85 % der Außengröße**, aber die 8-px-Blasenschrift bleibt **mindestens 8,5 CSS-px** groß und wird **nie größer
  als draußen**.
  - 85 % bringt sichtbar mehr Raum zwischen den Figuren. Die Innenwelt ist um 0,9 kleiner, die Blasen um 0,85: Relativ zu
    den Figuren werden sie also leicht kleiner, sie verdecken weniger.
  - 8,5 CSS-px: Draußen liegt die Blasenschrift am 390er-Handy bei 9,75 CSS-px. Die Projekt-UI-Untergrenze ist 9 CSS-px
    (`MIN_CSS_SCHRIFT`). Kurze Blasentexte auf hellem Grund mit dunkler Tinte sind auf Retina mit 8,5 noch sauber lesbar.
    Darunter wird es auf kleinen Geräten zäh.
  - Ist die Schrift schon draußen kleiner als 8,5 (sehr schmale Geräte, 320 CSS-px), wird drinnen nicht weiter verkleinert.
- Nutzer-Zoom wirkt auch auf die Blasen, weil er im Außenzoom steckt.
- Während der Zoomfahrt bleibt die Blasengröße konstant, damit die Blasen nicht „pumpen“.

| Gerät (CSS-Breite) | draußen | drinnen | Faktor |
|---|---|---|---|
| 320 | 8,0 px | 8,0 px | 1,00 |
| 360 | 9,0 px | 8,5 px | 0,94 |
| 390 | 9,75 px | 8,5 px | 0,87 |
| 430 | 10,75 px | 9,14 px | 0,85 |

### 3. Übergang

Die Abblende (0,5 s, Kartenwechsel bei voller Dunkelheit) bleibt. Sie kaschiert den Kartentausch. Neu ist eine Zoomfahrt,
die im dunkelsten Moment startet und unter dem Aufblenden weiterläuft:

| | Startfaktor | Dauer | Kurve | Wirkung |
|---|---|---|---|---|
| **Betreten** | 1,25 × Innen-Zoom | 0,70 s | easeOutCubic | Man steht kurz „in der Tür“, dann zieht die Kamera auf den ganzen Raum auf. Ein Reveal. |
| **Verlassen** | 0,80 × Außen-Zoom | 0,55 s | easeOutCubic | Kurz der weite Blick auf die Straße, dann schiebt die Kamera zurück auf Normal. |

- **easeOutCubic:** schneller Start (größtenteils noch unter der Blende), weiches Ankommen. Nach der Hälfte der Zeit sind
  87,5 % des Wegs geschafft. Es gibt kein Nachfedern oder Überschwingen, weil das Spiel ohnehin wackelt, sobald man
  angetrunken ist.
- **Längen:** Betreten ist etwas länger, weil das Reveal wirken soll. Verlassen ist knapper, weil man draußen weiterwill.
  Mit Blende fühlt sich der Wechsel rein etwa 0,95 s und raus etwa 0,8 s an. Das ist unter der Schwelle, ab der Türen
  nerven.
- **Spieler als Pivot:** Während der Fahrt wird die Kamera jeden Frame auf den Spieler gesetzt. Er bleibt an seiner
  Bildschirmposition, und die Welt skaliert um ihn herum.
- **Steuerung blockiert nicht:** Man kann schon während der Fahrt loslaufen.
- **Ruhiger Modus:** keine Zoomfahrt, nur die Blende.
- **Kein Blick über den Stadtrand:** Beim Verlassen zoomt die Kamera nur so weit heraus, wie die Stadtkarte das Bild füllt.
  Im Querformat mit Standard-Zoom ist die Stadt genau bildbreit, dort entfällt die Fahrt beim Verlassen und es bleibt bei
  der Blende.

### Offene Punkte / Tuning-Ideen

- Im **Querformat** wirkt der Raum bei 0,45 eher klein (etwa 36 % Bildbreite). Wenn das stört, könnte man die 0,9-Regel nur
  im Hochformat anwenden und im Querformat den reinen Raum-Fit nehmen (etwa 0,79). Dann wäre es dort aber näher als
  draußen.
- Im Hochformat bleibt unter dem Raum viel dunkle Fläche. Eine mögliche spätere Idee wäre eine dezente Vignette oder eine
  Außenwand-Textur statt Flachdunkel.

---

## B) Umsetzung

**`js/kamera.js`**
- Neue Konstanten: `INNEN_RAND = 16`, `INNEN_RELATIV = 0.9`, `INNEN_MIN_ZOOM = 0.4`,
  `FAHRT = { rein: { von: 1.25, dauer: 0.7 }, raus: { von: 0.8, dauer: 0.55 } }`.
- `innenZoom(viewW, viewH, pxW, pxH, aussenBasis, userZoom)` ist die reine Zoom-Formel von oben.
- `easeOutCubic`, `starteFahrt(art)`, `fahrtFaktor(f)`, `fahrtUpdate(f, dt)` steuern die Zoomfahrt als Faktor, der von
  `von` auf 1 läuft.
- `ziel()` hat die neue Option `k.raumHalten`. Passt die Karte in eine Achse, wird nicht mehr starr zentriert, sondern
  auf den Spieler, begrenzt auf `[weltW − viewW, 0]`. Der Raum bleibt also ganz sichtbar. Draußen ist das Flag aus, das
  Verhalten bleibt identisch.

**`js/render.js`**
- `weltZoomFuer` berechnet draußen `WELT_ZOOM` (mit Fahrtfaktor, gedeckelt auf Stadtgröße) und drinnen `Kamera.innenZoom × Fahrtfaktor`.
  Es setzt `kamera.raumHalten` und `R.blasenSkala`. Während einer Fahrt wird jeden Frame `Kamera.sofort` aufgerufen,
  damit der Spieler der Pivot bleibt.
- Die Sprechblasen sind vom Welt-Zoom entkoppelt. `zeichneBlasen` zeichnet mit `R.blasenSkala`. Anker, Ausweich-Rechtecke
  und Sichtfenster werden in Blasen-Koordinaten umgerechnet.
- Nebenbei behobener Fehler: Das Sichtfenster der Blasen nutzte bisher die Außen-Sicht (`VW`/`VH`). Drinnen konnten Blasen
  deshalb aus dem Bild rutschen.
- Neue Konstanten und Funktion, exportiert: `BLASE_INNEN = 0.85`, `BLASE_MIN_CSS = 8.5`, `BLASE_SCHRIFT = 8` und
  `blasenSkalaFuer(aussenZoom, innen, cssSkala)`.

**`js/main.js`**
- `betreten` startet die Fahrt `'rein'`, `verlassen` startet `'raus'` (im ruhigen Modus keine). `stelleHin` setzt
  `kamera.raumHalten`.
- `update` lässt `S.zoomFahrt` in jedem Spielzustand weiterlaufen, also auch während der Blende.

**`tests/run.js`** (266/266 grün mit `node tests/run.js`)
- Test 85 prüfte bisher den alten Cover-Zoom der Disko. Er prüft jetzt: ganzer Raum sichtbar, weiter raus als draußen,
  mindestens 75 % Bildbreite.
- 262: `innenZoom` für alle vier Räume im Hoch- und Querformat, Rand passt, Nutzer-Zoom als exakter Faktor,
  Contain-Fall, Untergrenze.
- 263: Render im Hoch- und Querformat × Nutzer-Zoom 0,75/1/1,45 × alle Räume. Draußen bleibt `WELT_ZOOM`, drinnen
  `0,9 × Basis × Faktor`, nach dem Verlassen wieder normal.
- 264: Innen-Kamera. Der Raum bleibt bei Spieler in jeder Ecke ganz sichtbar, der Spieler ist vertikal zentriert.
  Draußen ist `raumHalten` aus.
- 265: Blasen-Skala. Werte, Mindestschrift für 320/360/390/430 CSS-px, gleiche Blase am Schirm drinnen kleiner als
  draußen und im Bild, Nutzer-Zoom wirkt auch auf die Blasen.
- 266: Zoomfahrt. Konstanten und Easing. Beim Betreten startet sie bei 1,25 × Ziel, fällt monoton, dauert etwa 0,7 s und
  endet auf dem Innen-Zoom. Der Spieler bleibt jeden Frame vertikal auf seiner Position. Beim Verlassen startet sie bei
  0,8 und läuft im Spiel-Update auf 1. Die Blasengröße bleibt während der Fahrt fest, im ruhigen Modus gibt es keine Fahrt.
- 267: Die Fahrt beim Verlassen zeigt im Querformat nie mehr als die Stadt.

**Sichtprüfung:** In Headless-Chrome (390×844, DPR 2) habe ich Screenshots von draußen, der Hotel-Fahrt Mitte, dem Hotel
drinnen und der Fahrt beim Verlassen geprüft. Der Raum ist vollständig sichtbar, die Blase drinnen ist kleiner und gut
lesbar. Die anderen Räume hatten um 08:00 geschlossen und warfen den Spieler sofort hinaus; sie sind über die Tests
abgedeckt.

Nicht erledigt: keine Commits, kein Merge, `main` und `gh-pages` sind unberührt. Versionsnummer und README sind nicht
angepasst.
