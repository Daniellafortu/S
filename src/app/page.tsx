import type { Metadata } from "next";
import { cache } from "react";
import Workspace from "@/components/workspace";
import { currentUser } from "@/lib/auth";
import { DEFAULT_PARK_NAME, getParkName } from "@/lib/settings";

export const dynamic = "force-dynamic";
const readParkName = cache(() => getParkName().catch(() => DEFAULT_PARK_NAME));

export async function generateMetadata(): Promise<Metadata> {
  const name = await readParkName();
  return { title: `${name} | Gestión de parqueadero` };
}

export default async function HomePage() {
  const [user, parkName] = await Promise.all([currentUser().catch(() => null), readParkName()]);
  return <Workspace now={new Date().toISOString()} initialUser={user} initialParkName={parkName} />;
}
