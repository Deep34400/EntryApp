# Guard App (Entry / Ops Portal)

React Native (Expo) app for guards and hub managers: visitor entry, OTP login, token display, ticket list/detail. This README explains how the app works and where to change things. Read it in 10–15 minutes.

---

## 1. App startup flow

1. **App.tsx** mounts → `ErrorBoundary` → `QueryClient` → `ThemeProvider` → **AuthProvider** → `SessionExpiredHandler` → `UserProvider` → `SafeAreaProvider` → `ServerUnavailableProvider` → `NavigationContainer` → **RootStackNavigator**.
2. **AuthContext** loads auth from AsyncStorage (`@entry_app_auth`). If no access/refresh tokens, it fetches a **guest token** (identity API) so the user can request OTP.
3. **RootStackNavigator** uses `useAuth()` and **permissions/rolePermissions.ts** to decide:
   - **initialRouteName**: not logged in → `LoginOtp`; no role → `NoRoleBlock`; no hub → `NoHubBlock`; else → `VisitorType`.
   - **Which screens exist**: only screens returned by `getScreensForRole(allowedRole)` are registered. Screens not in the list cannot be opened.
4. If **sessionExpired** is true, **SessionExpiredHandler** resets navigation to `LoginOtp` with a “session expired” message and clears the flag.

---

## 2. Login & OTP flow

1. User enters phone on **LoginOtpScreen** → **send OTP** (auth-api: `sendOtp`) with guest token in `Authorization`.
2. User enters OTP → **verify OTP** (auth-api: `verifyOtp`) → backend returns `accessToken`, `refreshToken`, user, roles, hub.
3. **AuthContext.setTokensAfterVerify(data)** saves tokens, user, roles, selectedHubId to state and AsyncStorage; **hub-bridge** gets the hub id for API calls.
4. **OTPVerificationScreen** uses **getRoleAndHubFromVerifyData** to decide where to navigate: no role → `NoRoleBlock`, no hub → `NoHubBlock`, else → `VisitorType`.

Guest token is only for identity + send OTP + verify OTP. After verify, we use access + refresh only; guest is cleared from storage.

---

## 3. Token refresh flow

- **Tokens**: Guest (anonymous/OTP only), Access (authenticated APIs), Refresh (used only to get a new access token).
- **client/api/requestClient.ts**: On 401, if the response body has error code **TOKEN_EXPIRED** (see **client/lib/auth-error-codes.ts**), the client calls **auth-bridge.tryRefreshToken()** once, then retries the request once with the new access token.
- **AuthContext** registers **refreshAccessToken** with the auth-bridge. Refresh uses only the refresh token (no guest). If refresh fails for any reason (401, network, invalid response), AuthContext clears session, sets **sessionExpired**, and SessionExpiredHandler sends the user to LoginOtp.
- Only one refresh runs at a time (single-flight); concurrent 401s share the same refresh promise.

---

## 4. Logout flow

- **When logout happens**: User taps Logout (Profile), or any **401 Unauthorized** that does _not_ trigger refresh (e.g. generic 401, or auth/OTP/identity/refresh API 401, or 401 after a failed retry).
- **AuthContext**: `handleUnauthorized` (and refresh failure path) clear tokens/user/role/hub from state and AsyncStorage, set **sessionExpired**, clear hub in hub-bridge. User sees LoginOtp with “Your session expired. Please sign in again.”
- **Why logout on 401 is correct**: For a Guard App, security is more important than convenience. Invalid or expired session → re-login. Do not treat generic 401 as “retry later.”

---

## 5. Error handling flow

- **401 + TOKEN_EXPIRED** → refresh once → retry once (see Token refresh flow).
- **401 (generic or after failed refresh)** → logout (sessionExpired → LoginOtp).
- **OTP / login / identity errors** (invalid guest, token version mismatch, etc.) → logout + new identity; user must request OTP again. See **client/lib/auth-api.ts** (`isInvalidGuestSessionError`, `isTokenVersionMismatch`).
- **Offline / 500 / 503 / timeout / Failed to fetch** → **ServerUnavailableContext** shows the global “Server temporarily unavailable” screen (via **server-unavailable-bridge**). requestClient and auth-api call **showServerUnavailable()** instead of showing raw errors.
- **ErrorBoundary** catches render errors and shows **ErrorFallback** (with reset option).

---

## 6. Where auth and token rules live (single source of truth)

| What                                                  | File                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh on 401 only when backend says “token expired” | **client/lib/auth-error-codes.ts** — `REFRESH_ON_401_CODES` (e.g. `TOKEN_EXPIRED`). Add codes here to allow refresh for more 401 responses.                               |
| 401 → refresh once + retry, then 401 → logout         | **client/api/requestClient.ts** — `requestWithAuthRetry`, `is401TokenExpired`.                                                                                            |
| Refresh handler + logout on unauthorized              | **client/contexts/AuthContext.tsx** — `refreshAccessToken`, `handleUnauthorized`; registered with **client/lib/auth-bridge.ts**.                                          |
| OTP/login/identity errors → logout + new identity     | **client/lib/auth-api.ts** — `isInvalidGuestSessionError`, `isTokenVersionMismatch`, and error codes like `ERROR_CODE_UNAUTHORIZED`, `ERROR_CODE_TOKEN_VERSION_MISMATCH`. |

To add “logout on 403” or another rule: add handling in requestClient (or auth-api for auth routes) and call **auth-bridge.notifyUnauthorized()** when the new condition is met; AuthContext already clears session when that is called.

---

## 7. Screen and role handling

- **Roles**: `guard` | `hub_manager` (backend may send `hm`; it is normalized to `hub_manager`).
- **No role checks inside screens.** Role only decides:
  - Which screens are registered in **RootStackNavigator** (from **client/permissions/rolePermissions.ts** — `getScreensForRole(allowedRole)`).
  - Which actions are allowed (e.g. create entry, close ticket) via **usePermissions()** and `canDo` / `canAccessScreen`.

**client/permissions/rolePermissions.ts** is the only place that defines:

- `COMMON_SCREENS` (LoginOtp, OTPVerification, NoRoleBlock, NoHubBlock)
- `GUARD_SCREENS` and `HM_SCREENS`
- Action permissions (`GUARD_ACTIONS`, `HM_ACTIONS`)

- **Add a new screen**: Implement the screen component, add its name to `RootScreenName` and to the right `*_SCREENS` array in **rolePermissions.ts**, then add it to **RootStackNavigator** `SCREEN_CONFIG` and (if back button needed) `SCREENS_WITH_BACK`.
- **Restrict a screen to a role**: Put it only in that role’s `*_SCREENS` list (and not in COMMON_SCREENS).
- **Add a new role**: In **rolePermissions.ts** add a new `*_SCREENS` and `*_ACTIONS` array, extend `getScreensForRole` and `canAccessScreen` / `getActionsForRole`. In **AuthContext** extend `ALLOWED_ROLES` and `getAllowedRole`.

---

## 8. Folder structure (client)

- **api/** — `requestClient.ts`: central API client, auth retry, 401 handling, hub id on requests.
- **contexts/** — AuthContext (auth state, tokens, logout, refresh), UserContext (name/phone for forms), ThemeContext, ServerUnavailableContext.
- **lib/** — auth-api, auth-bridge, hub-bridge, api-error, server-unavailable, server-unavailable-bridge, api-endpoints, query-client, format, ticket-utils, etc. No auth state; only helpers and bridges.
- **navigation/** — **RootStackNavigator** only (single stack; role-based screen list). No tabs in use.
- **permissions/** — **rolePermissions.ts** (role config: screens + actions), **usePermissions.ts** (hook), **index.ts** (re-exports).
- **screens/** — One folder for all screens; no auth logic, only UI and data calls.
- **components/** — Shared UI (BackArrow, Button, ThemedText, ErrorBoundary, SessionExpiredScreen, GlobalErrorScreen, AppFooter, etc.).
- **constants/** — designTokens, theme (Layout, Spacing, Colors, Typography), entryPurpose, screenPalette.
- **hooks/** — useTheme, useScreenOptions, useColorScheme (platform-specific).
- **utils/** — validation, entryType.
- **types/** — ticket types.

Keep each folder focused; avoid “misc” or duplicate helpers. Navigation stays in one place (RootStackNavigator + role config).

## 12. Quick reference

- **Env**: Set `EXPO_PUBLIC_API_URL` to your backend base URL (no trailing slash).
- **Entry point**: `client/index.js` → `App.tsx`.
- **Role config**: `client/permissions/rolePermissions.ts`.
- **Auth rules**: `client/lib/auth-error-codes.ts` (refresh vs logout), `client/api/requestClient.ts` (retry), `client/contexts/AuthContext.tsx` (refresh + logout).

A boring, obvious, lightweight codebase is a good codebase. Prefer deletion over abstraction and explicit logic over magic.
