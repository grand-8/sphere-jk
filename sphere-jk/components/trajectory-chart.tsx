"use client"

import { useMemo } from "react"
import { Line } from "recharts"
import type { LifeTrajectory } from "@/lib/data-generator"
import { LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface TrajectoryChartProps {
  trajectory: LifeTrajectory
}

export function TrajectoryChart({ trajectory }: TrajectoryChartProps) {
  const data = useMemo(() => {
    return trajectory.points.map((point) => ({
      year: point.year,
      score: point.score,
      event: point.event,
      cumulativeScore: point.cumulativeScore,
    }))
  }, [trajectory])

  // Déterminer la couleur en fonction de la catégorie
  const getColor = () => {
    switch (trajectory.category) {
      case "education":
        return "hsl(210, 70%, 50%)" // Bleu
      case "career":
        return "hsl(280, 70%, 50%)" // Violet
      case "entrepreneurship":
        return "hsl(340, 70%, 50%)" // Rose
      case "health":
        return "hsl(30, 70%, 50%)" // Orange
      default:
        return "hsl(280, 70%, 50%)" // Violet par défaut
    }
  }

  return (
    <div className="w-full h-64 mt-4">
      <ChartContainer
        config={{
          trajectory: {
            label: "Trajectoire",
            color: getColor(),
          },
        }}
      >
        <LineChart data={data}>
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => String(value)}
            className="text-xs"
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                className="bg-black/90 border-gray-700"
                labelClassName="text-gray-300"
                valueClassName="font-medium"
              />
            }
          />
          <Line
            type="monotone"
            dataKey="cumulativeScore"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r: 4 }}
            name="trajectory"
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
