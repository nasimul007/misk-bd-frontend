import { Award, Banknote, Clock, Gift, Heart, Lock, Package, Phone, ShieldCheck, Sparkles, Star, Truck, Undo2, type LucideIcon } from "lucide-react";

/** Icons the trust bar can show. The admin picks from these names; anything else falls back to a shield. */
export const TRUST_ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  truck: Truck,
  banknote: Banknote,
  "undo-2": Undo2,
  sparkles: Sparkles,
  gift: Gift,
  star: Star,
  heart: Heart,
  package: Package,
  lock: Lock,
  clock: Clock,
  phone: Phone,
  award: Award,
};
export const TRUST_ICON_NAMES = Object.keys(TRUST_ICONS);
