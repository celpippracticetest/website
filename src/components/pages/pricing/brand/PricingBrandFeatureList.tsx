export function PricingBrandFeatureList({
  items,
}: {
  items: readonly string[];
}) {
  return (
    <ul className="mt-[22px] flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#3a4356]"
        >
          <span
            className="mt-px shrink-0 text-[12px] font-bold text-[#2e9e5b]"
            aria-hidden
          >
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
