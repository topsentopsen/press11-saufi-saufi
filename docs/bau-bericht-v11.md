# Bau-Bericht v11

Plan und Test: Claude. Umsetzung: Grok.

1. Musik abschaltbar (N, ♬, Pausemenü), gespeichert als `musikAus`; nur der Musik-Bus wird stumm.
2. MP3 Playlist über `music/playlist.js`, YouTube als Fallback.
3. Ausschwärmen beim Betreten, Spontanrunden (max. 4, Abstand 90 Spielminuten, Timeout 30 s / 15 s offen).
4. Q Fehler: Wecken suchte nur 28 px, Freunde folgen aber 26 bis 53 px dahinter; Q trank daher still Wasser. Reichweite jetzt 48 px, Hinweis mit Abstandsprüfung, Stand nach Wecken 45.
5. Touch: Kontextknöpfe mit Beschriftung, deaktivierte Knöpfe feuern nicht.

Tests 134 bis 140 decken alle Punkte ab.
