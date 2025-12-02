declare module "@nicokaiser/passport-apple" {
  import { Strategy } from "passport-strategy";

  export interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKey: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface AppleProfile {
    id: string;
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
    provider: string;
    _json?: any;
  }

  export default class AppleStrategy extends Strategy {
    constructor(
      options: AppleStrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        idToken: any,
        profile: AppleProfile,
        done: (error: any, user?: any) => void,
      ) => void,
    );

    name: string;
    authenticate(req: any, options?: any): void;
  }
}
