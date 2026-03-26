(function () {
  var script = document.currentScript;
  var clarityId = script && script.dataset ? script.dataset.clarityId : "";

  if (!clarityId) {
    return;
  }

  window.clarity =
    window.clarity ||
    function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

  if (document.querySelector('script[data-clarity-loader-id="' + clarityId + '"]')) {
    return;
  }

  var firstScript = document.getElementsByTagName("script")[0];
  var clarityScript = document.createElement("script");

  clarityScript.async = true;
  clarityScript.src = "https://www.clarity.ms/tag/" + encodeURIComponent(clarityId);
  clarityScript.setAttribute("data-clarity-loader-id", clarityId);

  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(clarityScript, firstScript);
  } else {
    document.head.appendChild(clarityScript);
  }
})();
