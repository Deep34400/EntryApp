# Build Android APK (Gate Entry app)

Use this to create an **APK file** you can install on Android devices or upload (e.g. to Google Drive) for others to download.

- **Current Expo account:** `tech3440` (see [README](README.md)).
- **New Expo account?** → See [Using a new Expo account](#using-a-new-expo-account). Summary of [what we change when we add a new account](README.md#when-we-add-a-new-expo-account) is in README.
- **Pushing changes in the same app?** → Use **OTA** (`eas update`), no new build — see [Update the app without rebuilding](#update-the-app-without-rebuilding).

## When to build vs when to update (OTA)

You **do not need to build a new APK every time** you change the app.

| What you changed | What to do |
|------------------|------------|
| **JS/TS, UI, styles, text, assets** | **Push an update** (see [Update the app without rebuilding](#update-the-app-without-rebuilding)) — users get it when they open the app. |
| **Native code, new permissions, `app.json` version, new Expo SDK** | **Create a new build** (steps below) and share the new APK. |

Build the APK **once** (or when you bump version / change native config). For day-to-day fixes and features, use **EAS Update** so the same installed app gets updates without reinstalling.

---

## Using a new Expo account

The app is set to use the **`tech3440`** Expo account (`app.json` → `expo.owner`). If you want to use a **different Expo account** (new email/team):

1. **Log out of the current account**
   ```bash
   eas logout
   ```

2. **Log in with the new account**
   ```bash
   eas login
   ```
   Use the new account’s email and password.

3. **Link this app to the new account’s project**
   - From the **EntryApp** folder run:
     ```bash
     cd EntryApp
     eas build --platform android --profile preview
     ```
   - When asked **“Would you like to create a new project?”** choose **Y** (new account = new project).
   - EAS will create the project and usually **update `app.json`** with the new `owner` and `extra.eas.projectId`. If it does not, get the new **Project ID** from [expo.dev](https://expo.dev) → your account → the new project → Settings, then in **EntryApp** update **`app.json`** (see [README – what we change when we add a new account](README.md#when-we-add-a-new-expo-account)):
     - `"owner": "your-new-username"`
     - `"extra": { "eas": { "projectId": "NEW-PROJECT-ID" } }`
     - `"updates": { "url": "https://u.expo.dev/NEW-PROJECT-ID" }`
   - Then run **`eas update:configure`** to re-enable OTA.

4. **After switching accounts**, the **same installed app** (same APK) still works. To give that app **new code without building again**, use **OTA** (see [Update the app without rebuilding](#update-the-app-without-rebuilding)) — push updates with `eas update --channel preview --message "…"` (or `production`). You do **not** need to build a new APK for JS/UI changes.

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

> **Reminder:** Same app, no new build — use **`eas update`** for code/UI changes. Build a new APK only when you change native config, permissions, or app version.

## Build profiles (in `eas.json`)

| Profile     | Use case              | Output   |
|------------|------------------------|----------|
| `preview`  | Testing / sharing APK  | `.apk`   |
| `production` | Release APK         | `.apk`   |

Always use **`--profile preview`** (or **`production`**) so the build is an **APK**. Without that, EAS builds an AAB (Play Store format), which you can’t install directly as a single file.

## Troubleshooting

- **“Not logged in”** → Run `eas login`.
- **“You don’t have the required permissions” / “Entity not authorized”** → The app was linked to **another Expo account’s** project. It’s now unlinked (no `projectId` in `app.json`). Run `eas build --platform android --profile preview` from **EntryApp**; when asked **“Would you like to create a new project?”** choose **Y**. EAS will create a project under your current account and update `app.json`. Then run `eas update:configure` to re-add the OTA updates URL.
- **Build fails** → Check the build log on expo.dev for errors (e.g. missing env vars). Your API URL is in `.env` (`EXPO_PUBLIC_API_URL`); for the built app it’s baked in at build time.
- **App crashes on open** → Ensure `EXPO_PUBLIC_API_URL` in `.env` points to a URL reachable from the phone (use a public URL, not `localhost`).
- **Update not showing** → Make sure the installed app was built with the same channel (`preview` or `production`) you use in `eas update --channel …`. Force close the app and open it again once or twice.
