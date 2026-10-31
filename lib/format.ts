export type Currency = "BDT" | "USD";

export const USD_RATE = 0.0083;

export function money(amount: number, currency: Currency = "BDT", rate = USD_RATE): string {
  return currency === "USD"
    ? `$${(amount * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `৳${Number(amount).toLocaleString("en-US")}`;
}
