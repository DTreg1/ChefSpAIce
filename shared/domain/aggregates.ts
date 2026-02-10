import type { User, AuthProvider, Session, Permission, AuthProviderType } from "./entities";

export interface UserAccount {
  user: User;
  providers: AuthProvider[];
  activeSessions: Session[];
  permission: Permission;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: AuthProviderType;
  isNewUser?: boolean;
  createdAt: string;
}

export function toUserProfile(
  user: User,
  provider: AuthProviderType,
  isNewUser?: boolean
): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.profileImageUrl,
    provider,
    isNewUser,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
  };
}
