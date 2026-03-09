import React, {
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
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
import {
  useNavigation,
  useFocusEffect,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "Delayed" | "Open" | "Closed";
type FilterType = "token" | "name" | "vehicle" | "phone";

const FILTER_OPTIONS: { id: FilterType; label: string; icon: string }[] = [
  { id: "phone", label: "Phone", icon: "📞" },
  { id: "vehicle", label: "Vehicle", icon: "🚗" },
  { id: "token", label: "Token #", icon: "🎫" },
  { id: "name", label: "Name", icon: "👤" },
];

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

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT_POPPINS = "Poppins";
const primaryRed = DesignTokens.login.headerRed;
const PAGE_SIZE = 1000;
const STALE_TIME_MS = 60 * 1000;
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

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TicketList"
>;
type TicketListRoute = RouteProp<RootStackParamList, "TicketList">;

// ── Pure helpers ──────────────────────────────────────────────────────────────

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

// FIX #8: Cleaner from24, removed redundant h24===0 branch
function from24(h24: number): { hour: number; ampm: "AM" | "PM" } {
  if (h24 < 12) return { hour: h24 === 0 ? 12 : h24, ampm: "AM" };
  return { hour: h24 === 12 ? 12 : h24 - 12, ampm: "PM" };
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

function formatWaitingLabel(entryTime?: string | null): string {
  const mins = getWaitingMinutes(entryTime);
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// FIX #1: Was slice(-5) showing 5 digits. Fixed to slice(-4) for last 4 digits.
function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return null;
  const last4 = digits.slice(-4);
  return `xxxxxx${last4}`;
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
      const nameStr = String(item.name ?? "");
      const tokenStr = String(item.token_no ?? "");
      const regStr = String(item.regNumber ?? "");
      const phoneStr = String(item.phone ?? "");
      switch (filterType) {
        case "token":
          return tokenStr.toLowerCase().includes(q);
        case "name":
          return nameStr.toLowerCase().includes(q);
        case "vehicle":
          return regStr.toLowerCase().includes(q);
        case "phone":
          return phoneStr.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        default:
          return false;
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

// ── TimeField ─────────────────────────────────────────────────────────────────

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

  // FIX #2: Depend on displayHour (not h24) to avoid stale derived value
  useEffect(() => {
    setHourText(pad2(displayHour));
  }, [displayHour]);
  useEffect(() => {
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
  timeInputRow: { flexDirection: "row", alignItems: "center", gap: 2 },
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

// ── DateTimeModal ─────────────────────────────────────────────────────────────

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
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
  const rawCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = rawCells.length % 7;
  const cells: (number | null)[] =
    remainder === 0
      ? rawCells
      : [...rawCells, ...Array(7 - remainder).fill(null)];

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

  // FIX #3: Document that todayMidnight is intentionally computed once on mount.
  // If the modal is open across midnight, it's an acceptable edge case.
  const todayMidnight = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
    // Intentionally computed once on mount — acceptable edge case if open across midnight
  }, []);

  function isFutureDay(day: number): boolean {
    const d = new Date(calMonth.year, calMonth.month, day);
    d.setHours(0, 0, 0, 0);
    return d > todayMidnight;
  }

  const isOnCurrentOrFutureMonth = useMemo(
    () =>
      calMonth.year > todayMidnight.getFullYear() ||
      (calMonth.year === todayMidnight.getFullYear() &&
        calMonth.month >= todayMidnight.getMonth()),
    [calMonth, todayMidnight],
  );

  function onDayPress(day: number) {
    if (isFutureDay(day)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(calMonth.year, calMonth.month, day);
    if (!selectingEnd) {
      setStartDate(d);
      if (d > endDate) setEndDate(d);
      setSelectingEnd(true);
    } else {
      if (d < startDate) {
        setEndDate(startDate);
        setStartDate(d);
      } else {
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
      animationType="fade"
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
        <Pressable
          style={tmStyles.overlayTap}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={[tmStyles.sheet, { backgroundColor: bg }]}>
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

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tmStyles.scrollContent}
          >
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

            {!keyboardVisible && (
              <>
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
                <View style={tmStyles.calGrid}>
                  {cells.map((day, i) => {
                    if (!day)
                      return <View key={`e${i}`} style={tmStyles.calCell} />;
                    const start = isStart(day),
                      end = isEnd(day),
                      range = inRange(day);
                    const future = isFutureDay(day);
                    const today = isSameDay(
                      new Date(calMonth.year, calMonth.month, day),
                      new Date(),
                    );
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => onDayPress(day)}
                        disabled={future}
                        activeOpacity={future ? 1 : 0.7}
                        style={[
                          tmStyles.calCell,
                          range &&
                            !future && {
                              backgroundColor: isDark
                                ? "rgba(211,54,54,0.15)"
                                : "#FBEBEB",
                            },
                          (start || end) && {
                            backgroundColor: primaryRed,
                            borderRadius: 20,
                          },
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

            <View
              style={[tmStyles.timeDivider, { backgroundColor: borderC }]}
            />
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
          </ScrollView>

          <View
            style={[
              tmStyles.actionRow,
              {
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 20,
                borderTopWidth: 1,
                borderTopColor: borderC,
              },
            ]}
          >
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const tmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayTap: { ...StyleSheet.absoluteFillObject },
  sheet: { width: "100%", borderRadius: 20, paddingTop: 20, maxHeight: "88%" },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sheetTitle: { fontFamily: FONT_POPPINS, fontSize: 16, fontWeight: "700" },
  closeX: { fontFamily: FONT_POPPINS, fontSize: 18, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 4 },
  datePills: { flexDirection: "row", gap: 10, marginBottom: 10 },
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
    marginBottom: 4,
  },
  navBtn: { padding: 6 },
  navArrow: { fontFamily: FONT_POPPINS, fontSize: 22, fontWeight: "600" },
  monthLabel: { fontFamily: FONT_POPPINS, fontSize: 15, fontWeight: "600" },
  dayHeaders: { flexDirection: "row", marginBottom: 2 },
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
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 1,
  },
  calDayTxt: { fontFamily: FONT_POPPINS, fontSize: 13, textAlign: "center" },
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
  timeDivider: { height: 1, marginVertical: 10 },
  timeRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
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
  isAutoClosed,
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
  /** When true (Closed list only), show card with red border for auto-closed ticket. */
  isAutoClosed?: boolean;
}) {
  const isDelayed = variant === "Delayed";

  // FIX #9: Extract theme colors into a single object to avoid 15+ repeated ternaries
  const t =
    isDark && theme
      ? {
          text: theme.text,
          sub: theme.textSecondary,
          border: theme.border,
          bg: theme.backgroundDefault,
          avatar: theme.border,
        }
      : {
          text: DesignTokens.login.otpText,
          sub: DesignTokens.login.termsText,
          border: "#E8EBEC",
          bg: DesignTokens.login.cardBg,
          avatar: "#E8EBEC",
        };

  const timeBadgeBg = isDelayed ? "#FBEBEB" : "#E8F7F5";
  const timeBadgeColor = isDelayed ? "#D33636" : "#147D6A";

  // Auto-closed tickets in Closed list: red border and light red tint
  const isAutoClosedCard = variant === "Closed" && !!isAutoClosed;
  const cardBorderColor = isAutoClosedCard ? primaryRed : t.border;
  const cardBg = isAutoClosedCard ? "#FFF5F5" : t.bg;

  const timeLabel =
    variant === "Closed"
      ? formatDurationHours(item.entry_time, item.exit_time)
      : formatWaitingLabel(item.entry_time);

  const driverName = item.name ?? "—";
  const role = getEntryTypeDisplayLabel(item.type);
  const maskedPhone = maskPhone(item.phone);

  return (
    <View style={styles.cardWrapper}>
      {/* FIX #4: Card Pressable no longer has its own onPress to avoid double-navigation.
          The "View Detail" button is the single, clear tap target for navigation. */}
      <View
        style={[
          styles.card,
          isDark && theme && !isAutoClosedCard && { backgroundColor: t.bg, borderColor: t.border },
          isAutoClosedCard && {
            backgroundColor: isDark ? "rgba(211,54,54,0.08)" : cardBg,
            borderColor: cardBorderColor,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <Text style={[styles.ticketId, { color: t.text }]}>
                #{item.token_no}
              </Text>
              <Text style={[styles.cardDate, { color: t.sub }]}>
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

          <View style={[styles.divider, { backgroundColor: t.border }]} />

          <View style={styles.driverRow}>
            <View
              style={[styles.avatarPlaceholder, { backgroundColor: t.avatar }]}
            >
              <Text style={[styles.avatarLetter, { color: t.text }]}>
                {driverName !== "—"
                  ? driverName.trim().charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text
                style={[styles.driverName, { color: t.text }]}
                numberOfLines={1}
              >
                {driverName}
              </Text>
              <Text
                style={[styles.driverRole, { color: t.sub }]}
                numberOfLines={1}
              >
                {role}
              </Text>
            </View>
            <View style={styles.driverRightInfo}>
              {maskedPhone ? (
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneIcon}>📞</Text>
                  <Text
                    style={[styles.phoneText, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {maskedPhone}
                  </Text>
                </View>
              ) : null}
              {!!item.regNumber && (
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneIcon}>🚗</Text>
                  <Text
                    style={[styles.regText, { color: t.sub }]}
                    numberOfLines={1}
                  >
                    {item.regNumber.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => {
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
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TicketListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketListRoute>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("Open");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("phone");
  const [dateRange, setDateRange] = useState<DateRange>(makeTodayRange);
  const [showCalModal, setShowCalModal] = useState(false);

  // FIX #10: modalKey increments to fully reset DateTimeModal state on each open (intentional)
  const [modalKey, setModalKey] = useState(0);

  // FIX #6: Use a ref for activeTab so useFocusEffect always sees the latest value
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabSwitch = (tab: TabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const clearSearch = useCallback(() => setSearchQuery(""), []);
  const clearDateFilter = useCallback(() => setDateRange(makeTodayRange()), []);

  const openCalModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalKey((k) => k + 1); // reset modal state
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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const openQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "open"],
    queryFn: ({ pageParam }) =>
      getTicketList("open", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    // FIX #7: Null-guard on getNextPageParam
    getNextPageParam: (p) =>
      p?.page != null && p?.limit != null && p?.total != null
        ? p.page * p.limit < p.total
          ? p.page + 1
          : undefined
        : undefined,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: activeTab === "Open",
  });

  const delayedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "delayed"],
    queryFn: ({ pageParam }) =>
      getTicketList("delayed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p?.page != null && p?.limit != null && p?.total != null
        ? p.page * p.limit < p.total
          ? p.page + 1
          : undefined
        : undefined,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: activeTab === "Delayed",
  });

  const closedQuery = useInfiniteQuery({
    queryKey: ["ticket-list", "closed"],
    queryFn: ({ pageParam }) =>
      getTicketList("closed", auth.accessToken, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p?.page != null && p?.limit != null && p?.total != null
        ? p.page * p.limit < p.total
          ? p.page + 1
          : undefined
        : undefined,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: activeTab === "Closed",
  });

  const activeQuery = useMemo(() => {
    if (activeTab === "Delayed") return delayedQuery;
    if (activeTab === "Closed") return closedQuery;
    return openQuery;
  }, [activeTab, openQuery, delayedQuery, closedQuery]);

  const isLoading = loadingCounts || activeQuery.isLoading;
  const isRefetching = refetchingCounts || activeQuery.isRefetching;

  // Pull-to-refresh on the currently visible tab
  const refetch = useCallback(() => {
    refetchCounts();
    activeQuery.refetch();
  }, [refetchCounts, activeQuery]);

  // Keep stable refs so useFocusEffect never has stale closures
  const refetchCountsRef = useRef(refetchCounts);
  refetchCountsRef.current = refetchCounts;

  // In production/native builds, route params can update AFTER focus. useFocusEffect
  // may run with stale params and skip the refetch. Reacting to params in useEffect
  // ensures we refetch whenever the navigator passes refreshFromToken/closedFromTab.
  const refreshFromToken = route.params?.refreshFromToken;
  const closedFromTab = route.params?.closedFromTab as TabId | undefined;

  useEffect(() => {
    if (!refreshFromToken) return;

    refetchCountsRef.current();

    if (closedFromTab) {
      setActiveTab(closedFromTab);
      const sourceKey =
        closedFromTab === "Open"
          ? ["ticket-list", "open"]
          : ["ticket-list", "delayed"];
      queryClient.refetchQueries({ queryKey: sourceKey, exact: true });
      queryClient.refetchQueries({
        queryKey: ["ticket-list", "closed"],
        exact: true,
      });
    } else {
      const tab = activeTabRef.current;
      const key =
        tab === "Open"
          ? ["ticket-list", "open"]
          : tab === "Delayed"
            ? ["ticket-list", "delayed"]
            : ["ticket-list", "closed"];
      queryClient.refetchQueries({ queryKey: key, exact: true });
    }

    navigation.setParams({
      refreshFromToken: undefined,
      closedFromTab: undefined,
    });
  }, [
    refreshFromToken,
    closedFromTab,
    navigation,
    queryClient,
  ]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchQuery("");
        setFilterType("phone");
        setDateRange(makeTodayRange());
      };
    }, []),
  );

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
  const showShimmer = isLoading || isRefetching;

  // Theme shorthands
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
          : "Enter phone number…";

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
              keyboardType={filterType === "phone" ? "phone-pad" : "default"}
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

          {(dateRange.active || searchQuery.length > 0) && (
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipScroll}
          contentContainerStyle={styles.filterChipRow}
          decelerationRate="fast"
          snapToAlignment="start"
          keyboardShouldPersistTaps="handled"
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterType === opt.id;
            const labelColor = isActive
              ? "#FFFFFF"
              : isDark
                ? theme.text
                : DesignTokens.login.otpText;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
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
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
                navigation.navigate("TicketDetail", {
                  ticketId: item.id,
                  fromTab: activeTab,
                })
              }
              isDark={isDark}
              theme={theme}
              isAutoClosed={item.isAutoClosed}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: footerTotalHeight },
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
  filterChipScroll: {
    marginBottom: Spacing.sm,
    marginHorizontal: -Layout.horizontalScreenPadding,
  },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
    paddingLeft: Layout.horizontalScreenPadding,
    paddingRight: 32,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  chipIcon: { fontSize: 13 },
  chipLabel: { fontFamily: FONT_POPPINS, fontSize: 13, fontWeight: "600" },
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
    flexShrink: 0,
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
  driverRole: {
    fontFamily: FONT_POPPINS,
    fontSize: 12,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    marginTop: 2,
  },
  driverRightInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
    flexShrink: 0,
    maxWidth: 140,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneIcon: { fontSize: 11 },
  phoneText: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "600",
    color: DesignTokens.login.otpText,
    letterSpacing: 0.5,
  },
  regText: {
    fontFamily: FONT_POPPINS,
    fontSize: 13,
    fontWeight: "400",
    color: DesignTokens.login.termsText,
    letterSpacing: 0.5,
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
