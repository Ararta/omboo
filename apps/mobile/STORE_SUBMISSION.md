# Omboo mobile — store submission guide

What's already done in-repo, and what's left, to get the Expo app into TestFlight / Google Play
internal testing (beta) and eventually production.

## Already done

- **App identity**: `am.omboo.mobile` bundle ID/package (iOS + Android), name "Omboo", version `1.0.0`.
- **Icons & splash**: `assets/images/icon.png` (1024×1024, opaque), `adaptive-icon-foreground.png`
  (transparent, Android adaptive icon), `splash-icon.png` — all generated from the brand palette
  (ink `#241619` / seal `#A6192E` / paper `#FBF6F0`). Placeholder mark (a stamped "Օ"), not a final
  logo — swap these files for real artwork whenever it exists; filenames/sizes can stay the same.
- **Location permission**: scoped to "when in use" only, on both platforms — no background
  location permission is requested, matching the app's actual behavior (GPS is only read at the
  moment someone taps Check-in/Check-out, never polled or tracked in the background).
- **iOS export compliance**: `ITSAppUsesNonExemptEncryption: false` set, so App Store Connect
  won't ask the encryption-usage question on every build.
- **`eas.json`**: `preview` (internal distribution — TestFlight internal / installable APK, for
  beta) and `production` (store submission) build profiles.
- **DIRECTOR login fixed**: TOTP two-factor (QR setup + 6-digit challenge) now works on mobile —
  it was silently broken before this pass since 2FA was added to the API without ever being wired
  into the mobile login screen.
- **Demo-credential hint removed from release builds**: only shows in local Expo Go/dev-client
  sessions (`__DEV__`), never in a real preview/production build.
- **Privacy policy page**: `apps/web/app/privacy` — publicly reachable (no login required) once
  the web app is deployed, e.g. `https://app.omboo.am/privacy`. Both stores require this URL.

## Before the first real build — update these

1. **`eas.json`**: `EXPO_PUBLIC_API_URL` is currently a **placeholder**
   (`https://api.omboo.am`). Point it at wherever the backend actually ends up (the VPS, once
   set up) before running a `preview` or `production` build — a build baked with the wrong API
   URL will just fail to log in.
2. **Icons**: replace the placeholder mark with real brand artwork if/when it exists (same
   filenames in `assets/images/`, same 1024×1024 dimensions).
3. **App description / screenshots**: not something code can produce — needs a few sentences in
   Armenian for the store listing, plus screenshots taken from a real build (simulator or device).

## One-time account setup (yours, not something I can do)

- **Expo/EAS account** — free, needed to run `eas build`.
- **Apple Developer Program** — $99/year, needed for iOS TestFlight/App Store.
- **Google Play Console** — $25 one-time, needed for Android internal testing/Play Store.

## Build & submit commands

Run from `apps/mobile/`:

```bash
npx eas login
npx eas build:configure   # links this project to your EAS account (creates the projectId)

# Beta (internal testing — TestFlight internal group / installable Android APK):
npx eas build --profile preview --platform all

# Store submission (after the beta looks right):
npx eas build --profile production --platform all
npx eas submit --profile production --platform ios
npx eas submit --profile production --platform android
```

`eas submit` will prompt for your Apple/Google credentials the first time; after that they can be
saved in `eas.json`'s `submit` section (App Store Connect API key, Google Play service account
JSON) so it's non-interactive.

## Store listing notes

- **Category**: Business / Productivity.
- **Data safety (Google Play) / Privacy nutrition label (App Store)**: this app collects
  — location (foreground-only, user-initiated, not shared with third parties, used solely for
  attendance check-in/out) and personal info (name, email — used for account/HR functionality,
  not shared). No advertising or analytics SDKs are integrated. Answer both stores' forms
  accordingly; the content mirrors `apps/web/app/privacy`.
- **Review notes for Apple/Google**: mention that this is an internal HR tool — reviewers will
  need a real account to test. A DIRECTOR founds an organization via the web app
  (`/register-organization`) first; the mobile app itself has no self-registration flow (HR
  functionality — including approving new backend accounts — is web-only by design). Provide the
  reviewer a real test DIRECTOR or EMPLOYEE login rather than relying on the seeded demo data,
  since demo accounts belong to one specific organization ("Ararta") that may not be appropriate
  to hand to an app reviewer.

## Known scope limits (not blockers, just be aware)

- HR role has no mobile screens — an HR login on mobile shows a message pointing to the web app.
  This is an intentional, existing product decision, not a gap to fix before submission.
- No native date picker on the "new request" screen (plain `YYYY-MM-DD` text input) — works, just
  not as polished as it could be.
- No push notifications — in-app data is fetched on screen focus/pull-to-refresh only.
