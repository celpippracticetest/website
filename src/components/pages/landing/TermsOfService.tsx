"use client";
import React, { useEffect, useRef, useState } from "react";

const TermsOfService = () => {
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
      description: `Welcome to CELPIPPRACTICETEST.com (“we,” “us,” or “our”). These Terms of Service (“Terms”) govern your access to and use of our website at https://celpippracticetest.com (the “Site”) and all related digital services (collectively, the “Services”).
By accessing, registering for, subscribing to, or using the Services, you agree to be bound by these Terms. If you do not agree, you must discontinue use of the Site and Services immediately.`,
    },
    {
      title: "1. Acceptance of Terms",
      description: `By creating an account, completing a purchase, or using the Services, you confirm that you have read, understood, and accepted these Terms, our Privacy Policy, and our Refund Policy. Acceptance of these terms is required to access the Services.`,
    },
    {
      title: "2. Description of Services",
      description: `CELPIPPRACTICETEST.com is an independent, third-party platform providing digital practice tests, skill-based exercises, and AI-assisted feedback for English language exam preparation purposes only.
All content on the Site is original and created by our team. We do not reproduce, license, or distribute official exam materials.
The Services do not guarantee specific scores, outcomes, performance improvements, or exam results. Variations in content, feedback, or system behavior do not constitute a defect, misrepresentation, or failure of service.`,
    },
    {
      title: "3. User Accounts",
      description: `Some features require account registration. By creating an account, you agree to:`,
      lists: [
        "Provide accurate, current, and complete information",
        "Maintain the confidentiality of your login credentials",
        "Be fully responsible for all activity under your account",
        "Notify us promptly of any unauthorized access or use",
      ],
    },
    {
      title: "4. Acceptable Use",
      description: `You agree not to:`,
      lists: [
        "Use the Services for unlawful or unauthorized purposes",
        "Attempt to access restricted systems without permission",
        "Interfere with the security, availability, or operation of the Services",
        "Copy, reproduce, sell, resell, or exploit any part of the Services",
        "Use automated tools such as bots, scrapers, or crawlers",
        "Upload or transmit malicious software or harmful code",
      ],
    },
    {
      title: "5. Intellectual Property",
      description: `All content on the Site, including text, graphics, images, software, and code, is owned by CELPIPPRACTICETEST.com or its licensors and is protected by Canadian and international intellectual property laws.
You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Services for personal, non-commercial purposes only.`,
    },
    {
      title: "6. Subscriptions, Payments, and Refunds",
      sub: [
        {
          title: "6.1 Subscription and Billing",
          description: `Subscription plans, pricing, and features are displayed on the Site and may change from time to time.
Subscriptions renew automatically unless canceled before the renewal date. Canceling a subscription prevents future charges only and does not reverse, void, or refund any completed or pending charges, including subscription renewals.
Service delivery occurs immediately upon successful payment, at which point access to digital content and platform features is granted.`,
        },
        {
          title: "6.2 Refund Eligibility and Process",
          description: `Refunds are only eligible for the first subscription purchase and only if all of the following conditions are met:`,
          lists: [
            "The request relates to the user’s first successful payment",
            "The refund request is submitted within 48 hours of the charge date",
            "The user has not completed more than one mock exam",
            "The user has not completed more than two practice activities in any single skill",
            "Refund requests submitted more than 48 hours after the charge date are automatically rejected and not reviewed, regardless of usage.",
            "Refunds are not available for subscription renewals, second or subsequent payments, or accounts that exceed the usage limits described above.",
            "The refund request platform is the sole and exclusive method for submitting a refund request. Requests made through customer chat, email, social media, or any other communication channel are not considered valid refund requests and do not initiate the refund review process.",
            "Refund eligibility does not create an obligation to issue a refund. All refund requests are reviewed at our sole discretion based on the criteria outlined in these Terms and the Refund Policy.",
            "Initiating a chargeback, payment dispute, or bank claim does not alter, suspend, or override these Terms or the Refund Policy.",
          ],
        },
      ],
    },
    {
      title: "7. Disclaimer of Warranties",
      description: `The Services are provided on an “as is” and “as available” basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.`,
    },
    {
      title: "8. Limitation of Liability",
      description: `To the maximum extent permitted by law, CELPIPPRACTICETEST.com shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the Services.`,
    },
    {
      title: "9. Third-Party Links",
      description: `The Site may contain links to third-party websites for convenience. We do not control, endorse, or assume responsibility for any third-party content or services.`,
    },
    {
      title: "10. Termination",
      description: `We may suspend or terminate access to the Services at any time, with or without notice, if you violate these Terms or if continued access is deemed inappropriate in our sole discretion.`,
    },
    {
      title: "11. Changes to These Terms",
      description: `We may update these Terms at any time. Updates will be reflected by the “Last Updated” date. Continued use of the Services after changes become effective constitutes acceptance of the revised Terms.`,
    },
    {
      title: "12. Governing Law",
      description: `These Terms are governed by and construed in accordance with the laws of Canada, without regard to conflict of law principles.`,
    },
    {
      title: "13. Contact",
      description: `For questions or assistance, contact us at: Email: support@celpippracticetest.com`,
    },
  ];

  return (
    <div className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">
          Terms of Service
        </h1>
        <span className="mt-[16px] font-normal text-[16px] text-text3">
          Last Updated: Jan 08, 2026
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
          © 2026 CELPIPPRACTICETEST.com. All rights reserved.
          CELPIPPRACTICETEST.com is not affiliated with, endorsed by, or
          sponsored by any official testing organization.
        </p>
      </div>
  );
};

export default TermsOfService;
