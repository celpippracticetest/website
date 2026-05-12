"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

const navLinks = [
  { label: "Plans", href: "/pricing" },
  { label: "Practice", href: "/practice-overview" },
  { label: "Exam mode", href: "/exam-overview" },
  { label: "FAQ", href: "/#faq" },
] as const;

export default function ClassicHomeHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isLoaded, isSignedIn } = useHybridWebUser();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInPageSectionClick = (
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    setIsOpen(false);
    if (typeof window === "undefined" || window.location.pathname !== "/") {
      return;
    }
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return;
    const hash = href.slice(hashIndex);
    e.preventDefault();
    window.history.replaceState(null, "", href);
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80" : "bg-[#F4F7FF]/90 backdrop-blur-sm border-b border-transparent"
      }`}>
      <div className="max-w-[1440px] mx-auto px-4 screen1280:px-10">
        <div className="flex items-center justify-between h-16 lg:h-[4.25rem]">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/images/logo.png"
              alt="CELPIP Practice Test"
              width={200}
              height={60}
              priority
              sizes="(max-width: 1024px) 180px, 200px"
              className="h-10 w-auto sm:h-11 object-contain object-left"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleInPageSectionClick(e, link.href)}
                className="text-sm font-medium text-text2 hover:text-primary1 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {isLoaded ? (
              isSignedIn ? (
                <Link
                  href="/practice-overview"
                  className="text-sm font-semibold text-white bg-primary1 hover:bg-primary1/90 px-5 py-2.5 rounded-full shadow-sm transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-text1 hover:text-primary1 px-3 py-2 rounded-full border border-primary5/40 hover:border-primary1/50 transition-colors">
                    Log in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-sm font-semibold text-white bg-primary1 hover:bg-primary1/90 px-5 py-2.5 rounded-full shadow-sm transition-colors">
                    Sign up
                  </Link>
                </>
              )
            ) : null}
          </div>

          <button
            type="button"
            className="lg:hidden p-2 text-text1"
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
            className="lg:hidden bg-white border-b border-gray-200 overflow-hidden">
            <div className="max-w-[1440px] mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleInPageSectionClick(e, link.href)}
                  className="block w-full text-left py-3 px-3 text-base font-medium text-text1 hover:bg-primary5/20 rounded-xl">
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {isLoaded ? (
                  isSignedIn ? (
                    <Link
                      href="/practice-overview"
                      className="block w-full text-center py-3 rounded-xl bg-primary1 text-white font-semibold"
                      onClick={() => setIsOpen(false)}>
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="block w-full text-center py-3 rounded-xl border border-primary5/40 text-text1 font-medium"
                        onClick={() => setIsOpen(false)}>
                        Log in
                      </Link>
                      <Link
                        href="/sign-up"
                        className="block w-full text-center py-3 rounded-xl bg-primary1 text-white font-semibold"
                        onClick={() => setIsOpen(false)}>
                        Sign up
                      </Link>
                    </>
                  )
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
