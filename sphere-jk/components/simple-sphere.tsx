"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export default function SimpleSphere() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Créer la scène
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    // Créer la caméra
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15

    // Créer le renderer avec antialiasing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "default", // Moins exigeant que "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(1) // Force à 1 pour de meilleures performances
    containerRef.current.appendChild(renderer.domElement)

    // Ajouter les lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    // Définir les couleurs du dégradé
    const colorBlue = new THREE.Color(0x3498db)
    const colorPurple = new THREE.Color(0x9b59b6)
    const colorPink = new THREE.Color(0xe91e63)
    const colorOrange = new THREE.Color(0xf39c12)

    // Créer la sphère avec moins de segments pour de meilleures performances
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32)
    const sphereColors = new Float32Array(sphereGeometry.attributes.position.count * 3)

    // Appliquer le dégradé de couleurs
    for (let i = 0; i < sphereGeometry.attributes.position.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(sphereGeometry.attributes.position, i)
      vertex.normalize()

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
    scene.add(sphere)

    // Ajouter quelques montagnes simplifiées (seulement 50)
    for (let i = 0; i < 50; i++) {
      // Distribution uniforme sur la sphère
      const phi = Math.acos(1 - 2 * (i / 50))
      const theta = Math.PI * 2 * i * (1 / 1.618033988749895)

      // Position sur la sphère
      const radius = 5
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      const position = new THREE.Vector3(x, y, z)
      const normal = position.clone().normalize()

      // Déterminer la couleur
      const angle = Math.atan2(z, x)
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

      // Créer une montagne simplifiée (juste un cône)
      const height = 0.3 + Math.random() * 0.7
      const coneGeometry = new THREE.ConeGeometry(0.2, height, 4)
      const coneMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
      })

      const cone = new THREE.Mesh(coneGeometry, coneMaterial)

      // Positionner le cône
      cone.position.copy(position)

      // Orienter le cône pour qu'il pointe vers l'extérieur
      const upVector = new THREE.Vector3(0, 1, 0)
      cone.quaternion.setFromUnitVectors(upVector, normal)

      scene.add(cone)
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
      requestAnimationFrame(animate)

      // Rotation lente
      sphere.rotation.y += 0.001

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Gestionnaire de redimensionnement
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    // Nettoyage
    return () => {
      window.removeEventListener("resize", handleResize)

      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }

      // Libérer les ressources
      renderer.dispose()
      controls.dispose()

      // Nettoyer les géométries et matériaux
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()

          if (object.material instanceof THREE.Material) {
            object.material.dispose()
          } else if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          }
        }
      })
    }
  }, [])

  return <div ref={containerRef} className="w-full h-screen" />
}
