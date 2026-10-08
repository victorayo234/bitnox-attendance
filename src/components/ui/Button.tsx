import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-[#122654] active:bg-[#08142F] focus-visible:ring-primary shadow-[0_1px_2px_rgba(11,27,63,0.04)]",
  secondary:
    "bg-white text-primary border border-border hover:bg-soft active:bg-[#E5ECF8] focus-visible:ring-primary shadow-[0_1px_2px_rgba(11,27,63,0.04)]",
  outline:
    "bg-white text-primary border border-border hover:bg-soft active:bg-[#E5ECF8] focus-visible:ring-primary shadow-[0_1px_2px_rgba(11,27,63,0.04)]",
  ghost:
    "bg-transparent text-primary hover:bg-soft active:bg-[#E5ECF8] focus-visible:ring-primary",
  "danger-ghost":
    "bg-transparent text-absent hover:bg-red-50 active:bg-red-100 focus-visible:ring-absent",
  danger:
    "bg-absent text-white hover:bg-[#DC2626] active:bg-[#B91C1C] focus-visible:ring-absent shadow-xs",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] font-medium leading-none",
  md: "h-10 px-4 text-sm font-medium leading-none",
  lg: "h-12 px-6 text-base font-medium leading-none",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const buttonClasses = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none ${
      variantStyles[variant]
    } ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: `${buttonClasses} ${child.props.className || ""}`.trim(),
      });
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={buttonClasses}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon && <span className="mr-2 inline-flex items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
