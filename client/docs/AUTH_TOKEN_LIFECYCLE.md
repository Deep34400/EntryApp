# Auth & Token Lifecycle — Hardened (Production)

This doc describes the **source of truth** for tokens, the **golden rule**, and where errors occur and how they are handled. No rewrite; reuses existing AuthContext, API client, and navigation.

---

## Where to change when backend adds a new code or message

| Goal                                                               | Where to change                                                                                              | What to do                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Refresh** (new access token, retry request once)                 | `client/lib/auth-error-codes.ts`                                                                             | Add the backend `errorCode` / `code` to `REFRESH_ON_401_CODES`.                                                                                                   |
| **Logout** (clear session, redirect to Login)                      | Happens automatically for any 401 that does **not** trigger refresh. To force logout for specific codes only | Optionally add codes to `LOGOUT_ON_401_CODES` in `auth-error-codes.ts` and use `isLogoutOnly401Code()` in `requestClient.ts` 401 block if needed.                 |
| **Guest/OTP logout** (logout + new identity + “request OTP again”) | `client/lib/auth-api.ts`                                                                                     | Add code to `isInvalidGuestSessionError()` or new constants (`ERROR_CODE_*`), or add message pattern in the `msg` checks.                                         |
| **Refresh API failure** (logout, no retry)                         | `client/contexts/AuthContext.tsx`                                                                            | Already: any error in `refreshAccessToken` catch → logout. To treat a specific backend code differently, add a check in that catch (e.g. if code === "X" then …). |
| **Notify “session invalid” from API client**                       | `client/api/requestClient.ts`                                                                                | 401 block: we call `notifyUnauthorized()` before throwing. To add code/message checks before that, parse `res` body and use `auth-error-codes.ts` helpers.        |

---

## 1. Token Types (Source of Truth)

| Token       | Use only for                       | Lifetime  | Sent with normal APIs? |
| ----------- | ---------------------------------- | --------- | ---------------------- |
| **Guest**   | Identity, Send OTP, Verify OTP     | Short     | No                     |
| **Access**  | All authenticated APIs             | Short/med | Yes (Bearer)           |
| **Refresh** | Generating a new access token only | Long      | No                     |

---

## 2. Golden Rule (Non-Negotiable)

- **Access token expired** → refresh **once** (only if backend explicitly says so).
- **Refresh token expired / refresh fails** → **logout**.
- **Guest token error** (OTP / login / identity) → **logout + new identity**.
- **Anything unclear** (e.g. generic 401) → **logout** (fail-safe).

There are **no** infinite retry or refresh cycles.

---

## 3. Access Token Expiry (Where Errors Occur)

**File:** `client/api/requestClient.ts`

- **Refresh is allowed only when all are true:**
  1. Request is a **normal authenticated API** (not Identity, Send OTP, Verify OTP, Refresh).
  2. HTTP status is **401**.
  3. Response body has an **explicit** access-token-expiry signal: `errorCode: "TOKEN_EXPIRED"` (or top-level `code: "TOKEN_EXPIRED"`).

- **Example that DOES trigger refresh:**  
  `{ "statusCode": 401, "errorCode": "TOKEN_EXPIRED" }`

- **Example that MUST NOT trigger refresh:**  
  `{ "statusCode": 401, "message": { "message": "Unauthorized", "statusCode": 401 } }`  
  → Treated as invalid session: **no refresh**, throw → caller/logout path.

- **Implementation:**
  - `isAuthApi(route)` excludes Identity, OTP, Verify OTP, Refresh. For these, on 401 we **throw immediately** (no body check, no refresh).
  - `is401TokenExpired(res)` returns `true` **only** when `body.errorCode === "TOKEN_EXPIRED"` or `body.code === "TOKEN_EXPIRED"`. No regex, no message parsing.
  - Single-flight refresh: one refresh in flight; retry original request **once**. If retry still 401 → throw → session expired path.

**Where errors occur:** Any authenticated API (e.g. entry-app list, counts, detail) can return 401.  
**Handling:** If `TOKEN_EXPIRED` → refresh once → retry once → success or throw. If generic 401 → throw → no refresh → session expired / logout.

---

## 4. Refresh Token Flow (Where Errors Occur)

**Files:** `client/contexts/AuthContext.tsx`, `client/lib/auth-bridge.ts`, `client/api/requestClient.ts`

- When refresh **is** allowed (see above), the app runs **one** refresh request (single-flight via `refreshPromise` / `refreshInFlightRef`).
- **On any refresh failure** (401, token version mismatch, timeout, network, invalid response):
  - AuthContext: clear all tokens, clear hub, set `sessionExpired`, set `authError`, `persist(clearedStored(...))`, return `null`.
  - **No** second refresh attempt, **no** rethrow from refresh handler.
- Request client: if `tryRefreshToken()` returns `null`, it does not retry; original 401 remains → throw `UNAUTHORIZED_MSG` → session-expired path.

**Where errors occur:** Inside `refreshTokens()` in `auth-api.ts` (network, 401, 4xx/5xx, or parse failure).  
**Handling:** Single catch in `refreshAccessToken`: **any** error → clear session, set sessionExpired, return null → logout and redirect to Login.

---

## 5. OTP / Login / Guest Token APIs (Hard Stop)

**Files:** `client/lib/auth-api.ts`, `client/api/requestClient.ts`, `client/screens/LoginOtpScreen.tsx`, `client/screens/OTPVerificationScreen.tsx`

- These APIs are **never** passed through the auth-retry client:
  - Identity, Send OTP, Verify OTP, Refresh are called via **direct `fetch`** in `auth-api.ts`.
- In `requestClient.ts`, routes that match `isAuthApi(route)` (Identity, OTP, Verify OTP, Refresh) on 401 → **immediate throw**; no refresh, no retry, no interceptor replay.

**Where errors occur:**

- Identity: `fetchIdentity()` — network, 4xx/5xx, invalid body.
- Send OTP: `sendOtp()` — 401, invalid guest, network.
- Verify OTP: `verifyOtp()` — 401, wrong OTP, invalid guest, network.

**Handling:**

- LoginOtpScreen (send OTP / verify OTP): on error → `auth.logout()`, set step/error to "Your session expired. Please request OTP again."
- OTPVerificationScreen (verify / resend): on error → `auth.logout()`, `navigation.replace("LoginOtp", { message: "Your session expired. Please request OTP again." })`
- No auto retry, no refresh, no loops. After logout, the AuthContext effect (no tokens) runs and calls Identity to get a **new guest token** for the next OTP attempt.

---

## 6. Guest Token Error Handling (Login Short-Circuit)

- For OTP / login APIs, any error (401, UNAUTHORIZED, token version mismatch, network) is treated as **invalid guest session**.
- **Action:** Logout immediately → clear guest, access, refresh tokens; clear role & hub → Identity API is triggered by the “no tokens” effect → redirect to Login (already on LoginOtp or replaced there) with message: **"Your session expired. Please request OTP again."**
- Implemented in: LoginOtpScreen, OTPVerificationScreen (catch blocks above); AuthContext `logout` and `clearedStored`; AuthContext effect that fetches Identity when there are no tokens.

---

## 7. Logout (Complete)

**File:** `client/contexts/AuthContext.tsx`

- `logout()` (and `clearAuth()`):
  - Clears **all** tokens: guest, access, refresh (via `clearedStored(stored.identityId)`).
  - Clears auth state (user, roles, selectedHubId in stored).
  - Clears hub globally: `setHubId(null)`.
  - Sets `isGuestReady(false)` so the “no tokens” effect can run.
- Callers (ProfileScreen, NoRoleBlockScreen, NoHubBlockScreen, VisitorPurposeScreen, etc.) then reset/replace navigation to **LoginOtp** as needed.
- After logout, the app naturally hits the “no tokens” logic → Identity API → new guest token for the next OTP attempt.

---

## 8. Session Expired (Refresh Failed) Redirect

**File:** `client/components/SessionExpiredHandler.tsx`

- When `sessionExpired` is set (refresh failed or token version mismatch):
  - Reset navigation stack to **LoginOtp** with **params:** `{ message: "Your session expired. Please request OTP again." }`.
  - Clear the session-expired flag.
- LoginOtpScreen shows `route.params?.message ?? sessionExpiredMessage` so the user sees the correct message.

---

## 9. Fail-Safe Behavior

- **401 without explicit `TOKEN_EXPIRED`** → no refresh → throw → session invalid → logout path.
- **Unexpected auth error / conflicting token state** → no “guess” or silent fix; clear session → logout → new Identity → Login.
- Implemented in: `requestClient.ts` (strict `is401TokenExpired`; auth APIs 401 → immediate throw); AuthContext (any refresh failure → clear and sessionExpired).

---

## 10. Final Validation Checklist

- Access token expiry does **not** cause refresh loops (single refresh, one retry).
- Generic 401 does **not** trigger refresh (only `errorCode`/`code === "TOKEN_EXPIRED"`).
- OTP/Identity/Refresh APIs never enter refresh logic (excluded in `requestClient`, called via direct fetch in auth-api).
- Refresh token expiry / refresh failure does **not** loop (any error → logout, return null, no retry).
- Access token expiry → refresh once → success or logout.
- Refresh expiry / failure → logout.
- Guest token error (OTP/login) → logout + new identity + message on Login.
- App is safe for production under these rules.

**One-line rule:** Refresh only when the backend explicitly says `TOKEN_EXPIRED`. Otherwise, logout and restart clean.
