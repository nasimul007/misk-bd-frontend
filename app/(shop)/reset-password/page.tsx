import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password — MISK BD", robots: { index: false } };

export default function Page() {
  return (
    <div className="alignment" style={{ padding: "64px 24px 80px", color: "var(--lux-ink)" }}>
      <Suspense fallback={<div style={{ minHeight: "40vh" }} aria-busy="true" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
