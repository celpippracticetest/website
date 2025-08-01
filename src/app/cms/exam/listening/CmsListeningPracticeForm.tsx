
import React from "react";
import { Card } from "@/components/ui/card";
import ListeningPracticeInputForm from "./ListeningPracticeInputForm";

const CmsListeningPracticeForm = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CMS - Create Listening Exam</h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below to create a new listening exam
          </p>
        </div>

        <Card className="p-6">
          <ListeningPracticeInputForm />
        </Card>
      </div>
    </div>
  );
};

export default CmsListeningPracticeForm;
