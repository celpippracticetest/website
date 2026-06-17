import React from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Practice } from "./types/practiceTypes";
import { redirect, RedirectType } from "next/navigation";
import { TExamPartSchemaDto } from "@/models/examParts.model";

interface CmsExamPartsTableProps {
  examParts: TExamPartSchemaDto[];
  isLoading: boolean;
  isError: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEdit: (id: string, type: string) => void;
  onDelete: (id: string, type: string) => void;
}

const CmsExamPartsTable = ({
  examParts,
  isLoading,
  isError,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onEdit,
  onDelete,
}: CmsExamPartsTableProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading exams...</div>;
  }

  if (isError) {
    return <div className="text-red-500 p-8">Error loading Exams</div>;
  }

  if (examParts.length === 0) {
    return <div className="p-8 text-center">No Exams found</div>;
  }

  const getTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "listening":
        return "bg-blue-100 text-blue-800";
      case "reading":
        return "bg-purple-100 text-purple-800";
      case "writing":
        return "bg-indigo-100 text-indigo-800";
      case "speaking":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Exam</TableHead>
            <TableHead>Part</TableHead>

            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {examParts.map((examPart) => (
            <TableRow key={examPart.id}>
              <TableCell className="font-mono text-[14px]">
                {examPart.id.substring(0, 8)}...
              </TableCell>
              <TableCell>
                {examPart.name || examPart.title || "Untitled"}
              </TableCell>
              <TableCell>{examPart.examId.toString() || "N/A"}</TableCell>
              <TableCell>Part {examPart.partId || "N/A"}</TableCell>

              <TableCell>
                <Badge className={getTypeColor(examPart.type)}>
                  {examPart.type || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    window.open(
                      `/exams/exam_${examPart.examId.toString()}/part${
                        examPart.partId
                      }`,
                      "_blank"
                    );
                  }}
                  title="View exam part"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(examPart.id, examPart.type)}
                  title="Edit exam part"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this exam part?"
                      )
                    ) {
                      onDelete(examPart.id, examPart.type);
                    }
                  }}
                  title="Delete exam part"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="p-4 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={
                    page === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around the current page
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (page <= 3) {
                  pageNumber = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = page - 2 + i;
                }

                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNumber)}
                      isActive={pageNumber === page}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={
                    page === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default CmsExamPartsTable;
