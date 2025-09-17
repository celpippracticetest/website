"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

import React from "react";
import { Pie } from "react-chartjs-2";

interface OnboardingRecord {
  "User ID": string;
  Name: string;
  "Answer Part 1": string;
  "Custom Part 1": string;
  "Answer Part 2": string;
  "Custom Part 2": string;
}

interface DashboardProps {
  data: OnboardingRecord[];
  chartData: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  };
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  statistics: {
    part1Answers: number;
    part2Answers: number;
    customAnswers: number;
  };
}

const Dashboard: React.FC<DashboardProps> = ({
  data,
  totalRecords,
  totalPages,
  currentPage,
  statistics,
}) => {
  // Use all data from server (already paginated)
  const currentData = data;

  // Create answer distribution data
  const answerDistribution = React.useMemo(() => {
    const part1Answers: { [key: string]: number } = {};
    const part2Answers: { [key: string]: number } = {};

    currentData.forEach((record) => {
      // Count Part 1 answers
      if (record["Answer Part 1"]) {
        const answer = record["Answer Part 1"];
        part1Answers[answer] = (part1Answers[answer] || 0) + 1;
      }

      // Count Part 2 answers
      if (record["Answer Part 2"]) {
        const answer = record["Answer Part 2"];
        part2Answers[answer] = (part2Answers[answer] || 0) + 1;
      }
    });

    return { part1Answers, part2Answers };
  }, [currentData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Answer Distribution",
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Data</h1>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/onboarding/export");
              if (!res.ok) {
                console.error("Failed to download file");
                return;
              }
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "onboarding_export.xlsx";
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } catch (error) {
              console.error("Error exporting data:", error);
            }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Export to Excel
        </button>
      </div>

      {/* Answer Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Part 1 Answers Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Part 1 Answers Distribution
          </h3>
          <Pie
            data={{
              labels: Object.keys(answerDistribution.part1Answers),
              datasets: [
                {
                  data: Object.values(answerDistribution.part1Answers),
                  backgroundColor: [
                    "#FF6384",
                    "#36A2EB",
                    "#FFCE56",
                    "#4BC0C0",
                    "#9966FF",
                    "#FF9F40",
                    "#FF6384",
                    "#C9CBCF",
                  ],
                  borderWidth: 2,
                  borderColor: "#fff",
                },
              ],
            }}
            options={chartOptions}
          />
        </div>

        {/* Part 2 Answers Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Part 2 Answers Distribution
          </h3>
          <Pie
            data={{
              labels: Object.keys(answerDistribution.part2Answers),
              datasets: [
                {
                  data: Object.values(answerDistribution.part2Answers),
                  backgroundColor: [
                    "#FF6384",
                    "#36A2EB",
                    "#FFCE56",
                    "#4BC0C0",
                    "#9966FF",
                    "#FF9F40",
                    "#FF6384",
                    "#C9CBCF",
                  ],
                  borderWidth: 2,
                  borderColor: "#fff",
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Total Responses
          </h3>
          <p className="text-3xl font-bold text-blue-600">{totalRecords}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Part 1 Answers
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {statistics.part1Answers}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Part 2 Answers
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {statistics.part2Answers}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Custom Answers
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {statistics.customAnswers}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">
            Onboarding Records
          </h3>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table
            className="w-full divide-y divide-gray-200"
            style={{ minWidth: "800px" }}
          >
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  User ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Answer Part 1
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Custom Part 1
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Answer Part 2
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Custom Part 2
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-4 text-sm text-gray-900 font-mono truncate max-w-32">
                    {record["User ID"]}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-40">
                    {record.Name}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                    {record["Answer Part 1"]}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                    {record["Custom Part 1"]}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                    {record["Answer Part 2"]}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                    {record["Custom Part 2"]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * 100 + 1} to{" "}
              {Math.min(currentPage * 100, totalRecords)} of {totalRecords}{" "}
              total records (Page {currentPage} of {totalPages})
            </div>
            <div className="flex space-x-2">
              <a
                href={`/cms/dashboard?tab=onboarding&page=${Math.max(
                  currentPage - 1,
                  1
                )}`}
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed bg-gray-100"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                Previous
              </a>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <a
                href={`/cms/dashboard?tab=onboarding&page=${Math.min(
                  currentPage + 1,
                  totalPages
                )}`}
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed bg-gray-100"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                Next
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
