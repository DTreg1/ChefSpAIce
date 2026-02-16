import { createHash } from "crypto";
import { db } from "../db";
import { users, userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";

export type Session = typeof userSessions.$inferSelect;
export type User = typeof users.$inferSelect;

export type IpAnonymizationMode = "none" | "truncate" | "hash";

function getIpAnonymizationMode(): IpAnonymizationMode {
  const mode = process.env.IP_ANONYMIZATION_MODE?.toLowerCase();
  if (mode === "none" || mode === "hash") return mode;
  return "truncate";
}

function expandIPv6(ip: string): string {
  let halves = ip.split("::");
  if (halves.length === 1) {
    const groups = ip.split(":");
    return groups.map(g => g.padStart(4, "0")).join(":");
  }
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  const middle = Array(missing).fill("0000");
  return [...left, ...middle, ...right].map(g => g.padStart(4, "0")).join(":");
}

export function anonymizeIpAddress(ip: string | undefined): string {
  if (!ip || ip === "unknown") return "unknown";

  const mode = getIpAnonymizationMode();

  if (mode === "none") return ip;

  if (mode === "hash") {
    const salt = process.env.IP_HASH_SALT;
    if (!salt) {
      return anonymizeIpTruncate(ip);
    }
    return createHash("sha256").update(ip + salt).digest("hex").substring(0, 16);
  }

  return anonymizeIpTruncate(ip);
}

function anonymizeIpTruncate(ip: string): string {
  if (ip.includes(":")) {
    const expanded = expandIPv6(ip);
    const groups = expanded.split(":");
    return groups.slice(0, 4).join(":") + ":0:0:0:0";
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  return ip;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSessionByToken(rawToken: string): Promise<Session | null> {
  const hashedToken = hashToken(rawToken);
  const [session] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, hashedToken))
    .limit(1);
  return session ?? null;
}

export async function getUserByToken(rawToken: string): Promise<User | null> {
  const session = await getSessionByToken(rawToken);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return user ?? null;
}
