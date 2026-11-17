import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { rates, sessions, users } from "@/db/schema";

const COOKIE = "motopark_session";
const SESSION_SECONDS = 60 * 60 * 12;
let setupPromise: Promise<void> | undefined;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export async function ensureSetup(): Promise<void> {
  if (!setupPromise) setupPromise = (async () => {
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    const configuredUser = process.env.PARK_ADMIN_USER?.trim().toLowerCase() || "";
    const configuredPassword = process.env.PARK_ADMIN_PASSWORD || "";
    let localDatabase = false;
    try { localDatabase = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(process.env.DATABASE_URL || "").hostname); } catch { /* una conexión desconocida se trata como externa */ }
    const hosted = process.env.NODE_ENV === "production" && !localDatabase;
    const validConfigured = /^[a-z0-9._-]{3,60}$/.test(configuredUser) && configuredPassword.length >= 8 && configuredPassword.length <= 200 && configuredPassword !== "Admin123!";
    if (!existing.length) {
      if (hosted && !validConfigured) {
        throw new Error("Configura PARK_ADMIN_USER y una PARK_ADMIN_PASSWORD propia de al menos 8 caracteres antes del primer acceso.");
      }
      const username = configuredUser || "admin";
      await db.insert(users).values({ name: "Administrador", username, passwordHash: hashPassword(configuredPassword || "Admin123!"), role: "admin" }).onConflictDoNothing();
    } else if (validConfigured) {
      // Solo se reemplaza la contraseña inicial conocida; nunca una contraseña personalizada.
      const [candidate] = await db.select().from(users).where(and(eq(users.username, configuredUser), eq(users.role, "admin"), eq(users.active, true))).limit(1);
      if (candidate && checkPassword("Admin123!", candidate.passwordHash)) {
        await db.transaction(async (tx) => {
          const [locked] = await tx.select().from(users).where(eq(users.id, candidate.id)).for("update");
          if (!locked || !locked.active || !checkPassword("Admin123!", locked.passwordHash)) return;
          await tx.update(users).set({ passwordHash: hashPassword(configuredPassword) }).where(eq(users.id, locked.id));
          await tx.delete(sessions).where(eq(sessions.userId, locked.id));
        });
      }
    }
    const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    const [rate] = await db.select({ id: rates.id }).from(rates).limit(1);
    if (admin && !rate) await db.insert(rates).values({ hourlyValue: 2000, createdBy: admin.id });
  })().catch((error) => { setupPromise = undefined; throw error; });
  return setupPromise;
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export type SafeUser = { id: number; name: string; username: string; role: string; active: boolean };

export async function currentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role, active: users.active })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true))).limit(1);
  return row || null;
}

export async function signIn(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_SECONDS });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  jar.delete(COOKIE);
}
