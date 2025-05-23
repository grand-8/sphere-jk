"use client"

import type React from "react"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"
import { useLifeTrajectoryStore } from "@/lib/store"

interface SearchInputProps {
  placeholder?: string
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseMove?: (e: React.MouseEvent) => void
}

export function SearchInput({ placeholder = "Rechercher...", onMouseDown, onMouseMove }: SearchInputProps) {
  const [value, setValue] = useState("")
  const { setSearchQuery } = useLifeTrajectoryStore()

  // Mettre à jour le store lorsque la valeur change
  useEffect(() => {
    // Utiliser un délai pour éviter trop de mises à jour pendant la frappe
    const timeoutId = setTimeout(() => {
      setSearchQuery(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value, setSearchQuery])

  // Remplacer la fonction handleUIEvent par celle-ci :
  const handleUIEvent = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation()
    // Ne PAS bloquer les événements par défaut pour l'input
    // Cela permet la saisie de texte
  }

  // Modifier les gestionnaires d'événements de l'input pour être plus spécifiques :
  return (
    <div
      className="relative"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      style={{ isolation: "isolate" }}
      data-ui-element="true"
    >
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onMouseDown={handleUIEvent}
          onMouseMove={handleUIEvent}
          onClick={handleUIEvent}
          onFocus={handleUIEvent}
          // Ne pas ajouter d'autres gestionnaires qui pourraient interférer
          data-ui-element="true"
          className="
            w-64 h-10 pl-11 pr-4 
            bg-black/50 backdrop-blur-sm 
            border border-white/20 
            rounded-full 
            text-white text-sm 
            placeholder-gray-400 
            focus:outline-none 
            focus:border-white/40 
            focus:bg-black/60
            transition-all duration-200
            hover:bg-black/60
            hover:border-white/30
          "
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
          <Search className="text-gray-300" size={20} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
