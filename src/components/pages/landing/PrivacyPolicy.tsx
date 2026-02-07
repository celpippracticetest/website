"use client";
import React, { useEffect, useRef, useState } from "react";
import TopHeader from "./TopHeader";

const PrivacyPolicy = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

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


  const data = [
    {
      title: "Introduction",
      description: `Welcome to CELPIPPRACTICETEST.com ("we," "our," or "us"). We respect your privacy and are committed to protecting it. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit https://celpippracticetest.com (the "Site") or use our services (collectively, the "Services").`,
    },
    {
      title: "1. Information We Collect",
      data: [
        {
          description: `Account Information`,
          lists: [
            "Full name and email address when you register.",
            "Password for account authentication.",
            "(Optional) Social login data strictly for authentication.This data is collected solely for account creation, communication, and providing access to our services.",
            "Notify us immediately of unauthorized use.",
          ],
        },
        {
          description: `Practice Data`,
          lists: [
            "Your responses and scores on practice tests to help you track progress.",
          ],
        },
        {
          description: `Device & Usage Data`,
          lists: [
            "IP address, browser type, pages visited, time spent on pages, and other analytics collected via cookies and similar technologies.",
          ],
        },
      ],
    },
    {
      title: "2. How We Use Your Information",
      description: ``,
      lists: [
        "Provide & Improve Services: Authenticate you, deliver practice tests, track progress, and enhance features.",
        "Customer Support: Respond to your inquiries and support requests.",
        "Analytics:Analyze usage data (e.g., time spent on pages, IP address, browser type, device type) to improve the Site.",
        "Legal Compliance: Fulfill legal obligations.",
      ],
    },
    {
      title: "3. Cookies & Tracking",

      data: [
        {
          description: `We use cookies, web beacons, and similar technologies to:`,
          lists: [
            "Remember your preferences and login status.",
            "Analyze site usage and performance.",
            "Deliver personalized content and measure ad effectiveness.",
          ],
        },
        {
          description: `Third-Party Access:`,
          lists: [
            "Non-personally-identifiable usage data may be shared with third-party analytics and advertising partners for marketing purposes.",
          ],
        },
      ],
    },
    {
      title: "4. Large Language Models (LLMs) & AI Feedbac",
      description: `Our platform may process your text inputs and voice recordings from writing and speaking practice tests using third-party Large Language Models (LLMs) to generate AI-driven feedback. We do not send any personal information to the LLM; only feedback related to writing and speaking practices is sent. We do not control how those LLM providers handle or store your data, and CELPIPPRACTICETEST.com assumes no responsibility or liability for any use or disclosure of your inputs by those providers.`,
    },
    {
      title: "5. Information We Do Not Collect or Share",
      lists: [
        "We do not track your activity across unrelated websites.",
        "We do not sell or rent your personal information.",
        "We do not use your data for unsolicited marketing without consent.",
      ],
    },
    {
      title: "6. Data Retention & Security",
      lists: [
        "We retain your personal and usage data only as long as necessary to provide Services or comply with legal obligations.",
        "We implement industry-standard security measures, including encryption for sensitive data such as full name and email address, to protect your information. However, no system is completely secu",
      ],
    },
    {
      title: "7. Children’s Privacy",
      description: `Our Services are not intended for anyone under 16. We do not knowingly collect personal information from children under 16. If you become aware that a child has provided us with personal information without parental consent, please contact us immediately, and we will take steps to remove such information.`,
    },
    {
      title: "8. Your Choices",
      lists: [
        "Cookies: You can disable cookies in your browser settings, though some features may not function properly.",
        "Account: You may update or delete your account and associated data at any time in your profile settings.",
        "Opt‑Out: To opt out of analytics sharing or marketing communications, please contact us at support@celpippracticetest.com.",
      ],
    },
    {
      title: "9. Changes to This Policy",
      description: `We may revise this Privacy Policy at any time. The “Last Updated” date will reflect the change. Significant updates to the platform or this policy will be communicated to users via their registered email address. Continuing to use the Site after updates constitutes acceptance of the revised policy.`,
    },
    {
      title: "10. Contact Us",
      description: ` If you have questions or concerns, please reach out:`,
      link: `Email: support@celpippracticetest.com`,
    },
  ];

  return (
    <>
      <TopHeader />

      <div className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">Privacy Policy</h1>
        <span className="mt-[16px] font-normal text-[16px] text-text3">
          Last Updated: Apr 17, 2025
        </span>
        {data?.map((element, index) => (
          <div key={index} className="mt-[40px]">
            <div className="flex flex-col">
              <h2 className="font-semibold text-[20px]">{element.title}</h2>
              <span className="font-normal text-[18px] mt-[17px]">
                {element?.description}
              </span>
              {element?.data && (
                <div className="">
                  <div className="flex flex-col">
                    {element?.data?.map((info, index) => (
                      <div key={index}>
                        <h3 className="font-normal text-[18px]">
                          {info?.description}
                        </h3>
                        {info?.lists && (
                          <ul className="pl-[20px]">
                            {info?.lists?.map((list, index) => (
                              <li key={index} className="list-disc text-[18px]">
                                {list}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {element?.link && (
                <span className="font-normal text-[18px]  text-primary1">
                  {element?.link}
                </span>
              )}
              {element?.lists && (
                <ul className="pl-[20px]">
                  {element?.lists?.map((list, index) => (
                    <li key={index} className="list-disc text-[18px]">
                      {list}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        <div className="h-[1px] bg-outline mt-[61px]"></div>
        <span className="font-normal text-[16px] text-text3 mt-[20px]">
          © 2025 CELPIPPRACTICETEST.com. All rights reserved.
          CELPIPPRACTICETEST.com is not affiliated with, endorsed by, or
          sponsored by any official testing organization.
        </span>
      </div>    </>
  );
};

export default PrivacyPolicy;
