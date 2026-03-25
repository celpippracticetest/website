
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
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { TTaskSchemaDto } from "@/models/tasks.model";

interface CmsTasksTableProps {
    tasks: TTaskSchemaDto[];
    isLoading: boolean;
    isError: boolean;
    page: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

const CmsTasksTable = ({
    tasks,
    isLoading,
    isError,
    page,
    pageSize,
    totalItems,
    onPageChange,
    onEdit,
    onDelete,
}: CmsTasksTableProps) => {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (isLoading) {
        return <div className="flex justify-center p-8">Loading tasks...</div>;
    }

    if (isError) {
        return <div className="text-red-500 p-8">Error loading tasks</div>;
    }

    if (tasks.length === 0) {
        return <div className="p-8 text-center">No tasks found</div>;
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

    const getCategoryColor = (category?: string) => {
        switch (category?.toLowerCase()) {
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
                        <TableHead>Num</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Practices</TableHead>
                        <TableHead>Free</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium text-gray-500">
                                {task.taskNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                                {task.name}
                            </TableCell>
                            <TableCell>
                                <Badge className={getCategoryColor(task.category)}>
                                    {task.category}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={getDifficultyColor(task.difficulty)}
                                >
                                    {task.difficulty}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm text-gray-600">
                                    {task.practiceCount ?? 0}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge variant={task.isFree ? "outline" : "secondary"}>
                                    {task.isFree ? "Yes" : "No"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(task.id)}
                                    title="Edit task"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                "Are you sure you want to delete this task? This action cannot be undone."
                                            )
                                        ) {
                                            onDelete(task.id);
                                        }
                                    }}
                                    title="Delete task"
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Delete className="h-4 w-4" />
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

export default CmsTasksTable;
