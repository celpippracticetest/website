import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const v2ButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none transition-all duration-300 ease-in-out transform-gpu will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 hover:-translate-y-[2px] disabled:hover:translate-y-0 active:translate-y-[6px] active:translate-x-[2px] cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-button-primary text-white shadow-[3.69px_3.91px_0_0_rgba(117,156,255,1)] hover:bg-button-primary active:shadow-[0px_0px_0_0_rgba(117,156,255,0)] disabled:bg-button-disabled disabled:text-[#6B7280] disabled:hover:bg-button-disabled",
        secondary:
          "bg-button-secondary text-white shadow-[3.69px_3.91px_0_0_rgba(117,156,255,1)] hover:bg-button-secondary active:shadow-[0px_0px_0_0_rgba(117,156,255,0)] disabled:bg-button-disabled disabled:text-[#6B7280] disabled:hover:bg-button-disabled",
      },
      size: {
        sm: "h-[40px] w-[100px] text-[14px]",
        md: "h-[48px] w-[200px] text-[16px]",
        mp: "h-[55px] w-[220px] text-[16px]",
        lg: "h-[56px] w-[260px] text-[18px]",
      },
      round: {
        none: "",
        sm: "h-[40px] w-[40px] rounded-full p-0",
        md: "h-[46px] w-[46px] rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "mp",
      round: "none",
    },
  }
);

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
type ButtonBaseProps = VariantProps<typeof v2ButtonVariants> & {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
};
type ButtonLinkProps = ButtonBaseProps &
  Omit<AnchorProps, keyof React.ButtonHTMLAttributes<HTMLButtonElement>> & {
    href: string;
  };
type ButtonButtonProps = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };
export type ButtonProps = ButtonLinkProps | ButtonButtonProps;

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, round, asChild = false, href, children, ...props }, ref) => {
    const classes = cn(
      v2ButtonVariants({ variant, size, round, className }),
      round && round !== "none" ? "shadow-[2.67px_2.67px_0_0_rgba(117,156,255,1)]" : undefined
    );

    if (asChild) {
      return (
        <Slot className={`${classes} cursor-pointer`} ref={ref as React.Ref<HTMLElement>} {...props}>
          {children}
        </Slot>
      );
    }

    if (href) {
      return (
        <Link href={href} className={`${classes} cursor-pointer`} ref={ref as React.Ref<HTMLAnchorElement>} {...(props as AnchorProps)}>
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
