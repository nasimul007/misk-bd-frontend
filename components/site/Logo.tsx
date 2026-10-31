import Image from "next/image";

/** Brand mark; swaps ivory (night) / charcoal (day) purely by CSS so it is SSR-safe. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <>
      <Image className="logo-night" src="/images/logo-ivory.png" alt="MISK BD logo" width={size} height={size} style={{ objectFit: "contain" }} />
      <Image className="logo-day" src="/images/logo-charcoal.png" alt="MISK BD logo" width={size} height={size} style={{ objectFit: "contain" }} />
    </>
  );
}
