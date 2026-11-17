import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parkSettings } from "@/db/schema";

export const DEFAULT_PARK_NAME = "MotoPark";

export async function getParkName(): Promise<string> {
  const [settings] = await db.select({ name: parkSettings.name }).from(parkSettings).where(eq(parkSettings.id, 1)).limit(1);
  return settings?.name || DEFAULT_PARK_NAME;
}
