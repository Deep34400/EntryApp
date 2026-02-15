import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { ZoomIn, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ExitConfirmation">;
type ExitConfirmationRouteProp = RouteProp<RootStackParamList, "ExitConfirmation">;

export default function ExitConfirmationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ExitConfirmationRouteProp>();
  const { token } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "VisitorType" }],
        })
      );
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.centerContent}>
          <Animated.View
            entering={ZoomIn.delay(100).springify()}
            style={[styles.successCircle, { backgroundColor: theme.success }]}
          >
            <Feather name="check" size={48} color={theme.onPrimary} />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300)}>
            <ThemedText type="h2" style={styles.title}>
              Ticket Closed
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(500)}>
            <ThemedText
              type="body"
              style={[styles.message, { color: theme.textSecondary }]}
            >
              Token #{token} has been successfully closed
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(700)}>
            <ThemedText
              type="small"
              style={[styles.redirect, { color: theme.textSecondary }]}
            >
              Redirecting to home...
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.horizontalScreenPadding,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  redirect: {
    textAlign: "center",
  },
});
