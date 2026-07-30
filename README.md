# Vitals — Weight & Diet Tracker (PWA)

A fully offline, installable weight-tracking and diet-planning app. No
backend, no accounts, no external API calls at runtime — every byte of
data lives in your iPhone's local storage.

## Run it locally (to try it out)

You need to serve these files over HTTP(S) — opening `index.html`
directly (`file://`) will not work, because the app uses ES module
`<script type="module">` imports, which browsers block on `file://`.

From this folder:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser on your computer to try
it first.

## Installing on iPhone (with offline support)

Safari on iOS only installs a Home Screen app with full offline/service
worker support when it's served over **HTTPS** — a plain local server
on your laptop won't be reachable from your phone unless it's also on
HTTPS. The fastest free options:

1. **GitHub Pages** — push this folder to a GitHub repo, enable Pages
   in Settings, and you'll get a free `https://` URL in a minute or two.
2. **Netlify Drop** (netlify.com/drop) — drag this folder into the
   browser, get an instant HTTPS URL, no account required.
3. **Vercel** — `vercel deploy` from this folder if you have the CLI.

Once you have an HTTPS URL:

1. Open it in **Safari** on your iPhone (must be Safari, not Chrome —
   iOS only allows installing PWAs from Safari).
2. Tap the **Share** icon → **Add to Home Screen**.
3. Open the app from your Home Screen icon — it now runs full-screen,
   works offline, and keeps all your data on-device.

## What's inside

- `index.html` — app shell
- `manifest.json` — install metadata (name, icons, colors)
- `sw.js` — service worker; caches every file on first load so the
  app works with no connection afterward
- `css/` — design tokens, layout, and component styles (light/dark/
  system theme, 5 accent colors, 3 font sizes — all set in Settings)
- `js/` — app logic, one file per feature, no build step and no
  external runtime dependencies (charts are hand-drawn SVG, not a
  library) — everything works offline from the very first load
- `icons/` — generated app icons

## Notes & honest limitations

- **Data lives only on this device.** There's no server, so nothing
  syncs between devices automatically — use Data Export → Export
  backup, then Restore backup on the other device, to move data over.
- **Passcode lock** is a simple on-device app-open gate, not
  encryption — it stops casual access to the app, not a targeted
  attacker with access to the phone's storage.
- **Reminders** use the Notification API and only fire while the app
  is open in the foreground/background tab. iOS restricts background
  push for installed web apps beyond what a no-backend app can offer;
  a true "notify me even when the app's closed" reminder would need a
  push server, which is out of scope for a fully offline, local-only
  app.
- **Barcode scanning** for food logging isn't included — it would
  require a network call to a food database API, which conflicts with
  the fully-offline brief. Food logging instead uses a fast local
  "My Foods" library you build up as you log.
