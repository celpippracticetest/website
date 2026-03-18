let __thirdPartyLoaded = false;

function loadThirdParty() {
  if (__thirdPartyLoaded) return;
  __thirdPartyLoaded = true;

  const scriptTag = document.createElement("script");
  scriptTag.src = "https://assets.sandbox.cello.so/app/latest/cello.js";
  scriptTag.type = "module";
  scriptTag.async = true;
  document.head.appendChild(scriptTag);
}

["click", "scroll", "mousemove", "touchstart", "keydown"].forEach((eventName) => {
  document.addEventListener(eventName, loadThirdParty, { once: true, passive: true });
});
