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
import SvgGold96 from "@/components/icons/Gold96";
import SvgSilver80 from "@/components/icons/Silver80";
import SvgSilver96 from "@/components/icons/Silver96";
import { useRouter, usePathname } from "next/navigation";
import SvgBronz80 from "@/components/icons/Bronz80";

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
  type: "points" | "task" | "promotion" | "demotion";
  title: string;
  message?: string;
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
  pointsBreakdown?: any;
  tasksCompleted?: string[];
  skillsTried?: string[];
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
  const [sampleGroupsByType, setSampleGroupsByType] = useState<Record<string, any>>({});
  const [selectedLeague, setSelectedLeague] = useState<"bronze" | "silver" | "gold">("bronze");

  // Check if user is free or premium
  const isFreeUser = user?.publicMetadata?.plan === "free";
  const isPremiumUser = user?.publicMetadata?.plan === "premium";
  const noUser = isLoaded ? !isSignedIn : false;

  // Fetch league data from API
  const fetchLeagueData = async () => {
    try {
      setIsLoadingLeague(true);

      const response = await fetch("/api/league");
      const data = await response.json();
      
      console.log("League API response:", data);
      console.log("User signed in:", isSignedIn);
      console.log("User ID:", user?.id);
      console.log("Debug info:", data.debug);

      if (response.ok) {
        setCurrentLeague(data.currentLeague || (data.sampleLeagueType ? { type: data.sampleLeagueType } : null));
        setUserGroup(data.userGroup || null);
        setAllLeagues(data.leagues || []);
        setSampleGroupsByType(data.sampleGroupsByType || {});

        // Default selected league: user's current league if present else bronze
        const defaultSelected = (data.currentLeague?.type || data.sampleLeagueType || "bronze") as any;
        setSelectedLeague(defaultSelected);

        const baseGroup = data.userGroup || data.sampleGroup || data.sampleGroupsByType?.[selectedLeague] || null;
        if (baseGroup) {
          // User is in a league group
          const users = baseGroup.users.map((u: any) => {
            const isMe = u.userId === user?.id;
            const emailLocal = (u.email || "").split("@")[0] || "";
            const emailShort = emailLocal ? emailLocal.slice(0, 3) : "";
            const apiName = (u.name || "").trim();
            const myFullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
            const displayName = isMe
              ? (myFullName || emailShort || "User")
              : (apiName || emailShort || "User");

            return {
              id: u.userId,
              name: displayName,
              email: u.email,
              points: u.points,
              league: (data.currentLeague?.type || data.sampleLeagueType || selectedLeague || "bronze") as any,
              position: u.position,
              tasksCompleted: data.userPoints?.tasksCompleted || [],
              isCurrentUser: isMe,
            };
          });

          // Do not append current user to sample groups; preview should not modify membership

          const tasks =
            (data.currentLeague?.requirements?.tasks || (data.leagues?.find((l: any) => l.type === (data.currentLeague?.type || data.sampleLeagueType || selectedLeague || "bronze"))?.requirements?.tasks) || []).map((task: any) => ({
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
            currentLeague: (data.currentLeague?.type || data.sampleLeagueType || selectedLeague || "bronze") as any,
            seasonEndDate: new Date(data.currentSeason?.endDate),
            userPoints: data.userPoints?.totalPoints || 0,
            pointsBreakdown: data.pointsBreakdown || {},
            tasksCompleted: data.tasksCompleted || [],
            skillsTried: data.skillsTried || [],
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
            pointsBreakdown: data.pointsBreakdown || {},
            tasksCompleted: data.tasksCompleted || [],
            skillsTried: data.skillsTried || [],
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
    if (isLoaded) {
      fetchLeagueData();
    }
  }, [isLoaded, user?.id]);

  // Recompute league view when selectedLeague changes
  useEffect(() => {
    if (!allLeagues || Object.keys(allLeagues).length === 0) return;
    // Use user's group only if it matches the selectedLeague; otherwise use sample
    const selectedType = selectedLeague;
    // Always prefer the most-populated sample group for browsing; fall back to user's group only if no sample
    const baseGroup = sampleGroupsByType?.[selectedType] || (currentLeague?.type === selectedType ? userGroup : null);

    if (!baseGroup && !leagueData) return; // nothing to show yet

    const mappedUsers = baseGroup
      ? baseGroup.users.map((u: any) => {
          const isMe = u.userId === user?.id;
          const emailLocal = (u.email || "").split("@")[0] || "";
          const emailShort = emailLocal ? emailLocal.slice(0, 3) : "";
          const apiName = (u.name || "").trim();
          const myFullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
          const displayName = isMe
            ? (myFullName || emailShort || "User")
            : (apiName || emailShort || "User");

          return {
            id: u.userId,
            name: displayName,
            email: u.email,
            points: u.points,
            league: selectedType as any,
            position: u.position,
            tasksCompleted: leagueData?.tasksCompleted || [],
            isCurrentUser: isMe,
          };
        })
      : [];

    // Do not append current user when previewing other leagues

    const tasks = (allLeagues.find((l: any) => l.type === selectedType)?.requirements?.tasks || []).map(
      (task: any) => ({
        id: task.id,
        title: task.title,
        points: task.points,
        completed: (leagueData?.tasksCompleted || []).includes(task.id) || false,
        description: task.description,
      })
    );

    setLeagueData((prev) => ({
      users: mappedUsers,
      tasks,
      currentLeague: selectedType as any,
      seasonEndDate: prev?.seasonEndDate || new Date(),
      userPoints: prev?.userPoints || 0,
      pointsBreakdown: prev?.pointsBreakdown || {},
      tasksCompleted: prev?.tasksCompleted || [],
      skillsTried: prev?.skillsTried || [],
    }));
  }, [selectedLeague, userGroup, currentLeague, sampleGroupsByType, allLeagues, user?.id]);

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
        const result = await response.json();
        
        // Show appropriate modal based on league change
        if (result.leagueChanged) {
          if (result.action === "promoted") {
            setMedalData({
              type: "promotion",
              title: "League Promotion! 🎉",
              message: `Congratulations! You've been promoted from ${result.previousLeague?.toUpperCase()} to ${result.newLeague?.toUpperCase()} League!`,
              points,
              timeSpent,
            });
          } else if (result.action === "demoted") {
            if (result.newLeague) {
              setMedalData({
                type: "demotion",
                title: "League Demotion 📉",
                message: `You've been demoted from ${result.previousLeague?.toUpperCase()} to ${result.newLeague?.toUpperCase()} League. Keep practicing to get back up!`,
                points,
                timeSpent,
              });
            } else {
              setMedalData({
                type: "demotion",
                title: "Removed from League 😔",
                message: `You've been removed from all leagues. Earn more points to rejoin!`,
                points,
                timeSpent,
              });
            }
          }
        } else {
          setMedalData({
            type: "points",
            title: "Points Earned!",
            points,
            timeSpent,
          });
        }
        
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
        completed: leagueData?.userPoints && leagueData.userPoints > 0
          ? isTaskCompleted(task.title, leagueType)
          : false,
        description: task.description,
      })) || []
    );
  };

  // Check if a task is completed based on user data
  const isTaskCompleted = (taskTitle: string, leagueType: string) => {
    if (!leagueData) return false;

    // If user has no points at all, no tasks should be completed
    if (leagueData.userPoints === 0) return false;

    console.log("Checking task completion:", { taskTitle, leagueType, userPoints: leagueData.userPoints, skillsTried: leagueData.skillsTried });

    // Get user's points breakdown from leagueData
    const pointsBreakdown = leagueData.pointsBreakdown || {};
    const tasksCompleted = leagueData.tasksCompleted || [];

    // Mock exam completion check
    if (taskTitle.includes("Mock Exam")) {
      const requiredCount = parseInt(taskTitle.match(/\d+/)?.[0] || "1");
      // Check if user has completed enough mock exams (20 points each)
      const mockExamPoints = pointsBreakdown.mockExams || 0;
      const completedMockExams = Math.floor(mockExamPoints / 20);
      return completedMockExams >= requiredCount;
    }

    // Skills tried check - check if user has tried all 4 skills
    if (taskTitle.includes("Skills Tried") && taskTitle.includes("(L, R, W, S)")) {
      // Check if user has completed practice sessions in all 4 skills
      const skillsTried = leagueData.skillsTried || [];
      const requiredSkills = ["Listening", "Reading", "Writing", "Speaking"];
      const completedSkills = requiredSkills.filter(skill => skillsTried.includes(skill));
      console.log("Skills Tried check:", { skillsTried, requiredSkills, completedSkills, completed: completedSkills.length >= 4 });
      return completedSkills.length >= 4;
    }

    // Individual skill checks - only for specific skill tasks, not the general "Skills Tried" task
    if (taskTitle.includes("Listening") && !taskTitle.includes("Skills Tried")) {
      const skillsTried = leagueData.skillsTried || [];
      console.log("Listening skill check:", { skillsTried, hasListening: skillsTried.includes("Listening") });
      return skillsTried.includes("Listening");
    }

    if (taskTitle.includes("Reading") && !taskTitle.includes("Skills Tried")) {
      const skillsTried = leagueData.skillsTried || [];
      console.log("Reading skill check:", { skillsTried, hasReading: skillsTried.includes("Reading") });
      return skillsTried.includes("Reading");
    }

    if (taskTitle.includes("Writing") && !taskTitle.includes("Skills Tried")) {
      const skillsTried = leagueData.skillsTried || [];
      console.log("Writing skill check:", { skillsTried, hasWriting: skillsTried.includes("Writing") });
      return skillsTried.includes("Writing");
    }

    if (taskTitle.includes("Speaking") && !taskTitle.includes("Skills Tried")) {
      const skillsTried = leagueData.skillsTried || [];
      console.log("Speaking skill check:", { skillsTried, hasSpeaking: skillsTried.includes("Speaking") });
      return skillsTried.includes("Speaking");
    }

    // AI Feedback check
    if (taskTitle.includes("AI Feedback")) {
      const aiFeedbackPoints = pointsBreakdown.aiFeedback || 0;
      return aiFeedbackPoints >= 5; // At least 5 points means they got AI feedback
    }

    // Writing/Speaking with Feedback check
    if (
      taskTitle.includes("Writing with Feedback") ||
      taskTitle.includes("Speaking with Feedback")
    ) {
      const requiredCount = parseInt(taskTitle.match(/\d+/)?.[0] || "1");
      const aiFeedbackPoints = pointsBreakdown.aiFeedback || 0;
      return aiFeedbackPoints >= requiredCount * 5; // 5 points per feedback
    }

    // CLB Improvement check
    if (taskTitle.includes("CLB Improvement")) {
      // This would need to be tracked separately in user scores
      // For now, check if user has significant points
      return leagueData.userPoints >= 50;
    }

    // Practice frequency check
    if (taskTitle.includes("Practice 3x/Week")) {
      const practicePoints = pointsBreakdown.practiceSessions || 0;
      return practicePoints >= 100; // 100 points for consistent practice
    }

    // Referral check
    if (taskTitle.includes("Friend Referred")) {
      // This would need to be tracked separately
      return leagueData.userPoints >= 80;
    }

    return false;
  };

  // Render skills tried task with progressive completion
  const renderSkillsTriedTask = (task: string) => {
    if (!task.includes("Skills Tried") || !task.includes("(L, R, W, S)")) {
      // Regular task
      const completed = leagueData?.userPoints && leagueData.userPoints > 0 
        ? isTaskCompleted(task, currentLeague?.type || "bronze") 
        : false;
      return (
        <div className="flex gap-[8px]">
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
    }

    // Skills Tried task with progressive completion
    const skillsTried = leagueData?.skillsTried || [];
    const requiredSkills = ["Listening", "Reading", "Writing", "Speaking"];
    const completedSkills = requiredSkills.filter(skill => skillsTried.includes(skill));
    const allCompleted = completedSkills.length >= 4;

    console.log("Skills Tried task rendering:", { 
      skillsTried, 
      requiredSkills, 
      completedSkills, 
      allCompleted,
      leagueData: leagueData?.skillsTried 
    });

    // Create progressive text
    const baseText = "4 Skills Tried (";
    const skillLetters = ["L", "R", "W", "S"];
    const skillNames = ["Listening", "Reading", "Writing", "Speaking"];
    
    const progressiveText = baseText + skillLetters.map((letter, index) => {
      const skillName = skillNames[index];
      const isCompleted = skillsTried.includes(skillName);
      console.log(`Skill ${skillName} (${letter}):`, { isCompleted, skillsTried });
      return isCompleted ? `<span class="text-[#10B981]">${letter}</span>` : letter;
    }).join(", ") + ")";

      return (
      <div className="flex gap-[8px]">
        <div className={allCompleted ? "text-[#10B981]" : "text-[#979EA8]"}>
            <CircleCheck />
          </div>
          <span
            className={`text-[14px] ${
            allCompleted ? "text-[#10B981]" : "text-[#37465C]"
            }`}
          dangerouslySetInnerHTML={{ __html: progressiveText }}
        />
        </div>
      );
  };

  // Render tasks for a specific league
  const renderLeagueTasks = (leagueType: string, staticTasks: any[]) => {
    // Always show static tasks with completion status for now
    // TODO: Implement dynamic tasks from API later
    return staticTasks.map((task, index) => (
      <div key={index}>
        {renderSkillsTriedTask(task)}
      </div>
    ));
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
    let safeZone: number;

    switch (currentLeague) {
      case "bronze":
        // Bronze: Entry level - can only promote up, no demotion
        promotionZone = Math.ceil(totalUsers * 0.3); // Top 30% promote to Silver
        demotionZone = 0; // No demotion from Bronze (lowest league)
        safeZone = totalUsers - promotionZone; // Remaining 70% stay in Bronze
        break;
      case "silver":
        // Silver: Middle tier - can promote to Gold or demote to Bronze
        promotionZone = Math.ceil(totalUsers * 0.25); // Top 25% promote to Gold
        demotionZone = Math.floor(totalUsers * 0.3); // Bottom 30% demote to Bronze
        safeZone = totalUsers - promotionZone - demotionZone; // Middle 45% stay in Silver
        break;
      case "gold":
        // Gold: Highest tier - no promotion, staying is winning!
        promotionZone = 0; // No promotion from Gold (highest league)
        demotionZone = Math.floor(totalUsers * 0.4); // Bottom 40% demote to Silver
        safeZone = totalUsers - demotionZone; // Top 60% stay in Gold (winners!)
        break;
    }

    return sortedUsers.map((user, index) => {
      let newLeague = user.league;
      let status = "safe";

      if (index < promotionZone && currentLeague !== "gold") {
        // Promotion zone
        newLeague = currentLeague === "bronze" ? "silver" : "gold";
        status = "promoted";
      } else if (
        index >= totalUsers - demotionZone &&
        currentLeague !== "bronze"
      ) {
        // Demotion zone
        newLeague = currentLeague === "gold" ? "silver" : "bronze";
        status = "demoted";
      } else {
        // Safe zone - stay in current league
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

  // Empty State Component - Shows placeholder table when user has no points
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
      <div className="mb-[16px] p-[12px] md:p-[16px] bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px]">
          <div className="flex-1">
            <h3 className="text-[14px] md:text-[16px] font-semibold text-[#212E42]">
              {leagueData.currentLeague.charAt(0).toUpperCase() +
                leagueData.currentLeague.slice(1)}{" "}
              League
            </h3>
            <p className="text-[12px] md:text-[14px] text-[#64748B]">
              Season ends in {daysLeft} days, {hoursLeft} hours
            </p>
          </div>
          <div className="text-right">
            <div className="text-[20px] md:text-[24px] font-bold text-[#4A7DFF]">
              {leagueData.userPoints}
            </div>
            <div className="text-[10px] md:text-[12px] text-[#64748B]">Your Points</div>
          </div>
        </div>
      </div>
    );
  };

  // League Table Component
  const LeagueTableComponent = () => {
    if (isLoadingLeague) return <SkeletonLoadingComponent />;
    if (!leagueData) return noUser ? <SkeletonLoadingComponent /> : <EmptyStateComponent />;
    
    // If user has points and is in a league, show league table
    if (currentLeague && userGroup && leagueData.users.length > 0) {
      const sortedUsers = [...leagueData.users].sort((a, b) => b.points - a.points);
      const totalUsers = sortedUsers.length;
      
      // Calculate zones based on current league
      let promotionZone: number;
      let demotionZone: number;
      let safeZone: number;

      switch (currentLeague.type) {
        case "bronze":
          promotionZone = Math.ceil(totalUsers * 0.3); // Top 30% promote to Silver
          demotionZone = 0; // No demotion from Bronze
          safeZone = totalUsers - promotionZone; // Remaining 70% stay in Bronze
          break;
        case "silver":
          promotionZone = Math.ceil(totalUsers * 0.25); // Top 25% promote to Gold
          demotionZone = Math.floor(totalUsers * 0.3); // Bottom 30% demote to Bronze
          safeZone = totalUsers - promotionZone - demotionZone; // Middle 45% stay in Silver
          break;
        case "gold":
          promotionZone = 0; // No promotion from Gold
          demotionZone = Math.floor(totalUsers * 0.4); // Bottom 40% demote to Silver
          safeZone = totalUsers - demotionZone; // Top 60% stay in Gold
          break;
        default:
          promotionZone = 0;
          demotionZone = 0;
          safeZone = totalUsers;
      }

      return (
        <div className="min-h-[529px] bg-white border border-[#E0E7FF] rounded-[12px] p-[16px] md:p-[24px]">
          <LeagueStatusComponent />
          <div className="space-y-[16px] overflow-x-auto">
            {/* Show all users in the group, sorted by points */}
            {sortedUsers.map((groupUser, index) => {
              // Determine zone for this user
              let zoneClass = "";
              let zoneIndicator = "";
              
              if (index < promotionZone && currentLeague.type !== "gold") {
                // Promotion zone - Green
                zoneClass = "bg-green-50 border-l-4 border-green-500";
                zoneIndicator = "bg-green-500";
              } else if (index >= totalUsers - demotionZone && currentLeague.type !== "bronze") {
                // Demotion zone - Red
                zoneClass = "bg-red-50 border-l-4 border-red-500";
                zoneIndicator = "bg-red-500";
              } else {
                // Safe zone - Gray
                zoneClass = "bg-gray-50 border-l-4 border-gray-300";
                zoneIndicator = "bg-gray-400";
              }

              return (
                <div
                  key={`user-${groupUser.id || 'unknown'}-${index}-${groupUser.points || 0}`}
                  className={`flex items-center gap-[12px] md:gap-[16px] py-[8px] ${zoneClass} ${
                    groupUser.isCurrentUser
                      ? "bg-[#FED7AA] rounded-[8px] p-[8px] md:p-[12px]"
                      : "rounded-[8px] p-[8px] md:p-[12px]"
                  }`}
                >
                  <div className={`w-[8px] h-[8px] ${zoneIndicator} rounded-full`}></div>
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
                  <div className=" min-w-0">
                  {groupUser.name || (groupUser as any).email?.split("@")[0] || "User"}
                  </div>
                  <div className="flex-1 text-[#374151] text-right font-medium text-[14px] md:text-[16px] whitespace-nowrap">
                    {groupUser.points} XP
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // If there are users from sample group, render them as table even if current user has 0 points
    if (leagueData.users && leagueData.users.length > 0) {
      const sortedUsers = [...leagueData.users].sort((a, b) => b.points - a.points);
      const totalUsers = sortedUsers.length;

      const leagueType = (currentLeague?.type || leagueData.currentLeague || "bronze") as any;

      let promotionZone = 0;
      let demotionZone = 0;
      switch (leagueType) {
        case "bronze":
          promotionZone = Math.ceil(totalUsers * 0.3);
          demotionZone = 0;
          break;
        case "silver":
          promotionZone = Math.ceil(totalUsers * 0.25);
          demotionZone = Math.floor(totalUsers * 0.3);
          break;
        case "gold":
          promotionZone = 0;
          demotionZone = Math.floor(totalUsers * 0.4);
          break;
      }

      return (
        <div className="min-h-[529px] bg-white border border-[#E0E7FF] rounded-[12px] p-[16px] md:p-[24px]">
          <LeagueStatusComponent />
          <div className="space-y-[16px] overflow-x-auto">
            {sortedUsers.map((groupUser, index) => {
              let zoneClass = "";
              let zoneIndicator = "";
              if (index < promotionZone && leagueType !== "gold") {
                zoneClass = "bg-green-50 border-l-4 border-green-500";
                zoneIndicator = "bg-green-500";
              } else if (index >= totalUsers - demotionZone && leagueType !== "bronze") {
                zoneClass = "bg-red-50 border-l-4 border-red-500";
                zoneIndicator = "bg-red-500";
              } else {
                zoneClass = "bg-gray-50 border-l-4 border-gray-300";
                zoneIndicator = "bg-gray-400";
              }

              return (
                <div
                  key={`user-${groupUser.id || 'unknown'}-${index}-${groupUser.points || 0}`}
                  className={`flex items-center gap-[12px] md:gap-[16px] py-[8px] ${zoneClass} ${
                    groupUser.isCurrentUser
                      ? "bg-[#FED7AA] rounded-[8px] p-[8px] md:p-[12px]"
                      : "rounded-[8px] p-[8px] md:p-[12px]"
                  }`}
                >
                  <div className={`w-[8px] h-[8px] ${zoneIndicator} rounded-full`}></div>
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
                  <div className=" min-w-0">
                    <div className="text-[#374151] font-medium text-[14px] md:text-[16px] truncate">
                      {groupUser.name || (groupUser as any).email?.split("@")[0] || "User"}
                    </div>
                  </div>
                  <div className="flex-1 text-[#374151] text-right font-medium text-[14px] md:text-[16px] whitespace-nowrap">
                    {groupUser.points} XP
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // If user has no points and no sample users, show empty state (or skeleton for guests handled above)
    return <EmptyStateComponent />;
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
            <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center mx-auto mb-[16px] ${
              medalData.type === "promotion" ? "bg-[#10B981]" :
              medalData.type === "demotion" ? "bg-[#EF4444]" :
              "bg-[#FED7AA]"
            }`}>
              <span className="text-[32px]">
                {medalData.type === "promotion" ? "🎉" :
                 medalData.type === "demotion" ? "📉" :
                 "🏆"}
              </span>
            </div>
            <h3 className="text-[24px] font-bold text-[#212E42] mb-[8px]">
              {medalData.title}
            </h3>
            {medalData.message && (
              <p className="text-[16px] text-[#37465C] mb-[8px]">
                {medalData.message}
              </p>
            )}
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
        "Can you give me a sample answer for \"Describe a place you visited\"?",
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
        "\tWhat strategies help answer \"fill in the blank\" questions faster?",
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

  // Show only loading if still loading
  if (isLoadingLeague) {
    return (
      <section className="relative w-full transition-all duration-300 overflow-hidden">
        {/* Modals */}
        {showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />}
        {showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />}
        <MedalModal />
        <TaskCompletionModal />

        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto justify-center">
            <div className="flex max-w-[1200px] mx-auto z-[1] text-center px-4">
              <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[48px] w-full">
                <div className="w-full lg:w-1/2">
                  <div className="flex items-center justify-center lg:justify-start gap-[16px] md:gap-[24px] mt-[24px]">
                    {currentLeague?.type === "gold" ? (
                      <>
                        <SvgBronz80 />
                        <SvgSilver80 />
                        <SvgGold96 />
                      </>
                    ) : currentLeague?.type === "silver" ? (
                      <>
                        <SvgBronz80 />
                        <SvgSilver96 />
                        <SvgGold80 />
                      </>
                    ) : (
                      <>
                    <SvgBronz96 />
                    <SvgSilver80 />
                    <SvgGold80 />
                      </>
                    )}
                  </div>

                  <div className="mt-[24px] flex justify-center lg:justify-start">
                    <span className="text-[16px] md:text-[18px] text-[#212E42] font-semibold leading-[24px] md:leading-[28px]">
                      {currentLeague?.type === "gold" ? "Gold League" : 
                       currentLeague?.type === "silver" ? "Silver League" : 
                       "Bronze League"}
                    </span>
                  </div>
                  <div className="flex mt-[12px] justify-center lg:justify-start">
                    <span className="text-[12px] md:text-[14px] text-[#37465C] font-semibold text-center lg:text-left">
                      {currentLeague?.type === "gold" ? 
                        "Elite league with gift card rewards! Compete with the best players and stay on top!" :
                       currentLeague?.type === "silver" ? 
                        "Intermediate league for experienced players. Work hard to reach the Gold League!" :
                       "Unlock this league by completing the tasks and earning trophies along the way!"}
                    </span>
                  </div>

                  {/* League Table - Loading */}
                  <div className="mt-[24px]">
                    <SkeletonLoadingComponent />
                  </div>
                </div>

                <div className="w-full lg:w-1/2 mt-[24px] lg:mt-[40px]">
                  <div className="border gap-[16px] px-[16px] flex items-center rounded-[8px] justify-center border-[#0DAA94] bg-[#F0FFFD] h-[50px] text-[#0DAA94] text-[14px] font-medium leading-[24px]">
                    <SvgLeagueKados />
                    Users in the Gold League will enter a raffle for a $100 gift
                    card.
                  </div>

                  <div className="mt-[24px] text-[18px] text-[#212E42] font-semibold leading-[28px]">
                    League Focus Trophies & Tasks Requirement to Enter
                  </div>

                  {/* Loading skeleton for all leagues */}
                  <div className="min-h-[232px] rounded-[12px] p-[16px] bg-white mt-[24px] animate-pulse">
                    <div className="flex justify-between mb-[24px]">
                      <div className="flex gap-[6px] items-center">
                        <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded"></div>
                        <div className="w-[120px] h-[20px] bg-[#E5E7EB] rounded"></div>
                      </div>
                      <div className="w-[100px] h-[16px] bg-[#E5E7EB] rounded"></div>
                    </div>
                    <div className="space-y-[8px]">
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                    </div>
                  </div>

                  {/* Silver League Loading Skeleton */}
                  <div className="min-h-[232px] rounded-[12px] p-[16px] bg-white mt-[24px] animate-pulse">
                    <div className="flex justify-between mb-[24px]">
                      <div className="flex gap-[6px] items-center">
                        <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded"></div>
                        <div className="w-[120px] h-[20px] bg-[#E5E7EB] rounded"></div>
                      </div>
                      <div className="w-[100px] h-[16px] bg-[#E5E7EB] rounded"></div>
                    </div>
                    <div className="space-y-[8px]">
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                    </div>
                  </div>

                  {/* Gold League Loading Skeleton */}
                  <div className="min-h-[232px] rounded-[12px] p-[16px] bg-white mt-[24px] animate-pulse">
                    <div className="flex justify-between mb-[24px]">
                      <div className="flex gap-[6px] items-center">
                        <div className="w-[40px] h-[40px] bg-[#E5E7EB] rounded"></div>
                        <div className="w-[120px] h-[20px] bg-[#E5E7EB] rounded"></div>
                      </div>
                      <div className="w-[100px] h-[16px] bg-[#E5E7EB] rounded"></div>
                    </div>
                    <div className="space-y-[8px]">
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                      <div className="w-full h-[12px] bg-[#E5E7EB] rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full transition-all duration-300 overflow-hidden">
      {/* Modals */}
      {showUpgradeModal && <UpgradeModal setShowModal={setShowUpgradeModal} />}
      {showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />}
      <MedalModal />
      <TaskCompletionModal />

      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto  justify-center ">
          <div className="flex max-w-[1200px] mx-auto z-[1] text-center px-4">
            <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[48px] w-full">
              <div className="w-full lg:w-1/2">
                <div className="flex items-center justify-center lg:justify-start gap-[16px] md:gap-[24px] mt-[24px]">
                  {selectedLeague === "gold" ? (
                    <>
                      <span
                        className={`cursor-pointer ${currentLeague?.type && currentLeague.type !== "bronze" ? "" : ""}`}
                        onClick={() => {
                          // Allow switching to bronze only if user isn't in a higher league OR always allow preview for guests
                          if (!currentLeague || currentLeague.type === "bronze" || noUser) {
                            if (sampleGroupsByType?.bronze) setSelectedLeague("bronze");
                          }
                        }}
                      >
                        <SvgBronz80 />
                      </span>
                      <span
                        className="cursor-pointer"
                        onClick={() => { if (sampleGroupsByType?.silver) setSelectedLeague("silver"); }}
                      >
                        <SvgSilver80 />
                      </span>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.gold) setSelectedLeague("gold"); }}>
                        <SvgGold96 />
                      </span>
                    </>
                  ) : selectedLeague === "silver" ? (
                    <>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.bronze) setSelectedLeague("bronze"); }}>
                        <SvgBronz80 />
                      </span>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.silver) setSelectedLeague("silver"); }}>
                        <SvgSilver96 />
                      </span>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.gold) setSelectedLeague("gold"); }}>
                        <SvgGold80 />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.bronze) setSelectedLeague("bronze"); }}>
                        <SvgBronz96 />
                      </span>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.silver) setSelectedLeague("silver"); }}>
                        <SvgSilver80 />
                      </span>
                      <span className="cursor-pointer" onClick={() => { if (sampleGroupsByType?.gold) setSelectedLeague("gold"); }}>
                        <SvgGold80 />
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-[24px] flex justify-center lg:justify-start">
                  <span
                    className="text-[16px] md:text-[18px] text-[#212E42] font-semibold leading-[24px] md:leading-[28px] cursor-pointer"
                    onClick={() => {
                      // Clicking label cycles only through allowed leagues and only if a sample exists
                      const order = ["bronze", "silver", "gold"] as const;
                      const currentIdx = order.indexOf(selectedLeague);
                      for (let i = 1; i <= order.length; i++) {
                        const next = order[(currentIdx + i) % order.length];
                        // Allow preview of silver and gold as long as sample exists
                        if (sampleGroupsByType?.[next]) { setSelectedLeague(next as any); break; }
                      }
                    }}
                  >
                    {selectedLeague === "gold" ? "Gold League" : 
                     selectedLeague === "silver" ? "Silver League" : 
                     "Bronze League"}
                  </span>
                </div>
                <div className="flex mt-[12px] justify-center lg:justify-start">
                  <span className="text-[12px] md:text-[14px] text-[#37465C] font-semibold text-center lg:text-left">
                    {selectedLeague === "gold" ? 
                      "Elite league with gift card rewards! Compete with the best players and stay on top!" :
                     selectedLeague === "silver" ? 
                      "Intermediate league for experienced players. Work hard to reach the Gold League!" :
                     "Unlock this league by completing the tasks and earning trophies along the way!"}
                  </span>
                </div>

                {/* Show Get Trophy button only if user has no points yet */}
                {!currentLeague && (leagueData?.userPoints || 0) === 0 && (
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

              <div className="w-full lg:w-1/2 mt-[24px] lg:mt-[40px]">
                <div className="border gap-[16px]  px-[16px] flex items-center rounded-[8px] justify-center border-[#0DAA94] bg-[#F0FFFD] h-[50px] text-[#0DAA94] text-[14px] font-medium leading-[24px]">
                  <SvgLeagueKados />
                  Users in the Gold League will enter a raffle for a $100 gift
                  card.
                </div>

                <div className="mt-[24px] text-[16px] md:text-[18px] text-[#212E42] font-semibold leading-[24px] md:leading-[28px] text-center lg:text-left">
                  League Focus Trophies & Tasks Requirement to Enter
                </div>

                {/* Show Bronze League if user is in Bronze League or has no points yet */}
                {(
                <div className="min-h-[232px] rounded-[12px] p-[12px] md:p-[16px] bg-white mt-[24px] cursor-pointer" onClick={() => setSelectedLeague("bronze")}>
                  <div className="flex flex-col sm:flex-row justify-between gap-[8px] sm:gap-0">
                      <div className="flex gap-[6px] items-center">
                        <Bronz40 />
                        <span className="text-[14px] md:text-[16px] text-[#212E42] font-semibold">
                          Bronz League
                        </span>
                      </div>
                      <div className="flex items-center gap-[8px] sm:gap-[12px]">
                        <div className="text-[12px] md:text-[14px]">
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
                  <div className="mt-[24px] items-center flex flex-col sm:flex-row gap-[12px] sm:gap-[16px]">
                      <span className="text-[12px] md:text-[14px] text-[#76808F]">
                        Progress
                      </span>
                    <div className="w-full relative bg-[#E6E6E6] h-[10px] md:h-[12px] rounded-[16px]">
                        <div
                          className="absolute left-0 bg-[#F26B3E] h-[10px] md:h-[12px] rounded-full transition-all duration-300"
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
                        <span className="text-[12px] md:text-[14px]">Silver League</span>
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
                 )}

                {/* Show Silver League if user is in Silver League or has no points yet */}
                {(
                    <div className="min-h-[232px] rounded-[12px] mt-[24px] p-[16px] bg-white cursor-pointer" onClick={() => setSelectedLeague("silver")}>
                      <div className="flex justify-between">
                        <div className="flex gap-[6px] items-center">
                          <Silver40 />
                          <span className="text-[16px] text-[#212E42] font-semibold">
                            Silver League
                          </span>
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <div className="text-[14px]">
                            <span className="text-[#76808F]">
                              Requirement: {" "}
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

                {/* Show Gold League if user is in Gold League or has no points yet */}
                {(
                    <div className="min-h-[232px] rounded-[12px] mt-[24px] p-[16px] bg-white cursor-pointer" onClick={() => setSelectedLeague("gold")}>
                      <div className="flex justify-between">
                        <div className="flex gap-[6px] items-center">
                          <Gold40 />
                          <span className="text-[16px] text-[#212E42] font-semibold">
                            Gold League
                          </span>
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <div className="text-[14px]">
                            <span className="text-[#76808F]">
                              Requirement: {" "}
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
                              CELPIP Champion: {" "}
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
