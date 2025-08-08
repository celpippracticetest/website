"use client";
"use client";
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

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bar } from "react-chartjs-2";
const Dashboard = ({ chartData, data }: any) => {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">CMS Dashboard</h1>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Answer Part 1</th>
              <th className="p-3">Custom Part 1</th>
              <th className="p-3">Answer Part 2</th>
              <th className="p-3">Custom Part 2</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry: any, idx: any) => (
              <tr key={idx} className="border-b">
                <td className="p-3">{entry?.Name || "—"}</td>
                <td className="p-3">{entry?.["Answer Part 1"] || "—"}</td>
                <td className="p-3">{entry?.["Custom Part 1"] || "—"}</td>
                <td className="p-3">{entry?.["Answer Part 2"] || "—"}</td>
                <td className="p-3">{entry?.["Custom Part 2"] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2">Answer Distribution</h2>
          <Bar data={chartData} />
        </CardContent>
      </Card>

      <button
        onClick={async () => {
          const res = await fetch("/api/onboarding");
          if (!res.ok) {
            console.error("Failed to download file");
            return;
          }
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "onboarding_export.xlsx";
          a.click();
          window.URL.revokeObjectURL(url);
        }}
        className="inline-block mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Download Excel
      </button>
    </div>
  );
};

export default Dashboard;
