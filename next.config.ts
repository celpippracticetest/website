import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { isNonIndexableDeployment } from "./src/lib/searchIndexing";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  async redirects() {
    /** Legacy / mistaken paths linked from older content; targets verified in prod DB (Apr 2026). */
    const fixes = [
      ["/celpip-for-medical-laboratory-technologist", "/celpip-for-medical-radiological-technologists"],
      ["/celpip-vs-ielts", "/blog/celpip-vs-ielts-format-fees-scoring"],
      ["/celpip-speaking-tips-for-healthcare", "/wiki/celpip-speaking-tips-high-score"],
      ["/how-to-score-clb-7-on-celpip-for-nursing", "/celpip-for-nurses"],
      ["/celpip-speaking-for-nurses", "/celpip-for-nurses"],
      ["/ircc-language-requirements-for-nurses", "/blog/celpip-2026-canadian-immigration-updates"],
      ["/pass-celpip-writing", "/blog/7-key-strategies-to-excel-in-celpip-writing-test"],
      ["/pass-celpip-writing-for-healthcare", "/how-to-pass-celpip-writing-for-healthcare"],
      ["/celpip-writing-for-healthcare", "/how-to-pass-celpip-writing-for-healthcare"],
      ["/clb-levels-for-immigration", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/clb-levels-for-healthcare", "/clb-7-explained"],
      ["/sign-in/clerk", "/sign-in/legacy"],
      ["/sign-up/clerk", "/sign-up/legacy"],
      ["/celpip-writing-email-tips", "/blog/celpip-writing-task-1-samples-email-tone-clb-9-2026"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
    return fixes;
  },

  async rewrites() {
    return [
      // First-party proxy for GA4 gtag.js and collect endpoint
      {
        source: "/gtag/js",
        destination: "https://www.googletagmanager.com/gtag/js",
      },
      {
        source: "/g/collect",
        destination: "https://www.google-analytics.com/g/collect",
      },
      {
        source: "/g/collect/:path*",
        destination: "https://www.google-analytics.com/g/collect/:path*",
      },
    ];
  },

  // Security Headers
  headers: async () => {
    const isDev = process.env.NODE_ENV === "development";
    const globalHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self';",
      },
    ];

    // HSTS on localhost breaks http://localhost:3001 after OAuth (Chrome → https → error page).
    if (!isDev) {
      globalHeaders.splice(1, 0, {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    if (isNonIndexableDeployment(process.env.APP_BASE_URL)) {
      globalHeaders.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      });
    }

    return [
      {
        source: "/:path*",
        headers: globalHeaders,
      },
    ];
  },

  // Bundle optimizations
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      "framer-motion",
      "chart.js",
      "react-chartjs-2",
    ],
  },

  // Image optimizations
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "celtest-audio.s3.eu-north-1.amazonaws.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "acac98ae11ea860f690cce3ad5dcb630.r2.cloudflarestorage.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        port: "",
      },
      {
        protocol: "https",
        hostname: "pub-4e7dbebb45ca4fc1bdc4e071081759ca.r2.dev",
        port: "",
      },
      {
        protocol: "https",
        hostname: "celtest-audio.s3.eu-north-1.amazonaws.com",
        port: "",
      },
    ],
  },

  // Build optimizations
  typescript: {
    ignoreBuildErrors: true,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enhanced optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Advanced chunk splitting
      config.optimization.splitChunks = {
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
            enforce: true,
          },
          // React specific
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "react",
            chunks: "all",
            priority: 20,
            enforce: true,
          },
          // UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion)[\\/]/,
            name: "ui",
            chunks: "all",
            priority: 12,
            enforce: true,
          },
          // Common chunks
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // Enable module concatenation
      config.optimization.concatenateModules = true;

      // Enable tree shaking
      config.optimization.minimize = true;
    }
    return config;
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "49-studio",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
