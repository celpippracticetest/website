"use client";

import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface OnboardingNewRecord {
  "User ID": string;
  Name: string;
  "Test Date": string;
  "Focus Skill": string;
  "Custom Focus Skill": string;
  "Target Listening": number;
  "Target Reading": number;
  "Target Writing": number;
  "Target Speaking": number;
  "Answered At": string;
}

interface OnboardingNewDashboardProps {
  data: OnboardingNewRecord[];
  chartData: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  };
}

const OnboardingNewDashboard: React.FC<OnboardingNewDashboardProps> = ({
  data,
  chartData,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const exportToExcel = async () => {
    try {
      const response = await fetch("/api/onboarding-new/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "onboarding_new_export.xlsx";
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
        text: "Onboarding New Statistics",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Onboarding New Data
        </h1>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Export to Excel
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Responses</h3>
          <p className="text-3xl font-bold text-blue-600">{data.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Test Dates</h3>
          <p className="text-3xl font-bold text-green-600">
            {new Set(data.map(item => item["Test Date"])).size}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Focus Skills</h3>
          <p className="text-3xl font-bold text-purple-600">
            {new Set(data.map(item => item["Focus Skill"])).size}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Avg Target Score</h3>
          <p className="text-3xl font-bold text-orange-600">
            {data.length > 0 
              ? Math.round(
                  (data.reduce((sum, item) => 
                    sum + item["Target Listening"] + item["Target Reading"] + 
                    item["Target Writing"] + item["Target Speaking"], 0
                  ) / (data.length * 4)) * 10
                ) / 10
              : 0
            }
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">
            Onboarding New Records
          </h3>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '900px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  User ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Test Date
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
              {currentData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-4 text-sm text-gray-900 font-mono truncate max-w-32">
                    {record["User ID"]}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-40">
                    {record.Name}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-48">
                    {record["Test Date"]}
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
                    {new Date(record["Answered At"]).toLocaleDateString()}
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
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingNewDashboard;
