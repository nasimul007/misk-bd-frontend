import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "My Account — MISK BD" };

export default function Page() {
  return <AccountView />;
}
