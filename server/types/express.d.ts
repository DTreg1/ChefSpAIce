// Type definitions for Express extensions
import "express-session";

declare module "express-session" {
  interface SessionData {
    returnTo?: string;
    linkingProvider?: string;
    linkingUserId?: string;
    passport?: {
      user?: {
        id: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        profileImageUrl?: string;
        provider?: string;
        providerId?: string;
      };
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      provider: string;
      providerId: string;
      claims?: {
        sub?: string;
        email?: string;
        name?: string;
        [key: string]: any;
      }; // OAuth claims from ID tokens
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
