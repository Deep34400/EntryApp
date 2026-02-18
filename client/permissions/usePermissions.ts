/**
 * Hook for action-level permissions. Uses AuthContext allowedRole and the single permission map.
 * Use in screens to show/hide or enable/disable actions (e.g. Create Entry, Close Ticket).
 */

import { useAuth } from "@/contexts/AuthContext";
import {
  canCreateEntry as canCreateEntryFn,
  canCloseTicket as canCloseTicketFn,
  canVerifyToken as canVerifyTokenFn,
  canGateOperations as canGateOperationsFn,
  canViewTickets as canViewTicketsFn,
} from "./rolePermissions";

export function usePermissions() {
  const { allowedRole } = useAuth();
  return {
    canCreateEntry: canCreateEntryFn(allowedRole),
    canCloseTicket: canCloseTicketFn(allowedRole),
    canVerifyToken: canVerifyTokenFn(allowedRole),
    canGateOperations: canGateOperationsFn(allowedRole),
    canViewTickets: canViewTicketsFn(allowedRole),
  };
}
