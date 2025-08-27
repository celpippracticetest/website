"use client";

import { useEffect } from "react";

export default function CriticalCSS() {
  useEffect(() => {
    // Inline critical CSS for above-the-fold content
    const criticalCSS = `
      .hero-section {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .logo-container {
        width: 133px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .hero-image {
        width: 327px;
        height: 491px;
        object-fit: contain;
      }
      
      .nav-container {
        display: flex;
        align-items: center;
        gap: 24px;
      }
      
      /* Prevent layout shifts */
      .layout-stable {
        contain: layout;
      }
      
      /* Optimize font rendering */
      .font-optimized {
        font-display: swap;
        text-rendering: optimizeLegibility;
      }
    `;

    // Create and inject critical CSS
    const style = document.createElement("style");
    style.textContent = criticalCSS;
    style.setAttribute("data-critical", "true");

    // Insert at the beginning of head for highest priority
    document.head.insertBefore(style, document.head.firstChild);

    return () => {
      // Cleanup on unmount
      const criticalStyle = document.querySelector(
        'style[data-critical="true"]'
      );
      if (criticalStyle) {
        criticalStyle.remove();
      }
    };
  }, []);

  return null;
}
