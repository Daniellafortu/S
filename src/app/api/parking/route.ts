import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, dailyClosures, parkingRecords, rates } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { hydrateRecords } from "@/lib/records";
import { getParkName } from "@/lib/settings";

export const dynamic = "force-dynamic";

function failure(message: string, status = 400) { return Response.json({ error: message }, { status }); }
function cleanText(value: unknown) { return String(value || "").trim(); }
function billed(entered: Date, now: Date, hourly: number) {
  const hours = Math.max(1, Math.ceil((now.getTime() - entered.getTime()) / 3_600_000));
  const amount = hours * hourly;
  if (amount > 2_147_483_647) throw new Error("El valor supera el límite permitido. Revisa la tarifa.");
  return { hours, amount };
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return failure("Debes iniciar sesión.", 401);
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().toUpperCase() || "";
    const rows = await db.select().from(parkingRecords).where(and(eq(parkingRecords.status, "dentro"), query ? ilike(parkingRecords.plate, `%${query}%`) : undefined)).orderBy(desc(parkingRecords.enteredAt));
    const [records, parkName] = await Promise.all([hydrateRecords(rows), getParkName()]);
    return Response.json({ records, parkName, now: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return failure("No fue posible consultar las motos.", 500);
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return failure("Debes iniciar sesión.", 401);
  try {
    const body = await request.json();
    if (body.action === "entry") {
      const plate = cleanText(body.plate).toUpperCase().replace(/[\s-]/g, "");
      const helmet = body.helmet || "sin_especificar";
      const note = cleanText(body.comment);
      if (!/^[A-Z]{3}[0-9]{2}[A-Z0-9]$/.test(plate)) return failure("La placa debe tener 3 letras, 2 números y una letra o número. Ejemplo: ABC12D.");
      if (!["si", "no", "sin_especificar"].includes(helmet)) return failure("Selecciona una opción de casco válida.");
      if (note.length > 1000) return failure("El comentario no puede superar 1000 caracteres.");
      const now = new Date();
      const day = dayKey(now);
      const row = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${day}))`);
        const [closed] = await tx.select({ id: dailyClosures.id }).from(dailyClosures).where(eq(dailyClosures.day, day)).limit(1);
        if (closed) throw new Error("La caja de hoy está cerrada. No se pueden registrar nuevos movimientos.");
        const [duplicate] = await tx.select({ id: parkingRecords.id }).from(parkingRecords).where(and(eq(parkingRecords.plate, plate), eq(parkingRecords.status, "dentro"))).limit(1);
        if (duplicate) throw new Error("Esta placa ya se encuentra dentro del parqueadero.");
        const [record] = await tx.insert(parkingRecords).values({ plate, helmet, entryUserId: user.id, enteredAt: now }).returning();
        if (note) await tx.insert(comments).values({ recordId: record.id, userId: user.id, text: note });
        return record;
      });
      return Response.json({ record: (await hydrateRecords([row]))[0] });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return failure("Registro no válido.");
    if (body.action === "comment") {
      const text = cleanText(body.text);
      if (!text || text.length > 1000) return failure("Escribe un comentario de hasta 1000 caracteres.");
      await db.transaction(async (tx) => {
        const [record] = await tx.select().from(parkingRecords).where(eq(parkingRecords.id, id)).for("update");
        if (!record || record.status !== "dentro") throw new Error("La moto ya no se encuentra dentro.");
        await tx.insert(comments).values({ recordId: id, userId: user.id, text });
      });
      return Response.json({ ok: true });
    }
    if (body.action === "quote") {
      const [record] = await db.select().from(parkingRecords).where(eq(parkingRecords.id, id)).limit(1);
      if (!record || record.status !== "dentro") return failure("La moto ya no se encuentra dentro.");
      const [closed] = await db.select({ id: dailyClosures.id }).from(dailyClosures).where(eq(dailyClosures.day, dayKey())).limit(1);
      if (closed) return failure("La caja de hoy ya está cerrada. No se pueden registrar pagos.");
      const [rate] = await db.select().from(rates).orderBy(desc(rates.startsAt), desc(rates.id)).limit(1);
      if (!rate) return failure("No hay una tarifa configurada.");
      const now = new Date();
      return Response.json({ ...billed(record.enteredAt, now, rate.hourlyValue), quotedAt: now.toISOString(), helmet: record.helmet });
    }
    if (body.action === "checkout") {
      const paymentMethod = body.paymentMethod;
      const note = cleanText(body.comment);
      if (!["efectivo", "transferencia"].includes(paymentMethod)) return failure("Selecciona el método de pago.");
      if (note.length > 1000) return failure("El comentario no puede superar 1000 caracteres.");
      if (!Number.isInteger(body.quotedAmount) || !Number.isInteger(body.quotedHours)) return failure("Consulta nuevamente el valor antes de confirmar.");
      const now = new Date();
      const day = dayKey(now);
      const updated = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${day}))`);
        const [closed] = await tx.select({ id: dailyClosures.id }).from(dailyClosures).where(eq(dailyClosures.day, day)).limit(1);
        if (closed) throw new Error("La caja de hoy ya está cerrada. No se pueden registrar pagos.");
        const [record] = await tx.select().from(parkingRecords).where(eq(parkingRecords.id, id)).for("update");
        if (!record || record.status !== "dentro") throw new Error("La moto ya fue finalizada o no existe.");
        const [rate] = await tx.select().from(rates).orderBy(desc(rates.startsAt), desc(rates.id)).limit(1);
        if (!rate) throw new Error("No hay una tarifa configurada.");
        const calculation = billed(record.enteredAt, now, rate.hourlyValue);
        if (body.quotedAmount !== calculation.amount || body.quotedHours !== calculation.hours) throw new Error("El valor cambió. Revisa el monto actualizado antes de confirmar.");
        const [result] = await tx.update(parkingRecords).set({ status: "pagado", exitedAt: now, billableHours: calculation.hours, amount: calculation.amount, paymentMethod, exitUserId: user.id, rateId: rate.id }).where(eq(parkingRecords.id, id)).returning();
        if (note) await tx.insert(comments).values({ recordId: id, userId: user.id, text: note });
        return result;
      });
      return Response.json({ record: (await hydrateRecords([updated]))[0] });
    }
    return failure("Acción no válida.");
  } catch (error) {
    console.error("Parking:", error);
    const message = error instanceof Error ? error.message : "No fue posible completar la operación.";
    if (message.includes("unique") || message.includes("one_active_record_per_plate")) return failure("Esta placa ya se encuentra dentro del parqueadero.");
    return failure(message.startsWith("Failed query") ? "No fue posible completar la operación." : message);
  }
}
