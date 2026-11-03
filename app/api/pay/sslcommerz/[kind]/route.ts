import { NextResponse } from "next/server";
import { failSslcommerz, settleSslcommerz } from "@/lib/server/payments";
import { appUrl } from "@/lib/server/sslcommerz";

// SSLCommerz calls these. success/fail/cancel are the shopper's browser coming back (a cross-site POST, so
// no cookies arrive); ipn is the gateway talking to us directly. Nothing here trusts the posted fields:
// a payment counts only once SSLCommerz's own validation service confirms it (see settleSslcommerz).

const KINDS = new Set(["success", "fail", "cancel", "ipn"]);
// A real callback is a few hundred bytes. Anything bigger is not from the gateway, so it is refused before it is read.
const MAX_BODY = 16 * 1024;

/** The posted form, read with a hard size limit (a missing or lying Content-Length can't get around it). */
async function readForm(request: Request): Promise<FormData | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return null;
  const reader = request.body?.getReader();
  if (!reader) return new FormData();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return new Response(new Blob(chunks as BlobPart[]), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
}

const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.slice(0, 200) : "";
};

export async function POST(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!KINDS.has(kind)) return new NextResponse(null, { status: 404 });
  const back = (orderNo: string | null) => NextResponse.redirect(`${appUrl()}${orderNo ? `/order/${orderNo}` : "/"}`, 303);

  try {
    const form = await readForm(request);
    if (!form) return new NextResponse("Payload too large", { status: 413 });
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
