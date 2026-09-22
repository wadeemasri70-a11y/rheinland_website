# Rheinland Digitalwerk — Website

Statische Website für die Digitalagentur Rheinland Digitalwerk.
Kein Build-Schritt, keine Abhängigkeiten — HTML, CSS und Vanilla JS.

## Struktur

```
index.html          Startseite (Hero-Animation, Leistungen, Pakete, Portfolio, Kontakt)
impressum.html      Impressum (enthält Platzhalter)
datenschutz.html    Datenschutzerklärung (Grundfassung, enthält Platzhalter)
assets/css/main.css   Design-Tokens, Layout, alle Sektionen
assets/css/scene.css  Hero-Szene (Layout + Code-Farben)
assets/js/scene.js    Roboter-Animation (Keyframe-Timeline auf SVG + Canvas-Staub)
assets/js/i18n.js     Zweisprachige Inhalte (DE / AR)
assets/js/main.js     Sprache, Navigation, Scroll-Reveals, Kontaktformular
assets/img/           Logo (Wortmarke und Bildmarke)
```

Zum Ansehen genügt ein statischer Server, z. B. `python3 -m http.server`.

## Hero-Animation

Ein kleiner Roboter zieht ein Kabel über den Schreibtisch, steckt den Stecker
in die Wandsteckdose, die Werkstatt erwacht, der Laptop bootet, und der Roboter
schreibt hüpfend Code auf den Bildschirm. Bildsprache: Silhouetten und
Randlicht vor sehr dunklem Hintergrund.

Die Szene ist im SVG-Koordinatenraum `1200 × 720` aufgebaut und wird von einer
einzigen `requestAnimationFrame`-Schleife in `assets/js/scene.js` getrieben.
Die Zeitpunkte stehen gesammelt im Objekt `T` — wer das Timing ändern will,
ändert nur dort etwas. `HOP_KEYS` bestimmt, auf welche Tasten der Roboter
springt; pro Sprung wird eine Zeile aus `CODE` getippt.

Bei `prefers-reduced-motion: reduce` wird statt der Animation das fertige,
beleuchtete Schlussbild gezeigt.

## Farben

Direkt aus dem Logo entnommen:

| Rolle           | Wert      |
|-----------------|-----------|
| Navy (Wortmarke)| `#01247A` |
| Cyan            | `#00B2C0` |
| Navy dunkel     | `#001854` |
| Orange          | `#E4791E` |

## Sprachen

Deutsch ist die Standardsprache und steht direkt im HTML. Arabisch liegt in
`assets/js/i18n.js` und wird über `data-i18n`-Attribute eingesetzt; beim
Wechsel schaltet das Dokument auf `dir="rtl"` und eine arabische Schrift um.
Die Auswahl wird im `localStorage` gemerkt.

## Vor dem Livegang zu erledigen

- [ ] Telefon- und WhatsApp-Nummer eintragen (Platzhalter `+49 000…` in
      `index.html`, Konstante im WhatsApp-Link und in `ct.phoneval`)
- [ ] Impressum vervollständigen: Anschrift, USt-IdNr. bzw. Hinweis auf
      Kleinunternehmerregelung, ggf. Registereintrag
- [ ] Datenschutzerklärung an Hosting und tatsächlich eingesetzte Dienste
      anpassen und fachkundig prüfen lassen
- [ ] Kontaktformular an einen echten Endpunkt hängen. Aktuell baut
      `main.js` eine fertige `mailto:`-Nachricht; der Austausch betrifft nur
      den `submit`-Handler
- [ ] Optional Schriften lokal einbinden statt über Google Fonts — spart den
      entsprechenden Abschnitt in der Datenschutzerklärung
- [ ] Portfolio: Die sechs Einträge sind ausdrücklich als Musterprojekte
      ausgewiesen. Sobald Kundenprojekte freigegeben sind, hier ersetzen
- [ ] Preise für die vier Pakete kalkulieren und ergänzen
