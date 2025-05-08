"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter } from "lucide-react"
import { useLifeTrajectoryStore } from "@/lib/store"

export function FilterControls() {
  const [open, setOpen] = useState(false)
  const { filter, setFilter } = useLifeTrajectoryStore((state) => ({
    filter: state.filter,
    setFilter: state.setFilter,
  }))

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-black/50 border-gray-700 text-white">
          <Filter className="mr-2 h-4 w-4" />
          Filtrer
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-black/90 border-gray-700 text-white">
        <DropdownMenuLabel>Catégories</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
          <DropdownMenuRadioItem value="all">Toutes les trajectoires</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="education">Éducation</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="career">Carrière</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="entrepreneurship">Entrepreneuriat</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="health">Santé</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
