import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { ContactWidget } from "@/components/site/ContactWidget";
import { Header } from "@/components/site/Header";
import { getSiteContent } from "@/lib/data";

// The storefront's chrome. The admin panel lives outside this group and has its own.
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <>
      <Header sections={content.sections} />
      <main>{children}</main>
      <Footer content={content.footer} sections={content.sections} />
      <ContactWidget phone={content.footer.phone} whatsapp={content.footer.whatsapp} email={content.footer.email} />
      <CartProvider />
    </>
  );
}
