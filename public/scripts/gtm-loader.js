(function () {
  if (window.__gtmInjected) return;
  window.__gtmInjected = false;

  var currentScript = document.currentScript;
  var src = (currentScript && currentScript.src) || "";
  var id = "";

  try {
    id = new URL(src).searchParams.get("id") || "";
  } catch (error) {
    id = "";
  }

  if (!id) return;

  function injectGtm() {
    if (window.__gtmInjected) return;
    window.__gtmInjected = true;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

    var scriptTag = document.createElement("script");
    scriptTag.async = true;
    scriptTag.src = "https://www.googletagmanager.com/gtm.js?id=" + id;
    document.head.appendChild(scriptTag);
  }

  ["click", "scroll", "mousemove", "touchstart", "keydown"].forEach(function (eventName) {
    window.addEventListener(eventName, injectGtm, { once: true, passive: true });
  });
})();
