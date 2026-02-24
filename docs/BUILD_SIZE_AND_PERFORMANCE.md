# Build Size & Performance Guide

## Development, testing (Expo Go) & production commands

### What we changed (summary)

- **Android:** Smaller builds (AAB, 2 ABIs, minify, shrink, bundle compression), Hermes explicit.
- **App:** Removed unused server deps; Babel strips `console` in production; referral API deduped; ticket update uses PATCH.
- **EAS:** Production uses `buildType: "app-bundle"` (Play Store); preview uses `buildType: "apk"` for internal/testing.

### Development (Expo Go — daily coding)

Use Expo Go on your phone to run the app without building a custom client.

```bash
# Install deps (once after clone or package.json change)
npm install

# Start Metro and open in Expo Go
npm start
```

Then scan the QR code with **Expo Go** (Android/iOS). Shake device for dev menu.

- **Tunnel (device not on same Wi‑Fi):** `npm run start:tunnel`
- **Clear cache:** `npm run start:clear`

### Testing (preview build — APK for testers)

Build an APK you can share internally (no Play Store):

```bash
# Build preview APK (eas.json → profile "preview")
npm run build:preview
```

Download the APK from the EAS dashboard and install on devices.

### Production (store release)

Build an AAB for Play Store (smaller download per user):

```bash
# Build production AAB
npm run build:production
```

Then submit to Play Store:

```bash
npm run submit:android
```

### OTA updates (expo-updates)

Push JS/assets updates without a new store build:

```bash
# Publish OTA update to production (users get it on next app launch)
npm run update:production -- --message "Fix for X"
```

- **Channel vs branch:** Your `app.json` / EAS use **channel** (e.g. `production`). EAS Update links branch → channel. Create a branch named `production` in EAS and point the production build to it.
- **Development:** For dev builds, use channel `development` and run `npx eas update --branch development` if you use OTA in dev.

### What we changed, where, and why

| What | Where | Why |
|------|--------|-----|
| **Testing / internal** | `eas.json` → profile `preview` | `buildType: "apk"` so you get one APK to install and share with testers (no store). |
| **Production / store** | `eas.json` → profile `production` | `buildType: "app-bundle"` (EAS only accepts `apk` or `app-bundle`, not `aab`). Play Store uses AAB for smaller per-device downloads. |
| **Preview build** | `npm run build:preview` | Runs `eas build --profile preview` → uses preview profile above. |
| **Production build** | `npm run build:production` | Runs `eas build --profile production` → uses production profile above. |

### Quick command reference

| Goal | Command |
|------|--------|
| **Dev (Expo Go)** | `npm start` |
| **Dev with tunnel** | `npm run start:tunnel` or `npm start -- --tunnel` |
| **Dev (clear cache)** | `npm run start:clear` |
| **Testing / internal (APK)** | `npm run build:preview` |
| **Production (AAB for store)** | `npm run build:production` |
| **Submit to Play Store** | `npm run submit:android` |
| **OTA update (production)** | `npm run update:production -- --message "Your message"` |

---

## 1. Deep analysis: what increases Android build size

| Factor | Impact | Status / Action |
|--------|--------|------------------|
| **Multiple ABIs** | ~25–35 MB per ABI (arm64, armeabi-v7a, x86, x86_64) | Reduced to arm64 + armeabi-v7a; use **AAB** so Play Store serves one ABI per device |
| **APK vs AAB** | Universal APK = sum of all ABIs | **Production build set to AAB** in `eas.json` — user download ~25–40 MB instead of ~100 MB |
| **R8 minify** | 10–30% smaller DEX | **Enabled** via `android.enableMinifyInReleaseBuilds=true` |
| **Resource shrinking** | Removes unused resources | **Enabled** via `android.enableShrinkResourcesInReleaseBuilds=true` |
| **Bundle compression** | Compressed JS in APK | **Enabled** via `android.enableBundleCompression=true` |
| **Animated WebP** | +3.4 MB | **Disabled** (`expo.webp.animated=false`) |
| **x86 / x86_64** | +~50 MB for emulators | **Removed** from default architectures; use `-PreactNativeArchitectures=arm64-v8a` for smallest local APK |
| **Hermes bytecode** | Smaller than JSC bundle | **Verified** — `jsEngine: "hermes"` in app.json, `hermesEnabled=true` in gradle.properties |
| **Heavy / unused deps** | Extra native/JS code | **Removed** from package.json: express, pg, ws, http-proxy-middleware, tsx, drizzle-orm, drizzle-zod (see §2) |

---

## 2. Heavy dependencies (before cleanup)

- **Removed (not used in client):** `express`, `pg`, `ws`, `http-proxy-middleware`, `tsx`, `drizzle-orm`, `drizzle-zod`  
  If you have a separate backend that uses these, keep them in that backend’s `package.json`, not the Expo app.
- **Heavy but kept (used):**  
  - `react-native-reanimated`, `react-native-svg`, `expo-image` — used in UI.  
  - `@tanstack/react-query` — used for API caching.  
  - `react-native-keyboard-controller` — used for keyboard handling.
- **Optional trim:**  
  - `@expo-google-fonts/nunito` — app uses Poppins; remove Nunito if you don’t load it.  
  - `expo-glass-effect` — remove if you don’t use glass UI.  
  - `zod` / `zod-validation-error` — only remove if you confirm no imports in client.

---

## 3. What can be safely removed

- Already removed: express, pg, ws, http-proxy-middleware, tsx, drizzle-orm, drizzle-zod.
- Safe to remove after confirming no usage:  
  - `@expo-google-fonts/nunito` (if you only use Poppins),  
  - `expo-glass-effect` (if unused),  
  - `@types/express` (was devDependency for express).

---

## 4. Exact config changes applied (Android size)

**`android/gradle.properties`**

- `reactNativeArchitectures=armeabi-v7a,arm64-v8a` (dropped x86, x86_64 for production).
- `android.enableMinifyInReleaseBuilds=true`
- `android.enableShrinkResourcesInReleaseBuilds=true`
- `android.enableBundleCompression=true`
- `EX_DEV_CLIENT_NETWORK_INSPECTOR=false`

**`android/app/build.gradle`**

- `enableBundleCompression = (findProperty('android.enableBundleCompression') ?: true).toBoolean()` so bundle compression is **on** by default.

**`app.json`**

- `"jsEngine": "hermes"` (explicit Hermes).

**`eas.json`**

- **Preview (testing/internal):** `"android": { "buildType": "apk" }` — single APK you can install and share with testers.
- **Production (store):** `"android": { "buildType": "app-bundle" }` — EAS expects `app-bundle` (not `aab`); Play Store gets an AAB for smaller per-device downloads.

---

## 5. Hermes setup verification

- **app.json:** `"jsEngine": "hermes"`.
- **android/gradle.properties:** `hermesEnabled=true`.
- **Expo SDK 54:** Hermes is default; explicit `jsEngine` confirms it.

No further Hermes config needed.

---

## 6. Babel production optimization

**`babel.config.js`**

- Production env: `api.env("production")` used to add `transform-remove-console` with `exclude: ["error", "warn"]` so `console.log`/`info`/`debug` are stripped in production, keeping errors and warnings.
- **DevDependency added:** `babel-plugin-transform-remove-console`.

For EAS/Expo production builds, Metro/Babel use `NODE_ENV=production`, so this applies automatically.

---

## 7. Asset optimization suggestions

- **Images:** Prefer WebP (or PNG) and resize to max display size (e.g. 2x for retina). Use `expo-image` for caching.
- **Splash / icon:** `app.json` already points to single logo; ensure `assets/images/logo.png` is not oversized (e.g. 1024×1024 for icon is enough).
- **Avoid bundling unused assets:** Use `require()` only for assets you need; Metro tree-shakes unused requires.
- **Optional:** Run image compression (e.g. `sharp`, `squoosh`) on `assets/images/*` before commits.

---

## 8. Clean scalable folder architecture (refactor)

Current layout is already clear. Suggested optional restructure for scale:

```
client/
  app/                 # Entry only (e.g. App.tsx, index.js if you move it)
  core/                # API + shared engine
    api/               # requestClient, auth retry
    lib/               # api-url, api-endpoints, storage, format, etc.
    query/             # queryClient
  features/            # (optional) group by domain later
  ui/                  # Rename components → ui or keep components
    components/
  screens/
  navigation/
  contexts/
  hooks/
  constants/
  types/
  utils/
  permissions/
```

**Exact steps (optional):**

1. Create `client/core/` and move `client/api/`, `client/lib/`, `client/query/` into it (e.g. `client/core/api/`, `client/core/lib/`, `client/core/query/`).
2. Update `tsconfig.json` paths, e.g. `"@/core/*": ["./client/core/*"]`, and update imports from `@/api/`, `@/lib/`, `@/query/` to `@/core/api/`, etc.
3. Keep `client/components/` as-is (or rename to `client/ui/components/` later).

If you prefer minimal change, keeping the current structure is fine; the main gain is not duplicating API/auth logic (already centralized in `api/requestClient.ts`).

---

## 9. API structure improvement (avoid duplicate calls)

- **Single engine:** All calls go through `api/requestClient.ts` → `requestWithAuthRetry`. No duplicate auth/retry logic.
- **Referral names:** Previously `ReferralSection` could call `getReferralNames` from both `useEffect` and `toggleReferral`.  
  **Change:** New hook `useReferralNames({ enabled })` uses React Query with `queryKey: ["referral-names", accessToken]`. ReferralSection uses it with `enabled: visible && referral === "yes"`. One request per session, shared cache.
- **Ticket list:** Already lazy (counts + open on load; delayed/closed when tab visited); no change needed.
- **Purpose config:** `usePurposeConfig` with `staleTime: 5 min`; no duplicate calls.
- **Ticket update:** `updateTicket` now uses **PATCH** to match backend (`api-endpoints.ts`); was incorrectly **PUT**.

---

## 10. Production-ready performance checklist

- [x] Hermes enabled and set in app.json
- [x] Production build uses AAB (eas.json)
- [x] R8 minify + resource shrinking enabled (gradle.properties)
- [x] Bundle compression enabled
- [x] Unused server deps removed from package.json
- [x] Babel: remove console in production (keep error/warn)
- [x] Referral names: single API call via React Query
- [x] Ticket update: PATCH not PUT
- [ ] **You:** Add signing config for release (keystore) in `android/app/build.gradle` when publishing to Play Store
- [ ] **You:** Optimize splash/icon assets if large
- [ ] **You:** Run a production EAS build and confirm download size from Play Console (or internal testing track)

---

## Quick reference: files touched

| File | Change |
|------|--------|
| `android/gradle.properties` | Architectures, minify, shrink, bundle compression, EX_DEV off |
| `android/app/build.gradle` | enableBundleCompression default true |
| `app.json` | `jsEngine: "hermes"`, formatted |
| `eas.json` | production android buildType: aab, formatted |
| `babel.config.js` | Production: transform-remove-console (exclude error/warn) |
| `package.json` | Removed express, pg, ws, http-proxy-middleware, tsx, drizzle-orm, drizzle-zod; added babel-plugin-transform-remove-console; removed @types/express, drizzle-kit from devDependencies |
| `client/apis/ticket/ticket.api.ts` | updateTicket: PUT → PATCH |
| `client/hooks/useReferralNames.ts` | **New** — React Query hook for referral names |
| `client/components/ReferralSection.tsx` | Use useReferralNames; remove duplicate getReferralNames calls |
