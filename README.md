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

1. User enters phone on **LoginOtpScreen** → **send OTP** (`auth.ts`: `sendOtp`) with guest token in `Authorization`.
2. User enters OTP → **verify OTP** (`auth.ts`: `verifyOtp`) → backend returns `accessToken`, `refreshToken`, user, roles, hub.
3. **AuthContext.setTokensAfterVerify(data)** saves tokens, user, roles, selectedHubId to state and AsyncStorage; **hub-bridge** gets the hub id for API calls.
4. **OTPVerificationScreen** uses **getRoleAndHubFromVerifyData** to decide where to navigate: no role → `NoRoleBlock`, no hub → `NoHubBlock`, else → `VisitorType`.

Guest token is only for identity + send OTP + verify OTP. After verify, we use access + refresh only; guest is cleared from storage.

---

## 3. Token refresh flow

- **Tokens**: Guest (anonymous/OTP only), Access (authenticated APIs), Refresh (used only to get a new access token).
- **client/api/requestClient.ts**: On 401, if the response body has **TOKEN_EXPIRED**, the client calls the refresh handler (registered by **AuthContext**) once, then retries the request once with the new access token.
- **AuthContext** registers the refresh handler. Refresh uses **auth.ts** `refreshToken()`. If refresh fails (e.g. 401), AuthContext runs logout; if server error, requestClient throws and does not logout. SessionExpiredHandler sends the user to LoginOtp when **sessionExpired** is set.
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
- **OTP / login / identity errors** (invalid guest, token version mismatch, etc.) → logout + new identity; user must request OTP again. Handled in **AuthContext** (e.g. `ensureGuestToken` catches and **auth.ts** throws; token version mismatch → logout).
- **Offline / 500 / 503 / timeout / Failed to fetch** → **ServerUnavailableContext** shows the global “Server temporarily unavailable” screen. **client/lib/server-unavailable.ts** exposes **showServerUnavailable()**; requestClient and **auth.ts** call it, then throw; no logout.
- **ErrorBoundary** catches render errors and shows **ErrorFallback** (with reset option).

---

## 6. Where auth and token rules live (single source of truth)

| What                                                  | File                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh on 401 only when backend says “token expired” | **client/api/requestClient.ts** — 401 body is checked for `TOKEN_EXPIRED`; single place, no separate error-codes file.                                                   |
| 401 → refresh once + retry, then 401 → logout         | **client/api/requestClient.ts** — `requestWithAuthRetry`, inline `is401TokenExpired`.                                                                                     |
| Refresh handler + logout on unauthorized              | **client/contexts/AuthContext.tsx** — `refreshAccessToken`, `handleUnauthorized`; exported `getRefreshHandler` / `notifyUnauthorized` used by requestClient.              |
| OTP/login/identity errors → logout + new identity     | **client/contexts/AuthContext.tsx** — e.g. `ensureGuestToken` and `isTokenVersionMismatch`; **client/lib/auth.ts** for API only (no logout, no storage).                  |

To add “logout on 403” or another rule: add handling in requestClient and call **notifyUnauthorized()** (from AuthContext) when the condition is met; AuthContext clears session when that is called.

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

- **api/** — **requestClient.ts**: the only networking engine. Access token injection, 401 TOKEN_EXPIRED → refresh once and retry, final 401 → notifyUnauthorized(), 5xx/HTML/network → showServerUnavailable(). No duplicate fetch or auth logic elsewhere.
- **apis/** — All backend calls in one place. **apis/ticket/ticket.api.ts** (getTicketCounts, getTicketList, getTicketById, createTicket, updateTicket), **apis/driver/driver.api.ts** (getDriverDetails). Each calls `requestWithAuthRetry` only — no direct fetch, no auth/server logic in apis. Screens import from **apis/** and never call requestClient directly.
- **query/** — **queryClient.ts**: React Query config only (default options, no fetch, no auth).
- **contexts/** — AuthContext (auth state, tokens, logout, refresh), UserContext (name/phone for forms), ThemeContext, ServerUnavailableContext.
- **lib/** — **storage.ts**, **auth.ts** (identity, OTP, refresh API only), **api-url.ts**, **hub-bridge**, **api-error**, **server-unavailable**, **api-endpoints**. No business APIs in lib.
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
- **Auth**: `client/docs/AUTH_README.md` (login, refresh, logout, identity, file roles). Auth files: `client/lib/storage.ts`, `client/lib/auth.ts`, `client/api/requestClient.ts`, `client/contexts/AuthContext.tsx`.
- **Networking**: One engine — **client/api/requestClient.ts**. All backend calls go through **client/apis/** (ticket.api, driver.api); screens call apis only, never requestClient directly. React Query config: **client/query/queryClient.ts**.

A boring, obvious, lightweight codebase is a good codebase. Prefer deletion over abstraction and explicit logic over magic.
