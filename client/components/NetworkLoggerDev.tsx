/**
 * In-app network logger for debugging API calls only.
 * This module is loaded only in development or when EXPO_PUBLIC_ENABLE_NETWORK_LOGGER is set.
 * It captures method, URL, status, headers, body, and response time for all fetch/XMLHttpRequest
 * calls (no changes needed to existing axios/fetch usage).
 * Do not use or enable in production.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetworkLoggerLib, {
  startNetworkLogging,
  getRequests,
} from "react-native-network-logger";

// Start capturing network requests as soon as this module is loaded (dev/test only).
startNetworkLogging({ maxRequests: 500 });

const NOTIFICATION_DURATION_MS = 4500;
const POLL_INTERVAL_MS = 500;
const MAX_SHOWN_IDS = 100;

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#34C759";
  if (status >= 400 && status < 500) return "#FFCC00";
  if (status >= 500) return "#FF3B30";
  return "#8E8E93";
}

/** Short path from URL for the banner (e.g. /api/v1/drivers/by-hub/undefined) */
function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + (u.search || "");
    return path.length > 42 ? path.slice(0, 39) + "…" : path;
  } catch {
    return url.length > 42 ? url.slice(0, 39) + "…" : url;
  }
}

type RequestNotification = {
  id: string;
  method: string;
  status: number;
  url: string;
  duration: number;
};

export default function NetworkLoggerDev() {
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<RequestNotification | null>(
    null
  );
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const shownIds = useRef<Set<string>>(new Set());

  const insets = useSafeAreaInsets();

  // Poll for completed requests and show a direct notification banner (no need to open logger first).
  useEffect(() => {
    const id = setInterval(() => {
      const requests = getRequests();
      const completed = requests.filter(
        (r: { status: number; id: string }) =>
          r.status >= 0 && !shownIds.current.has(r.id)
      );
      if (completed.length === 0) return;
      const latest = completed[0];
      for (const r of completed) {
        shownIds.current.add(r.id);
      }
      while (shownIds.current.size > MAX_SHOWN_IDS) {
        const first = shownIds.current.values().next().value;
        if (first != null) shownIds.current.delete(first);
      }
      const duration =
        latest.endTime != null && latest.startTime != null
          ? (latest as { endTime: number; startTime: number }).endTime -
            (latest as { endTime: number; startTime: number }).startTime
          : 0;
      setNotification({
        id: latest.id,
        method: latest.method ?? "?",
        status: latest.status,
        url: latest.url ?? "",
        duration,
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Animate banner in when notification appears, and auto-hide after NOTIFICATION_DURATION_MS.
  useEffect(() => {
    if (!notification) {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    const hideTimer = setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);
    return () => clearTimeout(hideTimer);
  }, [notification, bannerOpacity]);

  const openLogger = () => {
    setNotification(null);
    setVisible(true);
  };

  return (
    <>
      {/* Direct notification banner when an API call completes — tap to open full logger. */}
      {notification != null && (
        <View
          style={[
            styles.bannerWrap,
            {
              paddingTop: insets.top + 8,
              paddingHorizontal: 12,
              paddingBottom: 10,
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.banner,
              {
                opacity: bannerOpacity,
                borderLeftColor: getStatusColor(notification.status),
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [pressed && styles.bannerPressed]}
              onPress={openLogger}
            >
              <View style={styles.bannerRow}>
                <Text style={styles.bannerMethod}>{notification.method}</Text>
                <View
                  style={[
                    styles.bannerStatusBadge,
                    { backgroundColor: getStatusColor(notification.status) },
                  ]}
                >
                  <Text style={styles.bannerStatusText}>
                    {notification.status}
                  </Text>
                </View>
                {notification.duration > 0 && (
                  <Text style={styles.bannerDuration}>
                    {notification.duration}ms
                  </Text>
                )}
              </View>
              <Text style={styles.bannerUrl} numberOfLines={1}>
                {shortPath(notification.url)}
              </Text>
              <Text style={styles.bannerHint}>Tap to open full log</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Floating button to open the network logger (Chucker-style). */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => setVisible(true)}
        accessibilityLabel="Open network logger"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>🌐</Text>
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Network Logger</Text>
            <Pressable
              onPress={() => setVisible(false)}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.loggerContainer}>
            <NetworkLoggerLib theme="dark" />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  banner: {
    backgroundColor: "rgba(28, 28, 30, 0.96)",
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  bannerPressed: {
    opacity: 0.9,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  bannerMethod: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  bannerStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bannerStatusText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 12,
  },
  bannerDuration: {
    color: "#8E8E93",
    fontSize: 12,
  },
  bannerUrl: {
    color: "#FFCC00",
    fontSize: 13,
    marginBottom: 2,
  },
  bannerHint: {
    color: "#8E8E93",
    fontSize: 11,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0, 122, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabText: {
    fontSize: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  closeBtnText: {
    color: "#0a84ff",
    fontSize: 16,
  },
  loggerContainer: {
    flex: 1,
  },
});
