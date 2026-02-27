import { useAuth } from "@/contexts/AuthContext";
import {
  canCreateEntry as canCreateEntryFn,
  canCloseTicket as canCloseTicketFn,
  canVerifyToken as canVerifyTokenFn,
  canGateOperations as canGateOperationsFn,
  canViewTickets as canViewTicketsFn,
  canViewReports as canViewReportsFn,
} from "./rolePermissions";

export function usePermissions() {
  const { allowedRole } = useAuth();

  return {
    canCreateEntry: canCreateEntryFn(allowedRole),
    canCloseTicket: canCloseTicketFn(allowedRole),
    canVerifyToken: canVerifyTokenFn(allowedRole),
    canGateOperations: canGateOperationsFn(allowedRole),
    canViewTickets: canViewTicketsFn(allowedRole),
    canViewReports: canViewReportsFn(allowedRole), // New Manager Action
  };
}