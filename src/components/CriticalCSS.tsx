"use client";

import { useEffect } from "react";

export default function CriticalCSS() {
  useEffect(() => {
    // Only run in production and when component mounts

    // Simple critical CSS for layout stability
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
      
      /* Prevent layout shifts */
      .layout-stable {
        contain: layout;
      }
    `;

    // Check if critical CSS already exists
    if (document.querySelector('style[data-critical="true"]')) {
      return;
    }

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
