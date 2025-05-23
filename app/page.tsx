"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Loader } from "@/components/ui/loader"

// Dynamically import the 3D component to avoid SSR issues
const GradientOutlineSphere = dynamic(() => import("@/components/gradient-outline-sphere"), {
  ssr: false,
  loading: () => <Loader />,
})

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <Suspense fallback={<Loader />}>
        <GradientOutlineSphere />
      </Suspense>

      {/* Texte central */}
      <div className="absolute bottom-20 left-0 right-0 text-center text-white">
        <h2 className="text-5xl md:text-7xl font-bold leading-tight">Trajectoires de vie</h2>
        <p className="text-gray-400 text-lg md:text-xl mt-4">Chaque parcours est une pièce de notre économie.</p>
      </div>
    </main>
  )
}
