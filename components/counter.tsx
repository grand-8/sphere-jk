"use client"

import type React from "react"
import { useLifeTrajectoryStore } from "@/lib/store"

export function Counter() {
  const { filteredTrajectories } = useLifeTrajectoryStore()
  const count = filteredTrajectories.length

  const handleUIEvent = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div
      className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2"
      onMouseDown={handleUIEvent}
      onMouseMove={handleUIEvent}
      onClick={handleUIEvent}
      onMouseOver={handleUIEvent}
      data-ui-element="true"
    >
      <span className="text-white font-medium text-base">{count}</span>
      <span className="text-gray-400 text-sm ml-2">{count === 1 ? "personne affichée" : "personnes affichées"}</span>
    </div>
  )
}
