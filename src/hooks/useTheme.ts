import { useColorScheme } from "react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/theme";

export function useTheme() {
  const themeContext = useThemeContext();
  const systemScheme = useColorScheme();
  const colorScheme = themeContext?.colorScheme ?? systemScheme ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme as keyof typeof Colors];

  return {
    theme,
    isDark,
    themeContext,
  };
}
