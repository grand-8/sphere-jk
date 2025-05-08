"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useLifeTrajectoryStore } from "@/lib/store"

export function SearchBar() {
  const [searchValue, setSearchValue] = useState("")
  const setSearchQuery = useLifeTrajectoryStore((state) => state.setSearchQuery)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchValue)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <Input
        type="text"
        placeholder="Rechercher une personne..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-10 bg-black/50 border-gray-700 text-white w-full md:w-64"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
    </form>
  )
}
