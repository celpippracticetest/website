import { Upload } from "@aws-sdk/lib-storage";
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { PlusCircle, Trash2, Upload as UploadIcon, Check } from "lucide-react";
import { saveSpeakingPractice } from "./cmsSpeakingService";
import { S3Client } from "@aws-sdk/client-s3";
import { SpeakingPracticeInput } from "./SpeakingPractice";
import { useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard-app/cms/RichTextEditor";
import { useRouter } from "nextjs-toploader/app";
import { TExamSchemaDto } from "@/models/exam.model";
import { Textarea } from "@/components/ui/textarea";

const parts = [
  "Problem Solving",
  "A Daily life conversation",
  "Information",
  "News Item",
  "Discussion",
  "Viewpoints",
  "Correspondence",
  "Apply a Diagram",
  "Information",
  "Viewpoints",
  "Writing an Email",
  "Survey Questions",
  "Giving Advice",
  "Talking about personal experience",
  "Describing a Scene",
  "Making predictions",
  "Comparing and Persuading",
  "Dealing with a difficult situation",
  "Expressing opinions",
  "Describing an unusual situation",
];

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  instructions: z.array(z.string()).default([]),
  type: z.literal("SPEAKING"),
  examId: z.string().min(1, "Exam ID is required"),
  partId: z.string().min(1, "Part ID is required"),
  passages: z.array(
    z.object({
      id: z.string().min(1, "Passage ID is required"),
      pictureUrl: z.string().optional(),
      title: z.string().min(1, "Passage title is required"),
      body: z.string().optional(),
    })
  ),
});

export default function SpeakingPracticeInputForm() {
  const searchParams = useSearchParams();
  const selectedExamId = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pictureUploads, setPictureUploads] = useState<{
    [key: string]: {
      file: File;
      uploading: boolean;
      progress: number;
      url: string;
    };
  }>({});
  const [exams, setExams] = useState<TExamSchemaDto[]>([]);
  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "SPEAKING",
      examId: "",
      partId: "1",
      instructions: [],
      passages: [
        {
          id: "1",
          title: "",
        },
      ],
    },
  });
  React.useEffect(() => {
    const fetchPractice = async () => {
      if (selectedExamId) {
        try {
          const response = await fetch(`/api/examParts/${selectedExamId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch practice");
          }
          const practiceData = await response.json();
          form.reset(practiceData.item);
        } catch (error) {
          console.error("Error fetching practice:", error);
        }
      }
    };

    fetchPractice();
  }, [selectedExamId, form]);
  useEffect(() => {
    fetchExams();
  }, []);
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
  // Field arrays for dynamic lists
  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
  } = useFieldArray({ control: form.control, name: "instructions" });

  const {
    fields: passageFields,
    append: appendPassage,
    remove: removePassage,
  } = useFieldArray({ control: form.control, name: "passages" });
  // Function to handle picture file upload
  const handlePictureUpload = async (file: File, fieldPath: string) => {
    if (!file) return;

    // Create a unique identifier for this upload
    const uploadId = `${fieldPath}_${Date.now()}`;

    // Update state to show upload is in progress
    setPictureUploads((prev) => ({
      ...prev,
      [uploadId]: { file, uploading: true, progress: 0, url: "" },
    }));

    try {
      // Create a FormData object to send the file
      const fakeUrl = await uploadFile(file);

      const formData = new FormData();
      formData.append("file", file);

      // In a real app, you would upload to your server or cloud storage
      // This is a simulation for demo purposes

      // Update the form with the picture URL
      form.setValue(fieldPath as any, fakeUrl);

      // Update state to show upload is complete
      if (fakeUrl !== null) {
        setPictureUploads((prev) => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            uploading: false,
            progress: 100,
            url: fakeUrl,
          },
        }));
      } else {
        console.error("Failed to get a valid URL for the uploaded file.");
      }
    } catch (error) {
      console.error("Upload error:", error);

      // Update state to show upload failed
      setPictureUploads((prev) => ({
        ...prev,
        [uploadId]: { ...prev[uploadId], uploading: false },
      }));
    }
  };

  async function uploadFile(file: File): Promise<string | null> {
    const client = new S3Client({
      region: "eu-north-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? "", // Replace with your AWS Access Key ID
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ?? "", // Replace with your AWS Secret Access Key
      },
    }); // Replace with your region

    const upload = new Upload({
      client,
      params: {
        Bucket: "celtest-audio", // Your bucket name
        Key: `exams/speaking/${Date.now()}_${file.name}`, // Unique key for the file
        Body: file,
      },
    });

    try {
      const result = await upload.done();
      return result.Location ?? ""; // Replace with your bucket's URL format
    } catch (error) {
      console.error("Upload failed", error);
      return null;
    }
  }

  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      // Calculate totalQuestion and totalPassages
      const totalPassages = values.passages.length;
      const totalQuestion = 0;

      const formData: SpeakingPracticeInput = {
        ...values,
        totalPassages,
        totalQuestion,
      };

      await saveSpeakingPractice(formData, selectedExamId);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Picture upload UI component
  const PictureUploadField = ({ fieldPath }: { fieldPath: string }) => {
    const inputId = `picture-upload-${fieldPath.replace(/\./g, "-")}`;
    const currentValue = form.watch(fieldPath as any);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 px-4 py-2 cursor-pointer border rounded bg-gray-50 hover:bg-gray-100"
          >
            <UploadIcon size={16} />
            <span>Upload Picture</span>
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handlePictureUpload(file, fieldPath);
              }
            }}
          />
          {currentValue && (
            <span className="flex items-center text-[14px] text-green-600">
              <Check className="w-4 h-4 mr-1" />
              Picture uploaded
            </span>
          )}
        </div>
        {currentValue && (
          <img
            src={currentValue}
            alt="Uploaded"
            className="w-full max-w-sm mt-2 rounded border"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Create Speaking Exam</h1>
        <p className="text-muted-foreground">
          Fill in the form below to create a new speaking Exam.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="Internal name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Internal name for this practice
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Public title" {...field} />
                    </FormControl>
                    <FormDescription>Title shown to students</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {READING_TASK_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the type of speaking task</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              <FormField
                control={form.control}
                name="examId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value.toString()}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Exam" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exams.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the Exam</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Number</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Part ID" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 8 }, (_, i) => (
                          <SelectItem key={i + 13} value={(i + 13).toString()}>
                            Part {i + 13} - {parts[i + 12]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value} // Ensure the value is bound to the field
                      defaultValue={field.value}
                    >
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
              /> */}

              {/* <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Free Practice</FormLabel>
                      <FormDescription>Make this practice available to free users</FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this speaking practice"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of what the practice contains (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Instructions</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendInstruction("")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Instruction
                </Button>
              </div>

              {instructionFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name={`instructions.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={`Instruction ${index + 1}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {instructionFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Speaking</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendPassage({
                    id: (passageFields.length + 1).toString(),
                    pictureUrl: "",
                    title: "",
                    body: "",
                  })
                }
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Passage
              </Button>
            </div>

            <Accordion type="multiple" className="space-y-4">
              {passageFields.map((passageField, passageIndex) => (
                <AccordionItem
                  key={passageField.id}
                  value={`passage-${passageIndex}`}
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-center">
                    <AccordionTrigger className="text-lg font-medium">
                      Passage {passageIndex + 1}:{" "}
                      {form.watch(`passages.${passageIndex}.title`) ||
                        "Untitled"}
                    </AccordionTrigger>
                    {passageFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePassage(passageIndex)}
                        className="ml-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <AccordionContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name={`passages.${passageIndex}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passage ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={
                                  typeof field.value === "string"
                                    ? field.value
                                    : ""
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`passages.${passageIndex}.pictureUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Picture File</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Input
                                    placeholder="Picture URL"
                                    {...field}
                                    className="mb-2"
                                  />
                                  <PictureUploadField
                                    fieldPath={`passages.${passageIndex}.pictureUrl`}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Upload a picture file or provide a URL
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name={`passages.${passageIndex}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`passages.${passageIndex}.body`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passage Content*</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              height="300px"
                              placeholderText="Enter passage content..."
                              insertQuestionMark={passageIndex === 1}
                            />
                          </FormControl>
                          <FormDescription>
                            {passageIndex === 0
                              ? "Add the main speaking passage. Use formatting as needed."
                              : "Use the 'Insert Q#' button to insert question markers where gaps should appear. Questions will be automatically added."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Questions */}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Create Speaking Exam"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
