/**
 * Central API layer. Screens call only these — no direct requestWithAuthRetry in UI.
 */

export {
  getTicketCounts,
  getTicketList,
  getTicketById,
  createTicket,
  updateTicket,
  type TicketCounts,
  type TicketListPageResult,
} from "./ticket/ticket.api";

export { getDriverDetails, type DriverDetails } from "./driver/driver.api";

export { getPurposeConfig } from "./config/config.api";
