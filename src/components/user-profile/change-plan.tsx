import Link from "next/link";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import LockOpen from "@mui/icons-material/LockOpen";

export default function ChangePlan() {
  const { user } = useHybridWebUser();
  return (
    <div className="bg-white w-full p-4 gap-4 rounded-xl border border-gray-300 shadow-lg mb-4 flex lg:flex-row flex-col lg:justify-between items-center">
      <div className="flex flex-col  items-center justify-between w-full lg:items-start">
        <h2 className="text-[14px] font-medium text-gray-600">Your Plan:</h2>
        {(user && !user.publicMetadata.plan) ||
        (user && user.publicMetadata.plan === "free") ? (
          <div className="text-xl  text-center lg:text-left font-bold mt-2 text-yellow-600">
            FREE
          </div>
        ) : (
          <div className="text-xl  text-center lg:text-left font-bold mt-2 text-green-600">
            PLUS
          </div>
        )}
      </div>
      {user &&
        (!user.publicMetadata.plan ||
          user.publicMetadata.plan === "free") && (
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center whitespace-nowrap text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 main-btn transition-all rounded-xl h-10 px-4 py-2 font-semibold bg-[#3ebbf3] hover:bg-[#3ebbf3]/70 border-gray-400 text-white hover:text-white cursor-pointer"
          >
            <LockOpen
              className="mr-2 h-4 w-4"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            Upgrade to Plus
          </Link>
        )}
    </div>
  );
}
