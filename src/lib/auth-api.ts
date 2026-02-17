export {
  sendOtp,
  verifyOtp,
  fetchIdentity,
  refreshTokens,
  isTokenVersionMismatch,
  getDeviceId,
  parseAuthError,
  getDeviceId as getOrCreateDeviceId,
  type VerifyOtpResponse,
  type AuthError,
} from "@/services/authService";
