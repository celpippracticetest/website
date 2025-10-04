"use client";

import React from "react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Clock, Target } from "lucide-react";
import SvgBeavoShowsTime from "../icons/BeavoShowsTime";

interface TrophyModalProps {
  isOpen: boolean;
  onClose: () => void;
  trophy: {
    id: string;
    title: string;
    description: string;
    points: number;
    leagueType: "bronze" | "silver" | "gold";
    icon?: React.ReactNode;
  } | null;
  userPoints: {
    total: number;
    previous: number;
    earned: number;
  };
  timeSpent?: string;
}

const TrophyModal: React.FC<TrophyModalProps> = ({
  isOpen,
  onClose,
  trophy,
  userPoints,
  timeSpent,
}) => {
  if (!trophy) return null;

  const getLeagueColor = (leagueType: string) => {
    switch (leagueType) {
      case "bronze":
        return "from-amber-400 to-orange-500";
      case "silver":
        return "from-gray-300 to-gray-400";
      case "gold":
        return "from-yellow-400 to-yellow-600";
      default:
        return "from-blue-400 to-blue-600";
    }
  };

  const getLeagueIcon = (leagueType: string) => {
    switch (leagueType) {
      case "bronze":
        return "🥉";
      case "silver":
        return "🥈";
      case "gold":
        return "🥇";
      default:
        return "🏆";
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? "block" : "hidden"
      }`}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6 p-6">
       
       <SvgBeavoShowsTime/>



          {/* Trophy Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Well Done!
            </h2>
            <p className="text-lg text-gray-600 mb-1">
              You've Earned New Points
            </p>
            <p className="text-sm text-gray-500">
              Each practice gets you closer to your goals
            </p>
          </div>

          {/* Trophy Details */}
          <div className="w-full space-y-4">
     

            {/* Points Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative h-[72px] overflow-hidden rounded-[16px]">
                {/* Gradient border using pseudo-element */}
                <div className="absolute inset-0 rounded-[16px] p-[3px] bg-gradient-to-r from-[#F79D65] to-[#759CFF]">
                  <div className="w-full h-full bg-white rounded-[13px] flex flex-col">
                    <div className="bg-gradient-to-r from-[#F79D65] to-[#759CFF] h-[32px] flex items-center justify-center">
                      <span className="text-sm font-medium text-white">Total</span>
                    </div>
                    <div className="text-black flex items-center justify-center text-[14px] h-[40px] text-center font-medium">{userPoints.total} XP</div>
                  </div>
                </div>
              </div>

              <div className="text-black h-[72px] overflow-hidden rounded-[16px] border-[3px] border-[#0DAA94]">
                <div className="bg-[#0DAA94] h-[32px]  flex items-center justify-center">
                  <span className="text-[14px] font-normal text-center text-white">Time</span>
                </div>
                <div className="text-[14px] flex items-center justify-center h-[40px] text-center font-medium">{timeSpent || "02:45"}</div>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min((userPoints.total / 150) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress to Gold League</span>
              <span>{Math.round((userPoints.total / 150) * 100)}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-[24px] cursor-pointer flex-1 h-[40px] border-[#76808F] text-[#76808F] "
            >
              Back to Practice
            </Button>
            <Button
              onClick={onClose}
              className="rounded-[24px] cursor-pointer  h-[40px] flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrophyModal;
