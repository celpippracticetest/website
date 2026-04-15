import type { Metadata } from "next";
import AccountSharingNoticeClient from "./AccountSharingNoticeClient";

export const metadata: Metadata = {
  title: "Account access | CELPIP Practice Test",
  robots: { index: false, follow: false },
};

export default function AccountSharingNoticePage() {
  return <AccountSharingNoticeClient />;
}
