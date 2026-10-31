import { PageHead } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function AccountPage() {
  const s = await requireStaffPage();
  return (
    <>
      <PageHead title="My account" />
      <p style={{ margin: "-10px 0 20px", fontSize: 14, color: "var(--lux-ink-muted)" }}>Signed in as {s.name} (@{s.username}, {s.role}).</p>
      <ChangePasswordForm />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
