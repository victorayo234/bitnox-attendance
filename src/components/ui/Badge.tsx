import React from "react";

export type BadgeVariant =
  | "present"
  | "late"
  | "absent"
  | "neutral"
  | "primary"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  withDot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  present: {
    container: "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20",
    dot: "bg-[#16A34A]",
  },
  late: {
    container: "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/20",
    dot: "bg-[#F59E0B]",
  },
  absent: {
    container: "bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20",
    dot: "bg-[#EF4444]",
  },
  neutral: {
    container: "bg-soft text-muted border border-border",
    dot: "bg-muted",
  },
  primary: {
    container: "bg-primary/10 text-primary border border-primary/20",
    dot: "bg-primary",
  },
  outline: {
    container: "bg-white text-muted border border-border",
    dot: "bg-muted",
  },
};

export function Badge({
  variant = "neutral",
  withDot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium leading-normal select-none ${styles.container} ${className}`}
      {...props}
    >
      {withDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
