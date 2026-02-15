# Global System — Fleet Operations & Gate Entry

This document describes the **single source of truth** for the app. Change values in one place to update the entire application.

---

## 1. Theme & design (no hardcoded colors)

- **`constants/designTokens.ts`** — All brand and semantic colors, light/dark neutrals, overlay, shadow. Edit here to rebrand.
- **`constants/theme.ts`** — Derives `Colors.light` / `Colors.dark` from design tokens. Exposes: `Colors`, `Spacing`, `Layout`, `BorderRadius`, `Typography`, `Fonts`.
- **Usage:** Use `useTheme()` in components; use `theme.primary`, `theme.text`, `theme.surface`, etc. Never use hex/rgba in screens or components.

---

## 2. Spacing & sizing

- **Scale:** `Spacing.xs` (4), `Spacing.sm` (8), `Spacing.md` (12), `Spacing.lg` (16), plus `xl`, `2xl`, etc.
- **Layout:** `Layout.horizontalScreenPadding` (16), `Layout.headerMinHeight`, `Layout.compactHeaderContentHeight`, `Layout.headerCurveRadius`, `Layout.backButtonTouchTarget`, `Layout.minTouchTarget`, `Layout.statCardMinHeight`, `Layout.headerAvatarSize`, `Layout.inputHeight`.
- Use these everywhere; avoid arbitrary margins/paddings.

---

## 3. Typography

- **Semantic types:** `screenTitle`, `sectionTitle`, `body`, `small`, `label`, `link`, `token`, plus `h1`–`h6`.
- **Component:** `ThemedText` with `type` and optional `variant="secondary"` (uses `theme.textSecondary`).
- Text must wrap; avoid clipping on small screens.

---

## 4. Layout & responsiveness

- **`ScreenLayout`** — Wrapper with safe-area insets and horizontal padding. Use for consistent screen chrome.
- **Safe area:** Handled via `useSafeAreaInsets()` or `ScreenLayout`; no fixed heights for dynamic content.
- **Headers:** Compact; use `Layout.headerMinHeight` and theme colors.

---

## 5. Reusable components

- **Header:** `HeaderTitle`, `BackHeaderButton`, `HomeHeaderButton`, `ThemeToggleHeaderButton`.
- **UI:** `Button`, `Card`, `ThemedText`, `ThemedView`, `ListItem`, `ThemedModal`.
- **Layout:** `ScreenLayout`, `Spacer`, `KeyboardAwareScrollViewCompat`.
- **Error:** `ErrorBoundary`, `ErrorFallback`.

All use theme only; no hardcoded colors.

---

## 6. API & data

- **Config:** `api/requestClient.ts` — `getApiUrl()`, `requestWithAuthRetry()`, `throwIfResNotOk()`.
- **Auth:** Centralized refresh and 401 handling; `AuthContext` and `SessionExpiredHandler` for session expiry.
- **Data:** Use `@tanstack/react-query` for server state; keep calculations in `lib/` (e.g. `format.ts`, `ticket-utils.ts`), not in UI.

---

## 7. Ticket list/detail palette

- **`constants/screenPalette.ts`** — `getScreenPalette(theme)` returns palette derived from current theme. Use in TicketList and TicketDetail so they follow global theme.

---

## 8. Design style

- Flat, modern, enterprise. No decorative elements or flashy animations.
- Internal operations app: clarity, speed, usability.

---

**Summary:** Change `designTokens.ts` and/or `theme.ts` to update colors and spacing app-wide. Use `useTheme()`, `Spacing`, `Layout`, and shared components everywhere.
