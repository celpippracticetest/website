import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Workbox options
  buildExcludes: [
    /middleware-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-audio-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-video-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "static-data-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
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
      ["/ircc-language-requirements-for-nurses", "/blog/celpip-2026-canadian-immigration-updates"],
      ["/pass-celpip-writing", "/blog/7-key-strategies-to-excel-in-celpip-writing-test"],
      ["/clb-levels-for-immigration", "/blog/complete-guide-celpip-test-booking-results-clb"],
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
      ["/celpip-general-vs-ielts-general", "/blog/celpip-vs-ielts-format-fees-scoring"],
      ["/celpip-reading-mistakes", "/blog/celpip-reading-tips-and-tricks"],
      ["/celpip-writing-mistakes", "/blog/7-key-strategies-to-excel-in-celpip-writing-test"],
      ["/how-to-book-celpip", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/how-to-book-celpip-bc", "/blog/complete-guide-celpip-test-booking-results-clb"],
      ["/score-calculator", "/blog/complete-guide-celpip-test-booking-results-clb"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
    return fixes;
  },

  async rewrites() {
    return [
      // Google Tag Gateway — routes GTM & GA4 through first-party domain
      // to improve ad-blocker bypass and eliminate third-party cookie issues
      {
        source: "/gtm/js",
        destination: "https://www.googletagmanager.com/gtm.js",
      },
      {
        source: "/gtm/ns.html",
        destination: "https://www.googletagmanager.com/ns.html",
      },
      // GTM first-party mode loads `sw_iframe.html` (and related SW assets) under
      // `/gtm/js/_/service_worker/<version>/…` on the site origin — proxy to Google.
      {
        source: "/gtm/js/_/service_worker/:path*",
        destination:
          "https://www.googletagmanager.com/static/service_worker/:path*",
      },
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
    const globalHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
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

    if (process.env.VERCEL_ENV === "preview") {
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
    qualities: [75, 90, 100],
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

export default withSentryConfig(withPWA(withBundleAnalyzer(nextConfig)), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN provided in the auth token var is the same as the one in your env.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  sourcemaps: {
    disable: false,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
