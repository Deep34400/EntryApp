/**
 * Centralized permissions — single source of truth for role-based screens and actions.
 * Import from @/permissions or @/permissions/usePermissions.
 */

export {
  getScreensForRole,
  canAccessScreen,
  canDo,
  canCreateEntry,
  canCloseTicket,
  canVerifyToken,
  canGateOperations,
  canViewTickets,
  COMMON_SCREENS,
  type RootScreenName,
  type ActionPermission,
} from "./rolePermissions";

export { usePermissions } from "./usePermissions";
