import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/server/cron-auth";
import { expireUnpaid } from "@/lib/server/payments";

// Run every few minutes by the host's scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
// It cancels online orders that were never paid and puts their stock back.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ cancelled: await expireUnpaid() });
}
