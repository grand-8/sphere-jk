"use client"

import type React from "react"

import { useState } from "react"
import { Search, Pause, Play, SlidersHorizontal } from "lucide-react"
import { useLifeTrajectoryStore } from "@/lib/store"

interface HeaderProps {
  isPaused: boolean
  togglePause: () => void
  totalCount: number
}

export function Header({ isPaused, togglePause, totalCount }: HeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const { filter, setFilter, setSearchQuery } = useLifeTrajectoryStore()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchValue)
  }

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setIsFilterOpen(false)
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
      {/* Compteur de personnes */}
      <div className="text-white/80 text-sm">
        <span className="font-bold text-white">{totalCount}</span> personnes affichées
      </div>

      {/* Contrôles à droite */}
      <div className="flex items-center space-x-3">
        {/* Barre de recherche */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="bg-black/40 border border-white/20 rounded-full text-white text-sm py-2 pl-9 pr-4 w-40 focus:w-56 transition-all focus:outline-none focus:border-white/40"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
        </form>

        {/* Filtre par catégorie */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="bg-black/40 border border-white/20 rounded-full text-white text-sm py-2 px-4 flex items-center space-x-2 hover:bg-black/60 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4 text-white/60" />
            <span>
              {filter === "all"
                ? "Toutes"
                : filter === "MIS"
                  ? "MIS"
                  : filter === "Ecotrek"
                    ? "Ecotrek"
                    : filter === "JobtrekSchool"
                      ? "JobtrekSchool"
                      : filter === "Apprentissage"
                        ? "Apprentissage"
                        : filter}
            </span>
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-black/90 border border-white/20 rounded-lg shadow-lg overflow-hidden z-20">
              <div className="py-1">
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    filter === "all" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Toutes les mesures
                </button>
                <button
                  onClick={() => handleFilterChange("MIS")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    filter === "MIS" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Mesure d'insertion (MIS)
                </button>
                <button
                  onClick={() => handleFilterChange("Ecotrek")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    filter === "Ecotrek" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Ecotrek
                </button>
                <button
                  onClick={() => handleFilterChange("JobtrekSchool")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    filter === "JobtrekSchool" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  JobtrekSchool
                </button>
                <button
                  onClick={() => handleFilterChange("Apprentissage")}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    filter === "Apprentissage" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  Apprentissage en réseau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bouton Pause/Play */}
        <button
          onClick={togglePause}
          className="bg-black/40 border border-white/20 rounded-full p-2 hover:bg-black/60 transition-colors"
          aria-label={isPaused ? "Reprendre la rotation" : "Mettre en pause la rotation"}
        >
          {isPaused ? <Play className="h-4 w-4 text-white" /> : <Pause className="h-4 w-4 text-white" />}
        </button>
      </div>
    </div>
  )
}
