import type { LifeTrajectory } from "./data-generator"

/**
 * Fonction pure pour filtrer les trajectoires basée sur une requête de recherche
 * @param trajectories - Tableau des trajectoires à filtrer
 * @param searchQuery - Requête de recherche
 * @returns Tableau des trajectoires filtrées
 */
export function filterTrajectories(trajectories: LifeTrajectory[], searchQuery: string): LifeTrajectory[] {
  // Cas edge 1: Données invalides
  if (!trajectories || !Array.isArray(trajectories)) {
    console.warn("filterTrajectories: trajectories invalides, retour d'un tableau vide")
    return []
  }

  // Cas edge 2: Recherche vide ou undefined/null
  if (!searchQuery || typeof searchQuery !== "string" || searchQuery.trim().length === 0) {
    return trajectories
  }

  // Nettoyer et normaliser la requête de recherche
  const cleanQuery = normalizeSearchQuery(searchQuery)

  // Cas edge 3: Requête trop courte après nettoyage
  if (cleanQuery.length < 1) {
    return trajectories
  }

  // Filtrer les trajectoires
  const filtered = trajectories.filter((trajectory) => {
    // Vérifier que la trajectoire est valide
    if (!trajectory || !trajectory.name || typeof trajectory.name !== "string") {
      return false
    }

    // Normaliser le nom de la trajectoire
    const normalizedName = normalizeSearchQuery(trajectory.name)

    // Recherche dans le nom complet
    if (normalizedName.includes(cleanQuery)) {
      return true
    }

    // Recherche dans les parties du nom (prénom/nom séparés)
    const nameParts = normalizedName.split(/\s+/)
    return nameParts.some((part) => part.includes(cleanQuery) || cleanQuery.includes(part))
  })

  // Cas edge 4: Aucun résultat trouvé
  if (filtered.length === 0) {
    console.info(`filterTrajectories: Aucun résultat pour "${searchQuery}"`)
  }

  return filtered
}

/**
 * Normalise une chaîne de recherche pour la comparaison
 * @param input - Chaîne à normaliser
 * @returns Chaîne normalisée
 */
function normalizeSearchQuery(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input
    .toLowerCase() // Insensible à la casse
    .trim() // Supprimer les espaces en début/fin
    .replace(/\s+/g, " ") // Normaliser les espaces multiples
    .normalize("NFD") // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^\w\s]/g, "") // Supprimer les caractères spéciaux (garde lettres, chiffres, espaces)
}

/**
 * Fonction utilitaire pour valider une requête de recherche
 * @param query - Requête à valider
 * @returns true si la requête est valide pour le filtrage
 */
export function isValidSearchQuery(query: string): boolean {
  if (!query || typeof query !== "string") {
    return false
  }

  const cleaned = normalizeSearchQuery(query)
  return cleaned.length >= 1
}

/**
 * Fonction utilitaire pour obtenir des statistiques de filtrage
 * @param originalCount - Nombre original de trajectoires
 * @param filteredCount - Nombre de trajectoires après filtrage
 * @param searchQuery - Requête utilisée
 * @returns Objet avec les statistiques
 */
export function getFilterStats(
  originalCount: number,
  filteredCount: number,
  searchQuery: string,
): {
  originalCount: number
  filteredCount: number
  isFiltered: boolean
  hasResults: boolean
  searchQuery: string
} {
  return {
    originalCount,
    filteredCount,
    isFiltered: isValidSearchQuery(searchQuery),
    hasResults: filteredCount > 0,
    searchQuery: searchQuery.trim(),
  }
}
