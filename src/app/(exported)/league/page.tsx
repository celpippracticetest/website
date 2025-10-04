"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bronz40,
  CircleCheck,
  Gold24,
  Gold40,
  LearningGuide,
  LearningListening,
  LearningMockExam,
  LearningReading,
  LearningSpeaking,
  LearningWriting,
  Silver24,
  Silver40,
} from "@/components/icons";
import SvgSvgBeforeTypingWord from "@/components/icons/SvgBeforeTypingWord";
import SvgLearningArrowUp from "@/components/icons/LearningArrowUp";
import { useUserContext } from "@/hooks/useUserContext";
import { useUser } from "@clerk/nextjs";
import UpgradeModal from "@/components/modal/UpgradeModal";
import LoginModal from "@/components/modal/LoginModal";
import { ActivityLogger } from "@/lib/userActivity";
import SvgLeagueKados from "@/components/icons/LeagueKados";
import SvgLeagueKados24 from "@/components/icons/LeagueKados24";
import SvgCheck from "@/components/icons/Check";
import SvgBronz96 from "@/components/icons/Bronz96";
import SvgGold80 from "@/components/icons/Gold80";
import SvgSilver80 from "@/components/icons/Silver80";
import { useRouter, usePathname } from "next/navigation";

type Skill = {
  label: string;
  icon: React.ReactNode;
  description?: string[];
  popoverLabel?: string;
};

type PopPos = { top: number; left: number };

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// League System Types
type LeagueType = "bronze" | "silver" | "gold";

interface LeagueUser {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  league: LeagueType;
  position: number;
  tasksCompleted: string[];
  isCurrentUser?: boolean;
}

interface LeagueTask {
  id: string;
  title: string;
  points: number;
  completed: boolean;
  description: string;
}

interface MedalData {
  type: "points" | "task";
  title: string;
  points?: number;
  timeSpent?: string;
  taskTitle?: string;
}

interface LeagueData {
  users: LeagueUser[];
  tasks: LeagueTask[];
  currentLeague: LeagueType;
  seasonEndDate: Date;
  userPoints: number;
}

const Page = () => {
  const [isInConversation, setIsInConversation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [serverMessageCount, setServerMessageCount] = useState(0);
  const userContext = useUserContext();
  const { user, isLoaded, isSignedIn } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // League System State
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [showMedalModal, setShowMedalModal] = useState(false);
  const [medalData, setMedalData] = useState<MedalData | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [isLoadingLeague, setIsLoadingLeague] = useState(true);
  const [userGroup, setUserGroup] = useState<any>(null);
  const [currentLeague, setCurrentLeague] = useState<any>(null);
  const [allLeagues, setAllLeagues] = useState<any[]>([]);

  // Check if user is free or premium
  const isFreeUser = user?.publicMetadata?.plan === "free";
  const isPremiumUser = user?.publicMetadata?.plan === "premium";
  const noUser = isLoaded ? !isSignedIn : false;

  // Fetch league data from API
  const fetchLeagueData = async () => {
    try {
      setIsLoadingLeague(true);

      // First, try to auto-assign user to league if not already assigned
      try {
        await fetch("/api/league", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "auto_assign_league",
          }),
        });
      } catch (error) {
        console.log("Auto-assignment failed or user already assigned:", error);
      }

      // Fetch league data - API will handle season creation and auto-assignment
      const response = await fetch("/api/league");
      const data = await response.json();

      if (response.ok) {
        setCurrentLeague(data.currentLeague);
        setUserGroup(data.userGroup);
        setAllLeagues(data.leagues || []);

        if (data.userGroup) {
          // User is in a league group
          const users = data.userGroup.users.map((u: any) => ({
            id: u.userId,
            name:
              u.userId === user?.id
                ? user?.firstName ||
                  user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
                  "You"
                : `User ${u.userId.slice(-4)}`,
            points: u.points,
            league: data.currentLeague?.type || "bronze",
            position: u.position,
            tasksCompleted: data.userPoints?.tasksCompleted || [],
            isCurrentUser: u.userId === user?.id,
          }));

          const tasks =
            data.currentLeague?.requirements?.tasks?.map((task: any) => ({
              id: task.id,
              title: task.title,
              points: task.points,
              completed:
                data.userPoints?.tasksCompleted?.includes(task.id) || false,
              description: task.description,
            })) || [];

          setLeagueData({
            users,
            tasks,
            currentLeague: data.currentLeague?.type || "bronze",
            seasonEndDate: new Date(data.currentSeason?.endDate),
            userPoints: data.userPoints?.totalPoints || 0,
          });
        } else {
          // User not in league yet - show empty state
          setLeagueData({
            users: [],
            tasks:
              data.leagues?.[0]?.requirements?.tasks?.map((task: any) => ({
                id: task.id,
                title: task.title,
                points: task.points,
                completed: false,
                description: task.description,
              })) || [],
            currentLeague: "bronze",
            seasonEndDate: new Date(data.currentSeason?.endDate),
            userPoints: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching league data:", error);
    } finally {
      setIsLoadingLeague(false);
    }
  };

  // Initialize league data
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchLeagueData();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // Handle points earned
  const handlePointsEarned = async (
    points: number,
    timeSpent: string,
    pointsType: string = "practiceSessions"
  ) => {
    try {
      const response = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_points",
          points,
          pointsType,
        }),
      });

      if (response.ok) {
        setMedalData({
          type: "points",
          title: "Points Earned!",
          points,
          timeSpent,
        });
        setShowMedalModal(true);

        // Refresh league data
        await fetchLeagueData();
      }
    } catch (error) {
      console.error("Error adding points:", error);
    }
  };


  // Handle task completion
  const handleTaskCompletion = async (taskId: string) => {
    if (!leagueData || !currentLeague) return;

    const task = leagueData.tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return;

    try {
      const response = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_task",
          taskId,
          leagueType: currentLeague.type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompletedTaskId(taskId);
        setShowTaskModal(true);

        // Refresh league data
        await fetchLeagueData();
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // Handle get trophy button
  const handleGetTrophy = () => {
    router.push("/exam-overview");
  };

  // Check if user meets requirements for a league
  const checkLeagueRequirements = (leagueType: string) => {
    if (!leagueData) return false;

    const league = allLeagues.find((l) => l.type === leagueType);
    if (!league) return false;

    // Check if user has enough trophies/points
    const requiredTrophies = league.requirements?.minTrophies || 0;
    const userTrophies = Math.floor(leagueData.userPoints / 50); // Assuming 50 points = 1 trophy

    return userTrophies >= requiredTrophies;
  };

  // Get tasks for specific league
  const getTasksForLeague = (leagueType: string) => {
    const league = allLeagues.find((l) => l.type === leagueType);
    if (!league) return [];

    return (
      league.requirements?.tasks?.map((task: any) => ({
        id: task.id,
        title: task.title,
        points: task.points,
        completed: leagueData?.userPoints
          ? (leagueData as any).tasksCompleted?.includes(task.id) || false
          : false,
        description: task.description,
      })) || []
    );
  };

  // Check if a task is completed based on user data
  const isTaskCompleted = (taskTitle: string, leagueType: string) => {
    if (!leagueData) return false;

    // Mock exam completion check
    if (taskTitle.includes("Mock Exam")) {
      const requiredCount = parseInt(taskTitle.match(/\d+/)?.[0] || "1");
      // Check if user has enough points from mock exams (20 points each)
      const mockExamPoints =
        (leagueData as any).pointsBreakdown?.mockExams || 0;
      return mockExamPoints >= requiredCount * 20;
    }

    // Skills tried check
    if (taskTitle.includes("Skills Tried")) {
      // Check if user has tried all 4 skills (L, R, W, S)
      const skillsTriedPoints =
        (leagueData as any).pointsBreakdown?.skillsTried || 0;
      return skillsTriedPoints >= 40; // Assuming 10 points per skill
    }

    // AI Feedback check
    if (taskTitle.includes("AI Feedback")) {
      const aiFeedbackPoints =
        (leagueData as any).pointsBreakdown?.aiFeedback || 0;
      return aiFeedbackPoints >= 5; // Assuming 5 points per AI feedback
    }

    // CLB Improvement check
    if (taskTitle.includes("CLB Improvement")) {
      // This would need to be tracked separately in user scores
      return leagueData.userPoints >= 50; // Placeholder logic
    }

    // Writing/Speaking with Feedback check
    if (
      taskTitle.includes("Writing with Feedback") ||
      taskTitle.includes("Speaking with Feedback")
    ) {
      const requiredCount = parseInt(taskTitle.match(/\d+/)?.[0] || "1");
      const aiFeedbackPoints =
        (leagueData as any).pointsBreakdown?.aiFeedback || 0;
      return aiFeedbackPoints >= requiredCount * 5; // Assuming 5 points per feedback
    }

    // Practice frequency check
    if (taskTitle.includes("Practice 3x/Week")) {
      const practicePoints =
        (leagueData as any).pointsBreakdown?.practiceSessions || 0;
      return practicePoints >= 100; // Assuming 100 points for consistent practice
    }

    // Referral check
    if (taskTitle.includes("Friend Referred")) {
      // This would need to be tracked separately
      return leagueData.userPoints >= 80; // Placeholder logic
    }

    return false;
  };

  // Render tasks for a specific league
  const renderLeagueTasks = (leagueType: string, staticTasks: any[]) => {
    // If user is in this league, show dynamic tasks
    if (currentLeague?.type === leagueType && leagueData?.tasks) {
      return leagueData.tasks.map((task) => (
        <div key={task.id} className="flex gap-[8px]">
          <div
            className={`cursor-pointer ${
              task.completed ? "text-[#10B981]" : "text-[#979EA8]"
            }`}
            onClick={() => !task.completed && handleTaskCompletion(task.id)}
          >
            <CircleCheck />
          </div>
          <span
            className={`text-[14px] ${
              task.completed ? "text-[#10B981]" : "text-[#37465C]"
            }`}
          >
            {task.title}
          </span>
        </div>
      ));
    }

    // Otherwise show static tasks with completion status
    return staticTasks.map((task, index) => {
      const completed = isTaskCompleted(task, leagueType);
      return (
        <div key={index} className="flex gap-[8px]">
          <div className={completed ? "text-[#10B981]" : "text-[#979EA8]"}>
            <CircleCheck />
          </div>
          <span
            className={`text-[14px] ${
              completed ? "text-[#10B981]" : "text-[#37465C]"
            }`}
          >
            {task}
          </span>
        </div>
      );
    });
  };

  // League progression logic
  const calculateLeagueProgression = (
    users: LeagueUser[],
    currentLeague: LeagueType
  ) => {
    const sortedUsers = [...users].sort((a, b) => b.points - a.points);
    const totalUsers = sortedUsers.length;

    // Define zones based on league
    let promotionZone: number;
    let demotionZone: number;

    switch (currentLeague) {
      case "bronze":
        promotionZone = Math.ceil(totalUsers * 0.3); // Top 30% promote to Silver
        demotionZone = Math.floor(totalUsers * 0.2); // Bottom 20% stay in Bronze
        break;
      case "silver":
        promotionZone = Math.ceil(totalUsers * 0.25); // Top 25% promote to Gold
        demotionZone = Math.floor(totalUsers * 0.3); // Bottom 30% demote to Bronze
        break;
      case "gold":
        promotionZone = 0; // No promotion from Gold
        demotionZone = Math.floor(totalUsers * 0.4); // Bottom 40% demote to Silver
        break;
    }

    return sortedUsers.map((user, index) => {
      let newLeague = user.league;
      let status = "safe";

      if (index < promotionZone && currentLeague !== "gold") {
        newLeague = currentLeague === "bronze" ? "silver" : "gold";
        status = "promoted";
      } else if (
        index >= totalUsers - demotionZone &&
        currentLeague !== "bronze"
      ) {
        newLeague = currentLeague === "gold" ? "silver" : "bronze";
        status = "demoted";
      } else if (index >= promotionZone && index < totalUsers - demotionZone) {
        status = "safe";
      }

      return {
        ...user,
        league: newLeague,
        position: index + 1,
        status,
      };
    });
  };

  // Check if season should end and process league changes
  const processSeasonEnd = () => {
    if (!leagueData) return;

    const now = new Date();
    const timeLeft = leagueData.seasonEndDate.getTime() - now.getTime();

    if (timeLeft <= 0) {
      // Season ended, process league changes
      const updatedUsers = calculateLeagueProgression(
        leagueData.users,
        leagueData.currentLeague
      );

      // Create new season
      const newSeasonEndDate = new Date();
      newSeasonEndDate.setDate(newSeasonEndDate.getDate() + 7);

      setLeagueData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: updatedUsers,
          seasonEndDate: newSeasonEndDate,
        };
      });
    }
  };

  // Check season status every minute
  useEffect(() => {
    const interval = setInterval(processSeasonEnd, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [leagueData]);

  // Skeleton Loading Component
  const SkeletonLoadingComponent = () => (
    <div className="min-h-[529px] bg-white border border-[#E0E7FF] rounded-[12px] p-[24px]">
      <div className="space-y-[16px]">
        {/* Skeleton rows */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-[16px] py-[8px] animate-pulse"
          >
            <div className="w-[8px] h-[8px] bg-[#E5E7EB] rounded-full"></div>
            <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded-full"></div>
            <div className="flex-1 h-[12px] bg-[#E5E7EB] rounded-[4px]"></div>
            <div className="w-[60px] h-[12px] bg-[#E5E7EB] rounded-[4px]"></div>
          </div>
        ))}

        {/* Current user skeleton row */}
        <div className="bg-[#F8FAFC] rounded-[8px] p-[12px] flex items-center gap-[12px] animate-pulse">
          <div className="w-[8px] h-[8px] bg-[#E5E7EB] rounded-full"></div>
          <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded-full"></div>
          <div className="flex-1">
            <div className="h-[16px] bg-[#E5E7EB] rounded-[4px] w-[80px]"></div>
          </div>
          <div className="h-[16px] bg-[#E5E7EB] rounded-[4px] w-[40px]"></div>
        </div>
      </div>
    </div>
  );

  // Empty State Component
  const EmptyStateComponent = () => (
    <div className="min-h-[529px] bg-white border border-[#E0E7FF] rounded-[12px] p-[24px]">
      <div className="space-y-[16px]">
        {/* Placeholder rows */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-[16px] py-[8px]">
            <div className="w-[8px] h-[8px] bg-[#E5E7EB] rounded-full"></div>
            <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded-full"></div>
            <div className="flex-1 h-[12px] bg-[#E5E7EB] rounded-[4px]"></div>
            <div className="w-[60px] h-[12px] bg-[#E5E7EB] rounded-[4px]"></div>
          </div>
        ))}

        {/* Current user row (highlighted) */}
        <div className="bg-[#FED7AA] rounded-[8px] p-[12px] flex items-center gap-[12px]">
          <div className="w-[8px] h-[8px] bg-[#374151] rounded-full"></div>
          <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded-full flex items-center justify-center">
            <div className="w-[32px] h-[32px] bg-[#9CA3AF] rounded-full"></div>
          </div>
          <div className="text-[#374151] font-medium">
            {user?.firstName ||
              user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
              "You"}
          </div>
          <div className="text-[#374151] font-medium flex-1 text-right">
            0 XP
          </div>
        </div>
      </div>
    </div>
  );

  // League Status Component
  const LeagueStatusComponent = () => {
    if (!leagueData) return null;

    const now = new Date();
    const timeLeft = leagueData.seasonEndDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.ceil(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    return (
      <div className="mb-[16px] p-[16px] bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-[#212E42]">
              {leagueData.currentLeague.charAt(0).toUpperCase() +
                leagueData.currentLeague.slice(1)}{" "}
              League
            </h3>
            <p className="text-[14px] text-[#64748B]">
              Season ends in {daysLeft} days, {hoursLeft} hours
            </p>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-bold text-[#4A7DFF]">
              {leagueData.userPoints}
            </div>
            <div className="text-[12px] text-[#64748B]">Your Points</div>
          </div>
        </div>
      </div>
    );
  };

  // League Table Component
  const LeagueTableComponent = () => {
    if (isLoadingLeague) return <SkeletonLoadingComponent />;
    if (!leagueData) return <EmptyStateComponent />;
    if (leagueData.users.length === 0) return <EmptyStateComponent />;

    return (
      <div className="min-h-[529px] bg-white border border-[#E0E7FF] rounded-[12px] p-[24px]">
        <LeagueStatusComponent />
        <div className="space-y-[16px]">
          {/* Show all users in the group, sorted by points */}
          {leagueData.users
            .sort((a, b) => b.points - a.points)
            .map((groupUser, index) => (
              <div
                key={`user-${groupUser.id || 'unknown'}-${index}-${groupUser.points || 0}`}
                className={`flex items-center gap-[16px] py-[8px] ${
                  groupUser.isCurrentUser
                    ? "bg-[#FED7AA] rounded-[8px] p-[12px]"
                    : ""
                }`}
              >
                <div className="w-[8px] h-[8px] bg-[#E5E7EB] rounded-full"></div>
                <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded-full flex items-center justify-center">
                  {groupUser.avatar ? (
                    <img
                      src={groupUser.avatar}
                      alt={groupUser.name}
                      className="w-[32px] h-[32px] rounded-full"
                    />
                  ) : (
                    <div className="w-[32px] h-[32px] bg-[#9CA3AF] rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[#374151] font-medium">
                    {groupUser.name ||
                      (groupUser as any).email?.split("@")[0] ||
                      "User"}
                  </div>
                </div>
                <div className="text-[#374151] font-medium">
                  {groupUser.points} XP
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Medal Modal Component
  const MedalModal = () => {
    if (!showMedalModal || !medalData) return null;

    // Determine if we're on a practice page or exam page
    const isPracticePage = pathname.includes('/practice') || pathname.includes('/listening') || pathname.includes('/reading') || pathname.includes('/writing') || pathname.includes('/speaking');
    const isExamPage = pathname.includes('/exam') || pathname.includes('/mock');
    
    const buttonText = isExamPage ? 'Back to Exam' : 'Back to Practice';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-[16px] p-[32px] max-w-[400px] w-full mx-4 text-center">
          <div className="mb-[24px]">
            <div className="w-[80px] h-[80px] bg-[#FED7AA] rounded-full flex items-center justify-center mx-auto mb-[16px]">
              <span className="text-[32px]">🏆</span>
            </div>
            <h3 className="text-[24px] font-bold text-[#212E42] mb-[8px]">
              {medalData.title}
            </h3>
            {medalData.points && (
              <p className="text-[18px] text-[#37465C] mb-[8px]">
                +{medalData.points} Points
              </p>
            )}
            {medalData.timeSpent && (
              <p className="text-[14px] text-[#76808F]">
                Time spent: {medalData.timeSpent}
              </p>
            )}
          </div>
          <div className="flex w-full">
            <button
              onClick={() => setShowMedalModal(false)}
              className="w-full bg-[#4A7DFF] text-white py-[12px] px-[24px] rounded-[8px] font-medium"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Task Completion Modal Component
  const TaskCompletionModal = () => {
    if (!showTaskModal || !completedTaskId || !leagueData) return null;

    const task = leagueData.tasks.find((t) => t.id === completedTaskId);
    if (!task) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-[16px] p-[32px] max-w-[400px] w-full mx-4 text-center">
          <div className="mb-[24px]">
            <div className="w-[80px] h-[80px] bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-[16px]">
              <span className="text-[32px]">✅</span>
            </div>
            <h3 className="text-[24px] font-bold text-[#212E42] mb-[8px]">
              Task Completed!
            </h3>
            <p className="text-[16px] text-[#37465C] mb-[16px]">{task.title}</p>
            <p className="text-[14px] text-[#76808F] mb-[16px]">
              You're on your way!
            </p>
            {/* Progress bar animation */}
            <div className="w-full bg-[#E5E7EB] rounded-full h-[8px] mb-[16px]">
              <div
                className="bg-[#10B981] h-[8px] rounded-full animate-pulse"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowTaskModal(false);
              setCompletedTaskId(null);
            }}
            className="w-full bg-[#4A7DFF] text-white py-[12px] px-[24px] rounded-[8px] font-medium"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const skills: Skill[] = [
    {
      label: "Speaking",
      popoverLabel: " Analyze my recent speaking results",
      icon: (
        <LearningSpeaking className="text-[#F4845F] group-hover:!text-white" />
      ),
      description: [
        "How do I get better at managing time in Speaking tasks?",
        "Can you give me a sample answer for “Describe a place you visited”?",
        "How can I improve my fluency and avoid pauses?",
        "Based on my last Speaking test, what is my weakest area?",
      ],
    },
    {
      label: "Writing",
      icon: (
        <LearningWriting className="text-[#0DAA94] group-hover:!text-white" />
      ),
      description: [
        "How do I structure a CELPIP Writing Task 1 email?",
        "Can you show me common mistakes in Writing Task 2 essays?",
        "How can I improve coherence and grammar in my writing?",
        "What feedback do you have on my last Writing submission?",
      ],
    },
    {
      label: "Reading",
      icon: (
        <LearningReading className="text-[#EE4266] group-hover:!text-white" />
      ),
      description: [
        "	What strategies help answer “fill in the blank” questions faster?",
        "How can I improve my reading speed for CELPIP passages?",
        "Which type of questions are hardest in Reading, and how do I tackle them?",
        "Based on my Reading results, what should I practice more?",
      ],
    },
    {
      label: "Listening",
      icon: (
        <LearningListening className="text-[#316BFF] group-hover:!text-white" />
      ),
      description: [
        "How can I improve my note-taking during CELPIP Listening tasks?",
        "Why do I miss details like numbers and dates in the Listening test?",
        "Can you explain the Listening task types in CELPIP?",
        "Based on my last practice, what should I focus on in Listening?",
      ],
    },
    {
      label: "Mock Exams",
      icon: (
        <LearningMockExam className="text-[#DA2AFE] group-hover:!text-white" />
      ),
      description: [
        "How close are my mock exam results to the real CELPIP test?",
        "What were my top 2 weak skills in my last mock exam?",
        "How can I manage time better across the full mock exam?",
        "Should I take more mock exams before my real test?",
      ],
    },
    {
      label: "Guide & Tips",
      icon: (
        <LearningGuide className="text-[#759CFF] group-hover:!text-white" />
      ),
      description: [
        "What is the structure of the CELPIP exam?",
        "How is CELPIP different from IELTS?",
        "What are some general tips to score 9 or higher?",
        "What scoring criteria does CELPIP use for Speaking and Writing?",
      ],
    },
  ];

  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pos, setPos] = useState<PopPos | null>(null);

  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Check server-side message count on component mount
  useEffect(() => {
    const checkMessageCount = async () => {
      if (isFreeUser && !isPremiumUser) {
        try {
          const response = await fetch("/api/chatbot/check-limit", {
            method: "GET",
          });

          if (response.ok) {
            const data = await response.json();
            setServerMessageCount(data.count || 0);

            // If free user has already sent messages, lock the chat
            if (data.count >= 1) {
              setIsChatLocked(true);
            }
          }
        } catch (error) {
          console.error("Error checking message count:", error);
        }
      } else if (noUser) {
        // For guests, check if they've already sent a message
        try {
          const response = await fetch("/api/chatbot/check-limit", {
            method: "GET",
          });

          if (response.ok) {
            const data = await response.json();
            setServerMessageCount(data.count || 0);

            // If guest has already sent 1 message, lock the chat
            if (data.count >= 1) {
              setIsChatLocked(true);
            }
          }
        } catch (error) {
          console.error("Error checking message count:", error);
        }
      }
    };

    checkMessageCount();
  }, [isFreeUser, noUser, isPremiumUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Security monitoring removed - server-side validation is more secure and prevents infinite loops

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPopover = (index: number) => {
    const btn = btnRefs.current[index];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const GAP = 8;
    const PANEL_W = 320;
    const vw = window.innerWidth;

    const left = Math.max(8, Math.min(rect.left, vw - PANEL_W - 8));
    const top = rect.bottom + GAP;

    setPos({ top, left });
    setOpenIndex(index);
  };

  const popoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      const target = e.target as Node;
      const clickedButton = btnRefs.current.some(
        (b) => b && b.contains(target)
      );
      if (!clickedButton && !popoverRef.current.contains(target)) {
        setOpenIndex(null);
      }
    };
    if (openIndex !== null) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openIndex]);

  const handleDescriptionClick = (value: string) => {
    setText(value);
    setOpenIndex(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleSendMessage = async () => {
    if (!text.trim() || isLoading) return;

    // Allow guests to send 1 message, then show login modal
    // No need to block them immediately

    // Check if free user has exceeded their limit using server count
    const currentMessageCount =
      serverMessageCount + messages.filter((m) => m.type === "user").length;
    if (isFreeUser && !isPremiumUser && currentMessageCount >= 1) {
      setShowUpgradeModal(true);
      return;
    }

    // Check if guest has exceeded their limit (after 1 message)
    if (noUser && currentMessageCount >= 1) {
      setShowLoginModal(true);
      return;
    }

    // Log learning activity start
    const attemptId = `learning_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await ActivityLogger.learningStarted(attemptId);

    // Check if chat is locked
    if (isChatLocked) {
      return;
    }

    // Additional security check - prevent bypassing via DOM manipulation
    if ((isFreeUser || noUser) && !isPremiumUser) {
      if (currentMessageCount >= 1) {
        if (noUser) {
          setShowLoginModal(true);
        } else if (isFreeUser) {
          setShowUpgradeModal(true);
        }
        setIsChatLocked(true);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setIsLoading(true);
    setIsInConversation(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            targetCLB: userContext.targetCLB || "Not specified",
            currentScores: userContext.mockScores
              ? `L:${userContext.mockScores.listening || "N/A"} R:${
                  userContext.mockScores.reading || "N/A"
                } W:${userContext.mockScores.writing || "N/A"} S:${
                  userContext.mockScores.speaking || "N/A"
                }`
              : "Not available",
            scoreSource: userContext.scoreSource || "Not available",
            answerCounts: userContext.answerCounts
              ? `Writing: ${userContext.answerCounts.writing || 0}, Speaking: ${
                  userContext.answerCounts.speaking || 0
                }, Listening: ${
                  userContext.answerCounts.listening || 0
                }, Reading: ${userContext.answerCounts.reading || 0}`
              : "No answers available",
            weakAreas: userContext.weakAreas?.join(", ") || "Not identified",
            practiceHistory: userContext.practiceHistory
              ? `${
                  userContext.practiceHistory.totalPractices
                } practices, avg: ${
                  userContext.practiceHistory.averageScore || "N/A"
                }`
              : "Not available",
          },
          conversationHistory: messages, // Send all previous messages for context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.upgradeRequired) {
          if (noUser) {
            setShowLoginModal(true);
          } else if (isFreeUser) {
            setShowUpgradeModal(true);
          }
          setIsChatLocked(true);
          throw new Error("Upgrade required");
        }
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log AI feedback generation
      await ActivityLogger.aiFeedbackGenerated(
        "learning",
        undefined,
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0,
        attemptId
      );

      // Lock chat for free users/guests after first response and refresh server count
      if ((isFreeUser || noUser) && !isPremiumUser) {
        setIsChatLocked(true);
        // Refresh server message count
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear message count when user becomes premium
  useEffect(() => {
    if (isPremiumUser) {
      setServerMessageCount(0);
      setIsChatLocked(false);
    }
  }, [isPremiumUser]);

  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      {/* Modals */}
      {showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />}
      {showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />}
      <MedalModal />
      <TaskCompletionModal />

      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto  justify-center ">
          <div className="flex max-w-[1200px] mx-auto z-[1]  text-center">
            <div className="flex gap-[48px] w-full">
              <div className="w-full">
                <div className="flex items-center gap-[24px] mt-[24px]">
                  <SvgBronz96 />
                  <SvgSilver80 />
                  <SvgGold80 />
                </div>

                <div className="mt-[24px] flex">
                  <span className="text-[18px] text-[#212E42] font-semibold leading-[28px]">
                    ‌Bronze League
                  </span>
                </div>
                <div className="flex mt-[12px] ">
                  <span className="text-[14px] text-[#37465C] font-semibold text-justify">
                    Unlock this league by completing the tasks and earning
                    trophies along the way!
                  </span>
                </div>

                {/* Only show Get Trophy button if user is not in any league yet and has points */}
                {!currentLeague && (leagueData?.userPoints || 0) > 0 && (
                  <div
                    className="mt-[12px] flex items-center justify-center h-[40px] max-w-[136px] bg-[#4A7DFF] gap-[8px] flex-items-center rounded-[24px] cursor-pointer hover:bg-[#3B6BFF] transition-colors"
                    onClick={handleGetTrophy}
                  >
                    <span className="text-white">+</span>
                    <span className="text-[16px] font-normal text-white">
                      Get trophy
                    </span>
                  </div>
                )}

                {/* Show message for users with 0 points */}
                {!currentLeague && (leagueData?.userPoints || 0) === 0 && (
                  <div className="mt-[12px] p-[16px] bg-[#FEF3C7] border border-[#F59E0B] rounded-[8px]">
                    <p className="text-[14px] text-[#92400E] text-center">
                      You need to earn points by practicing to join a league. Complete some tasks to get started!
                    </p>
                  </div>
                )}


                {/* League Table */}
                <div className="mt-[24px]">
                  <LeagueTableComponent />
                </div>
              </div>

              <div className="w-full mt-[40px] max-w-[522px]">
                <div className="border gap-[16px]  px-[16px] flex items-center rounded-[8px] justify-center border-[#0DAA94] bg-[#F0FFFD] h-[50px] text-[#0DAA94] text-[14px] font-medium leading-[24px]">
                  <SvgLeagueKados />
                  Users in the Gold League will enter a raffle for a $100 gift
                  card.
                </div>

                <div className="mt-[24px] text-[18px] text-[#212E42] font-semibold leading-[28px]">
                  League Focus Trophies & Tasks Requirement to Enter
                </div>

                <div className="min-h-[232px] rounded-[12px] p-[16px] bg-white mt-[24px]">
                  <div className="flex justify-between">
                    <div className="flex gap-[6px] items-center">
                      <Bronz40 />
                      <span className="text-[16px] text-[#212E42] font-semibold">
                        Bronz League
                      </span>
                      {currentLeague?.type === "bronze" && (
                        <span className="bg-[#10B981] text-white px-[8px] py-[2px] rounded-[4px] text-[12px] font-medium">
                          Current League
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-[12px]">
                      <div className="text-[14px]">
                        <span className="text-[#76808F]">Requirement: </span>
                        <span
                          className={
                            checkLeagueRequirements("bronze")
                              ? "text-[#10B981]"
                              : "text-[#F59E0B]"
                          }
                        >
                          1+ trophy
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-[24px] items-center flex gap-[16px]">
                    <span className="text-[14px] text-[#76808F ]">
                      Progress
                    </span>
                    <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
                      <div
                        className="absolute left-0 bg-[#F26B3E] h-[12px] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            ((leagueData?.userPoints || 0) / 50) * 50
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex gap-[4px] items-center shrink-0">
                      <Silver24 />
                      <span className=" text-[14px]">Silver League</span>
                    </div>
                  </div>
                  <div className="mt-[24px] flex flex-col gap-[8px]">
                    {renderLeagueTasks("bronze", [
                      "1 Mock Exam Completed",
                      "4 Skills Tried (L, R, W, S)",
                      "1 Writing or Speaking with AI Feedback",
                    ])}
                  </div>
                </div>

                {/* Only show Silver League if user is not in Bronze or Gold League */}
                {currentLeague?.type !== "bronze" &&
                  currentLeague?.type !== "gold" && (
                    <div className="min-h-[232px] rounded-[12px] mt-[24px] p-[16px] bg-white">
                      <div className="flex justify-between">
                        <div className="flex gap-[6px] items-center">
                          <Silver40 />
                          <span className="text-[16px] text-[#212E42] font-semibold">
                            Silver League
                          </span>
                          {currentLeague?.type === "silver" && (
                            <span className="bg-[#10B981] text-white px-[8px] py-[2px] rounded-[4px] text-[12px] font-medium">
                              Current League
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <div className="text-[14px]">
                            <span className="text-[#76808F]">
                              Requirement:{" "}
                            </span>
                            <span
                              className={
                                checkLeagueRequirements("silver")
                                  ? "text-[#10B981]"
                                  : "text-[#F59E0B]"
                              }
                            >
                              2+ trophy
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-[24px] items-center flex gap-[16px]">
                        <span className="text-[14px] text-[#76808F ]">
                          Progress
                        </span>
                        <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
                          <div
                            className="absolute left-0 bg-[#F26B3E] h-[12px] rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((leagueData?.userPoints || 0) - 50) / 50
                                ) * 50
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex gap-[4px] items-center shrink-0">
                          <Gold24 />
                          <span className="text-[14px]">Gold League</span>
                        </div>
                      </div>
                      <div className="mt-[24px] flex flex-col gap-[8px]">
                        {renderLeagueTasks("silver", [
                          "5 Mock Exams Completed",
                          "+1 CLB Improvement (any skill)",
                          "3 Writing with Feedback",
                          "3 Speaking with Feedback",
                        ])}
                      </div>
                    </div>
                  )}

                {/* Only show Gold League if user is not in Bronze or Silver League */}
                {currentLeague?.type !== "bronze" &&
                  currentLeague?.type !== "silver" && (
                    <div className="min-h-[232px] rounded-[12px] mt-[24px] p-[16px] bg-white">
                      <div className="flex justify-between">
                        <div className="flex gap-[6px] items-center">
                          <Gold40 />
                          <span className="text-[16px] text-[#212E42] font-semibold">
                            Gold League
                          </span>
                          {currentLeague?.type === "gold" && (
                            <span className="bg-[#10B981] text-white px-[8px] py-[2px] rounded-[4px] text-[12px] font-medium">
                              Current League
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <div className="text-[14px]">
                            <span className="text-[#76808F]">
                              Requirement:{" "}
                            </span>
                            <span
                              className={
                                checkLeagueRequirements("gold")
                                  ? "text-[#10B981]"
                                  : "text-[#F59E0B]"
                              }
                            >
                              3+ trophy
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-[24px] items-center flex gap-[16px]">
                        <span className="text-[14px] text-[#76808F ]">
                          Progress
                        </span>
                        <div className="w-full relative bg-[#E6E6E6] h-[12px] rounded-[16px]">
                          <div
                            className="absolute left-0 bg-[#F26B3E] h-[12px] rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((leagueData?.userPoints || 0) - 100) / 50
                                ) * 50
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex gap-[4px] items-center shrink-0">
                          <SvgLeagueKados24 />
                          <span className="text-[#212E42] font-medium text-[14px]">
                            100$ Gift Card
                          </span>
                        </div>
                      </div>
                      <div className="mt-[24px] flex flex-col gap-[8px]">
                        {renderLeagueTasks("gold", [
                          "10 Mock Exams Completed",
                          "Practice 3x/Week (4 Weeks)",
                          "1 Friend Referred (paid plan)",
                        ])}

                        {/* CELPIP Champion special section for Gold League */}
                        <div className="flex flex-col gap-[8px] mt-[16px]">
                          <div className="flex gap-[8px]">
                            <CircleCheck />
                            <span className="text-[#F27059] text-[14px]">
                              CELPIP Champion:{" "}
                            </span>
                          </div>

                          <div className="flex flex-col gap-[8px]">
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" /> 10 mocks
                            </div>
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" /> +2 CLB in
                              1 skill
                            </div>
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" /> 5 Writing
                            </div>
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" /> + 5
                              Speaking improved
                            </div>
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" />
                              all skills practiced
                            </div>
                            <div className="flex gap-[8px]">
                              <SvgCheck className="text-[#979EA8]" />1 referral
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Page;
