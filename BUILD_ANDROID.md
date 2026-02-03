# Build Android APK (Gate Entry app)

Use this to create an **APK file** you can install on Android devices or upload (e.g. to Google Drive) for others to download.

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
