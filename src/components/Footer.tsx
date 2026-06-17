"use client";
import React from "react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";

const Footer = () => {
  const isMobile = useIsMobile();

  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="cel-container">
        {/* Footer Disclaimer */}
        <div className="max-w-[95%] md:max-w-[95%] lg:max-w-[75%] mx-auto">
          <Separator className="mb-6 bg-gray-500" />

          {/* Disclaimer section - different versions for mobile vs desktop */}
          <div className="text-gray-300 text-[14px] mb-6">
            {!isMobile ? (
              <div className="footer-disclaimer-full space-y-4">
                <p>
                  <Link
                    href="/terms-of-service"
                    className="text-blue-300 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-blue-300 hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  for additional details on your rights and obligations.
                </p>
              </div>
            ) : (
              <div className="footer-disclaimer-short">
                <p className="text-center">
                  <Link
                    href="/terms-of-service"
                    className="text-blue-300 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-blue-300 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>

          {/* Copyright line - moved below the disclaimer */}
          <div className="text-center">
            <p className="text-gray-200 font-medium">
              © {new Date().getFullYear()} CELPIPPRACTICETEST.com. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
