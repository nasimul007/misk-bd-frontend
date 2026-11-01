// The order lifecycle. One table, shared by the server action (which enforces it) and the admin screens
// (which only offer what the server will accept).
export type Status = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "returned" | "cancelled";

export const NEXT: Record<Status, Status[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

export const STATUSES = Object.keys(NEXT) as Status[];

export const nextStatuses = (s: string): Status[] => NEXT[s as Status] ?? [];
