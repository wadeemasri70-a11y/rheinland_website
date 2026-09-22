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
Sprung eine Zeile Code.

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

- **Timing** steht gesammelt im Objekt `T` in `anim3d.js`.
- **Auf welche Tasten der Roboter springt** bestimmt `HOP_KEYS`; pro Sprung
  wird eine Zeile aus `CODE` getippt.
- **Kamera und Bildausschnitt**: `new E.Camera({...})` in `scene3d.js`.
  `shiftX` verschiebt den Bildmittelpunkt, ohne die Perspektive zu verzerren
  — so sitzen die Objekte links und die Überschrift rechts. Auf schmalen
  Bildschirmen setzt `hero3d.js` die Verschiebung zurück.
- **Farben und Licht** stehen in `MAT` und `THEMES` in `scene3d.js`.

Bei `prefers-reduced-motion: reduce` wird statt der Animation das fertige,
beleuchtete Schlussbild gezeigt. Läuft die Szene aus dem Sichtfeld, pausiert
die Schleife.

## Themes

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
      `submit`-Handler
- [ ] Optional Schriften lokal einbinden statt über Google Fonts — spart den
      entsprechenden Abschnitt in der Datenschutzerklärung
- [ ] Portfolio: Die sechs Einträge sind ausdrücklich als Musterprojekte
      ausgewiesen. Sobald Kundenprojekte freigegeben sind, hier ersetzen
- [ ] Preise für die vier Pakete kalkulieren und ergänzen
