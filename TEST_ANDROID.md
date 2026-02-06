# Test the app on your Android phone

You can test in two ways: **Expo Go** (fast, for development) or **install an APK** (real app, no Expo Go).

---

## Option A: Expo Go (quick testing, same WiFi)

Best for daily development. Your phone runs the app through the **Expo Go** app while your computer runs the dev server.

### 1. Install Expo Go on your Android phone

- Open **Google Play Store** on the phone.
- Search for **Expo Go** and install it.

### 2. Start the app on your computer

From the **EntryApp** folder:

```bash
cd EntryApp
npm start
```

A QR code and a URL will appear in the terminal.

### 3. Open the app on your phone

- Open the **Expo Go** app on your Android phone.
- Tap **“Scan QR code”** and scan the QR code from the terminal (or from the browser page that opened).
- The app will load on your phone. Keep the computer running and the phone on the **same Wi‑Fi** as the computer.

### 4. If it doesn’t connect

- **Same Wi‑Fi:** Phone and computer must be on the same network.
- **Tunnel (if Wi‑Fi is restricted):** In the terminal where `npm start` is running, press **`s`** to switch to **tunnel** mode, then scan the QR code again. Slower but works across networks.
- **Firewall:** Allow Node/Metro through your computer’s firewall if the phone still can’t connect.

---

## Option B: Install APK on your phone (no Expo Go)

Use this when you want to test the real built app (e.g. for vibration, notifications, or sharing with others). See **BUILD_ANDROID.md** for full details.

### Short version

1. **Expo account:** Sign up at [expo.dev](https://expo.dev/signup) if you don’t have one.
2. **Build APK** (from **EntryApp** folder):

   ```bash
   npx eas-cli build --platform android --profile preview
   ```

   (First time: run `npx eas-cli login` and confirm creating the EAS project when asked.)

3. When the build finishes, open the link from the terminal (or go to [expo.dev](https://expo.dev) → your project → **Builds**).
4. **Download** the `.apk` for the completed Android build.
5. **On your Android phone:**
   - Copy the APK to the phone (e.g. Google Drive, USB, or download link).
   - Open the APK file and install. If asked, allow **“Install from unknown sources”** for the app or browser you use to open the APK.
   - Open **Gate Entry** from the app drawer.

### Important for APK / real device

- In **EntryApp**, your `.env` has `EXPO_PUBLIC_API_URL`. For the phone to reach your backend, use a **URL the phone can access** (e.g. your computer’s LAN IP like `http://192.168.1.x:3000` or a public URL), **not** `localhost`. Rebuild the APK after changing `.env`.

---

## Summary

| Goal                         | Use                          |
|-----------------------------|------------------------------|
| Quick test on phone daily   | **Option A – Expo Go**       |
| Test final app, no Expo Go  | **Option B – APK** (see BUILD_ANDROID.md) |

For most day-to-day testing on your Android phone, use **Option A (Expo Go)**.
