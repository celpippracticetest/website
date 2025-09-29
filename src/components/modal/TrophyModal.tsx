"use client";

import React from "react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Clock, Target } from "lucide-react";

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
          {/* Trophy Icon */}
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${getLeagueColor(
                trophy.leagueType
              )} flex items-center justify-center text-4xl shadow-lg`}
            >
              {trophy.icon || getLeagueIcon(trophy.leagueType)}
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-800" />
            </div>
          </div>

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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Trophy Earned</span>
                <Badge
                  variant="secondary"
                  className={`bg-gradient-to-r ${getLeagueColor(
                    trophy.leagueType
                  )} text-white`}
                >
                  {trophy.leagueType.toUpperCase()}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {trophy.title}
              </h3>
              <p className="text-sm text-gray-600">{trophy.description}</p>
            </div>

            {/* Points Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-orange-500 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Total</span>
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{userPoints.total} XP</div>
                <div className="text-xs opacity-90">
                  +{userPoints.earned} earned
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-500 to-green-500 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Time</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{timeSpent || "02:45"}</div>
                <div className="text-xs opacity-90">spent</div>
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
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back to Practice
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
