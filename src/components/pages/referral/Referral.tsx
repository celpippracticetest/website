"use client";

import { useEffect } from "react";
import Script from "next/script";
import dynamic from "next/dynamic";
// import { useRouter, useSearchParams } from "next/navigation";

const ReferralHeader = dynamic(() => import("./segment/ReferralHeader"), {
  ssr: false,
});
const ReferralBody = dynamic(() => import("./segment/ReferralBody"), {
  ssr: false,
});
const ReferralFooter = dynamic(() => import("./segment/ReferralFooter"), {
  ssr: false,
});
export default function HomePageClient() {
  // useEffect(() => {
  //   const initCello = async () => {
  //     try {
  //       const res = await fetch("/api/cello-token");
  //       const { token } = await res.json();

  //       //@ts-ignore
  //       window.cello = window.cello || { cmd: [] };

  //       //@ts-ignore
  //       window.cello.cmd.push(async function (cello) {
  //         try {
  //           await cello.boot({
  //             productId: "stage-celpippracticetest.com",
  //             token,
  //             language: "en",
  //             productUserDetails: {
  //               firstName: "Amir",
  //               lastName: "Tejareh",
  //               fullName: "Amir Tejareh",
  //               email: "amir@example.com",
  //             },
  //           });
  //         } catch (error) {
  //           console.error("Cello boot error:", error);
  //         }
  //       });
  //     } catch (error) {
  //       console.error("Failed to fetch token:", error);
  //     }
  //   };

  //   initCello();
  // }, []);

  return (
    <>
      {/* <Script
        src="https://assets.sandbox.cello.so/app/latest/cello.js"
        type="module"
        async
      /> */}

      <ReferralHeader />
      <ReferralBody />
      <ReferralFooter />
    </>
  );
}
