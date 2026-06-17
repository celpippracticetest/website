import { TPracticeDto } from "@/models/practice.model";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { create } from "zustand";

interface DashboardState {
  view: "practice" | "exams" | null;
  currentPage: string | null;
  setView: (viewName: "practice" | "exams" | null) => void;
  setCurrentPage: (viewName: string | null) => void;
}

interface StoreState {
  dashboard: DashboardState;
  listenings: TPracticeDto[];
  tasks: Record<string, TTaskSchemaDto[]>;
  setTasks: (tasks: Record<string, TTaskSchemaDto[]>) => void;
  isPremiumPlanModalOpen: boolean;
  setPremiumPlanModalState: () => void;
}

const useStore = create<StoreState>((set) => ({
  dashboard: {
    view: "practice",
    currentPage: "dashboard",
    setView: (viewName: "practice" | "exams" | null) =>
      set((state) => {
        return ({ dashboard: { ...state.dashboard, view: viewName } })
      }),
    setCurrentPage: (pageName: string | null) =>
      set((state) => ({ dashboard: { ...state.dashboard, currentPage: pageName } })),
  },
  listenings: [],
  setListening: (listening: TPracticeDto[]) =>
    set((state) => ({ listenings: listening ? [...listening] : state.listenings })),
  tasks: { listening: [], reading: [], writing: [], speaking: [] },
  setTasks: (tasks: Record<string, TTaskSchemaDto[]>) => set((state) => ({ tasks: tasks ? tasks : state.tasks })),
  isPremiumPlanModalOpen: false,
  setPremiumPlanModalState: () => {
    set((state) => ({ isPremiumPlanModalOpen: !state.isPremiumPlanModalOpen }));
  },
}));

export default useStore;
