import { StyleSheet, Platform } from "react-native";
import { layout } from "@/constants/layout";
import { tokenScreen, fontFamily, radius, spacing } from "@/theme";

export const GREEN_HEADER_HEIGHT = 260;
const CARD_WIDTH = layout.contentMaxWidth;

export const tokenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  green: {
    width: "100%",
    backgroundColor: tokenScreen.headerGreen,
    alignItems: "center",
    paddingBottom: 56,
    justifyContent: "center",
  },
  tokenWrap: { alignItems: "center", marginTop: -20 },
  tokenLabel: {
    fontFamily: fontFamily.poppins,
    fontSize: 16,
    fontWeight: "600",
    color: tokenScreen.onHeader,
    marginBottom: 6,
  },
  tokenValue: {
    fontFamily: fontFamily.poppins,
    fontSize: 32,
    fontWeight: "600",
    color: tokenScreen.onHeader,
  },
  driverCardFloating: {
    position: "absolute",
    top: GREEN_HEADER_HEIGHT - 90,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  driverCard: {
    width: CARD_WIDTH,
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokenScreen.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokenScreen.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.poppins,
    fontSize: 18,
    fontWeight: "600",
    color: tokenScreen.labelGray,
  },
  driverTextBlock: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  role: {
    fontFamily: fontFamily.poppins,
    fontSize: 12,
    fontWeight: "400",
    color: tokenScreen.labelGray,
    marginTop: 2,
  },
  phone: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center" },
  assignmentCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokenScreen.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  assignmentHeader: {
    fontFamily: fontFamily.poppins,
    fontSize: 16,
    fontWeight: "600",
    color: "#161B1D",
  },
  assignmentDivider: {
    height: 1,
    backgroundColor: tokenScreen.cardBorder,
    marginVertical: spacing.md,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  assignmentLabel: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "400",
    color: tokenScreen.labelGray,
  },
  assignmentValue: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "500",
    color: "#161B1D",
    maxWidth: "60%",
    textAlign: "right",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  shareBtn: {
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokenScreen.accentRed,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  shareText: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "600",
    color: tokenScreen.accentRed,
  },
  trackBtn: {
    height: 48,
    borderRadius: 22,
    backgroundColor: tokenScreen.accentRed,
    justifyContent: "center",
    alignItems: "center",
  },
  trackText: {
    fontFamily: fontFamily.poppins,
    fontSize: 14,
    fontWeight: "600",
    color: tokenScreen.onHeader,
  },
  buttonPressed: { opacity: 0.85 },
});

export const BOTTOM_PADDING = 16;
export const BUTTON_HEIGHT = 48;
