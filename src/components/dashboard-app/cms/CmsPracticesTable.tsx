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

interface CmsPracticesTableProps {
  practices: Practice[];
  isLoading: boolean;
  isError: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEdit: (id: string, type: string) => void;
  onDelete: (id: string, type: string) => void;
}

const CmsPracticesTable = ({
  practices,
  isLoading,
  isError,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onEdit,
  onDelete,
}: CmsPracticesTableProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading practices...</div>;
  }

  if (isError) {
    return <div className="text-red-500 p-8">Error loading practices</div>;
  }

  if (practices.length === 0) {
    return <div className="p-8 text-center">No practices found</div>;
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            <TableHead>Task</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Is Free</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {practices.map((practice) => (
            <TableRow key={practice.id}>
              <TableCell className="font-mono text-[14px]">
                {practice.id.substring(0, 8)}...
              </TableCell>
              <TableCell>
                {practice.name || practice.title || "Untitled"}
              </TableCell>
              <TableCell>{practice.taskId || "N/A"}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getDifficultyColor(practice.difficulty)}
                >
                  {practice.difficulty || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={practice.isFree ? "outline" : "secondary"}>
                  {practice.isFree ? "Yes" : "No"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getTypeColor(practice.type)}>
                  {practice.type || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    redirect(
                      `/${practice.type.toLowerCase()}?selectedPracticeId=${
                        practice.id
                      }`,
                      RedirectType.push
                    );
                    // onEdit(practice.id, practice.type)
                  }}
                  title="View Practice"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(practice.id, practice.type)}
                  title="Edit practice"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this practice?"
                      )
                    ) {
                      onDelete(practice.id, practice.type);
                    }
                  }}
                  title="Delete practice"
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

export default CmsPracticesTable;
