import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderReceipt } from "@/components/checkout/OrderReceipt";

export const metadata: Metadata = { title: "Order confirmed — MISK BD", robots: { index: false } };

export default function OrderPage({ params }: PageProps<"/order/[id]">) {
  return (
    <div className="alignment" style={{ padding: "48px 24px 72px", color: "var(--lux-ink)" }}>
      <Suspense fallback={<div style={{ minHeight: "50vh" }} aria-busy="true" />}>
        <Receipt params={params} />
      </Suspense>
    </div>
  );
}

async function Receipt({ params }: { params: PageProps<"/order/[id]">["params"] }) {
  const { id } = await params;
  return <OrderReceipt id={id} />;
}
