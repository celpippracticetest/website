"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TTaskSchemaDto } from "@/models/tasks.model";
import Autorenew from "@mui/icons-material/Autorenew";

const taskFormSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    category: z.enum(["listening", "reading", "writing", "speaking"]),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    taskNumber: z.string().min(1, { message: "Task number is required." }),
    isFree: z.boolean().default(false),
    description: z.string().optional(),
    type: z.literal("practice").default("practice"),
    antropicCommand: z.object({
        systemPrompt: z.string().min(1, { message: "System prompt is required." }),
        userPrompt: z.string().min(1, { message: "User prompt is required." }),
    }).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
    initialData?: Partial<TTaskSchemaDto>;
    onSubmit: (data: TaskFormValues) => Promise<void>;
    isLoading: boolean;
}

const TaskForm = ({ initialData, onSubmit, isLoading }: TaskFormProps) => {
    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            category: initialData?.category || "listening",
            difficulty: initialData?.difficulty || "beginner",
            taskNumber: initialData?.taskNumber || "",
            isFree: initialData?.isFree || false,
            description: initialData?.description || "",
            type: "practice",
            antropicCommand: initialData?.antropicCommand || {
                systemPrompt: "",
                userPrompt: "",
            },
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Task Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Survey Questions" {...field} />
                                </FormControl>
                                <FormDescription>The display name of the task.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="taskNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Task Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Task #2" {...field} />
                                </FormControl>
                                <FormDescription>The identifier used in the exam (e.g. Part 1, Task #2).</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="listening">Listening</SelectItem>
                                        <SelectItem value="reading">Reading</SelectItem>
                                        <SelectItem value="writing">Writing</SelectItem>
                                        <SelectItem value="speaking">Speaking</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Difficulty</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what the student needs to do in this task..."
                                    className="min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isFree"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Available for free users
                                </FormLabel>
                                <FormDescription>
                                    If checked, this task will be accessible without a premium subscription.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">AI Evaluation Prompts</h3>
                    <p className="text-sm text-gray-500">
                        Define the system and user prompts used by the AI to evaluate student responses for this task.
                    </p>

                    <FormField
                        control={form.control}
                        name="antropicCommand.systemPrompt"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>System Prompt</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="You are an experienced CELPIP examiner..."
                                        className="min-h-[200px] font-mono text-sm"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="antropicCommand.userPrompt"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>User Prompt</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Analyze the user's response: {{USER_RESPONSE}}..."
                                        className="min-h-[200px] font-mono text-sm"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? (
                        <>
                            <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save Task"
                    )}
                </Button>
            </form>
        </Form>
    );
};

export default TaskForm;
