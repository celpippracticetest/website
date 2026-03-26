(function () {
  var script = document.currentScript;
  var gtmId = script && script.dataset ? script.dataset.gtmId : "";
  var layerName = script && script.dataset ? script.dataset.layer || "dataLayer" : "dataLayer";

  if (!gtmId) {
    return;
  }

  window[layerName] = window[layerName] || [];
  window[layerName].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  if (document.querySelector('script[data-gtm-loader-id="' + gtmId + '"]')) {
    return;
  }

  var firstScript = document.getElementsByTagName("script")[0];
  var gtmScript = document.createElement("script");
  var dataLayerSuffix = layerName !== "dataLayer" ? "&l=" + layerName : "";

  gtmScript.async = true;
  gtmScript.src = "/gtm/js?id=" + encodeURIComponent(gtmId) + dataLayerSuffix;
  gtmScript.setAttribute("data-gtm-loader-id", gtmId);

  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(gtmScript, firstScript);
  } else {
    document.head.appendChild(gtmScript);
  }
})();
