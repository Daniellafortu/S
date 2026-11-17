import { and, desc, eq, gte, ilike, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { closureAudits, comments, dailyClosures, parkSettings, parkingRecords, rates, users } from "@/db/schema";
import { currentUser, hashPassword } from "@/lib/auth";
import { addDays, dayKey, dayRange, validDay } from "@/lib/dates";
import { hydrateRecords } from "@/lib/records";
import { getParkName } from "@/lib/settings";

export const dynamic = "force-dynamic";
const failure = (message: string, status = 400) => Response.json({ error: message }, { status });
const clean = (value: unknown) => String(value || "").trim();
const safeUser = { id: users.id, name: users.name, username: users.username, role: users.role, active: users.active, createdAt: users.createdAt };

async function dailyData(day: string) {
  const [start, end] = dayRange(day);
  const paid = await db.select().from(parkingRecords).where(and(eq(parkingRecords.status, "pagado"), gte(parkingRecords.exitedAt, start), lt(parkingRecords.exitedAt, end)));
  const cash = paid.filter((r) => r.paymentMethod === "efectivo").reduce((n, r) => n + (r.amount || 0), 0);
  const transfer = paid.filter((r) => r.paymentMethod === "transferencia").reduce((n, r) => n + (r.amount || 0), 0);
  return { cash, transfer, total: cash + transfer, count: paid.length };
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return failure("Debes iniciar sesión.", 401);
  if (user.role !== "admin") return failure("No tienes permiso para acceder a esta sección.", 403);
  try {
    const params = new URL(request.url).searchParams;
    const view = params.get("view") || "dashboard";
    const today = dayKey();
    if (view === "dashboard") {
      const [weekStart] = dayRange(addDays(today, -6));
      const [week, active, closure] = await Promise.all([
        db.select().from(parkingRecords).where(or(gte(parkingRecords.enteredAt, weekStart), gte(parkingRecords.exitedAt, weekStart))),
        db.select().from(parkingRecords).where(eq(parkingRecords.status, "dentro")).orderBy(desc(parkingRecords.enteredAt)),
        db.select().from(dailyClosures).where(eq(dailyClosures.day, today)).limit(1),
      ]);
      const paidToday = week.filter((r) => r.status === "pagado" && r.exitedAt && dayKey(r.exitedAt) === today);
      const previous = week.filter((r) => r.status === "pagado" && r.exitedAt && dayKey(r.exitedAt) === addDays(today, -1));
      const cash = paidToday.filter((r) => r.paymentMethod === "efectivo").reduce((n, r) => n + (r.amount || 0), 0);
      const transfer = paidToday.filter((r) => r.paymentMethod === "transferencia").reduce((n, r) => n + (r.amount || 0), 0);
      const chart = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i - 6);
        return { day, entries: week.filter((r) => dayKey(r.enteredAt) === day).length, exits: week.filter((r) => r.exitedAt && dayKey(r.exitedAt) === day).length };
      });
      const recent = week.filter((r) => dayKey(r.enteredAt) === today || (r.exitedAt && dayKey(r.exitedAt) === today)).sort((a, b) => (b.exitedAt || b.enteredAt).getTime() - (a.exitedAt || a.enteredAt).getTime()).slice(0, 6);
      return Response.json({ date: today, total: cash + transfer, cash, transfer, attended: paidToday.length, inside: active.length,
        previousTotal: previous.reduce((n, r) => n + (r.amount || 0), 0), previousAttended: previous.length,
        chart, recent: await hydrateRecords(recent), active: await hydrateRecords(active.slice(0, 4)), closed: closure.length > 0 });
    }
    if (view === "settings") {
      return Response.json({ name: await getParkName() });
    }
    if (view === "users") {
      return Response.json({ users: await db.select(safeUser).from(users).where(eq(users.role, "cuidador")).orderBy(desc(users.createdAt)) });
    }
    if (view === "rates") {
      const rows = await db.select({ id: rates.id, hourlyValue: rates.hourlyValue, previousValue: rates.previousValue, startsAt: rates.startsAt, createdBy: users.name }).from(rates).leftJoin(users, eq(rates.createdBy, users.id)).orderBy(desc(rates.startsAt), desc(rates.id));
      return Response.json({ rates: rows });
    }
    if (view === "history") {
      const plate = clean(params.get("plate")).toUpperCase();
      const start = clean(params.get("start"));
      const end = clean(params.get("end"));
      const caregiver = Number(params.get("caregiver") || 0);
      if ((start && !validDay(start)) || (end && !validDay(end))) return failure("El rango de fechas no es válido.");
      if (start && end && start > end) return failure("La fecha inicial debe ser anterior a la final.");
      const rows = await db.select().from(parkingRecords).where(and(
        plate ? ilike(parkingRecords.plate, `%${plate}%`) : undefined,
        start ? gte(parkingRecords.enteredAt, dayRange(start)[0]) : undefined,
        end ? lt(parkingRecords.enteredAt, dayRange(end)[1]) : undefined,
        caregiver ? or(eq(parkingRecords.entryUserId, caregiver), eq(parkingRecords.exitUserId, caregiver)) : undefined,
      )).orderBy(desc(parkingRecords.enteredAt));
      let result = await hydrateRecords(rows);
      if (params.get("comments") === "1") result = result.filter((r) => r.comments.length > 0);
      return Response.json({ records: result });
    }
    if (view === "month" || view === "month-export") {
      const month = clean(params.get("month")) || today.slice(0, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return failure("Selecciona un mes válido.");
      const [year, monthNumber] = month.split("-").map(Number);
      const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
      const first = `${month}-01`;
      const [start] = dayRange(first);
      const [end] = dayRange(next);
      const [paid, closures] = await Promise.all([
        db.select().from(parkingRecords).where(and(eq(parkingRecords.status, "pagado"), gte(parkingRecords.exitedAt, start), lt(parkingRecords.exitedAt, end))),
        db.select().from(dailyClosures).where(and(gte(dailyClosures.day, first), lt(dailyClosures.day, next))),
      ]);
      const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const day = `${month}-${String(i + 1).padStart(2, "0")}`;
        const rows = paid.filter((r) => r.exitedAt && dayKey(r.exitedAt) === day);
        const cash = rows.filter((r) => r.paymentMethod === "efectivo").reduce((n, r) => n + (r.amount || 0), 0);
        const transfer = rows.filter((r) => r.paymentMethod === "transferencia").reduce((n, r) => n + (r.amount || 0), 0);
        const closure = closures.find((c) => c.day === day);
        return { day, cash, transfer, total: cash + transfer, count: rows.length, closed: !!closure, difference: closure ? closure.actualCash + closure.actualTransfer - closure.calculatedCash - closure.calculatedTransfer : null };
      }).filter((d) => d.day <= today || d.count > 0 || d.closed);
      const cash = days.reduce((n, d) => n + d.cash, 0), transfer = days.reduce((n, d) => n + d.transfer, 0);
      const report = { month, days: days.reverse(), cash, transfer, total: cash + transfer, count: paid.length, difference: days.reduce((n, d) => n + (d.difference || 0), 0) };
      if (view === "month-export") {
        const { monthlyExcel } = await import("@/lib/monthly-excel");
        const movements = await hydrateRecords([...paid].sort((a, b) => (b.exitedAt?.getTime() || 0) - (a.exitedAt?.getTime() || 0)));
        const buffer = await monthlyExcel(report, movements, await getParkName());
        return new Response(new Uint8Array(buffer), { headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="motopark-reporte-mensual-${month}.xlsx"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        } });
      }
      return Response.json(report);
    }
    if (view === "closure") {
      const day = clean(params.get("day")) || today;
      if (!validDay(day) || day > today) return failure("Selecciona una fecha válida, hasta hoy.");
      const cutoff = day === today ? new Date() : dayRange(day)[1];
      const [summary, active, closureRows, names] = await Promise.all([
        dailyData(day),
        db.select({ id: parkingRecords.id }).from(parkingRecords).where(and(lt(parkingRecords.enteredAt, cutoff), or(isNull(parkingRecords.exitedAt), gte(parkingRecords.exitedAt, cutoff)))),
        db.select().from(dailyClosures).where(eq(dailyClosures.day, day)).limit(1),
        db.select({ id: users.id, name: users.name }).from(users),
      ]);
      const closure = closureRows[0] || null;
      const audit = closure ? await db.select().from(closureAudits).where(eq(closureAudits.closureId, closure.id)).orderBy(desc(closureAudits.createdAt)) : [];
      return Response.json({ day, summary, inside: active.length, closure: closure ? { ...closure, closedByName: names.find((n) => n.id === closure.closedBy)?.name || "Administrador" } : null,
        audit: audit.map((a) => ({ ...a, author: names.find((n) => n.id === a.userId)?.name || "Administrador" })) });
    }
    if (view === "backup") {
      const snapshot = await db.transaction(async (tx) => ({
        version: 1, exportedAt: new Date().toISOString(), users: await tx.select().from(users), rates: await tx.select().from(rates),
        parkingRecords: await tx.select().from(parkingRecords), comments: await tx.select().from(comments),
        dailyClosures: await tx.select().from(dailyClosures), closureAudits: await tx.select().from(closureAudits),
        parkSettings: await tx.select().from(parkSettings),
      }), { isolationLevel: "repeatable read" });
      return Response.json(snapshot, { headers: { "Content-Disposition": `attachment; filename="motopark-respaldo-${today}.json"`, "Cache-Control": "no-store" } });
    }
    return failure("Consulta no válida.");
  } catch (error) {
    console.error("Admin GET:", error);
    return failure("No fue posible cargar la información.", 500);
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return failure("Debes iniciar sesión.", 401);
  if (user.role !== "admin") return failure("No tienes permiso para realizar esta acción.", 403);
  try {
    const body = await request.json();
    if (body.action === "saveSettings") {
      const raw = typeof body.name === "string" ? body.name : "";
      const name = raw.trim().replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 60 || /[\x00-\x1f\x7f]/.test(raw)) return failure("El nombre debe tener entre 2 y 60 caracteres y no contener saltos de línea.");
      await db.insert(parkSettings).values({ id: 1, name, updatedBy: user.id, updatedAt: new Date() }).onConflictDoUpdate({ target: parkSettings.id, set: { name, updatedBy: user.id, updatedAt: new Date() } });
      return Response.json({ name });
    }
    if (body.action === "saveUser") {
      const name = clean(body.name), username = clean(body.username).toLowerCase(), password = String(body.password || ""), id = Number(body.id || 0);
      if (name.length < 2 || name.length > 120) return failure("Ingresa un nombre válido.");
      if (!/^[a-z0-9._-]{3,60}$/.test(username)) return failure("El usuario debe tener al menos 3 caracteres y solo letras, números, punto, guion o guion bajo.");
      if ((!id && password.length < 8) || (password && password.length < 8) || password.length > 200) return failure("La contraseña debe tener al menos 8 caracteres.");
      if (id) {
        const [existing] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "cuidador"))).limit(1);
        if (!existing) return failure("Cuidador no encontrado.", 404);
        await db.update(users).set({ name, username, ...(password ? { passwordHash: hashPassword(password) } : {}) }).where(eq(users.id, id));
      } else {
        await db.insert(users).values({ name, username, passwordHash: hashPassword(password), role: "cuidador" });
      }
      return Response.json({ ok: true });
    }
    if (body.action === "toggleUser") {
      const id = Number(body.id);
      const [existing] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "cuidador"))).limit(1);
      if (!existing) return failure("Cuidador no encontrado.", 404);
      await db.update(users).set({ active: !existing.active }).where(eq(users.id, id));
      return Response.json({ ok: true });
    }
    if (body.action === "rate") {
      const value = Number(body.value);
      if (!Number.isInteger(value) || value < 1 || value > 100_000_000) return failure("Ingresa un valor por hora válido.");
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext('motopark-rates'))`);
        const [previous] = await tx.select().from(rates).orderBy(desc(rates.startsAt), desc(rates.id)).limit(1);
        if (previous?.hourlyValue === value) throw new Error("La tarifa ingresada ya está vigente.");
        await tx.insert(rates).values({ hourlyValue: value, previousValue: previous?.hourlyValue, createdBy: user.id });
      });
      return Response.json({ ok: true });
    }
    if (body.action === "closure") {
      const day = clean(body.day), actualCash = Number(body.actualCash), actualTransfer = Number(body.actualTransfer), note = clean(body.note), reason = clean(body.reason);
      if (!validDay(day) || day > dayKey()) return failure("Selecciona una fecha válida, hasta hoy.");
      if (body.actualCash === "" || body.actualTransfer === "" || body.actualCash == null || body.actualTransfer == null || ![actualCash, actualTransfer].every((n) => Number.isInteger(n) && n >= 0 && n <= 2_147_483_647)) return failure("Ingresa valores reales válidos para efectivo y transferencia.");
      if (note.length > 1000 || reason.length > 1000) return failure("La observación es demasiado larga.");
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${day}))`);
        const [existing] = await tx.select().from(dailyClosures).where(eq(dailyClosures.day, day)).for("update");
        if (existing) {
          if (!reason) throw new Error("Indica el motivo de la corrección para dejar constancia.");
          const [updated] = await tx.update(dailyClosures).set({ actualCash, actualTransfer, note, updatedAt: new Date() }).where(eq(dailyClosures.id, existing.id)).returning();
          await tx.insert(closureAudits).values({ closureId: existing.id, userId: user.id, reason, before: existing, after: updated });
        } else {
          const cutoff = day === dayKey() ? new Date() : dayRange(day)[1];
          const inside = await tx.select({ id: parkingRecords.id }).from(parkingRecords).where(and(lt(parkingRecords.enteredAt, cutoff), or(isNull(parkingRecords.exitedAt), gte(parkingRecords.exitedAt, cutoff))));
          if (inside.length && !body.confirmActive) throw new Error(`Hay ${inside.length} moto(s) dentro. Confirma que deseas cerrar de todos modos.`);
          const [start, end] = dayRange(day);
          const paid = await tx.select().from(parkingRecords).where(and(eq(parkingRecords.status, "pagado"), gte(parkingRecords.exitedAt, start), lt(parkingRecords.exitedAt, end)));
          const calculatedCash = paid.filter((r) => r.paymentMethod === "efectivo").reduce((n, r) => n + (r.amount || 0), 0);
          const calculatedTransfer = paid.filter((r) => r.paymentMethod === "transferencia").reduce((n, r) => n + (r.amount || 0), 0);
          await tx.insert(dailyClosures).values({ day, calculatedCash, calculatedTransfer, actualCash, actualTransfer, note, closedBy: user.id });
        }
      });
      return Response.json({ ok: true });
    }
    return failure("Acción no válida.");
  } catch (error) {
    console.error("Admin POST:", error);
    const message = error instanceof Error ? error.message : "No fue posible completar la operación.";
    if (message.includes("unique") || message.includes("users_username_unique")) return failure("Este nombre de usuario ya existe.");
    return failure(message.startsWith("Failed query") ? "No fue posible completar la operación. Verifica los datos." : message);
  }
}
