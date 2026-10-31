import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getSiteContent } from "@/lib/data";

// The storefront's chrome. The admin panel lives outside this group and has its own.
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer content={content.footer} />
      <CartProvider />
    </>
  );
}
