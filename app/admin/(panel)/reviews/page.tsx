import { ReviewRow } from "@/components/admin/ReviewRow";
import { Panel, dateTime } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orderNo } from "@/lib/server/orders";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function ReviewsPage() {
  await requireStaffPage();
  const rows = await db.review.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { product: { select: { title: true, slug: true } }, order: { select: { number: true } } } });
  return (
    <>
      <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--lux-ink-muted)", maxWidth: 640 }}>
        Every review is from a customer whose order was delivered. Hide one to take it off the product page (it stops counting towards the rating), or delete it for good.
      </p>
      <Panel>
        {rows.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No reviews yet. They appear here once delivered customers rate their items.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {rows.map((r) => (
              <ReviewRow key={r.id} id={r.id} product={r.product.title} productSlug={r.product.slug} author={r.author} rating={r.rating} comment={r.comment} visible={r.status === "visible"} when={dateTime(r.createdAt)} order={r.order ? orderNo(r.order.number) : ""} />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
