import type { AuthProviderType } from "./entities";

interface BaseDomainEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly userId: string;
}

export interface UserSignedUp extends BaseDomainEvent {
  readonly type: "UserSignedUp";
  readonly email: string;
  readonly provider: AuthProviderType;
  readonly referralCode?: string;
}

export interface UserLoggedIn extends BaseDomainEvent {
  readonly type: "UserLoggedIn";
  readonly provider: AuthProviderType;
  readonly sessionId?: string;
}

export interface PermissionGranted extends BaseDomainEvent {
  readonly type: "PermissionGranted";
  readonly tier: string;
  readonly feature?: string;
}

export interface AccountDeleted extends BaseDomainEvent {
  readonly type: "AccountDeleted";
  readonly email: string;
  readonly hadStripeSubscription: boolean;
}

export type DomainEvent = UserSignedUp | UserLoggedIn | PermissionGranted | AccountDeleted;

export function createEvent<T extends DomainEvent>(
  event: Omit<T, "timestamp">
): T {
  return { ...event, timestamp: new Date() } as T;
}
