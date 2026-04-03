"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Mock Exams", href: "#mock-exams" },
  { label: "Pricing", href: "#pricing" },
  { label: "Reviews", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export default function PassportHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  /** Dark hero: 2.png. Scrolled / mobile menu open (light chrome): 1.png */
  const useLightLogo = scrolled || isOpen;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}>
      <div className="container">
        <div className="flex items-center justify-between h-16 lg:h-[4.5rem]">
          <Link href="/" className="flex items-center no-underline shrink-0">
            <Image
              src={useLightLogo ? "/images/1.png" : "/images/2.png"}
              alt="CELPIP Practice Test"
              width={200}
              height={60}
              priority
              sizes="(max-width: 1024px) 200px, 240px"
              className={`h-12 w-auto sm:h-14 object-contain object-left transition-opacity duration-300 ${
                useLightLogo ? "" : "drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
              }`}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className={`text-sm font-medium transition-colors font-body ${scrolled ? "text-navy/70 hover:text-maple" : "text-white/80 hover:text-white"}`}
                style={{ fontFamily: "var(--font-body)" }}>
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={`font-medium ${
                scrolled
                  ? "border-navy/20 text-navy hover:bg-navy hover:text-white"
                  : "border-navy/35 bg-white/95 text-navy shadow-sm hover:bg-white hover:text-navy"
              }`}
              style={{ fontFamily: "var(--font-body)" }}
              asChild>
              <Link href="/sign-in">Log In</Link>
            </Button>
            <Button
              size="sm"
              className="bg-maple hover:bg-maple-dark text-white font-semibold shadow-md"
              style={{ fontFamily: "var(--font-body)" }}
              asChild>
              <Link href="/sign-up">Start Free Trial</Link>
            </Button>
          </div>

          <button
            type="button"
            className={`lg:hidden p-2 ${scrolled ? "text-navy" : "text-white"}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border-b border-border overflow-hidden">
            <div className="container py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left py-3 px-4 text-base font-medium text-navy/80 hover:text-maple hover:bg-parchment rounded-lg transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}>
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-navy/20 text-navy font-medium"
                  style={{ fontFamily: "var(--font-body)" }}
                  asChild>
                  <Link href="/sign-in">Log In</Link>
                </Button>
                <Button
                  className="w-full bg-maple hover:bg-maple-dark text-white font-semibold"
                  style={{ fontFamily: "var(--font-body)" }}
                  asChild>
                  <Link href="/sign-up">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
