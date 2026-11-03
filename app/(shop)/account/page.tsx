import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "My Account — MISK BD", robots: { index: false, follow: false } };

export default function Page() {
  return <AccountView />;
}
