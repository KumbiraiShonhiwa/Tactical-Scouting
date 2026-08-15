import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary-900 text-white hover:bg-primary-900/90",
  secondary:
    "bg-white text-primary-900 border border-primary-900/20 hover:bg-neutral-100",
  danger: "bg-warning-amber text-white hover:bg-warning-amber/90",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`interactive-control inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
