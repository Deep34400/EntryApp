# Build Android APK (Gate Entry app)

Use this to create an **APK file** you can install on Android devices or upload (e.g. to Google Drive) for others to download.

## When to build vs when to update (OTA)

You **do not need to build a new APK every time** you change the app.

| What you changed | What to do |
|------------------|------------|
| **JS/TS, UI, styles, text, assets** | **Push an update** (see [Update the app without rebuilding](#update-the-app-without-rebuilding)) — users get it when they open the app. |
| **Native code, new permissions, `app.json` version, new Expo SDK** | **Create a new build** (steps below) and share the new APK. |

Build the APK **once** (or when you bump version / change native config). For day-to-day fixes and features, use **EAS Update** so the same installed app gets updates without reinstalling.

---

## Prerequisites

- [Expo account](https://expo.dev/signup) (free)
- Node.js and this project set up (`npm install` already done)

## Steps

### 1. Install EAS CLI (one time)

```bash
npm install -g eas-cli
```

Or run without installing:

```bash
npx eas-cli build --platform android --profile preview
```

### 2. Log in to Expo

```bash
eas login
```

Use your Expo account email and password.

### 3. Build the Android APK

From the **EntryApp** folder:

```bash
cd EntryApp
eas build --platform android --profile preview
```

- First time you may be asked to create an EAS project; confirm with **Y**.
- Build runs on Expo’s servers (takes about 10–15 minutes).
- When it finishes, you get a **link** in the terminal and in [expo.dev](https://expo.dev) → your project → Builds.

### 4. Get the APK file

- Open the build link from the terminal, or go to [expo.dev](https://expo.dev) → your project → **Builds**.
- Click the completed **Android** build.
- Click **Download** to get the `.apk` file.

### 5. Use the APK

- Copy the APK to your phone (USB, email, or upload to **Google Drive** and open the link on the phone).
- On the Android device, open the APK file and allow “Install from unknown sources” if asked.
- Install and open **Gate Entry**.

## Update the app without rebuilding

After you have **one APK installed** (from a `preview` or `production` build), you can push **over-the-air (OTA) updates** so users get your latest JS/UI changes without downloading a new APK. The project is already configured for EAS Update; your **next** build will support OTA. Existing APKs built before this setup will not receive updates (reinstall from a new build once).

From the **EntryApp** folder:

```bash
cd EntryApp
eas update --channel preview --message "Fix footer layout"
```

- Use `--channel preview` if the installed app was built with `--profile preview`.
- Use `--channel production` if the installed app was built with `--profile production`.
- Users get the update the next time they **open the app** (or after a restart).

You only need a **new build** when you change native code, permissions, or app version.

## Build profiles (in `eas.json`)

| Profile     | Use case              | Output   |
|------------|------------------------|----------|
| `preview`  | Testing / sharing APK  | `.apk`   |
| `production` | Release APK         | `.apk`   |

Always use **`--profile preview`** (or **`production`**) so the build is an **APK**. Without that, EAS builds an AAB (Play Store format), which you can’t install directly as a single file.

## Troubleshooting

- **“Not logged in”** → Run `eas login`.
- **Build fails** → Check the build log on expo.dev for errors (e.g. missing env vars). Your API URL is in `.env` (`EXPO_PUBLIC_API_URL`); for the built app it’s baked in at build time.
- **App crashes on open** → Ensure `EXPO_PUBLIC_API_URL` in `.env` points to a URL reachable from the phone (use a public URL, not `localhost`).
- **Update not showing** → Make sure the installed app was built with the same channel (`preview` or `production`) you use in `eas update --channel …`. Force close the app and open it again once or twice.
