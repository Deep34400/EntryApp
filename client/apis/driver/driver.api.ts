/**
 * Driver details API. All calls go through requestClient — no direct fetch, no auth/server logic here.
 */

import { requestWithAuthRetry } from "@/api/requestClient";
import { getDriverDetailsPath } from "@/lib/api-endpoints";

export type DriverDetails = {
  driver_name: string;
  phone: string;
  reg_number?: string;
};

/** Get driver details by reg_number or phone. Returns null when path has no params or on error. */
export async function getDriverDetails(params: {
  reg_number?: string;
  phone?: string;
  accessToken?: string | null;
}): Promise<DriverDetails | null> {
  const path = getDriverDetailsPath(params);
  if (path === "/api/v1/testRoutes/ticket/driverDetails") return null;
  try {
    const res = await requestWithAuthRetry("GET", path, undefined, params.accessToken ?? undefined);
    const data = (await res.json()) as {
      status?: string;
      results?: {
        driver_name?: string;
        phone?: string;
        vehicles?: Array<{ reg_number?: string }>;
      };
    };
    const results = data.results;
    if (!results || typeof results.driver_name !== "string" || typeof results.phone !== "string")
      return null;
    const reg_number =
      results.vehicles?.[0]?.reg_number != null
        ? String(results.vehicles[0].reg_number).trim()
        : undefined;
    return {
      driver_name: String(results.driver_name).trim(),
      phone: String(results.phone).trim(),
      ...(reg_number ? { reg_number } : {}),
    };
  } catch {
    return null;
  }
}
