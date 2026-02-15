# Global design system — Carrum Mobility Solutions

**Current brand:** Soft dark professional theme. Background `#15181D`, cards `#1E2228`, primary red `#C7363E`, soft alert red `#E06A6A`, text primary white, text secondary `#A1A6AD`. No pure black; warm, enterprise-grade, modern SaaS look.

All app design (colors, spacing, typography) is controlled from a **single place** in `designTokens.ts` and `theme.ts`.

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
