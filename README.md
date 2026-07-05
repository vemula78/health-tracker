# Health Log

A single-page personal health tracker that installs to the iPhone home screen
as a PWA and works fully offline. No backend, no account, no analytics — all
data lives in this browser's localStorage on your device.

**Tracks:** weight (kg), blood pressure (mmHg), blood glucose (mg/dL), resting
heart rate (bpm), sleep (h), water (mL), steps, distance (km), active energy
(kcal), exercise minutes, and workouts. Every entry is timestamped.
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

## Apple Health / Watch sync (via iOS Shortcuts)

Web apps can't read HealthKit directly, so sync works through a one-tap iOS
Shortcut: the Shortcut reads today's Health data (including everything the
Watch recorded), copies it as JSON to the clipboard, and the app's
**Health sync** screen imports it. Re-syncing the same day updates the values
instead of duplicating them; manually typed entries are never touched.

### Build the Shortcut (once, ~5 minutes)

In the **Shortcuts** app on the iPhone, create a new shortcut named
**Health Sync** with these actions in order:

1. **Find All Health Samples** — Type: *Steps*, add filter *Start Date* → *is today*.
2. **Calculate Statistics** — Operation: *Sum*, Input: the Health Samples above.
   Rename this result variable to `steps` (tap the variable → Rename).
3. Repeat steps 1–2 for *Walking + Running Distance* (→ `distanceKm`),
   *Active Energy* (→ `activeEnergyKcal`), and *Exercise Minutes* (→ `exerciseMin`).
4. **Find All Health Samples** — Type: *Resting Heart Rate*, *Start Date is today*,
   then **Calculate Statistics** — Operation: *Average* (→ `restingHR`).
5. *(Optional, for workouts)* **Find All Workouts** where *Start Date is today*,
   then **Repeat with Each**, and inside the repeat add a **Text** action:
   `Repeat Item's Activity Type|Duration in minutes|Active Energy` (a pipe `|`
   between the three magic variables). After the repeat, **Combine Text** of
   *Repeat Results* with *New Lines* (→ `workoutsText`).
6. **Format Date** — Current Date, Format: *Custom*, string `yyyy-MM-dd`.
7. **Dictionary** — add these keys, each set to the matching variable:

   | key | value |
   |---|---|
   | `date` | formatted date from step 6 |
   | `steps` | steps sum |
   | `distanceKm` | distance sum |
   | `activeEnergyKcal` | active energy sum |
   | `exerciseMin` | exercise minutes sum |
   | `restingHR` | resting HR average |
   | `workoutsText` | combined workout lines (if doing step 5) |

8. **Get Text from Input** — input: the Dictionary (this turns it into JSON).
9. **Copy to Clipboard**.

The first run asks for Health-data read permission per type — allow each once.
Any key you skip is simply ignored by the importer, and units in the values
("6.2 km", "8,234 count") are stripped automatically, so the shortcut doesn't
need to be exact.

### Daily use

Tap the shortcut (add it to the home screen or a widget next to Health Log),
open Health Log, tap **Health sync** → **Paste from clipboard & import**.
You can also automate the shortcut to run every evening (Shortcuts →
Automation → Time of Day) so the day's data is already on the clipboard.

The importer also accepts an **array** of day-objects (for backfilling
several days at once) and `workouts` as a JSON array of
`{"type": "Running", "min": 32, "kcal": 310}`.

## Local preview

```bash
python3 -m http.server 8902
# open http://localhost:8902/
```

localhost counts as a secure context, so the service worker works locally too.
