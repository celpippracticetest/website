import dynamic from "next/dynamic";
import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    title: "Delete Account | CELPIPPRACTICETEST.com",
    description:
      "Request permanent deletion of your CELPIPPRACTICETEST.com account. Send an email to our support team and we will delete your account and all associated data within 7 business days.",
    alternates: {
      canonical: "https://celpippracticetest.com/delete-account",
    },
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

const DeleteAccountComponent = dynamic(
  () => import("@/components/pages/landing/DeleteAccount"),
  {
    ssr: true,
  }
);

export default function DeleteAccountPage() {
  return <DeleteAccountComponent />;
}
