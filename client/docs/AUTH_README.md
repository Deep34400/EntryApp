# Authentication system

Simplified, production-ready auth: five core files, linear flows, no bridges or retry triggers. Boring and debuggable.

---

## File structure (who owns what)

| File | Responsibility |
|------|----------------|
| **client/lib/storage.ts** | **Only** `loadAuth()`, `saveAuth()`, `clearAuth()`. Types: `StoredAuth`, `defaultStored`, `clearedStored()`. No API, no React, no state. |
| **client/lib/auth.ts** | **Only** API: `fetchIdentity()`, `sendOtp()`, `verifyOtp()`, `refreshToken()`. 5xx / HTML / CORS / fetch failure → `showServerUnavailable()` then throw `ServerUnavailableError`. Never logout, never touch storage. |
| **client/api/requestClient.ts** | **Only** inject access token; on 401 with body `TOKEN_EXPIRED` → call refresh, retry original request once; still 401 → throw `UnauthorizedError`. 5xx/network → throw `ServerUnavailableError`. Single-flight refresh. Never logout, never clear storage. |
| **client/contexts/AuthContext.tsx** | State machine: `status` = `"loading"` \| `"guest"` \| `"authenticated"` \| `"unauthenticated"`. Loads from storage; runs identity once when no access/refresh/guest; registers refresh + unauthorized handlers for requestClient. Logout: clear storage → unauthenticated → fetch new guest → guest. |
| **client/contexts/ServerUnavailableContext.tsx** | Shows global Server Unavailable screen when `showServerUnavailable()` is called. Retry: hide screen and call `retryGuestIdentity()`. |

Supporting (non-auth-owned):

- **client/lib/api-url.ts** — `getApiUrl()` (base URL from env).
- **client/lib/server-unavailable.ts** — `isServerUnavailableError(e)`, `ServerUnavailableError`, `showServerUnavailable()`, `setServerUnavailableHandler()`. Provider sets handler; auth/requestClient call `showServerUnavailable()` before throwing.

---

## App startup flow

1. **AuthContext** mounts → runs one effect that calls **storage** `loadAuth()`.
2. If **access + refresh** exist → `status = "authenticated"`.
3. Else if **guest** token exists → `status = "guest"`.
4. Else → `status = "unauthenticated"` and the **identity effect** runs (see below).

No loops: identity runs only when there are no tokens; after it saves a guest, the condition is false so it does not run again.

---

## Identity flow (when it runs)

- **When**: Only when there is **no** access token, **no** refresh token, and **no** guest token (and storage has been restored).
- **How**: **AuthContext** has one `useEffect` that checks `needsGuest = !hasAccess && !hasRefresh && !hasGuest`. If true and `!identityStartedRef.current`, it sets the ref, calls **auth** `fetchIdentity()` once, then on success **storage** `saveAuth(guest)` and `status = "guest"`. On server error it resets the ref so Retry can call `retryGuestIdentity()` (one-off) without the effect re-firing.
- **Why no infinite loop**: After a successful identity, we have a guest token, so `needsGuest` is false and the effect does not run again. The ref ensures we only start one identity in flight for that “no tokens” state. No retry triggers or flags: one guarded run per “empty” state.

---

## Login flow

1. User enters phone → **auth** `sendOtp(phone, guestToken)`.
2. User enters OTP → **auth** `verifyOtp(phone, otp, guestToken)` → returns accessToken, refreshToken, user, etc.
3. **AuthContext.setTokensAfterVerify(data)** → **storage** `saveAuth()` with tokens and user; `status = "authenticated"`; hub id set in hub-bridge.

---

## Refresh flow

- **Only inside requestClient**: when an authenticated (non-auth) API returns **401** and the response body contains **TOKEN_EXPIRED**, requestClient calls the refresh handler registered by **AuthContext** (`getRefreshHandler()`).
- **AuthContext**’s handler runs **auth** `refreshToken(refreshToken)` once (single-flight: concurrent 401s share the same promise). Success → **storage** `saveAuth()` with new tokens; requestClient retries the original request once.
- If refresh fails (e.g. 401/invalid) → handler calls **AuthContext** logout (not requestClient). If refresh throws **ServerUnavailableError** → rethrown; requestClient shows Server Unavailable and does **not** logout.
- Still 401 after retry → requestClient calls `notifyUnauthorized()` → **AuthContext** runs logout.

---

## Logout flow

1. Triggered by: user Logout, or **requestClient** calling `notifyUnauthorized()` (401 that wasn’t TOKEN_EXPIRED, or 401 after failed refresh), or token version mismatch in ensureGuestToken.
2. **AuthContext.logout()**: **storage** `clearAuth(identityId)`; set `status = "unauthenticated"`, `sessionExpired = true`; clear hub; reset identity ref.
3. **Immediately** call **auth** `fetchIdentity()` once (no tokens) → save new guest → `status = "guest"`. User can request OTP again.
4. **SessionExpiredHandler** (when `sessionExpired && !serverUnavailable`) resets nav to LoginOtp and clears the flag.

**Server errors (5xx, HTML, CORS, fetch failure) never trigger logout.** They only show the Server Unavailable screen.

---

## When identity runs (summary)

- **Startup**: No access, no refresh, no guest → one `fetchIdentity()` → save guest → `status = "guest"`.
- **After logout**: Logout clears storage and sets unauthenticated; then one `fetchIdentity()` → save guest → `status = "guest"`.
- **Retry (Server Unavailable)**: User taps Retry → `retryGuestIdentity()` runs one `fetchIdentity()` (ref was reset on server error). No effect loop.

Identity is **never** called in a loop: it runs only when there are no tokens, and a ref ensures a single in-flight run for that state; after success we have a guest token so the condition is false.

---

## Quick reference

- **Add an auth API**: implement in **auth.ts**; keep 5xx/HTML/CORS/fetch → `showServerUnavailable()` and throw `ServerUnavailableError`.
- **Change what triggers refresh**: in **requestClient.ts**, 401 body is checked for `TOKEN_EXPIRED` only; no separate error-codes file.
- **Change logout behaviour**: **AuthContext** `logout` and the handler passed to `registerUnauthorizedHandler`; **storage** `clearAuth`.
- **Env**: `EXPO_PUBLIC_API_URL` (no trailing slash).
