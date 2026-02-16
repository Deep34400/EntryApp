# Gate Entry (EntryApp)

Mobile app for gate entry / visitor management.

## Expo account

- **Current account:** `tech3440` (set in `app.json` → `expo.owner`).
- Check who you’re logged in as: `eas whoami`.
- Log in: `eas login`. Log out: `eas logout`.

## When we add a new Expo account

If you switch to a **different Expo account** (new username/email):

1. **Log out and log in**
   - `eas logout`
   - `eas login` (use the new account)

2. **What we change in the project**
   - **`app.json`** (under `expo`):
     - `"owner": "new-username"` — set to the new Expo username (e.g. `tech3440`).
     - `"extra": { "eas": { "projectId": "NEW-PROJECT-ID" } }` — set when you create/link a new project (see below).
     - `"updates": { "url": "https://u.expo.dev/NEW-PROJECT-ID" }` — required for OTA updates; add after you have the new project ID eas update:configure.
   - **No change** to `eas.json` (channels stay `preview` / `production`).

3. **Link app to the new account’s project**
   - From **EntryApp** run: `eas build --platform android --profile preview`.
   - When asked **“Would you like to create a new project?”** choose **Y**.
   - EAS creates a project under the new account and usually updates `app.json` with `owner` and `extra.eas.projectId`.
   - If it doesn’t, copy the **Project ID** from [expo.dev](https://expo.dev) → your project → Settings, and set in `app.json`:
     - `"owner": "new-username"`
     - `"extra": { "eas": { "projectId": "NEW-PROJECT-ID" } }`
     - `"updates": { "url": "https://u.expo.dev/NEW-PROJECT-ID" }`
   - Then run `eas update:configure` to re-enable OTA updates.

4. **When to update vs create a new build**
   - **Update (no new build):** For JS/TS, UI, styles, text, assets — use **OTA**:  
     `eas update --channel preview --message "Description"`  
     Users get it when they open the app. **Do not** build a new APK for these changes.
   - **Create new build:** When you change native code, permissions, `app.json` version, or Expo SDK — run `eas build ...` and share the new APK. Reinstall on devices if needed.

Full build and OTA steps: see **[BUILD_ANDROID.md](./BUILD_ANDROID.md)**.

## Run locally

```bash
npm install
npm start
```

Then open in Expo Go or a device/simulator.
