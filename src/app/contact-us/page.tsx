import dynamic from "next/dynamic";
import React from "react";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/contact-us");

const ContactUsComponent = dynamic(
  () => import("@/components/pages/landing/ContactUs"),
  {
    ssr: true,
  },
);

const ContactUsPage = () => <ContactUsComponent />;

export default ContactUsPage;
