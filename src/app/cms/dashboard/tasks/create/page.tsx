"use client";

import React, { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import TaskForm from "@/components/dashboard-app/cms/TaskForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

const CreateTaskPage = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (values: any) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create task");
            }

            toast({
                title: "Task created",
                description: "The new task has been successfully added.",
            });

            router.push("/cms/dashboard/tasks");
            router.refresh();
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast({
                title: "Error",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-4">
                <Link href="/cms/dashboard/tasks">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Create New Task</h1>
                    <p className="text-gray-500">Fill in the details to add a new task to the system.</p>
                </div>
            </div>

            <TaskForm onSubmit={onSubmit} isLoading={isLoading} />
        </div>
    );
};

export default CreateTaskPage;
