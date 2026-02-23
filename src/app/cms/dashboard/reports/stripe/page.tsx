"use client";

import React, { useState } from "react";
import { Box } from "@/components/ui/Box";
import { useQuery } from "@tanstack/react-query";
import { Loader2, DollarSign, Users, CreditCard, Activity, Calendar as CalendarIcon } from "lucide-react";
import type Stripe from "stripe";
import moment from "moment";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StripeData {
  balance: Stripe.Balance;
  charges: Stripe.Charge[];
  subscriptions: Stripe.Subscription[];
  customers: Stripe.Customer[];
}

export default function StripeReportPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    moment().subtract(7, 'days').toDate()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data, isLoading, error } = useQuery<StripeData>({
    queryKey: ["stripe-reports", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
      
      const res = await fetch(`/api/cms/reports/stripe?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch Stripe data");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Box className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4 text-red-500">
        Error loading reports: {(error as Error).message}
      </Box>
    );
  }

  // Calculate available balance (sum of all currencies, simplified to first available for display or mapped)
  // For simplicity, we'll take the first currency available or default to 0.
  // In a real app, you'd handle multi-currency.
  const availableAmount = data?.balance?.available?.[0]?.amount || 0;
  const pendingAmount = data?.balance?.pending?.[0]?.amount || 0;
  const currency = data?.balance?.available?.[0]?.currency?.toUpperCase() || 'USD';

  // Format currency
  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount / 100);
  };

  return (
    <Box className="w-full space-y-6">
      <Box className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Stripe Reports</h1>
        <Box className="flex items-center gap-2">
          {/* Start Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? moment(startDate).format("MMM DD, YYYY") : <span>Start Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                hideWeekdays
              />
            </PopoverContent>
          </Popover>

          {/* End Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? moment(endDate).format("MMM DD, YYYY") : <span>End Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                hideWeekdays
              />
            </PopoverContent>
          </Popover>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Available Balance"
          value={formatCurrency(availableAmount, currency)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Pending Balance"
          value={formatCurrency(pendingAmount, currency)}
          icon={<Activity className="h-5 w-5 text-yellow-600" />}
          bgColor="bg-yellow-50"
        />
        <SummaryCard
          title="Active Subscriptions"
          value={data?.subscriptions?.length?.toString() || "0"}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
          subtext="(In selected range)"
        />
        <SummaryCard
          title="Recent Charges"
          value={data?.charges?.length?.toString() || "0"}
          icon={<CreditCard className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
          subtext="(In selected range)"
        />
      </Box>

      {/* Recent Charges Table */}
      <Box className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Box className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
        </Box>
        <Box className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.charges?.map((charge) => (
                <tr key={charge.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatCurrency(charge.amount, charge.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        charge.status === "succeeded"
                          ? "bg-green-100 text-green-800"
                          : charge.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {charge.billing_details?.email || "N/A"}
                  </td>
                   <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                    {charge.description || "Stripe Charge"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {moment(charge.created * 1000).format("MMM DD, YYYY, h:mm A")}
                  </td>
                </tr>
              ))}
              {(!data?.charges || data.charges.length === 0) && (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No recent transactions found in this period.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  bgColor,
  subtext
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  subtext?: string;
}) {
  return (
    <Box className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <Box className="flex items-center justify-between">
        <Box className={`rounded-lg p-2 ${bgColor}`}>{icon}</Box>
       {/* Optional trend icon or similar could go here */}
      </Box>
      <Box className="mt-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </Box>
    </Box>
  );
}
