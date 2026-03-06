import React, {
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

import { AppFooter, useFooterTotalHeight } from "@/components/AppFooter";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, BorderRadius } from "@/constants/theme";
import { DesignTokens } from "@/constants/designTokens";
import { getTicketCounts, getTicketList } from "@/apis";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatEntryTime, formatDurationHours } from "@/lib/format";
import type { TicketListItem } from "@/types/ticket";
import { getWaitingMinutes } from "@/lib/ticket-utils";
import { getEntryTypeDisplayLabel } from "@/utils/entryType";
import { TicketListShimmer } from "@/components/Shimmer";

export type { TicketListItem } from "@/types/ticket";

type TabId = "Delayed" | "Open" | "Closed";

// ── Search filter types ───────────────────────────────────────────────────────
type FilterType = "all" | "token" | "name" | "vehicle";

const FILTER_OPTIONS: { id: FilterType; icon: string; label: string }[] = [
  { id: "all", icon: "🔍", label: "All" },
  { id: "token", icon: "🎫", label: "Token #" },
  { id: "name", icon: "👤", label: "Name" },
  { id: "vehicle", icon: "🚗", label: "Vehicle" },
];

// ── Date range filter ─────────────────────────────────────────────────────────
interface DateRange {
  startDate: Date;
  endDate: Date;
  startHour: number;
  startMinute: number;
  startAmPm: "AM" | "PM";
  endHour: number;
  endMinute: number;
  endAmPm: "AM" | "PM";
  active: boolean;
}

function makeTodayRange(): DateRange {
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    startHour: 12,
    startMinute: 0,
    startAmPm: "AM",
    endHour: 11,
    endMinute: 59,
    endAmPm: "PM",
    active: false,
  };
}

function to24(h: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function from24(h24: number): { hour: number; ampm: "AM" | "PM" } {
  if (h24 === 0) return { hour: 12, ampm: "AM" };
  if (h24 < 12) return { hour: h24, ampm: "AM" };
  if (h24 === 12) return { hour: 12, ampm: "PM" };
  return { hour: h24 - 12, ampm: "PM" };
}

function formatDisplayDate(d: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yy = String(d.getFullYear()).slice(2);
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${yy}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTimeDisplay(h: number, m: number, ap: "AM" | "PM"): string {
  return `${pad2(h === 0 ? 12 : h > 12 ? h - 12 : h)}:${pad2(m)} ${ap}`;
}

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TicketList"
>;

const FONT_POPPINS = "Poppins";
const primaryRed = DesignTokens.login.headerRed;
const PAGE_SIZE = 50;
const STALE_TIME_MS = 10_000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatWaitingLabel(entryTime?: string | null): string {
  const mins = getWaitingMinutes(entryTime);
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function applySearch(
  list: TicketListItem[],
  query: string,
  filterType: FilterType,
  dateRange: DateRange,
): TicketListItem[] {
  let result = list;
  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => {
      switch (filterType) {
        case "token":
          return String(item.token_no).toLowerCase().includes(q);
        case "name":
          return (item.name ?? "").toLowerCase().includes(q);
        case "vehicle":
          return (item.regNumber ?? "").toLowerCase().includes(q);
        default:
          return (
            String(item.token_no).toLowerCase().includes(q) ||
            (item.name ?? "").toLowerCase().includes(q) ||
            (item.regNumber ?? "").toLowerCase().includes(q)
          );
      }
    });
  }
  if (dateRange.active) {
    const startH24 = to24(dateRange.startHour, dateRange.startAmPm);
    const endH24 = to24(dateRange.endHour, dateRange.endAmPm);
    const rangeStart = new Date(dateRange.startDate);
    rangeStart.setHours(startH24, dateRange.startMinute, 0, 0);
    const rangeEnd = new Date(dateRange.endDate);
    rangeEnd.setHours(endH24, dateRange.endMinute, 59, 999);
    result = result.filter((item) => {
      const t = item.entry_time ? new Date(item.entry_time) : null;
      if (!t) return false;
      return t >= rangeStart && t <= rangeEnd;
    });
  }
  return result;
}

// ── Compact inline TimeField ──────────────────────────────────────────────────
// Renders as: [label]  [HH] : [MM]  [AM|PM]
// All editable via keyboard – no chevrons, matches the Figma design exactly.
function TimeField({
  label,
  h24,
  min,
  setH24,
  setMin,
  isActive,
  onActivate,
  isDark,
  textColor,
  subColor,
  borderC,
  inputBg,
}: {
  label: string;
  h24: number;
  min: number;
  setH24: (v: number) => void;
  setMin: (v: number) => void;
  isActive: boolean;
  onActivate: () => void;
  isDark: boolean;
  textColor: string;
  subColor: string;
  borderC: string;
  inputBg: string;
}) {
  const d = from24(h24);
  const displayHour = d.hour === 0 ? 12 : d.hour;
  const ampm = d.ampm;

  const [hourText, setHourText] = useState(pad2(displayHour));
  const [minText, setMinText] = useState(pad2(min));
  const hourRef = useRef<TextInput>(null);
  const minRef = useRef<TextInput>(null);

  // Sync external h24/min → local text when not focused
  React.useEffect(() => {
    setHourText(pad2(displayHour));
  }, [h24]);
  React.useEffect(() => {
    setMinText(pad2(min));
  }, [min]);

  function commitHour(text: string) {
    let v = parseInt(text, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 12) v = 12;
    setH24(ampm === "AM" ? (v === 12 ? 0 : v) : v === 12 ? 12 : v + 12);
    setHourText(pad2(v));
  }

  function commitMin(text: string) {
    let v = parseInt(text, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (v > 59) v = 59;
    setMin(v);
    setMinText(pad2(v));
  }

  function toggleAmPm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ampm === "AM") {
      setH24(h24 === 0 ? 12 : h24 + 12);
    } else {
      setH24(h24 === 12 ? 0 : h24 - 12);
    }
  }

  const pillBg = isActive ? primaryRed : inputBg;
  const pillBorder = isActive ? primaryRed : borderC;
  const pillTextColor = isActive ? "#FFF" : textColor;
  const pillSubColor = isActive ? "rgba(255,255,255,0.75)" : subColor;
  const ampmActiveBg = isActive
    ? "rgba(255,255,255,0.25)"
    : isDark
      ? borderC
      : "#E8EBEC";

  return (
    <Pressable
      onPress={() => {
        onActivate();
        hourRef.current?.focus();
      }}
      style={[
        tfStyles.pill,
        { backgroundColor: pillBg, borderColor: pillBorder },
      ]}
    >
      <Text style={[tfStyles.pillLabel, { color: pillSubColor }]}>{label}</Text>

      <View style={tfStyles.timeInputRow}>
        {/* Hour */}
        <TextInput
          ref={hourRef}
          style={[tfStyles.timeSegInput, { color: pillTextColor }]}
          value={hourText}
          onFocus={() => {
            onActivate();
            setHourText("");
          }}
          onBlur={() => commitHour(hourText || pad2(displayHour))}
          onChangeText={(t) => {
            const digits = t.replace(/[^0-9]/g, "").slice(-2);
            setHourText(digits);
            if (digits.length === 2) {
              commitHour(digits);
              minRef.current?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          returnKeyType="next"
          onSubmitEditing={() => minRef.current?.focus()}
        />

        <Text style={[tfStyles.colon, { color: pillTextColor }]}>:</Text>

        {/* Minute */}
        <TextInput
          ref={minRef}
          style={[tfStyles.timeSegInput, { color: pillTextColor }]}
          value={minText}
          onFocus={() => {
            onActivate();
            setMinText("");
          }}
          onBlur={() => commitMin(minText || pad2(min))}
          onChangeText={(t) => {
            const digits = t.replace(/[^0-9]/g, "").slice(-2);
            setMinText(digits);
            if (digits.length === 2) commitMin(digits);
          }}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          returnKeyType="done"
        />

        {/* AM / PM toggle */}
        <TouchableOpacity
          onPress={toggleAmPm}
          style={[
            tfStyles.ampmToggle,
            { backgroundColor: isActive ? ampmActiveBg : "transparent" },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[tfStyles.ampmTxt, { color: pillTextColor }]}>
            {ampm}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const tfStyles = StyleSheet.create({
  pill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  pillLabel: {
    fontFamily: FONT_POPPINS,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  timeSegInput: {
    fontFamily: FONT_POPPINS,
    fontSize: 20,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "center",
    padding: 0,
    letterSpacing: 0.5,
  },
  colon: {
    fontFamily: FONT_POPPINS,
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 1,
  },
  ampmToggle: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ampmTxt: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

// ── Calendar Modal ────────────────────────────────────────────────────────────
function DateTimeModal({
  visible,
  initial,
  onApply,
  onClose,
  isDark,
  theme,
}: {
  visible: boolean;
  initial: DateRange;
  onApply: (r: DateRange) => void;
  onClose: () => void;
  isDark: boolean;
  theme: any;
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(initial.startDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [startDate, setStartDate] = useState(new Date(initial.startDate));
  const [endDate, setEndDate] = useState(new Date(initial.endDate));
  const [selectingEnd, setSelectingEnd] = useState(false);

  const [startH24, setStartH24] = useState(() =>
    to24(initial.startHour, initial.startAmPm),
  );
  const [startMin, setStartMin] = useState(initial.startMinute);
  const [endH24, setEndH24] = useState(() =>
    to24(initial.endHour, initial.endAmPm),
  );
  const [endMin, setEndMin] = useState(initial.endMinute);
  const [activeTimeField, setActiveTimeField] = useState<
    "start" | "end" | null
  >(null);

  // ── Track keyboard visibility so we can auto-scroll to time pickers ──
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      // Small delay so layout settles, then scroll to bottom to show time pickers
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bg = isDark ? theme.backgroundDefault : "#FFFFFF";
  const textColor = isDark ? theme.text : "#1A1A1A";
  const subColor = isDark ? theme.textSecondary : "#6B7280";
  const borderC = isDark ? theme.border : "#E8EBEC";
  const inputBg = isDark ? theme.backgroundRoot : "#F4F6F7";

  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  function inRange(day: number) {
    const d = new Date(calMonth.year, calMonth.month, day);
    return d > startDate && d < endDate;
  }
  function isStart(day: number) {
    return isSameDay(new Date(calMonth.year, calMonth.month, day), startDate);
  }
  function isEnd(day: number) {
    return isSameDay(new Date(calMonth.year, calMonth.month, day), endDate);
  }

  // Today midnight — used to block all future dates
  const todayMidnight = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  function isFutureDay(day: number): boolean {
    const d = new Date(calMonth.year, calMonth.month, day);
    d.setHours(0, 0, 0, 0);
    return d > todayMidnight;
  }

  // Is the calendar already showing the current month? If yes, block "next ›"
  const isOnCurrentOrFutureMonth = useMemo(() => {
    return (
      calMonth.year > todayMidnight.getFullYear() ||
      (calMonth.year === todayMidnight.getFullYear() &&
        calMonth.month >= todayMidnight.getMonth())
    );
  }, [calMonth, todayMidnight]);

  // ── FIX: Only disable future dates. Same-day selection (from == to) is allowed. ──
  function isDisabled(day: number): boolean {
    if (isFutureDay(day)) return true;
    return false;
  }

  // ── FIX: Allow tapping the same day for both from and to dates. ──
  function onDayPress(day: number) {
    if (isDisabled(day)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(calMonth.year, calMonth.month, day);
    if (!selectingEnd) {
      setStartDate(d);
      // If new start is after current end, reset end to same day
      if (d > endDate) setEndDate(d);
      setSelectingEnd(true);
    } else {
      if (d < startDate) {
        // Tapped before start → swap: new start = tapped, new end = old start
        setEndDate(startDate);
        setStartDate(d);
      } else {
        // Same day OR any day after start → all allowed
        setEndDate(d);
      }
      setSelectingEnd(false);
    }
  }

  function prevMonth() {
    setCalMonth((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 },
    );
  }
  function nextMonth() {
    setCalMonth((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 },
    );
  }

  function handleApply() {
    Keyboard.dismiss();
    const sd = from24(startH24);
    const ed = from24(endH24);
    onApply({
      startDate,
      endDate,
      startHour: sd.hour,
      startMinute: startMin,
      startAmPm: sd.ampm,
      endHour: ed.hour,
      endMinute: endMin,
      endAmPm: ed.ampm,
      active: true,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <KeyboardAvoidingView
        style={tmStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Tap outside to dismiss keyboard */}
        <Pressable
          style={tmStyles.overlayTap}
          onPress={() => Keyboard.dismiss()}
        />

        <View style={[tmStyles.sheet, { backgroundColor: bg }]}>
          {/* ── Fixed header (always visible) ── */}
          <View style={tmStyles.sheetHeader}>
            <Text style={[tmStyles.sheetTitle, { color: textColor }]}>
              Date & Time Range
            </Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[tmStyles.closeX, { color: subColor }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Scrollable body — calendar collapses, time pickers scroll into view ── */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tmStyles.scrollContent}
          >
            {/* Date pills */}
            <View style={tmStyles.datePills}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectingEnd(false);
                }}
                style={[
                  tmStyles.datePill,
                  { borderColor: borderC },
                  !selectingEnd && {
                    backgroundColor: primaryRed,
                    borderColor: primaryRed,
                  },
                ]}
              >
                <Text
                  style={[
                    tmStyles.datePillTxt,
                    { color: !selectingEnd ? "#FFF" : subColor },
                  ]}
                >
                  {formatDisplayDate(startDate)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectingEnd(true);
                }}
                style={[
                  tmStyles.datePill,
                  { borderColor: borderC },
                  selectingEnd && {
                    backgroundColor: primaryRed,
                    borderColor: primaryRed,
                  },
                ]}
              >
                <Text
                  style={[
                    tmStyles.datePillTxt,
                    { color: selectingEnd ? "#FFF" : subColor },
                  ]}
                >
                  {formatDisplayDate(endDate)}
                </Text>
              </Pressable>
            </View>

            {/* Calendar — hidden when keyboard is open to save space */}
            {!keyboardVisible && (
              <>
                {/* Month navigator */}
                <View style={tmStyles.monthNav}>
                  <TouchableOpacity onPress={prevMonth} style={tmStyles.navBtn}>
                    <Text style={[tmStyles.navArrow, { color: textColor }]}>
                      ‹
                    </Text>
                  </TouchableOpacity>
                  <Text style={[tmStyles.monthLabel, { color: textColor }]}>
                    {MONTHS_LONG[calMonth.month]} {calMonth.year}
                  </Text>
                  <TouchableOpacity
                    onPress={nextMonth}
                    disabled={isOnCurrentOrFutureMonth}
                    style={[
                      tmStyles.navBtn,
                      isOnCurrentOrFutureMonth && { opacity: 0.25 },
                    ]}
                  >
                    <Text
                      style={[
                        tmStyles.navArrow,
                        {
                          color: isOnCurrentOrFutureMonth
                            ? "#ADADAD"
                            : textColor,
                        },
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={tmStyles.dayHeaders}>
                  {DAYS.map((d) => (
                    <Text
                      key={d}
                      style={[tmStyles.dayHeader, { color: subColor }]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={tmStyles.calGrid}>
                  {cells.map((day, i) => {
                    if (!day)
                      return <View key={`e${i}`} style={tmStyles.calCell} />;
                    const start = isStart(day);
                    const end = isEnd(day);
                    const range = inRange(day);
                    const future = isFutureDay(day);
                    const disabled = isDisabled(day);
                    const today = isSameDay(
                      new Date(calMonth.year, calMonth.month, day),
                      new Date(),
                    );
                    // Both start and end on same day — show single red circle
                    const sameDay = start && end;

                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => onDayPress(day)}
                        disabled={disabled}
                        activeOpacity={disabled ? 1 : 0.7}
                        style={[
                          tmStyles.calCell,
                          // Range highlight
                          range &&
                            !future && {
                              backgroundColor: isDark
                                ? "rgba(211,54,54,0.15)"
                                : "#FBEBEB",
                            },
                          // Active selected endpoint (red circle)
                          (start || end) && {
                            backgroundColor: primaryRed,
                            borderRadius: 20,
                          },
                          // Future day — faded
                          future && { opacity: 0.28 },
                        ]}
                      >
                        <Text
                          style={[
                            tmStyles.calDayTxt,
                            { color: textColor },
                            range &&
                              !future && {
                                color: isDark ? "#E57373" : primaryRed,
                              },
                            (start || end) && {
                              color: "#FFF",
                              fontWeight: "700",
                            },
                            today &&
                              !start &&
                              !end &&
                              !future && {
                                color: primaryRed,
                                fontWeight: "600",
                              },
                            future && {
                              color: isDark ? "#666" : "#BCBCBC",
                              fontWeight: "400",
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* When keyboard visible, show a compact "tap to pick dates" hint */}
            {keyboardVisible && (
              <Pressable
                onPress={() => Keyboard.dismiss()}
                style={[
                  tmStyles.calCollapsedHint,
                  { borderColor: borderC, backgroundColor: inputBg },
                ]}
              >
                <Text
                  style={[tmStyles.calCollapsedHintTxt, { color: subColor }]}
                >
                  📅 Tap here to close keyboard and pick dates
                </Text>
              </Pressable>
            )}

            {/* Divider */}
            <View
              style={[tmStyles.timeDivider, { backgroundColor: borderC }]}
            />

            {/* Time pickers */}
            <View style={tmStyles.timeRow}>
              <TimeField
                label="Start"
                h24={startH24}
                min={startMin}
                setH24={setStartH24}
                setMin={setStartMin}
                isActive={activeTimeField === "start"}
                onActivate={() => setActiveTimeField("start")}
                isDark={isDark}
                textColor={textColor}
                subColor={subColor}
                borderC={borderC}
                inputBg={inputBg}
              />
              <TimeField
                label="End"
                h24={endH24}
                min={endMin}
                setH24={setEndH24}
                setMin={setEndMin}
                isActive={activeTimeField === "end"}
                onActivate={() => setActiveTimeField("end")}
                isDark={isDark}
                textColor={textColor}
                subColor={subColor}
                borderC={borderC}
                inputBg={inputBg}
              />
            </View>

            {/* Actions */}
            <View style={tmStyles.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={[tmStyles.cancelBtn, { borderColor: borderC }]}
              >
                <Text style={[tmStyles.cancelTxt, { color: textColor }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} style={tmStyles.applyBtn}>
                <Text style={tmStyles.applyTxt}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const tmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  overlayTap: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "92%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sheetTitle: { fontFamily: FONT_POPPINS, fontSize: 16, fontWeight: "700" },
  closeX: { fontFamily: FONT_POPPINS, fontSize: 18, fontWeight: "600" },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  datePills: { flexDirection: "row", gap: 10, marginBottom: 16 },
  datePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  datePillTxt: { fontFamily: FONT_POPPINS, fontSize: 13, fontWeight: "600" },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: { padding: 6 },
  navArrow: { fontFamily: FONT_POPPINS, fontSize: 22, fontWeight: "600" },
  monthLabel: { fontFamily: FONT_POPPINS, fontSize: 15, fontWeight: "600" },

  dayHeaders: { flexDirection: "row", marginBottom: 4 },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONT_POPPINS,
    fontSize: 11,
    fontWeight: "500",
  },

  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayTxt: { fontFamily: FONT_POPPINS, fontSize: 13 },

  calCollapsedHint: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  calCollapsedHintTxt: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "500",
  },

  timeDivider: { height: 1, marginVertical: 14 },

  timeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },

  actionRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelTxt: { fontFamily: FONT_POPPINS, fontSize: 14, fontWeight: "600" },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: primaryRed,
    alignItems: "center",
  },
  applyTxt: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
});

// ── TicketCard ────────────────────────────────────────────────────────────────
function TicketCard({
  item,
  variant,
  onPress,
  isDark,
  theme,
}: {
  item: TicketListItem;
  variant: "Delayed" | "Open" | "Closed";
  onPress: () => void;
  isDark?: boolean;
  theme?: {
    backgroundDefault: string;
    border: string;
    text: string;
    textSecondary: string;
  };
}) {
  const isDelayed = variant === "Delayed";
  const timeBadgeBg = isDelayed ? "#FBEBEB" : "#E8F7F5";
  const timeBadgeColor = isDelayed ? "#D33636" : "#147D6A";
  const cardBg =
    isDark && theme ? theme.backgroundDefault : DesignTokens.login.cardBg;
  const cardBorder = isDark && theme ? theme.border : "#E8EBEC";
  const ticketIdColor =
    isDark && theme ? theme.text : DesignTokens.login.otpText;
  const cardDateColor =
    isDark && theme ? theme.textSecondary : DesignTokens.login.termsText;
  const avatarBg = isDark && theme ? theme.border : "#E8EBEC";
  const driverNameColor =
    isDark && theme ? theme.text : DesignTokens.login.otpText;
  const driverRoleColor =
    isDark && theme ? theme.textSecondary : DesignTokens.login.termsText;

  const timeLabel =
    variant === "Closed"
      ? formatDurationHours(item.entry_time, item.exit_time)
      : formatWaitingLabel(item.entry_time);

  const driverName = item.name ?? "—";
  const role = getEntryTypeDisplayLabel(item.type);

  return (
    <View style={styles.cardWrapper}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.card,
          isDark &&
            theme && { backgroundColor: cardBg, borderColor: cardBorder },
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <Text
                style={[
                  styles.ticketId,
                  isDark && theme && { color: ticketIdColor },
                ]}
              >
                #{item.token_no}
              </Text>
              <Text
                style={[
                  styles.cardDate,
                  isDark && theme && { color: cardDateColor },
                ]}
              >
                {formatEntryTime(item.entry_time)}
              </Text>
            </View>
            <View style={[styles.timeBadge, { backgroundColor: timeBadgeBg }]}>
              <Text
                style={[styles.timeBadgeValue, { color: timeBadgeColor }]}
                numberOfLines={1}
              >
                {timeLabel}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.divider,
              isDark && theme && { backgroundColor: cardBorder },
            ]}
          />
          <View style={styles.driverRow}>
            <View
              style={[
                styles.avatarPlaceholder,
                isDark && theme && { backgroundColor: avatarBg },
              ]}
            >
              <Text
                style={[
                  styles.avatarLetter,
                  isDark && theme && { color: ticketIdColor },
                ]}
              >
                {driverName !== "—"
                  ? driverName.trim().charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text
                style={[
                  styles.driverName,
                  isDark && theme && { color: driverNameColor },
                ]}
                numberOfLines={1}
              >
                {driverName}
              </Text>
              {!!item.regNumber && (
                <View
                  style={[
                    styles.regInlineWrap,
                    {
                      backgroundColor:
                        isDark && theme ? "rgba(255,255,255,0.07)" : "#F1F5F9",
                      borderColor: isDark && theme ? theme.border : "#CBD5E1",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.regInline,
                      {
                        color:
                          isDark && theme ? theme.textSecondary : "#475569",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.regNumber.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.driverRole,
                  isDark && theme && { color: driverRoleColor },
                ]}
                numberOfLines={1}
              >
                {role}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }}
            style={({ pressed }) => [
              styles.viewDetailBtn,
              pressed && styles.viewDetailBtnPressed,
            ]}
          >
            <Text style={styles.viewDetailBtnText}>View Detail</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>("Open");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<DateRange>(makeTodayRange);
  const [showCalModal, setShowCalModal] = useState(false);
  // Increment to force-remount DateTimeModal with fresh state each open
  const [modalKey, setModalKey] = useState(0);

  // ── Reset ALL filters when screen loses focus (user navigates away) ──────
  useFocusEffect(
    useCallback(() => {
      // runs on focus — nothing to do on enter
      return () => {
        // runs when screen goes out of focus (back navigation etc.)
        setSearchQuery("");
        setFilterType("all");
        setDateRange(makeTodayRange());
      };
    }, []),
  );

  // ── Reset all filters manually (e.g. "Reset" button) ────────────────────
  const resetAllFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery("");
    setFilterType("all");
    setDateRange(makeTodayRange());
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || filterType !== "all" || dateRange.active;

  const handleTabSwitch = (tab: TabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setFilterType("all");
  }, []);

  const clearDateFilter = useCallback(() => {
    setDateRange(makeTodayRange());
  }, []);

  const openCalModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bump key → DateTimeModal remounts with fresh internal state (not last applied values)
    setModalKey((k) => k + 1);
    setShowCalModal(true);
  }, []);

  const {
    data: counts = { open: 0, closed: 0, delayed: 0 },
    isLoading: loadingCounts,
    isRefetching: refetchingCounts,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["ticket-counts"],
    queryFn: () => getTicketCounts(auth.accessToken),
    staleTime: STALE_TIME_MS,
  });

  const openQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "open"],
    queryFn: ({ pageParam }) =>
      getTicketList("open", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Open",
  });

  const delayedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "delayed"],
    queryFn: ({ pageParam }) =>
      getTicketList("delayed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Delayed",
  });

  const closedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "closed"],
    queryFn: ({ pageParam }) =>
      getTicketList("closed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
    enabled: activeTab === "Closed",
  });

  const activeQuery = useMemo(() => {
    if (activeTab === "Delayed") return delayedQuery;
    if (activeTab === "Closed") return closedQuery;
    return openQuery;
  }, [activeTab, openQuery, delayedQuery, closedQuery]);

  const isLoading = loadingCounts || activeQuery.isLoading;
  const isRefetching = refetchingCounts || activeQuery.isRefetching;
  const refetch = () => {
    refetchCounts();
    activeQuery.refetch();
  };

  const { currentList, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMemo(
      () => ({
        currentList: activeQuery.data?.pages.flatMap((p) => p.list) ?? [],
        fetchNextPage: activeQuery.fetchNextPage,
        hasNextPage: activeQuery.hasNextPage ?? false,
        isFetchingNextPage: activeQuery.isFetchingNextPage,
      }),
      [
        activeQuery.data?.pages,
        activeQuery.fetchNextPage,
        activeQuery.hasNextPage,
        activeQuery.isFetchingNextPage,
      ],
    );

  const filteredList = useMemo(
    () => applySearch(currentList, searchQuery, filterType, dateRange),
    [currentList, searchQuery, filterType, dateRange],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "Open", label: "Open", count: counts.open },
    { id: "Delayed", label: "Delayed", count: counts.delayed },
    { id: "Closed", label: "Closed", count: counts.closed },
  ];

  const footerTotalHeight = useFooterTotalHeight();
  const listContentPaddingBottom = footerTotalHeight;
  const showShimmer = isLoading || isRefetching;

  const screenBg = isDark ? theme.backgroundRoot : DesignTokens.login.cardBg;
  const headerBg = isDark ? theme.backgroundDefault : DesignTokens.login.cardBg;
  const headerTitleColor = isDark ? theme.text : DesignTokens.login.otpText;
  const tabLabelActiveColor = isDark ? theme.primary : primaryRed;
  const tabLabelInactiveColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.otpText;
  const emptyTextColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.termsText;
  const loadMoreTextColor = isDark
    ? theme.textSecondary
    : DesignTokens.login.termsText;
  const searchBg = isDark ? theme.backgroundRoot : "#F4F6F7";
  const searchBorder = isDark ? theme.border : "#E8EBEC";
  const searchText = isDark ? theme.text : DesignTokens.login.otpText;
  const searchPlaceholder = isDark ? theme.textSecondary : "#9CA3AF";
  const chipActiveBg = isDark ? theme.primary : primaryRed;
  const chipInactiveBg = isDark ? theme.backgroundRoot : "#F4F6F7";
  const chipActiveBorder = isDark ? theme.primary : primaryRed;
  const chipInactiveBorder = isDark ? theme.border : "#E8EBEC";

  const searchPlaceholderText =
    filterType === "token"
      ? "Enter token number…"
      : filterType === "name"
        ? "Enter driver name…"
        : filterType === "vehicle"
          ? "Enter vehicle reg. no…"
          : "Search by token, name, vehicle…";

  const dateBadgeLabel = dateRange.active
    ? `${formatDisplayDate(dateRange.startDate)} – ${formatDisplayDate(dateRange.endDate)}`
    : null;

  return (
    <View style={[styles.screen, isDark && { backgroundColor: screenBg }]}>
      <View
        style={[
          styles.headerSection,
          { paddingTop: insets.top },
          isDark && { backgroundColor: headerBg },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <Text
            style={[styles.headerTitle, isDark && { color: headerTitleColor }]}
          >
            Tickets
          </Text>
          {/* Reset All — only visible when any filter is active */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={resetAllFilters}
              style={[styles.resetBtn, { borderColor: primaryRed }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.resetBtnTxt}>✕ Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputWrap,
              { backgroundColor: searchBg, borderColor: searchBorder },
            ]}
          >
            <Text style={[styles.searchIcon, { color: searchPlaceholder }]}>
              🔍
            </Text>
            <TextInput
              style={[styles.searchInput, { color: searchText }]}
              placeholder={searchPlaceholderText}
              placeholderTextColor={searchPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[styles.clearBtnText, { color: searchPlaceholder }]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={openCalModal}
            style={[
              styles.calBtn,
              {
                backgroundColor: dateRange.active ? primaryRed : searchBg,
                borderColor: dateRange.active ? primaryRed : searchBorder,
              },
            ]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.calBtnIcon}>🗓️</Text>
          </TouchableOpacity>

          {searchQuery.length > 0 && (
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeText}>
                {filteredList.length}
                {"\n"}found
              </Text>
            </View>
          )}
        </View>

        {dateBadgeLabel && (
          <View style={styles.activeDateBadgeRow}>
            <View style={[styles.activeDateBadge, { borderColor: primaryRed }]}>
              <Text style={styles.activeDateBadgeIcon}>📅</Text>
              <Text style={styles.activeDateBadgeTxt} numberOfLines={1}>
                {dateBadgeLabel}
              </Text>
              <TouchableOpacity
                onPress={clearDateFilter}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.activeDateBadgeClear}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.filterChipRow}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterType === opt.id;
            const labelColor = isActive
              ? "#FFFFFF"
              : isDark
                ? theme.text
                : DesignTokens.login.otpText;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterType(opt.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? chipActiveBg : chipInactiveBg,
                    borderColor: isActive
                      ? chipActiveBorder
                      : chipInactiveBorder,
                  },
                ]}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text style={[styles.chipLabel, { color: labelColor }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabSwitch(tab.id)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                    isDark && {
                      color: isActive
                        ? tabLabelActiveColor
                        : tabLabelInactiveColor,
                    },
                  ]}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showShimmer ? (
        <TicketListShimmer count={6} />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketCard
              item={item}
              variant={activeTab}
              onPress={() =>
                navigation.navigate("TicketDetail", { ticketId: item.id })
              }
              isDark={isDark}
              theme={theme}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listContentPaddingBottom },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text
                style={[styles.emptyText, isDark && { color: emptyTextColor }]}
              >
                {searchQuery.length > 0 || dateRange.active
                  ? "No tickets match your filters"
                  : `No ${activeTab.toLowerCase()} tickets`}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage && isFetchingNextPage ? (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator
                  size="small"
                  color={isDark ? theme.primary : primaryRed}
                />
                <Text
                  style={[
                    styles.loadMoreText,
                    isDark && { color: loadMoreTextColor },
                  ]}
                >
                  Loading more…
                </Text>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={isDark ? theme.primary : primaryRed}
            />
          }
        />
      )}

      <AppFooter activeTab="Ticket" />

      <DateTimeModal
        key={modalKey}
        visible={showCalModal}
        initial={makeTodayRange()}
        onApply={(r) => {
          setDateRange(r);
          setShowCalModal(false);
        }}
        onClose={() => setShowCalModal(false)}
        isDark={isDark}
        theme={theme}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DesignTokens.login.cardBg },
  list: { flex: 1 },

  headerSection: {
    paddingHorizontal: Layout.horizontalScreenPadding,
    paddingBottom: 0,
    backgroundColor: DesignTokens.login.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  headerTitleRow: {
    paddingVertical: Spacing.md + 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },

  resetBtn: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  resetBtnTxt: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "700",
    color: primaryRed,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 50,
    gap: Spacing.xs,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: { padding: 2 },
  clearBtnText: { fontSize: 13, fontWeight: "600" },

  calBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  calBtnIcon: { fontSize: 20 },

  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E8F7F5",
    borderRadius: 10,
    alignItems: "center",
  },
  resultBadgeText: {
    fontFamily: FONT_POPPINS,
    fontSize: 10,
    fontWeight: "700",
    color: "#147D6A",
    textAlign: "center",
  },

  activeDateBadgeRow: { marginBottom: Spacing.sm },
  activeDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#FFF0F0",
  },
  activeDateBadgeIcon: { fontSize: 12 },
  activeDateBadgeTxt: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "600",
    color: primaryRed,
    maxWidth: 220,
  },
  activeDateBadgeClear: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "700",
    color: primaryRed,
  },

  filterChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontFamily: FONT_POPPINS, fontSize: 12, fontWeight: "600" },

  tabBar: {
    flexDirection: "row",
    minHeight: Layout.minTouchTarget,
    alignItems: "stretch",
  },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: primaryRed },
  tabLabel: { fontFamily: FONT_POPPINS, fontSize: 14 },
  tabLabelActive: { color: primaryRed, fontWeight: "600" },
  tabLabelInactive: { color: DesignTokens.login.otpText, fontWeight: "400" },

  listContent: {
    flexGrow: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Layout.horizontalScreenPadding,
    width: "100%",
  },
  emptyWrap: { paddingVertical: Spacing["3xl"], alignItems: "center" },
  emptyText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },
  loadMoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadMoreText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    color: DesignTokens.login.termsText,
  },

  cardWrapper: { marginBottom: Spacing.lg, width: "100%" },
  card: {
    backgroundColor: DesignTokens.login.cardBg,
    borderWidth: 1,
    borderColor: "#E8EBEC",
    borderRadius: BorderRadius.sm,
    padding: Layout.cardPadding,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardPressed: { opacity: 0.92 },
  cardInner: { gap: Spacing.lg },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTopLeft: { flex: 1, minWidth: 0 },
  ticketId: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "800",
    color: DesignTokens.login.otpText,
  },
  cardDate: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    marginTop: Spacing.xs,
  },
  timeBadge: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  timeBadgeValue: { fontFamily: FONT_POPPINS, fontSize: 16, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E8EBEC" },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.contentGap,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8EBEC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontFamily: FONT_POPPINS,
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
  },
  driverInfo: { flex: 1, minWidth: 0, justifyContent: "center" },
  driverName: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "700",
    color: DesignTokens.login.otpText,
  },
  regInlineWrap: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  regInline: {
    fontFamily: FONT_POPPINS,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
  },
  driverRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    marginTop: 2,
  },
  viewDetailBtn: {
    minHeight: Layout.minTouchTarget,
    backgroundColor: "#1DB398",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailBtnPressed: { opacity: 0.9 },
  viewDetailBtnText: {
    fontFamily: FONT_POPPINS,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
