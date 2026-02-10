export interface Email {
  readonly value: string;
}

export function createEmail(raw: string): Email {
  const normalized = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error("Invalid email address");
  }
  return { value: normalized };
}

export interface Username {
  readonly value: string;
}

export function createUsername(raw: string): Username {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Username cannot be empty");
  }
  if (trimmed.length > 100) {
    throw new Error("Username cannot exceed 100 characters");
  }
  return { value: trimmed };
}

export interface AuthToken {
  readonly raw: string;
  readonly hashed: string;
}

export function createAuthToken(raw: string, hashed: string): AuthToken {
  return { raw, hashed };
}
