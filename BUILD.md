# Build and Deploy to iPhone

Your Health Log app now runs as a native iOS app with direct HealthKit access. No more Shortcuts needed — just one tap to sync your Health data automatically.

## Prerequisites

- Mac with Xcode installed (free from App Store)
- iPhone running iOS 26
- Apple ID (free account works; see note below)

## Build Steps

### 1. Open the Xcode project

```bash
cd health-tracker/ios/App
open App.xcodeproj
```

Xcode will open. Wait for it to fully load (2–3 minutes).

### 2. Select your iPhone as the build target

1. At the top of Xcode, click the target dropdown (currently shows "App")
2. Select your iPhone from the list (must be plugged in or on same WiFi with WiFi Sync enabled)

### 3. Configure signing (one-time)

1. Go to **Signing & Capabilities** tab
2. Under **Team**, click **Add an Account...**
3. Sign in with your Apple ID (free account is fine)
4. Select your account from the Team dropdown
5. For **Bundle Identifier**, change `com.vemula78.healthlog` to something unique if you want (optional)

### 4. Build and run

Press **Cmd + R** or click the **Play** button. Xcode will compile and install the app on your iPhone.

The first build takes 2–3 minutes. Subsequent builds are faster.

### 5. Trust the app

On your iPhone:
- Go to **Settings** → **General** → **VPN & Device Management**
- Tap your Apple ID under "Developer App"
- Tap **Trust**

Open Health Log from your home screen.

## First Launch

When you open Health Log for the first time:
1. You'll see a **"Health Log" Would Like to Access Your Health Data** prompt
2. Tap **Allow**
3. You'll be prompted for each health type (Steps, Heart Rate, etc.)
4. Allow each one

After permissions are granted, the app will automatically sync today's Health data.

## Daily Use

**Tap the "Sync HealthKit" button** (in the footer) to pull today's data from Health into your log. The button only appears in the native app, not the web version.

The sync happens automatically on app startup too — the data is ready when you open the app.

## Free vs. Paid Apple Developer Account

**Free account:**
- Build and install to your phone as much as you want
- App lasts **7 days** before you need to rebuild

**$99/year account:**
- Permanent installs (no rebuilds needed)
- Easier for long-term use

For daily use, rebuilding every 7 days is simple: just press **Cmd + R** in Xcode again.

## Troubleshooting

**"App Installation Failed"**
- Make sure your iPhone is unlocked
- Check that your Apple ID is trusted (Settings → General → VPN & Device Management)

**"No Health Data Synced"**
- Check that you granted permission (Settings → Health → Data Access & Devices → Health Log)
- Make sure Health app has data for today (steps, heart rate, etc.)

**"Cmd + R Does Nothing"**
- Make sure you selected your iPhone as the target (top of Xcode)
- Try **Product** → **Clean Build Folder** (Cmd + Shift + K), then **Product** → **Build** (Cmd + B)

## What's Different from the Web Version

| Feature | Web Version | Native App |
|---------|-------------|-----------|
| HealthKit sync | Broken (iOS 26 Shortcuts) | ✓ Works perfectly |
| Frequency | One tap at a time | Automatic + one-tap option |
| Installation | Home Screen (PWA) | App Store-like (native) |
| Data storage | Device localStorage | Device secure storage |

Your data still stays **100% on your phone** — nothing is sent to a server.

## Next Steps

- Build and test on your phone
- Grant Health permissions
- Tap "Sync HealthKit" to pull your Health data
- Add manual entries as before (weight, blood pressure, etc.)
- Enjoy automatic Health data sync 🎉
