// Types pour les données de trajectoire de vie
export interface LifePoint {
  year: number
  score: number
  event: string
  cumulativeScore: number
}

export interface LifeTrajectory {
  id: string
  name: string
  category: "education" | "career" | "entrepreneurship" | "health"
  startYear: number
  points: LifePoint[]
  maxHeight: number
}

// Événements positifs par catégorie
const positiveEvents = {
  education: [
    "Obtention d'un diplôme",
    "Début d'une formation",
    "Certification obtenue",
    "Bourse d'études",
    "Prix académique",
    "Admission dans une école prestigieuse",
    "Validation d'un semestre à l'étranger",
    "Obtention d'un doctorat",
    "Réussite d'un concours",
    "Publication d'un article scientifique",
  ],
  career: [
    "Promotion professionnelle",
    "Nouveau poste",
    "Augmentation de salaire",
    "Reconnaissance professionnelle",
    "Projet réussi",
    "Changement de carrière positif",
    "Obtention d'un CDI",
    "Prise de responsabilités",
    "Recrutement dans une entreprise prestigieuse",
    "Obtention d'un prix professionnel",
  ],
  entrepreneurship: [
    "Création d'entreprise",
    "Levée de fonds",
    "Nouveau client important",
    "Croissance significative",
    "Lancement d'un produit",
    "Partenariat stratégique",
    "Acquisition d'une entreprise",
    "Expansion internationale",
    "Brevet déposé",
    "Prix d'innovation",
  ],
  health: [
    "Amélioration de la santé",
    "Objectif de fitness atteint",
    "Adoption d'un mode de vie sain",
    "Guérison d'une maladie",
    "Réussite d'une opération",
    "Arrêt d'une addiction",
    "Perte de poids significative",
    "Équilibre mental retrouvé",
    "Pratique régulière d'un sport",
    "Amélioration du bien-être général",
  ],
}

// Événements négatifs par catégorie
const negativeEvents = {
  education: [
    "Échec scolaire",
    "Abandon d'études",
    "Redoublement",
    "Perte de bourse",
    "Échec à un examen important",
    "Problèmes d'apprentissage",
    "Exclusion temporaire",
    "Difficulté d'intégration",
    "Mauvaise orientation",
    "Conflit avec un professeur",
  ],
  career: [
    "Perte d'emploi",
    "Période de chômage",
    "Rétrogradation",
    "Burnout professionnel",
    "Conflit au travail",
    "Échec d'un projet important",
    "Restructuration d'entreprise",
    "Fin de contrat non renouvelé",
    "Mobilité forcée",
    "Harcèlement au travail",
  ],
  entrepreneurship: [
    "Échec d'entreprise",
    "Perte financière importante",
    "Échec de levée de fonds",
    "Perte d'un client majeur",
    "Problème juridique",
    "Conflit entre associés",
    "Échec de lancement de produit",
    "Crise de trésorerie",
    "Concurrence écrasante",
    "Problème de propriété intellectuelle",
  ],
  health: [
    "Problème de santé",
    "Accident",
    "Diagnostic de maladie",
    "Hospitalisation",
    "Dépression",
    "Burn-out",
    "Problème d'addiction",
    "Prise de poids problématique",
    "Trouble du sommeil chronique",
    "Problème de santé mentale",
  ],
}

// Prénoms pour la génération aléatoire
const firstNames = [
  "Emma",
  "Lucas",
  "Léa",
  "Hugo",
  "Chloé",
  "Louis",
  "Inès",
  "Jules",
  "Sarah",
  "Gabriel",
  "Jade",
  "Raphaël",
  "Louise",
  "Arthur",
  "Alice",
  "Adam",
  "Zoé",
  "Ethan",
  "Camille",
  "Nathan",
  "Lina",
  "Théo",
  "Manon",
  "Noah",
  "Eva",
  "Liam",
  "Juliette",
  "Paul",
  "Charlotte",
  "Maxime",
  "Ambre",
  "Tom",
  "Lola",
  "Sacha",
  "Romane",
  "Mathis",
  "Lucie",
  "Nolan",
  "Clara",
  "Timéo",
]

const lastNames = [
  "Martin",
  "Bernard",
  "Thomas",
  "Petit",
  "Robert",
  "Richard",
  "Durand",
  "Dubois",
  "Moreau",
  "Laurent",
  "Simon",
  "Michel",
  "Lefebvre",
  "Leroy",
  "Roux",
  "David",
  "Bertrand",
  "Morel",
  "Fournier",
  "Girard",
  "Bonnet",
  "Dupont",
  "Lambert",
  "Fontaine",
  "Rousseau",
  "Vincent",
  "Muller",
  "Lefevre",
  "Faure",
  "Andre",
  "Mercier",
  "Blanc",
  "Guerin",
  "Boyer",
  "Garnier",
  "Chevalier",
  "Francois",
  "Legrand",
  "Gauthier",
  "Garcia",
]

// Fonction pour générer un nombre aléatoire dans une plage
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Fonction pour choisir un élément aléatoire d'un tableau
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Fonction pour générer une trajectoire de vie aléatoire
function generateTrajectory(): LifeTrajectory {
  const id = Math.random().toString(36).substring(2, 9)
  const firstName = randomChoice(firstNames)
  const lastName = randomChoice(lastNames)
  const name = `${firstName} ${lastName}`

  const categories = ["education", "career", "entrepreneurship", "health"] as const
  const category = randomChoice(categories)

  // Année de début entre 2015 et 2022
  const startYear = randomInt(2015, 2022)

  // Générer les points de la trajectoire
  const points: LifePoint[] = []
  let cumulativeScore = 0

  // Premier point - toujours positif pour commencer
  const initialScore = randomInt(5, 20)
  cumulativeScore += initialScore
  points.push({
    year: startYear,
    score: initialScore,
    event: randomChoice(positiveEvents[category]),
    cumulativeScore,
  })

  // Générer les points suivants jusqu'à 2025
  for (let year = startYear + 1; year <= 2025; year++) {
    // 70% de chance d'avoir un événement cette année
    if (Math.random() < 0.7) {
      // 70% de chance d'avoir un événement positif, 30% négatif
      const isPositive = Math.random() < 0.7

      const score = isPositive
        ? randomInt(5, 25) // Score positif
        : -randomInt(5, 20) // Score négatif

      cumulativeScore += score

      // Assurer que le score cumulatif ne descend pas en dessous de 0
      if (cumulativeScore < 0) cumulativeScore = 0

      // Ajouter une croissance naturelle pour les années récentes (2% par an)
      if (year >= 2023) {
        cumulativeScore *= 1.02
      }

      points.push({
        year,
        score,
        event: isPositive ? randomChoice(positiveEvents[category]) : randomChoice(negativeEvents[category]),
        cumulativeScore,
      })
    } else {
      // Pas d'événement majeur cette année, juste une légère croissance
      cumulativeScore *= 1.01
      points.push({
        year,
        score: 0,
        event: "Année stable",
        cumulativeScore,
      })
    }
  }

  // Calculer la hauteur maximale pour cette trajectoire
  const maxHeight = Math.max(...points.map((p) => p.cumulativeScore))

  return {
    id,
    name,
    category,
    startYear,
    points,
    maxHeight,
  }
}

// Fonction pour générer un ensemble de données de trajectoires
export function generateMockData(count: number): LifeTrajectory[] {
  const trajectories: LifeTrajectory[] = []

  for (let i = 0; i < count; i++) {
    trajectories.push(generateTrajectory())
  }

  return trajectories
}
