import Image from "next/image";

interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PremiumBadge = ({ size = "md", className = "" }: PremiumBadgeProps) => {
  // Size mappings
  const sizeClasses = {
    sm: "w-4 h-4 p-0.5",
    md: "w-5 h-5 p-1",
    lg: "w-6 h-6 p-1",
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div
      className={`bg-yellow-400 rounded-full flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/lovable-uploads/a4bf7855-8ce5-4cff-a218-27a7034099d3.png"
        alt="Premium"
        className={iconSizes[size]}
      />
    </div>
  );
};

export default PremiumBadge;
