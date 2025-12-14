import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const v2ButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none transition-transform transition-shadow transition-colors duration-300 ease-in-out transform-gpu will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 hover:-translate-y-[2px] active:translate-y-[6px] active:translate-x-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-button-primary text-white shadow-[2px_6px_0_0_rgba(117,156,255,1)] hover:bg-button-primary disabled:bg-button-disabled disabled:text-[#6B7280]",
        secondary:
          "bg-button-secondary text-white shadow-[2px_6px_0_0_rgba(117,156,255,1)] hover:bg-button-secondary disabled:bg-button-disabled disabled:text-[#6B7280]",
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

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    AnchorProps,
    VariantProps<typeof v2ButtonVariants> {
  asChild?: boolean;
  href?: string;
}

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, asChild = false, href, children, ...props }, ref) => {
    const classes = cn(v2ButtonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot className={classes} ref={ref as React.Ref<any>} {...props}>
          {children}
        </Slot>
      );
    }

    if (href) {
      return (
        <Link href={href} className={classes} ref={ref as React.Ref<any>} {...(props as AnchorProps)}>
          {children}
        </Link>
      );
    }

    return (
      <button className={classes} ref={ref as React.Ref<HTMLButtonElement>} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, v2ButtonVariants };
