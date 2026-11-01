import { ContentEditor } from "@/components/admin/ContentEditor";
import { getSiteContent } from "@/lib/data";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function ContentPage() {
  await requireStaffPage("owner");
  const [content, rows] = await Promise.all([getSiteContent(), db.siteBlock.findMany({ select: { key: true } })]);
  return (
    <>
      <ContentEditor content={content} customised={rows.map((r) => r.key)} />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
