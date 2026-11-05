# Bau Bericht v26: Stadt, Nacht-Hecke, Feedback

Basis: main `680be33`, VERSION 0.25.

## Stadt

In `js/stadtvolk.js` liegt das Umfeld neben Wirt, Kalle und der Rezeptionistin. Es blockiert keine Kachel und zieht kein `S.rng`.

- Frau Hilde geht auf dem Gehweg östlich vom Hotel und bleibt zwischendurch stehen.
- Jule, Samir und Nico hängen im Südpark, Nico sitzt.
- Mina und Levin spielen auf dem Gras westlich vom Südpark.
- Zwei Hunde, einer steht am Park, einer läuft den Gehweg.
- Vier Vögel kreisen.
- Autos auf der Hauptstraße und auf dem Asphalt.
- Zwei Fahrräder stehen auf Gehwegen, eines fährt.

Südpark, Reben und Motocross bleiben, wo sie sind. Die Truppe und die Trinkschleife bleiben.

## Himmelsbach

Die Startkarte von Himmelsbach zeigt die Rolle `alter Hase`. Plus und Minus bleiben (`zieht zur Runde`, `wenig Pause`). Das Motivator-Flag bleibt, er kommt weiter ab 14:00. Es gibt keine neue Auswahlkarte Michael.

## Hecke, nur nachts

Zufallsereignis in `Ereignisse.Hecke`, nicht dauerhaft in der Stadt. `Uhr.phase` ist `Nacht` (ab 21:00) oder `Tiefe Nacht` (ab 24:00 bis 04:00). Tagsüber, auch am Abend, startet es nicht.

Ob es in einer Nacht losgeht, hängt am Seed und an der Uhr, nicht an `S.rng`. Dieselbe Partie sieht denselben Ablauf. Probst (Karte id `raphael`) quetscht sich langsam durch eine Hecke und hat in der Szene keine Hose. Himmelsbach steht daneben und filmt mit dem Handy. Die Blase sagt `Für die Gruppe, Probst.` Danach ist die Szene weg.

## Auswahl-Musik

Auf der Charakterauswahl läuft ein eigener WebAudio-Loop in `js/ton.js` (`setzeAuswahl`, 168 BPM). Kick, Sidechain, Super-Saw, Offbeat-Hats. Das ist eine eigene Figur im bestehenden Synth, kein Scooter-MP3 und kein kommerzielles Track-File. Im Repo liegt keins, `music/*.mp3` bleibt draußen.

Ton aus und Musik aus gelten auch dort. Beim Spielstart geht `setzeAuswahl(false)` und die normale Uhr-Kurve übernimmt denselben Synth. Es läuft nicht zweimal.

## Feedback ohne GitHub-Konto

Die Seite unter `/feedback/` nimmt weiter Name (optional) und Text (Pflicht). Dazu die Wahl Feedback, Neue Idee oder Feedback (Sprache).

Die Spracherkennung nutzt `SpeechRecognition` im Browser, wo es sie gibt. Chrome und Safari können das oft, Firefox oft nicht. Die Seite speichert keine Aufnahme. Ins Issue geht nur der Text. Fehlt die Erkennung, bleibt das Textfeld.

Absenden schickt JSON an die Adresse in `feedback/ziel.json`. Ein Token steht nicht im Frontend. Der Worker `workers/feedback-eingang/` prüft Art, Länge und ein Honigfeld und ruft `repository_dispatch` (`press11-feedback`). Der Workflow `.github/workflows/feedback-eingang.yml` legt das Issue mit `GITHUB_TOKEN` an (`issues: write`). Titel: `[Feedback]`, `[Idee]` oder `[Feedback (Sprache)]`. Im Body von Ideen steht `Art: Idee`, bei Sprache `Quelle: Sprache`.

Klappt der Versand nicht, bleibt ein Hinweis und ein Entwurfslink auf `issues/new` für Leute mit GitHub-Konto.

### Was Tobi setzen muss, bevor anonymes Absenden live ist

1. Fine-grained PAT, nur dieses Repo `topsentopsen/press11-saufi-saufi`. Recht: **Contents: Read and write** (GitHub verlangt das für `POST /repos/{owner}/{repo}/dispatches`; Metadata: Read kommt dabei mit). Ablaufdatum nach Bedarf. Den Token nicht ins Repo und nicht in die Pages-Dateien.
2. Worker deployen (`workers/feedback-eingang`, `npx wrangler deploy`) und das Secret **`PRESS11_DISPATCH_TOKEN`** nur dort setzen (`npx wrangler secret put PRESS11_DISPATCH_TOKEN`). Ein GitHub-Actions-Secret ist dafür nicht nötig. Der Workflow benutzt das eingebaute `GITHUB_TOKEN`.
3. Die öffentliche Worker-URL (kein Geheimnis) in `feedback/ziel.json` unter `url` eintragen und committen.

Bis dahin zeigt die Seite beim Absenden den Hinweis und den Entwurfslink.

`VERSION` ist `0.26`.
