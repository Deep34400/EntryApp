# Guard App (Entry / Ops Portal)

React Native (Expo) app for guards and hub managers: visitor entry, OTP login, token display, ticket list/detail. This README explains how the app works and where to change things. Read it in 10–15 minutes.

---

## 1. App startup flow

1. **App.tsx** mounts → `ErrorBoundary` → `QueryClient` → `ThemeProvider` → **AuthProvider** → `ClearTicketCacheOnLogout` → **ServerUnavailableProvider** → `UserProvider` → `SafeAreaProvider` → **AppRoot** (NavigationContainer → **RootStackNavigator**).
2. **AuthContext** loads auth from AsyncStorage (`@entry_app_auth`). If no access/refresh tokens and no guest token, it runs **identity** once to get a guest token so the user can request OTP.
3. **RootStackNavigator** uses `useAuth()` and **permissions/rolePermissions.ts** to decide **initialRouteName** and which screens are registered (see Login flow below).
4. **SessionExpiredHandler** (when mounted with `navigationRef`): when `sessionExpired` is true and server is not unavailable, it resets the stack to `LoginOtp` with a “session expired” message and clears the flag.

---

## 2. Login flow (complete) — step by step

This section covers **every case**: identity, send OTP, verify OTP, status codes, and which screen the user sees. No case is skipped.

### Step 0: App just started

- **AuthContext** runs: load from AsyncStorage → if no access token, no refresh token, no guest token → run **identity** (POST identity API) to get a guest token.
- **Screen**: User sees a **loading spinner** on **LoginOtpScreen** until `isRestored` and `isGuestReady` are set (identity success) or `authError` is set (identity failure).

---

### Step 1: Identity (create guest token)

| Result | Status / condition | What we do | Screen user sees |
|--------|--------------------|------------|-------------------|
| **Success** | 200, `guestToken` + `id` in response | Save guest token and identity id; set status **guest**. | **LoginOtpScreen** — **phone input** step (enter phone to get OTP). |
| **Failure 4xx** | 400, 401, 404, or any non-5xx error | Set `authError = "Failed to prepare login"`. Do **not** set `sessionExpired`. Status stays unauthenticated; identity ref reset so retry can run. | **LoginOtpScreen** shows **SessionExpiredScreen** with message “Failed to prepare login” and button **“Sign in again”** (calls `ensureGuestToken()` then replaces to LoginOtp). |
| **Failure 5xx / network** | 500, 503, timeout, CORS, fetch failure, or HTML body | Call `showServerUnavailable()`, throw `ServerUnavailableError`. Do **not** logout; do **not** set authError. | **Server Unavailable** (global **GlobalErrorScreen** overlay). User can tap **Retry** → `retryGuestIdentity()` → identity runs again. |

---

### Step 2: Send OTP (user entered phone, tapped send)

| Result | Status / condition | What we do | Screen user sees |
|--------|--------------------|------------|-------------------|
| **Success** | 200 | Move to OTP step; show “Enter OTP” (and resend cooldown). | **LoginOtpScreen** — **OTP input** step (or **OTPVerificationScreen** if app uses separate OTP screen). |
| **401** | Unauthorized (e.g. invalid/expired guest) | `auth.logout()` → set `sessionExpired`, clear tokens. **SessionExpiredHandler** (if mounted) resets to LoginOtp with message. | **LoginOtpScreen** with **SessionExpiredScreen**: “Your session expired. Please request OTP again.” + “Sign in again”. |
| **403** | Forbidden (e.g. “Due to your default role, you do not have access to this application”) | `auth.setAccessDenied(message)` → set `accessDenied` + `accessDeniedMessage`, clear tokens. **Do not** set sessionExpired. Navigate to LoginOtp (if not already). | **LoginOtpScreen** shows **AccessDeniedScreen**: “Access denied” + backend message + “Back to login”. |
| **5xx / network** | 500, 503, timeout, HTML, fetch failure | `showServerUnavailable()`, throw. No logout. | **Server Unavailable** overlay. Retry → user can try send OTP again. |
| **400 or other 4xx** | Invalid phone, rate limit, etc. | Show error message on same screen. | **LoginOtpScreen** — same step with **inline error** (e.g. “Something went wrong. Please try again.”). |

---

### Step 3: Verify OTP (user entered 6 digits)

| Result | Status / condition | What we do | Screen user sees |
|--------|--------------------|------------|-------------------|
| **Success** | 200, tokens + user (with `defaultRole`, `defaultHub`) | `auth.setTokensAfterVerify(data)`. Navigate by role/hub: no allowed role → **NoRoleBlock**; no hub → **NoHubBlock**; else → **VisitorType**. | **NoRoleBlockScreen** / **NoHubBlockScreen** / **VisitorTypeScreen**. |
| **401** | Unauthorized (e.g. expired guest, invalid session) | `auth.logout()` → sessionExpired. Navigate to LoginOtp with “Your session expired. Please request OTP again.” | **LoginOtpScreen** with **SessionExpiredScreen**: “Your session expired. Please request OTP again.” + “Sign in again”. |
| **403** | Forbidden (e.g. “Due to your default role, you do not have access to this application”) | `auth.setAccessDenied(message)` → accessDenied + message, clear tokens. Navigate to LoginOtp. | **LoginOtpScreen** shows **AccessDeniedScreen**: “Access denied” + backend message + “Back to login”. |
| **5xx / network** | 500, 503, timeout, HTML, fetch failure | `showServerUnavailable()`, throw. No logout. | **Server Unavailable** overlay. Retry → user can try verify again. |
| **400 or other (e.g. wrong OTP)** | Invalid OTP, expired OTP, etc. | Show error on same screen; clear OTP boxes / allow re-enter. | **LoginOtpScreen** (OTP step) or **OTPVerificationScreen** with **inline error** (e.g. “Incorrect OTP, please try again.”). |

---

### Step 4: After successful verify — where we go

- **No allowed role** (`defaultRole` not guard/hub_manager) → **NoRoleBlockScreen**.
- **No hub** (`defaultHub` missing) → **NoHubBlockScreen**.
- **Has allowed role and hub** → **VisitorTypeScreen** (main app).

Guest token is cleared after verify; only access + refresh tokens are used for API calls.

---

## 3. Logout flow

| Trigger | What we do | Screen user sees |
|--------|------------|-------------------|
| **Voluntary logout** (e.g. user taps Logout on **ProfileScreen**) | `auth.logoutToLoginScreen()`: clear tokens, user, role, hub from state and storage; set status **unauthenticated**. Do **not** set `sessionExpired` or `accessDenied`. | **LoginOtpScreen** — **phone input** (no “session expired” or “access denied” message). User can enter phone and request OTP again. |
| **Involuntary logout** (401 from any API, or refresh failed with 401) | `auth.logout()` (via `notifyUnauthorized()` from requestClient or refresh failure): clear tokens/user/role/hub; set **sessionExpired** and authError “Your session expired. Please sign in again.” **SessionExpiredHandler** (if mounted) resets stack to **LoginOtp** with session-expired message. | **LoginOtpScreen** with **SessionExpiredScreen**: “Your session expired. Please sign in again.” + “Sign in again” (gets new guest token and stays on login). |

---

## 4. Token refresh flow

- **Tokens**: Guest (identity + send OTP + verify OTP only), Access (authenticated APIs), Refresh (used only to get a new access token).
- **client/api/requestClient.ts**: On **401**, if the response body indicates **TOKEN_EXPIRED**, the client calls the refresh handler (registered by **AuthContext**) once, then retries the request once with the new access token.
- **AuthContext** registers the refresh handler. Refresh uses **auth.ts** `refreshToken()`. If refresh fails (e.g. 401), AuthContext runs logout → sessionExpired → SessionExpiredHandler sends user to LoginOtp. If refresh throws **ServerUnavailableError**, requestClient shows Server Unavailable and does **not** logout.
- Only one refresh runs at a time (single-flight); concurrent 401s share the same refresh promise.

---

## 5. Error handling summary (login flow only)

| Status / condition | Meaning in login flow | Action | Screen |
|--------------------|------------------------|--------|--------|
| **200** | Identity / send OTP / verify OTP success | Save tokens or move to next step; after verify, navigate by role/hub. | Next step or NoRoleBlock / NoHubBlock / VisitorType |
| **400** | Bad request (invalid phone, wrong OTP, etc.) | Show error message on same screen. | Same screen, inline error |
| **401** | Unauthorized (invalid/expired guest or session) | Logout, set sessionExpired. | LoginOtp + SessionExpiredScreen |
| **403** | Forbidden (role has no access to app) | setAccessDenied(message), clear tokens. | LoginOtp + AccessDeniedScreen |
| **404** | Not found (e.g. identity endpoint) | Treated like other 4xx in identity → authError “Failed to prepare login”. | LoginOtp + SessionExpiredScreen (“Sign in again”) |
| **5xx / network / HTML** | Server error or unreachable | showServerUnavailable(), no logout. | Server Unavailable overlay |

---

## 6. Where auth and token rules live (single source of truth)

| What | File |
|------|------|
| Refresh on 401 only when backend says “token expired” | **client/api/requestClient.ts** — 401 body checked for TOKEN_EXPIRED; single place. |
| 401 → refresh once + retry, then 401 → logout | **client/api/requestClient.ts** — `requestWithAuthRetry`. |
| Refresh handler + logout on unauthorized | **client/contexts/AuthContext.tsx** — `refreshAccessToken`, `handleUnauthorized`; `getRefreshHandler` / `notifyUnauthorized` used by requestClient. |
| 403 in login/OTP → access denied (not session expired) | **client/contexts/AuthContext.tsx** — `setAccessDenied`, `accessDenied`, `accessDeniedMessage`. **LoginOtpScreen** / **OTPVerificationScreen** — on 403 call `setAccessDenied`, then show **AccessDeniedScreen** on LoginOtp. |
| OTP/login/identity errors → logout or authError | **client/contexts/AuthContext.tsx** (e.g. `ensureGuestToken`, `isTokenVersionMismatch`); **client/lib/auth.ts** for API only (no logout, no storage). |
| Server unavailable (5xx / network) | **client/lib/server-unavailable.ts** — `showServerUnavailable()`. **auth.ts** and **requestClient.ts** call it then throw; **ServerUnavailableContext** shows **GlobalErrorScreen**. |

---

## 7. Screen and role handling

- **Roles**: `guard` | `hub_manager` (backend may send `hm`; normalized to `hub_manager`).
- **No role checks inside screens.** Role only decides which screens are registered in **RootStackNavigator** (`getScreensForRole(allowedRole)`) and which actions are allowed via **usePermissions()**.
- **client/permissions/rolePermissions.ts**: `COMMON_SCREENS` (LoginOtp, OTPVerification, NoRoleBlock, NoHubBlock), `GUARD_SCREENS`, `HM_SCREENS`, and action permissions.
- **Add a new screen**: Add to `RootScreenName` and the right `*_SCREENS` in **rolePermissions.ts**, then add to **RootStackNavigator** `SCREEN_CONFIG` and (if back button needed) `SCREENS_WITH_BACK`.

---

## 8. Folder structure (client)

- **api/** — **requestClient.ts**: access token, 401 TOKEN_EXPIRED → refresh once and retry, final 401 → notifyUnauthorized(), 5xx/network → showServerUnavailable().
- **apis/** — Backend calls (ticket.api, driver.api, etc.) using `requestWithAuthRetry` only.
- **contexts/** — AuthContext (auth state, tokens, logout, setAccessDenied, refresh), UserContext, ThemeContext, ServerUnavailableContext.
- **lib/** — storage, **auth.ts** (identity, send OTP, verify OTP, refresh), api-url, hub-bridge, api-error, server-unavailable, api-endpoints.
- **navigation/** — **RootStackNavigator** (role-based screen list).
- **permissions/** — rolePermissions.ts, usePermissions.
- **screens/** — LoginOtpScreen, OTPVerificationScreen, NoRoleBlock, NoHubBlock, VisitorType, Profile, etc.
- **components/** — SessionExpiredScreen, **AccessDeniedScreen**, GlobalErrorScreen, ErrorBoundary, etc.

---

## 9. Quick reference

- **Env**: Set `EXPO_PUBLIC_API_URL` to your backend base URL (no trailing slash).
- **Entry point**: `client/index.js` → `App.tsx`.
- **Auth (login flow)**: Identity → guest token → Send OTP → Verify OTP → setTokensAfterVerify → NoRoleBlock / NoHubBlock / VisitorType. 401 → SessionExpiredScreen; 403 → AccessDeniedScreen; 5xx/network → Server Unavailable.
- **Logout**: Voluntary → logoutToLoginScreen → LoginOtp (phone form). Involuntary (401) → logout → sessionExpired → SessionExpiredHandler → LoginOtp + SessionExpiredScreen.
- **Auth files**: `client/lib/storage.ts`, `client/lib/auth.ts`, `client/api/requestClient.ts`, `client/contexts/AuthContext.tsx`. More detail: `client/docs/AUTH_README.md`, `client/docs/AUTH_TOKEN_LIFECYCLE.md`.

A boring, obvious, lightweight codebase is a good codebase. Prefer deletion over abstraction and explicit logic over magic.
