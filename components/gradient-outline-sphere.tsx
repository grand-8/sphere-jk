"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMockData } from "@/lib/data-generator"
import { ProfileModal } from "@/components/profile-modal"
import type { LifeTrajectory } from "@/lib/data-generator"
import { ZoomIn, ZoomOut, AlertTriangle } from "lucide-react"
import { useLifeTrajectoryStore } from "@/lib/store"
import { SearchInput } from "@/components/search-input"
import { Counter } from "@/components/counter"

const trajectoryData = generateMockData(400)

const COLORS = {
  darkBlue: new THREE.Color("#1a2b4d"),
  mediumBlue: new THREE.Color("#2d4b6e"),
  tealBlue: new THREE.Color("#3d6b7c"),
  teal: new THREE.Color("#4d8a7a"),
  lightGreen: new THREE.Color("#7ab555"),
  highlight: new THREE.Color("#ffffff"),
}

const CAMERA_POSITIONS = {
  DEFAULT: 7,
  CENTER: 0,
}

// Nombre minimum de trajectoires à afficher pour éviter une sphère vide
const MIN_TRAJECTORIES = 10

// Fonction pour vérifier si les coordonnées sont dans une zone protégée
function isInProtectedZone(x: number, y: number): boolean {
  // Zone en haut à gauche (compteur)
  if (x < 200 && y < 100) return true

  // Zone en haut à droite (recherche et zoom)
  if (x > window.innerWidth - 350 && y < 100) return true

  return false
}

export default function GradientOutlineSphere() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hoveredGroupRef = useRef<THREE.Group | null>(null)
  const originalMaterialsRef = useRef<Map<THREE.Object3D, THREE.Material>>(new Map())
  const [selectedTrajectory, setSelectedTrajectory] = useState<LifeTrajectory | null>(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [isZoomedIn, setIsZoomedIn] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [lastMoveTime, setLastMoveTime] = useState(0)
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const lastClickTimeRef = useRef(0)
  const backgroundMountainMap = useRef<Map<number, LifeTrajectory>>(new Map())
  const mountainCountRef = useRef<number>(0)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sphereGroupRef = useRef<THREE.Group | null>(null)
  const { setSelectedPerson, filteredTrajectories, searchQuery } = useLifeTrajectoryStore()
  // État pour le chargement des montagnes
  const [isUpdatingMountains, setIsUpdatingMountains] = useState(false)
  // Nouvel état pour les erreurs de filtrage
  const [filterError, setFilterError] = useState<string | null>(null)
  // État pour suivre si le filtrage est actif
  const [isFilterActive, setIsFilterActive] = useState(false)
  // Référence pour éviter les mises à jour inutiles
  const lastFilteredCountRef = useRef<number>(trajectoryData.length)
  // Référence pour le timeout de debounce
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetHighlight = useCallback(() => {
    if (!hoveredGroupRef.current) return

    hoveredGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Line) {
        const originalMaterial = originalMaterialsRef.current.get(child)
        if (originalMaterial) {
          child.material = originalMaterial
        }
      }
    })

    originalMaterialsRef.current.clear()
    hoveredGroupRef.current = null

    if (tooltipRef.current) {
      tooltipRef.current.style.display = "none"
    }

    document.body.style.cursor = "auto"
  }, [])

  const clearMountains = useCallback((parent: THREE.Group) => {
    // Trouver tous les objets qui sont des montagnes
    const mountainsToRemove: THREE.Object3D[] = []

    parent.traverse((child) => {
      // Vérifier si c'est une montagne (a des métadonnées de type "trajectory")
      if (child instanceof THREE.Group && child.userData && child.userData.type === "trajectory") {
        mountainsToRemove.push(child)
      }
    })

    // Supprimer toutes les montagnes trouvées
    for (const mountain of mountainsToRemove) {
      // Disposer des géométries et matériaux pour éviter les fuites de mémoire
      mountain.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) {
            child.geometry.dispose()
          }

          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          } else if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose())
          }
        }
      })

      // Retirer du parent
      parent.remove(mountain)
    }

    // Réinitialiser les compteurs et références
    mountainCountRef.current = 0
    backgroundMountainMap.current.clear()
  }, [])

  /**
   * Met à jour les montagnes affichées sur la sphère en fonction des trajectoires fournies
   * @param trajectories - Les trajectoires à afficher
   * @returns Une promesse qui se résout lorsque la mise à jour est terminée
   */
  const updateMountains = useCallback(
    async (trajectories: LifeTrajectory[]) => {
      if (!sphereGroupRef.current || !isRendering) {
        console.warn("updateMountains: Impossible de mettre à jour les montagnes, la sphère n'est pas initialisée")
        return
      }

      // Vérifier si les trajectoires sont valides
      if (!trajectories || !Array.isArray(trajectories)) {
        console.error("updateMountains: Trajectoires invalides")
        setFilterError("Données de trajectoires invalides")
        return
      }

      // Vérifier si le nombre de trajectoires est suffisant
      if (trajectories.length < MIN_TRAJECTORIES) {
        console.warn(
          `updateMountains: Trop peu de trajectoires (${trajectories.length}), utilisation des données complètes`,
        )
        setFilterError(`Trop peu de résultats (${trajectories.length}), affichage de toutes les trajectoires`)
        // Utiliser toutes les trajectoires comme fallback
        trajectories = trajectoryData
      } else {
        // Effacer l'erreur si tout va bien
        setFilterError(null)
      }

      // Activer l'état de chargement
      setIsUpdatingMountains(true)

      try {
        // Attendre le prochain cycle de rendu pour que l'état de chargement soit visible
        await new Promise((resolve) => setTimeout(resolve, 0))

        // Nettoyer les montagnes existantes
        clearMountains(sphereGroupRef.current)

        // Attendre un court instant pour permettre au navigateur de respirer
        await new Promise((resolve) => setTimeout(resolve, 50))

        // Créer de nouvelles montagnes avec les trajectoires filtrées
        const radius = 5 // Même rayon que dans createGradientOutlineMountainsOnSphere
        addTrajectoryMountains(sphereGroupRef.current, radius, trajectories)

        // Mettre à jour la référence pour éviter les mises à jour inutiles
        lastFilteredCountRef.current = trajectories.length

        // Attendre que le rendu soit terminé (approximativement)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error("Erreur lors de la mise à jour des montagnes:", error)
        setFilterError("Erreur lors de la mise à jour visuelle")

        // En cas d'erreur, essayer de restaurer l'affichage complet
        try {
          if (sphereGroupRef.current) {
            clearMountains(sphereGroupRef.current)
            addTrajectoryMountains(sphereGroupRef.current, 5, trajectoryData)
          }
        } catch (fallbackError) {
          console.error("Erreur lors de la restauration de l'affichage:", fallbackError)
        }
      } finally {
        // Désactiver l'état de chargement
        setIsUpdatingMountains(false)
      }
    },
    [clearMountains, isRendering],
  )

  // Effet pour surveiller les changements dans filteredTrajectories et mettre à jour les montagnes
  useEffect(() => {
    // Éviter les mises à jour inutiles
    if (
      lastFilteredCountRef.current === filteredTrajectories.length &&
      !isFilterActive &&
      filteredTrajectories.length === trajectoryData.length
    ) {
      return
    }

    // Déterminer si le filtrage est actif
    const newIsFilterActive = searchQuery.trim().length > 0
    setIsFilterActive(newIsFilterActive)

    // Debounce pour éviter trop de mises à jour rapides
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      // Mettre à jour les montagnes avec les trajectoires filtrées
      updateMountains(filteredTrajectories)
    }, 300) // Délai de debounce

    // Nettoyage
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [filteredTrajectories, searchQuery, updateMountains])

  function createGradientOutlineMountainsOnSphere(parent: THREE.Group) {
    const radius = 5
    // Utiliser la nouvelle fonction avec trajectoryData comme argument
    addTrajectoryMountains(parent, radius, trajectoryData)
  }

  const performZoom = (zoomIn: boolean, onComplete?: () => void) => {
    if (!cameraRef.current || !controlsRef.current) return

    setIsZoomedIn(zoomIn)

    // NOUVEAU: Configurer minDistance AVANT l'animation pour le zoom-in
    if (zoomIn && controlsRef.current) {
      controlsRef.current.minDistance = 0.1
      controlsRef.current.maxDistance = 20
    }

    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }

    const targetPosition = zoomIn
      ? new THREE.Vector3(0, 0, CAMERA_POSITIONS.CENTER)
      : new THREE.Vector3(0, 0, CAMERA_POSITIONS.DEFAULT)

    const startPosition = new THREE.Vector3().copy(cameraRef.current.position)
    const startTime = Date.now()
    const duration = 1500

    const animateZoom = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const easedProgress = easeOutCubic(progress)

      const newPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easedProgress)

      if (cameraRef.current) {
        cameraRef.current.position.copy(newPosition)
      }

      if (progress < 1) {
        requestAnimationFrame(animateZoom)
      } else {
        if (controlsRef.current) {
          if (zoomIn) {
            // Pour le zoom-in, juste réactiver les contrôles
            setTimeout(() => {
              if (controlsRef.current && isRendering) {
                controlsRef.current.enabled = true
                setControlsEnabled(true)

                // Appeler onComplete seulement après tout le reste
                if (onComplete) onComplete()
              }
            }, 100)
          } else {
            // Le code pour zoom out reste inchangé
            controlsRef.current.minDistance = 5
            controlsRef.current.maxDistance = 20

            controlsRef.current.reset()

            if (cameraRef.current) {
              cameraRef.current.position.set(0, 0, CAMERA_POSITIONS.DEFAULT)
              cameraRef.current.lookAt(0, 0, 0)
            }

            controlsRef.current.target.set(0, 0, 0)

            setTimeout(() => {
              if (controlsRef.current && isRendering) {
                controlsRef.current.enabled = true
                controlsRef.current.update()
                setControlsEnabled(true)
              }
            }, 100)

            // Appeler onComplete immédiatement pour le zoom-out
            if (onComplete) onComplete()
          }
        }
      }
    }

    animateZoom()
  }

  const handleCloseProfile = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setControlsEnabled(false)

    if (isZoomedIn) {
      performZoom(false, () => {
        setSelectedTrajectory(null)
      })
    } else {
      setSelectedTrajectory(null)
      setControlsEnabled(true)
    }
  }

  // Fonction améliorée pour arrêter la propagation des événements UI
  const handleUIEvent = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = CAMERA_POSITIONS.DEFAULT
    cameraRef.current = camera

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer
    } catch (error) {
      console.error("Erreur lors de la création du renderer WebGL:", error)

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

      return
    }

    const tooltip = document.createElement("div")
    tooltip.className = "absolute hidden bg-black/80 text-white p-2 rounded-md text-sm z-50 pointer-events-none"
    tooltip.style.border = "1px solid rgba(255, 255, 255, 0.2)"
    tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
    tooltip.style.minWidth = "150px"
    containerRef.current.appendChild(tooltip)
    tooltipRef.current = tooltip

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffffff, 1)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const sphereGroup = new THREE.Group()
    scene.add(sphereGroup)
    sphereGroupRef.current = sphereGroup

    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32)
    const sphereEdges = new THREE.EdgesGeometry(sphereGeometry)

    const sphereColors = new Float32Array(sphereEdges.attributes.position.count * 3)

    for (let i = 0; i < sphereEdges.attributes.position.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(sphereEdges.attributes.position, i)

      const normalizedY = (vertex.y + 5) / 10

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

    try {
      createGradientOutlineMountainsOnSphere(sphereGroup)
    } catch (error) {
      console.error("Erreur lors de la création des montagnes:", error)
    }

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 0.1
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    controls.addEventListener("start", () => {
      setIsMoving(true)
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }
    })

    controls.addEventListener("end", () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }

      setLastMoveTime(Date.now())
      moveTimeoutRef.current = setTimeout(() => {
        setIsMoving(false)
      }, 300)
    })

    const raycaster = new THREE.Raycaster()
    raycaster.params.Line = { threshold: 0.2 }
    const mouse = new THREE.Vector2()

    const handleClick = (event: MouseEvent) => {
      // Vérifier si l'événement provient d'un élément UI
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return // Sortir immédiatement
      }

      // Vérifier si les coordonnées sont dans une zone protégée
      if (isInProtectedZone(event.clientX, event.clientY)) {
        return // Sortir immédiatement
      }

      if (!controlsEnabled) {
        return
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false
        mouseStartPosRef.current = null
        return
      }

      const timeSinceLastMove = Date.now() - lastMoveTime
      if (timeSinceLastMove < 500) {
        return
      }

      const now = Date.now()
      if (now - lastClickTimeRef.current < 300) {
        lastClickTimeRef.current = now
        return
      }
      lastClickTimeRef.current = now

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const intersects = raycaster.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        for (const intersect of intersects) {
          const object = intersect.object
          if (object instanceof THREE.Line && object.userData.isOutline) {
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              const metadata = parentGroup.userData

              if (metadata.type === "trajectory") {
                const trajectory = metadata.data

                if (!isZoomedIn) {
                  setControlsEnabled(false)
                  performZoom(true, () => {
                    setSelectedTrajectory(trajectory)
                  })
                } else {
                  setSelectedTrajectory(trajectory)
                }
                return
              }
            }
          }
        }
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      // Vérifier si l'événement provient d'un élément UI
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return // Sortir immédiatement sans rien faire d'autre
      }

      // Vérifier si les coordonnées sont dans une zone protégée
      if (isInProtectedZone(event.clientX, event.clientY)) {
        return // Sortir immédiatement
      }

      if (!controlsEnabled || selectedTrajectory) return

      mouseStartPosRef.current = { x: event.clientX, y: event.clientY }
      isDraggingRef.current = false
    }

    const handleMouseMove = (event: MouseEvent) => {
      // Vérifier si l'événement provient d'un élément UI
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return // Sortir immédiatement
      }

      // Vérifier si les coordonnées sont dans une zone protégée
      if (isInProtectedZone(event.clientX, event.clientY)) {
        // Réinitialiser le surlignage si la souris entre dans une zone protégée
        if (hoveredGroupRef.current) {
          resetHighlight()
        }
        return // Sortir immédiatement
      }

      if (!controlsEnabled || selectedTrajectory) {
        return
      }

      if (mouseStartPosRef.current) {
        const dx = Math.abs(event.clientX - mouseStartPosRef.current.x)
        const dy = Math.abs(event.clientY - mouseStartPosRef.current.y)

        if (dx > 5 || dy > 5) {
          isDraggingRef.current = true
          resetHighlight()
          setLastMoveTime(Date.now())
          return
        }
      }

      if (isMoving) {
        if (hoveredGroupRef.current) {
          resetHighlight()
        }
        return
      }

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const intersects = raycaster.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        for (const intersect of intersects) {
          const object = intersect.object
          if (object instanceof THREE.Line && object.userData.isOutline) {
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              highlightMountainGroup(parentGroup)

              if (tooltipRef.current) {
                tooltipRef.current.style.left = `${event.clientX + 15}px`
                tooltipRef.current.style.top = `${event.clientY + 15}px`
              }

              return
            }
          }
        }
      }

      resetHighlight()
    }

    const handleMouseUp = (event: MouseEvent) => {
      // Vérifier si l'événement provient d'un élément UI
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return // Sortir immédiatement
      }

      // Vérifier si les coordonnées sont dans une zone protégée
      if (isInProtectedZone(event.clientX, event.clientY)) {
        return // Sortir immédiatement
      }

      setTimeout(() => {
        mouseStartPosRef.current = null
        if (isDraggingRef.current) {
          isDraggingRef.current = false
          setLastMoveTime(Date.now())
        }
      }, 50)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Si un élément de formulaire a le focus, ne rien faire
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.tagName === "SELECT")
      ) {
        return
      }

      // Traiter les événements clavier pour ThreeJS si nécessaire
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("click", handleClick)
    window.addEventListener("keydown", handleKeyDown)

    const animate = () => {
      if (!isRendering) return

      animationFrameRef.current = requestAnimationFrame(animate)

      try {
        if (controlsEnabled) {
          sphereGroup.rotation.y += 0.001
        }

        controls.update()
        renderer.render(scene, camera)
      } catch (error) {
        console.error("Erreur pendant l'animation:", error)
      }
    }

    animate()

    const handleResize = () => {
      try {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      } catch (error) {
        console.error("Erreur lors du redimensionnement:", error)
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      setIsRendering(false)

      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("keydown", handleKeyDown)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      if (containerRef.current && tooltipRef.current) {
        containerRef.current.removeChild(tooltipRef.current)
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

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

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [clearMountains, resetHighlight])

  useEffect(() => {
    if (selectedTrajectory) {
      resetHighlight()
      document.body.style.cursor = "auto"
    }
  }, [selectedTrajectory, resetHighlight])

  const highlightMountainGroup = (group: THREE.Group) => {
    if (hoveredGroupRef.current === group) return

    resetHighlight()

    hoveredGroupRef.current = group

    group.traverse((child) => {
      if (child instanceof THREE.Line) {
        originalMaterialsRef.current.set(child, child.material)

        const highlightMaterial = new THREE.LineBasicMaterial({
          color: COLORS.highlight,
          transparent: true,
          opacity: 1.0,
          linewidth: 2,
        })

        child.material = highlightMaterial
      }
    })

    if (tooltipRef.current) {
      const metadata = group.userData
      let tooltipContent = ""

      if (metadata.type === "trajectory") {
        const trajectory = metadata.data
        tooltipContent = `
          <div class="font-bold text-base">${trajectory.name}</div>
          <div class="text-xs text-gray-300 mt-1">Catégorie: ${trajectory.category}</div>
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

    document.body.style.cursor = "pointer"
  }

  const addTrajectoryMountains = (parent: THREE.Group, radius: number, trajectories: LifeTrajectory[]) => {
    if (!trajectories || !Array.isArray(trajectories) || trajectories.length === 0) {
      console.warn("addTrajectoryMountains: Aucune trajectoire valide fournie")
      return
    }

    const totalTrajectories = trajectories.length
    const minDistanceBetweenMountains = Math.max(0.3, 0.6 - totalTrajectories / 1000)
    const baseMountainWidth = Math.max(0.5, 0.8 - totalTrajectories / 2000)
    let trajectoryIndex = 0
    const trajectoryBatchSize = 20
    const usedPositions: THREE.Vector3[] = []

    function createTrajectoryBatch() {
      const endIndex = Math.min(trajectoryIndex + trajectoryBatchSize, totalTrajectories)

      for (let i = trajectoryIndex; i < endIndex; i++) {
        try {
          const trajectory = trajectories[i]
          const phi = Math.acos(1 - 2 * ((i + 0.5) / totalTrajectories))
          const theta = 2 * Math.PI * i * (1 / 1.618033988749895)
          const x = radius * Math.sin(phi) * Math.cos(theta)
          const y = radius * Math.sin(phi) * Math.sin(theta)
          const z = radius * Math.cos(phi)
          const position = new THREE.Vector3(x, y, z)
          let tooClose = false
          for (const usedPos of usedPositions) {
            if (position.distanceTo(usedPos) < minDistanceBetweenMountains) {
              tooClose = true
              break
            }
          }

          if (tooClose) {
            let foundPosition = false
            for (let attempt = 0; attempt < 10; attempt++) {
              const randPhi = Math.acos(2 * Math.random() - 1)
              const randTheta = 2 * Math.PI * Math.random()
              const newX = radius * Math.sin(randPhi) * Math.cos(randTheta)
              const newY = radius * Math.sin(randPhi) * Math.sin(randTheta)
              const newZ = radius * Math.cos(randPhi)
              const newPosition = new THREE.Vector3(newX, newY, newZ)
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

            if (!foundPosition) {
              console.log(`Position sous-optimale pour la montagne ${i}, mais on la place quand même`)
            }
          }

          usedPositions.push(position.clone())
          const normal = position.clone().normalize()
          const normalizedY = (position.y + radius) / (2 * radius)
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

          const maxScore = Math.max(...trajectory.points.map((p) => p.cumulativeScore))
          const heightFactor = Math.min(2, maxScore / 40) + 0.3

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
            baseMountainWidth,
          )
        } catch (error) {
          console.error(`Erreur lors du traitement de la trajectoire ${i}:`, error)
        }
      }

      trajectoryIndex = endIndex

      if (trajectoryIndex < totalTrajectories && isRendering) {
        setTimeout(createTrajectoryBatch, 0)
      }
    }

    createTrajectoryBatch()
  }

  const createGradientOutlineMountain = (
    position: THREE.Vector3,
    normal: THREE.Vector3,
    heightFactor: number,
    parent: THREE.Group,
    color: THREE.Color,
    metadata: { name: string; type: string; data: any },
    opacity = 0.5,
    customBaseWidth?: number,
  ) => {
    const mountainGroup = new THREE.Group()
    mountainGroup.position.copy(position)
    mountainGroup.userData = metadata

    const worldUp = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    const rotationAxis = new THREE.Vector3().crossVectors(worldUp, normal).normalize()
    const angle = Math.acos(worldUp.dot(normal))

    if (rotationAxis.lengthSq() > 0.001) {
      quaternion.setFromAxisAngle(rotationAxis, angle)
    } else {
      if (normal.y < 0) {
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
      } else {
        quaternion.identity()
      }
    }

    mountainGroup.quaternion.copy(quaternion)

    const randomRotationGroup = new THREE.Group()
    const randomXAngle = ((Math.random() - 0.5) * Math.PI) / 32
    const randomYAngle = ((Math.random() - 0.5) * Math.PI) / 32
    randomRotationGroup.rotateX(randomXAngle)
    randomRotationGroup.rotateY(randomYAngle)
    mountainGroup.add(randomRotationGroup)

    const height = (0.3 + heightFactor * 1.2) / 3
    const baseWidth = customBaseWidth || 0.7 + Math.random() * 0.4

    const points: THREE.Vector3[] = []
    const colors: number[] = []

    points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))
    colors.push(color.r, color.g, color.b)

    if (metadata.type === "trajectory" && metadata.data.points && metadata.data.points.length > 1) {
      const trajectory = metadata.data
      const dataPoints = trajectory.points
      const segmentWidth = baseWidth / (dataPoints.length - 1)
      const maxCumulativeScore = Math.max(...dataPoints.map((p) => p.cumulativeScore))
      const effectiveMaxScore = Math.max(maxCumulativeScore, 20)

      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i]
        let x = -baseWidth / 2 + i * segmentWidth

        if (i > 0 && i < dataPoints.length - 1) {
          const distanceFromCenter = Math.abs(i - (dataPoints.length - 1) / 2) / ((dataPoints.length - 1) / 2)
          const maxVariation = segmentWidth * 0.3 * (1 - distanceFromCenter)
          x += (Math.random() - 0.5) * maxVariation
        }

        const normalizedHeight = point.cumulativeScore / effectiveMaxScore
        let peakHeight = height * Math.max(0.15, normalizedHeight * 0.8)

        if (i > 0 && i < dataPoints.length - 1) {
          const variation = (point.score / 10) * 0.15
          peakHeight += variation
        }

        const y = i === 0 || i === dataPoints.length - 1 ? 0 : Math.abs(peakHeight)

        points.push(new THREE.Vector3(x, y, 0))

        const pointColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), normalizedHeight * 0.3)
        colors.push(pointColor.r, pointColor.g, pointColor.b)
      }
    } else {
      const segments = 4 + Math.floor(Math.random() * 3)
      const segmentWidth = baseWidth / segments

      for (let i = 1; i <= segments; i++) {
        let x = -baseWidth / 2 + i * segmentWidth

        if (i > 0 && i < segments) {
          const distanceFromCenter = Math.abs(i - segments / 2) / (segments / 2)

          const maxVariation = segmentWidth * 0.4 * (1 - distanceFromCenter)
          x += (Math.random() - 0.5) * maxVariation
        }

        if (i === segments) {
          points.push(new THREE.Vector3(baseWidth / 2, 0, 0))
          colors.push(color.r, color.g, color.b)
        } else {
          const peakHeight = height * (0.4 + Math.random() * 0.4)

          if (i % 2 === 1) {
            points.push(new THREE.Vector3(x, Math.abs(peakHeight), 0))

            const peakColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3)
            colors.push(peakColor.r, peakColor.g, peakColor.b)
          } else {
            const valleyHeight = peakHeight * (0.4 + Math.random() * 0.2)
            points.push(new THREE.Vector3(x, Math.abs(valleyHeight), 0))

            const valleyColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15)
            colors.push(valleyColor.r, valleyColor.g, valleyColor.b)
          }
        }
      }
    }

    points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))
    colors.push(color.r, color.g, color.b)

    for (let i = 0; i < points.length; i++) {
      if (points[i].y < 0) {
        points[i].y = Math.abs(points[i].y)
      }
    }

    const basePoints = [0, points.length - 2, points.length - 1]
    for (let i = 0; i < points.length; i++) {
      if (basePoints.includes(i) || Math.abs(points[i].y) < 0.01) {
        points[i].y = 0
      }
    }

    points[0].y = 0
    points[points.length - 1].y = 0

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const colorArray = new Float32Array(colors)
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      linewidth: 1,
    })

    const outline = new THREE.Line(geometry, material)
    outline.userData = { isOutline: true, parentGroup: mountainGroup }

    const depthPointsArray: THREE.Vector3[] = []
    const depthColorsArray: number[] = []
    const depth = 0.08 + Math.random() * 0.12

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      depthPointsArray.push(new THREE.Vector3(point.x, point.y, depth))
      depthColorsArray.push(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2])
    }

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

    for (let i = 0; i < points.length - 1; i += Math.max(1, Math.floor(points.length / 8))) {
      const verticalPoints = [
        new THREE.Vector3(points[i].x, points[i].y, 0),
        new THREE.Vector3(points[i].x, points[i].y, depth),
      ]

      const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints)

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

    randomRotationGroup.add(outline)
    randomRotationGroup.add(depthOutline)
    parent.add(mountainGroup)
  }

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      <div className="fixed inset-0 pointer-events-none">
        {/* Compteur en haut à gauche */}
        <div className="absolute top-4 left-4 pointer-events-auto z-50" style={{ isolation: "isolate" }}>
          <Counter />
        </div>

        {/* Barre de recherche et zoom en haut à droite */}
        <div
          className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto"
          style={{ isolation: "isolate" }}
          data-ui-element="true"
        >
          <SearchInput onMouseDown={handleUIEvent} onMouseMove={handleUIEvent} />
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              if (!isZoomedIn) {
                setControlsEnabled(false)
                performZoom(true, () => {
                  // Pas de setSelectedTrajectory pour la loupe
                })
              } else {
                setControlsEnabled(false)
                performZoom(false, () => {
                  // Zoom out pour la loupe
                })
              }
            }}
            onMouseDown={handleUIEvent}
            onMouseMove={handleUIEvent}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-colors shadow-lg border border-white/20 flex items-center justify-center"
            aria-label={isZoomedIn ? "Dézoomer" : "Zoomer"}
            data-ui-element="true"
          >
            {isZoomedIn ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
        </div>
      </div>

      {/* Message d'erreur de filtrage */}
      {filterError && (
        <div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50 pointer-events-none"
          style={{ maxWidth: "90vw" }}
        >
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm">{filterError}</span>
        </div>
      )}

      {/* Indicateur de chargement pendant la mise à jour des montagnes */}
      {isUpdatingMountains && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <span className="text-white text-sm">Mise à jour en cours...</span>
          </div>
        </div>
      )}

      {selectedTrajectory && (
        <ProfileModal
          trajectory={selectedTrajectory}
          onClose={handleCloseProfile}
          onClick={handleUIEvent}
          onMouseDown={handleUIEvent}
          onMouseMove={handleUIEvent}
        />
      )}
    </div>
  )
}
