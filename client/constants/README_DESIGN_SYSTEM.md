# Global Design System

All visual and layout tokens live here. Change values in **one place** to update the app.

## Where to change what

| What you want to change | File | Export |
|-------------------------|------|--------|
| **Brand colors** (primary, error, success, etc.) | `designTokens.ts` | `DesignTokens.brand` |
| **Login/OTP screen colors** (header red, resend green, input border, terms, etc.) | `designTokens.ts` | `DesignTokens.login` |
| **Light/Dark theme colors** | `designTokens.ts` | `DesignTokens.light` / `DesignTokens.dark` |
| **Spacing scale** (4, 8, 12, 16, 20, 24, …) | `theme.ts` | `Spacing` |
| **Screen padding, card padding, content gap, max widths** | `theme.ts` | `Layout` |
| **Border radius scale** | `theme.ts` | `BorderRadius` |
| **Typography** (font sizes, weights) | `theme.ts` | `Typography` |

## Responsive layout rules (used in screens)

- **Screen padding:** `Layout.horizontalScreenPadding` (16)
- **Card padding:** `Layout.cardPadding` (16)
- **Gap between elements:** `Layout.contentGap` (12)
- **Max content width:** `Layout.contentMaxWidth` (328) — forms and cards stay centered on large screens
- **No fixed large heights** — use `minHeight` / `maxHeight` or flex so layouts work on small devices, tablets, and landscape
- **Scrollable content:** `ScrollView` with `contentContainerStyle={{ flexGrow: 1 }}` and safe bottom padding for keyboard/footer
- **Text:** use `numberOfLines` where text can overflow

Screens import from `@/constants/theme` and `@/constants/designTokens` (or re-export via `theme`).
