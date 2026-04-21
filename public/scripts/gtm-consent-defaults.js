window.dataLayer = window.dataLayer || [];
// Default: allow GA4 measurement; keep ad-related signals denied until a CMP or
// in-app updateConsent() grants them (required in many EU/UK jurisdictions).
window.dataLayer.push({
  event: "default_consent",
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});
