import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { TExamSchemaDto } from "@/models/exam.model";

interface PracticeTypeFilterProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}

export function PracticeTypeFilter({ selectedType, onTypeChange }: PracticeTypeFilterProps) {
  const handleTypeChange = (value: string) => {
    if (value === "all") {
      onTypeChange(null);
    } else {
      onTypeChange(value.toUpperCase());
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-white p-4 rounded-md shadow-sm">
      <Filter className="h-4 w-4 text-gray-500" />
      <span className="font-medium text-gray-700">Filter by Type:</span>
      <Select value={selectedType ? selectedType.toLowerCase() : "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All practice types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="listening">Listening</SelectItem>
          <SelectItem value="reading">Reading</SelectItem>
          <SelectItem value="writing">Writing</SelectItem>
          <SelectItem value="speaking">Speaking</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ExamIdFilter({
  selectedType,
  onTypeChange,
  exams,
}: {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  exams: TExamSchemaDto[];
}) {
  const handleTypeChange = (value: string) => {
    if (value === "all") {
      onTypeChange(null);
    } else {
      onTypeChange(value.toUpperCase());
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-white p-4 rounded-md shadow-sm">
      <Filter className="h-4 w-4 text-gray-500" />
      <span className="font-medium text-gray-700">Filter by Exam:</span>
      <Select value={selectedType ? selectedType.toLowerCase() : "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Exams" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Exams</SelectItem>
          {exams.map((exam, index) => (
            <SelectItem key={index} value={exam.id}>
              {exam.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ExamPartIdFilter({
  selectedType,
  onTypeChange,
}: {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}) {
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
    "Describing an unusual situation"
  ]
  const handleTypeChange = (value: string) => {
    if (value === "all") {
      onTypeChange(null);
    } else {
      onTypeChange(value.toUpperCase());
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-white p-4 rounded-md shadow-sm">
      <Filter className="h-4 w-4 text-gray-500" />
      <span className="font-medium text-gray-700">Filter by part:</span>
      <Select value={selectedType ? selectedType.toLowerCase() : "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All PartId" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Parts</SelectItem>
          {Array.from({ length: 20 }, (_, i) => (
            <SelectItem key={i + 1} value={(i + 1).toString()}>
              Part {i + 1} - {parts[i]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
