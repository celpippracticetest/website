"use client";

import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface AnimatedIconProps {
    animationData: any;
    isActive: boolean;
    className?: string;
}

const AnimatedIcon = ({ animationData, isActive, className }: AnimatedIconProps) => {
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    useEffect(() => {
        if (isActive) {
            lottieRef.current?.goToAndPlay(0);
        } else {
            lottieRef.current?.goToAndStop(0);
        }
    }, [isActive]);

    return (
        <div className={className}>
            <Lottie
                lottieRef={lottieRef}
                animationData={animationData}
                loop={false}
                autoplay={false}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
};

export default AnimatedIcon;
