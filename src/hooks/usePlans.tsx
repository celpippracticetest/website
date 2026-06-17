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
        const fetchPlans = async () => {
            try {
                const response = await fetch("/api/plans");
                const data = await response.json();
                if (data.plans) {
                    const mappedPlans = data.plans.map((plan: Plan) => ({
                        ...plan,
                        icon: getIconComponent(plan.iconType),
                    }));
                    setPlans(mappedPlans);
                }
            } catch (error) {
                console.error("Error fetching plans:", error);
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
