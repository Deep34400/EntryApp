# Global design system — Carrum Mobility Solutions

**Current brand:** Soft dark professional theme. Background `#15181D`, cards `#1E2228`, primary red `#C7363E`, soft alert red `#E06A6A`, text primary white, text secondary `#A1A6AD`. No pure black; warm, enterprise-grade, modern SaaS look.

All app design (colors, spacing, typography, layout) is controlled from a **single place** in `designTokens.ts` and `theme.ts`.

## Responsive & layout rules (fleet hub operations)

- **Horizontal screen padding:** 16px on all screens — use `Layout.horizontalScreenPadding` from `theme.ts`.
- **Safe areas:** Respect top, bottom, left, right insets on every screen (`useSafeAreaInsets()`).
- **Headers:** Min height ~64px (`Layout.headerMinHeight`). Left-aligned titles. Back and header buttons use 44×44pt minimum touch targets (`Layout.backButtonTouchTarget`).
- **No fixed widths/heights** that break layout; use `minHeight` / `flex` so content can reflow.
- **Typography:** Use `Typography` from theme; text wraps by default (avoid `numberOfLines` unless truncation is intended).
- **Red:** Use only for errors, overdue states, or SLA alerts.

## Where to change design

| What you want to change | File | What to edit |
|-------------------------|------|----------------|
| **Brand colors** (primary red, success green, error, etc.) | `designTokens.ts` | `DesignTokens.brand` |
| **Light theme** (backgrounds, text, borders) | `designTokens.ts` | `DesignTokens.light` |
| **Dark theme** (main app dark mode) | `designTokens.ts` | `DesignTokens.dark` |
| **Ticket screens** (red & black dark UI) | `designTokens.ts` | `DesignTokens.darkUI` |
| **Spacing, radii, typography, fonts** | `theme.ts` | `Spacing`, `BorderRadius`, `Typography`, `Fonts` |

- **`designTokens.ts`** — Single source for **colors**. Change `brand.primary` / `brand.primaryDark` (and optionally `darkUI`) here; the rest of the app (theme, buttons, links, ticket list/detail) updates automatically.
- **`theme.ts`** — Builds `Colors` (light/dark) from tokens and defines `Spacing`, `BorderRadius`, `Typography`, `Fonts`. Re-exports `DesignTokens`.

## Example: rebrand to a different red and black

In `designTokens.ts`:

```ts
brand: {
  primary: "#E53935",      // was #9B2C2C
  primaryDark: "#B71C1C",
  // success, error, warning stay or change as you like
},
darkUI: {
  background: "#0F1115",
  card: "#1A1D24",
  // ...
},
```

Save → app and ticket screens both use the new red.

## Using the design system in code

- Use **`useTheme()`** and **`theme.*`** for colors in most screens (respects light/dark).
- Use **`ScreenPalette`** only on Ticket List and Ticket Detail (they use the fixed dark UI from `darkUI`).
- Use **`Spacing`**, **`BorderRadius`**, **`Typography`**, **`Fonts`** from `@/constants/theme` for layout and text.

No need to change anything elsewhere when you only change tokens or theme constants.
