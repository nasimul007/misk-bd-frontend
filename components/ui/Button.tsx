import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "fill" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, CSSProperties> = {
  sm: { padding: "0.55rem 1.25rem", fontSize: "0.8rem" },
  md: { padding: "0.9rem 2rem", fontSize: "0.95rem" },
  lg: { padding: "1.05rem 2.5rem", fontSize: "1.05rem" },
};

type Props = {
  variant?: Variant;
  size?: Size;
  href?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "className" | "children">;

/** Maison pill button: fill (primary CTA), outline (gold hairline), ghost (ink hairline). */
export function Button({ variant = "fill", size = "md", href, icon, iconRight, className = "", style, children, ...rest }: Props) {
  const base = variant === "fill" ? "lux-btn-fill" : "lux-btn";
  const modifier = variant === "ghost" ? " lux-btn--ghost" : "";
  const cls = `${base}${modifier} lux-focus ${className}`.trim();
  const content = (
    <>
      {icon && <span aria-hidden style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
      {iconRight && <span aria-hidden style={{ display: "inline-flex" }}>{iconRight}</span>}
    </>
  );
  const merged = { ...sizes[size], ...style };
  if (href) {
    return <Link href={href} className={cls} style={merged}>{content}</Link>;
  }
  return <button className={cls} style={merged} {...rest}>{content}</button>;
}
