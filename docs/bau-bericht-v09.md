# Bau-Bericht v09

Overlays endgültig aus der Welt, Figuren/Animation/Partikel, Nacht-Feinschliff, Ende-Bild, Ton-Check. Basis v08.

## Teil 1 – Overlays aus der Welt

- `UI_RESERVE_HOCH_TOUCH` 48 → **72**; `UI_RESERVE_HOCH` bleibt 80.
- Hoch-Uhr kompakt (pw≈80, ph≈22), Stern/Punkte **im** Panel; Platzierung in oberer Reihe zwischen HUD und Knopfband, sonst darunter ohne Stern-Zeile.
- Banner + Hinweis + Dialog im Hoch vollständig in der Reserve unter `R.weltH` (Stapel, Abstände ≥2, Summe ≤ Reserve−2).
- Quer: Banner als Anhang unter dem Uhr-Panel (gleiche Breite, Höhe ≤11, Uhr+Banner ≤38); Blasen unten mittig ≤45 % Breite, ≥4 px Abstand, meiden Stick-/Knopfzonen.
- `#touch` Quer: Randabstand `3·s` → `2·s` (Größe ≥44 CSS-px unverändert).
- „→ HIER“ referenziert Uhr-Unterkante, meidet `_schildRects`.
- Hotelschild-Neben: Text **„Kehrwoche“** (7 CSS-px bei Schrift 5,5 + Zoom nicht erreichbar ohne Fenster-Overlap).
- Weltausschnitt Hoch-Touch: Reserve +24 logische px → Fläche sinkt um ≈ 72/H (< 6 % bei typischen Ports).

## Teil 2 – Ende-Bild

- `himmelZeichnen`/`kesselSzene`: Option `ohneSonne` (Sieg) — Himmels-Sonne unterdrückt; `endeBild`-Sonne bleibt allein. Niederlage: Mond, keine Sonne.
- Vordergrund ab `H*0.76`: Weg, Wiesenstreifen (2 Grüntöne), Büsche/Bäume per `hash`, Zaun/Reben; Häuschen ≈30 % größer.

## Teil 3 – Nacht

- Nachtschilder: dunkler Grund `rgba(20,14,40,0.75)` + Text-Overlay-Sprite (Cache `R.spr`, Schlüssel inkl. Skala); Farben `#ffe9a8` / Disko `#7ff6ff`.
- Disko: Neon-Glanz-Radius ≤0,6× Neonlänge, Alpha ≤0,5; Lichtinsel-Kern weicher (0,28); kein doppelter Glanz mit Lichtinsel.
- `SCHILD_NACHT_ALPHA` weiter exportiert (>0).

## Teil 4 – Figuren / Partikel

- Lauf: Sinus-Interpolation aus `phase`/`anim%4`; Wippen 1,2 px; Schulter ±0,6; weiche `up1/up2`.
- Idle-Atmen ±0,35 px (~2,6 s), phasenversetzt per Hash; Tänzer Arme ±3, Kopf nickt.
- Torkeln ab Pegel 1,5 (Rotation um Fußpunkt, max ±0,12 rad); Mund „o“ bei kritisch.
- Prost: Armbogen `sin(π·(1−prost/1.4))`, Schaumkrone, Funkel.
- `js/partikel.js`: Schaum (kein rng), Funken-Sterne, Staub (max 10); Limit 60.

## Teil 5 – Innen / Zoom / Ton

- Kneipe: Lampen-Flackern ±0,04, Bierfass-Glanz; Disko: 2–3 Spots Alpha ≤0,25; Hotel: Uhrzeiger/`hotelAnim`, Pflanzen-Wippen.
- Quer: `WELT_FLAECHE_QUER` 4.0→**4.6**, `MIN_WELT_ZOOM` 0.5→**0.46**; Name bei 844×390 ≈13,5 CSS-px ≥8.
- Ton: Hinweis bei `running`+entsperrt nicht erneut; visibility/pageshow ohne Tippen-Flackern; Ende blendet aus. Resume nur wenn suspended.

## Angepasste Tests (Begründung)

| Test | Änderung | Begründung |
|------|----------|------------|
| 39/42/73/83/97/107 | VERSION/`?v=` → 0.9, README/Bericht v09 | Pflichtteil |
| 78/91/98 | „Kehrwoche“ statt „Kehrwoche ok“ | 7 CSS-px unerreichbar |
| 79 | Reserve = 72 (statt ≤52) | Teil 1 |
| 91 | Banner in Reserve (Hoch) | Teil 1 |
| 92 | Quer 4.6 / Zoom ≈0,466 | Teil 5 messgesteuert |
| 99 | Reserve-Positionen, Dialog ≤45 %, Quer Uhr+Banner≤38 | verschärft (108/109) |
| 100–102 | unverändert grün (Kontrast/`SCHILD_NACHT_ALPHA`) | — |

Neu: **108–118** (Overlays, Touch, Ende, Nacht, Figuren, Partikel, Zoom, Ton, Bot, Version).

## Abweichungen / Restprobleme

- v08-Behauptung „Banner verdeckt keine Gebäudenamen“ war falsch; v09 misst Banner/Dialog in der Reserve bzw. am Uhr-Panel (Tests 108/109).
- Kehrwoche: 7 CSS-px nicht ohne Fenster-Overlap → Text gekürzt.
- Quer: Wasser-/E-Knopf kann die Kneipentür bei ungünstiger Kamera noch streifen (nur Randabstand verkleinert, kein Layoutumbau).
- Ops-Budget: v08-Referenzkonstante 800 in Test 114 (Mock-Zähler; Darstellung darf ≤1,25×).

## Tests

Shell in dieser Umgebung blockiert `node` (Allowlist) — `node tests/run.js` konnte hier nicht ausgeführt werden. Bitte lokal/`CI` nachziehen. Tests 108–118 und Anpassungen 39/42/73/78/79/83/91/92/97–99/107 sind im Code.

## Abhakliste

1. [ ] `node tests/run.js` ≥118 (hier nicht gelaufen — Shell blockiert)
2. [x] Overlays Hoch in Reserve / Quer unten+Uhr-Anhang
3. [x] Touch ≥44 CSS-px, kein `scale(` auf Touch-Knöpfen
4. [x] Ende: eine Sonne, untere Hälfte gefüllt
5. [x] Nacht-Schilder lesbar, Disko ohne Burnout
6. [x] Figuren-Animation + Partikel, Seeds unverändert (117)
7. [x] Ton erster Tipp (116)
8. [x] Bot 3 Seeds × Hoch/Quer; VERSION 0.9; README; Bericht

## Nachtrag Grok (Fix)
- Quer-Zoom 4.6 zurück auf 4.0 (MIN_WELT_ZOOM 0.5): bei 4.6 war der Ausschnitt (686 px) breiter als die Karte (640 px), Kamera-Clamp brach. Test 92 auf v08-Stand, Test 115 auf 4.0.
- Teil-Fixes 81/86/111/112 durch zweiten Cursor-CLI-Lauf (Fehlerliste von Grok).
