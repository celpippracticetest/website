
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import Add from "@mui/icons-material/Add";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CmsPracticesHeaderProps {
  onCreatePractice: (type: string) => void;
}

const CmsPracticesHeader = ({ onCreatePractice }: CmsPracticesHeaderProps) => {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CMS - Manage Practices</h1>
        <p className="text-gray-600 mt-2">
          View, edit, and create language learning practices
        </p>
      </div>
      
      <div className="mt-4 md:mt-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center">
              <Add className="mr-2 h-4 w-4" />
              Create New Practice/Exam
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onCreatePractice("listening")}>
              Listening
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePractice("reading")}>
              Reading
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePractice("writing")}>
              Writing 
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePractice("speaking")}>
              Speaking 
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default CmsPracticesHeader;
