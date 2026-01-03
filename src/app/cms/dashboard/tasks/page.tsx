"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import CmsTasksHeader from "@/components/dashboard-app/cms/CmsTasksHeader";
import CmsTasksTable from "@/components/dashboard-app/cms/CmsTasksTable";
import { TTaskSchemaDto } from "@/models/tasks.model";

const CmsTasks = () => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const router = useRouter();

    const [data, setData] = useState<{
        items: TTaskSchemaDto[];
        totalItems: number;
        totalPages: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [page, pageSize]);

    const fetchTasks = async () => {
        // API uses 0-based index
        const apiPage = page - 1;

        setIsLoading(true);
        setIsError(false);

        try {
            const params = new URLSearchParams();
            params.set("page", apiPage.toString());
            params.set("limit", pageSize.toString());

            const response = await fetch(`/api/tasks?${params.toString()}`);
            if (!response.ok) {
                throw new Error("Failed to fetch tasks");
            }

            const result = await response.json();
            setData({
                items: result.items,
                totalItems: result.totalItems,
                totalPages: result.totalPages,
            });
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTask = () => {
        router.push("/cms/dashboard/tasks/create");
    };

    const handleEditTask = (id: string) => {
        router.push(`/cms/dashboard/tasks/${id}`);
    };

    const handleDeleteTask = async (id: string) => {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete task");
            }

            fetchTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
            alert("Failed to delete task. Please try again.");
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <CmsTasksHeader onCreateTask={handleCreateTask} />
                <CmsTasksTable
                    tasks={data?.items || []}
                    isLoading={isLoading}
                    isError={isError}
                    page={page}
                    pageSize={pageSize}
                    totalItems={data?.totalItems || 0}
                    onPageChange={handlePageChange}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                />
            </div>
        </div>
    );
};

export default CmsTasks;
