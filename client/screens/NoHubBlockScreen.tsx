/**
 * Shown when user is authenticated and has role but no hub assigned (hub array empty).
 * Block app usage; single action (Logout).
 */

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

const NO_HUB_MESSAGE =
  "No hub is assigned to your account. Please contact support.";

type NavProp = NativeStackNavigationProp<RootStackParamList, "NoHubBlock">;

export default function NoHubBlockScreen() {
  const { theme } = useTheme();
  const auth = useAuth();
  const navigation = useNavigation<NavProp>();

  const handleLogout = () => {
    auth.logout();
    navigation.replace("LoginOtp");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Feather name="map-pin" size={48} color={theme.textSecondary} style={styles.icon} />
        <ThemedText type="h1" style={styles.title}>
          No hub assigned
        </ThemedText>
        <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
          {NO_HUB_MESSAGE}
        </ThemedText>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.link, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText type="body" style={[styles.buttonText, { color: theme.buttonText }]}>
            Logout
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  button: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing["2xl"],
    minWidth: 160,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
