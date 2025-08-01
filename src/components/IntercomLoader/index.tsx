"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function IntercomLoader() {
  useEffect(() => {
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
  }, []);
  return (
    <Script
      id="intercom"
      strategy="afterInteractive"
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
