import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requireStaffPage } from "@/lib/server/staff-session";

// Staff pages depend on who is signed in and redirect when nobody is, so they can never be an instant,
// prerendered navigation. Opt out of the dev-only "instant" validation, which otherwise re-renders the
// redirecting route on every reload.
export const instant = false;

// Staff pages read the session cookie, so they render on request, behind a Suspense boundary.
// Each page and action re-checks access itself: a layout is not re-run on client navigation.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "50vh" }} aria-busy="true" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const staff = await requireStaffPage();
  if (staff.mustChangePassword) {
    return (
      <div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 500, margin: "0 0 18px" }}>Welcome, {staff.name}</h1>
        <ChangePasswordForm forced />
      </div>
    );
  }
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/discounts", label: "Discounts" },
    ...(staff.role === "owner" ? [{ href: "/admin/staff", label: "Staff" }] : []),
    { href: "/admin/account", label: "My account" },
  ];
  return (
    <>
      <AdminNav items={items} name={staff.name} role={staff.role} />
      {children}
    </>
  );
}
