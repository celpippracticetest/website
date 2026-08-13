"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Diamond } from "lucide-react";
import { trackKpi } from "@/lib/analytics";

interface PremiumBannerProps {
  skillName: string;
  onUpgrade: () => void;
}

const PremiumBanner = ({ skillName, onUpgrade }: PremiumBannerProps) => {
  useEffect(() => {
    trackKpi.viewPromotion({
      promotionId: `premium_banner_${skillName.toLowerCase()}`,
      promotionName: "get_pro_membership",
      creativeSlot: "skill_banner",
    });
  }, [skillName]);

  return (
    <Card className="overflow-hidden border-0 mt-6 md:mt-8 max-w-[calc(100vw-2rem)] mx-auto">
      <div className="bg-gradient-to-r from-[#3e75f5] to-[#4f8cf5] p-6 md:p-8 text-white rounded-xl">
        <div className="flex flex-col md:flex-row items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center mb-2">
              <Diamond className="h-5 w-5 mr-2" />
              <h3 className="font-bold text-xl">Get Pro Membership</h3>
            </div>
            <p className="text-white/90 max-w-md">
              Unlock all {skillName} practices, detailed feedback, and advanced
              features to boost your CELPIP preparation.
            </p>
          </div>
          <Button
            className="bg-white text-[#3e75f5] hover:bg-white/90"
            onClick={() => {
              trackKpi.selectPromotion({
                promotionId: `premium_banner_${skillName.toLowerCase()}`,
                promotionName: "get_pro_membership",
                creativeSlot: "skill_banner",
              });
              onUpgrade();
            }}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PremiumBanner;
