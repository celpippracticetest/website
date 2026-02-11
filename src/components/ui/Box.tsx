import React from "react";

/**
 * Box Component
 * A simple wrapper component to replace div with semantic Box naming
 * Provides type safety and consistent styling approach
 */
interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

Box.displayName = "Box";
