# Bau Bericht v25: Feedback-Seite

Basis: main `cc34c78`, VERSION 0.24.

Eigene Mini-Seite, nicht im Spiel und ohne Knopf in der Spieloberfläche.

Live: https://topsentopsen.github.io/press11-saufi-saufi/feedback/
(auch `/feedback/index.html`, der Schrägstrich am Ende geht über `feedback/index.html`).

| Datei | Rolle |
|---|---|
| `feedback/index.html` | Formular, deutsch, dunkles Lila mit Pink |
| `feedback/feedback.js` | Titel, Text und Issue-Adresse. Kein Netz, kein Schlüssel |
| `.github/ISSUE_TEMPLATE/feedback.md` | Vorlage, wenn jemand das Issue von Hand anlegt |
| `.github/ISSUE_TEMPLATE/config.yml` | Verweist auf die Feedback-Seite |

Name ist optional, der Feedback-Text ist Pflicht. Absenden lässt die Seite stehen und öffnet

`https://github.com/topsentopsen/press11-saufi-saufi/issues/new?title=…&body=…`

Titel: `[Feedback]` plus eine kurze Vorschau. Text: Name, wenn angegeben, dann der ganze Text. Danach steht auf der Seite, dass der Entwurf bereit ist und ein Klick auf „Submit new issue“ bei GitHub ihn erstellt.

Die Adresse bleibt unter 8000 Zeichen, die Login-Umleitung (`/login?return_to=`) unter 7500. Längerer Text wird im Entwurf gekürzt, damit GitHub keine 414-Seite zeigt. Ein Personal Access Token liegt nicht im Repo.

Spielwerte und Figuren-Ids bleiben. Sichtbare Startkarten:

- Schwinki, Feld Schwäche: `keine Schwäche` (`auswahl.minus`). Nachschub und `gehtAb` unverändert.
- Tobi, Plus-Zeile: `Elon-Sprüche, neu dabei`. Die Rollenzeile bleibt `Tesla-Tobi, Elon-Fanboy`, weil die Hochformat-Karte die Rolle nur eine Zeile lang zeichnet und „neu dabei“ am Ende der Rolle abgeschnitten wurde. Minus unverändert.
- Die wählbare Figur id `raphael` (Karte bisher Raphi, Name Raphael, Alias Raphi) heißt jetzt Probst. Alias entfernt, damit die Karte den Namen zeigt und `holen('probst')` die andere Figur trifft. Id bleibt `raphael`. Sprechblasen und die Anwärter-Neckerei in `js/frech.js` sagen Probst. Die nicht wählbare Figur id `probst` heißt weiter Probst; ihr Spruch und „Probst, du Arschloch!“ bleiben.

Es gibt keine Figur Nubi. „neu dabei“ steht nur in Tobis Plus-Zeile. Die Feedback-Seite hat kein Schwächen-Feld. `VERSION` `0.25`, alle `?v=0.25` in der Wurzel-`index.html`.
