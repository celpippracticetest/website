import React, { memo, useState, useEffect } from "react";

// Only re-renders when its `userCreatedAt` prop changes
const CountdownTimer = memo(({ userCreatedAt }: { userCreatedAt?: string }) => {
  const [timeLeft, setTimeLeft] = useState("00:00:00");

  useEffect(() => {
    if (!userCreatedAt) return;
    const expiry = new Date(userCreatedAt).getTime() + 24 * 60 * 60 * 1000;

    const update = () => {
      const now = Date.now();
      const distance = expiry - now;
      if (distance <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hh = String(
        Math.floor((distance / (1000 * 60 * 60)) % 24)
      ).padStart(2, "0");
      const mm = String(Math.floor((distance / (1000 * 60)) % 60)).padStart(
        2,
        "0"
      );
      const ss = String(Math.floor((distance / 1000) % 60)).padStart(2, "0");
      setTimeLeft(`${hh}:${mm}:${ss}`);
    };

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [userCreatedAt]);

  return (
    <span className="text-[#FF8FA7] text-[20px] font-bold">{timeLeft}</span>
  );
});

export default CountdownTimer;
