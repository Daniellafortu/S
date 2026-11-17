export type AppUser = { id: number; name: string; username: string; role: string; active: boolean; createdAt?: string };
export type CommentItem = { id: number; text: string; createdAt: string; author: string };
export type ParkingItem = {
  id: number; plate: string; enteredAt: string; exitedAt: string | null; helmet: string;
  billableHours: number | null; amount: number | null; paymentMethod: string | null; status: string;
  entryUserId: number; exitUserId: number | null; entryUser: string; exitUser: string | null; comments: CommentItem[];
};
export type DashboardData = {
  date: string; total: number; cash: number; transfer: number; attended: number; inside: number;
  previousTotal: number; previousAttended: number; chart: { day: string; entries: number; exits: number }[];
  recent: ParkingItem[]; active: ParkingItem[]; closed: boolean;
};
export type RateItem = { id: number; hourlyValue: number; previousValue: number | null; startsAt: string; createdBy: string | null };
export type ClosureItem = { id: number; day: string; calculatedCash: number; calculatedTransfer: number; actualCash: number; actualTransfer: number; note: string | null; closedByName: string; closedAt: string; updatedAt: string };
export type ClosureReport = { day: string; summary: { cash: number; transfer: number; total: number; count: number }; inside: number; closure: ClosureItem | null; audit: { id: number; reason: string; author: string; createdAt: string }[] };
export type MonthReport = { month: string; total: number; cash: number; transfer: number; count: number; difference: number; days: { day: string; cash: number; transfer: number; total: number; count: number; closed: boolean; difference: number | null }[] };

export async function api<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...(options?.body ? { "Content-Type": "application/json" } : {}), ...options?.headers }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ocurrió un error. Inténtalo de nuevo.");
  return data as T;
}
export function post<T = Record<string, unknown>>(url: string, body: unknown) {
  return api<T>(url, { method: "POST", body: JSON.stringify(body) });
}
