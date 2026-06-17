import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { isNonIndexableDeployment } from "./src/lib/searchIndexing";
import { PUBLIC_PAGE_CACHE_CONTROL } from "./src/lib/publicPageCache";

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
      ["/plans", "/pricing"],
      ["/celpip-for-medical-laboratory-technologist", "/celpip-for-medical-radiological-technologists"],
      ["/celpip-vs-ielts", "/blog/celpip-vs-ielts-format-fees-scoring"],
      ["/celpip-speaking-tips-for-healthcare", "/wiki/celpip-speaking-tips-high-score"],
      ["/celpip-speaking-tips", "/wiki/celpip-speaking-tips-high-score"],
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
      ["/blog/celpip-leauage", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/blog/celpip-vs-ielts-for-engineers", "/celpip-for-engineers"],
      ["/blog/celpip-writing-caregivers", "/celpip-for-caregiver-home-support"],
      ["/blog/celpip-writing-for-healthcare", "/how-to-pass-celpip-writing-for-healthcare"],
      ["/blog/clb-levels-for-engineers", "/celpip-for-engineers"],
      ["/blog/clb-levels-for-immigration", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/blog/clb-levels-guide", "/clb-7-explained"],
      ["/blog/engineering-emails-celpip", "/celpip-writing-task-1-samples"],
      ["/blog/grammar-checkers-for-esl", "/blog/can-chatgpt-grade-celpip-writing-score-8-9-10"],
      ["/celpip-for-dentists", "/celpip-for-dentist-dental-hygienist"],
      ["/celpip-for-physiotherapists", "/celpip-for-physiotherapist"],
      ["/celpip-for-real-estate-agents", "/celpip-for-real-estate"],
      ["/celpip-for-early-childhood-educators", "/celpip-for-educators"],
      ["/celpip-for-early-childhood-educator", "/celpip-for-educators"],
      ["/celpip-for-social-workers", "/celpip-for-social-worker"],
      ["/celpip-for-truck-drivers", "/celpip-for-commercial-truck-driver"],
      ["/celpip-for-electricians", "/celpip-for-skilled-trades"],
      ["/celpip-for-medical-assistants", "/celpip-for-healthcare"],
      ["/celpip-for-occupational-therapists", "/celpip-for-healthcare"],
      ["/celpip-for-pharmacist", "/celpip-for-pharmacists"],
      ["/celpip-clb-8-guide", "/how-to-score-clb-8-on-celpip"],
      ["/celpip-general-vs-ielts-general", "/blog/celpip-vs-ielts-format-fees-scoring"],
      ["/celpip-listening-for-healthcare", "/how-to-pass-celpip-listening"],
      ["/celpip-listening-tips", "/how-to-pass-celpip-listening"],
      ["/celpip-reading-mistakes", "/blog/celpip-reading-tips-and-tricks"],
      ["/celPIP-speaking-tips", "/wiki/celpip-speaking-tips-high-score"],
      ["/celpip-vs-ielts-for-educators", "/blog/celpip-for-eces-why-early-childhood-educators-are-switching-from-ielts-to-celpip-in-2026"],
      ["/celpip-vs-ielts-for-healthcare", "/celpip-vs-ielts-healthcare"],
      ["/celpip-vs-ielts-listening", "/how-to-pass-celpip-listening"],
      ["/celpip-writing-mistakes", "/blog/7-key-strategies-to-excel-in-celpip-writing-test"],
      ["/clb-levels-explained", "/clb-7-explained"],
      ["/clb-levels-for-nurses", "/celpip-for-nurses"],
      ["/clb-levels-healthcare", "/clb-7-explained"],
      ["/common-celpip-writing-errors", "/celpip-for-writing-failures"],
      ["/free-celpip-practice-test-teachers", "/free-celpip-practice-test"],
      ["/how-to-book-celpip", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/how-to-book-celpip-bc", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/how-to-get-clb-7-in-celpip-writing", "/wiki/celpip-writing-score-guide"],
      ["/how-to-pass-celpip-speaking", "/celpip-speaking-tips-for-beginners"],
      ["/how-to-score-clb-7-in-celpip-speaking", "/wiki/celpip-speaking-score-guide"],
      ["/how-to-score-clb-7-in-celpip-writing", "/wiki/celpip-writing-score-guide"],
      ["/improve-clb-score", "/wiki/what-is-clb-7-and-how-to-improve-it"],
      ["/ircc-medical-worker-visa-requirements", "/celpip-for-healthcare"],
      ["/pass-celpip-listening-2-weeks", "/how-to-pass-celpip-listening"],
      ["/what-is-paragon", "/exam-overview"],
      ["/wiki/celpip-listening-practice", "/how-to-pass-celpip-listening"],
      ["/wiki/celpip-practice-test", "/free-celpip-practice-test"],
      ["/wiki/celpip-scores-for-express-entry", "/wiki/celpip-for-express-entry"],
      ["/wiki/free-celpip-practice-tests", "/free-celpip-practice-test"],
      ["/write-care-report-eng", "/how-to-pass-celpip-writing-for-healthcare"],
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
      {
        source:
          "/:path(blog|wiki|pricing|score-calculator|privacy-policy|terms-of-service|contact-us|refund-policy|editorial-policy|free-celpip-practice-test|celpip-speaking-samples|celpip-writing-task-1-samples|celpip-writing-task-2-samples)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: PUBLIC_PAGE_CACHE_CONTROL,
          },
        ],
      },
      {
        source:
          "/:path(blog|wiki|pricing|score-calculator|privacy-policy|terms-of-service|contact-us|refund-policy|editorial-policy|free-celpip-practice-test|celpip-speaking-samples|celpip-writing-task-1-samples|celpip-writing-task-2-samples)",
        headers: [
          {
            key: "Cache-Control",
            value: PUBLIC_PAGE_CACHE_CONTROL,
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: PUBLIC_PAGE_CACHE_CONTROL,
          },
        ],
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
