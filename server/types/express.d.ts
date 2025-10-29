// Type definitions for Express extensions
import { UserClaims } from '../replitAuth';

declare global {
  namespace Express {
    interface User {
      claims: UserClaims;
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};