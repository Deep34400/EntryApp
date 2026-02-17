/**
 * Shared navigation param lists and entry types.
 */

export type EntryType = "new_dp" | "old_dp" | "non_dp" | "dp";

export interface EntryFormData {
  phone: string;
  name: string;
  vehicle_reg_number?: string;
}

export type RootStackParamList = {
  LoginOtp: undefined;
  OTPVerification: { phone: string };
  VisitorType: undefined;
  EntryForm: { entryType: EntryType };
  VisitorPurpose: { entryType: EntryType; formData: EntryFormData };
  TokenDisplay: {
    token: string;
    assignee: string;
    desk_location: string;
    driverName?: string;
    driverPhone?: string;
    entryType?: string;
    purpose?: string;
  };
  ExitConfirmation: { token: string };
  TicketList: { filter: "open" | "closed" };
  TicketDetail: { ticketId: string };
  Profile: undefined;
};
