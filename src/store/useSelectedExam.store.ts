import { create } from "zustand";

interface SelectedExamState {
  selectedExam: string | null;
  setSelectedExam: (task: string | null) => void;
}

export const useSelectedExam = create<SelectedExamState>((set) => ({
  selectedExam: null,
  setSelectedExam: (task) => set({ selectedExam: task }),
}));
