import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, VisitorType } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "VisitorType">;

interface VisitorTypeCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  type: VisitorType;
  delay: number;
  onPress: (type: VisitorType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function VisitorTypeCard({
  title,
  description,
  icon,
  type,
  delay,
  onPress,
}: VisitorTypeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(type);
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
        testID={`card-${type}`}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: theme.primary }]}
        >
          <Feather name={icon} size={28} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4" style={styles.cardTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.cardDescription, { color: theme.textSecondary }]}
          >
            {description}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color={theme.textSecondary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VisitorTypeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const handleSelectType = (type: VisitorType) => {
    navigation.navigate("EntryForm", { visitorType: type });
  };

  const visitorTypes = [
    {
      type: "sourcing" as VisitorType,
      title: "Sourcing",
      description: "For procurement and vendor meetings",
      icon: "file-text" as keyof typeof Feather.glyphMap,
    },
    {
      type: "maintenance" as VisitorType,
      title: "Maintenance",
      description: "For repair and maintenance work",
      icon: "tool" as keyof typeof Feather.glyphMap,
    },
    {
      type: "collection" as VisitorType,
      title: "Collection",
      description: "For pickup and delivery",
      icon: "truck" as keyof typeof Feather.glyphMap,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <ThemedText type="h3" style={styles.subtitle}>
            Select Entry Purpose
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {visitorTypes.map((item, index) => (
            <VisitorTypeCard
              key={item.type}
              type={item.type}
              title={item.title}
              description={item.description}
              icon={item.icon}
              delay={100 + index * 100}
              onPress={handleSelectType}
            />
          ))}
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
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
  },
  cardsContainer: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    opacity: 0.8,
  },
});
