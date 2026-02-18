# guard Mobile App

A React Native (Expo) app for entry and exit management at facilities. It is used by **guards** and **Hub Managers (HM)** to handle visitor entry, tokens, tickets, and gate operations.

---

## 1. Project Overview

### What is the guard App?

The guard App is a mobile application that lets authorized staff:

- Record and manage visitor entry and exit
- Issue and verify entry tokens
- View and manage tickets (open/closed)
- Perform gate operations and basic reporting

### Who uses it?

- **guard** — Staff who operate the gate, create entries, display tokens, and manage day-to-day visitor flow.
- **Hub Manager (HM)** — Staff with monitoring and approval capabilities; may have read-only or higher-level access.

### What problems it solves

- Replaces paper or ad-hoc processes with a single app for entry/exit.
- Ensures only allowed roles (guard, HM) can use the app.
- Keeps each user scoped to their assigned hub(s).
- Handles token expiry and session security without confusing the user.

---

## 2. High-Level App Flow

### When the app starts

1. App loads and renders **navigation** (login or main app) immediately.
2. **No** backend health check is run on startup (no extra API call). The backend is only called when the user performs an action (e.g. Identity, Send OTP, list tickets).

### Before login

1. **Auth state** is restored from storage (AsyncStorage).
2. If there are **no access/refresh tokens** and **no guest token** → app calls **Identity API** to get a **new guest token** and stores it.
3. When **guest token is ready** → **Login screen** is shown.

### During login

1. User enters **phone number** → taps to request OTP.
2. App calls **Send OTP** API with **guest token** only (no access token).
3. User enters **OTP** → app calls **Verify OTP** API with **guest token**.
4. Backend returns **user**, **accessToken**, **refreshToken**, and optionally **roles** and **hubs**.
5. App stores tokens and user; extracts **roles** (array) and **hub at index 0**; sets **hub** globally for API headers.

### After login

1. **Role check (root level):**
   - No allowed role (guard/hm) → **NoRoleBlock** screen (Access denied; Logout).
   - Allowed role but **no hub** → **NoHubBlock** screen (“No hub is assigned…”; Logout).
   - Allowed role **and** hub → continue to main app.
2. Main app opens at **VisitorType** (home). **Only screens allowed for the user’s role are registered** in the root stack (guard vs HM have different screen sets); navigation enforces access by **which screens exist**, not by checks inside screens.

---

## 3. App Start (No Health Check)

The app **must not** show the login screen until it knows the backend is reachable. Otherwise the user would tap “Send OTP” and see network errors with no clear path.

### What the gate does

- **Internet check:** A failed request (e.g. network error, timeout) is treated as **offline**.
- **Backend health check:** A single GET request to the backend base URL (or health endpoint).
  - **503** → backend is in **maintenance** → show Maintenance screen.
  - **500** or **timeout** → show **Server error** screen.
  - **2xx or 4xx (other than 503)** → backend is considered **up** → gate passes.
- **Login screen is blocked** until the gate passes. No login UI is shown when offline or in maintenance.

### Global Offline / Maintenance behavior

- **One reusable screen** (e.g. GlobalErrorScreen) is used for:
  - **Offline** — “You’re offline. Check your connection and try again.”
  - **Maintenance (503)** — “Under maintenance. Try again in a few minutes.”
  - **Server error** — “Something went wrong. Try again.”
- **Single primary action:** **Retry** (re-runs the gate check).
- **No raw backend errors** are shown. Messages are user-friendly and non-technical.

---

## 4. Authentication Flow

### 4.1 Identity & Guest Token

| Aspect             | Description                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is it?**    | A **guest token** is an anonymous token used only for the **pre-login** steps: Identity, Send OTP, and Verify OTP.                                                                                                                                                        |
| **When created?**  | When the app has **no** access token, no refresh token, and no guest token, the app calls the **Identity API** (with empty or existing guest token). The backend returns a new **guestToken** and an **identity id**.                                                     |
| **Where used?**    | **Only** in: Identity API, Send OTP, and Verify OTP. It is **never** sent with normal authenticated API calls.                                                                                                                                                            |
| **Why temporary?** | After successful OTP verify, the app stores **access** and **refresh** tokens and no longer needs the guest token for that session. If login fails or user logs out, the guest token is cleared and a **new** one is obtained via Identity before the next login attempt. |

**Rule:** Access token and refresh token are used **only after** OTP verify. Guest token is **never** used for general API calls.

### 4.2 OTP Login

**Send OTP**

- Input: phone number, **guest token** (in `Authorization: Bearer <guestToken>`).
- Backend sends OTP to the phone.
- No access or refresh token is involved.

**Verify OTP**

- Input: phone number, OTP code, **guest token** (in `Authorization: Bearer <guestToken>`).
- Backend returns (conceptually):
  - **user** (id, name, contacts, **roles**, **hubs**)
  - **accessToken**
  - **refreshToken**
  - optional identity info

**What the app does with this data**

- Stores **accessToken** and **refreshToken** (and user).
- Extracts **roles** from `user.roles[].name` or `user.userRoles[].role.name` (normalized to lowercase; **hm** is treated as **hub_manager**).
- Picks **hub** from `user.hubs[0]` or `user.userHubs[0]` and stores it as **selectedHubId**.
- Uses **roles** and **hub** for root-level navigation (allow/block, NoRoleBlock, NoHubBlock, or main app) and for **which screens are registered** (see Role handling).

---

## 5. Token Management

### Access token

- **Purpose:** Authorizes **all** authenticated API calls (entry, tickets, counts, etc.).
- **Lifetime:** Short-lived (e.g. ~2 hours; defined by backend).
- **Storage:** In memory and in AsyncStorage under a single auth key.
- **Usage:** Sent as `Authorization: Bearer <accessToken>` on every authenticated request. **Hub** is sent when set: in request payload/query as **hubId** and **hub_id** (and optionally in headers as **x-hub-id** if the client is configured for it).

### Refresh token

- **Purpose:** Used **only** to get a new access token (and optionally a new refresh token) when the **access** token has expired.
- **Lifetime:** Longer (e.g. ~5 days; defined by backend).
- **Storage:** Same auth storage as access token; **never** sent with normal API calls.
- **Usage:** Sent **only** to the **refresh** endpoint (in body and/or header as required by backend).

### Where tokens are stored

- **Single key** in AsyncStorage (e.g. `@entry_app_auth`) holds: guestToken, identityId, accessToken, refreshToken, tokenVersion, user, roles, selectedHubId.
- **Logout** clears this key (and clears hub in the hub-bridge). **Session expired** (refresh failed) also clears it and then the app fetches a new guest token via Identity before showing login again.

### How tokens are attached to APIs

- **Authenticated requests** go through a central client (`client/api/requestClient.ts`) that:
  - Adds `Authorization: Bearer <accessToken>`.
  - Injects **selectedHubId** into every request: for GET as query params **hubId** and **hub_id**; for POST/PUT/PATCH as body fields **hubId** and **hub_id** (from the global hub bridge).
- **OTP/Identity/Refresh** endpoints are **not** sent through this client’s retry/refresh logic; they use direct calls and **never** trigger access-token refresh.

### Refresh logic

**When refresh _does_ happen**

- Request uses **access token**.
- Response is **401**.
- Response body indicates **token expiry** (e.g. `errorCode: "TOKEN_EXPIRED"` or similar).
- The request URL is **not** an auth/OTP/identity/refresh URL (those are excluded).

Then: the app runs **one** refresh (single-flight: concurrent 401s share the same refresh call), gets a new access token, **retries the original request once**. If the retry still returns 401, the app treats the session as expired (clear storage, redirect to login).

**When refresh does _not_ happen**

- **403** (Forbidden).
- **500**, **503** (server/maintenance errors).
- **Offline** or **timeout**.
- **401** but body does **not** indicate token expiry (e.g. invalid token).
- **401** on **OTP/login/identity/refresh** URLs — these are **hard stop**: no refresh, no retry; error is thrown so the caller (e.g. OTP flow) can do logout + new identity.

**If refresh fails**

- Refresh endpoint returns error (e.g. 401, or token version mismatch).
- App **clears** all tokens and user data, clears hub, sets a “session expired” flag.
- Navigation is reset to **Login** (e.g. LoginOtp).
- The existing “no tokens” logic then calls **Identity API** to get a **new guest token** so the user can log in again.
- **No** retry of refresh; **no** infinite loop.

### Decision table (simplified)

| Situation                                             | Refresh?       | Result                                                                       |
| ----------------------------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| 401 on normal API + body says TOKEN_EXPIRED           | Yes (once)     | Retry request with new token; if still 401 → logout.                         |
| 401 on normal API, body does not say TOKEN_EXPIRED    | No             | Throw; caller may show error or logout.                                      |
| 401 on OTP/login/identity/refresh URL                 | No (hard stop) | Throw; OTP flow does logout + identity.                                      |
| Refresh call fails (e.g. 401 / invalid refresh token) | N/A            | Logout, clear storage, redirect to login, then new guest token via Identity. |
| 403, 500, 503, offline, timeout                       | No             | No refresh; show error or offline/maintenance screen as appropriate.         |

---

## 6. Special Login Error Handling

### What happens if OTP verify fails

**Any** failure during **Send OTP** or **Verify OTP** (including network error, 401, invalid guest token, token version mismatch, or “session expired” from backend) is treated as **invalid guest session**:

1. **Immediately logout** — clear guest token, access token, refresh token, user, roles, hub (and hub bridge).
2. **Do not** retry OTP, **do not** call refresh.
3. App’s “no tokens” logic runs and calls **Identity API** to get a **new guest token**.
4. User is sent to **Login** screen (e.g. LoginOtp) with a clear message:  
   **“Your session expired. Please request OTP again.”**
5. User must **request a new OTP** from the login screen; there is **no** auto-resend after this.

### Token Version Mismatch / Invalid guest token

- If the backend responds with **Token Version Mismatch**, **Invalid guest token**, or **UNAUTHORIZED** (or similar) during OTP or login, the app treats it the same as above: **logout**, clear everything, **Identity** for a new guest token, then **Login** screen with the same message.
- **Why logout and restart login?** So the app always continues from a **fresh identity** and a **new guest token**. Retrying with the same (possibly invalid) guest token could keep failing or create confusing states.
- **Why no retry or refresh here?** OTP/login APIs are **excluded** from the access-token refresh and retry logic. For these endpoints, the only safe recovery is: new guest token via Identity, then new OTP request by the user.

---

## 7. Role Handling (Single Source of Truth)

### How roles are received

- After **Verify OTP**, the backend returns a **user** object. Roles can be:
  - `user.roles[]` — array of objects with a **name** (e.g. `{ name: "guard" }`).
  - Or `user.userRoles[]` — array of objects with `role.name` (e.g. `{ role: { name: "hm" } }`).
- The app **normalizes** all role names to **lowercase** and treats **hm** as **hub_manager** for internal use. Access is allowed if **any** role is **guard** or **hub_manager** (or **hm**).

### Single permission map

- **All** role behavior is defined in one place: **`client/permissions/rolePermissions.ts`**.
- This file defines:
  - **Which screens are visible per role** — guard gets EntryForm, VisitorPurpose, TokenDisplay, ExitConfirmation, TicketList, TicketDetail, Profile; HM gets only VisitorType, TicketList, TicketDetail, Profile (no entry creation, token display, or exit confirmation).
  - **Which actions are allowed per role** — e.g. create entry, close ticket, verify token, gate operations (guard only); view tickets (guard + HM).
- **No** role checks are done inside screens or API calls; the permission map is the **only** source of truth. Screens use the **`usePermissions()`** hook (from `client/permissions/usePermissions.ts`) only to show/hide or enable/disable **actions** (e.g. “Close Ticket” button, “Create Entry” form).

### Navigation enforcement (root level)

- The **root navigator** (`RootStackNavigator`) reads **allowedRole** from **AuthContext** and calls **`getScreensForRole(allowedRole)`**.
- **Only** the screens returned for that role are **registered** in the stack. Screens not allowed for the role are **not** registered and are **not reachable** (including via deep links).
- So: **guard** can reach EntryForm, VisitorPurpose, TokenDisplay, ExitConfirmation, TicketList, TicketDetail, Profile; **HM** cannot reach EntryForm, VisitorPurpose, TokenDisplay, ExitConfirmation — they simply do not exist in the navigator for HM.

### Guard vs HM behavior

| Capability        | Guard | HM |
| ----------------- | ----- | --- |
| Create entry      | Yes   | No |
| Token display     | Yes   | No |
| Close ticket      | Yes   | No |
| Gate operations   | Yes   | No |
| View tickets      | Yes   | Yes |
| View reports      | Yes   | Yes |
| Profile           | Yes   | Yes |

- HM never sees guard-only screens; the entry-creation form and “Close Ticket” button are hidden or disabled using the same permission map (action-level).

### If a different role is returned

- If **no** role in the array is **guard** or **hm** / **hub_manager**, the user is **not** allowed. The app shows **NoRoleBlock** (“Access denied”; Logout). They cannot reach the main app.

---

## 8. Hub Handling

### How hubs come from backend

- The **user** object from Verify OTP can contain:
  - `user.hubs[]` — e.g. `[{ id: "hub-uuid" }]`
  - Or `user.userHubs[]` — e.g. `[{ hubId: "..." }]` or `[{ hub: { id: "..." } }]`

### Why hub is an array

- A user might be linked to multiple hubs in the backend. The app uses a **single** hub per session.

### Why index 0 is selected

- The app picks the **first** hub only: **index 0** (e.g. `user.hubs[0].id` or the first `user.userHubs` entry). This value is stored as **selectedHubId** and used for the whole session until logout.

### If no hub is assigned

- If the hub array is **empty** (or missing), **selectedHubId** is not set. The app shows **NoHubBlock** with the message:  
  **“No hub is assigned to your account. Please contact support.”**  
  User can only **Logout**. They cannot use the app until a hub is assigned in the backend.

### How hub is attached to APIs

- **selectedHubId** is stored in app state and in a small **hub bridge** (`client/lib/hub-bridge.ts`) so the API client can read it.
- Every **authenticated** request through the central client (`client/api/requestClient.ts`) injects **selectedHubId**:
  - **GET:** as query parameters **hubId** and **hub_id**.
  - **POST / PUT / PATCH:** as body fields **hubId** and **hub_id** (in addition to any other body data).
- This scopes all requests to that hub. If no hub is assigned, the user is blocked by **NoHubBlock** and cannot use the app until a hub is assigned.

---

## 9. Navigation & Screens

### Root-level navigation decision

- After login (or on app open with existing session), the app decides **once** at the root:
  - Not authenticated → **Login** (LoginOtp).
  - Authenticated but **no** allowed role → **NoRoleBlock**.
  - Authenticated, allowed role, but **no** hub → **NoHubBlock**.
  - Authenticated, allowed role, **and** hub → **Main app** (VisitorType as home).

### Role-based screen registration

- The **root stack** registers **only** the screens returned by **`getScreensForRole(allowedRole)`** from `client/permissions/rolePermissions.ts`.
- **Guard** sees: LoginOtp, OTPVerification, NoRoleBlock, NoHubBlock, VisitorType, EntryForm, VisitorPurpose, TokenDisplay, ExitConfirmation, TicketList, TicketDetail, Profile.
- **HM** sees: LoginOtp, OTPVerification, NoRoleBlock, NoHubBlock, VisitorType, TicketList, TicketDetail, Profile. EntryForm, VisitorPurpose, TokenDisplay, and ExitConfirmation are **not registered** for HM, so they are not reachable (even via deep links).
- Access is enforced **by which screens exist** in the navigator, not by conditions inside screens.

### Action-level permissions (UI)

- For destructive or operational actions (e.g. Create Entry, Close Ticket), the UI uses **`usePermissions()`** so that:
  - Buttons or forms are **hidden or disabled** when the role does not allow the action.
  - The same permission map drives both navigation and UI; no scattered `if (role === 'guard')` in screens.

### Block screens

- **NoRoleBlock** — “Access denied. Your account does not have permission to use this app.” Single action: **Logout** → Login screen.
- **NoHubBlock** — “No hub is assigned to your account. Please contact support.” Single action: **Logout** → Login screen.

---

## 10. Offline & Backend Error Screens

- **Offline** — No (or lost) internet. Shown when an API fails due to network (no dedicated health check). Message: you’re offline; check connection; **Retry**.
- **Maintenance (503)** — Backend returns 503. Shown by the gate. Message: under maintenance; try again later; **Retry**.
- **Server error (500 / timeout)** — Backend error or timeout. Message: something went wrong; **Retry**.

**Retry behavior:** Retry runs the **same** check again (e.g. GET backend). If it succeeds, the app proceeds (e.g. to login or main app). No automatic infinite retry; user taps Retry.

**Why raw backend errors are never shown:** Security and UX. Users see short, clear messages. Technical details (status codes, stack traces, internal messages) stay in logs, not on screen.

---

## 11. Logout Behavior

### What triggers logout

- User taps **Logout** (e.g. on Profile, NoRoleBlock, NoHubBlock).
- **Session expired** — refresh failed (e.g. refresh token invalid or expired); app clears state and redirects to Login.
- **OTP/login error** — any Send OTP or Verify OTP failure; app logs out and shows Login with “Your session expired. Please request OTP again.”

### What data is cleared

- **All** tokens: guest, access, refresh.
- User, roles, selectedHubId.
- Hub bridge (so **x-hub-id** is no longer sent).
- Stored auth (e.g. single AsyncStorage key). Other app data (e.g. theme) can be left as-is.

### What the user sees after logout

- Navigation is reset to **Login** (e.g. LoginOtp).
- If logout was due to **OTP error**, the login screen shows: “Your session expired. Please request OTP again.”
- The app’s “no tokens” logic runs and calls **Identity API** to get a **new guest token**, so the next “Send OTP” uses a fresh token.

### Why logout is preferred over retries

- **Security:** Invalid or expired sessions are not retried with the same tokens.
- **Clarity:** One path — back to login — instead of mixed retry/refresh behavior on login.
- **No loops:** Logout + new identity + login is a single, predictable flow.

---

## 12. Common Scenarios

| Scenario                       | What happens                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **First time login**           | App loads → Login (when guest token ready) → user enters phone → Send OTP (guest token) → user enters OTP → Verify OTP → tokens + user + roles + hub stored → root checks role/hub → main app or NoRole/NoHub block. |
| **Access token expired**       | Next API call returns 401 with TOKEN_EXPIRED → app refreshes once → retries request with new token. If retry succeeds, user continues; if not, session expired → logout → Login.                     |
| **Refresh token expired**      | Refresh call fails → app clears storage, sets session expired → redirect to Login → Identity fetches new guest token → user logs in again with OTP.                                                  |
| **OTP verify failed**          | Logout → clear all tokens/role/hub → Identity fetches new guest token → redirect to Login with “Your session expired. Please request OTP again.” User requests a new OTP.                            |
| **Backend down / network error** | Any API call can fail → Server Unavailable overlay may show → user taps Retry to dismiss and try again. No health check on startup. |
| **User with unsupported role** | After verify, role list has no “guard” or “hm” → NoRoleBlock → “Access denied” → user can only Logout.                                                                                               |

---

## 13. Design Principles

- **Fail safe:** On token/session errors, the app logs out and gets a new guest token instead of retrying with bad state.
- **No infinite loops:** Refresh is single-flight and one retry; OTP/login does not retry automatically; logout always leads to a clear path (login).
- **Security first:** Guest token only for OTP; access token for APIs; refresh only for token refresh endpoint; OTP/login excluded from refresh/retry.
- **Clear UX:** One message per situation (offline, maintenance, session expired); one primary action (Retry or Logout); no raw backend errors.
- **Minimal assumptions:** Behavior is driven by backend (roles, hubs, error codes like TOKEN_EXPIRED); app only interprets and enforces rules (e.g. allowed roles, one hub at index 0).
- **Single source of truth:** Role behavior lives in one permission map; navigation and UI actions both use it. No scattered role checks.

---

## 14. Project Structure (Key Folders)

- **`client/permissions/`** — Single source of truth for role-based screens and actions. `rolePermissions.ts` defines which screens and actions each role has; `usePermissions.ts` is the hook used in screens for action-level checks (e.g. show/hide Close Ticket).
- **`client/contexts/AuthContext.tsx`** — Auth state, tokens, **allowedRole**, **selectedHubId**, logout, OTP/refresh handling.
- **`client/api/requestClient.ts`** — Central API client: auth retry (401 + TOKEN_EXPIRED), hub injection (hubId + hub_id), exclusion of OTP/identity/refresh from refresh logic.
- **`client/navigation/RootStackNavigator.tsx`** — Root stack; registers only screens from **getScreensForRole(allowedRole)**. No role logic inside screens.
- **`client/components/GlobalErrorScreen.tsx`** — Reusable screen for offline, maintenance, server error; user-driven Retry only.
- **No BackendGate** — App does not run a health check on startup; backend is only called when the user performs an action.

---

## 15. Quick Summary (TL;DR)

**Login flow**

- Guest token ready → Login screen (no backend health check).
- Send OTP (guest token) → Verify OTP (guest token) → store access + refresh + user + roles + hub → root decides: NoRole / NoHub block or main app.

**Token handling**

- **Guest token:** Only for Identity, Send OTP, Verify OTP. Recreated after logout/OTP failure via Identity.
- **Access token:** Used for all authenticated APIs; short-lived; refreshed only on 401 + TOKEN_EXPIRED (and not on OTP/login URLs).
- **Refresh token:** Only for refresh endpoint; one refresh attempt; on failure → logout → new guest token → Login.

**Role handling**

- Roles from user (array); normalized lowercase; **guard** or **hm** / **hub_manager** → allowed; else NoRoleBlock. **Single permission map** (`client/permissions/rolePermissions.ts`) defines which screens and actions each role gets. Root navigator registers **only** allowed screens; no role checks inside screens.

**Hub handling**

- Hub from user (array); **index 0** → selectedHubId; injected into all authenticated requests as **hubId** and **hub_id** (query params for GET, body for POST/PUT/PATCH); no hub → NoHubBlock.

**Error handling**

- OTP/login error → logout + new guest token + Login with “session expired. Request OTP again.” No retry/refresh on OTP.
- Refresh failure → logout + new guest token + Login.
- Offline / 503 / 500 → global Server Unavailable overlay; Retry dismisses it (no extra health-check call). Raw backend errors are not shown.

---

After reading this README, a new developer should understand how login, tokens, roles, hubs, and errors work in this app without reading the entire codebase.
