"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LifeTrajectory } from "@/lib/data-generator"

interface PersonDetailProps {
  person: LifeTrajectory
  onClose: () => void
}

export function PersonDetail({ person, onClose }: PersonDetailProps) {
  return (
    <Card className="w-[90vw] max-w-xl bg-black/90 border-gray-700 text-white shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">{person.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-pink-400">Informations</h3>
            <p className="text-gray-300">Catégorie: {person.category}</p>
            <p className="text-gray-300">Début: {person.startYear}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-pink-400">Parcours</h3>
            <ul className="space-y-2 mt-2">
              {person.points.map((point, index) => (
                <li key={index} className="border-l-2 border-gray-700 pl-4 py-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{point.year}</span>
                    <span className={`${point.score > 0 ? "text-green-400" : "text-red-400"}`}>
                      {point.score > 0 ? "+" : ""}
                      {point.score}
                    </span>
                  </div>
                  <p className="text-gray-300">{point.event}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
