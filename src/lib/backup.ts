import { mkdir, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/db";
import { closureAudits, comments, dailyClosures, parkSettings, parkingRecords, rates, users } from "@/db/schema";
import { dayKey } from "@/lib/dates";

const globalBackup = globalThis as typeof globalThis & { __motoparkBackupScheduled?: boolean };

async function makeBackup() {
  const snapshot = await db.transaction(async (tx) => ({
    version: 1, exportedAt: new Date().toISOString(),
    users: await tx.select().from(users), rates: await tx.select().from(rates),
    parkingRecords: await tx.select().from(parkingRecords), comments: await tx.select().from(comments),
    dailyClosures: await tx.select().from(dailyClosures), closureAudits: await tx.select().from(closureAudits),
    parkSettings: await tx.select().from(parkSettings),
  }), { isolationLevel: "repeatable read" });
  const folder = process.env.BACKUP_DIR || join(process.cwd(), "backups");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const final = join(folder, `motopark-${dayKey()}.json`);
  const temporary = `${final}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot), { mode: 0o600 });
  await rename(temporary, final);
  const files = (await readdir(/*turbopackIgnore: true*/ folder)).filter((name) => /^motopark-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort().reverse();
  await Promise.all(files.slice(30).map((name) => unlink(join(/*turbopackIgnore: true*/ folder, name)).catch(() => {})));
}

export function startBackupScheduler() {
  if (globalBackup.__motoparkBackupScheduled || process.env.DISABLE_AUTO_BACKUPS === "true") return;
  globalBackup.__motoparkBackupScheduled = true;
  const run = () => { void makeBackup().catch((error) => console.error("No fue posible generar el respaldo automático:", error)); };
  const initial = setTimeout(run, 15_000);
  const periodic = setInterval(run, 24 * 60 * 60 * 1000);
  initial.unref(); periodic.unref();
}
