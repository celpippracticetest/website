import Image from "next/image";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

const Logo = ({ className = "h-12 w-auto", onClick }: LogoProps) => {
  const isMobile = useIsMobile();
  const src = isMobile
    ? "/lovable-uploads/0eb04c8f-8ba7-4ac8-a0ff-9e93de37742b.png"
    : "/lovable-uploads/c12badb5-05c1-4a69-8782-d60d31b879d8.png";

  return (
    <div
      className={className}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      <Image
        src={src}
        alt="CELPIP.ca Logo"
        fill
        style={{ objectFit: "contain" }}
        sizes="100vw"
      />
    </div>
  );
};

export default Logo;
