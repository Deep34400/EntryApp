/**
 * Normalized API errors for UI. No technical details exposed.
 */

export type NormalizedApiError = {
  title: string;
  message: string;
  statusCode: number;
};

const DEFAULT_FALLBACK_MESSAGE = "Something went wrong. Please try again.";
const STATUS_TITLES: Record<number, string> = {
  400: "Invalid request",
  401: "Session expired",
  403: "Access denied",
  404: "Not found",
  500: "Server error",
};
const DEFAULT_TITLE = "Error";

export function extractMessage(body: unknown): string {
  if (body == null) return DEFAULT_FALLBACK_MESSAGE;
  const msg = (body as Record<string, unknown>).message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  if (msg != null && typeof msg === "object" && !Array.isArray(msg)) {
    const nested = (msg as Record<string, unknown>).message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0];
    if (typeof first === "string" && first.trim()) return first.trim();
  }
  const err = (body as Record<string, unknown>).error;
  if (typeof err === "string" && err.trim()) return err.trim();
  return DEFAULT_FALLBACK_MESSAGE;
}

export function getDefaultTitle(statusCode: number): string {
  return STATUS_TITLES[statusCode] ?? DEFAULT_TITLE;
}

export function parseApiErrorFromBody(
  statusCode: number,
  body: unknown
): ApiError {
  return new ApiError({
    title: getDefaultTitle(statusCode),
    message: extractMessage(body ?? {}),
    statusCode,
  });
}

export async function parseApiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown = {};
  try {
    const text = await res.text();
    if (text?.trim()) body = JSON.parse(text) as unknown;
  } catch {
    // ignore
  }
  return parseApiErrorFromBody(res.status, body);
}

export class ApiError extends Error implements NormalizedApiError {
  readonly title: string;
  readonly statusCode: number;

  constructor(payload: NormalizedApiError) {
    super(payload.message);
    this.name = "ApiError";
    this.title = payload.title;
    this.statusCode = payload.statusCode;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON(): NormalizedApiError {
    return { title: this.title, message: this.message, statusCode: this.statusCode };
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
