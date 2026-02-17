import { useColorScheme } from "react-native";
import { useThemeContext } from "@/store/themeStore";
import { colors } from "@/theme";

export function useTheme() {
  const themeContext = useThemeContext();
  const systemScheme = useColorScheme();
  const colorScheme = themeContext?.colorScheme ?? systemScheme ?? "light";
  const isDark = colorScheme === "dark";
  const theme = colors[colorScheme];

  return {
    theme,
    isDark,
    themeContext,
  };
}
