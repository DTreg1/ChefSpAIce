// Type definitions for Express extensions
import { UserClaims } from '../replitAuth';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
    linkingProvider?: string;
    linkingUserId?: string;
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
      claims?: UserClaims;  // Made optional since not all auth methods use claims
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};