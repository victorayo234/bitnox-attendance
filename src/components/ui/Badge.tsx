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
    container: "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/25",
    dot: "bg-present",
  },
  late: {
    container: "bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/25",
    dot: "bg-late",
  },
  absent: {
    container: "bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/25",
    dot: "bg-absent",
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
    container: "bg-transparent text-primary border border-border",
    dot: "bg-primary",
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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${styles.container} ${className}`}
      {...props}
    >
      {withDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
