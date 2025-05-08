"use client"

import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { generateMockData } from "@/lib/data-generator"

// Générer les données une seule fois en dehors du composant
const trajectoryData = generateMockData(400)

export default function EnhancedSphere() {
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

    // Créer le renderer avec antialiasing pour des bords plus lisses
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

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5)
    pointLight2.position.set(-10, -10, -10)
    scene.add(pointLight2)

    // Créer un groupe pour la sphère et les montagnes
    const sphereGroup = new THREE.Group()
    scene.add(sphereGroup)

    // Définir les couleurs du dégradé
    const colorBlue = new THREE.Color(0x3498db)
    const colorPurple = new THREE.Color(0x9b59b6)
    const colorPink = new THREE.Color(0xe91e63)
    const colorOrange = new THREE.Color(0xf39c12)

    // Créer la sphère de base avec un dégradé de couleurs
    const sphereGeometry = new THREE.SphereGeometry(5, 64, 64)
    const sphereColors = new Float32Array(sphereGeometry.attributes.position.count * 3)

    // Appliquer le dégradé de couleurs à la sphère
    for (let i = 0; i < sphereGeometry.attributes.position.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(sphereGeometry.attributes.position, i)
      vertex.normalize()

      // Utiliser l'angle dans le plan XZ pour déterminer la couleur
      const angle = Math.atan2(vertex.z, vertex.x)
      const normalizedAngle = (angle + Math.PI) / (2 * Math.PI)

      const color = new THREE.Color()

      if (normalizedAngle < 0.25) {
        color.lerpColors(colorBlue, colorPurple, normalizedAngle * 4)
      } else if (normalizedAngle < 0.5) {
        color.lerpColors(colorPurple, colorPink, (normalizedAngle - 0.25) * 4)
      } else if (normalizedAngle < 0.75) {
        color.lerpColors(colorPink, colorOrange, (normalizedAngle - 0.5) * 4)
      } else {
        color.lerpColors(colorOrange, colorBlue, (normalizedAngle - 0.75) * 4)
      }

      sphereColors[i * 3] = color.r
      sphereColors[i * 3 + 1] = color.g
      sphereColors[i * 3 + 2] = color.b
    }

    sphereGeometry.setAttribute("color", new THREE.BufferAttribute(sphereColors, 3))

    const sphereMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: new THREE.Color(0x222222),
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.2,
    })

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphereGroup.add(sphere)

    // Créer les montagnes sur la sphère
    try {
      createMountainsOnSphere(sphereGroup)
    } catch (error) {
      console.error("Erreur lors de la création des montagnes:", error)
      // Continuer avec la sphère de base si la création des montagnes échoue
    }

    // Fonction pour créer des montagnes sur la sphère
    function createMountainsOnSphere(parent: THREE.Group) {
      const radius = 5 // Rayon de la sphère
      const mountainCount = 800 // Nombre total de montagnes

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

            // Déterminer la couleur en fonction de la position angulaire
            const angle = Math.atan2(z, x)
            const normalizedAngle = (angle + Math.PI) / (2 * Math.PI)

            const baseColor = new THREE.Color()

            if (normalizedAngle < 0.25) {
              baseColor.lerpColors(colorBlue, colorPurple, normalizedAngle * 4)
            } else if (normalizedAngle < 0.5) {
              baseColor.lerpColors(colorPurple, colorPink, (normalizedAngle - 0.25) * 4)
            } else if (normalizedAngle < 0.75) {
              baseColor.lerpColors(colorPink, colorOrange, (normalizedAngle - 0.5) * 4)
            } else {
              baseColor.lerpColors(colorOrange, colorBlue, (normalizedAngle - 0.75) * 4)
            }

            // Déterminer la hauteur de la montagne (plus variée pour un effet naturel)
            const heightFactor = Math.pow(Math.random(), 1.5) * 2 + 0.5 // Entre 0.5 et 2.5

            // Créer une montagne avec un profil moins pointu
            createJaggedMountain(position, normal, baseColor, heightFactor, parent)
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

              // Déterminer la couleur en fonction de la position
              const angle = Math.atan2(z, x)
              const normalizedAngle = (angle + Math.PI) / (2 * Math.PI)

              const baseColor = new THREE.Color()

              if (normalizedAngle < 0.25) {
                baseColor.lerpColors(colorBlue, colorPurple, normalizedAngle * 4)
              } else if (normalizedAngle < 0.5) {
                baseColor.lerpColors(colorPurple, colorPink, (normalizedAngle - 0.25) * 4)
              } else if (normalizedAngle < 0.75) {
                baseColor.lerpColors(colorPink, colorOrange, (normalizedAngle - 0.5) * 4)
              } else {
                baseColor.lerpColors(colorOrange, colorBlue, (normalizedAngle - 0.75) * 4)
              }

              // Ajuster légèrement la couleur en fonction de la catégorie
              switch (trajectory.category) {
                case "education":
                  baseColor.lerp(colorBlue, 0.2)
                  break
                case "career":
                  baseColor.lerp(colorPurple, 0.2)
                  break
                case "entrepreneurship":
                  baseColor.lerp(colorPink, 0.2)
                  break
                case "health":
                  baseColor.lerp(colorOrange, 0.2)
                  break
              }

              // Hauteur basée sur les données
              const maxScore = Math.max(...trajectory.points.map((p) => p.cumulativeScore))
              const heightFactor = Math.min(3, maxScore / 30) + 0.5

              // Créer une montagne principale
              createJaggedMountain(position, normal, baseColor, heightFactor, parent)

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

                  // Couleur légèrement différente
                  const subColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.1)

                  // Créer une montagne secondaire
                  createJaggedMountain(offsetPosition, offsetNormal, subColor, subHeightFactor, parent)
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

    // Fonction pour créer une montagne avec un profil dentelé (moins pointu)
    function createJaggedMountain(
      position: THREE.Vector3,
      normal: THREE.Vector3,
      color: THREE.Color,
      heightFactor: number,
      parent: THREE.Group,
    ) {
      // Créer un groupe pour cette montagne
      const mountainGroup = new THREE.Group()
      mountainGroup.position.copy(position)

      // Calculer la rotation pour aligner avec la normale
      const upVector = new THREE.Vector3(0, 1, 0)
      mountainGroup.quaternion.setFromUnitVectors(upVector, normal)

      // Créer la géométrie de la montagne avec un profil dentelé
      const height = (0.5 + heightFactor * 1.5) / 3 // Hauteur réduite d'un facteur 3
      const baseWidth = 0.5 + Math.random() * 0.4 // Largeur de base augmentée

      // Créer une forme avec un profil dentelé (comme dans l'image schématique)
      const mountainShape = new THREE.Shape()

      // Point de départ (coin gauche de la base)
      mountainShape.moveTo(-baseWidth / 2, 0)

      // Nombre de segments pour le profil dentelé
      const segments = 4 + Math.floor(Math.random() * 3) // Entre 4 et 6 segments

      // Créer le profil dentelé
      const segmentWidth = baseWidth / segments

      for (let i = 0; i <= segments; i++) {
        const x = -baseWidth / 2 + i * segmentWidth

        if (i === 0) {
          // Premier point (déjà défini par moveTo)
          continue
        } else if (i === segments) {
          // Dernier point (coin droit de la base)
          mountainShape.lineTo(baseWidth / 2, 0)
        } else {
          // Points intermédiaires (pics)
          const peakHeight = height * (0.5 + Math.random() * 0.5)

          // Si c'est un segment pair, on monte vers un pic
          if (i % 2 === 1) {
            mountainShape.lineTo(x, peakHeight)
          } else {
            // Si c'est un segment impair, on descend légèrement pour créer une vallée
            const valleyHeight = peakHeight * (0.4 + Math.random() * 0.2)
            mountainShape.lineTo(x, valleyHeight)
          }
        }
      }

      // Fermer la forme
      mountainShape.lineTo(-baseWidth / 2, 0)

      // Extruder la forme pour créer une montagne 3D
      const extrudeSettings = {
        steps: 1,
        depth: 0.1 + Math.random() * 0.15, // Épaisseur augmentée
        bevelEnabled: false,
      }

      const mountainGeometry = new THREE.ExtrudeGeometry(mountainShape, extrudeSettings)

      // Créer un matériau avec un dégradé de couleurs
      const topColor = color.clone().lerp(new THREE.Color(0xffffff), 0.3)
      const mountainColors = new Float32Array(mountainGeometry.attributes.position.count * 3)

      for (let i = 0; i < mountainGeometry.attributes.position.count; i++) {
        const vertex = new THREE.Vector3()
        vertex.fromBufferAttribute(mountainGeometry.attributes.position, i)

        // Normaliser la hauteur pour le dégradé
        const normalizedHeight = Math.min(1, vertex.y / height)

        // Couleur basée sur la hauteur
        const vertexColor = color.clone().lerp(topColor, normalizedHeight)

        mountainColors[i * 3] = vertexColor.r
        mountainColors[i * 3 + 1] = vertexColor.g
        mountainColors[i * 3 + 2] = vertexColor.b
      }

      mountainGeometry.setAttribute("color", new THREE.BufferAttribute(mountainColors, 3))

      const mountainMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })

      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial)

      // Centrer la géométrie
      mountain.position.z = -extrudeSettings.depth / 2

      // Rotation aléatoire autour de l'axe normal pour plus de diversité
      mountain.rotation.y = Math.random() * Math.PI * 2

      mountainGroup.add(mountain)

      // Ajouter des détails supplémentaires pour certaines montagnes (mais moins fréquemment)
      if (Math.random() < 0.2) {
        // Réduit de 0.3 à 0.2 pour limiter la complexité
        // Créer des formes supplémentaires qui se chevauchent
        for (let i = 0; i < 2; i++) {
          const subMountainShape = new THREE.Shape()

          // Largeur et position légèrement décalées
          const subWidth = baseWidth * (0.8 + Math.random() * 0.4)
          const subOffset = (Math.random() - 0.5) * baseWidth * 0.7

          // Point de départ
          subMountainShape.moveTo(-subWidth / 2 + subOffset, 0)

          // Nombre de segments
          const subSegments = 3 + Math.floor(Math.random() * 2)
          const subSegmentWidth = subWidth / subSegments

          // Créer le profil dentelé
          for (let j = 0; j <= subSegments; j++) {
            const x = -subWidth / 2 + subOffset + j * subSegmentWidth

            if (j === 0) {
              continue
            } else if (j === subSegments) {
              subMountainShape.lineTo(subWidth / 2 + subOffset, 0)
            } else {
              const subPeakHeight = height * (0.6 + Math.random() * 0.4)

              if (j % 2 === 1) {
                subMountainShape.lineTo(x, subPeakHeight)
              } else {
                const subValleyHeight = subPeakHeight * (0.5 + Math.random() * 0.2)
                subMountainShape.lineTo(x, subValleyHeight)
              }
            }
          }

          // Fermer la forme
          subMountainShape.lineTo(-subWidth / 2 + subOffset, 0)

          // Extruder la forme
          const subExtrudeSettings = {
            steps: 1,
            depth: 0.06 + Math.random() * 0.08,
            bevelEnabled: false,
          }

          const subGeometry = new THREE.ExtrudeGeometry(subMountainShape, subExtrudeSettings)

          // Appliquer le dégradé de couleurs
          const subColors = new Float32Array(subGeometry.attributes.position.count * 3)

          for (let k = 0; k < subGeometry.attributes.position.count; k++) {
            const vertex = new THREE.Vector3()
            vertex.fromBufferAttribute(subGeometry.attributes.position, k)

            const normalizedHeight = Math.min(1, vertex.y / height)
            const vertexColor = color.clone().lerp(topColor, normalizedHeight)

            subColors[k * 3] = vertexColor.r
            subColors[k * 3 + 1] = vertexColor.g
            subColors[k * 3 + 2] = vertexColor.b
          }

          subGeometry.setAttribute("color", new THREE.BufferAttribute(subColors, 3))

          const subMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          })

          const subMountain = new THREE.Mesh(subGeometry, subMaterial)

          // Positionner avec un léger décalage pour créer un effet de chevauchement
          subMountain.position.z = -subExtrudeSettings.depth / 2 + i * 0.02
          subMountain.position.y = Math.random() * 0.1

          // Rotation aléatoire
          subMountain.rotation.y = Math.random() * Math.PI * 2

          mountainGroup.add(subMountain)
        }
      }

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
          if (object instanceof THREE.Mesh) {
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
