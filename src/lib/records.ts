import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { comments, parkingRecords, users } from "@/db/schema";

export type RecordRow = typeof parkingRecords.$inferSelect;

export async function hydrateRecords(rows: RecordRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [allComments, allUsers] = await Promise.all([
    db.select().from(comments).where(inArray(comments.recordId, ids)).orderBy(comments.createdAt),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);
  const names = new Map(allUsers.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    id: r.id, plate: r.plate, enteredAt: r.enteredAt, exitedAt: r.exitedAt,
    helmet: r.helmet, billableHours: r.billableHours, amount: r.amount,
    paymentMethod: r.paymentMethod, status: r.status,
    entryUserId: r.entryUserId, exitUserId: r.exitUserId,
    entryUser: names.get(r.entryUserId) || "Usuario", exitUser: r.exitUserId ? names.get(r.exitUserId) || "Usuario" : null,
    comments: allComments.filter((c) => c.recordId === r.id).map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, author: names.get(c.userId) || "Usuario" })),
  }));
}

export type ParkingItem = Awaited<ReturnType<typeof hydrateRecords>>[number];
