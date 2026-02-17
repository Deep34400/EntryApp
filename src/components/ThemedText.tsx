import { Text, type TextProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "default" | "secondary";
  type?: keyof typeof Typography;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  variant = "default",
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) return darkColor;
    if (!isDark && lightColor) return lightColor;
    if (type === "link") return theme.link;
    if (variant === "secondary") return theme.textSecondary;
    return theme.text;
  };

  const typeStyle = Typography[type] ?? Typography.body;

  return (
    <Text style={[{ color: getColor() }, typeStyle, style]} {...rest} />
  );
}
