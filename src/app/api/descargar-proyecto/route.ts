import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.redirect(new URL("/", request.url));
  if (user.role !== "admin") return Response.json({ error: "Solo el administrador puede descargar el proyecto." }, { status: 403 });
  try {
    const archive = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), "private", "downloads", "motopark-proyecto.zip"));
    return new Response(new Uint8Array(archive), { headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="motopark-proyecto.zip"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("No fue posible leer el paquete:", error);
    return Response.json({ error: "El paquete de descarga no está disponible en esta instalación." }, { status: 404 });
  }
}
