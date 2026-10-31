import { NextResponse } from "next/server";
import { audit } from "@/lib/server/staff";
import { getStaff } from "@/lib/server/staff-session";
import { MAX_UPLOAD_BYTES, saveImage, UploadError } from "@/lib/server/storage";

// Owner-only image upload for products, sections and site content. It lives under /admin so the staff
// cookie (scoped to /admin, SameSite=Strict) reaches it; the session and role are checked here as well.
export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (staff.role !== "owner") return NextResponse.json({ error: "Only the owner can upload images." }, { status: 403 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: "Images must be under 5 MB." }, { status: 413 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    const url = await saveImage(Buffer.from(await file.arrayBuffer()));
    await audit(staff, "image.upload", "image", url);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("upload failed", e);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
