import { countries, dialCodes, dialOptions, geo } from "@/lib/data/geo";
import { paymentsFor, shipping, vatRate, type PaymentId } from "@/lib/config";

type Line = { price: number; original: number; qty: number };

export type Totals = { listTotal: number; subtotal: number; savings: number; shipping: number; vat: number; total: number };

/** One function for quote and order, so the confirmation total always equals the quote. */
export function computeTotals(items: Line[], where: { intl: boolean; division: string }): Totals {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const listTotal = items.reduce((n, i) => n + (i.original || i.price) * i.qty, 0);
  const ship = where.intl
    ? shipping.intl
    : subtotal >= shipping.freeThreshold
      ? 0
      : where.division === "Dhaka"
        ? shipping.insideDhaka
        : where.division
          ? shipping.outsideDhaka
          : 0;
  return { listTotal, subtotal, savings: listTotal - subtotal, shipping: ship, vat: Math.round(subtotal * vatRate), total: subtotal + ship };
}

export const estimateFor = (intl: boolean, division: string) =>
  intl ? shipping.estimate.intl : division === "Dhaka" ? shipping.estimate.dhaka : shipping.estimate.other;

export type CheckoutForm = {
  intl: boolean;
  name: string;
  phone: string;
  dial: string;
  email: string;
  division: string;
  district: string;
  thana: string;
  country: string;
  region: string;
  city: string;
  postal: string;
  street: string;
  pay: PaymentId | "";
};

export const emptyForm: CheckoutForm = { intl: false, name: "", phone: "", dial: "", email: "", division: "", district: "", thana: "", country: "", region: "", city: "", postal: "", street: "", pay: "bkash" };

/** Bangladeshi mobile in national form: strips symbols and a leading 880/00880, ensures one leading 0. */
export const bdLocal = (phone: string) => phone.replace(/\D/g, "").replace(/^(00)?880/, "").replace(/^0*/, "0");

export type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

export function validate(f: CheckoutForm): FormErrors {
  const e: FormErrors = {};
  const name = f.name.trim();
  const digits = f.phone.replace(/\D/g, "");

  if (!name) e.name = "Please enter your full name.";
  else if (/\d/.test(name)) e.name = "Name cannot contain numbers.";
  else if (!/^[\p{L}][\p{L}\p{M}\s.'’-]*$/u.test(name) || name.replace(/[^\p{L}]/gu, "").length < 2) e.name = "Enter a valid name using letters only.";

  if (!digits) e.phone = "Please enter your phone number.";
  else if (!f.intl && !/^01[3-9]\d{8}$/.test(bdLocal(f.phone))) e.phone = "Enter a valid 11-digit Bangladeshi number, e.g. 01712 345678.";
  else if (f.intl && !dialOptions.some((d) => d.code === f.dial)) e.phone = "Select your country code.";
  else if (f.intl && (digits.length < 6 || digits.length > 14)) e.phone = "Enter a valid phone number (6–14 digits).";

  const email = f.email.trim();
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) e.email = "Enter a valid email address.";

  if (!f.intl) {
    if (!f.division) e.division = "Select a division.";
    if (!f.district) e.district = "Select a district.";
    else if (f.division && !geo[f.division]?.[f.district]) e.district = "Select a district in this division.";
    if (!f.thana) e.thana = "Select an upazila / thana.";
    else if (f.district && !geo[f.division]?.[f.district]?.includes(f.thana)) e.thana = "Select an upazila in this district.";
  } else {
    if (!f.country || !countries.includes(f.country)) e.country = "Select your country.";
    if (!f.region.trim()) e.region = "Enter your state / province.";
    if (!f.city.trim()) e.city = "Enter your city.";
    if (!f.postal.trim()) e.postal = "Enter your postal code.";
  }
  const street = f.street.trim();
  if (street.length < 5) e.street = f.intl ? "Enter your street address (house / apartment, street)." : "Enter your house, road and area (at least 5 characters).";
  else if (street.length > 255) e.street = "Address is too long (255 characters max).";

  if (!f.pay || !paymentsFor(f.intl).some((p) => p.id === f.pay)) e.pay = "Choose a payment method.";
  return e;
}

export const dialFor = (country: string) => dialCodes.find((d) => d.country === country)?.code ?? "";
