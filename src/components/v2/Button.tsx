import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const v2ButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-[4px] active:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#2563EB] text-white shadow-[0_6px_0_0_#93C5FD] hover:bg-[#3B82F6] hover:shadow-[0_6px_0_0_#60A5FA] disabled:bg-[#E5E7EB] disabled:text-[#6B7280]",
        secondary:
          "bg-[#F9735F] text-white shadow-[0_6px_0_0_#FEB2A8] hover:bg-[#FB8A74] hover:shadow-[0_6px_0_0_#FEC6BE] disabled:bg-[#E5E7EB] disabled:text-[#6B7280]",
      },
      size: {
        sm: "h-10 px-6 text-[16px]",
        md: "h-12 px-8 text-[18px]",
        lg: "h-16 px-10 text-[20px]",
        default: "h-[60px] px-12 text-[20px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof v2ButtonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(v2ButtonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, v2ButtonVariants };
