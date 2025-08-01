
import PremiumBanner from "@/components/shared/PremiumBanner";

interface ListeningPremiumBannerProps {
  onUpgrade: () => void;
}

const ListeningPremiumBanner = ({ onUpgrade }: ListeningPremiumBannerProps) => {
  return <PremiumBanner skillName="listening" onUpgrade={onUpgrade} />;
};

export default ListeningPremiumBanner;
