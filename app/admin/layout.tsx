import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin — MISK BD", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="alignment" style={{ padding: "24px 24px 72px", color: "var(--lux-ink)", minHeight: "100vh" }}>{children}</main>;
}
