# Global API Error Handling

All API errors are handled **centrally**. The UI never sees raw JSON, paths, or timestamps.

## Error parsing strategy

1. **Single choke point**: Non-2xx responses go through `throwIfResNotOk(res)` in `requestClient.ts`, which calls `parseApiErrorFromResponse(res)`.
2. **Safe message extraction** (`extractMessage` in `lib/api-error.ts`):
   - `message` as string → use it.
   - `message` as object with nested `message` (e.g. NestJS-style) → use `message.message`.
   - `message` as array → use first element.
   - `message` missing → try `error` string.
   - Otherwise → default fallback: *"Something went wrong. Please try again."*
3. **No technical details**: Only `statusCode` and the extracted user-facing string are used. `path`, `timestamp`, and stack are never passed to the UI.

## Consistent UI error object

Every API error thrown to the app is an **`ApiError`** with:

```ts
{
  title: string,   // e.g. "Invalid request"
  message: string, // e.g. "Ticket already exists for this phone number"
  statusCode: number
}
```

- In `catch` / `onError`: use `error.message` for display; optionally `error.title` for a heading or toast title.
- Type guard: `isApiError(error)` or `error instanceof ApiError`.

## Mapping rules (status → title)

| Status | Title (user-facing) |
|--------|----------------------|
| 400    | Invalid request      |
| 401    | Session expired      |
| 403    | Access denied        |
| 404    | Not found            |
| 500    | Server error         |
| Other  | Error                |

Message text always comes from the backend payload when possible (with the extraction rules above), then fallback.

## Example: using in a screen

```ts
import { isApiError } from "@/lib/api-error";

onError: (error: Error) => {
  if (error.message === UNAUTHORIZED_MSG) {
    // handle logout / redirect
    return;
  }
  const message = isApiError(error)
    ? error.message
    : (error.message || "Something went wrong. Please try again.");
  setSubmitError(message);
}
```

## Files

- **`lib/api-error.ts`**: `extractMessage`, `parseApiErrorFromResponse`, `parseApiErrorFromBody`, `ApiError`, `isApiError`, status titles.
- **`api/requestClient.ts`**: `throwIfResNotOk` uses `parseApiErrorFromResponse(res)` so all `apiRequest` / `apiRequestWithAuth` / `requestWithAuthRetry` errors are normalized.

No per-API error handling is required; any new endpoint using these helpers gets the same behavior.
