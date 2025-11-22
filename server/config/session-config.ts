/**
 * Session Configuration
 * 
 * Configures express-session with PostgreSQL storage
 */

import session from "express-session";
import connectPg from "connect-pg-simple";
import { oauthConfig } from "./oauth-config";

const pgStore = connectPg(session);

export function getSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  return session({
    secret: oauthConfig.session.secret,
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false, // We already have the sessions table
      ttl: sessionTtl,
      tableName: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}