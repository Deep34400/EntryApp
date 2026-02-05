import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
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

function HubCard({
  hub,
  onSelect,
  theme,
  index,
}: {
  hub: Hub;
  onSelect: (hub: Hub) => void;
  theme: ReturnType<typeof useTheme>["theme"];
  index: number;
}) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(hub);
  };

  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 50).springify()}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            opacity: pressed ? 0.92 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.primary }]}>
          <Feather name="map-pin" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4" style={[styles.hubName, { color: theme.text }]}>
            {toTitleCase(hub.hub_name)}
          </ThemedText>
          <ThemedText type="small" style={[styles.hubCity, { color: theme.textSecondary }]}>
            {toTitleCase(hub.city)}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {/* 1. Logo at top — rounded card like reference */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.logoSection}>
          <View
            style={[
              styles.logoCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* 2. Gate Entry — then 3. Choose your hub location */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.header}>
          <ThemedText type="h3" style={[styles.title, { color: theme.text }]}>
            Gate Entry
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose your hub location
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
            showsVerticalScrollIndicator={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={theme.primary}
              />
            }
            renderItem={({ item, index }) => (
              <HubCard
                hub={item}
                theme={theme}
                onSelect={handleSelectHub}
                index={index}
              />
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
    paddingHorizontal: Spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: Spacing.sm,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    letterSpacing: 0.2,
    textAlign: "center",
  },
  listContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  hubName: {
    fontWeight: "700",
    marginBottom: 2,
  },
  hubCity: {
    letterSpacing: 0.2,
  },
});
