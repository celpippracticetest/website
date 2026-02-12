import { useState, useEffect } from "react";
import { Plan } from "@/models/plans.model";
import dynamic from "next/dynamic";

const SvgBestValuePlan = dynamic(() => import("@/components/icons/BestValuePlan"), {
    ssr: true,
});
const SvgPopularPlan = dynamic(() => import("@/components/icons/PopularPlan"), {
    ssr: true,
});
const SvgFreePlan = dynamic(() => import("@/components/icons/FreePlan"), {
    ssr: true,
});

export const usePlans = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const botUserAgentRegex =
            /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i;

        const isBot =
            typeof navigator !== "undefined" &&
            botUserAgentRegex.test(navigator.userAgent || "");

        // Avoid noisy bot fetches (e.g., Search Console render) and blocked API requests.
        if (isBot) {
            setIsLoading(false);
            return;
        }

        const fetchPlans = async () => {
            try {
                const response = await fetch("/api/plans");
                if (!response.ok) {
                    return;
                }

                const contentType = response.headers.get("content-type") || "";
                if (!contentType.toLowerCase().includes("application/json")) {
                    return;
                }

                const raw = await response.text();
                if (!raw.trim()) {
                    return;
                }

                const data = JSON.parse(raw);
                if (data.plans) {
                    const mappedPlans = data.plans.map((plan: Plan) => ({
                        ...plan,
                        icon: getIconComponent(plan.iconType),
                    }));
                    setPlans(mappedPlans);
                }
            } catch (error) {
                if (process.env.NODE_ENV === "development") {
                    console.error("Error fetching plans:", error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlans();
    }, []);

    return { plans, isLoading };
};

const getIconComponent = (iconType?: string) => {
    switch (iconType) {
        case "BestValuePlan":
            return <SvgBestValuePlan />;
        case "PopularPlan":
            return <SvgPopularPlan />;
        case "FreePlan":
            return <SvgFreePlan />;
        default:
            return <SvgFreePlan />;
    }
};
