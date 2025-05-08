"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMockData, type LifeTrajectory } from "@/lib/data-generator"
import { useLifeTrajectoryStore } from "@/lib/store"

// Couleurs inspirées de l'image de référence
const COLORS = {
  blue: new THREE.Color("#3498db"),
  purple: new THREE.Color("#9b59b6"),
  pink: new THREE.Color("#e91e63"),
  orange: new THREE.Color("#f39c12"),
}

// Générer les données une seule fois en dehors du composant
const trajectoryData = generateMockData(200)

export default function LifeTrajectorySphere() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sphereRef = useRef<THREE.Mesh | null>(null)
  const mountainsRef = useRef<THREE.Group | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)

  const { filter, searchQuery, setSelectedPerson } = useLifeTrajectoryStore()

  // Initialisation de Three.js
  useEffect(() => {
    if (!containerRef.current) return

    // Créer la scène, la caméra et le renderer
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ajouter les lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffffff, 1)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5)
    pointLight2.position.set(-10, -10, -10)
    scene.add(pointLight2)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(0, 5, 5)
    scene.add(directionalLight)

    // Créer la sphère avec gradient
    const sphereGeometry = new THREE.SphereGeometry(4.8, 64, 64)
    const sphereColors = new Float32Array(sphereGeometry.attributes.position.count * 3)

    for (let i = 0; i < sphereGeometry.attributes.position.count; i++) {
      const y = sphereGeometry.attributes.position.getY(i)
      const normalizedY = (y + 5) / 10 // Normaliser entre 0 et 1

      let color
      if (normalizedY < 0.33) {
        color = COLORS.blue.clone().lerp(COLORS.purple, normalizedY * 3)
      } else if (normalizedY < 0.66) {
        color = COLORS.purple.clone().lerp(COLORS.pink, (normalizedY - 0.33) * 3)
      } else {
        color = COLORS.pink.clone().lerp(COLORS.orange, (normalizedY - 0.66) * 3)
      }

      sphereColors[i * 3] = color.r
      sphereColors[i * 3 + 1] = color.g
      sphereColors[i * 3 + 2] = color.b
    }

    sphereGeometry.setAttribute("color", new THREE.BufferAttribute(sphereColors, 3))

    const sphereMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
    })

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)
    sphereRef.current = sphere

    // Créer un groupe pour les montagnes
    const mountains = new THREE.Group()
    scene.add(mountains)
    mountainsRef.current = mountains

    // Ajouter les contrôles OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Créer un élément HTML pour l'info-bulle
    const tooltip = document.createElement("div")
    tooltip.className = "absolute hidden bg-black/80 text-white p-2 rounded-md text-sm"
    tooltip.style.pointerEvents = "none"
    tooltip.style.zIndex = "1000"
    containerRef.current.appendChild(tooltip)
    tooltipRef.current = tooltip

    // Créer un élément HTML pour les détails
    const details = document.createElement("div")
    details.className =
      "absolute hidden top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xl bg-black/90 border border-gray-700 text-white p-4 rounded-lg z-50"
    containerRef.current.appendChild(details)
    detailsRef.current = details

    // Fonction d'animation
    const animate = () => {
      requestAnimationFrame(animate)

      if (sphereRef.current) {
        sphereRef.current.rotation.y += 0.002
      }

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      renderer.render(scene, camera)
    }

    animate()

    // Gestionnaire de redimensionnement
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    // Nettoyage
    return () => {
      window.removeEventListener("resize", handleResize)

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      if (tooltipRef.current && containerRef.current) {
        containerRef.current.removeChild(tooltipRef.current)
      }

      if (detailsRef.current && containerRef.current) {
        containerRef.current.removeChild(detailsRef.current)
      }

      rendererRef.current?.dispose()
      controlsRef.current?.dispose()
    }
  }, []) // Exécuté une seule fois à l'initialisation

  // Mettre à jour les montagnes en fonction des filtres
  useEffect(() => {
    if (!mountainsRef.current || !sceneRef.current) return

    // Filtrer les données
    const filteredTrajectories = trajectoryData
      .filter((trajectory) => {
        if (filter !== "all" && trajectory.category !== filter) return false
        if (searchQuery && !trajectory.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .slice(0, 100) // Limiter à 100 trajectoires

    // Supprimer les montagnes existantes
    while (mountainsRef.current.children.length > 0) {
      const child = mountainsRef.current.children[0]
      mountainsRef.current.remove(child)

      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        } else if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        }
      }
    }

    // Créer de nouvelles montagnes
    filteredTrajectories.forEach((trajectory, index) => {
      // Calculer la position sur la sphère
      const phi = ((trajectory.startYear - 2015) / 10) * Math.PI * 2 + (index % 20) * 0.1
      const theta = (index / filteredTrajectories.length) * Math.PI * 2

      const radius = 5 // Rayon de la sphère
      const height = Math.max(0.2, trajectory.maxHeight / 100) // Hauteur de la montagne

      // Créer un cône pour représenter la montagne
      const geometry = new THREE.ConeGeometry(0.05, height, 4)

      // Couleur basée sur la catégorie
      let color
      switch (trajectory.category) {
        case "education":
          color = COLORS.blue
          break
        case "career":
          color = COLORS.purple
          break
        case "entrepreneurship":
          color = COLORS.pink
          break
        case "health":
          color = COLORS.orange
          break
        default:
          color = COLORS.purple
      }

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
      })

      const cone = new THREE.Mesh(geometry, material)

      // Positionner le cône
      const x = radius * Math.sin(theta) * Math.cos(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(theta)

      cone.position.set(x, y, z)

      // Orienter le cône pour qu'il pointe vers l'extérieur
      cone.lookAt(0, 0, 0)
      cone.rotateX(Math.PI / 2)

      // Stocker les données de la trajectoire
      cone.userData = { trajectory }

      mountainsRef.current.add(cone)
    })
  }, [filter, searchQuery]) // Exécuté lorsque les filtres changent

  // Ajouter les gestionnaires d'événements pour l'interactivité
  useEffect(() => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current || !mountainsRef.current) return

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handleMouseMove = (event: MouseEvent) => {
      if (!tooltipRef.current || !cameraRef.current || !rendererRef.current) return

      // Calculer la position de la souris normalisée
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Mettre à jour le raycaster
      raycaster.setFromCamera(mouse, cameraRef.current)

      // Vérifier les intersections avec les montagnes
      const intersects = raycaster.intersectObjects(mountainsRef.current.children)

      if (intersects.length > 0) {
        const object = intersects[0].object
        if (object.userData.trajectory) {
          const trajectory = object.userData.trajectory as LifeTrajectory

          // Afficher l'info-bulle
          tooltipRef.current.textContent = trajectory.name
          tooltipRef.current.style.display = "block"
          tooltipRef.current.style.left = `${event.clientX}px`
          tooltipRef.current.style.top = `${event.clientY + 20}px`

          // Changer le curseur
          document.body.style.cursor = "pointer"
        }
      } else {
        // Cacher l'info-bulle
        tooltipRef.current.style.display = "none"

        // Réinitialiser le curseur
        document.body.style.cursor = "auto"
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (!detailsRef.current || !cameraRef.current) return

      // Calculer la position de la souris normalisée
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Mettre à jour le raycaster
      raycaster.setFromCamera(mouse, cameraRef.current)

      // Vérifier les intersections avec les montagnes
      const intersects = raycaster.intersectObjects(mountainsRef.current!.children)

      if (intersects.length > 0) {
        const object = intersects[0].object
        if (object.userData.trajectory) {
          const trajectory = object.userData.trajectory as LifeTrajectory

          // Afficher les détails
          detailsRef.current.innerHTML = `
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">${trajectory.name}</h2>
              <button id="close-details" class="text-gray-400 hover:text-white">✕</button>
            </div>
            <div>
              <p>Catégorie: ${trajectory.category}</p>
              <p>Début: ${trajectory.startYear}</p>
              <div class="mt-4">
                <h3 class="font-semibold mb-2">Parcours:</h3>
                <ul class="space-y-2">
                  ${trajectory.points
                    .map(
                      (point) => `
                    <li class="border-l-2 border-gray-700 pl-4 py-1">
                      <div class="flex justify-between">
                        <span>${point.year}</span>
                        <span class="${point.score > 0 ? "text-green-400" : "text-red-400"}">
                          ${point.score > 0 ? "+" : ""}${point.score}
                        </span>
                      </div>
                      <p class="text-gray-300">${point.event}</p>
                    </li>
                  `,
                    )
                    .join("")}
                </ul>
              </div>
            </div>
          `

          detailsRef.current.style.display = "block"

          // Ajouter un gestionnaire pour le bouton de fermeture
          const closeButton = document.getElementById("close-details")
          if (closeButton) {
            closeButton.addEventListener("click", () => {
              if (detailsRef.current) {
                detailsRef.current.style.display = "none"
              }
            })
          }

          // Mettre à jour l'état global
          setSelectedPerson(trajectory)
        }
      } else if (detailsRef.current.style.display === "block") {
        // Cliquer en dehors des détails les ferme
        detailsRef.current.style.display = "none"
        setSelectedPerson(null)
      }
    }

    // Ajouter les écouteurs d'événements
    containerRef.current.addEventListener("mousemove", handleMouseMove)
    containerRef.current.addEventListener("click", handleClick)

    // Nettoyage
    return () => {
      containerRef.current?.removeEventListener("mousemove", handleMouseMove)
      containerRef.current?.removeEventListener("click", handleClick)
    }
  }, [setSelectedPerson]) // Exécuté une seule fois

  return <div ref={containerRef} className="w-full h-screen relative" />
}
