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
  // Owners run the whole store; admins handle orders and stock only. The server enforces this too.
  const items =
    staff.role === "owner"
      ? [
          { href: "/admin", label: "Overview", icon: "overview" },
          { href: "/admin/products", label: "Products", icon: "products" },
          { href: "/admin/sections", label: "Sections", icon: "sections" },
          { href: "/admin/discounts", label: "Discounts", icon: "discounts" },
          { href: "/admin/orders", label: "Orders", icon: "orders" },
          { href: "/admin/inventory", label: "Inventory", icon: "inventory" },
          { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
          { href: "/admin/content", label: "Site content", icon: "content" },
          { href: "/admin/staff", label: "Staff access", icon: "staff" },
          { href: "/admin/account", label: "My account", icon: "account" },
        ]
      : [
          { href: "/admin", label: "Overview", icon: "overview" },
          { href: "/admin/orders", label: "Orders", icon: "orders" },
          { href: "/admin/inventory", label: "Inventory", icon: "inventory" },
          { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
          { href: "/admin/account", label: "My account", icon: "account" },
        ];
  return (
    <>
      <AdminNav items={items} name={staff.name} role={staff.role} />
      {children}
    </>
  );
}
