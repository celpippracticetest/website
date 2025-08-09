"use client";

import React, { useEffect, useState } from "react";
import CmsPracticesTable from "../../../../components/dashboard-app/cms/CmsPracticesTable";
import CmsPracticesHeader from "../../../../components/dashboard-app/cms/CmsPracticesHeader";
import {
  PracticeApiResponse,
  Practice,
  ExamPartApiResponse,
} from "../../../../components/dashboard-app/cms/types/practiceTypes";
import {
  ExamIdFilter,
  ExamPartIdFilter,
  PracticeTypeFilter,
} from "@/components/dashboard-app/cms/PracticeTypeFilter";
import { useRouter } from "nextjs-toploader/app";
import { TExamPartSchemaDto } from "@/models/examParts.model";
import { TExamSchemaDto } from "@/models/exam.model";
import CmsExamPartsTable from "@/components/dashboard-app/cms/CmsExamPartsTable";

const CmsPractices = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();
  const [examId, setExamId] = useState<string | null>(null);
  const [partId, setPartId] = useState<string | null>(null);

  // Query to fetch practices with pagination from the API
  const [data, setData] = useState<{
    exams: TExamPartSchemaDto[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [exams, setExams] = useState<TExamSchemaDto[]>([]);

  useEffect(() => {
    fetchExams();
  }, []);
  useEffect(() => {
    fetchExamsParts();
  }, [page, pageSize, examId, partId]);

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", "0");
      params.set("limit", "100");
      const response = await fetch(`/api/exams?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch practices");
      }

      const result = await response.json();
      setExams(result.items);
    } catch (error) {
      console.error("Error fetching practices:", error);
    } finally {
    }
  };
  const fetchExamsParts = async () => {
    // Convert to zero-based page index for the API
    const apiPage = page - 1;

    setIsLoading(true);
    setIsError(false);

    try {
      const params = new URLSearchParams();
      params.set("page", apiPage.toString());
      params.set("limit", pageSize.toString());
      if (examId) {
        params.set("examId", examId);
      }
      if (partId) {
        params.set("partId", partId);
      }
      const response = await fetch(`/api/examParts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch practices");
      }

      const result: ExamPartApiResponse = await response.json();
      setData({
        exams: result.items,
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

  const refetch = fetchExamsParts;

  const handleCreatePractice = (type: string) => {
    switch (type) {
      case "listening":
        router.push("/cms/dashboard/exam/listening");
        break;
      case "reading":
        // Navigate to reading practice creation
        router.push("/cms/dashboard/exam/reading");
        break;
      case "writing":
        // Navigate to writing practice creation
        router.push("/cms/dashboard/exam/writing");
        break;
      case "speaking":
        // Navigate to speaking practice creation
        router.push("/cms/dashboard/exam/speaking");
        break;
      default:
        break;
    }
  };

  const handleEditPractice = (id: string, type: string) => {
    switch (type.toLowerCase()) {
      case "listening":
        router.push(`/cms/dashboard/exam/listening?id=${id}`);
        break;
      case "reading":
        router.push(`/cms/dashboard/exam/reading?id=${id}`);
        break;
      case "writing":
        router.push(`/cms/dashboard/exam/writing?id=${id}`);
        break;
      case "speaking":
        router.push(`/cms/dashboard/exam/speaking?id=${id}`);
        break;
      default:
        break;
    }
  };

  const handleDeletePractice = async (id: string, type: string) => {
    try {
      // For now, we'll just show a toast and simulate deletion
      // In a real implementation, you would make an API call to delete the practice
      await fetch(`/api/examParts/${id}`, {
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
    setExamId(type);
  };
  const handlePartIdChange = (type: string | null) => {
    setPartId(type);
  };
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <CmsPracticesHeader onCreatePractice={handleCreatePractice} />
        <div className="mb-6">
          <ExamIdFilter
            selectedType={examId}
            onTypeChange={handleTypeFilterChange}
            exams={exams}
          />
          <ExamPartIdFilter
            selectedType={partId}
            onTypeChange={handlePartIdChange}
          />
        </div>
        <CmsExamPartsTable
          examParts={data?.exams || []}
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
