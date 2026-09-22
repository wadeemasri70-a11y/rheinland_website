# Rheinland Digitalwerk — Website

Statische Website für die Digitalagentur Rheinland Digitalwerk.
Kein Build-Schritt, keine Abhängigkeiten — HTML, CSS und Vanilla JS.

Zum Ansehen genügt ein statischer Server, z. B. `python3 -m http.server`.

## Struktur

```
index.html            Startseite
impressum.html        Impressum (enthält Platzhalter)
datenschutz.html      Datenschutzerklärung (Grundfassung, Platzhalter)

assets/css/main.css   Design-Tokens beider Themes, Layout, alle Sektionen
assets/css/hero.css   Bühne der Hero-Szene
assets/css/machine.css Kontaktformular als Rechner samt Tastatur

assets/js/engine3d.js 3D-Kern: Transformhierarchie, Projektion, Sortierung
assets/js/scene3d.js  Geometrie, Materialien, Licht, Zeichnen
assets/js/anim3d.js   Zeitachse der Animation
assets/js/hero3d.js   Taktgeber, Theme-Abgleich, Replay
assets/js/i18n.js     Inhalte auf Deutsch und Englisch
assets/js/main.js     Theme, Sprache, Navigation, Formular

assets/img/           Logo (Wortmarke und Bildmarke)
```

## Die Hero-Szene

Ein kleiner Roboter läuft über einen Schreibtisch, der links im Bild auf eine
Wand trifft, steckt ein Kabel in die Steckdose, der Arbeitsplatz erwacht, der
Laptop startet, und der Roboter springt auf die Tastatur und schreibt pro
Sprung eine Zeile Code. Danach geht ihm die Puste aus: Er sackt zusammen,
kippt rücklings über die Tasten, bleibt liegen und atmet durch. Das Bild
blendet ab, und alles beginnt von vorn — die Schleife dauert rund 27
Sekunden.

Das ist echtes 3D: Geometrie, Perspektive und Beleuchtung werden pro Bild
berechnet und auf ein `<canvas>` gezeichnet. Der Look orientiert sich an
*INSIDE* — Silhouetten, die ein farbiges Streiflicht von der Kante hebt — in
der Farbwelt des Logos.

### Aufbau

`engine3d.js` ist ein kleiner Software-Renderer: Knoten mit lokalen
Transformationen, eine Lochkamera und Flächensortierung nach Tiefe
(*painter's algorithm*). Zwei Eigenheiten sind wichtig, wenn man die Szene
erweitert:

- **Große Flächen müssen unterteilt werden.** Sortiert wird nach dem
  Schwerpunkt einer Fläche. Eine einzelne große Fläche, deren Mitte näher an
  der Kamera liegt als ein kleines Objekt davor, übermalt dieses Objekt.
  Dafür gibt es `E.grid(...)`.
- **Architektur bekommt eine feste Ebene.** Wand (`layer: 0`), Tisch
  (`layer: 1`) und alles andere (`layer: 2`) haben eine unveränderliche
  Reihenfolge; innerhalb einer Ebene entscheidet die Tiefe. Außerdem sind
  diese Materialien `flat` und `nofog`, weil sonst die Unterteilung als
  Streifenmuster sichtbar wird. Die Tiefenwirkung kommt stattdessen aus dem
  Bildschirmraum-Dunst in `atmosphere()`.

### Anpassen

- **Timing** steht gesammelt im Objekt `T` in `anim3d.js`. Die Länge der
  Schleife ergibt sich aus `T.loop`; die Phasen nach dem letzten Sprung
  (`tireTo`, `flopTo`, `restTo`, `fadeTo`) hängen aneinander, sodass eine
  Änderung am Hüpfen den Rest automatisch nachzieht.
- **Auf welche Tasten der Roboter springt** bestimmt `HOP_KEYS`; pro Sprung
  wird eine Zeile aus `CODE` getippt.
- **Die Form eines Sprungs** steckt in `AP` und `FLIGHT`: erst hockt sich der
  Roboter an Ort und Stelle hin, dann fliegt er mit gleichbleibender
  waagerechter Geschwindigkeit auf einer Wurfparabel, dann federt er die
  Landung ab. Die Waagerechte wurde früher mit ein- und ausklingender
  Kurve interpoliert — der Roboter bremste also mitten in der Luft ab, was
  der Hauptgrund für den schwebenden Eindruck war.
- **`gait`** blendet zwischen Stehen und Gehen über und skaliert Schrittweite,
  Wippen und Neigung. Ohne das sprangen die Beine beim ersten Schritt in die
  Mitte des Zyklus und beim letzten stramm auf null.
- **Kamera und Bildausschnitt**: `new E.Camera({...})` in `scene3d.js`.
  `shiftX` verschiebt den Bildmittelpunkt, ohne die Perspektive zu verzerren
  — so sitzen die Objekte links und die Überschrift rechts. Auf schmalen
  Bildschirmen setzt `hero3d.js` die Verschiebung zurück.
- **Die RGB-Beleuchtung** der Tastatur fährt hoch, sobald der Roboter zu
  tippen beginnt (`st.rgb` in `anim3d.js`, `backlight()` und `rgbGlow()` in
  `scene3d.js`). Jede Taste hat ein eigenes Materialobjekt, dessen Farbe pro
  Bild gesetzt wird; eine Farbwelle läuft anhand der Position über das
  Brett. Geometrie wird dafür nicht angefasst.
- **Farben und Licht** stehen in `MAT` und `THEMES` in `scene3d.js`.
  `MAT.screen` ist der einzige Eintrag, der pro Bild verändert wird: Er
  blendet zwischen dunklem und laufendem Bildschirm um, weil emittierende
  Flächen sonst auch bei ausgeschaltetem Strom leuchten würden.

Zwei Kleinigkeiten tragen viel zur Lebendigkeit bei und sind leicht zu
übersehen: Die Antenne hängt an einem eigenen Knoten und wird von einer
gedämpften Feder bewegt, die auf die vertikale Beschleunigung des Körpers
reagiert — sie eilt dem Körper nach und schwingt bei jeder Landung aus. Und
die Arme schwingen um eine knappe halbe Phase versetzt zu den Beinen; ohne
diesen Versatz wirkt der Gang mechanisch.

Bei `prefers-reduced-motion: reduce` wird statt der Animation das fertige,
beleuchtete Schlussbild gezeigt. Läuft die Szene aus dem Sichtfeld, pausiert
die Schleife.

## Zählende Kennzahlen

Die vier Zahlen im Streifen unter dem Hero zählen bei **jedem** Eintritt ins
Sichtfeld von null hoch, nicht nur beim ersten Mal. Der Zielwert steht als
`data-count` im HTML, nicht in den Sprachdateien — er ist in beiden Sprachen
derselbe.

Eine Feinheit, die leicht Zeit kostet: `isIntersecting` bleibt wahr, solange
auch nur ein Pixel sichtbar ist, und taugt deshalb nicht, um das Verlassen
des Sichtfelds zu erkennen. Der Beobachter wertet stattdessen
`intersectionRatio` gegen ausdrückliche Schwellen aus — ab 0,6 startet er,
unter 0,15 setzt er zurück. Der Abstand zwischen beiden Werten verhindert,
dass eine Zahl am Rand des Sichtfelds flackert. Zurückgesetzt wird, während
der Streifen außerhalb des Bildes liegt, sodass der nächste Durchgang ohne
sichtbaren Sprung bei null beginnt.

Bei `prefers-reduced-motion: reduce` stehen die Endwerte sofort da.

## Das Kontaktformular als Rechner

Das Anfrageformular steckt in einem Bildschirm mit Firmenlogo auf der
Blende, hängt an einem sichtbaren Stromkabel und hat eine gezeichnete
Tastatur darunter. Wer im Formular tippt, sieht die passende Taste
aufleuchten.

Die Tasten werden über `KeyboardEvent.code` angesprochen, nicht über das
erzeugte Zeichen. `code` benennt die Taste an ihrem Platz, unabhängig vom
eingestellten Layout — gezeichnet ist QWERTZ, und auf einer deutschen
Tastatur liegt damit die leuchtende Taste genau unter dem Finger: Das Z
meldet `KeyY`, und dort sitzt auf diesem Layout das Z. Bildschirmtastaturen
liefern oft keinen brauchbaren `code`; dafür gibt es einen zweiten Weg über
das eingefügte Zeichen, der nur greift, wenn der erste nichts gefunden hat
(sonst leuchten auf einem US-Layout zwei Tasten gleichzeitig).

Der Rechner „geht an“, sobald er ins Bild kommt: Die Leuchtdiode pulst und
ein Lichtpunkt wandert durch das Kabel.

### Der Stecker

Der Stecker lässt sich aus der Dose ziehen — mit der Maus, mit dem Finger
oder per Tastatur. Ohne Strom schaltet der Rechner ab: Über dem Kasten
erscheint eine rote Meldung mit `ERROR 007`, die Leuchtdiode wird rot, der
Bildschirm wird flau und bekommt einen roten Schimmer, die Tastatur reagiert
nicht mehr, und das Formular lässt sich nicht absenden. Ein Klick auf den
Stecker oder auf „Stecker einstecken“ stellt alles wieder her.

Die Felder werden dabei auf `readonly` gesetzt statt auf `disabled`: Sie
bleiben vorlesbar und mit der Tastatur erreichbar, nehmen aber nichts an.
Für das Kontrollkästchen und die Auswahlliste greift `readonly` nicht, die
werden deaktiviert.

Ein Fallstrick, der zweimal Zeit gekostet hat: Ein `display` in einer
Klassenregel schlägt das `[hidden]`-Attribut. Beide Einblendungen — die
Störungsmeldung und die Bestätigung — brauchen deshalb eine eigene Regel
`[hidden]{ display:none }`, sonst sind sie immer sichtbar und fangen
nebenbei die Klicks auf den Stecker ab.

### Die Bestätigung

Nach dem Absenden legt sich eine Bestätigung über den Bildschirm. Sie ist
bewusst so formuliert, wie es der Stand der Technik hergibt: Das Formular
öffnet das E-Mail-Programm, verschickt aber noch nichts selbst. Sobald ein
echter Endpunkt angebunden ist (siehe unten), sollte der Text auf eine
tatsächliche Sendebestätigung geändert werden — `mch.doneTitle` und
`mch.doneBody` in `assets/js/i18n.js`.

## Überschrift und Kennzahlen

Der erste Buchstabe jedes Worts in der großen Überschrift steht im Orange
des Logos, ebenso die vier Kennzahlen. Die Überschrift wird bei jedem
Sprachwechsel neu geschrieben, deshalb setzt `decorateInitials()` in
`main.js` die Auszeichnung danach erneut und merkt sich den unveränderten
Text am Knoten, damit ein zweiter Durchlauf nicht bereits ausgezeichneten
Text noch einmal zerlegt.

Eine Stolperstelle dabei: `.hero-title span { display:block }` galt für
*jeden* Span in der Überschrift, also auch für die neuen Buchstaben-Spans —
jedes Wort brach dadurch nach dem ersten Buchstaben um. Die Regel gilt jetzt
nur für die direkten Kinder.

## Themes

Der Nachtmodus hat etwas mehr Bewegung als der Tagmodus: Staub treibt durch
die Hero-Szene, ein sehr langsamer Lichtschleier wandert dahinter, und der
Akzentpunkt in der Auszeichnungszeile atmet. Im Tagmodus entfällt beides —
Staub liest sich auf hellem Grund als Schmutz, nicht als Atmosphäre.

Nacht ist die Voreinstellung, Tag die Alternative; die Wahl wird im
`localStorage` gemerkt und vor dem ersten Rendern gesetzt, damit nichts
aufblitzt. Beide Themes sind über Custom Properties auf
`:root[data-theme="…"]` definiert; die 3D-Szene hat in `THEMES` ihre eigene
Entsprechung und wird über `RDW_SYNC_THEME` mitgeschaltet.

## Farben

Direkt aus dem Logo entnommen:

| Rolle            | Wert      |
|------------------|-----------|
| Navy (Wortmarke) | `#01247A` |
| Cyan             | `#00B2C0` |
| Navy dunkel      | `#001854` |
| Orange           | `#E4791E` |

## Sprachen

Deutsch ist die Standardsprache und steht direkt im HTML; Englisch liegt in
`assets/js/i18n.js` und wird über `data-i18n`-Attribute eingesetzt. Beide
Blöcke teilen sich dieselben Schlüssel — eine weitere Sprache ist ein
weiterer Block.

## Vor dem Livegang zu erledigen

- [ ] Telefon- und WhatsApp-Nummer eintragen (Platzhalter `+49 000…`)
- [ ] Impressum vervollständigen: Anschrift, USt-IdNr. bzw. Hinweis auf
      Kleinunternehmerregelung, ggf. Registereintrag
- [ ] Datenschutzerklärung an Hosting und eingesetzte Dienste anpassen und
      fachkundig prüfen lassen
- [ ] Kontaktformular an einen echten Endpunkt hängen. Aktuell baut
      `main.js` eine fertige `mailto:`-Nachricht; auszutauschen ist nur der
      `submit`-Handler. Danach `mch.doneTitle` und `mch.doneBody` auf eine
      echte Sendebestätigung umformulieren
- [ ] Optional Schriften lokal einbinden statt über Google Fonts — spart den
      entsprechenden Abschnitt in der Datenschutzerklärung
- [ ] Portfolio: Die sechs Einträge sind ausdrücklich als Musterprojekte
      ausgewiesen. Sobald Kundenprojekte freigegeben sind, hier ersetzen
- [ ] Preise für die vier Pakete kalkulieren und ergänzen
