/**
 * Config-driven icon: Feather or MaterialCommunityIcons.
 * Use for PURPOSE_CONFIG items (e.g. currency-inr from material for Settlement).
 */
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type IconLibrary = "feather" | "material";

export interface AppIconProps {
  name: string;
  library?: IconLibrary;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({
  name,
  library = "feather",
  size = 20,
  color = "#161B1D",
  style,
}: AppIconProps) {
  if (library === "material") {
    return (
      <MaterialCommunityIcons
        name={name as any}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <Feather
      name={name as any}
      size={size}
      color={color}
      style={style}
    />
  );
}
