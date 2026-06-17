
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CmsTasksHeaderProps {
    onCreateTask: () => void;
}

const CmsTasksHeader = ({ onCreateTask }: CmsTasksHeaderProps) => {
    return (
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">CMS - Manage Tasks</h1>
                <p className="text-gray-600 mt-2">
                    View, edit, and create high-level tasks for individual practice types
                </p>
            </div>

            <div className="mt-4 md:mt-0">
                <Button onClick={onCreateTask} className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Task
                </Button>
            </div>
        </div>
    );
};

export default CmsTasksHeader;
