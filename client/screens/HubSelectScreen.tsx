import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { fetchHubList } from "@/lib/query-client";
import { useHub, type Hub } from "@/contexts/HubContext";
import { toTitleCase } from "@/lib/format";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "HubSelect">;

function HubRow({
  hub,
  onSelect,
  theme,
}: {
  hub: Hub;
  onSelect: (hub: Hub) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(hub);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.primary }]}>
        <Feather name="map-pin" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.rowContent}>
        <ThemedText type="h4">{toTitleCase(hub.hub_name)}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {toTitleCase(hub.city)}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={22} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function HubSelectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { hub, isRestored, setHub } = useHub();

  const { data: hubs = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["hub-list"],
    queryFn: fetchHubList,
    staleTime: 60_000 * 5,
  });

  // If user already had a hub selected (restored from storage), go to main screen
  useEffect(() => {
    if (!isRestored) return;
    if (hub) {
      navigation.replace("VisitorType");
    }
  }, [isRestored, hub, navigation]);

  const handleSelectHub = (selected: Hub) => {
    setHub(selected);
    navigation.replace("VisitorType");
  };

  // Still loading stored hub preference, or hub already selected (navigating away)
  if (!isRestored || hub) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          Loading…
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <ThemedText type="h3" style={styles.title}>
            Choose Hub
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select your location (Bengaluru, Hyderabad, Delhi, Mumbai, etc.)
          </ThemedText>
        </Animated.View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
              Loading hubs…
            </ThemedText>
          </View>
        ) : hubs.length === 0 ? (
          <View style={styles.center}>
            <Feather name="map-pin" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ color: theme.text, marginTop: Spacing.md }}>
              No hubs found
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Pull down to refresh
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={hubs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={theme.primary}
              />
            }
            renderItem={({ item }) => (
              <HubRow hub={item} theme={theme} onSelect={handleSelectHub} />
            )}
          />
        )}
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
    paddingHorizontal: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {},
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  rowContent: {
    flex: 1,
  },
});
