# Health Log

A single-page personal health tracker that installs to the iPhone home screen
as a PWA and works fully offline. No backend, no account, no analytics — all
data lives in this browser's localStorage on your device.

**Tracks:** weight (kg), blood pressure (mmHg), blood glucose (mg/dL), resting
heart rate (bpm), sleep (h), water (mL), steps. Every entry is timestamped.
Each metric card has a quick-entry field and a 14-entry sparkline; tap the
sparkline for a larger chart (last 30) and the entry history with delete.
BP, glucose, and heart rate charts show a shaded reference band for visual
context only — the app deliberately contains no interpretation or alerts.

Water is charted as a daily total (with +250/+500 mL quick buttons); steps
chart the day's latest entry. Export/Import buttons at the bottom back up and
restore all data as a JSON file — do this occasionally, because clearing
Safari website data deletes the log.

## Files

```
index.html            app shell + iOS install meta tags
style.css             styling (light/dark via prefers-color-scheme)
app.js                storage, entry forms, SVG charts
sw.js                 service worker: precaches everything, cache-first
manifest.webmanifest  PWA manifest (standalone, icons)
icons/                app icons + the script that generates them
```

No build step, no dependencies. Edit a file, bump `VERSION` in `sw.js`
(that's what makes installed copies pick up changes), redeploy.

## Hosting + installing on iPhone

Service workers require HTTPS, so host the folder on any static host —
GitHub Pages is the usual free choice (repo → Settings → Pages). All paths
are relative, so a subpath like `username.github.io/health-tracker/` works.

Then on the iPhone:

1. Open the URL in **Safari**.
2. Share button → **Add to Home Screen** → Add.
3. Open it once from the home screen while online (lets the service worker
   finish precaching), after which it runs with no network at all.

## Local preview

```bash
python3 -m http.server 8902
# open http://localhost:8902/
```

localhost counts as a secure context, so the service worker works locally too.
