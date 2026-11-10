import { shipping } from "@/lib/config";
import { money } from "@/lib/format";
import type { OrderPolicy } from "@/lib/types";

export type ContentTopic = "authenticity" | "about" | "shipping" | "returns" | "warranty" | "terms" | "privacy";
export type ContentPageData = { eyebrow: string; title: string; description: string; body: string[]; points: string[] };

const m = (n: number) => money(n);

export const contentPages: Record<ContentTopic, ContentPageData> = {
  authenticity: {
    eyebrow: "Our Promise",
    title: "Authenticity Guarantee",
    description: "Every Misk BD fragrance is sourced from verified houses, batch-checked and sealed.",
    body: [
      "Every fragrance we sell is sourced from verified houses and distributors. We do not deal in decants of unknown origin or grey-market stock.",
      "Each bottle is inspected, batch-checked and sealed before it leaves us — and ships with a Misk BD authenticity card recording its source and batch.",
      "If you ever doubt a bottle purchased from us, return it within 7 days for a full refund. Trust is the whole of our business.",
    ],
    points: ["Verified-house sourcing", "Sealed & batch-checked", "Authenticity card in every parcel", "7-day no-questions returns"],
  },
  about: {
    eyebrow: "The House",
    title: "About Misk BD",
    description: "A small maison de parfum in Dhaka sharing the elegance of the Sunnah through authentic attar and perfume.",
    body: [
      "Misk BD is a small maison de parfum in Dhaka — a quiet attempt to share the elegance of the Sunnah through authentic attar and perfume.",
      "We choose each scent for its character: the way it opens, the way it lingers, the way it becomes unmistakably yours. We present them unhurried, and with intent.",
    ],
    points: ["Founded in Dhaka", "Attar & oud specialists", "Nationwide delivery", "Cash on delivery"],
  },
  shipping: {
    eyebrow: "Delivery",
    title: "Shipping & Delivery",
    description: "Delivery rates and times inside Bangladesh and internationally.",
    body: [
      `Inside Bangladesh, delivery costs ${m(shipping.insideDhaka)} to ${m(shipping.outsideDhaka)} depending on where you are: ${m(shipping.insideDhaka)} inside Dhaka (${shipping.estimate.dhaka}) and ${m(shipping.outsideDhaka)} for the rest of the country (${shipping.estimate.other}). Delivery within Bangladesh is charged in BDT.`,
      `Outside Bangladesh, shipping depends on the courier (DHL or FedEx), the destination country and the weight of your parcel. At checkout we charge a flat ${m(shipping.intl)} per order (about ${money(shipping.intl, "USD")}), with ${shipping.estimate.intl} delivery. Larger or heavier parcels can cost more at the courier's rate, and we will confirm any difference with you before dispatch. Duties and taxes are payable on arrival. The exact charge is shown at checkout.`,
    ],
    points: [
      `Inside Bangladesh ${m(shipping.insideDhaka)} – ${m(shipping.outsideDhaka)}`,
      `International by courier · ${m(shipping.intl)} per order`,
      `International delivery ${shipping.estimate.intl}`,
    ],
  },
  returns: {
    eyebrow: "Peace of Mind",
    title: "Returns & Refunds",
    description: "Unopened items can be returned within 7 days of delivery for a full refund.",
    body: [
      "Unopened items may be returned within 7 days of delivery for a full refund to your original payment method — including Cash on Delivery orders.",
      "To start a return, contact us with your order number. Refunds are processed within 5 business days of the item reaching us.",
    ],
    points: ["7-day return window", "Refund to original method", "COD refunds supported", "5-day processing"],
  },
  warranty: {
    eyebrow: "Assurance",
    title: "Warranty Policy",
    description: "Damaged or faulty sealed products are replaced at no cost.",
    body: ["Should any sealed product arrive damaged or faulty, we replace it at no cost. Report issues within 48 hours of delivery with a photo of the parcel and bottle."],
    points: ["Damage replacement", "Report within 48h", "No replacement cost"],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    description: "The terms that govern every purchase made through Misk BD.",
    body: [
      "These Terms & Conditions govern every purchase made through Misk BD. By placing an order, you agree to the terms set out below.",
      "Product listings, images and descriptions are provided in good faith; minor variations in bottle batch or packaging may occur between what is pictured and what is delivered. Prices are quoted in Bangladeshi Taka (BDT) and may be shown in USD for reference only — the BDT amount is what is charged unless otherwise agreed. We reserve the right to correct pricing or listing errors and to cancel an order affected by such an error, with a full refund.",
      "Orders are confirmed once payment is received (or, for Cash on Delivery, once the delivery charge is received, with the rest paid in cash on delivery). We may decline or cancel an order at our discretion — for example on suspicion of fraud, an out-of-stock item, or an undeliverable address — and any payment taken will be refunded in full.",
      "Delivery timelines quoted at checkout are estimates, not guarantees; delays caused by the courier, weather or circumstances outside our control do not entitle a buyer to cancel a dispatched order. Risk in the goods passes to the buyer on delivery.",
      "Returns, refunds and warranty claims are handled under our separate Returns & Refunds and Warranty policies, linked from this page and our footer. Continued use of this site after a change to these terms constitutes acceptance of the revised terms.",
    ],
    points: [],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description: "What we collect, why, and how to ask us to delete it.",
    body: [
      "We collect only the information needed to process and deliver your order: your name, phone number, delivery address, and email if you provide one. This information is used solely to fulfil, ship and communicate about your order, and is not sold to third parties.",
      "Payment details are handled directly by our payment partners (bKash, SSLCommerz, Stripe, PayPal); card and wallet numbers are never stored on or visible to our servers.",
      "We use minimal, functional cookies and local storage to keep your cart and preferences (such as day/night mode and currency) working across visits — no third-party ad-tracking is used on this site.",
      "You may request a copy of the data we hold about you, or ask us to delete it, by contacting us through the details in our footer. We retain order records only as long as needed for accounting, warranty and legal purposes.",
    ],
    points: [],
  },
};

/**
 * The Returns & Refunds page. It follows the owner's cancel and return settings, so what it promises is
 * always what the order page actually offers.
 */
export function returnsPage(policy: OrderPolicy): ContentPageData {
  const days = policy.returnDays;
  const cancel =
    policy.customerCancel === "pending"
      ? "Changed your mind before we confirm your order? Open it from Track My Order and press “Cancel order”. Once we have confirmed it, please contact us and we will do our best to stop it."
      : policy.customerCancel === "confirmed"
        ? "Changed your mind before your order is packed? Open it from Track My Order and press “Cancel order”. Once it is packed, please contact us and we will do our best to stop it."
        : "To cancel an order, please contact us with your order number and we will do our best to stop it before it ships.";
  return {
    eyebrow: "Peace of Mind",
    title: "Returns & Refunds",
    description: `Unopened items can be returned within ${days} days of delivery for a full refund.`,
    points: [`${days}-day return window`, "Refund to original method", "COD refunds supported", "5-day processing"],
    body: [
      days > 0
        ? `Unopened items in their original packaging can be returned within ${days} days of delivery for a full refund to your original payment method, including Cash on Delivery orders. If something arrives damaged or faulty, tell us within 48 hours and we will replace it at no cost (see our Warranty Policy).`
        : "We do not accept returns of opened or used items. If something arrives damaged or faulty, tell us within 48 hours and we will replace it at no cost (see our Warranty Policy).",
      ...(days > 0
        ? [
            "## How to return an order",
            "1. Open your order. Go to Track My Order, enter your order number and the phone number you ordered with (or sign in), and press “Request a return” once the order shows Delivered.",
            `2. Tell us why. Add a short reason, for example “the bottle arrived damaged”. You can ask for a return up to ${days} days after delivery.`,
            "3. We contact you. Our team will call you or message you on WhatsApp to arrange the pick-up from your address, or another way to send it back to us.",
            "4. We check the item. When it reaches us we check that it is unopened and undamaged.",
            "5. You are refunded. Refunds are processed within 5 business days of the item reaching us. Online payments go back to the card or mobile account you paid with. For Cash on Delivery orders we refund by bKash or bank transfer to the number you give us.",
          ]
        : []),
      "## Cancelling an order",
      cancel,
      "Need help? Message or call us on the contact details at the bottom of this page, and quote your order number.",
    ],
  };
}
