import Link from "next/link";

export default function FreeMockResultsAuthGate({
  returnTo,
  examName,
}: {
  returnTo: string;
  examName?: string;
}) {
  const signIn = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
  const signUp = `/sign-in?mode=sign-up&redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <main className="bg-[#F2F6FF] min-h-screen flex w-full justify-center px-4">
      <div className="mx-auto mt-16 w-full max-w-[480px] rounded-[24px] bg-white px-6 py-8 text-center shadow-sm">
        <h1 className="text-[22px] font-semibold text-[#212E42]">
          See your {examName || "mock exam"} results
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-[#76808F]">
          Your answers are saved on this device. Log in or create a free
          account to view your score.
        </p>
        <Link
          href={signUp}
          className="mt-6 flex h-[44px] items-center justify-center rounded-[24px] bg-[#4A7DFF] text-[14px] text-white"
        >
          Create a free account
        </Link>
        <Link
          href={signIn}
          className="mt-3 flex h-[44px] items-center justify-center rounded-[24px] border border-[#D5D6D8] text-[14px] text-[#316BFF]"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
