/**
 * Driver details API. All calls go through requestClient — no direct fetch, no auth/server logic here.
 * GET /api/v1/drivers/driver-details?phoneNo=... OR ?regNumber=... (one param at a time).
 * Response: { success, data: { name, phone, vehicles: [{ regNumber, ... }] } }
 */

import { requestWithAuthRetry } from "@/api/requestClient";
import { getDriverDetailsPath } from "@/lib/api-endpoints";

export type DriverVehicle = {
  regNumber: string;
};

export type DriverDetails = {
  name: string;
  phone: string;
  vehicles: DriverVehicle[];
};

/** Raw API response shape */
type DriverDetailsResponse = {
  success?: boolean;
  data?: {
    name?: string;
    phone?: string;
    vehicles?: Array<{ regNumber?: string }>;
  };
};

/**
 * Get driver details by phone OR reg number (send one at a time).
 * Returns null when neither param is provided, path has no query, or on error.
 */
export async function getDriverDetails(params: {
  phoneNo?: string;
  regNumber?: string;
  accessToken?: string | null;
}): Promise<DriverDetails | null> {
  const path = getDriverDetailsPath({
    phoneNo: params.phoneNo?.trim() || undefined,
    regNumber: params.regNumber?.trim() || undefined,
  });
  if (path === "/api/v1/drivers/driver-details") return null;
  try {
    const res = await requestWithAuthRetry("GET", path, undefined, params.accessToken ?? undefined);
    const json = (await res.json()) as DriverDetailsResponse;
    const data = json.data;
    if (!json.success || !data || typeof data.name !== "string" || typeof data.phone !== "string")
      return null;
    const vehicles: DriverVehicle[] = (data.vehicles ?? [])
      .map((v) => (v?.regNumber != null ? String(v.regNumber).trim() : ""))
      .filter(Boolean)
      .map((regNumber) => ({ regNumber }));
    return {
      name: String(data.name).trim(),
      phone: String(data.phone).trim(),
      vehicles,
    };
  } catch {
    return null;
  }
}
