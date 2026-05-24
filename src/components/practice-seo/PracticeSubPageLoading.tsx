/** Lightweight shell while practice sub-route data loads (no MUI — avoids runtime CSS-in-JS delay). */
export default function PracticeSubPageLoading() {
  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[1280px] bg-[#F2F6FF] p-6"
      aria-busy="true"
      aria-label="Loading practice"
    >
      <div className="mb-2 h-7 w-[55%] animate-pulse rounded-lg bg-[#D5D6D8]/60" />
      <div className="mb-1 h-4 w-[85%] animate-pulse rounded bg-[#D5D6D8]/40" />
      <div className="mb-8 h-4 w-[70%] animate-pulse rounded bg-[#D5D6D8]/40" />
      <div className="flex justify-center pt-8">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[#316BFF] border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    </div>
  );
}
