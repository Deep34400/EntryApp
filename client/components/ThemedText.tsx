import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  /** Use secondary for captions/helper text (theme.textSecondary). */
  variant?: "default" | "secondary";
  /** Semantic types: screenTitle, sectionTitle map to global typography. */
  type?: "screenTitle" | "sectionTitle" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "small" | "link" | "label" | "token";
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

  const getTypeStyle = () => {
    switch (type) {
      case "screenTitle":
        return Typography.screenTitle;
      case "sectionTitle":
        return Typography.sectionTitle;
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "h5":
        return Typography.h5;
      case "h6":
        return Typography.h6;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "link":
        return Typography.link;
      case "label":
        return Typography.label;
      case "token":
        return Typography.token;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
