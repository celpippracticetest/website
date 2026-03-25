"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import TaskForm from "@/components/dashboard-app/cms/TaskForm";
import { Button } from "@/components/ui/button";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import Autorenew from "@mui/icons-material/Autorenew";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { TTaskSchemaDto } from "@/models/tasks.model";

const EditTaskPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = use(params);
    const router = useRouter();
    const [task, setTask] = useState<TTaskSchemaDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const response = await fetch(`/api/tasks/${id}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch task");
                }
                const data = await response.json();
                setTask(data);
            } catch (error) {
                console.error("Error fetching task:", error);
                toast({
                    title: "Error",
                    description: "Could not load task details. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTask();
    }, [id]);

    const onSubmit = async (values: any) => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update task");
            }

            toast({
                title: "Task updated",
                description: "The task has been successfully updated.",
            });

            router.push("/cms/dashboard/tasks");
            router.refresh();
        } catch (error: any) {
            console.error("Error updating task:", error);
            toast({
                title: "Error",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Autorenew className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 text-center">
                <h1 className="text-2xl font-bold">Task not found</h1>
                <p className="text-gray-500 mb-4">The task you are looking for does not exist.</p>
                <Link href="/cms/dashboard/tasks">
                    <Button>Back to Tasks</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-4">
                <Link href="/cms/dashboard/tasks">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Edit Task: {task.name}</h1>
                    <p className="text-gray-500">Modify the task details below.</p>
                </div>
            </div>

            <TaskForm initialData={task} onSubmit={onSubmit} isLoading={isSaving} />
        </div>
    );
};

export default EditTaskPage;
