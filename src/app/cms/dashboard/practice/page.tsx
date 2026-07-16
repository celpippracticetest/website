"use client";

import React, { useEffect, useState } from "react";
import CmsPracticesTable from "../../../../components/dashboard-app/cms/CmsPracticesTable";
import CmsPracticesHeader from "../../../../components/dashboard-app/cms/CmsPracticesHeader";
import {
  PracticeApiResponse,
  Practice,
} from "../../../../components/dashboard-app/cms/types/practiceTypes";
import { PracticeTypeFilter } from "@/components/dashboard-app/cms/PracticeTypeFilter";
import { useRouter } from "nextjs-toploader/app";
import { TTaskSchemaDto } from "@/models/tasks.model";

const CmsPractices = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();
  const [practiceType, setPracticeType] = useState<string | null>(null);

  // Query to fetch practices with pagination from the API
  const [data, setData] = useState<{
    practices: Practice[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [taskLabels, setTaskLabels] = useState<
    Record<string, { taskNumber: string; name: string }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchPractices();
  }, [page, pageSize, practiceType]);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks?page=0&limit=200");
      if (!response.ok) return;
      const result = await response.json();
      const labels: Record<string, { taskNumber: string; name: string }> = {};
      for (const task of (result.items || []) as TTaskSchemaDto[]) {
        labels[task.id.toLowerCase()] = {
          taskNumber: task.taskNumber,
          name: task.name,
        };
      }
      setTaskLabels(labels);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchPractices = async () => {
    // Convert to zero-based page index for the API
    const apiPage = page - 1;

    setIsLoading(true);
    setIsError(false);

    try {
      const params = new URLSearchParams();
      params.set("page", apiPage.toString());
      params.set("limit", pageSize.toString());
      if (practiceType) params.set("type", practiceType);
      const response = await fetch(`/api/practices?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch practices");
      }

      const result: PracticeApiResponse = await response.json();
      setData({
        practices: result.items,
        total: result.totalItems,
        totalPages: result.totalPages,
      });
    } catch (error) {
      console.error("Error fetching practices:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = fetchPractices;

  const handleCreatePractice = (type: string) => {
    switch (type) {
      case "listening":
        router.push("/cms/dashboard/practice/listening");
        break;
      case "reading":
        // Navigate to reading practice creation
        router.push("/cms/dashboard/practice/reading");
        break;
      case "writing":
        // Navigate to writing practice creation
        router.push("/cms/dashboard/practice/writing");
        break;
      case "speaking":
        // Navigate to speaking practice creation
        router.push("/cms/dashboard/practice/speaking");
        break;
      default:
        break;
    }
  };

  const handleEditPractice = (id: string, type: string) => {
    switch (type.toLowerCase()) {
      case "listening":
        router.push(`/cms/dashboard/practice/listening?id=${id}`);
        break;
      case "reading":
        router.push(`/cms/dashboard/practice/reading?id=${id}`);
        break;
      case "writing":
        router.push(`/cms/dashboard/practice/writing?id=${id}`);
        break;
      case "speaking":
        router.push(`/cms/dashboard/practice/speaking?id=${id}`);
        break;
      default:
        break;
    }
  };

  const handleDeletePractice = async (id: string, type: string) => {
    try {
      // For now, we'll just show a toast and simulate deletion
      // In a real implementation, you would make an API call to delete the practice
      await fetch(`/api/practices/${id}`, {
        method: "DELETE",
      });
      // Refetch the data after successful deletion
      refetch();
    } catch (error) {
      console.error("Error deleting practice:", error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handleTypeFilterChange = (type: string | null) => {
    setPracticeType(type);
  };
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <CmsPracticesHeader onCreatePractice={handleCreatePractice} />
        <div className="mb-6">
          <PracticeTypeFilter
            selectedType={practiceType}
            onTypeChange={handleTypeFilterChange}
          />
        </div>
        <CmsPracticesTable
          practices={data?.practices || []}
          taskLabels={taskLabels}
          isLoading={isLoading}
          isError={isError}
          page={page}
          pageSize={pageSize}
          totalItems={data?.total || 0}
          onPageChange={handlePageChange}
          onEdit={handleEditPractice}
          onDelete={handleDeletePractice}
        />
      </div>
    </div>
  );
};

export default CmsPractices;
