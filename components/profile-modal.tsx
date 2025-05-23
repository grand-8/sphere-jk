"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import type { LifeTrajectory } from "@/lib/data-generator"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface ProfileModalProps {
  trajectory: LifeTrajectory | null
  onClose: () => void
}

export function ProfileModal({ trajectory, onClose }: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fermer le modal lorsque l'utilisateur clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Fermer le modal lorsque l'utilisateur appuie sur Échap
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [onClose])

  if (!trajectory) return null

  // Déterminer la couleur en fonction de la catégorie
  const getCategoryColor = () => {
    switch (trajectory.category) {
      case "education":
        return "#3d6b7c" // Bleu-vert
      case "career":
        return "#4d8a7a" // Vert-bleu
      case "entrepreneurship":
        return "#7ab555" // Vert clair
      case "health":
        return "#2d4b6e" // Bleu moyen
      default:
        return "#4d8a7a" // Vert-bleu par défaut
    }
  }

  // Formater les données pour le graphique
  const chartData = trajectory.points.map((point) => ({
    year: point.year,
    score: point.cumulativeScore,
    event: point.event,
  }))

  // Calculer le score total
  const totalScore = trajectory.points.reduce((sum, point) => sum + point.score, 0)

  // Déterminer le statut en fonction du score total
  const getStatus = () => {
    if (totalScore > 100) return "Exceptionnel"
    if (totalScore > 50) return "Excellent"
    if (totalScore > 20) return "Bon"
    if (totalScore > 0) return "Stable"
    return "En difficulté"
  }

  // Calculer le pourcentage de progression
  const maxPossibleScore = 150 // Score maximum théorique
  const progressPercentage = Math.min(100, Math.max(0, (totalScore / maxPossibleScore) * 100))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className="relative w-[80vw] max-w-xl max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">{trajectory.name}</h2>
            <div className="flex items-center mt-1">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: getCategoryColor() }}
              ></span>
              <span className="text-gray-300 capitalize">{trajectory.category}</span>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Résumé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Statut</div>
              <div className="text-xl font-bold text-white mt-1">{getStatus()}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Score total</div>
              <div className="text-xl font-bold text-white mt-1">{totalScore.toFixed(0)} pts</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Début de parcours</div>
              <div className="text-xl font-bold text-white mt-1">{trajectory.startYear}</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Progression globale</span>
              <span className="text-white font-bold">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: getCategoryColor(),
                }}
              ></div>
            </div>
          </div>

          {/* Graphique */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Évolution du parcours</h3>
            <div className="h-64 bg-gray-800/30 rounded-lg border border-gray-700 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="year"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#4b5563" }}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: "#4b5563" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      border: "1px solid #374151",
                      borderRadius: "0.5rem",
                      color: "#e5e7eb",
                    }}
                    labelStyle={{ fontWeight: "bold", marginBottom: "0.5rem" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={getCategoryColor()}
                    strokeWidth={3}
                    dot={{ r: 4, fill: getCategoryColor(), strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: getCategoryColor(), stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Événements clés */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Événements clés</h3>
            <div className="space-y-4">
              {trajectory.points.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                      point.score > 0 ? "bg-green-900/30" : "bg-red-900/30"
                    }`}
                  >
                    <span className={`text-lg font-bold ${point.score > 0 ? "text-green-400" : "text-red-400"}`}>
                      {point.score > 0 ? "+" : ""}
                      {point.score}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">{point.year}</span>
                      <span className="text-sm text-gray-400">Score cumulé: {point.cumulativeScore.toFixed(0)}</span>
                    </div>
                    <p className="text-gray-300">{point.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
