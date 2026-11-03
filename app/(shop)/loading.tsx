import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

// Shown straight away while any shop page is loading, so navigation never flashes an empty screen.
export default function Loading() {
  return (
    <div className="alignment" style={{ padding: "24px 24px 60px" }}>
      <Skeleton style={{ height: 36, width: 260, marginBottom: 24 }} />
      <ProductGridSkeleton />
    </div>
  );
}
