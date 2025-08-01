import { create } from "zustand";
import { TTaskSchemaDto } from "@/models/tasks.model";

interface SelectedTaskState {
  selectedTask: TTaskSchemaDto | null;
  setSelectedTask: (task: TTaskSchemaDto | null) => void;
}

export const useSelectedTask = create<SelectedTaskState>((set) => ({
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
}));
