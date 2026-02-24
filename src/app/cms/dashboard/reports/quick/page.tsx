"use client";

import React, { useState, useEffect } from "react";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  CreditCard,
  DollarSign,
  Activity,
  ArrowRight,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import moment from "moment";

interface ReportData {
  newUsers: MetricData;
  activeSubscribers: MetricData;
  cancelledSubscribers: MetricData;
  newSubscriptions: MetricData;
  revenue: MetricData;
  googleAdsCost: MetricData;
}

interface MetricData {
  current: number;
  previous: number;
  change: number;
}

export default function QuickReportPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: moment().subtract(7, "days").toDate(),
    to: new Date(),
  });
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!date?.from) return;

    const fromDate = date.from;
    const toDate = date.to || date.from;
    
    // Set end date to end of day to include all events on that day
    const endDateTime = new Date(toDate);
    endDateTime.setHours(23, 59, 59, 999);

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: fromDate.toISOString(),
        endDate: endDateTime.toISOString(),
      });

      const res = await fetch(`/api/cms/reports/quick?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  return (
    <Box className="w-full p-6 space-y-8">
      <Box className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Quick Report</h1>
          <p className="text-gray-500 mt-1">
            Overview of critical metrics and performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {moment(date.from).format("MMM DD, YYYY")} -{" "}
                      {moment(date.to).format("MMM DD, YYYY")}
                    </>
                  ) : (
                    moment(date.from).format("MMM DD, YYYY")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </Box>

      {loading && !data ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
            ))}
         </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="New Users"
            value={data.newUsers.current}
            previousValue={data.newUsers.previous}
            change={data.newUsers.change}
            icon={Users}
            loading={loading}
          />
          <MetricCard
            title="New Subscriptions (Period)"
            value={data.newSubscriptions.current}
            previousValue={data.newSubscriptions.previous}
            change={data.newSubscriptions.change}
            icon={CreditCard}
            loading={loading}
          />
          <MetricCard
            title="Active Subscribers (Total)"
            value={data.activeSubscribers.current}
            previousValue={data.activeSubscribers.previous}
            change={data.activeSubscribers.change}
            icon={CreditCard}
            loading={loading}
          />
          <MetricCard
            title="Cancelled (Period)"
            value={data.cancelledSubscribers.current}
            previousValue={data.cancelledSubscribers.previous}
            change={data.cancelledSubscribers.change}
            icon={CreditCard}
            inverse
            isCost
            loading={loading}
          />
          <MetricCard
            title="Stripe Revenue"
            value={data.revenue.current}
            previousValue={data.revenue.previous}
            change={data.revenue.change}
            icon={DollarSign}
            prefix="$"
            loading={loading}
          />
          <MetricCard
            title="Google Ads Cost"
            value={data.googleAdsCost.current}
            previousValue={data.googleAdsCost.previous}
            change={data.googleAdsCost.change}
            icon={Activity}
            prefix="$"
            inverse // Higher cost is usually bad unless ROI is good, but strictly for cost, red is up? 
                    // Actually for ads spend, usually we want to see it, color depends on goal. 
                    // Let's keep it neutral or standard green=up (more spend) or red=up (more cost).
                    // Standard is green=good. More revenue=good (green). More users=good (green). 
                    // More cost=bad (red).
            isCost
            loading={loading}
          />
        </div>
      ) : null}
      
      {/* Comparison Details Section */}
      {data && (
        <Box className="bg-white rounded-xl border shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Period Comparison</h2>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-500 border-b pb-2">
                    <span>Metric</span>
                    <div className="flex gap-12">
                        <span className="w-24 text-right">Current</span>
                        <span className="w-24 text-right">Previous</span>
                        <span className="w-20 text-right">Change</span>
                    </div>
                </div>
                
                <ComparisonRow 
                    label="New Users" 
                    current={data.newUsers.current} 
                    previous={data.newUsers.previous} 
                    change={data.newUsers.change} 
                />
                <ComparisonRow 
                    label="New Subscriptions" 
                    current={data.newSubscriptions.current} 
                    previous={data.newSubscriptions.previous} 
                    change={data.newSubscriptions.change} 
                />
                <ComparisonRow 
                    label="Active Subscribers (Total)" 
                    current={data.activeSubscribers.current} 
                    previous={data.activeSubscribers.previous} 
                    change={data.activeSubscribers.change} 
                />
                <ComparisonRow 
                    label="Cancelled Subscribers" 
                    current={data.cancelledSubscribers.current} 
                    previous={data.cancelledSubscribers.previous} 
                    change={data.cancelledSubscribers.change} 
                    inverse
                />
                <ComparisonRow 
                    label="Revenue" 
                    current={data.revenue.current} 
                    previous={data.revenue.previous} 
                    change={data.revenue.change} 
                    prefix="$"
                />
                <ComparisonRow 
                    label="Google Ads Cost" 
                    current={data.googleAdsCost.current} 
                    previous={data.googleAdsCost.previous} 
                    change={data.googleAdsCost.change} 
                    prefix="$"
                    inverse
                />
            </div>
        </Box>
      )}
    </Box>
  );
}

function MetricCard({
  title,
  value,
  previousValue,
  change,
  icon: Icon,
  prefix = "",
  inverse = false,
  isCost = false,
  loading = false,
}: {
  title: string;
  value: number;
  previousValue: number;
  change: number;
  icon: any;
  prefix?: string;
  inverse?: boolean;
  isCost?: boolean;
  loading?: boolean;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  // For cost: increase (positive change) is bad (red), decrease is good (green)
  // For revenue/users: increase is good (green), decrease is bad (red)
  
  let colorClass = "text-green-600";
  let IconComponent = TrendingUp;

  if (isNeutral) {
    colorClass = "text-gray-500";
    IconComponent = Minus;
  } else if (isCost) {
    // Cost logic
    if (isPositive) {
        colorClass = "text-red-600"; // Cost went up -> Bad
        IconComponent = TrendingUp;
    } else {
        colorClass = "text-green-600"; // Cost went down -> Good
        IconComponent = TrendingDown;
    }
  } else {
    // Standard logic (Revenue, Users)
    if (isPositive) {
        colorClass = "text-green-600"; // Went up -> Good
        IconComponent = TrendingUp;
    } else {
        colorClass = "text-red-600"; // Went down -> Bad
        IconComponent = TrendingDown;
    }
  }

  return (
    <Box className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">
            {loading ? (
                <span className="animate-pulse bg-gray-200 h-8 w-20 block rounded"/>
            ) : (
                `${prefix}${value.toLocaleString()}`
            )}
          </h3>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
      </div>
      
      {!loading && (
        <div className="flex items-center text-sm">
            <span className={cn("flex items-center font-medium", colorClass)}>
            <IconComponent className="h-4 w-4 mr-1" />
            {Math.abs(change)}%
            </span>
            <span className="text-gray-400 ml-2">vs previous period</span>
        </div>
      )}
    </Box>
  );
}

function ComparisonRow({ label, current, previous, change, prefix = "", inverse = false }: { label: string, current: number, previous: number, change: number, prefix?: string, inverse?: boolean }) {
    const isPositive = change > 0;
    const isCost = inverse;
    let colorClass = "text-green-600";
    
    if (change === 0) colorClass = "text-gray-500";
    else if (isCost) colorClass = isPositive ? "text-red-600" : "text-green-600";
    else colorClass = isPositive ? "text-green-600" : "text-red-600";

    return (
        <div className="flex justify-between items-center py-2 border-b last:border-0">
            <span className="font-medium text-gray-700">{label}</span>
            <div className="flex gap-12 text-sm">
                <span className="w-24 text-right font-medium">{prefix}{current.toLocaleString()}</span>
                <span className="w-24 text-right text-gray-500">{prefix}{previous.toLocaleString()}</span>
                <span className={cn("w-20 text-right font-medium", colorClass)}>
                    {change > 0 ? "+" : ""}{change}%
                </span>
            </div>
        </div>
    )
}
