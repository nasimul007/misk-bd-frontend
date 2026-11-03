import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderWhere, parseOrderFilter } from "@/lib/server/order-filter";
import { orderNo } from "@/lib/server/orders";
import { audit } from "@/lib/server/staff";
import { getStaff } from "@/lib/server/staff-session";

// Download the (filtered) orders as a spreadsheet. Lives under /admin so the staff cookie reaches it.
// Any signed-in staff member can export what they can already see in the Orders list.

/** One CSV cell. A cell that starts with = + - or @ would run as a formula in Excel, so it gets a leading apostrophe. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  // (A phone number like +8801712345678 is only digits, so it is safe as it is.)
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d[\d ]*$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const filter = parseOrderFilter(sp);
  const orders = await db.order.findMany({ where: orderWhere(filter), include: { items: true }, orderBy: { createdAt: "desc" }, take: 5000 });

  const header = ["Order", "Placed (Dhaka)", "Status", "Customer", "Phone", "Email", "Division", "District", "Upazila / city", "Address", "Items", "Subtotal", "Discount", "Shipping", "Total (BDT)", "Payment method", "Payment status", "Delivery note", "Contactless"];
  const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour12: false });
  const lines = orders.map((o) =>
    [
      orderNo(o.number), when(o.createdAt), o.status, o.contactName, o.contactPhone, o.contactEmail,
      o.shipKind === "intl" ? o.shipCountry : o.shipDivision, o.shipKind === "intl" ? o.shipRegion : o.shipDistrict, o.shipKind === "intl" ? o.shipCity : o.shipUpazila, o.shipStreet,
      o.items.map((i) => `${i.title} (${i.size}) x${i.qty}`).join("; "),
      o.subtotal, o.discountTotal, o.shippingFee, o.total, o.paymentMethod, o.paymentStatus, o.deliveryNote, o.contactless ? "yes" : "",
    ].map(cell).join(","),
  );
  await audit(staff, "orders.export", "order", `${orders.length} rows`);

  // The leading BOM makes Excel read the file as UTF-8, so Bengali names and ৳ survive.
  const body = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="misk-orders-${day}.csv"`, "Cache-Control": "no-store" } });
}
