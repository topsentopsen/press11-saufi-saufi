/* Playlist-Datei: hier stehen Tobis eigene MP3s und die YouTube-Videos. Nachtraege nur hier.

   Tobis eigene MP3s (privat, werden NICHT ins Repo gelegt: .gitignore ignoriert music/*.mp3).

   So geht es:
   1. Lege Deine MP3-Dateien in diesen Ordner (music/), zum Beispiel music/hyper-hyper.mp3.
   2. Trage sie unten in die Liste ein (eine Zeile pro Lied, Komma am Ende nicht vergessen):
        { datei: 'music/hyper-hyper.mp3', titel: 'Hyper Hyper' },
        { datei: 'music/the-logical-song.mp3', titel: 'The Logical Song' },
   3. Spiel neu laden. Sobald hier mindestens ein Eintrag steht, spielt das Spiel diese Lieder
      (vor YouTube und vor dem eingebauten Beat). Beim Scooter-Boost wird ein Titel mit "hyper" im Namen bevorzugt.

   Ist die Liste leer (Standard), nimmt das Spiel YouTube (nur ueber http://localhost) oder den eigenen Beat.
   Diese Datei ist ein normales Script und funktioniert deshalb auch per Doppelklick (file://). */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  Saufi.MUSIK = [
    // { datei: 'music/hyper-hyper.mp3', titel: 'Hyper Hyper' },
  ];

  /* YouTube-Playlist (nur Einbetten ueber die IFrame Player API, nichts wird heruntergeladen).
     Funktioniert nur ueber einen lokalen Server (http://localhost:8000), nicht per Doppelklick (file://).
     Neues Video nachtragen: die ID ist der Teil nach "youtu.be/" bzw. "watch?v=",
     z. B. https://youtu.be/teW0KULIir0  ->  id: 'teW0KULIir0'. Eine Zeile pro Video, Komma am Ende.
     Reihenfolge = Abspielreihenfolge. Beim Scooter-Boost wird ein Titel mit "hyper" bevorzugt. */
  Saufi.YOUTUBE = [
    { id: 'aoXOdAUD7IM', titel: 'Scooter - Hyper Hyper' },
    { id: '4YxTa1AUqps', titel: 'Scooter - The Logical Song (Official Video)' },
    { id: 'Y5pdgyOzJtE', titel: 'Scooter - One (Always Hardcore) (Official Video HQ)' },
    { id: 'teW0KULIir0', titel: 'Scooter - How Much Is the Fish?' },
    // { id: 'NEUE_ID', titel: 'Scooter - Titel' },
  ];
})(globalThis);
