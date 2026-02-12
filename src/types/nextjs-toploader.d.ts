declare module "nextjs-toploader" {
  import * as React from "react";

  export type NextTopLoaderProps = {
    color?: string;
    initialPosition?: number;
    crawlSpeed?: number;
    height?: number;
    crawl?: boolean;
    showSpinner?: boolean;
    easing?: string;
    speed?: number;
    shadow?: string | false;
    template?: string;
    zIndex?: number;
    showAtBottom?: boolean;
    showForHashAnchor?: boolean;
    nonce?: string;
  };

  const NextTopLoader: React.ComponentType<NextTopLoaderProps>;
  export default NextTopLoader;
}
