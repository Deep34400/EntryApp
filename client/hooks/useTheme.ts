import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const themeContext = useThemeContext();
  const systemScheme = useColorScheme();
  const colorScheme = themeContext?.colorScheme ?? systemScheme ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  return {
    theme,
    isDark,
    themeContext,
  };
}
