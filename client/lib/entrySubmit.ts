/**
 * Shared entry (create ticket) payload builder.
 * Keeps backend payload identical across CategorySelect → purpose screens flow.
 */
import type { EntryFormData } from "@/navigation/RootStackNavigator";
import type { VisitorCategory } from "@/navigation/RootStackNavigator";
import { isPhoneValid, phoneForApi } from "@/utils/validation";

export function getAssignee(category: VisitorCategory | null): string | null {
  if (category === "Maintenance") return "FLEET EXECUTIVE";
  if (category === "Settlement") return "DRIVER MANAGER";
  if (category === "Onboarding") return "ONBOARDING";
  if (category === "Staff") return null;
  return null;
}

export function buildEntryPayload(params: {
  formData: EntryFormData;
  category: VisitorCategory;
  subCategory: string;
  referral?: "yes" | "no";
  referralName?: string;
  userPhone?: string;
  userName?: string;
  /** When "non_dp", payload type is Staff (no driver lookup). */
  entryType?: "non_dp";
}): Record<string, string> {
  const {
    formData,
    category,
    subCategory,
    referral = "no",
    referralName = "",
    userPhone = "",
    userName = "",
    entryType,
  } = params;

  let phone = (formData.phone ?? "").trim() || (userPhone ?? "").trim();
  const name = (formData.name ?? "").trim() || (userName ?? "").trim();
  phone = phoneForApi(phone);

  if (!isPhoneValid(phone)) throw new Error("Please enter a valid 10-digit mobile number.");
  if (!name) throw new Error("Driver name is required.");

  const body: Record<string, string> = {
    type: entryType === "non_dp" ? "Staff" : "Driver Partner",
    name,
    phone,
    category,
    subCategory,
    isReferral: referral === "yes" ? "true" : "false",
  };

  const reg = (formData.vehicle_reg_number ?? "").trim();
  if (reg) body.regNumber = reg;

  if (referral === "yes" && referralName.trim()) body.referralName = referralName.trim();

  const assignee = getAssignee(category);
  if (assignee) body.assignee = assignee;

  return body;
}
