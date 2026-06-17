"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingNewFormProps {
  onComplete: (answers: any) => void;
  onAskLater: () => void;
}

const OnboardingNewForm: React.FC<OnboardingNewFormProps> = ({
  onComplete,
  onAskLater,
}) => {
  const [answers, setAnswers] = useState({
    testDate: "",
    focusSkill: "",
    customFocusSkill: "",
    targetScores: {
      listening: 7,
      reading: 7,
      writing: 7,
      speaking: 7,
    },
  });

  const testDateOptions = [
    "Within 2 weeks",
    "Within 1 month",
    "1–3 months",
    "3–6 months",
    "6+ months",
    "I don't have a date yet",
  ];

  const focusSkillOptions = [
    "Speaking",
    "Writing",
    "Listening",
    "Reading",
    "Exam strategy (time management, format)",
    "Other (please specify)",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(answers);
  };

  const handleScoreChange = (skill: string, value: number) => {
    const newValue = Math.max(5, Math.min(12, value));
    setAnswers(prev => ({
      ...prev,
      targetScores: {
        ...prev.targetScores,
        [skill]: newValue,
      },
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
        Help us personalize your CELPIP preparation
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Question 1: Test Date */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            1. When is your CELPIP test?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {testDateOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, testDate: option }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  answers.testDate === option
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2: Focus Skill */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            2. Which skill are you focused on improving first?
          </h3>
          <div className="space-y-3">
            {focusSkillOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, focusSkill: option }))}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  answers.focusSkill === option
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          
          {answers.focusSkill === "Other (please specify)" && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Please specify..."
                value={answers.customFocusSkill}
                onChange={(e) => setAnswers(prev => ({ ...prev, customFocusSkill: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Question 3: Target Scores */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            3. What is your target score?
          </h3>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(answers.targetScores).map(([skill, score]) => (
              <div key={skill} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <span className="font-medium capitalize text-gray-700">
                  {skill}:
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => handleScoreChange(skill, score - 1)}
                    disabled={score <= 5}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-lg">
                    {score}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleScoreChange(skill, score + 1)}
                    disabled={score >= 12}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onAskLater}
            className="flex-1"
          >
            Ask me later
          </Button>
          <Button
            type="submit"
            disabled={!answers.testDate || !answers.focusSkill}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OnboardingNewForm;
