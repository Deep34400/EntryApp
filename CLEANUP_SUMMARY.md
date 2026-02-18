# Production-safe cleanup summary

Cleanup was done **without changing UI or behavior**. Below is what was removed and why it was safe.

---

## 1. Removed unused code

### Unused in `src/`

| Removed                                                                   | Why safe                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/hooks/useSafeInsets.ts`                                              | Nothing imported it; screens use `useSafeAreaInsets` from react-native-safe-area-context. |
| `src/components/Header/` (Header.tsx, styles.ts)                          | No imports; no screen uses `<Header>`.                                                    |
| `src/components/Avatar/` (Avatar.tsx)                                     | No imports; avatars are inline in screens.                                                |
| `src/components/Card/` (Card.tsx, styles.ts)                              | No imports; cards are inline in screens.                                                  |
| `src/components/Button/OutlineButton.tsx`                                 | No imports; only PrimaryButton/Button are used.                                           |
| Unused import `formatPhone` in `src/screens/token/TokenDisplayScreen.tsx` | `formatPhone` was imported but not used.                                                  |
| `fetchTicketList` in `src/services/ticketService.ts`                      | Never used; TicketListScreen uses its own `fetchTicketListPage`.                          |

### Unused in `client/`

The app runs from **`src/`** (entry resolves `@/` to `src/`). The only `client` code that runs is the **6 screens** loaded via re-exports: EntryFormScreen, VisitorPurposeScreen, TicketListScreen, TicketDetailScreen, LoginOtpScreen, OTPVerificationScreen. Those screens import from `@/` (i.e. `src/`), so all other `client` code is unused.

| Removed                                                                                                                      | Why safe                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **client/navigation/** (RootStackNavigator, ProfileStackNavigator, MainTabNavigator, MainTabNavigator26, HomeStackNavigator) | Navigation is in `src/navigation`; these are never used.            |
| **client/App.tsx**                                                                                                           | App entry uses `src/App.tsx`; this is never loaded.                 |
| **client/components/** (all 19 files)                                                                                        | All component imports in the 6 screens resolve to `src/components`. |
| **client/contexts/** (AuthContext, UserContext, ThemeContext)                                                                | All context imports resolve to `src/contexts` → `src/store`.        |
| **client/hooks/** (useScreenOptions, useTheme, useColorScheme\*)                                                             | All hook imports resolve to `src/hooks` / `src/store`.              |
| **client/lib/** (query-client, api-endpoints, format, ticket-utils, api-error, auth-bridge, auth-api)                        | All lib imports resolve to `src/lib`.                               |
| **client/api/requestClient.ts**                                                                                              | Unused; API is in `src/services/apiClient`.                         |
| **client/constants/** (theme, designTokens, entryPurpose, screenPalette)                                                     | All constant imports resolve to `src/constants`.                    |
| **client/utils/** (validation, entryType)                                                                                    | All utils resolve to `src/utils`.                                   |
| **client/types/ticket.ts**                                                                                                   | Type imports resolve to `src/types/ticket`.                         |
| **client/screens/TokenDisplayScreen.tsx**                                                                                    | Replaced by `src/screens/token/TokenDisplayScreen.tsx`.             |
| **client/screens/ExitConfirmationScreen.tsx**                                                                                | Replaced by `src/screens/token/ExitConfirmationScreen.tsx`.         |
| **client/screens/ProfileScreen.tsx**                                                                                         | Replaced by `src/screens/account/ProfileScreen.tsx`.                |
| **client/screens/VisitorTypeScreen.tsx**                                                                                     | Replaced by `src/screens/entry/VisitorTypeScreen.tsx`.              |
| **client/screens/MaintenanceReasonScreen.tsx**                                                                               | Not in any navigator; only referenced in removed client navigation. |
| **client/screens/ModalScreen.tsx**                                                                                           | Not in any navigator.                                               |
| **client/screens/HomeScreen.tsx**                                                                                            | Only used by removed client/HomeStackNavigator.                     |

**Kept in client:** `client/index.js` (entry), `client/screens/` (only the 6 screens above), and any `client/assets` or image paths those 6 screens need.

---

## 2. Single source of truth

- **Colors** → `src/theme/colors.ts` (and `tokenScreen` / `loginScreen` for screen-specific tokens).
- **Spacing** → `src/theme/spacing.ts` and `src/constants/layout.ts` where applicable.
- **Typography / fonts** → `src/theme/typography.ts`.
- **Radius** → `src/theme/radius.ts`.

The 6 client screens already use `@/constants/theme`, `@/constants/designTokens`, etc., which resolve to `src/`, so they use the same theme. No hard-coded magic numbers were introduced; existing values were left as-is.

---

## 3. Duplicate code reduced

- **Removed duplicate implementations:** TokenDisplay, ExitConfirmation, Profile, VisitorType exist only in `src/screens`; the old `client` copies were removed.
- **Single lib layer:** The 6 client screens use `@/lib/format` and `@/lib/ticket-utils`; these now point to `src/lib/format.ts` and `src/lib/ticket-utils.ts`, which re-export from `src/utils/format` and `src/utils/ticketUtils` (no duplicate logic).

---

## 4. Other small fixes

- **Missing lib modules:** Added `src/lib/format.ts` and `src/lib/ticket-utils.ts` so the 6 client screens (which import `@/lib/format` and `@/lib/ticket-utils`) resolve correctly when `@/` points to `src/`.
- **Dead comment removed:** Removed commented `// topOffset={0}` in `client/screens/LoginOtpScreen.tsx`.
- **No console.logs** were found in `src/`; none were added.

---

## 5. What was not changed

- No navigation routes removed.
- No API services removed (only unused `fetchTicketList` in ticketService).
- No UI, layout, spacing, colors, or fonts changed.
- No renames of public APIs.
- Doc files under `client/` (e.g. README_DESIGN_SYSTEM.md, GLOBAL_SYSTEM.md, docs/) were kept in case they are still useful.

---

## Result

- **Fewer files:** Large amount of unused `client` code removed; unused `src` components and one hook removed.
- **Single source of truth:** Theme and layout live in `src/theme` and `src/constants`; the 6 client screens use them via `@/`.
- **Same behavior and UI:** No intentional change to flows or visuals; cleanup was removal and consolidation only.
