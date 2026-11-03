import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in — MISK BD", robots: { index: false, follow: false } };

export default function Page() {
  return <LoginForm />;
}
