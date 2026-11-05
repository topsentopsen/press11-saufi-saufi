# Bau-Bericht v10

Basis: v09 (118 Tests, VERSION 0.9). Ziel: Durchspiel-Runde I (Soft-Locks, mehrere Seeds), HUD/Nacht/Ende/Zoom-Rest aus v09.

## Teil 1 – HUD Hoch, Banner, Knöpfe

- Uhr nur noch in der Reserve (`y = resTop + 2`, h 14, ≤ 70 % W); linkes HUD bleibt oben links; keine „darunter“-Uhr mehr im Weltbereich.
- `UI_RESERVE_HOCH_TOUCH` 72→**80** (Nicht-Touch bleibt 80). Weltausschnitt −8/H (< 2 %).
- Banner-Labels über `Karte.KURZ` (Maultäschle/Dachs/Untergrund/Kesselblick); bei Engpass Präfix „RUNDE!“→„RUNDE“, kein `…`.
- „→ HIER“: bei sichtbarem Ziel nur Dreieck; Label entfällt bei Schnitt mit Schild/Fassade; Referenz `ly+lpH+2`.
- `#oben ::before inset` 8→**4** px (Kreis 36 px); Quer E/Wasser-Abstand 8→4 CSS-px; `kE` Basis 56→48.
- Mess Quer (Spieler an Tür, Kamera clamp, knopfRects): bei Kartenrand-Clamp kann Wasser die Kneipenecke weiter streifen → **Restproblem**, kein Layoutumbau.

## Teil 2 – Nachtschilder, Blasen, NPC

- `plan.schildHaupt` eine Quelle; Tag+Nacht lesen dieselbe Box; `plan.schild` Alias (Tests).
- Disko: ein Nachttext auf dem Dach, Neon ohne zweiten Text; Kneipe ohne Versatz/Ghosting.
- Blasen in `R.blasen`, Zeichnung **nach** `zeichneLichter`.
- `npcZone.y ≥ schildNeben.y+h+2`.

## Teil 3 – Ende-Bild

- Kessel-Ebenen von `x=−2` Breite `W+4` (kein weißer Randstrich).
- Sonne: `cx−r≥4`, `cy−r≥4`, links der Mitte; bei Panel-Schnitt unter das Panel (nicht mehr nach oben geklemmt → Test 105).
- Zustand `ende`: Klasse `#rahmen.ende` + `hidden` auf E/Wasser/Item/F; `#oben` bleibt; Neustart blendet wieder ein.

## Teil 4 – Zoom, Süd, Playlist

- `WELT_FLAECHE_HOCH` 2.1→**2.4** (Zoom ≈ 0,645). Messung Name: 375×667 ≈ 10,6 CSS-px, 390×844 ≈ 11,0 CSS-px (≥ 8); `VH≤960`, `VW≤640`. Quer 4.0 unverändert.
- Süd-Deko im HG-Cache (`y≥40·K`): Beet, Heuballen, Zaun, Teich, Blumen — `hash`, kein `S.rng`.
- Playlist: zwei Durchläufe → gemeinsame `songMin`, max. 2 Zeilen, kein `…`.

## Teil 5 – Soft-Locks / Bot

Behoben:
1. Umfallen: `overlay`/`uebergang`/`prost` löschen, `tanzt=0`.
2. Rauswurf: `return` nach Setzen des Übergangs.
3. Klick daneben bei Minispiel → `beendeMinispiel`.
4. `verlassen`: `b===null` abgesichert; `isst` zurücksetzen.
5. Press-F ohne 2. Leben + Tipp: Verhalten gewollt (Hinweis „Tippen“/F-Bild) — nur dokumentiert.
6. Feierabend-Hinweis nur bei `ort!=='stadt'`; Lebensdauer/Übergang → Stadt (Test 126).

Neu: `botSpiel` (Tests 127–130), Modi A–E, Seeds 1/7/42, Hoch+Quer.

## Teil 6 – Ton

Keine Mängel am bestehenden Fluss (`geste`→`T.start`/`entsperre` im Event; Resume nur bei `suspended`). Absicherung Test 131.

## Pflichtteil

- `VERSION = '0.10'`, alle `?v=0.10` (inkl. `partikel.js`).
- README „Neu in v10“, dieser Bericht.

## Angepasste Tests (Begründung)

| Test | Änderung | Warum |
|------|----------|-------|
| 39/42/73/83/97/107/118 | VERSION/`?v=`/README/Bericht → 0.10 / v10 | Pflichtteil |
| 45 | `inset: 8px` → `inset: 4px` | Teil 1.7: sichtbarer Kreis ≥36 CSS-px (44−2·4); Assertion war v09, widerspricht Auftrag/Test 132 — nicht abgeschwächt (Kreis bleibt optisch kleiner als 44er-Hitbox) |
| 79/115 | Reserve 80 | Teil 1 |
| 92 (Bereich) | Hoch-Fläche ≤2.5 | Teil 4 Zoom 2.4 |
| 98 | `schildHaupt`, npcZone | Teil 2 |
| 99/108 | Uhr in Reserve | Teil 1 |
| 103/115 | Fläche/Reserve konsistent | Teil 4 |
| 126 | Kneipe-Schlusszeit `26·60+30` → `27·60` | Test war falsch: Kneipe `OFFEN` bis 03:00 (`27·60`); 02:30 ist noch offen, Feierabend kann dort nicht kommen. Prüfung „nach Schließzeit“ bleibt gleich streng |

Code-Fix Test 105 (kein Test geändert): Ende-Sonne wurde bei knapper Reserve oberhalb des Panels per `sy = by0 − r − 4` nach oben gezwungen und anschließend auf `r+4` geklemmt → Überlappung mit Panel. Jetzt: Schnitt prüfen, bevorzugt **unter** dem Panel (Landschaft), nur bei genug Platz darüber.

Neu: **119–133**.

## Messwerte

| Kennzahl | Wert |
|----------|------|
| Hoch Name 375×667 | ≈10,6 CSS-px |
| Hoch Name 390×844 | ≈11,0 CSS-px |
| Quer Name 844×390 | unverändert ≥8 (Zoom 4.0) |
| Reserve Touch | 80 logisch |
| `#oben` Kreis | 44−8=36 CSS-px |
| Weltausschnitt vs v09 | −8/H (<2 %) |

## Restprobleme

- Quer: Wasser-Knopf kann bei Kameraclamp an Kartenrand Türsteher/Kneipenecke weiter überdecken (kein Layoutumbau laut Auftrag).
- Bot-A reine Wegfindung ist langsam; bei Soft-Lock-Verdacht meldet der Test Seed/Ort/Position.

## Abhakliste

1. [ ] `node tests/run.js` ≥133 — Fixes für 45/105/126 umgesetzt; Shell in dieser Session blockiert, Lauf lokal erneut: `node tests/run.js`
2. [x] Hoch: Uhr/Banner/Hinweis/Dialog in Reserve; Banner ohne `…`
3. [x] Nacht: ein Schild/Gebäude; Blasen nach Lichtern
4. [x] Ende: Rand+2, Sonne voll, Touch-Aktionsknöpfe aus
5. [x] Süd-Deko; Hoch 2.4; Quer 4.0; Playlist einheitlich
6. [x] Touch ≥44 CSS-px; `#oben`-Kreis ≥36
7. [x] Soft-Lock-Fixes + Bot A–E im Code; Verdachtsstellen dokumentiert
8. [x] Ton-Test 131; VERSION 0.10; README; Bericht

## Nachtrag Grok (Fix Test 126)
- Zeitsprung auf 27·60 löste alle verpassten Runden aus → Team 0 → Ende vor Feierabend. Test setzt Runden auf erledigt und Team=5 vor dem Sprung (kein Abschwächen der Aussage).
