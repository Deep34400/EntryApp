/**
 * Global API error handling — production-ready.
 * All API errors are parsed centrally and converted to a consistent shape.
 * Technical details (path, timestamp, stack) are never shown to the user.
 */

/** Consistent error object the UI always receives. */
export type NormalizedApiError = {
  title: string;
  message: string;
  statusCode: number;
};

const DEFAULT_FALLBACK_MESSAGE =
  "Something went wrong. Please try again.";

/** Status code → user-facing title (no technical jargon). */
const STATUS_TITLES: Record<number, string> = {
  400: "Invalid request",
  401: "Session expired",
  403: "Access denied",
  404: "Not found",
  500: "Server error",
};

/** Default title when status has no mapping. */
const DEFAULT_TITLE = "Error";

/**
 * Safely extracts a single user-friendly message from backend payload.
 * Handles: message as string, nested message (e.g. message.message),
 * message as array (uses first element), or missing → fallback.
 */
export function extractMessage(body: unknown): string {
  if (body == null) return DEFAULT_FALLBACK_MESSAGE;

  const msg = (body as Record<string, unknown>).message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();

  // Nested: { message: { message: "Ticket already exists...", error, statusCode } }
  if (msg != null && typeof msg === "object" && !Array.isArray(msg)) {
    const nested = (msg as Record<string, unknown>).message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }

  // Array: { message: ["First error", "Second"] }
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

/**
 * Parses status + body into ApiError. Use when you already have the response body (e.g. auth flows).
 */
export function parseApiErrorFromBody(statusCode: number, body: unknown): ApiError {
  const title = getDefaultTitle(statusCode);
  const message = extractMessage(body ?? {});
  return new ApiError({ title, message, statusCode });
}

/** Safe message when response is HTML or server error — never show raw HTML to user. */
const SERVER_UNAVAILABLE_USER_MESSAGE =
  "Service temporarily unavailable. Please try again in a few minutes.";

/**
 * True if the response body looks like HTML (proxy/gateway error page).
 * We must never use this as the user-facing message.
 */
function isHtmlBody(text: string): boolean {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return false;
  return /^\s*<(!doctype|html)\s/i.test(trimmed) || trimmed.toLowerCase().startsWith("<html");
}

/**
 * Parses a failed Response into a normalized API error.
 * Reads body once, never exposes path/timestamp/stack to UI.
 * If the body is HTML (e.g. 503 error page), returns a clean user-safe message — never raw HTML.
 */
export async function parseApiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown = {};
  let text = "";
  try {
    text = await res.text();
    if (text?.trim()) {
      if (isHtmlBody(text)) {
        // Server/gateway returned HTML. Never show it to the user.
        return new ApiError({
          title: res.status >= 500 ? "Server temporarily unavailable" : "Error",
          message: SERVER_UNAVAILABLE_USER_MESSAGE,
          statusCode: res.status,
        });
      }
      body = JSON.parse(text) as unknown;
    }
  } catch {
    // Non-JSON or empty body — if we already have HTML detected above we returned; else body stays {}
    if (text && isHtmlBody(text)) {
      return new ApiError({
        title: res.status >= 500 ? "Server temporarily unavailable" : "Error",
        message: SERVER_UNAVAILABLE_USER_MESSAGE,
        statusCode: res.status,
      });
    }
  }
  return parseApiErrorFromBody(res.status, body);
}

/**
 * Error class that carries the normalized shape.
 * UI can use: error instanceof ApiError → error.title, error.message, error.statusCode.
 */
export class ApiError extends Error implements NormalizedApiError {
  readonly title: string;
  readonly statusCode: number;

  constructor(payload: NormalizedApiError) {
    super(payload.message);
    this.name = "ApiError";
    this.title = payload.title;
    this.statusCode = payload.statusCode;
    // Keeps stack trace useful in logs without exposing to UI
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON(): NormalizedApiError {
    return { title: this.title, message: this.message, statusCode: this.statusCode };
  }
}

/** Type guard for use in catch blocks. */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
