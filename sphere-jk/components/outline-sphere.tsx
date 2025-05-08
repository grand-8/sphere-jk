"use client"

import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMockData } from "@/lib/data-generator"

// Générer les données une seule fois en dehors du composant
const trajectoryData = generateMockData(400)

export default function OutlineSphere() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Créer la scène
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    // Créer la caméra
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15

    // Créer le renderer avec antialiasing pour des lignes plus lisses
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

    // Ajouter les lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffffff, 1)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    // Créer un groupe pour la sphère et les montagnes
    const sphereGroup = new THREE.Group()
    scene.add(sphereGroup)

    // Créer la sphère de base en wireframe
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32)
    const sphereEdges = new THREE.EdgesGeometry(sphereGeometry)
    const sphereMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.3,
      transparent: true,
    })
    const sphereWireframe = new THREE.LineSegments(sphereEdges, sphereMaterial)
    sphereGroup.add(sphereWireframe)

    // Créer les montagnes sur la sphère
    try {
      createOutlineMountainsOnSphere(sphereGroup)
    } catch (error) {
      console.error("Erreur lors de la création des montagnes:", error)
      // Continuer avec la sphère de base si la création des montagnes échoue
    }

    // Fonction pour créer des montagnes en contour sur la sphère
    function createOutlineMountainsOnSphere(parent: THREE.Group) {
      const radius = 5 // Rayon de la sphère
      const mountainCount = 600 // Nombre total de montagnes

      // Créer les montagnes par lots pour éviter de bloquer le thread principal
      let currentIndex = 0

      function createMountainBatch() {
        const endIndex = Math.min(currentIndex + 50, mountainCount)

        // Distribuer les montagnes sur la sphère
        for (let i = currentIndex; i < endIndex; i++) {
          try {
            // Utiliser la distribution de Fibonacci pour une répartition uniforme sur la sphère
            const phi = Math.acos(1 - 2 * (i / mountainCount))
            const theta = Math.PI * 2 * i * (1 / 1.618033988749895) // Nombre d'or

            // Position sur la sphère
            const x = radius * Math.sin(phi) * Math.cos(theta)
            const y = radius * Math.sin(phi) * Math.sin(theta)
            const z = radius * Math.cos(phi)

            const position = new THREE.Vector3(x, y, z)
            const normal = position.clone().normalize()

            // Hauteur aléatoire pour les montagnes de base
            const heightFactor = Math.pow(Math.random(), 1.5) * 2 + 0.5 // Entre 0.5 et 2.5

            // Créer une montagne en contour
            createOutlineMountain(position, normal, heightFactor, parent)
          } catch (error) {
            console.error(`Erreur lors de la création de la montagne ${i}:`, error)
            // Continuer avec la montagne suivante
          }
        }

        currentIndex = endIndex

        // Si nous n'avons pas terminé, planifier le prochain lot
        if (currentIndex < mountainCount && isRendering) {
          setTimeout(createMountainBatch, 0)
        }

        // Ajouter des montagnes basées sur les données de trajectoire après avoir terminé les montagnes de base
        if (currentIndex >= mountainCount) {
          addTrajectoryMountains()
        }
      }

      // Commencer à créer les montagnes par lots
      createMountainBatch()

      // Fonction pour ajouter les montagnes basées sur les données de trajectoire
      function addTrajectoryMountains() {
        let trajectoryIndex = 0
        const trajectoryBatchSize = 20

        function createTrajectoryBatch() {
          const endIndex = Math.min(trajectoryIndex + trajectoryBatchSize, trajectoryData.length)

          for (let index = trajectoryIndex; index < endIndex; index++) {
            try {
              const trajectory = trajectoryData[index]
              if (index % 2 !== 0) continue // Utiliser seulement une partie des données pour ne pas surcharger

              // Calculer la position sur la sphère
              const phi = ((trajectory.startYear - 2015) / 10) * Math.PI * 2 + (index % 30) * 0.1
              const theta = (index / trajectoryData.length) * Math.PI * 2

              // Position sur la sphère
              const x = radius * Math.sin(theta) * Math.cos(phi)
              const y = radius * Math.sin(theta) * Math.sin(phi)
              const z = radius * Math.cos(theta)

              const position = new THREE.Vector3(x, y, z)
              const normal = position.clone().normalize()

              // Hauteur basée sur les données
              const maxScore = Math.max(...trajectory.points.map((p) => p.cumulativeScore))
              const heightFactor = Math.min(3, maxScore / 30) + 0.5

              // Créer une montagne principale en contour
              createOutlineMountain(position, normal, heightFactor, parent, 0.8) // Opacité plus élevée pour les montagnes importantes

              // Limiter le nombre de montagnes secondaires pour éviter la surcharge
              const significantPoints = trajectory.points
                .filter((point, i) => i === 0 || Math.abs(point.score) >= 10)
                .slice(0, 3) // Limiter à 3 points significatifs maximum

              // Créer des montagnes secondaires pour les événements importants
              significantPoints.forEach((point, i) => {
                if (i === 0) return // Sauter le premier point

                try {
                  // Calculer une position légèrement décalée
                  const offset = 0.1 + (i / trajectory.points.length) * 0.2
                  const offsetAngle = phi + (i / trajectory.points.length) * Math.PI * 0.5

                  const offsetX = x + Math.cos(offsetAngle) * offset
                  const offsetY = y + Math.sin(offsetAngle) * offset * 0.5
                  const offsetZ = z + Math.sin(offsetAngle + Math.PI / 2) * offset

                  const offsetPosition = new THREE.Vector3(offsetX, offsetY, offsetZ).normalize().multiplyScalar(radius)
                  const offsetNormal = offsetPosition.clone().normalize()

                  // Hauteur basée sur le score
                  const subHeightFactor = Math.min(2, point.cumulativeScore / 50) + 0.3

                  // Créer une montagne secondaire en contour
                  createOutlineMountain(offsetPosition, offsetNormal, subHeightFactor, parent, 0.6) // Opacité plus faible
                } catch (error) {
                  console.error(`Erreur lors de la création d'une montagne secondaire:`, error)
                  // Continuer avec le point suivant
                }
              })
            } catch (error) {
              console.error(`Erreur lors du traitement de la trajectoire ${index}:`, error)
              // Continuer avec la trajectoire suivante
            }
          }

          trajectoryIndex = endIndex

          // Si nous n'avons pas terminé et que le composant est toujours monté, planifier le prochain lot
          if (trajectoryIndex < trajectoryData.length && isRendering) {
            setTimeout(createTrajectoryBatch, 0)
          }
        }

        // Commencer à créer les montagnes de trajectoire par lots
        createTrajectoryBatch()
      }
    }

    // Fonction pour créer une montagne en contour (outline)
    function createOutlineMountain(
      position: THREE.Vector3,
      normal: THREE.Vector3,
      heightFactor: number,
      parent: THREE.Group,
      opacity = 0.5,
    ) {
      // Créer un groupe pour cette montagne
      const mountainGroup = new THREE.Group()
      mountainGroup.position.copy(position)

      // Calculer la rotation pour aligner avec la normale
      const upVector = new THREE.Vector3(0, 1, 0)
      mountainGroup.quaternion.setFromUnitVectors(upVector, normal)

      // Paramètres de la montagne
      const height = (0.5 + heightFactor * 1.5) / 3 // Hauteur réduite
      const baseWidth = 0.5 + Math.random() * 0.4 // Largeur de base

      // Créer les points du contour de la montagne
      const points: THREE.Vector3[] = []

      // Point de départ (coin gauche de la base)
      points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))

      // Nombre de segments pour le profil dentelé
      const segments = 4 + Math.floor(Math.random() * 3) // Entre 4 et 6 segments
      const segmentWidth = baseWidth / segments

      // Créer le profil dentelé
      for (let i = 1; i <= segments; i++) {
        const x = -baseWidth / 2 + i * segmentWidth

        if (i === segments) {
          // Dernier point (coin droit de la base)
          points.push(new THREE.Vector3(baseWidth / 2, 0, 0))
        } else {
          // Points intermédiaires (pics)
          const peakHeight = height * (0.5 + Math.random() * 0.5)

          // Si c'est un segment pair, on monte vers un pic
          if (i % 2 === 1) {
            points.push(new THREE.Vector3(x, peakHeight, 0))
          } else {
            // Si c'est un segment impair, on descend légèrement pour créer une vallée
            const valleyHeight = peakHeight * (0.4 + Math.random() * 0.2)
            points.push(new THREE.Vector3(x, valleyHeight, 0))
          }
        }
      }

      // Fermer le contour en revenant au point de départ
      points.push(new THREE.Vector3(-baseWidth / 2, 0, 0))

      // Créer la géométrie du contour
      const geometry = new THREE.BufferGeometry().setFromPoints(points)

      // Créer le matériau pour le contour
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: opacity,
        linewidth: 1,
      })

      // Créer la ligne du contour
      const outline = new THREE.Line(geometry, material)

      // Ajouter une profondeur au contour en créant une deuxième ligne décalée
      const depthPoints: THREE.Vector3[] = []
      const depth = 0.1 + Math.random() * 0.15

      for (const point of points) {
        depthPoints.push(new THREE.Vector3(point.x, point.y, depth))
      }

      const depthGeometry = new THREE.BufferGeometry().setFromPoints(depthPoints)
      const depthOutline = new THREE.Line(depthGeometry, material)

      // Ajouter les lignes verticales pour connecter les deux contours
      for (let i = 0; i < points.length - 1; i += Math.max(1, Math.floor(points.length / 8))) {
        const verticalPoints = [
          new THREE.Vector3(points[i].x, points[i].y, 0),
          new THREE.Vector3(points[i].x, points[i].y, depth),
        ]

        const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints)
        const verticalLine = new THREE.Line(verticalGeometry, material)

        mountainGroup.add(verticalLine)
      }

      mountainGroup.add(outline)
      mountainGroup.add(depthOutline)

      // Rotation aléatoire autour de l'axe normal pour plus de diversité
      mountainGroup.rotation.y = Math.random() * Math.PI * 2

      // Ajouter la montagne au parent
      parent.add(mountainGroup)
    }

    // Ajouter les contrôles OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Fonction d'animation
    const animate = () => {
      if (!isRendering) return

      animationFrameRef.current = requestAnimationFrame(animate)

      try {
        // Rotation du groupe
        sphereGroup.rotation.y += 0.001

        controls.update()
        renderer.render(scene, camera)
      } catch (error) {
        console.error("Erreur pendant l'animation:", error)
        // Continuer l'animation malgré l'erreur
      }
    }

    animate()

    // Gestionnaire de redimensionnement
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

    // Nettoyage
    return () => {
      setIsRendering(false)

      window.removeEventListener("resize", handleResize)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      // Libérer les ressources
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (controls) {
        controls.dispose()
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
    }
  }, []) // Exécuté une seule fois à l'initialisation

  return <div ref={containerRef} className="w-full h-screen" />
}
