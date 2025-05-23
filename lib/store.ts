import { create } from "zustand"
import type { LifeTrajectory } from "./data-generator"
import { generateMockData } from "./data-generator"
import { filterTrajectories } from "./filter-utils"

// Générer les données une seule fois au niveau du store
const trajectoryData = generateMockData(400)

interface LifeTrajectoryState {
  // États existants
  selectedPerson: LifeTrajectory | null
  setSelectedPerson: (person: LifeTrajectory | null) => void

  // Nouveaux états pour la recherche
  searchQuery: string
  filteredTrajectories: LifeTrajectory[]
  isFiltering: boolean

  // Nouvelle fonction pour mettre à jour la recherche
  setSearchQuery: (query: string) => void

  // Données de trajectoire accessibles depuis le store
  trajectoryData: LifeTrajectory[]
}

export const useLifeTrajectoryStore = create<LifeTrajectoryState>((set, get) => ({
  // États existants
  selectedPerson: null,
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),

  // Nouveaux états initialisés
  searchQuery: "",
  filteredTrajectories: trajectoryData,
  isFiltering: false,

  // Fonction pour mettre à jour la recherche avec logique de filtrage
  setSearchQuery: (searchQuery) => {
    // Filtrer les trajectoires en fonction de la requête
    const filtered = filterTrajectories(trajectoryData, searchQuery)

    set({
      searchQuery,
      filteredTrajectories: filtered,
      isFiltering: searchQuery.length > 0,
    })
  },

  // Données de trajectoire
  trajectoryData,
}))
