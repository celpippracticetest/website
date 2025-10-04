"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

interface LeagueMedalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'points' | 'task';
  title: string;
  points?: number;
  timeSpent?: string;
  taskTitle?: string;
}

const LeagueMedalModal: React.FC<LeagueMedalModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  points,
  timeSpent,
  taskTitle
}) => {
  const pathname = usePathname();
  
  if (!isOpen) return null;

  // Determine if we're on a practice page or exam page
  const isPracticePage = pathname.includes('/practice') || pathname.includes('/listening') || pathname.includes('/reading') || pathname.includes('/writing') || pathname.includes('/speaking');
  const isExamPage = pathname.includes('/exam') || pathname.includes('/mock');
  
  const buttonText = isExamPage ? 'Back to Exam' : 'Back to Practice';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[16px] p-[32px] max-w-[400px] w-full mx-4 text-center">
        <div className="mb-[24px]">
          <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center mx-auto mb-[16px] ${
            type === 'points' ? 'bg-[#FED7AA]' : 'bg-[#10B981]'
          }`}>
            <span className="text-[32px]">
              {type === 'points' ? '🏆' : '✅'}
            </span>
          </div>
          <h3 className="text-[24px] font-bold text-[#212E42] mb-[8px]">
            {title}
          </h3>
          {points && (
            <p className="text-[18px] text-[#37465C] mb-[8px]">
              +{points} Points
            </p>
          )}
          {timeSpent && (
            <p className="text-[14px] text-[#76808F] mb-[8px]">
              Time spent: {timeSpent}
            </p>
          )}
          {taskTitle && (
            <p className="text-[16px] text-[#37465C] mb-[16px]">
              {taskTitle}
            </p>
          )}
          {type === 'task' && (
            <p className="text-[14px] text-[#76808F] mb-[16px]">
              You're on your way!
            </p>
          )}
          {type === 'task' && (
            <div className="w-full bg-[#E5E7EB] rounded-full h-[8px] mb-[16px]">
              <div className="bg-[#10B981] h-[8px] rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
          )}
        </div>
        <div className="flex w-full">
          <button
            onClick={onClose}
            className="w-full bg-[#4A7DFF] text-white py-[12px] px-[24px] rounded-[8px] font-medium"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeagueMedalModal;
