/**
 * Single source of truth for role-based screens and actions.
 * All role logic is centralized here — no scattered checks in screens or APIs.
 * Use AllowedRole from AuthContext (guard | hub_manager). "hm" is normalized to hub_manager.
 */

import type { AllowedRole } from "@/contexts/AuthContext";

/** Screen names that exist in RootStackParamList. */
export type RootScreenName =
  | "LoginOtp"
  | "OTPVerification"
  | "NoRoleBlock"
  | "NoHubBlock"
  | "VisitorType"
  | "EntryForm"
  | "VisitorPurpose"
  | "TokenDisplay"
  | "ExitConfirmation"
  | "TicketList"
  | "TicketDetail"
  | "Profile";

/** Screens always available (auth flow + block screens). Not role-gated. */
export const COMMON_SCREENS: readonly RootScreenName[] = [
  "LoginOtp",
  "OTPVerification",
  "NoRoleBlock",
  "NoHubBlock",
];

/** Screens allowed for guard: entry creation, token display, ticket close, gate operations. */
const GUARD_SCREENS: readonly RootScreenName[] = [
  "VisitorType",
  "EntryForm",
  "VisitorPurpose",
  "TokenDisplay",
  "ExitConfirmation",
  "TicketList",
  "TicketDetail",
  "Profile",
];

/** Screens allowed for HM: monitoring, viewing tickets. No entry creation, token display, or gate ops. */
const HM_SCREENS: readonly RootScreenName[] = [
  "VisitorType",
  "EntryForm",
  "VisitorPurpose",
  "TokenDisplay",
  "ExitConfirmation",
  "TicketList",
  "TicketDetail",
  "Profile",
];

/** Returns the list of screen names to register for the given role. Only these screens are reachable. */
export function getScreensForRole(role: AllowedRole | null): readonly RootScreenName[] {
  if (!role) return COMMON_SCREENS;
  if (role === "guard") return [...COMMON_SCREENS, ...GUARD_SCREENS];
  if (role === "hub_manager") return [...COMMON_SCREENS, ...HM_SCREENS];
  return COMMON_SCREENS;
}

/** Returns true if the role is allowed to access the given screen. */
export function canAccessScreen(
  screenName: RootScreenName,
  role: AllowedRole | null,
): boolean {
  if (COMMON_SCREENS.includes(screenName)) return true;
  if (!role) return false;
  if (role === "guard") return GUARD_SCREENS.includes(screenName);
  if (role === "hub_manager") return HM_SCREENS.includes(screenName);
  return false;
}

// ----- Action-level permissions (UI safety: enable/hide destructive or operational actions) -----

export type ActionPermission =
  | "createEntry"
  | "closeTicket"
  | "verifyToken"
  | "gateOperations"
  | "viewTickets"
  | "viewReports";

const GUARD_ACTIONS: readonly ActionPermission[] = [
  "createEntry",
  "closeTicket",
  "verifyToken",
  "gateOperations",
  "viewTickets",
  "viewReports",
];

const HM_ACTIONS: readonly ActionPermission[] = [
  "viewTickets",
  "viewReports",
];

function getActionsForRole(role: AllowedRole | null): readonly ActionPermission[] {
  if (!role) return [];
  if (role === "guard") return GUARD_ACTIONS;
  if (role === "hub_manager") return HM_ACTIONS;
  return [];
}

export function canDo(action: ActionPermission, role: AllowedRole | null): boolean {
  return getActionsForRole(role).includes(action);
}

/** Convenience: can create entry (guard only). */
export function canCreateEntry(role: AllowedRole | null): boolean {
  return canDo("createEntry", role);
}

/** Convenience: can close ticket (guard only). */
export function canCloseTicket(role: AllowedRole | null): boolean {
  return canDo("closeTicket", role);
}

/** Convenience: can verify token / display token (guard only). */
export function canVerifyToken(role: AllowedRole | null): boolean {
  return canDo("verifyToken", role);
}

/** Convenience: gate operations (guard only). */
export function canGateOperations(role: AllowedRole | null): boolean {
  return canDo("gateOperations", role);
}

/** Convenience: view tickets (guard + HM). */
export function canViewTickets(role: AllowedRole | null): boolean {
  return canDo("viewTickets", role);
}
