/**
 * Purpose config — shape from GET /api/v1/config/key/PURPOSE_CONFIG.
 * No hardcoded data; all driven by API.
 */

export interface PurposeConfigSubItem {
  key: string;
  label: string;
  icon_key: string;
}

export interface PurposeConfigItem {
  key: string;
  label: string;
  icon_key: string;
  sub_items?: PurposeConfigSubItem[];
}

export interface PurposeConfigCategory {
  key: string;
  title: string;
  dp_type: "new_dp" | "old_dp" | "staff";
  items: PurposeConfigItem[];
}

export type PurposeConfigValue = PurposeConfigCategory[];

export interface PurposeConfigResponse {
  success: boolean;
  data: {
    id: string;
    key: string;
    value: PurposeConfigValue;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  timestamp?: string;
}
