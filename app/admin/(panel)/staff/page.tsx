import { PageHead } from "@/components/admin/ui";
import { StaffManager } from "@/components/admin/StaffManager";
import { dateTime } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function StaffPage() {
  const me = await requireStaffPage("owner");
  const rows = await db.staffAccount.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return (
    <>
      <PageHead title="Staff" />
      <StaffManager
        meId={me.id}
        rows={rows.map((s) => ({ id: s.id, username: s.username, name: s.name, role: s.role, active: s.active, lastLogin: s.lastLoginAt ? dateTime(s.lastLoginAt) : "never" }))}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
