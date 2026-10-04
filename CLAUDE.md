# Rheinland Digitalwerk — website

Static site (HTML/CSS/JS, no build step) for Rheinland Digitalwerk, a digital
agency in Neuss. Live at **https://www.rheinlanddigitalwerk.de** via GitHub
Pages. `README.md` (German) documents the 3D hero and design details.

## Working with this user

- **Always reply in Levantine Arabic (شامي).** The user asked for this
  explicitly and repeatedly. Code, commits and comments stay in English;
  site copy stays German/English.
- **Change only what is asked.** The user has stopped work more than once
  when changes went beyond the request ("خلي الموقع متل ما هو"). No
  redesigns or extra features on your own initiative; suggest them instead.
- Owner shown on the site: Mohamad Al Shikhani. Developer credit in the
  footer: M.Wadih Almasri (keep it).

## Deploying

- **Push to `claude/nifty-mendel-kpxopf` only.** It is the repository's
  default branch and the GitHub Pages source; pushes there are live in about
  a minute. A push to any other branch does not reach the site.
- GitHub Pages lets browsers cache files for 10 minutes. CSS/JS links in
  `index.html`, `impressum.html` and `datenschutz.html` carry `?v=…`, and the
  photos carry `?v=2`. **Bump the version on every CSS/JS change**, or
  visitors keep running old code.
- `CNAME` holds `www.rheinlanddigitalwerk.de` — never delete it.
- Verify in headless Chromium (Playwright at
  `/opt/node22/lib/node_modules/playwright`, browsers in /opt/pw-browsers)
  against `python3 -m http.server` in the repo root. Check night and day
  themes, desktop and 390px mobile, and that there is no horizontal scroll.

## Layout

- `index.html` — single page. Sections: hero (3D canvas), Leistungen,
  Arbeitsweise, Pakete, Portfolio, Branchen, Kontakt (map band with a robot
  pin, contact list, contact "machine" form), footer.
- `assets/js/` — `engine3d.js` / `scene3d.js` / `anim3d.js` / `hero3d.js`
  (hand-written 3D hero; `scene3d.js` paints the static room once into an
  offscreen canvas for performance, pixel-identical), `i18n.js` (DE/EN
  strings, both languages must keep the same keys), `main.js` (UI, contact
  form, map, plug/cable, contact robot).
- `assets/img/` — photos as 1200px `.webp` plus `-700.webp`, served with
  `srcset`.
- `impressum.html`, `datenschutz.html` (noindex), `danke.html` (form
  success marker), `robots.txt`, `sitemap.xml`.

## Company data (from the business card)

Rheinland Digitalwerk · Inhaber Mohamad Al Shikhani · Gnadentaler Allee 14,
41468 Neuss · Tel. +49 2131 1722 755 · Mobil/WhatsApp +49 152 34 669 666 ·
info@rheinlanddigitalwerk.de. Services: Webdesign, Grafikdesign,
3D-Visualisierung, Corporate Design, Digitale Beratung.

## Contact form

Posts to **FormSubmit** (`https://formsubmit.co/info@rheinlanddigitalwerk.de`,
no account or key) through a hidden form into the `formSink` iframe —
`fetch()` was blocked by CORS. Success = FormSubmit sends the frame on to
`danke.html` (`_next`). The address was activated once via the
"Activate Form" mail FormSubmit sends on first use. Web3Forms was used
before but had put info@ on its bounce/suppression list (tests sent before
the mailbox existed) and silently dropped mail while reporting success —
do not go back to it for info@. Form services refuse datacenter IPs, so
end-to-end tests must be done by the user from their own browser. info@
is a real mailbox at United Domains (login user `rheinlanddigitalwerk-de-0001`,
webmail https://www.ud-mail.de).

## DNS (United Domains) and Google

- A records → GitHub Pages (185.199.108-111.153), `www` CNAME →
  `wadeemasri70-a11y.github.io`. Keep MX (mx00/mx01.udag.de), SPF, DKIM,
  autoconfig/autodiscover, the `_github-pages-challenge-…` TXT and the
  `google-site-verification=DyONRy…` TXT (Search Console, company account
  reinlanddigitalwerk@gmail.com).
- Search Console: verified, homepage indexed 2026-10-03, sitemap submitted.
  Google Business Profile created (profile strength 78% at last check).

## SEO rules

- Title/description target "Webdesign & Grafikdesign in Neuss"; schema.org
  `ProfessionalService` JSON-LD in `index.html` (address, areaServed,
  knowsAbout, hasMap).
- **Never hide keywords in the page** (hidden or same-colour text,
  `display:none` blocks). It breaks Google's spam policies and can get the
  site demoted or removed. Keywords the user wants "hidden from visitors" go
  into places visitors don't see but are legitimate: `<title>`, meta
  description, JSON-LD (`knowsAbout`, `areaServed`, `makesOffer`), image
  `alt`, and `<meta name="keywords">` (ignored by Google, harmless). Say this
  to the user plainly if they ask for hidden text.

## Open items

- Social links (LinkedIn, Instagram, Facebook) still point at the networks'
  home pages — need the real profile URLs.
- Impressum: Handelsregister and USt-IdNr if they exist.
- Google Fonts are loaded from Google (a DSGVO risk in Germany); self-hosting
  was offered, not yet done.
- The user reported trouble logging into the info@ webmail; the contact
  form has not yet been confirmed end-to-end from their browser.
