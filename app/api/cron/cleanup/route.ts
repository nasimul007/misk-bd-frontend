import { NextResponse } from "next/server";
import { cleanupOldRows } from "@/lib/server/cleanup";
import { cronAuthorized } from "@/lib/server/cron-auth";

// Run once a day by the host's scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ removed: await cleanupOldRows() });
}
