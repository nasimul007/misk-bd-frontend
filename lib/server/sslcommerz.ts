import "server-only";

// SSLCommerz hosted checkout: create a session, send the shopper to GatewayPageURL, then ask the
// validation service whether a payment is real. The browser redirect and the IPN are only hints.

const BASES = { sandbox: "https://sandbox.sslcommerz.com", live: "https://securepay.sslcommerz.com" } as const;

export type SslConfig = { storeId: string; storePassword: string; mode: "sandbox" | "live"; base: string };

/** `null` when the store credentials aren't set, so the method can be switched off cleanly. */
export function sslConfig(): SslConfig | null {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePassword) return null;
  const mode = process.env.SSLCOMMERZ_MODE === "live" ? "live" : "sandbox";
  // A different API host is allowed in sandbox only (for tests); live always talks to SSLCommerz.
  const override = mode === "sandbox" ? process.env.SSLCOMMERZ_API_BASE?.trim() : "";
  return { storeId, storePassword, mode, base: override || BASES[mode] };
}

export const appUrl = () => (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

export type SessionInput = {
  tranId: string;
  amount: number; // whole BDT
  orderNo: string;
  productName: string;
  itemCount: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  intl: boolean;
};

export type SessionResult = { ok: true; url: string } | { ok: false; reason: string };

const TIMEOUT_MS = 15_000;

async function call(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`SSLCommerz answered HTTP ${res.status}`);
  return res.json();
}

export async function createSession(cfg: SslConfig, i: SessionInput): Promise<SessionResult> {
  const base = appUrl();
  const body = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    total_amount: i.amount.toFixed(2),
    currency: "BDT",
    tran_id: i.tranId,
    success_url: `${base}/api/pay/sslcommerz/success`,
    fail_url: `${base}/api/pay/sslcommerz/fail`,
    cancel_url: `${base}/api/pay/sslcommerz/cancel`,
    ipn_url: `${base}/api/pay/sslcommerz/ipn`,
    shipping_method: "Courier",
    num_of_item: String(i.itemCount),
    product_name: i.productName.slice(0, 250),
    product_category: "Perfume",
    product_profile: "physical-goods",
    cus_name: i.name,
    cus_email: i.email,
    cus_add1: i.address.slice(0, 50),
    cus_city: i.city,
    cus_country: i.country,
    cus_phone: i.phone,
    ship_name: i.name,
    ship_add1: i.address.slice(0, 50),
    ship_city: i.city,
    ship_country: i.country,
    ship_postcode: "1000",
    value_a: i.orderNo,
  });
  try {
    const r = (await call(`${cfg.base}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })) as Record<string, unknown>;
    const url = typeof r.GatewayPageURL === "string" ? r.GatewayPageURL : "";
    if (r.status === "SUCCESS" && /^https:\/\//.test(url)) return { ok: true, url };
    return { ok: false, reason: typeof r.failedreason === "string" ? r.failedreason : "The gateway did not open a payment page." };
  } catch (e) {
    console.error("sslcommerz session failed", e);
    return { ok: false, reason: "We couldn't reach the payment gateway." };
  }
}

/** What we keep from a validation answer. No secrets, and no card numbers. */
export type Validated = {
  status: string;
  tranId: string;
  valId: string;
  amount: number; // whole BDT, or NaN when it can't be read
  currency: string;
  bankTranId: string;
  cardType: string;
  riskLevel: string;
  raw: Record<string, string>;
};

const KEEP = ["status", "tran_id", "val_id", "amount", "currency_type", "currency_amount", "bank_tran_id", "card_type", "card_brand", "card_issuer_country_code", "risk_level", "risk_title", "tran_date"];
const s = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Asks SSLCommerz about a val_id. Anything other than a clear VALID/VALIDATED answer is not a payment. */
export async function validatePayment(cfg: SslConfig, valId: string): Promise<Validated | null> {
  const q = new URLSearchParams({ val_id: valId, store_id: cfg.storeId, store_passwd: cfg.storePassword, format: "json" });
  try {
    const r = (await call(`${cfg.base}/validator/api/validationserverAPI.php?${q}`)) as Record<string, unknown>;
    const raw: Record<string, string> = {};
    for (const k of KEEP) if (k in r) raw[k] = s(r[k]);
    const currency = s(r.currency_type) || "BDT";
    // The amount in the shopper's own currency; we only ever charge BDT.
    const money = Number(s(r.currency_amount) || s(r.amount));
    return {
      status: s(r.status),
      tranId: s(r.tran_id),
      valId: s(r.val_id) || valId,
      amount: Number.isFinite(money) ? Math.round(money * 100) / 100 : NaN,
      currency,
      bankTranId: s(r.bank_tran_id),
      cardType: s(r.card_type),
      riskLevel: s(r.risk_level),
      raw,
    };
  } catch (e) {
    console.error("sslcommerz validation failed", e);
    return null;
  }
}
