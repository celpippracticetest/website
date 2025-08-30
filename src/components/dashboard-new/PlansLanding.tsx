import dynamic from "next/dynamic";

const SvgBestValuePlan = dynamic(() => import("../icons/BestValuePlan"), {
  ssr: true,
});
const SvgPopularPlan = dynamic(() => import("../icons/PopularPlan"), {
  ssr: true,
});
const SvgFreePlan = dynamic(() => import("../icons/FreePlan"), {
  ssr: true,
});

export const planDetailsLanding = [
  {
    title: "Premium 3-Month",
    type: "Best Seller",
    planTitle: "3 Months",
    oldPrice: "240.99",
    price: "89.99",
    discount: "70",
    buttonTitle: "Save Now",
    features: [
      "Full access to all premium features",
      "Valid for 3 months",
      "Ideal for test-takers with a set deadline",
      "Includes all mock exams and practice",
    ],
    icon: <SvgBestValuePlan />,
    iconWrapperColor: "bg-secondary5",
  },
  {
    title: "Premium Monthly",
    type: "Easy Start",
    planTitle: "Monthly",
    oldPrice: "80.00",
    price: "44.99",
    discount: "40",
    buttonTitle: "Go Premium",
    features: [
      "Unlimited access to 3,000+ practices",
      "60 full mock exams",
      "Instant AI feedback for all skills",
      "Progress tracking and insights",
    ],
    icon: <SvgPopularPlan />,
    iconWrapperColor: "bg-purple5",
  },
  {
    title: "Weekly",
    type: "Weekly",
    planTitle: "Weekly",
    oldPrice: "25.00",
    price: "17.99",
    discount: "30",
    buttonTitle: "Go Premium",
    features: [
      "Unlimited access to 3,000+ practices",
      "60 full mock exams",
      "Instant AI feedback for all skills",
      "Progress tracking and insights",
    ],
    icon: <></>,
    iconWrapperColor: "",
  },
];
