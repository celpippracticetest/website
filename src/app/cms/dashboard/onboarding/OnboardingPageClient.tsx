"use client";

import React from "react";
import { Pie } from "react-chartjs-2";
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
import Link from "next/link";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface OnboardingRecord {
  "User ID": string;
  Name: string;
  "Primary Goal": string;
  "Sub Goal": string;
  "Focus Skill": string;
  "Custom Focus Skill": string;
  "Target Listening": number;
  "Target Reading": number;
  "Target Writing": number;
  "Target Speaking": number;
  "Answered At": string;
}

interface OnboardingPageClientProps {
  data: OnboardingRecord[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  statistics: {
    primaryGoals: number;
    focusSkills: number;
    customFocusSkills: number;
    averageTargetScore: number;
  };
}

const OnboardingPageClient: React.FC<OnboardingPageClientProps> = ({
  data,
  totalRecords,
  totalPages,
  currentPage,
  statistics,
}) => {
  // Create answer distribution data
  const answerDistribution = React.useMemo(() => {
    const primaryGoals: { [key: string]: number } = {};
    const focusSkills: { [key: string]: number } = {};

    data.forEach((record) => {
      // Count Primary Goal answers
      if (record["Primary Goal"]) {
        const answer = record["Primary Goal"];
        primaryGoals[answer] = (primaryGoals[answer] || 0) + 1;
      }

      // Count Focus Skill answers
      if (record["Focus Skill"]) {
        const answer = record["Focus Skill"];
        focusSkills[answer] = (focusSkills[answer] || 0) + 1;
      }
    });

    return { primaryGoals, focusSkills };
  }, [data]);

  const exportToExcel = async () => {
    try {
      const response = await fetch("/api/onboarding-new/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "onboarding_export.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

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
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Export to Excel
        </button>
      </div>

      {/* Answer Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Goal Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Primary Goal Distribution
          </h3>
          {Object.keys(answerDistribution.primaryGoals).length > 0 ? (
            <Pie
              data={{
                labels: Object.keys(answerDistribution.primaryGoals),
                datasets: [
                  {
                    data: Object.values(answerDistribution.primaryGoals),
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
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Focus Skill Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Focus Skill Distribution
          </h3>
          {Object.keys(answerDistribution.focusSkills).length > 0 ? (
            <Pie
              data={{
                labels: Object.keys(answerDistribution.focusSkills),
                datasets: [
                  {
                    data: Object.values(answerDistribution.focusSkills),
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
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
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
          <h3 className="text-lg font-semibold text-gray-700">Primary Goals</h3>
          <p className="text-3xl font-bold text-green-600">
            {statistics.primaryGoals || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Focus Skills</h3>
          <p className="text-3xl font-bold text-purple-600">
            {statistics.focusSkills || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Avg Target Score
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {statistics.averageTargetScore || 0}
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
            style={{ minWidth: "900px" }}
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
                  Primary Goal
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Sub Goal
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Focus Skill
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Target Scores
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Answered At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No onboarding data available
                  </td>
                </tr>
              ) : (
                data.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm text-gray-900 font-mono truncate max-w-32">
                      {record["User ID"]}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-40">
                      {record.Name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                      {record["Primary Goal"]}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                      {record["Sub Goal"] || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                      {record["Focus Skill"]}
                      {record["Custom Focus Skill"] && (
                        <span className="text-gray-500 ml-1">
                          ({record["Custom Focus Skill"]})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          L: {record["Target Listening"]}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          R: {record["Target Reading"]}
                        </span>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                          W: {record["Target Writing"]}
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                          S: {record["Target Speaking"]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 truncate max-w-48">
                      {record["Answered At"]
                        ? new Date(record["Answered At"]).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
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
              <Link
                href={`/cms/dashboard/onboarding?page=${Math.max(
                  currentPage - 1,
                  1
                )}`}
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed bg-gray-100 pointer-events-none"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                Previous
              </Link>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Link
                href={`/cms/dashboard/onboarding?page=${Math.min(
                  currentPage + 1,
                  totalPages
                )}`}
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed bg-gray-100 pointer-events-none"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPageClient;
