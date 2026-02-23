"use client";

import React from "react";
import { Box } from "@/components/ui/Box";
import { Search } from "lucide-react";

export default function SearchConsoleReportPage() {
  return (
    <Box className="w-full">
      <Box className="flex flex-col gap-6">
        <Box className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Search Console Report
          </h1>
        </Box>

        <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <Box className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Report View
            </span>
          </Box>
          <Box className="w-full flex justify-center overflow-x-auto">
            <iframe
              width="1200"
              height="900"
              src="https://lookerstudio.google.com/embed/reporting/8f2e9a9d-2cde-4f81-a782-abb0066b2fcc/page/6zXD"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
