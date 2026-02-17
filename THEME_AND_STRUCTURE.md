# Theme & structure guide

This app uses a production-ready `src/` layout only. There is no `client/` folder.

- **Entry point:** `index.js` at project root → imports `./src/App` and registers it with Expo.
- **Path alias:** `@/` points to `src/` (see `babel.config.js` and `tsconfig.json`).

## Where to change things (single place)

- **Colors (primary, backgrounds, semantic)**  
  `src/theme/colors.ts`  
  Use `colors.light` / `colors.dark` for theme; `tokenScreen` and `loginScreen` for screen-specific tokens.

- **Spacing**  
  `src/theme/spacing.ts`  
  Use the `spacing` scale everywhere; avoid magic numbers.

- **Typography (font family, sizes)**  
  `src/theme/typography.ts`  
  Change `fontFamily.poppins`, `fontFamily.serif`, and the `typography` scale here.

- **Radius (buttons, cards)**  
  `src/theme/radius.ts`  
  Change button/card border radius here.

- **Layout (header height, padding, touch targets)**  
  `src/constants/layout.ts`  
  Change header height, card overlap, horizontal padding, min touch target, etc.

- **API base URL**  
  `.env`: `EXPO_PUBLIC_API_URL`  
  Endpoint paths: `src/constants/api.ts`.

## Dark mode

- Theme colors are in `src/theme/colors.ts` with explicit `light` and `dark` objects.
- All backgrounds use these colors so dark mode does not produce black or broken screens.
- To force light mode, use the theme context in `src/store/themeStore.tsx` (e.g. set preference to `"light"`).

## Folder structure

```
src/
├── navigation/       RootNavigator, AuthNavigator, AppNavigator
├── screens/          token/, entry/, ticket/, account/, auth/
├── components/       Card, Button, Header, Avatar, BackArrow, AppFooter, etc.
├── theme/            colors, spacing, typography, radius (single source)
├── constants/        layout, app, api, entryPurpose
├── utils/            formatPhone, entryType, validators, format, ticketUtils
├── hooks/            useAuth, useTheme, useSafeInsets, useScreenOptions
├── services/         apiClient, authService, ticketService, apiError
├── store/            authStore, userStore, themeStore (context-based)
├── lib/              query-client, auth-api, api-endpoints, auth-bridge, api-error
├── contexts/         Compatibility: AuthContext, UserContext, ThemeContext → store
├── types/            ticket (and navigation types in navigation/types.ts)
└── assets/           images, icons, fonts (or use project root assets)
```

## Assets

- All screen images use `require("../../../assets/images/...")` (project root `assets/`).
- Ensure **`assets/images/`** at project root contains: `car.png`, `logo.png`, `latestLogo.png` (and any others referenced in screens).

## Deployment

- **Main:** `package.json` → `"main": "index.js"`.
- **Entry:** `index.js` → `import App from "./src/App"` → `registerRootComponent(App)`.
- All app code lives under **`src/`**; no `client/` folder. Build and deploy as usual (e.g. `expo build`, EAS).
