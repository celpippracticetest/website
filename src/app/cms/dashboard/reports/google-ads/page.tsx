"use client";

import React from "react";
import { Box } from "@/components/ui/Box";
import BarChart from "@mui/icons-material/BarChart";

export default function GoogleAdsReportPage() {
  return (
    <Box className="w-full">
      <Box className="flex flex-col gap-6">
        <Box className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Google Ads Report
          </h1>
        </Box>

        <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <Box className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Report View
            </span>
          </Box>
          <Box className="w-full flex justify-center overflow-x-auto">
            <iframe
              width="1200"
              height="900"
              src="https://lookerstudio.google.com/embed/reporting/f40fc9ac-d74e-440e-9a27-6726f4174a4b/page/VgD"
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
