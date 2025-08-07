import { Upload } from "@aws-sdk/lib-storage";
import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { saveWritingPractice } from "./cmsWritingService";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { redirect } from "next/dist/server/api-utils";
import { WritingPracticeInput } from "./WritingPractice";
import { useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard-app/cms/RichTextEditor";

// Predefined task options
const READING_TASK_OPTIONS = [
  { id: "67f203dfa44a7cf5683b80cd", name: "Task #1: Writing an Email" },
  { id: "67f203eda44a7cf5683b80ce", name: "Task #2: Survey Questions" },
];

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  instructions: z.array(z.string()).default([]),
  type: z.literal("WRITING"),
  isFree: z.boolean(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  taskId: z.string().min(1, "Task ID is required"),
  passages: z.array(
    z.object({
      id: z.string().min(1, "Passage ID is required"),
      pictureUrl: z.string().optional(),
      title: z.string().min(1, "Passage title is required"),
      body: z.string().min(1, "Body is required"),
      sampleResponse: z.array(
        z.object({
          id: z.string().min(1, "Question ID is required"),
          title: z.string(),
          subject: z.string(),
          body: z.string(),
        })
      ),
    })
  ),
});

export default function WritingPracticeInputForm() {
  const searchParams = useSearchParams();
  const selectedPracticeId = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const [pictureUploads, setPictureUploads] = useState<{
    [key: string]: {
      file: File;
      uploading: boolean;
      progress: number;
      url: string;
    };
  }>({});

  // State for raw sample response input per passage
  const [sampleResponseRawInputs, setSampleResponseRawInputs] = useState<
    string[]
  >([]);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "WRITING",
      isFree: true,
      difficulty: "intermediate",
      taskId: READING_TASK_OPTIONS[0].id,
      instructions: [],
      passages: [
        {
          id: "1",
          title: "",
          body: "",
          sampleResponse: [
            {
              id: "1",
              title: "",
              subject: "",
              body: "",
            },
          ],
        },
      ],
    },
  });
  React.useEffect(() => {
    const fetchPractice = async () => {
      if (selectedPracticeId) {
        try {
          const response = await fetch(`/api/practices/${selectedPracticeId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch practice");
          }
          const practiceData = await response.json();
          form.reset(practiceData.item); // Populate the form with fetched data
        } catch (error) {
          console.error("Error fetching practice:", error);
        }
      }
    };

    fetchPractice();
  }, [selectedPracticeId, form]);
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
        Key: `practices/writing/${Date.now()}_${file.name}`, // Unique key for the file
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
      const totalQuestion = values.passages.reduce(
        (sum, passage) => sum + passage.sampleResponse.length,
        0
      );

      const formData: WritingPracticeInput = {
        ...values,
        totalPassages,
        totalQuestion,
      };

      const result = await saveWritingPractice(formData, selectedPracticeId);

      if (result.success) {
      } else {
      }
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
        {showAlert && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50 text-sm">
            Successfully Received
          </div>
        )}
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
        <h1 className="text-2xl font-bold">Create Writing Practice</h1>
        <p className="text-muted-foreground">
          Fill in the form below to create a new writing practice exercise.
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

              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
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
                    <FormDescription>
                      Select the type of writing task
                    </FormDescription>
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
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Free Practice</FormLabel>
                      <FormDescription>
                        Make this practice available to free users
                      </FormDescription>
                    </div>
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
                      placeholder="Describe this writing practice"
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
              <h2 className="text-xl font-semibold">Writing</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendPassage({
                    id: (passageFields.length + 1).toString(),
                    pictureUrl: "",
                    title: "",
                    body: "",
                    sampleResponse: [
                      {
                        id: "1",
                        title: "",
                        subject: "",
                        body: "",
                      },
                    ],
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
                              ? "Add the main writing passage. Use formatting as needed."
                              : "Use the 'Insert Q#' button to insert question markers where gaps should appear. Questions will be automatically added."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Questions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Sample Responses</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentQuestions =
                              form.getValues(
                                `passages.${passageIndex}.sampleResponse`
                              ) || [];
                            form.setValue(
                              `passages.${passageIndex}.sampleResponse`,
                              [
                                ...currentQuestions,
                                {
                                  id: (currentQuestions.length + 1).toString(),
                                  title: "",
                                  subject: "",
                                  body: "",
                                },
                              ]
                            );
                          }}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Sample response
                        </Button>
                      </div>

                      <div className="mt-2">
                        <FormLabel>
                          Paste Sample Responses (auto-parse)
                        </FormLabel>
                        <Textarea
                          className="min-h-[80px] mb-2"
                          placeholder={`Sample Response 1 (Basic):\nBody...\nSample Response 2 (Good):\nBody...`}
                          value={sampleResponseRawInputs[passageIndex] || ""}
                          onChange={(e) => {
                            const newInputs = [...sampleResponseRawInputs];
                            newInputs[passageIndex] = e.target.value;
                            setSampleResponseRawInputs(newInputs);
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-1"
                          onClick={() => {
                            const rawSampleResponse =
                              sampleResponseRawInputs[passageIndex] || "";
                            const lines = rawSampleResponse
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean);
                            const responses: {
                              id: string;
                              title: string;
                              subject: string;
                              body: string;
                            }[] = [];
                            let current = {
                              id: "",
                              title: "",
                              subject: "",
                              body: "",
                            };
                            let sampleIndex = 0;
                            lines.forEach((line) => {
                              if (
                                /^Sample Response \d+ \((Basic|Good|Excellent)\):/i.test(
                                  line
                                )
                              ) {
                                if (sampleIndex > 0) {
                                  responses.push({ ...current });
                                }
                                current = {
                                  id: (sampleIndex + 1).toString(),
                                  title: line,
                                  subject:
                                    line.match(
                                      /\((Basic|Good|Excellent)\)/i
                                    )?.[1] || "",
                                  body: "",
                                };
                                sampleIndex++;
                              } else {
                                current.body +=
                                  (current.body ? "\n" : "") + line;
                              }
                            });
                            if (sampleIndex > 0) {
                              responses.push({ ...current });
                            }
                            form.setValue(
                              `passages.${passageIndex}.sampleResponse`,
                              Array.from({ length: responses.length }).map(
                                (_, i) => ({
                                  id: "",
                                  title: "",
                                  subject: "",
                                  body: "",
                                })
                              )
                            );
                            responses.forEach((r, i) => {
                              form.setValue(
                                `passages.${passageIndex}.sampleResponse.${i}.id`,
                                r.id
                              );
                              form.setValue(
                                `passages.${passageIndex}.sampleResponse.${i}.title`,
                                r.title
                              );
                              form.setValue(
                                `passages.${passageIndex}.sampleResponse.${i}.subject`,
                                r.subject
                              );
                              form.setValue(
                                `passages.${passageIndex}.sampleResponse.${i}.body`,
                                r.body
                              );
                              setShowAlert(true);
                              setTimeout(() => setShowAlert(false), 3000);
                            });
                          }}
                        >
                          Parse & Fill Sample Responses
                        </Button>
                      </div>

                      <Accordion type="multiple" className="space-y-4">
                        {form
                          .watch(`passages.${passageIndex}.sampleResponse`)
                          ?.map((_, sampleResponseIndex) => (
                            <AccordionItem
                              key={sampleResponseIndex}
                              value={`passage-${passageIndex}-sampleResponse-${sampleResponseIndex}`}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center">
                                <AccordionTrigger>
                                  Sample response {sampleResponseIndex + 1}:{" "}
                                  {form.watch(
                                    `passages.${passageIndex}.sampleResponse.${sampleResponseIndex}.title`
                                  ) || "Untitled"}
                                </AccordionTrigger>
                                {form.watch(
                                  `passages.${passageIndex}.sampleResponse`
                                ).length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentQuestions = form.getValues(
                                        `passages.${passageIndex}.sampleResponse`
                                      );
                                      form.setValue(
                                        `passages.${passageIndex}.sampleResponse`,
                                        currentQuestions.filter(
                                          (_, idx) =>
                                            idx !== sampleResponseIndex
                                        )
                                      );
                                    }}
                                    className="ml-auto"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </Button>
                                )}
                              </div>

                              <AccordionContent className="space-y-4 pt-4">
                                <FormField
                                  control={form.control}
                                  name={`passages.${passageIndex}.sampleResponse.${sampleResponseIndex}.id`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Sample response ID</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`passages.${passageIndex}.sampleResponse.${sampleResponseIndex}.title`}
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
                                  name={`passages.${passageIndex}.sampleResponse.${sampleResponseIndex}.subject`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Subject</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`passages.${passageIndex}.sampleResponse.${sampleResponseIndex}.body`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Body</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Create Writing Practice"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
