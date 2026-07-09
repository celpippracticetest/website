import React from "react";
import MuiBox, { BoxProps as MuiBoxProps } from "@mui/material/Box";

/**
 * Box Component
 *
 * This wraps MUI's `Box` component so we can progressively migrate
 * the design system to MUI while keeping the existing `Box` API.
 *
 * - Preserves `className` so Tailwind-based styles continue to work
 * - Accepts all standard MUI `Box` props (sx, component, etc.)
 */
export interface BoxProps extends MuiBoxProps {
  children?: React.ReactNode;
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ children, ...props }, ref) => {
    return (
      <MuiBox ref={ref} {...props}>
        {children}
      </MuiBox>
    );
  },
);

Box.displayName = "Box";
