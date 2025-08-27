"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function IntercomLoader() {
  const [shouldLoadIntercom, setShouldLoadIntercom] = useState(false);

  useEffect(() => {
    // Only load Intercom after user interaction or after 5 seconds
    const timer = setTimeout(() => {
      setShouldLoadIntercom(true);
    }, 5000);

    const handleUserInteraction = () => {
      setShouldLoadIntercom(true);
      // Remove event listeners after first interaction
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("scroll", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadIntercom) return;

    const handleClickOutside = (event: MouseEvent) => {
      const launcher = document.querySelector(
        ".intercom-launcher-frame, .intercom-messenger-frame"
      );
      const supportButton = document.getElementById("support-button");
      if (
        launcher &&
        !launcher.contains(event.target as Node) &&
        (!supportButton || !supportButton.contains(event.target as Node)) &&
        (window as any).Intercom
      ) {
        (window as any).Intercom("hide");
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [shouldLoadIntercom]);

  if (!shouldLoadIntercom) {
    return null;
  }

  return (
    <Script
      id="intercom"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          window.intercomSettings = {
              api_base: "https://api-iam.intercom.io",
              app_id: "v4dvrncf",
          };
          (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/v4dvrncf';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
        `,
      }}
    />
  );
}
