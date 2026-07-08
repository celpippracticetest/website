"use client";

type CellValue = boolean | string;

const rows: {
  feature: string;
  free: CellValue;
  weekly: CellValue;
  monthly: CellValue;
  quarterly: CellValue;
}[] = [
  { feature: "Full diagnostic (4 skills)", free: true, weekly: true, monthly: true, quarterly: true },
  { feature: "Full mock exams", free: "2 samples", weekly: "100+", monthly: "100+", quarterly: "100+" },
  { feature: "Practice questions", free: "Limited", weekly: "5,000+", monthly: "5,000+", quarterly: "5,000+" },
  {
    feature: "AI Writing & Speaking feedback",
    free: "1 sample",
    weekly: "Unlimited",
    monthly: "Unlimited",
    quarterly: "Unlimited",
  },
  { feature: "AI teacher & study plan", free: false, weekly: false, monthly: false, quarterly: true },
  { feature: "Intro price", free: "$0", weekly: "$9.99/wk", monthly: "$29.99/mo", quarterly: "$59.99" },
  { feature: "Then renews at", free: "—", weekly: "$19.99/wk", monthly: "$49.99/mo", quarterly: "$99.99 / 3 mo" },
];

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue-tint text-brand-blue">
        ✓
      </span>
    );
  }
  if (value === false) {
    return <span className="text-text3">—</span>;
  }
  return (
    <span className={highlight ? "font-semibold text-brand-navy" : "text-[#5a6874]"}>{value}</span>
  );
}

export function PricingBrandComparisonTable() {
  return (
    <section className="px-4 pb-14 pt-8 screen744:px-11 screen744:pb-[76px] screen744:pt-10">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="mb-8 text-center font-display text-[1.75rem] font-extrabold tracking-[-0.01em] text-brand-navy screen744:mb-[30px] screen744:text-[1.875rem]">
          Compare every plan
        </h2>

        <div className="overflow-x-auto">
          <div className="min-w-[720px] overflow-hidden rounded-2xl border border-brand-surface-border">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] border-b border-brand-surface-border bg-brand-surface">
              <div className="px-4 py-4 font-display text-sm font-bold text-brand-navy screen744:px-6 screen744:py-[18px]">
                Features
              </div>
              <div className="px-2 py-4 text-center font-display text-sm font-bold text-[#5a6874] screen744:px-4 screen744:py-[18px]">
                Free
              </div>
              <div className="px-2 py-4 text-center font-display text-sm font-bold text-[#5a6874] screen744:px-4 screen744:py-[18px]">
                Weekly
              </div>
              <div className="bg-[#eef3fb] px-2 py-4 text-center font-display text-sm font-bold text-brand-navy screen744:px-4 screen744:py-[18px]">
                Monthly
              </div>
              <div className="px-2 py-4 text-center font-display text-sm font-bold text-[#5a6874] screen744:px-4 screen744:py-[18px]">
                Quarterly
              </div>
            </div>

            {rows.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] ${
                  index < rows.length - 1 ? "border-b border-brand-surface-border" : ""
                }`}
              >
                <div className="px-4 py-4 text-sm font-medium text-brand-navy screen744:px-6 screen744:py-[18px]">
                  {row.feature}
                </div>
                <div className="flex items-center justify-center px-2 py-4 text-center text-sm screen744:px-4">
                  <Cell value={row.free} />
                </div>
                <div className="flex items-center justify-center px-2 py-4 text-center text-sm screen744:px-4">
                  <Cell value={row.weekly} />
                </div>
                <div className="flex items-center justify-center bg-[#eef3fb]/60 px-2 py-4 text-center text-sm screen744:px-4">
                  <Cell value={row.monthly} highlight />
                </div>
                <div className="flex items-center justify-center px-2 py-4 text-center text-sm screen744:px-4">
                  <Cell value={row.quarterly} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
