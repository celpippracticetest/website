"use client";

import Image from "next/image";
import Link from "next/link";

export default function PassportMarketingFooter() {
  const currentYear = new Date().getFullYear();

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-navy text-white/70 py-12 lg:py-16 pb-24 lg:pb-16">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex mb-4 no-underline">
              <Image
                src="/images/logo.png"
                alt="CELPIP Practice Test"
                width={160}
                height={48}
                className="h-10 w-auto max-h-10 object-contain object-left drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              />
            </Link>
            <p className="text-sm leading-relaxed text-white/50" style={{ fontFamily: "var(--font-body)" }}>
              The most trusted CELPIP preparation platform in Canada. AI-powered practice tests and mock exams for your
              PR journey.
            </p>
          </div>

          <div>
            <h4
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "var(--font-body)" }}>
              Practice
            </h4>
            <ul className="space-y-2.5">
              {["Listening", "Reading", "Writing", "Speaking", "Mock Exams"].map((link) => (
                <li key={link}>
                  <button
                    type="button"
                    onClick={() => scrollTo("#features")}
                    className="text-sm text-white/50 hover:text-maple-light transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "var(--font-body)" }}>
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-white/50 hover:text-maple-light transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}>
                  Pricing
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo("#faq")}
                  className="text-sm text-white/50 hover:text-maple-light transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}>
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "var(--font-body)" }}>
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-white/50 hover:text-maple-light transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="text-sm text-white/50 hover:text-maple-light transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}>
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40 text-center sm:text-left" style={{ fontFamily: "var(--font-body)" }}>
              &copy; {currentYear} CELPIP Master. All rights reserved. CELPIP is a registered trademark of Paragon
              Testing Enterprises. This platform is not affiliated with or endorsed by Paragon Testing.
            </p>
            <div className="flex items-center gap-1 text-xs text-white/40" style={{ fontFamily: "var(--font-body)" }}>
              <span>Made with</span>
              <svg className="w-3.5 h-3.5 text-secondary2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 8.5L3 9L7.5 13L6 20L12 16.5L18 20L16.5 13L21 9L14.5 8.5L12 2Z" />
              </svg>
              <span>in Canada</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
