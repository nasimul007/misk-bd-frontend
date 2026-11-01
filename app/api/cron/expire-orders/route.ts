import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { expireUnpaid } from "@/lib/server/payments";

// Run every few minutes by the host's scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
// It cancels online orders that were never paid and puts their stock back.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  if (secret.length < 16 || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ cancelled: await expireUnpaid() });
}
