"use client";
import { useEffect, useRef, useState } from "react";

const RefundPolicy = () => {
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
      title: "Overview",
      description: `This Refund Policy explains when refunds may be granted and how refund requests are handled for CELPIPPRACTICETEST.com.
The Services are digital, non-tangible services delivered electronically and accessed immediately upon payment. Submitting a refund request does not guarantee approval.
Each Subscriber subscription plan includes up to 2 devices. If you exceed 2 devices, you must purchase another subscription of the same plan for each additional device.`,
    },
    {
      title: "Eligibility",
      description: `Refunds are eligible only for the first subscription purchase and only if all of the following conditions are met:`,
      lists: [
        "The request relates to the user’s first successful payment",
        "The refund request is submitted within 48 hours of the charge date",
        "The user has not completed more than one mock exam",
        "The user has not completed more than two practice activities in any single skill",
        "Refund requests submitted outside the 48-hour submission window are automatically rejected and not eligible for review.",
      ],
      sub: [
        {
          title: "Refunds are not available for:",
          description: "",
          lists: [
            "Subscription renewals or repeat payments",
            "Accounts that exceed the usage limits above",
            "Requests based solely on forgetting to cancel a subscription",
            "Requests submitted outside the 48-hour submission window",
          ],
        },
      ],
    },
    {
      title: "Refund Request Process",
      description: `All refund requests must be submitted exclusively through your account refund page: https://celpippracticetest.com/refund-request
This page is the only accepted method for submitting and tracking refund requests.
Requests submitted through customer chat, email, or any other communication channel are not considered refund requests, do not initiate review, and will not be processed.
After submission, a tracking code is generated and shown in your account. You can use this tracking code on the same page to check your request status.`,
      link: {
        href: "/refund-request",
        text: "Go to Refund Request Page",
      },
    },
    {
      title: "Review Process",
      description: `Each refund request is reviewed individually. During review:`,
      lists: [
        "Account activity and usage may be evaluated",
        "Eligibility criteria will be verified",
        "Additional information may be requested through your account refund page",
        "You may track the status of your request at any time using your tracking code on your account refund page.",
      ],
    },
    {
      title: "Final Determination",
      description: `Refund decisions issued through the refund review process are final.
Approved refunds are processed back to the original payment method. Rejected requests are closed and not eligible for reconsideration.
Initiating a chargeback, payment dispute, or bank claim does not override this policy and may result in the request being closed.`,
    },
    {
      title: "Contact",
      description: `For questions regarding this Refund Policy, contact: support@celpippracticetest.com`,
    },
  ];

  return (
    <div className="flex flex-col max-w-[1156px] mx-auto justify-center mt-[120px] px-[16px] mb-[116px]">
        <h1 className="text-primary1 font-bold text-[28px]">
          Refund Policy
        </h1>
        <span className="mt-[16px] font-normal text-[16px] text-text3">
          Last Updated: Apr 15, 2026
        </span>
        {data?.map((element, index) => (
          <div key={index} className="mt-[40px]">
            <div className="flex flex-col">
              <h2 className="font-semibold text-[20px]">{element.title}</h2>
              <p className="font-normal text-[18px] mt-[17px] whitespace-pre-wrap">
                {element?.description}
              </p>
              {(element as any)?.link && (
                <a
                  href={(element as any).link.href}
                  className="mt-[12px] inline-flex text-[16px] font-semibold text-[#316BFF] underline underline-offset-2"
                >
                  {(element as any).link.text}
                </a>
              )}
              {element?.lists && (
                <ul className="pl-20 mt-4">
                  {element?.lists?.map((list, index) => (
                    <li key={index} className="list-disc text-[18px]">
                      {list}
                    </li>
                  ))}
                </ul>
              )}

              {element?.sub && (
                <>
                  {element?.sub?.map((list, index) => (
                    <div key={index} className="mt-[20px]">
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-[20px] ml-[28px]">
                          {list.title}
                        </h3>
                        {list?.description && (
                          <p className="font-normal text-[18px] mt-[17px] whitespace-pre-wrap">
                            {list?.description}
                          </p>
                        )}
                        {list?.lists && (
                          <ul className="pl-[48px] mt-4 text-[18px]">
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
      </div>
  );
};

export default RefundPolicy;
