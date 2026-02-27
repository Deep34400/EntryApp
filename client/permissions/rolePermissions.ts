import type { AllowedRole } from "@/contexts/AuthContext";

export type RootScreenName =
  | "LoginOtp" | "OTPVerification" | "NoRoleBlock" | "NoHubBlock"
  | "VisitorType" | "EntryForm" | "CategorySelect" | "OnboardingPurpose"
  | "SettlementPurpose" | "MaintenancePurpose" | "TokenDisplay"
  | "ExitConfirmation" | "TicketList" | "TicketDetail" | "Profile";

export const COMMON_SCREENS: readonly RootScreenName[] = [
  "LoginOtp",
  "OTPVerification",
  "NoRoleBlock",
  "NoHubBlock",
];

/** Screens for Guard */
const GUARD_SCREENS: readonly RootScreenName[] = [
  "VisitorType",
  "EntryForm",
  "CategorySelect",
  "OnboardingPurpose",
  "SettlementPurpose",
  "MaintenancePurpose",
  "TokenDisplay",
  "ExitConfirmation",
  "TicketList",
  "TicketDetail",
  "Profile",
];

/** * HM_SCREENS inherits EVERYTHING from GUARD_SCREENS.
 * Add manager-only screens here if needed.
 */
const HM_SCREENS: readonly RootScreenName[] = [
  ...GUARD_SCREENS,
];

export function getScreensForRole(role: AllowedRole | null): readonly RootScreenName[] {
  if (!role) return COMMON_SCREENS;
  if (role === "guard") return [...COMMON_SCREENS, ...GUARD_SCREENS];
  if (role === "hub_manager") return [...COMMON_SCREENS, ...HM_SCREENS];
  return COMMON_SCREENS;
}

export function canAccessScreen(screenName: RootScreenName, role: AllowedRole | null): boolean {
  if (COMMON_SCREENS.includes(screenName)) return true;
  if (!role) return false;
  if (role === "guard") return GUARD_SCREENS.includes(screenName);
  if (role === "hub_manager") return HM_SCREENS.includes(screenName);
  return false;
}

// ----- Action-level permissions -----

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
];

/** * HM inherits all Guard actions + gets "viewReports".
 */
const HM_ACTIONS: readonly ActionPermission[] = [
  ...GUARD_ACTIONS,
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

/** Convenience Helpers */
export const canCreateEntry = (r: AllowedRole | null) => canDo("createEntry", r);
export const canCloseTicket = (r: AllowedRole | null) => canDo("closeTicket", r);
export const canVerifyToken = (r: AllowedRole | null) => canDo("verifyToken", r);
export const canGateOperations = (r: AllowedRole | null) => canDo("gateOperations", r);
export const canViewTickets = (r: AllowedRole | null) => canDo("viewTickets", r);
export const canViewReports = (r: AllowedRole | null) => canDo("viewReports", r);