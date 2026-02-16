export {
  getUserPermission,
  canAccessFeature,
  checkLimit,
} from "./PermissionService";

export { deleteAccount } from "./AccountDeletionService";

export {
  registerWithEmail,
  loginWithEmail,
  createSession,
  revokeSession,
  revokeAllOtherSessions,
  logoutSession,
  validatePassword,
  hashPassword,
  verifyPassword,
} from "./AuthenticationService";

export type { RegisterResult, LoginResult } from "./AuthenticationService";
