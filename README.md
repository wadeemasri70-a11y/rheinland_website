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
assets/css/media.css   Markenband und die Bilder in den Abschnitten
assets/css/machine.css Kontaktformular als Rechner samt Tastatur

assets/js/engine3d.js 3D-Kern: Transformhierarchie, Projektion, Sortierung
assets/js/scene3d.js  Geometrie, Materialien, Licht, Zeichnen
assets/js/anim3d.js   Zeitachse der Animation
assets/js/hero3d.js   Taktgeber, Theme-Abgleich, Replay
assets/js/i18n.js     Inhalte auf Deutsch und Englisch
assets/js/main.js     Theme, Sprache, Navigation, Kacheln, Kontaktroboter, Formular

assets/img/           Logo (Wortmarke und Bildmarke), je einmal für
                      Tag und — umgefärbt — für Nacht, dazu die Fotos
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
- **Der Stecker** liegt zu Beginn auf dem Tisch unter der Steckdose
  (`PLUG_REST`). Der Roboter kommt mit leeren Händen, beugt sich darüber,
  hebt ihn auf und greift damit nach oben.
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
- **Der Laptop baut sich um**, sobald der Roboter zu tippen beginnt. Er
  entsteht aus einem einzigen Wert (`st.modern`, 0 = die kantige Kiste vom
  Start, 1 = ein schlankes Gerät): Aus breiten Rändern wird ein Bildschirm,
  der die Klappe fast ausfüllt, die Klappe selbst wird dünner, eine
  Kameraaussparung, eine Fase an der Vorderkante und Lautsprechergitter
  kommen dazu, und die Gehäusefarbe wandert von stumpfem Kunststoff zu
  etwas Metallischem. `buildShell()` in `scene3d.js` baut nur die Hülle neu
  und lässt die Tasten unangetastet — der Roboter zielt beim Springen auf
  sie, sie dürfen sich also nicht bewegen. Aus demselben Grund bleibt die
  Höhe des Unterteils fest.
- **Die RGB-Beleuchtung** der Tastatur fährt kurz danach hoch (`st.rgb` in
  `anim3d.js`, `backlight()` und `rgbGlow()` in `scene3d.js`). Jede Taste hat ein eigenes Materialobjekt, dessen Farbe pro
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

Nachdem der Roboter umgekippt ist, steigt eine dünne Rauchfahne von ihm auf
(`smokePass()` in `scene3d.js`). Die Schwaden entstehen am Körper, steigen im
Weltraum auf und werden pro Bild projiziert — sie stehen also in der Szene
und schweben nicht flach darüber.

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

Die Leitung wird in geraden Strecken mit festen Winkeln gezeichnet, nicht
als lose Kurve: ein kurzes Stück aus dem Stecker heraus, eine Diagonale von
genau 45 Grad, dann waagerecht in das Gerät. Das greift den Aufbau des Logos
auf, das aus denselben Winkeln besteht, und wirkt gelegt statt fallen
gelassen. Damit die Diagonale wirklich 45 Grad misst und nicht mit der
Breite verzerrt, bekommt das SVG bei jeder Neuberechnung eine viewBox in
seiner eigenen Pixelgröße.

Der Stecker folgt beim Ziehen dem Zeiger, und das Kabel gibt mit ihm nach —
seitlich gedämpft und nach unten begrenzt, damit er an seiner Leitung bleibt.
Beim Loslassen entscheidet die zurückgelegte Strecke: knapp gezogen rutscht
er zurück in die Dose, weit gezogen bleibt er draußen und an der Dose blitzt
kurz ein Funke. Vorher war es ein reiner Schwellwert — ab einer gewissen
Entfernung sprang er heraus, dazwischen passierte nichts.

Im Ruhezustand sitzt der Stecker auf der Dose, nicht daneben: mittig auf der
Wandplatte und davor. Größe und die beiden Versätze in `.machine-plug` gehören
zusammen — die Zeichnung ist 36 × 42 und wird in die Schaltfläche eingepasst,
ein Wert allein verschiebt den Stecker also von der Platte. Die Stifte sind
dabei ausgeblendet; sie stecken ja in der Wand und kommen erst wieder zum
Vorschein — rot —, sobald gezogen wird. Die Steckerfläche braucht außerdem
eine **deckende** Farbe (`--plug-face`): `--surface-2` ist nachts
durchscheinend, und die beiden Schlitze der Dose schienen glatt durch den
aufgesteckten Stecker hindurch.

Die Leitung wird dabei aus der **gemessenen** Position des Steckers gezeichnet,
nicht aus einer Zahl, die zur Stylesheet-Regel passen soll. Das war vorher die
Fehlerquelle: Der herausgezogene Stecker wird per CSS um 44 px nach unten
gesetzt, das Kabel aber an seiner Ruheposition gezeichnet — beim Wiedereinstecken
klaffte sichtbar eine Lücke, die Leitung wirkte durchtrennt. Jetzt zeichnet
`trackCable()` das Kabel für die Dauer jeder Bewegung in jedem Frame neu und
schaltet dafür die eigene `transition:d` ab (`.machine-cable.is-tracking`), damit
sich nicht zwei Animationen überlagern. Aus demselben Grund stupst der
Aufmerksamkeits-Hinweis den Stecker nicht mehr an, sondern lässt nur seinen Rand
kurz aufleuchten: Jede Bewegung, der das Kabel nicht folgt, reißt die Naht auf.

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

## Bilder

Fünf Aufnahmen, alle quadratisch, damit sie als ein Satz gelesen werden:

| Datei | Platz |
|---|---|
| `brand-wall.webp` | neben der Überschrift der Leistungen |
| `team-workshop.webp` | neben der Überschrift der Arbeitsweise |
| `team-desks.webp` | neben der Überschrift des Portfolios |
| `team-meeting.webp` | neben den Zielgruppen |
| `team-advice.webp` | im Buchhaltungsbereich |

Beschnitten wird auf das größte echte Quadrat der Vorlage; hochgerechnet
wird nichts, weil das keine Schärfe zurückbringt. Zwei der Vorlagen sind
1013 × 672 groß und liefern deshalb nur 672 × 672 — sichtbar wird das erst
auf sehr hochauflösenden Bildschirmen.

Die Aufnahme mit dem Wandlogo bekommt beim Export einen Rand aus ihrer
eigenen Wandfarbe. Ohne den schnitt der Rahmen den Schriftzug an, weil das
Bild für die Parallaxe etwas größer skaliert wird als sein Rahmen.

Jedes Bild sitzt in einem Rahmen, der es beschneidet. Ein einziger
Scroll-Handler speist eine rAF-Schleife und schreibt die Verschiebung in
`--py`; gemessen wird nur beim Laden und beim Größenwechsel. Sichtbar wird
ein Bild über einen Schnitt am Rahmen statt über eine Blende. Im Nachtmodus
werden die Tageslichtaufnahmen abgedunkelt und leicht entsättigt.

Die Alternativtexte hängen an den Sprachdateien (`data-i18n-alt`).

## Themes

Der Nachtmodus hat etwas mehr Bewegung als der Tagmodus: Staub treibt durch
die Hero-Szene, ein sehr langsamer Lichtschleier wandert dahinter, und der
Akzentpunkt in der Auszeichnungszeile atmet. Im Tagmodus entfällt beides —
Staub liest sich auf hellem Grund als Schmutz, nicht als Atmosphäre.

Roboter und Laptop sind in der Szene nachts heller als der Raum um sie herum.
Ihre Materialien tragen ein `lit`-Kennzeichen; `shade()` legt darauf zum
Schluss `THEMES.night.subject` — eine Verstärkung auf das, was die Lichter
ohnehin geliefert haben, plus einen kleinen Sockel, damit die dunkelsten
Flächen nicht schwarz absaufen. Nur die beiden werden so angehoben, die Wand
und der Tisch bleiben dunkel; der Gegenlicht-Blick der Szene bleibt also
erhalten, während das Motiv klar herauskommt. Im Tagmodus steht der Wert auf
`{ m: 1, a: 0 }` — dort ist ohnehin alles hell.

Das Logo bekommt im Nachtmodus eine eigene Fassung. Vorher lag ein
`brightness(0) invert(1)` darüber, das die dunkle Wortmarke zwar sichtbar
machte, aber eben alles einebnete — auch das Orange, das im Fließtext als
Initialen wiederkehrt. Stattdessen liegen jetzt `logo-full-night.png` und
`logo-mark-night.png` daneben: Navy wird zu hellem Ink, das Cyan zum
Nacht-Akzent, das Orange bleibt exakt `#E4791E`. Umgeschaltet wird per
`content:url(…)` auf `:root[data-theme="night"]`, das Markup bleibt also
unangetastet. Erzeugt wurden die beiden Dateien pixelweise: jede Farbe wird
über inverse quadratische Abstände auf die vier Markenfarben verteilt und
durch deren Nachtentsprechungen ersetzt, damit auch die Kanten sauber
übergehen statt auf eine Farbe zu springen.

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

## Kontaktwege

Unter den Kontaktdaten stehen vier gleich große Schaltflächen — WhatsApp,
LinkedIn, Instagram, Facebook. Sie schweben versetzt, jede mit eigener
Verzögerung, und nehmen beim Überfahren die Farbe ihres Dienstes an; für den
Tagmodus sind die Markenfarben abgedunkelt, damit sie auf hellem Grund nicht
schreien. Die Profil-Adressen sind Platzhalter (siehe Liste unten).

Unten rechts sitzt zusätzlich ein kleiner Roboter, gebaut wie der aus der
Hero-Szene: kantiger Kopf, leuchtendes Visierband, orangefarbene Antenne, auf
dem Bauch „CONTACT US“. Er reagiert auf das Scrollen — jeder Scrollschritt gibt
ihm einen Impuls nach oben oder unten, eine gedämpfte Feder trägt ihn dorthin
und wieder zurück, und seine Düsen brennen heller, solange er unterwegs ist.
Die Schleife läuft nur, während er sich bewegt, und hält sich selbst an,
sobald er wieder ruhig in seiner Parkposition steht.

Ein Klick öffnet die Auswahl: E-Mail und dieselben vier Netzwerke. Das Menü
schließt bei Klick daneben, bei `Escape` und nachdem ein Link gefolgt wurde.

Die Bauchbeschriftung wechselt mit der Sprache: auf Deutsch „KONTAKT“ in einer
Zeile, auf Englisch „CONTACT US“ in zweien. Deshalb kann sie im Markup nicht
von Hand eingepasst werden — `fitBelly()` misst jede Zeile, drückt sie über
`textLength` nur dann auf die Plattenbreite, wenn sie sonst überliefe, und
zentriert eine einzelne Zeile, statt sie oben stehen zu lassen. Aufgerufen wird
sie beim Aufbau, nach jedem Sprachwechsel und noch einmal, wenn die Schriften
geladen sind.

## Leistungskacheln

Die Symbole der zehn Leistungen zeichnen sich selbst. Jede Linie wird einmal
mit `getTotalLength()` vermessen und in einen Strich verwandelt, der genau so
lang ist wie sie selbst; den Strichversatz auf null zu ziehen, sieht aus, als
würde das Symbol Linie für Linie gezeichnet. Das passiert, wenn die Kachel ins
Bild kommt, und noch einmal, sobald jemand mit dem Zeiger darauf geht.

Weil ein ungezeichnetes Symbol ein unsichtbares Symbol ist, bekommt der Ablauf
zwei Netze: bei `prefers-reduced-motion` werden alle sofort gezeichnet, und was
der Beobachter nach 3,5 Sekunden nicht erreicht hat, wird ebenfalls
nachgezogen.

Zusätzlich folgt ein weicher Lichtschein dem Zeiger über die Kachel. Er wird in
einem `requestAnimationFrame`-Durchgang als zwei Custom Properties geschrieben,
damit das Bewegen der Maus über das Raster nicht mitten im Frame Layout liest.
Auf Geräten ohne feinen Zeiger entfällt er.

## Kopfzeile

Die Wortmarke soll auf einem Desktop groß stehen, ohne die Navigation zu
bedrängen. Beide wachsen deshalb mit dem Ansichtsfenster: `--hh` gibt die Höhe
der Leiste vor, `.brand-full` die Breite des Logos, beide als `clamp()`. In der
Enge zwischen 900 und 1100 px bleibt das Logo bei seinem Mindestwert, damit
zwischen ihm und den Menüpunkten Luft bleibt.

`--hh` steht in `:root`, weil vier weitere Regeln daran hängen: die Bühne der
Hero-Szene, der Innenabstand des Hero-Bereichs, der obere Abstand der
Rechtstexte und die Oberkante des eingeklappten Mobilmenüs. Als Zahl an fünf
Stellen wiederholt wäre sie bei der nächsten Änderung an vieren falsch.

Ein Hinweis zum Bildmaterial: In `logo-full.png` sind oben und unten je rund
18 % des Bildes durchsichtig. Die Grafik ist also deutlich kleiner als ihr
Rahmen — wer die Höhe nach dem Kasten bemisst statt nach der Zeichnung, hält
das Logo für zu groß, obwohl es gut in der Leiste sitzt.

## Sprachen

Deutsch ist die Standardsprache und steht direkt im HTML; Englisch liegt in
`assets/js/i18n.js` und wird über `data-i18n`-Attribute eingesetzt. Beide
Blöcke teilen sich dieselben Schlüssel — eine weitere Sprache ist ein
weiterer Block.

## Vor dem Livegang zu erledigen

- [ ] Telefon- und WhatsApp-Nummer eintragen (Platzhalter `+49 000…`)
- [ ] Die vier Profil-Adressen eintragen. Sie stehen zweimal im `index.html`,
      jeweils über einem `TODO`-Kommentar: in der Liste `.socials` im
      Kontaktabschnitt und im Menü des Roboters unten rechts. Platzhalter sind
      `wa.me/4900000000000`, `linkedin.com`, `instagram.com`, `facebook.com`
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
