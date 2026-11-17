import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { checkPassword, currentUser, ensureSetup, hashPassword, signIn, signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSetup();
    return Response.json({ user: await currentUser() });
  } catch (error) {
    console.error("Auth setup:", error);
    return Response.json({ error: "No fue posible conectar con el sistema." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "logout") {
      await signOut();
      return Response.json({ ok: true });
    }
    if (body.action === "password") {
      const person = await currentUser();
      if (!person) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
      const [existing] = await db.select().from(users).where(eq(users.id, person.id)).limit(1);
      const nextPassword = String(body.newPassword || "");
      if (!existing || !checkPassword(String(body.currentPassword || ""), existing.passwordHash)) return Response.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
      if (nextPassword.length < 8 || nextPassword.length > 200) return Response.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash: hashPassword(nextPassword) }).where(eq(users.id, person.id));
        await tx.delete(sessions).where(eq(sessions.userId, person.id));
      });
      await signIn(person.id);
      return Response.json({ ok: true });
    }
    if (body.action !== "login") return Response.json({ error: "Acción no válida." }, { status: 400 });
    await ensureSetup();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!username || !password || username.length > 60 || password.length > 200) return Response.json({ error: "Ingresa tu usuario y contraseña." }, { status: 400 });
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !user.active || !checkPassword(password, user.passwordHash)) return Response.json({ error: "Usuario o contraseña incorrectos, o usuario inactivo. Comprueba las mayúsculas y usa la última contraseña guardada en tu cuenta." }, { status: 401 });
    await signIn(user.id);
    return Response.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active } });
  } catch (error) {
    console.error("Auth:", error);
    if (error instanceof Error && error.message.startsWith("Configura PARK_ADMIN_USER")) return Response.json({ error: error.message }, { status: 503 });
    return Response.json({ error: "No fue posible iniciar sesión." }, { status: 500 });
  }
}
