import { create } from "zustand"
import type { LifeTrajectory } from "./data-generator"

interface LifeTrajectoryState {
  filter: string
  searchQuery: string
  selectedPerson: LifeTrajectory | null
  setFilter: (filter: string) => void
  setSearchQuery: (query: string) => void
  setSelectedPerson: (person: LifeTrajectory | null) => void
}

export const useLifeTrajectoryStore = create<LifeTrajectoryState>((set) => ({
  filter: "all",
  searchQuery: "",
  selectedPerson: null,
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),
}))
