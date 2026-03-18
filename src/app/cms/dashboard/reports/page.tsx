"use client";

import React from "react";
import { Box } from "@/components/ui/Box";
import { BarChart3, ChevronRight, PieChart, Search, CreditCard } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <Box className="w-full">
      <Box className="flex flex-col gap-6">
        <Box className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Reports
          </h1>
        </Box>

        <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/cms/dashboard/reports/google-ads">
            <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <Box className="flex items-center justify-between">
                <Box className="flex items-center gap-2">
                  <Box className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <BarChart3 className="h-6 w-6" />
                  </Box>
                  <span className="font-semibold text-lg text-gray-800">
                    Google Ads Report
                  </span>
                </Box>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Box>
              <p className="text-sm text-gray-500">
                View performance metrics and analytics for Google Ads campaigns.
              </p>
            </Box>
          </Link>

          <Link href="/cms/dashboard/reports/analytics">
            <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <Box className="flex items-center justify-between">
                <Box className="flex items-center gap-2">
                  <Box className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <PieChart className="h-6 w-6" />
                  </Box>
                  <span className="font-semibold text-lg text-gray-800">
                    Analytics Report
                  </span>
                </Box>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Box>
              <p className="text-sm text-gray-500">
                View general website analytics and performance data.
              </p>
            </Box>
          </Link>

          <Link href="/cms/dashboard/reports/search-console">
            <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <Box className="flex items-center justify-between">
                <Box className="flex items-center gap-2">
                  <Box className="p-2 rounded-lg bg-orange-50 text-orange-600">
                    <Search className="h-6 w-6" />
                  </Box>
                  <span className="font-semibold text-lg text-gray-800">
                    Search Console Report
                  </span>
                </Box>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Box>
              <p className="text-sm text-gray-500">
                View search performance, indexing status, and search query data.
              </p>
            </Box>
          </Link>

          <Link href="/cms/dashboard/reports/stripe">
            <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <Box className="flex items-center justify-between">
                <Box className="flex items-center gap-2">
                  <Box className="p-2 rounded-lg bg-green-50 text-green-600">
                    <CreditCard className="h-6 w-6" />
                  </Box>
                  <span className="font-semibold text-lg text-gray-800">
                    Stripe Report
                  </span>
                </Box>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Box>
              <p className="text-sm text-gray-500">
                View financial performance, recent transactions, and subscription metrics.
              </p>
            </Box>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
