"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMockData } from "@/lib/data-generator"
import { ProfileModal } from "@/components/profile-modal"
import { Header } from "@/components/header"
import type { LifeTrajectory } from "@/lib/data-generator"
import { useLifeTrajectoryStore } from "@/lib/store"

// Générer les données une seule fois en dehors du composant
const trajectoryData = generateMockData(400)

// Définir les couleurs du dégradé inspirées de l'image
const COLORS = {
  darkBlue: new THREE.Color("#1a2b4d"), // Bleu foncé (bas gauche de l'image)
  mediumBlue: new THREE.Color("#2d4b6e"), // Bleu moyen
  tealBlue: new THREE.Color("#3d6b7c"), // Bleu-vert
  teal: new THREE.Color("#4d8a7a"), // Vert-bleu
  lightGreen: new THREE.Color("#7ab555"), // Vert clair (haut droit de l'image)
  highlight: new THREE.Color("#ffffff"), // Couleur de surbrillance (blanc)
}

export default function GradientOutlineSphere() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const hoveredGroupRef = useRef<THREE.Group | null>(null)
  const originalMaterialsRef = useRef<Map<THREE.Object3D, THREE.Material>>(new Map())
  const [selectedTrajectory, setSelectedTrajectory] = useState<LifeTrajectory | null>(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(0)
  const sphereGroupRef = useRef<THREE.Group | null>(null)
  const sphereWireframeRef = useRef<THREE.LineSegments | null>(null)

  // Récupérer les filtres du store
  const { filter, searchQuery } = useLifeTrajectoryStore()

  // Références pour suivre les changements de filtres
  const currentFilterRef = useRef(filter)
  const currentSearchRef = useRef(searchQuery)

  // Ajouter ces variables d'état pour suivre le mouvement et le temps écoulé depuis le dernier mouvement
  const [isMoving, setIsMoving] = useState(false)
  const [lastMoveTime, setLastMoveTime] = useState(0)
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ajouter ces variables en haut du composant, juste après les déclarations d'état existantes
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  // Map pour stocker les associations entre les montagnes de fond et les trajectoires
  const backgroundMountainMap = useRef<Map<number, LifeTrajectory>>(new Map())

  // Ajouter un compteur de montagnes créées en haut du composant, juste après les déclarations d'état existantes
  const mountainCountRef = useRef<number>(0)

  // Fonction pour réinitialiser la surbrillance (définie en dehors de l'effet principal)
  const resetHighlight = useCallback(() => {
    if (!hoveredGroupRef.current) return

    // Restaurer les matériaux originaux
    hoveredGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Line) {
        const originalMaterial = originalMaterialsRef.current.get(child)
        if (originalMaterial) {
          child.material = originalMaterial
        }
      }
    })

    // Vider la map des matériaux originaux
    originalMaterialsRef.current.clear()

    // Réinitialiser la référence au groupe survolé
    hoveredGroupRef.current = null

    // Cacher l'info-bulle
    if (tooltipRef.current) {
      tooltipRef.current.style.display = "none"
    }

    // Réinitialiser le curseur
    document.body.style.cursor = "auto"
  }, [])

  // Fonction pour basculer la pause de la rotation
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev)
  }, [])

  // Fonction pour créer des montagnes en contour sur la sphère avec dégradé
  const createGradientOutlineMountainsOnSphere = useCallback(
    (parent: THREE.Group) => {
      console.log("createGradientOutlineMountainsOnSphere: Appelée avec sphereGroup:", parent); // LOG 4
      mountainCountRef.current = 0
      backgroundMountainMap.current.clear() // Vider la map avant de recréer

      const radius = 5 // Rayon de la sphère

      // Créer d'abord les montagnes basées sur les données de trajectoire
      addTrajectoryMountains(parent, radius)
    },
    [filter, searchQuery],
  )

  // Fonction pour ajouter les montagnes basées sur les trajectoires
  const addTrajectoryMountains = useCallback(
    (parent: THREE.Group, radius: number) => {
      // Filtrer les trajectoires selon les critères actuels
      const filteredTrajectories = trajectoryData.filter((trajectory) => {
        // Filtrer par mesure
        if (filter !== "all" && trajectory.measure !== filter) {
          return false
        }

        // Filtrer par recherche de nom
        if (searchQuery && !trajectory.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }

        return true
      })

      console.log("createGradientOutlineMountainsOnSphere: Nombre de trajectoires filtrées:", filteredTrajectories.length); // LOG 5
      setDisplayedCount(filteredTrajectories.length)

      // Nombre total de trajectoires à afficher
      const totalTrajectories = filteredTrajectories.length

      // Calculer dynamiquement la distance minimale entre les montagnes en fonction du nombre total
      // Réduire encore l'espacement entre les montagnes
      const minDistanceBetweenMountains = Math.max(0.3, 0.6 - totalTrajectories / 1000)

      // Calculer dynamiquement la largeur de base des montagnes en fonction du nombre total
      // Augmenter la largeur de base pour utiliser plus d'espace au sol
      const baseMountainWidth = Math.max(0.5, 0.8 - totalTrajectories / 2000)

      // Traiter les trajectoires par lots
      let trajectoryIndex = 0
      const trajectoryBatchSize = 20

      // Stocker les positions utilisées pour éviter les superpositions
      const usedPositions: THREE.Vector3[] = []

      function createTrajectoryBatch() {
        const endIndex = Math.min(trajectoryIndex + trajectoryBatchSize, totalTrajectories)

        for (let i = trajectoryIndex; i < endIndex; i++) {
          try {
            const trajectory = filteredTrajectories[i]

            // Utiliser une distribution plus uniforme basée sur la sphère de Fibonacci avec un offset aléatoire
            const offset = Math.random() * 0.1 // Petit offset aléatoire pour éviter les motifs réguliers
            const phi = Math.acos(1 - 2 * ((i + offset) / totalTrajectories))
            const theta = 2 * Math.PI * i * (1 / 1.618033988749895) // Nombre d'or

            // Convertir en coordonnées cartésiennes
            const x = radius * Math.sin(phi) * Math.cos(theta)
            const y = radius * Math.sin(phi) * Math.sin(theta)
            const z = radius * Math.cos(phi)

            const position = new THREE.Vector3(x, y, z)

            // Vérifier si cette position est trop proche d'une position déjà utilisée
            let tooClose = false
            for (const usedPos of usedPositions) {
              if (position.distanceTo(usedPos) < minDistanceBetweenMountains) {
                tooClose = true
                break
              }
            }

            // Si la position est trop proche, essayer jusqu'à 10 positions alternatives
            if (tooClose) {
              let foundPosition = false
              for (let attempt = 0; attempt < 10; attempt++) {
                // Générer une position aléatoire sur la sphère
                const randPhi = Math.acos(2 * Math.random() - 1)
                const randTheta = 2 * Math.PI * Math.random()

                const newX = radius * Math.sin(randPhi) * Math.cos(randTheta)
                const newY = radius * Math.sin(randPhi) * Math.sin(randTheta)
                const newZ = radius * Math.cos(randPhi)

                const newPosition = new THREE.Vector3(newX, newY, newZ)

                // Vérifier si cette nouvelle position est acceptable
                let newTooClose = false
                for (const usedPos of usedPositions) {
                  if (newPosition.distanceTo(usedPos) < minDistanceBetweenMountains) {
                    newTooClose = true
                    break
                  }
                }

                if (!newTooClose) {
                  position.copy(newPosition)
                  foundPosition = true
                  tooClose = false
                  break
                }
              }

              // Si on n'a toujours pas trouvé de position, utiliser la position originale quand même
              // au lieu de sauter cette montagne
              if (!foundPosition) {
                console.log(`Position sous-optimale pour la montagne ${i}, mais on la place quand même`)
              }
            }

            // Ajouter cette position à la liste des positions utilisées
            usedPositions.push(position.clone())

            // Calculer la normale exactement à partir du centre de la sphère vers la position
            const normal = position.clone().normalize()

            // Déterminer la couleur en fonction de la position et de la catégorie
            const normalizedY = (position.y + radius) / (2 * radius) // Entre 0 et 1

            const baseColor = new THREE.Color()

            if (normalizedY < 0.25) {
              baseColor.lerpColors(COLORS.darkBlue, COLORS.mediumBlue, normalizedY * 4)
            } else if (normalizedY < 0.5) {
              baseColor.lerpColors(COLORS.mediumBlue, COLORS.tealBlue, (normalizedY - 0.25) * 4)
            } else if (normalizedY < 0.75) {
              baseColor.lerpColors(COLORS.tealBlue, COLORS.teal, (normalizedY - 0.5) * 4)
            } else {
              baseColor.lerpColors(COLORS.teal, COLORS.lightGreen, (normalizedY - 0.75) * 4)
            }

            // Ajuster légèrement la couleur en fonction de la catégorie
            const categoryColor = new THREE.Color(baseColor)

            switch (trajectory.category) {
              case "education":
                categoryColor.lerp(COLORS.tealBlue, 0.3)
                break
              case "career":
                categoryColor.lerp(COLORS.teal, 0.3)
                break
              case "entrepreneurship":
                categoryColor.lerp(COLORS.lightGreen, 0.3)
                break
              case "health":
                categoryColor.lerp(COLORS.mediumBlue, 0.3)
                break
            }

            // Hauteur basée sur les données, mais réduite pour de meilleures proportions
            const maxScore = Math.max(...trajectory.points.map((p) => p.cumulativeScore))
            // Réduire le facteur de hauteur pour avoir des montagnes moins hautes
            const heightFactor = Math.min(2, maxScore / 40) + 0.3

            // Créer une montagne principale en contour avec la largeur de base adaptée
            createGradientOutlineMountain(
              position,
              normal,
              heightFactor,
              parent,
              categoryColor,
              {
                name: trajectory.name,
                type: "trajectory",
                data: trajectory,
              },
              0.8,
              baseMountainWidth, // Passer la largeur de base adaptée
            )
          } catch (error) {
            console.error(`Erreur lors du traitement de la trajectoire ${i}:`, error)
          }
        }

        trajectoryIndex = endIndex

        // Si nous n'avons pas terminé et que le composant est toujours monté, planifier le prochain lot
        if (trajectoryIndex < totalTrajectories && isRendering) {
          setTimeout(createTrajectoryBatch, 0)
        }
      }

      // Commencer à créer les montagnes de trajectoire par lots
      createTrajectoryBatch()
    },
    [filter, searchQuery, isRendering],
  )

  // Fonction pour créer une montagne en contour avec dégradé
  const createGradientOutlineMountain = useCallback(
    (
      position: THREE.Vector3,
      normal: THREE.Vector3,
      heightFactor: number,
      parent: THREE.Group,
      color: THREE.Color,
      metadata: { name: string; type: string; data: any },
      opacity = 0.5,
      customBaseWidth?: number, // Nouveau paramètre optionnel
    ) => {
      // Créer un groupe pour cette montagne
      const mountainGroup = new THREE.Group()
      mountainGroup.position.copy(position)
      mountainGroup.userData = metadata // Stocker les métadonnées pour l'interaction

      // Calculer la rotation pour aligner avec la normale
      // Utiliser une méthode plus robuste pour s'assurer que la montagne pointe vers l'extérieur
      const worldUp = new THREE.Vector3(0, 1, 0)

      // Créer un quaternion qui aligne parfaitement avec la normale
      const quaternion = new THREE.Quaternion()

      // Calculer l'axe de rotation comme le produit vectoriel de worldUp et normal
      const rotationAxis = new THREE.Vector3().crossVectors(worldUp, normal).normalize()

      // Calculer l'angle entre worldUp et normal
      const angle = Math.acos(worldUp.dot(normal))

      // Si l'axe de rotation est valide (non nul), utiliser setFromAxisAngle
      if (rotationAxis.lengthSq() > 0.001) {
        quaternion.setFromAxisAngle(rotationAxis, angle)
      } else {
        // Si les vecteurs sont parallèles ou anti-parallèles
        if (normal.y < 0) {
          // Si la normale pointe vers le bas, rotation de 180° autour de l'axe X
          quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
        } else {
          // Si la normale pointe vers le haut, pas de rotation nécessaire
          quaternion.identity()
        }
      }

      // Appliquer la rotation de base pour aligner avec la normale
      mountainGroup.quaternion.copy(quaternion)

      // Ajouter une rotation aléatoire sur les axes X et Y locaux
      // Créer un groupe intermédiaire pour la rotation aléatoire
      const randomRotationGroup = new THREE.Group()

      // Générer des angles aléatoires pour les axes X et Y, mais plus petits pour éviter les montagnes flottantes
      // Réduire encore les angles pour minimiser l'effet de "vol"
      const randomXAngle = ((Math.random() - 0.5) * Math.PI) / 16 // ±11.25 degrés (réduit de moitié encore)
      const randomYAngle = ((Math.random() - 0.5) * Math.PI) / 16 // ±11.25 degrés (réduit de moitié encore)

      // Appliquer les rotations aléatoires
      randomRotationGroup.rotateX(randomXAngle)
      randomRotationGroup.rotateY(randomYAngle)

      // Ajouter le groupe de rotation aléatoire au groupe principal
      mountainGroup.add(randomRotationGroup)

      // Paramètres de la montagne
      // Réduire la hauteur pour de meilleures proportions
      const height = (0.3 + heightFactor * 1.2) / 3 // Hauteur réduite davantage

      // Utiliser la largeur personnalisée si fournie, sinon utiliser une valeur par défaut plus large
      const baseWidth = customBaseWidth || 0.7 + Math.random() * 0.4 // Base plus large

      // Créer les points du contour de la montagne
      const points: THREE.Vector3[] = []
      const colors: number[] = []

      // Point de départ (coin gauche de la base) - exactement sur la surface de la sphère
      points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))
      colors.push(color.r, color.g, color.b)

      // Utiliser les données réelles si disponibles
      if (metadata.type === "trajectory" && metadata.data.points && metadata.data.points.length > 1) {
        const trajectory = metadata.data
        const dataPoints = trajectory.points

        // Normaliser les largeurs pour correspondre à la largeur de base
        const segmentWidth = baseWidth / (dataPoints.length - 1)

        // Trouver le score cumulatif maximum pour normaliser les hauteurs
        const maxCumulativeScore = Math.max(...dataPoints.map((p) => p.cumulativeScore))

        // S'assurer que maxCumulativeScore n'est pas trop petit pour éviter les montagnes plates
        const effectiveMaxScore = Math.max(maxCumulativeScore, 20)

        // Créer le profil basé sur les données réelles avec aléatoire sur l'axe X
        for (let i = 0; i < dataPoints.length; i++) {
          const point = dataPoints[i]

          // Position X de base
          let x = -baseWidth / 2 + i * segmentWidth

          // Ajouter de l'aléatoire à la position X pour les points intermédiaires
          if (i > 0 && i < dataPoints.length - 1) {
            // Variation aléatoire plus importante au milieu, plus faible aux extrémités
            const distanceFromCenter = Math.abs(i - (dataPoints.length - 1) / 2) / ((dataPoints.length - 1) / 2)
            const maxVariation = segmentWidth * 0.3 * (1 - distanceFromCenter)
            x += (Math.random() - 0.5) * maxVariation
          }

          // Normaliser la hauteur en fonction du score cumulatif
          const normalizedHeight = point.cumulativeScore / effectiveMaxScore

          // Garantir une hauteur minimale pour les points intermédiaires, mais réduire globalement
          let peakHeight = height * Math.max(0.15, normalizedHeight * 0.8)

          // Ajouter une variation pour éviter les montagnes trop plates
          if (i > 0 && i < dataPoints.length - 1) {
            // Ajouter une petite variation basée sur le score du point
            const variation = (point.score / 10) * 0.15 // Variation réduite
            peakHeight += variation
          }

          // Si c'est le premier ou le dernier point, forcer y=0 pour assurer que la base est sur la sphère
          const y = i === 0 || i === dataPoints.length - 1 ? 0 : Math.abs(peakHeight)

          points.push(new THREE.Vector3(x, y, 0))

          // Couleur plus claire au sommet
          const pointColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), normalizedHeight * 0.3)
          colors.push(pointColor.r, pointColor.g, pointColor.b)
        }
      } else {
        // Pour les montagnes de fond ou sans données spécifiques
        // Nombre de segments pour le profil dentelé
        const segments = 4 + Math.floor(Math.random() * 3) // Entre 4 et 6 segments
        const segmentWidth = baseWidth / segments

        // Créer le profil dentelé avec dégradé de couleurs et aléatoire sur l'axe X
        for (let i = 1; i <= segments; i++) {
          // Position X de base
          let x = -baseWidth / 2 + i * segmentWidth

          // Ajouter de l'aléatoire à la position X pour les points intermédiaires
          if (i > 0 && i < segments) {
            // Variation aléatoire plus importante au milieu, plus faible aux extrémités
            const distanceFromCenter = Math.abs(i - segments / 2) / (segments / 2)
            const maxVariation = segmentWidth * 0.4 * (1 - distanceFromCenter)
            x += (Math.random() - 0.5) * maxVariation
          }

          if (i === segments) {
            // Dernier point (coin droit de la base) - maintenant exactement sur la surface de la sphère
            points.push(new THREE.Vector3(baseWidth / 2, 0, 0))
            colors.push(color.r, color.g, color.b)
          } else {
            // Points intermédiaires (pics)
            const peakHeight = height * (0.4 + Math.random() * 0.4) // Hauteur réduite

            // Si c'est un segment pair, on monte vers un pic
            if (i % 2 === 1) {
              points.push(new THREE.Vector3(x, Math.abs(peakHeight), 0))

              // Couleur plus claire au sommet
              const peakColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3)
              colors.push(peakColor.r, peakColor.g, peakColor.b)
            } else {
              // Si c'est un segment impair, on descend légèrement pour créer une vallée
              const valleyHeight = peakHeight * (0.4 + Math.random() * 0.2)
              points.push(new THREE.Vector3(x, Math.abs(valleyHeight), 0))

              // Couleur intermédiaire pour les vallées
              const valleyColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15)
              colors.push(valleyColor.r, valleyColor.g, valleyColor.b)
            }
          }
        }
      }

      // Fermer le contour en revenant au point de départ
      points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))
      colors.push(color.r, color.g, color.b)

      // S'assurer que toutes les hauteurs sont positives (vers l'extérieur)
      for (let i = 0; i < points.length; i++) {
        if (points[i].y < 0) {
          points[i].y = Math.abs(points[i].y) // Forcer les valeurs négatives à être positives
        }
      }

      // S'assurer que la base est bien alignée avec la sphère
      // Identifier explicitement les points de base et les forcer à y=0
      const basePoints = [0, points.length - 2, points.length - 1] // Premier point, avant-dernier et dernier point
      for (let i = 0; i < points.length; i++) {
        const point = points[i]
        // Si c'est un point de base identifié ou si sa hauteur est très proche de 0
        if (basePoints.includes(i) || Math.abs(point.y) < 0.01) {
          point.y = 0 // Forcer à exactement 0
        }
      }

      // Assurer que le premier et le dernier point sont exactement à y=0
      points[0].y = 0
      points[points.length - 1].y = 0

      // Créer la géométrie du contour avec les couleurs
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const colorArray = new Float32Array(colors)
      geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))

      // Créer le matériau pour le contour
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: opacity,
        linewidth: 1,
      })

      // Créer la ligne du contour
      const outline = new THREE.Line(geometry, material)
      outline.userData = { isOutline: true, parentGroup: mountainGroup }

      // Ajouter une profondeur au contour en créant une deuxième ligne décalée
      const depthPointsArray: THREE.Vector3[] = []
      const depthColorsArray: number[] = []
      // Réduire la profondeur pour de meilleures proportions
      const depth = 0.08 + Math.random() * 0.12

      for (let i = 0; i < points.length; i++) {
        const point = points[i]
        // Créer un nouveau point avec la même position x et y, mais décalé en z
        // Conserver exactement la même hauteur y pour maintenir l'alignement
        depthPointsArray.push(new THREE.Vector3(point.x, point.y, depth))

        // Utiliser les mêmes couleurs que pour le contour frontal
        depthColorsArray.push(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2])
      }

      // Assurer que les points de base de la profondeur sont aussi à y=0
      for (const i of basePoints) {
        if (i < depthPointsArray.length) {
          depthPointsArray[i].y = 0
        }
      }

      const depthGeometry = new THREE.BufferGeometry().setFromPoints(depthPointsArray)
      const depthColorArray = new Float32Array(depthColorsArray)
      depthGeometry.setAttribute("color", new THREE.BufferAttribute(depthColorArray, 3))

      const depthOutline = new THREE.Line(depthGeometry, material)
      depthOutline.userData = { isOutline: true, parentGroup: mountainGroup }

      // Ajouter les lignes verticales pour connecter les deux contours
      for (let i = 0; i < points.length - 1; i += Math.max(1, Math.floor(points.length / 8))) {
        const verticalPoints = [
          new THREE.Vector3(points[i].x, points[i].y, 0),
          new THREE.Vector3(points[i].x, points[i].y, depth),
        ]

        const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints)

        // Utiliser la même couleur que le point correspondant
        const verticalColors = new Float32Array([
          colors[i * 3],
          colors[i * 3 + 1],
          colors[i * 3 + 2],
          colors[i * 3],
          colors[i * 3 + 1],
          colors[i * 3 + 2],
        ])

        verticalGeometry.setAttribute("color", new THREE.BufferAttribute(verticalColors, 3))

        const verticalLine = new THREE.Line(verticalGeometry, material)
        verticalLine.userData = { isOutline: true, parentGroup: mountainGroup }

        randomRotationGroup.add(verticalLine)
      }

      // Ajouter les contours au groupe de rotation aléatoire
      randomRotationGroup.add(outline)
      randomRotationGroup.add(depthOutline)

      // Ajouter la montagne au parent
      parent.add(mountainGroup)
    },
    [],
  )

  // Fonction pour mettre en surbrillance un groupe de montagne
  const highlightMountainGroup = useCallback(
    (group: THREE.Group) => {
      if (hoveredGroupRef.current === group) return // Déjà en surbrillance

      // Réinitialiser le groupe précédemment survolé
      resetHighlight()

      // Stocker le groupe actuellement survolé
      hoveredGroupRef.current = group

      // Parcourir tous les enfants du groupe (lignes)
      group.traverse((child) => {
        if (child instanceof THREE.Line) {
          // Sauvegarder le matériau original
          originalMaterialsRef.current.set(child, child.material)

          // Créer un nouveau matériau pour la surbrillance
          const highlightMaterial = new THREE.LineBasicMaterial({
            color: COLORS.highlight,
            transparent: true,
            opacity: 1.0,
            linewidth: 2,
          })

          // Appliquer le nouveau matériau
          child.material = highlightMaterial
        }
      })

      // Afficher l'info-bulle
      if (tooltipRef.current) {
        const metadata = group.userData
        let tooltipContent = ""

        if (metadata.type === "trajectory") {
          const trajectory = metadata.data
          tooltipContent = `
          <div class="font-bold text-base">${trajectory.name}</div>
          <div class="text-xs text-gray-300 mt-1">Catégorie: ${trajectory.category}</div>
          <div class="text-xs text-gray-300">Mesure: ${trajectory.measure}</div>
          <div class="text-xs text-gray-300">Début: ${trajectory.startYear}</div>
          <div class="text-xs text-gray-300">Score max: ${Math.max(...trajectory.points.map((p: any) => p.cumulativeScore)).toFixed(0)}</div>
          <div class="text-xs text-blue-300 mt-1">Cliquez pour voir le profil</div>
        `
        } else {
          tooltipContent = `
          <div class="font-bold text-base">${metadata.name}</div>
          <div class="text-xs text-gray-300 mt-1">Type: Élément de fond</div>
        `
        }

        tooltipRef.current.innerHTML = tooltipContent
        tooltipRef.current.style.display = "block"
      }

      // Changer le curseur
      document.body.style.cursor = "pointer"
    },
    [resetHighlight],
  )

  // Initialisation de Three.js
  useEffect(() => {
    if (!containerRef.current) return

    // Nettoyer toute scène précédente et vider le conteneur
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }

    // Créer la scène avec un fond noir
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    // Créer la caméra
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15
    cameraRef.current = camera

    // Créer le renderer avec antialiasing pour des lignes plus lisses
    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      })
      console.log("Dimensions du conteneur pour Three.js:", containerRef.current.clientWidth, "x", containerRef.current.clientHeight);
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer
    } catch (error) {
      console.error("Erreur lors de la création du renderer WebGL:", error)

      // Afficher un message d'erreur dans le conteneur
      if (containerRef.current) {
        const errorMessage = document.createElement("div")
        errorMessage.className = "flex items-center justify-center w-full h-screen bg-black text-white text-center p-4"
        errorMessage.innerHTML = `
          <div>
            <h2 class="text-xl font-bold mb-2">Erreur de rendu 3D</h2>
            <p>Votre navigateur ne semble pas prendre en charge WebGL correctement.</p>
            <p class="mt-2">Essayez d'utiliser un navigateur plus récent ou de vérifier vos paramètres graphiques.</p>
          </div>
        `
        containerRef.current.appendChild(errorMessage)
      }

      return // Sortir de l'effet si le renderer ne peut pas être créé
    }

    // Créer un élément HTML pour l'info-bulle
    const tooltip = document.createElement("div")
    tooltip.className = "absolute hidden bg-black/80 text-white p-2 rounded-md text-sm z-50 pointer-events-none"
    tooltip.style.border = "1px solid rgba(255, 255, 255, 0.2)"
    tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
    tooltip.style.minWidth = "150px"
    containerRef.current.appendChild(tooltip)
    tooltipRef.current = tooltip

    // Ajouter les lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffffff, 1)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    // Créer un groupe pour la sphère et les montagnes
    const sphereGroup = new THREE.Group()
    scene.add(sphereGroup)
    sphereGroupRef.current = sphereGroup

    // Créer la sphère de base en wireframe avec un dégradé de couleurs
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32)
    const sphereEdges = new THREE.EdgesGeometry(sphereGeometry)

    // Créer un tableau de couleurs pour les arêtes de la sphère
    const sphereColors = new Float32Array(sphereEdges.attributes.position.count * 3)

    for (let i = 0; i < sphereEdges.attributes.position.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(sphereEdges.attributes.position, i)

      // Normaliser la position y pour déterminer la couleur
      const normalizedY = (vertex.y + 5) / 10 // Entre 0 et 1

      const color = new THREE.Color()

      if (normalizedY < 0.25) {
        color.lerpColors(COLORS.darkBlue, COLORS.mediumBlue, normalizedY * 4)
      } else if (normalizedY < 0.5) {
        color.lerpColors(COLORS.mediumBlue, COLORS.tealBlue, (normalizedY - 0.25) * 4)
      } else if (normalizedY < 0.75) {
        color.lerpColors(COLORS.tealBlue, COLORS.teal, (normalizedY - 0.5) * 4)
      } else {
        color.lerpColors(COLORS.teal, COLORS.lightGreen, (normalizedY - 0.75) * 4)
      }

      sphereColors[i * 3] = color.r
      sphereColors[i * 3 + 1] = color.g
      sphereColors[i * 3 + 2] = color.b
    }

    sphereEdges.setAttribute("color", new THREE.BufferAttribute(sphereColors, 3))

    const sphereMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity: 0.3,
      transparent: true,
    })

    const sphereWireframe = new THREE.LineSegments(sphereEdges, sphereMaterial)
    sphereGroup.add(sphereWireframe)
    sphereWireframeRef.current = sphereWireframe

    // Créer les montagnes sur la sphère
    try {
      createGradientOutlineMountainsOnSphere(sphereGroup)
    } catch (error) {
      console.error("Erreur lors de la création des montagnes:", error)
      // Continuer avec la sphère de base si la création des montagnes échoue
    }

    // Ajouter les contrôles OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Détecter le début et la fin des mouvements
    controls.addEventListener("start", () => {
      setIsMoving(true)
      // Nettoyer tout timeout existant
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }
    })

    controls.addEventListener("end", () => {
      // Ne pas désactiver immédiatement le mouvement, mais définir un délai
      // pour éviter les clics accidentels juste après l'arrêt du mouvement
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }

      // Enregistrer le moment où le mouvement s'est arrêté
      setLastMoveTime(Date.now())

      // Définir un délai avant de considérer que l'utilisateur a vraiment arrêté de bouger
      moveTimeoutRef.current = setTimeout(() => {
        setIsMoving(false)
      }, 300) // 300ms de délai
    })

    // Raycaster pour la détection de survol
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line = { threshold: 0.2 } // Augmenter le seuil pour faciliter la sélection des lignes
    const mouse = new THREE.Vector2()

    // Remplacer le gestionnaire d'événement handleClick par cette version améliorée
    const handleClick = (event: MouseEvent) => {
      // Ne pas traiter si les contrôles sont désactivés ou si un profil est déjà ouvert
      if (!controlsEnabled || selectedTrajectory) {
        return
      }

      // Vérifier si c'est un clic qui fait partie d'un mouvement de glissement
      if (isDraggingRef.current) {
        // Réinitialiser l'état de glissement mais ne pas traiter le clic
        isDraggingRef.current = false
        mouseStartPosRef.current = null
        return
      }

      // Vérifier si le clic est trop proche du dernier mouvement
      const timeSinceLastMove = Date.now() - lastMoveTime
      if (timeSinceLastMove < 500) {
        // Augmenté à 500ms pour plus de sécurité
        return
      }

      // Vérifier si c'est un double-clic accidentel
      const now = Date.now()
      if (now - lastClickTimeRef.current < 300) {
        lastClickTimeRef.current = now
        return
      }
      lastClickTimeRef.current = now

      // Calculer la position normalisée de la souris
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Mettre à jour le raycaster
      raycaster.setFromCamera(mouse, camera)

      // Trouver les intersections avec les objets de la scène
      const intersects = raycaster.intersectObjects(scene.children, true)

      // Vérifier s'il y a des intersections
      if (intersects.length > 0) {
        // Trouver le premier objet qui est une ligne
        for (const intersect of intersects) {
          const object = intersect.object
          if (object instanceof THREE.Line && object.userData.isOutline) {
            // Récupérer le groupe parent
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              const metadata = parentGroup.userData

              // Ouvrir le profil uniquement si c'est une trajectoire ou un événement
              if (metadata.type === "trajectory") {
                setSelectedTrajectory(metadata.data)
                setControlsEnabled(false) // Désactiver les contrôles pendant que le modal est ouvert
                return
              }
            }
          }
        }
      }
    }

    // Ajouter ces nouveaux gestionnaires d'événements pour détecter les mouvements de glissement
    const handleMouseDown = (event: MouseEvent) => {
      if (!controlsEnabled || selectedTrajectory) return

      mouseStartPosRef.current = { x: event.clientX, y: event.clientY }
      isDraggingRef.current = false
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!controlsEnabled || selectedTrajectory) {
        return
      }

      // Détecter si l'utilisateur est en train de faire glisser la souris
      if (mouseStartPosRef.current) {
        const dx = Math.abs(event.clientX - mouseStartPosRef.current.x)
        const dy = Math.abs(event.clientY - mouseStartPosRef.current.y)

        // Si le mouvement dépasse un certain seuil, considérer comme un glissement
        if (dx > 5 || dy > 5) {
          isDraggingRef.current = true
          // Réinitialiser la surbrillance pendant le glissement
          resetHighlight()
          // Mettre à jour le temps du dernier mouvement
          setLastMoveTime(Date.now())
          return
        }
      }

      // Le reste du code de handleMouseMove pour la surbrillance
      if (isMoving) {
        // Si l'utilisateur est en mouvement, s'assurer que toute surbrillance est réinitialisée
        if (hoveredGroupRef.current) {
          resetHighlight()
        }
        return
      }

      // Calculer la position normalisée de la souris
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Mettre à jour le raycaster
      raycaster.setFromCamera(mouse, camera)

      // Trouver les intersections avec les objets de la scène
      const intersects = raycaster.intersectObjects(scene.children, true)

      // Vérifier s'il y a des intersections
      if (intersects.length > 0) {
        // Trouver le premier objet qui est une ligne
        for (const intersect of intersects) {
          const object = intersect.object
          if (object instanceof THREE.Line && object.userData.isOutline) {
            // Récupérer le groupe parent
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              highlightMountainGroup(parentGroup)

              // Positionner l'info-bulle près de la souris
              if (tooltipRef.current) {
                tooltipRef.current.style.left = `${event.clientX + 15}px`
                tooltipRef.current.style.top = `${event.clientY + 15}px`
              }

              return // Sortir après avoir trouvé le premier objet valide
            }
          }
        }
      }

      // Si aucun objet n'est survolé, réinitialiser la surbrillance
      resetHighlight()
    }

    const handleMouseUp = () => {
      // Réinitialiser l'état de glissement après un court délai
      setTimeout(() => {
        mouseStartPosRef.current = null
        if (isDraggingRef.current) {
          isDraggingRef.current = false
          // Mettre à jour le temps du dernier mouvement
          setLastMoveTime(Date.now())
        }
      }, 50)
    }

    // Remplacer les écouteurs d'événements existants par ceux-ci
    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("click", handleClick)

    // Fonction d'animation
    const animate = () => {
      console.log("animate: tick"); // LOG 2
      if (!isRendering) return

      animationFrameRef.current = requestAnimationFrame(animate)

      try {
        // Vérifier explicitement si isPaused est false avant de faire tourner la sphère
        if (controlsEnabled && sphereGroupRef.current && !isPaused) {
          console.log("animate: sphereGroupRef.current exists, attempting rotation", sphereGroupRef.current); // LOG 3
          sphereGroupRef.current.rotation.y += 0.0005 // Ajuster la vitesse de rotation
        }

        if (controlsRef.current) {
          controlsRef.current.update()
        }

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      } catch (error) {
        console.error("Erreur pendant l'animation:", error)
      }
    }

    animate()

    // Gestionnaire de redimensionnement
    const handleResize = () => {
      try {
        if (cameraRef.current && rendererRef.current && containerRef.current) { 
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix()
          rendererRef.current.setSize(newWidth, newHeight)
        }
      } catch (error) {
        console.error("Erreur lors du redimensionnement:", error)
      }
    }

    window.addEventListener("resize", handleResize)

    // Nettoyage
    return () => {
      setIsRendering(false)

      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("click", handleClick)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      if (containerRef.current && tooltipRef.current) {
        containerRef.current.removeChild(tooltipRef.current)
      }

      // Libérer les ressources
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      // Nettoyer les géométries et matériaux
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
            if (object.geometry) {
              object.geometry.dispose()
            }

            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            } else if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose())
            }
          }
        })
      }

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }
    }
  }, [createGradientOutlineMountainsOnSphere, highlightMountainGroup, resetHighlight])

  // Effet pour recréer les montagnes lorsque les filtres changent
  useEffect(() => {
    // Si les filtres ont changé et que la scène existe déjà, recréer les montagnes
    if ((currentFilterRef.current !== filter || currentSearchRef.current !== searchQuery) && sphereGroupRef.current) {
      // Mettre à jour les références des filtres actuels
      currentFilterRef.current = filter
      currentSearchRef.current = searchQuery

      // Supprimer toutes les montagnes existantes
      if (sphereGroupRef.current) {
        // Garder uniquement la sphère wireframe
        const wireframe = sphereWireframeRef.current

        // Supprimer tous les autres enfants
        while (sphereGroupRef.current.children.length > 0) {
          const child = sphereGroupRef.current.children[0]
          if (child !== wireframe) {
            sphereGroupRef.current.remove(child)
          } else if (sphereGroupRef.current.children.length > 1) {
            sphereGroupRef.current.remove(sphereGroupRef.current.children[1])
          } else {
            break
          }
        }

        // Recréer les montagnes avec les nouveaux filtres
        createGradientOutlineMountainsOnSphere(sphereGroupRef.current)
      }
    }
  }, [filter, searchQuery, createGradientOutlineMountainsOnSphere])

  // Effet pour réinitialiser la surbrillance lorsqu'un profil est ouvert ou fermé
  useEffect(() => {
    if (selectedTrajectory) {
      // Si un profil est ouvert, réinitialiser toute surbrillance
      resetHighlight()
      // S'assurer que le curseur est normal
      document.body.style.cursor = "auto"
    }
  }, [selectedTrajectory, resetHighlight])

  // Gestionnaire pour fermer le modal de profil
  const handleCloseProfile = () => {
    setSelectedTrajectory(null)
    setControlsEnabled(true) // Réactiver les contrôles
  }

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <Header isPaused={isPaused} togglePause={togglePause} totalCount={displayedCount} />
      {selectedTrajectory && <ProfileModal trajectory={selectedTrajectory} onClose={handleCloseProfile} />}
    </div>
  )
}
