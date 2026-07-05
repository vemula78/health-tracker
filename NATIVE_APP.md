# Native iOS App Architecture

The Health Log app is now available in two versions:

## 1. Web Version (PWA)
- **URL:** https://vemula78.github.io/health-tracker/
- **Install:** Safari → Share → Add to Home Screen
- **Sync:** Manual paste from Shortcuts JSON (doesn't work well on iOS 26)
- **Best for:** Quick checks, home screen icon without Xcode

## 2. Native Version (iOS App)
- **Build:** From this repo using Xcode
- **Install:** Runs like a regular app, lasts 7 days (free) or permanently ($99/yr)
- **Sync:** One-tap HealthKit integration, automatic on startup
- **Best for:** Daily use with reliable Health data sync

Both share the exact same code — the native wrapper just adds HealthKit access.

## How It Works

### Web App (Core)
```
www/
├── index.html          # Same UI, always
├── app.js              # Same logic, detects Capacitor environment
├── style.css
├── manifest.webmanifest
└── healthkit-bridge.js # New: bridge to native code (only loads in Capacitor)
```

### Native Wrapper (iOS)
```
ios/App/
├── App.xcodeproj       # Xcode project
├── App/
│   ├── AppDelegate.swift
│   ├── Plugins/
│   │   ├── HealthKitPlugin.swift   # New: native HealthKit access
│   │   └── HealthKitPlugin.m       # Objective-C bridge
│   ├── public/         # Web assets copied here
│   └── Info.plist      # Added HealthKit permissions
└── CapApp-SPM/         # Capacitor framework
```

### Data Flow

**Native App:**
```
HealthKitPlugin.swift (reads HealthKit)
    ↓
HealthKitPlugin.m (Objective-C bridge)
    ↓
healthkit-bridge.js (JavaScript bridge)
    ↓
app.js (same import logic as Shortcuts)
    ↓
localStorage (same storage as web version)
```

**Key:** The `app.js` import code is **identical** — whether data comes from:
- A Shortcuts JSON paste
- A manual JSON file import
- Or now: Native HealthKit sync

## Why This Approach

✓ **One codebase** — web and native share 99% of code  
✓ **Offline works** — Capacitor bundles the PWA, same service worker  
✓ **No backend** — data stays on your device, same as web  
✓ **Easy maintenance** — fix a bug once, works everywhere  

## Files Added

**For iOS:**
- `ios/App/App/Plugins/HealthKitPlugin.swift` — reads Health samples
- `ios/App/App/Plugins/HealthKitPlugin.m` — Capacitor bridge
- `capacitor.config.json` — Capacitor app config
- `package.json` + `node_modules/` — Capacitor CLI

**For web (in `www/`):**
- `healthkit-bridge.js` — exposes native HealthKit to JavaScript
- Updated `index.html` — loads the bridge, adds Sync button
- Updated `app.js` — handles HealthKit sync UI

**Documentation:**
- `BUILD.md` — step-by-step build instructions
- `NATIVE_APP.md` — this file

## Syncing Strategy

### On App Startup
- healthkit-bridge.js tries to fetch today's HealthKit data automatically
- If permissions already granted and data exists, it imports silently
- First launch will prompt for permission (user taps Allow)

### On-Demand (Tap Button)
- User taps "Sync HealthKit" button in footer
- App fetches latest data and imports it
- Updates all metric cards in real-time

### No Duplication
- Same `applyHealthDay()` logic as Shortcuts: re-syncing a day replaces the data
- Manual entries never touched
- Entries tagged `src:"h"` are clearly synced vs. manual

## Testing Without iPhone

You can test the web version locally:
```bash
python3 -m http.server 8000 -d www
# Visit http://localhost:8000/
```

The app works fully (all manual entries, export/import) but won't see the Sync button or HealthKit data (expected — no native code locally).

## Future Improvements

- **Auto-sync schedule:** Set time of day to auto-sync (e.g., 9 pm daily)
- **Workout history:** Parse HealthKit workouts once iOS 26 exposes them properly
- **Sleep sync:** Add sleep data to the daily sync
- **App Store release:** Requires paid developer account, but then it's a "real app"
