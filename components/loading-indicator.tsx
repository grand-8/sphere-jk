"use client"

interface LoadingIndicatorProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingIndicator({
  message = "Chargement en cours...",
  size = "md",
  className = "",
}: LoadingIndicatorProps) {
  // Déterminer la taille du spinner
  const spinnerSize = {
    sm: "w-4 h-4 border-2",
    md: "w-5 h-5 border-2",
    lg: "w-8 h-8 border-3",
  }[size]

  // Déterminer la taille du texte
  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size]

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div
        className={`${spinnerSize} border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin`}
      ></div>
      <span className={`text-white ${textSize}`}>{message}</span>
    </div>
  )
}
