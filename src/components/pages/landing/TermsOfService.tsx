"use client";
import React, { useEffect, useRef, useState } from "react";
import TopHeader from "./TopHeader";
import Footer from "./Footer";

const TermsOfService = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Intercom) {
      (window as any).Intercom("show");
    }
    return () => {
      if (typeof window !== "undefined" && (window as any).Intercom) {
        (window as any).Intercom("hide");
      }
    };
  }, []);
  useEffect(() => {
    const checkMenu = (event: MouseEvent) => {
      if (sidebarMenuRef?.current) {
        if (!sidebarMenuRef?.current.contains(event.target as Node)) {
          setIsMenuOpen(false);
        }
      }
    };

    window.document.addEventListener("mousedown", checkMenu);
  }, []);

  useEffect(() => {
    const handleSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleSize);
  }, []);

  useEffect(() => {
    if (isMenuOpen === true && dimensions.width <= 1279) {
      document.body.classList.add("overflow-hidden");
    } else if (isMenuOpen === false && dimensions.width <= 1279) {
      document.body.classList.remove("overflow-hidden");
    }
    if (isMenuOpen === true && dimensions.width > 1279) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, dimensions]);
  const hrefs = ["/exam-overview", "/practice-overview", "/wiki"];

  const data = [
    {
      title: "Introduction",
      description: `   Welcome to CELPIPPRACTICETEST.com. These Terms of Service ("Terms") govern your
            access to and use of our website at https://celpippracticetest.com (the "Site")
            and any related services (together, the "Services"). By accessing or
            using the Site, you agree to be bound by these Terms. If you do not
            agree, please discontinue use immediately.`,
    },
    {
      title: "1. Acceptance of Terms",
      description: `   By creating an account, subscribing, or using our Services, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy.`,
    },
    {
      title: "2. Description of Services",
      description: `CELPIPPRACTICETEST.com is an independent, third‑party platform offering realistic practice tests, skill‑building exercises, and AI‑driven feedback to help you prepare for English language proficiency exams. All content is original—created by language experts—and no copyrighted materials have been reproduced.`,
    },
    {
      title: "3. User Accounts",
      description: `Some features require registration. You agree to:`,
      lists: [
        "Provide accurate, complete information.",
        "Keep your password and account secure.",
        "Be responsible for all activity under your account.",
        "Notify us immediately of unauthorized use.",
      ],
    },
    {
      title: "4. User Conduct",
      description: `You will not:`,
      lists: [
        "Use the Site for illegal purposes.",
        "Attempt unauthorized access to the Site or its systems.",
        "Interfere with the Site’s operation or security.",
        "Copy, sell, or exploit any part of the Site.",
        "Use bots, scrapers, or other automated means to access the Site.",
        "Transmit viruses, malware, or other harmful code.",
      ],
    },
    {
      title: "5. Intellectual Property",
      description: `All text, images, graphics, code, and other content on the Site are owned by CELPIPPRACTICETEST.com or our licensors and protected by Canadian and international copyright laws. You are granted a limited, non‑exclusive, non‑transferable license to use the Site for personal, non‑commercial purposes only.`,
    },
    {
      title: "6. Subscription, Payment & Refund Policy",
      sub: [
        {
          title: "    6.1. Subscription & Pricing",
          description: `Our current subscription plans and pricing are published on the Pricing page of the Site and may be updated or offered at promotional rates at any time. By subscribing, you agree to pay all fees associated with your selected plan.`,
        },
        {
          title: "6.2. Refund Policy",
          lists: [
            "Eligibility Window: Refunds are available only within 24 hours of your first successful payment, provided you have not completed more than one mock exam or two practice activities in any skill.",
            "How to Request: Email support@celpippracticetest.com with your account details and request a refund within the 24-hour window.",
            "Finality: All refund requests submitted after 24 hours will be denied. Refunds will also be denied if you have completed more than one mock exam or more than two practices of any skill, regardless of timing. Disputing the charge with your financial institution will not change this policy, as you agreed to these Terms during registration.",
          ],
        },
      ],
    },
    {
      title: "7. Disclaimer of Warranties",
      description: `The Site and Services are provided “as is” and “as available,” without warranties of any kind, express or implied. CELPIPPRACTICETEST.com disclaims all warranties, including merchantability, fitness for a particular purpose, and non‑infringement.`,
    },
    {
      title: "8. Limitation of Liability",
      description: `To the fullest extent permitted by law, CELPIPPRACTICETEST.com shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Site or Services, even if advised of the possibility of such damages.`,
    },
    {
      title: "9. Third‑Party Links",
      description: `Our Site may contain links to third‑party websites. These links are provided for convenience only; we do not endorse or assume responsibility for their content.`,
    },
    {
      title: "10. Termination",
      description: `We may suspend or terminate your access at any time without notice if you breach these Terms or for any other reason at our sole discretion.`,
    },
    {
      title: "11. Changes to Terms",
      description: `We may update these Terms from time to time. The “Last Updated” date will reflect the change. Your continued use after any update constitutes acceptance of the revised Terms.`,
    },
    {
      title: "12. Governing Law",
      description: `These Terms are governed by the laws of Canada, without regard to its conflict‑of‑law provisions.`,
    },
    {
      title: "13. Contact Information",
      description: `If you have questions or need assistance, please reach out to us at: Email: support@celpippracticetest.com`,
    },
  ];

  return (
    <>
      <TopHeader />

      <div className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">
          Terms of Service
        </h1>
        <span className="mt-[16px] font-normal text-[16px] text-text3">
          Last Updated: Apr 17, 2025
        </span>
        {data?.map((element, index) => (
          <div key={index} className="mt-[40px]">
            <div className="flex flex-col">
              <h2 className="font-semibold text-[20px]">{element.title}</h2>
              <p className="font-normal text-[18px] mt-[17px]">
                {element?.description}
              </p>
              {element?.lists && (
                <ul className="pl-20">
                  {element?.lists?.map((list, index) => (
                    <li key={index} className="list-disc  text-[18px]">
                      {list}
                    </li>
                  ))}
                </ul>
              )}

              {element?.sub && (
                <>
                  {element?.sub?.map((list, index) => (
                    <div key={index} className="mt-[40px]">
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-[20px] ml-[28px]">
                          {list.title}
                        </h3>
                        <p className="font-normal text-[18px] mt-[17px]">
                          {list?.description}
                        </p>
                        {list?.lists && (
                          <ul className="pl-[10px] text-[18px]">
                            {list?.lists?.map((list, index) => (
                              <li key={index} className="list-disc ml-[10px]">
                                {list}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
        <div className="h-[1px] bg-outline mt-[61px]"></div>
        <p className="font-normal text-[16px] text-text3 mt-[20px]">
          © 2025 CELPIPPRACTICETEST.com. All rights reserved.
          CELPIPPRACTICETEST.com is not affiliated with, endorsed by, or
          sponsored by any official testing organization.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default TermsOfService;
