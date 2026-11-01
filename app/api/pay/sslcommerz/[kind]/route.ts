import { NextResponse } from "next/server";
import { failSslcommerz, settleSslcommerz } from "@/lib/server/payments";
import { appUrl } from "@/lib/server/sslcommerz";

// SSLCommerz calls these. success/fail/cancel are the shopper's browser coming back (a cross-site POST, so
// no cookies arrive); ipn is the gateway talking to us directly. Nothing here trusts the posted fields:
// a payment counts only once SSLCommerz's own validation service confirms it (see settleSslcommerz).

const KINDS = new Set(["success", "fail", "cancel", "ipn"]);
const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.slice(0, 200) : "";
};

export async function POST(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!KINDS.has(kind)) return new NextResponse(null, { status: 404 });
  const back = (orderNo: string | null) => NextResponse.redirect(`${appUrl()}${orderNo ? `/order/${orderNo}` : "/"}`, 303);

  try {
    const form = await request.formData();
    const tranId = field(form, "tran_id");
    if (kind === "fail" || kind === "cancel") return back(await failSslcommerz(tranId, kind === "fail" ? "failed" : "cancelled"));

    const settled = await settleSslcommerz(field(form, "val_id"), tranId);
    if (kind === "ipn") return new NextResponse("OK", { status: 200 });
    return back(settled.orderNo);
  } catch (e) {
    console.error("sslcommerz callback failed", kind, e);
    // A 500 on the IPN makes the gateway retry it; the shopper just goes home.
    return kind === "ipn" ? new NextResponse("ERROR", { status: 500 }) : back(null);
  }
}

// A person opening a callback address by hand has nothing to do here.
export async function GET() {
  return NextResponse.redirect(`${appUrl()}/`, 303);
}
