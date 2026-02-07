"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useButtonVisibleStore } from "@/store/buttonVisible.store";

const FooterVisibilityObserver = () => {
  const { ref, inView } = useInView();
  const { setInFooter } = useButtonVisibleStore((state) => state);

  useEffect(() => {
    if (inView) {
      setInFooter(true);
    } else {
      setInFooter(false);
    }
  }, [inView, setInFooter]);

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default FooterVisibilityObserver;
