# Auth Implementation Audit

This document describes the token-based authentication flow and confirms it is **production-safe**.

## Overview

- **Access token**: Short-lived; used only in `Authorization: Bearer` for API calls. Backend controls TTL.
- **Refresh token**: Long-lived; used only to call the refresh endpoint. Stored in AsyncStorage and in memory (AuthContext).
- **Guest token**: Used only for pre-login flows (identity, send OTP, verify OTP). Cleared on login.

No access or refresh token is sent to endpoints other than their intended use (API vs refresh).

---

## Checklist

| Requirement | Status | How it's implemented |
|------------|--------|----------------------|
| Access token short-lived | ✅ | Backend-defined. App uses it only for API calls; when it expires, API returns 401 and we refresh. |
| Refresh token handled securely | ✅ | Stored in AsyncStorage under a single key; sent only to the refresh endpoint (body + `Authorization: Bearer`). Never sent with normal API requests. |
| No infinite refresh loop | ✅ | On 401 we refresh **once**, then retry the **original request once**. If that retry returns 401, we throw and treat as session expired (no second refresh). |
| Only one refresh at a time (queue) | ✅ | **AuthContext**: `refreshInFlightRef` ensures a single in-flight refresh. **query-client** / **api/requestClient**: `refreshPromise` (or equivalent) ensures all concurrent 401s share the same refresh promise and wait for it. |
| Original request retried after refresh | ✅ | `apiRequestWithAuthRetry` and `requestClient.request()` do: (1) request with current token, (2) on 401 call refresh, (3) retry **same request** once with new token. |
| Refresh failure → redirect + clear auth | ✅ | On 401 or token-version mismatch in refresh: auth state is cleared (tokens and user removed from memory and from AsyncStorage under the auth key), `setSessionExpired(true)`. **SessionExpiredHandler** resets navigation to **WhoAreYou**. Effect in AuthContext fetches a new guest token so user can log in again. Only the auth storage key is cleared, not the entire AsyncStorage, to avoid wiping other app data. |

---

## Flow Summary

1. **App start**  
   - Load auth from AsyncStorage.  
   - If refresh token exists: restore state, set `isGuestReady(true)`. **No refresh on startup** (avoids unnecessary 401 on cold start).  
   - If only guest token: validate with identity API.  
   - If no tokens: fetch new guest token (identity).

2. **Authenticated API call**  
   - Request is sent with `Authorization: Bearer <accessToken>`.  
   - If response is **401**:  
     - Trigger **single** refresh (all concurrent 401s wait on the same refresh promise).  
     - On success: retry **original** request with new access token.  
     - On failure (401 or token version mismatch): clear auth, set `sessionExpired`, redirect to WhoAreYou, then fetch new guest token.

3. **Manual logout**  
   - `logout()` / `clearAuth()`: clear tokens and user, persist cleared state.  
   - No refresh is called. Next navigation/auth checks show user as logged out; guest flow can run if needed.

4. **Reopen after token expiry**  
   - Stale access token is still in storage; refresh token may still be valid.  
   - First API call gets 401 → refresh runs → new tokens stored and request retried.  
   - If refresh fails → session expired flow (clear, redirect, new guest).

---

## Global Auth API (AuthContext)

- **State**: `accessToken`, `refreshToken` (internal), `user`, `isRestored`, `isGuestReady`, `sessionExpired`, `authError`
- **Derived**: `isAuthenticated` = `!!(accessToken && user)`
- **Actions**:  
  - `setTokensAfterVerify(data)` — after OTP verify (login).  
  - `logout()` — clear auth and storage (alias: `clearAuth()`).  
  - `setAccessToken(token)` — update access token and persist (e.g. after refresh; refresh flow already does this internally).  
  - `ensureGuestToken()` — ensure guest token for pre-login.  
  - `clearSessionExpiredFlag()` — after redirecting to login.

---

## Files

- **Auth**: `contexts/AuthContext.tsx` — state, persistence, refresh implementation, guest flow.  
- **Bridge**: `lib/auth-bridge.ts` — allows non-React code (API client) to trigger refresh.  
- **API**: `lib/query-client.ts` and `api/requestClient.ts` — authenticated fetch with 401 → refresh → retry and single-flight refresh.  
- **Session expiry**: `components/SessionExpiredHandler.tsx` — on `sessionExpired`, resets stack to WhoAreYou.

---

## Note on Axios

The app uses **fetch** with an interceptor-style pattern (request → 401 → refresh → retry) in `api/requestClient.ts` and `lib/query-client.ts`. Behavior matches what you’d expect from an axios instance with response interceptors. Axios is not required for production-safe token handling; the same guarantees are achieved with the current fetch-based client.
