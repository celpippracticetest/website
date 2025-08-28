"use client";

import { useEffect } from "react";

export default function CriticalCSS() {
  useEffect(() => {
    // Only run in production and when component mounts

    // Enhanced critical CSS for better LCP performance
    const criticalCSS = `
      /* Critical LCP optimizations */
      .hero-section {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        contain: layout style paint;
        will-change: transform;
      }
      
      .logo-container {
        width: 133px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        contain: layout style paint;
        will-change: transform;
      }
      
      .hero-image {
        width: 327px;
        height: 491px;
        object-fit: contain;
        contain: layout style paint;
        will-change: transform;
        transform: translateZ(0);
      }
      
      /* Prevent layout shifts */
      .layout-stable {
        contain: layout style paint;
        will-change: transform;
      }
      
      /* Critical button styles */
      .cta-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 24px;
        border-radius: 24px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
        contain: layout style paint;
        will-change: transform;
      }
      
      /* Critical navigation */
      .main-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        contain: layout style paint;
        will-change: transform;
      }
      
      /* Font loading optimization */
      body {
        font-display: swap;
        text-rendering: optimizeSpeed;
      }
      
      /* Image optimization */
      img {
        max-width: 100%;
        height: auto;
        contain: layout style paint;
        will-change: transform;
      }
      
      /* Critical text rendering */
      h1, h2, h3 {
        contain: layout style;
        will-change: transform;
      }
      
      /* Prevent FOUC */
      .hero-section,
      .logo-container,
      .hero-image {
        opacity: 1 !important;
        visibility: visible !important;
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
