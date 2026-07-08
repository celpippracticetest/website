export function PricingBrandCheckBlue() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#e9f0fc" />
      <polyline
        points="7.5,12.5 10.5,15.5 16.5,8.5"
        stroke="#3358cf"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingBrandCheckLight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.12)" />
      <polyline
        points="7.5,12.5 10.5,15.5 16.5,8.5"
        stroke="#dbe6f2"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingBrandFeatureList({
  items,
  variant = "light",
}: {
  items: readonly string[];
  variant?: "light" | "dark";
}) {
  const Check = variant === "dark" ? PricingBrandCheckLight : PricingBrandCheckBlue;
  const textClass = variant === "dark" ? "text-[#dbe6f2]" : "text-[#41505f]";

  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0">
            <Check />
          </span>
          <span className={`text-[14.5px] leading-snug ${textClass}`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
