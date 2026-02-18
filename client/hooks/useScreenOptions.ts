import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const isIOS = Platform.OS === "ios";

  return {
    headerTitleAlign: "left",

    // ✅ Transparent header ONLY on iOS
    headerTransparent: isIOS ? transparent : false,

    // ✅ Blur ONLY on iOS
    ...(isIOS && {
      headerBlurEffect: isDark ? "dark" : "light",
    }),

    headerTintColor: theme.text,

    headerStyle: {
      backgroundColor: isIOS && transparent
        ? "transparent"
        : theme.backgroundRoot,
    },

    // ✅ Gesture handling (SAFE)
    gestureEnabled: true,
    gestureDirection: "horizontal",

    fullScreenGestureEnabled: true,

    // ✅ Prevent black screen in dark mode
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
